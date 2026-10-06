import { describe,expect,it } from "vitest";
import { loadProfile,saveProfile,parseProfile,serializeProfile,profileStorageKey } from "./storage";
import { learnerScope } from "./identity";
import { evidence,profileOf } from "./testFixtures";
const memory=()=> { const values=new Map<string,string>(); return { values,getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);} }; };
describe("local profile boundary",()=> {
  it("roundtrips deterministically and strips unknown fields",()=> {
    const p=profileOf(evidence("hello")); const text=serializeProfile(p); expect(serializeProfile(parseProfile(text))).toBe(text);
    const polluted={...p,rawPassage:"private custom passage"}; expect(serializeProfile(parseProfile(JSON.stringify(polluted)))).not.toContain("private custom passage");
  });
  it.each([null,"", "not json", "{}", JSON.stringify({version:2}), JSON.stringify({version:1,sessionCount:-1})])("safely resets corrupt/unknown profile %s",text=>expect(parseProfile(text).sessionCount).toBe(0));
  it("rejects invalid nested counters, duplicates, metrics and oversized data",()=> {
    const p=profileOf(evidence("abc"));
    for(const changed of [ {...p,totalAttempts:-1}, {...p,processedSessionIds:["s1","s1"]}, {...p,recent:[{...p.recent[0],attemptAccuracy:101}]},
      {...p,lifetime:{...p.lifetime,graphemes:[{...p.lifetime.graphemes[0],opportunities:0}]}} ]) expect(parseProfile(JSON.stringify(changed)).sessionCount).toBe(0);
    expect(parseProfile(" ".repeat(2*1024*1024+1)).sessionCount).toBe(0);
  });
  it("profiles for two authenticated users and local personas stay separate",()=> {
    const storage=memory(); const a=learnerScope("A",{name:"Same",email:"same@example.com"},storage)!;
    const b=learnerScope("B",{name:"Same",email:"same@example.com"},storage)!;
    saveProfile(storage,a,profileOf(evidence("abc"))); expect(loadProfile(storage,b).sessionCount).toBe(0);
    const x=learnerScope(null,{name:"X",email:"x@example.com"},storage)!; const y=learnerScope(null,{name:"Y",email:"y@example.com"},storage)!;
    expect(x).not.toBe(y); expect(x).not.toBe(a); expect(profileStorageKey(a)).not.toBe(profileStorageKey(b));
  });
  it("guest ID is persistent and distinct from authenticated identity; pending auth has no scope",()=> {
    const storage=memory(); const learner={name:"Guest learner",email:""}; const scope=learnerScope(null,learner,storage);
    expect(learnerScope(null,learner,storage)).toBe(scope); expect(scope).toMatch(/^guest:/);
    expect(learnerScope("A",learner,storage)).not.toBe(scope); expect(learnerScope(undefined,learner,storage)).toBeNull();
  });
  it("storage failures fall back safely",()=> {
    const storage={getItem:()=>{throw new Error("blocked");},setItem:()=>{throw new Error("quota");}};
    expect(loadProfile(storage,"A").sessionCount).toBe(0); expect(saveProfile(storage,"A",profileOf(evidence("abc")))).toBe(false);
    expect(learnerScope(null,{name:"Guest",email:""},storage)).toBe(learnerScope(null,{name:"Guest",email:""},storage));
  });
});
