import { describe,expect,it } from "vitest";
import { applyLearningEvidence,emptyProfile,recentAggregates } from "./profile";
import { LEARNING } from "./constants";
import { evidence,profileOf } from "./testFixtures";
import { serializeProfile,parseProfile } from "./storage";
describe("bounded learner profile",()=> {
  it("accumulates exact global counters and retained exposure counters",()=> {
    const p=profileOf(evidence("abc",[0],"a"),evidence("abc",[1],"b")); expect(p).toMatchObject({sessionCount:2,totalAttempts:6,incorrectAttempts:2,remainingErrors:2});
    expect(p.lifetime.graphemes.find(s=>s.target[0]==="a")).toMatchObject({opportunities:2,errorOccurrences:1});
    expect(p.lifetime.bigrams.find(s=>s.target.join("")==="ab")).toMatchObject({opportunities:2,errorOccurrences:2});
    expect(p.lifetime.tokens[0]).toMatchObject({opportunities:2,errorOccurrences:2});
  });
  it("separates directional confusion and accumulates repeated mistakes",()=> {
    const p=profileOf(evidence("rr",[0,1],"a","t"),evidence("tt",[0,1],"b","r"),evidence("rr",[0],"c","t"));
    expect(p.lifetime.substitutions).toEqual([{expected:"r",actual:"t",count:3,corrected:0,remaining:3},{expected:"t",actual:"r",count:2,corrected:0,remaining:2}]);
  });
  it("last eight qualifying sessions drive recent aggregates without erasing lifetime",()=> {
    const records=Array.from({length:12},(_,i)=>evidence("aaa",i<4?[0]:[],`s${i}`)); const p=profileOf(...records);
    expect(p.recent.map(s=>s.sessionId)).toEqual(records.slice(-8).map(e=>e.summary.sessionId));
    expect(p.lifetime.graphemes[0]).toMatchObject({opportunities:36,errorOccurrences:4}); expect(recentAggregates(p).graphemes[0].errorOccurrences).toBe(0);
  });
  it("deduplicates a result across profile reconstruction, not only component memory",()=> {
    const e=evidence("abc",[0]); const p=parseProfile(serializeProfile(profileOf(e)));
    expect(applyLearningEvidence(p,e)).toBe(p); expect(p.sessionCount).toBe(1);
  });
  it("prunes by retained weakness/evidence volume, preserving valuable old targets",()=> {
    const strong=evidence("r".repeat(30),Array.from({length:10},(_,i)=>i),"old"); let p=profileOf(strong);
    for(let i=0;i<200;i++) p=applyLearningEvidence(p,evidence(String.fromCodePoint(0x4e00+i),[],`s${i}`));
    expect(p.lifetime.graphemes.length).toBe(LEARNING.graphemes); expect(p.lifetime.graphemes.some(s=>s.target[0]==="r")).toBe(true);
    expect(serializeProfile(p)).toBe(serializeProfile(p));
  });
  it("Unicode keys and nested profile values remain immutable",()=> {
    const p=profileOf(evidence("👩‍💻é",[1])); expect(p.lifetime.graphemes.some(s=>s.target[0]==="👩‍💻")).toBe(true);
    for(const value of [p,p.lifetime,p.lifetime.graphemes,p.lifetime.graphemes[0],p.recent,p.recent[0],p.processedSessionIds]) expect(Object.isFrozen(value)).toBe(true);
  });
  it("stress: 1000 records keep history/ledgers/tokens/substitutions bounded",()=> {
    const start=performance.now(); let p=emptyProfile();
    for(let i=0;i<1000;i++) p=applyLearningEvidence(p,evidence(`${String.fromCodePoint(0x4e00+i)} word${i}`, [0],`stress-${i}`,String.fromCodePoint(0x6000+i)));
    const text=serializeProfile(p); const bytes=new TextEncoder().encode(text).byteLength;
    expect(p.sessionCount).toBe(1000); expect(p.recent.length).toBe(8); expect(p.processedSessionIds.length).toBe(256);
    expect(p.lifetime.substitutions.length).toBe(64); expect(p.lifetime.tokens.length).toBe(48); expect(bytes).toBeLessThan(LEARNING.maxProfileBytes);
    expect(parseProfile(text)).toEqual(p); console.info(`Learning profile stress: 1000 sessions, ${bytes} UTF-8 bytes, ${(performance.now()-start).toFixed(1)} ms (local test runtime).`);
  },15000);
});
