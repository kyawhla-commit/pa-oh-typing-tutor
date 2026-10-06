import { describe,expect,it } from "vitest";
import { generateAdaptiveExercise } from "../exercises/generator";
import { spec } from "../exercises/testFixtures";
import { extractLearningEvidence } from "../evidence";
import type { LearningEvidence } from "../types";
import { performance } from "node:perf_hooks";
import { completed } from "../testFixtures";
import { finishExercise,pipeline,sourceAttribution,targetPositions } from "./testFixtures";
import { serializeMastery,parseMastery } from "../transfer/storage";
import { learningAction } from "./actions";
import { emptyMastery } from "../transfer/progression";
import { advanceVariant,nextVariant,variantKey } from "./variants";
import { ASSESSMENT } from "./constants";
import type { WeaknessIdentity } from "../transfer/types";
const identities:WeaknessIdentity[]=[{kind:"grapheme",items:["r"]},{kind:"substitution",items:["r","t"]},{kind:"bigram",items:["t","h"]},{kind:"token",items:["through"]}];
const seed=(id:WeaknessIdentity)=>id.kind==="token" ? completed("through ".repeat(6).trim(),[0,8,16]) : id.kind==="bigram" ? completed("th ".repeat(24).trim(),[0,3,6,9,12]) : completed("r".repeat(24),[0,1,2,3,4],id.kind==="substitution" ? "t":"X");
describe("long deterministic histories",()=>{
  it("1000+ completed sessions keep bounded state, no duplicate check ingestion and repeatable rollback/regression",()=>{
    let sessions=0,maxBytes=0;const started=performance.now();
    for(const identity of identities){
      const make=(level:0|1|2,ordinal:number,purpose:"training"|"controlled-transfer-assessment")=>{const r=generateAdaptiveExercise(spec(identity.kind,identity.items),{learnerKey:"stress",composition:{level,ordinal,purpose}});if(!r.ok)throw Error(r.reason);return r.exercise;};
      const drills=([0,1,2] as const).map(l=>make(l,l,"training"));const n=ASSESSMENT.sessions[identity.kind as keyof typeof ASSESSMENT.sessions],checks=Array.from({length:n},(_,i)=>make(2,i,"controlled-transfer-assessment"));
      const drillResults=drills.map(e=>finishExercise(e)),checkResults=checks.map(e=>finishExercise(e)),badResult=finishExercise(checks[0],[targetPositions(checks[0])[0]],identity.kind==="substitution"?"t":"X"),seedResult=seed(identity),ordinaryResult=completed("a".repeat(50)),naturalResult=completed(identity.kind==="token" ? "through ".repeat(6).trim() : identity.kind==="bigram" ? "th ".repeat(20).trim() : "r".repeat(20));
      const evidenceCache=new Map<Parameters<ReturnType<typeof pipeline>["ingest"]>[0],LearningEvidence>();
      const ingestCached=(x:ReturnType<typeof pipeline>,result:Parameters<typeof x.ingest>[0],sessionId:string,a?:Parameters<typeof x.ingest>[2])=>{let e=evidenceCache.get(result);if(!e){e=extractLearningEvidence(result,"cached",0)!;evidenceCache.set(result,e);}x.ingestEvidence({...e,summary:{...e.summary,sessionId}},a);};
      const run=()=>{const x=pipeline(identity);let order=0;const add=(r:Parameters<typeof x.ingest>[0],a?:Parameters<typeof x.ingest>[2])=>{ingestCached(x,r,`s${order++}`,a);sessions++;};add(seedResult);
        for(let cycle=0;cycle<10;cycle++){
          for(const [i,e] of drills.entries())add(drillResults[i],sourceAttribution(e));expect(x.target().state).toBe("TRANSFER_CHECK");
          if(cycle%3===2){for(let i=0;i<3;i++)add(naturalResult);expect(x.target().masteryVia).toBe("natural");}
          else {
          for(let i=0;i<5;i++)add(ordinaryResult);expect(learningAction(x.target()).type).toBe("controlled-assessment");
          if(cycle%5===0){const e=checks[0];add(badResult,sourceAttribution(e,x.target().checkOrder!));expect(x.target().assessmentFailure).toBe(identity.kind==="token"?"severe":"mild");for(const [i,d] of drills.entries())add(drillResults[i],sourceAttribution(d));for(let i=0;i<5;i++)add(ordinaryResult);}
          for(const [i,e] of checks.entries()){const a=sourceAttribution(e,x.target().checkOrder!);const result=checkResults[i];add(result,a);ingestCached(x,result,`s${order-1}`,a);}
          expect(x.target().masteryVia).toBe("controlled");}
          expect(x.target().state).toBe("PROVISIONAL_MASTERY");add(seedResult);add(seedResult);expect(x.target().state).toBe("REGRESSED");expect(x.target().practiceLevel).toBe(0);
          const serialized=serializeMastery(x.mastery);maxBytes=Math.max(maxBytes,new TextEncoder().encode(serialized).length);expect(parseMastery(serialized)).toEqual(x.mastery);expect(x.mastery.records.length).toBeLessThanOrEqual(64);expect(x.target().assessments).toHaveLength(0);
        }
        return serializeMastery(x.mastery);
      };
      expect(run()).toBe(run());
    }
    expect(sessions).toBeGreaterThan(1000);expect(maxBytes).toBeLessThan(262144);console.info("Slice 8 history stress",{sessions,maxCompanionBytes:maxBytes,totalMs:Math.round(performance.now()-started),extraction:"cached immutable source evidence"});
  },60000);
  it("1000 mixed weakness/purpose reservations persist bounded cursors and reject duplicate advancement",()=>{
    let variants:ReturnType<typeof advanceVariant>=[];
    for(let i=0;i<1000;i++){
      const key=variantKey(spec("token",[`word${i%31}`]),i%2?"training":"controlled-transfer-assessment"),ordinal=nextVariant(variants,key);
      variants=advanceVariant(variants,key,ordinal);expect(()=>advanceVariant(variants,key,ordinal)).toThrow();expect(nextVariant(variants,key)).toBe(ordinal+1);
    }
    expect(variants).toHaveLength(62);const state={...emptyMastery(),variants};expect(parseMastery(serializeMastery(state))).toEqual(state);expect(new TextEncoder().encode(serializeMastery(state)).length).toBeLessThan(262144);
  });

});
