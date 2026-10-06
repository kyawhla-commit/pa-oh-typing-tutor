import { describe,expect,it,vi } from "vitest";
import { createLearningService } from "../service";
import { emptyProfile } from "../profile";
import { serializeProfile,profileStorageKey } from "../storage";
import { loadMastery,masteryStorageKey,parseMastery,serializeMastery } from "./storage";
import { emptyMastery } from "./progression";
import { loop } from "./testLoop";
import { attribution,session } from "./testFixtures";
const strong=()=>{const x=loop();x.ingest(session("seed",undefined,[0,1,2,3]));for(let i=0;i<3;i++)x.ingest(session(`d${i}`,undefined,[],{adaptive:true}),attribution());for(let i=0;i<3;i++)x.ingest(session(`o${i}`));return x;};
describe("bounded learner-scoped mastery persistence",()=>{
  it("round-trips provisional state, stable identity, baseline and bounded evidence",()=>{
    const x=strong();expect(parseMastery(serializeMastery(x.mastery))).toEqual(x.mastery);
    expect(x.mastery.records[0].state).toBe("PROVISIONAL_MASTERY");
  });
  it.each([null,"not json",JSON.stringify({version:2}),JSON.stringify({...emptyMastery(),version:0}),"x".repeat(262145)])("rejects corrupt/unknown/oversized documents: %s",value=>expect(parseMastery(value)).toBeNull());
  it.each(["state","ordering","counters","baseline","duplicate-record","duplicate-session","unknown-context","oversized-window","oversized-records","grapheme"])("rejects invalid %s",caseName=>{
    const value=JSON.parse(serializeMastery(strong().mastery));const r=value.records[0];
    if(caseName==="state")r.state="FOREVER_MASTERED";
    if(caseName==="ordering")r.training.reverse();
    if(caseName==="counters")r.transfer[0].errors=-1;
    if(caseName==="baseline")r.baselineWpm=30;
    if(caseName==="duplicate-record")value.records.push(r);
    if(caseName==="duplicate-session")value.processedSessionIds.push(value.processedSessionIds[0]);
    if(caseName==="unknown-context")r.transfer[0].context="adaptive-general";
    if(caseName==="oversized-window")r.training.push(...r.training);
    if(caseName==="oversized-records")value.records=Array(65).fill(r);
    if(caseName==="grapheme")r.identity.items=["x".repeat(33)];
    expect(parseMastery(JSON.stringify(value))).toBeNull();
  });
  it("canonical whitelist strips arbitrary text, timestamps, source labels and exercise data",()=>{
    const value=JSON.parse(serializeMastery(strong().mastery));value.rawText="secret full source";value.records[0].exerciseText="private";value.records[0].transfer[0].buffer="private buffer";
    const restored=parseMastery(JSON.stringify(value))!;const serialized=serializeMastery(restored);
    expect(serialized).not.toMatch(/secret|private|buffer|exerciseText|rawText|recordedAt/);
  });
  it("requires companion order to match base profile, both ahead and behind fail conservatively",()=>{
    const x=strong();const storage={getItem:()=>serializeMastery({...x.mastery,order:x.mastery.order+1}),setItem:vi.fn()};
    expect(loadMastery(storage,"user:a",x.profile).records).toEqual([]);
    storage.getItem=()=>serializeMastery(x.mastery);
    expect(loadMastery(storage,"user:a",{...x.profile,sessionCount:x.profile.sessionCount+1}).records).toEqual([]);
  });
  it("same-order companion with a different completion tail fails conservatively",()=>{
    const x=strong();const corrupted={...x.mastery,processedSessionIds:[...x.mastery.processedSessionIds.slice(0,-1),"different-completion"]};
    expect(loadMastery({getItem:()=>serializeMastery(corrupted),setItem:()=>{}},"user:a",x.profile).records).toHaveLength(0);
  });
  it("old Slice 5 profile remains unchanged and starts without manufactured mastery",()=>{
    const x=strong();const values=new Map([[profileStorageKey("user:a"),serializeProfile(x.profile)]]);
    const s=createLearningService({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)});
    expect(s.getSnapshot("user:a").profile).toEqual(x.profile);expect(s.getSnapshot("user:a").mastery.records).toHaveLength(0);
  });
  it("guest, local account and authenticated account companions remain separate",()=>{
    const x=strong(),values=new Map([[masteryStorageKey("guest:device"),serializeMastery(x.mastery)],[profileStorageKey("guest:device"),serializeProfile(x.profile)]]);
    const s=createLearningService({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)});
    expect(s.getSnapshot("guest:device").mastery.records).toEqual(x.mastery.records);
    for(const scope of ["user:a","local:guest@example.com"])expect(s.getSnapshot(scope).mastery.records).toHaveLength(0);
  });
  it("service reconstructs/dedupes training once and scope B has no progression",()=>{
    const values=new Map<string,string>(),jobs:(()=>void)[]=[];
    const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)};
    let s=createLearningService(storage,job=>jobs.push(job));
    const seed=session("seed",undefined,[0,1,2,3]);s.complete("user:a","seed",result(seed),0);jobs.shift()!();
    const drill=session("drill",undefined,[],{adaptive:true});s.complete("user:a","drill",result(drill),0,attribution());s.complete("user:a","drill",result(drill),0,attribution());expect(jobs).toHaveLength(1);jobs.shift()!();
    s=createLearningService(storage,job=>jobs.push(job));s.complete("user:a","drill",result(drill),0,attribution());jobs.shift()!();
    expect(s.getSnapshot("user:a").mastery.records[0].training).toHaveLength(1);expect(s.getSnapshot("user:a").profile.sessionCount).toBe(2);expect(s.getSnapshot("user:b").mastery.records).toHaveLength(0);
  });
  it("blocked and partial writes retain memory; reconstructing never trusts a stale companion",()=>{
    const values=new Map<string,string>(),jobs:(()=>void)[]=[];
    const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{if(k.includes("mastery"))throw Error("blocked");values.set(k,v);}};
    const s=createLearningService(storage,job=>jobs.push(job));const e=session("seed",undefined,[0,1,2,3]);s.complete("user:a","seed",result(e),0);jobs.shift()!();
    expect(s.getSnapshot("user:a")).toMatchObject({persisted:false,mastery:{order:1}});
    const fresh=createLearningService(storage);expect(fresh.getSnapshot("user:a").profile.sessionCount).toBe(1);expect(fresh.getSnapshot("user:a").mastery.records).toHaveLength(0);
  });
  it("empty storage and unknown version safely retain base compatibility",()=>{
    expect(parseMastery(serializeMastery(emptyMastery()))).toEqual(emptyMastery());expect(loadMastery({getItem:()=>'{"version":2}',setItem:()=>{}},"user:a",emptyProfile())).toEqual(emptyMastery());
  });
});
// Service boundary must receive real completed immutable engine results.
import { createTypingEngine } from "../../../engine/typing";
function result(e:ReturnType<typeof session>){
  const engine=createTypingEngine({targetText:"r".repeat(20),completionPolicy:"target-covered",sourceIdentity:e.summary.sourceIdentity!});
  engine.dispatch({type:"INSERT_TEXT",text:e.summary.incorrectAttempts ? "XXXX"+"r".repeat(16) : "r".repeat(20),atMs:0});return engine.getResult()!;
}
