import { expect,it } from "vitest";
import { loop } from "./testLoop";
import { session,attribution,record } from "./testFixtures";
import { advanceMastery,emptyMastery } from "./progression";
import { serializeMastery } from "./storage";
import { TRANSFER as T } from "./constants";
import { applyLearningEvidence,emptyProfile } from "../profile";
it("1000-session histories are deterministic, bounded and stable under mild noise",()=>{
  const begin=performance.now();
  const run=()=>{
    const x=loop();x.ingest(session("seed",undefined,[0,1,2,3]));
    for(let i=0;i<3;i++)x.ingest(session(`drill-${i}`,undefined,[],{adaptive:true}),attribution());
    for(let i=0;i<3;i++)x.ingest(session(`ordinary-${i}`));
    const clean=session("template","r".repeat(40)),mild=session("mild-template","r".repeat(40),[0]);
    for(let i=0;i<1000;i++){
      const template=i%4===0 ? mild : clean;
      const e={...template,summary:{...template.summary,sessionId:`long-${i}`,recordedAt:1000-i}};
      x.ingest(e);expect(x.target().state).toBe("PROVISIONAL_MASTERY");
    }
    return x;
  };
  const a=run(),b=run();expect(a.mastery).toEqual(b.mastery);
  expect(a.mastery.processedSessionIds).toHaveLength(T.dedupe);expect(a.mastery.records.length).toBeLessThanOrEqual(T.records);
  for(const r of a.mastery.records){expect(r.training.length).toBeLessThanOrEqual(T.trainingWindow);expect(r.transfer.length).toBeLessThanOrEqual(T.transferWindow);}
  const bytes=new TextEncoder().encode(serializeMastery(a.mastery)).byteLength;expect(bytes).toBeLessThan(T.maxBytes);
  console.info(`Slice7 history: two 1007-session runs ${(performance.now()-begin).toFixed(1)}ms; companion ${bytes} bytes`);
},15000);
it("many tracked identities retain the fixed record cap and canonical tie behavior",()=>{
  const records=Array.from({length:64},(_,i)=>record({kind:"grapheme",items:[String.fromCodePoint(0x400+i)]},[],[],{lastSeen:0}));
  const before=emptyProfile(),e=session("s",undefined,[0,1,2,3]),after=applyLearningEvidence(before,e);
  const first=advanceMastery({...emptyMastery(),records},before,after,e);
  const second=advanceMastery({...emptyMastery(),records:[...records].reverse()},before,after,e);
  expect(first.records).toHaveLength(64);expect(second).toEqual(first);expect(()=>serializeMastery(first)).not.toThrow();
});
