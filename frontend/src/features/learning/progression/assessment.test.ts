import { describe,expect,it } from "vitest";
import { assessmentEligible,assessmentSuccess,controlledMastery,supportsAssessment } from "./assessment";
import { ASSESSMENT as A } from "./constants";
import { eligibleRecord } from "./testFixtures";
import { observation as o } from "../transfer/testFixtures";
import type { WeaknessIdentity } from "../transfer/types";
const identities:WeaknessIdentity[]=[{kind:"grapheme",items:["é"]},{kind:"substitution",items:["r","t"]},{kind:"bigram",items:["t","h"]},{kind:"token",items:["through"]}];
describe("controlled check eligibility",()=>{
  it.each(["ACTIVE","IMPROVING","REGRESSED","PROVISIONAL_MASTERY","INSUFFICIENT_EVIDENCE"] as const)("%s cannot assess",state=>expect(assessmentEligible({...eligibleRecord(),state})).toBe(false));
  it("new transfer check must wait for ordinary opportunities",()=>expect(assessmentEligible({...eligibleRecord(),waiting:[]})).toBe(false));
  it("waiting boundary is five, not four",()=>{expect(assessmentEligible({...eligibleRecord(),waiting:eligibleRecord().waiting!.slice(1)})).toBe(false);expect(assessmentEligible(eligibleRecord())).toBe(true);});
  it("natural exposure at its threshold makes assessment unnecessary",()=>{
    expect(assessmentEligible({...eligibleRecord(),naturalSinceCheck:39})).toBe(true);expect(assessmentEligible({...eligibleRecord(),naturalSinceCheck:40})).toBe(false);
  });
  it("latest ordinary severe signal blocks despite overall accurate drills",()=>{
    const rec=eligibleRecord();expect(assessmentEligible({...rec,waiting:rec.waiting!.map((x,i)=>i===4 ? {...x,opportunities:1,errors:1} : x)})).toBe(false);
  });
  it.each(identities)("supports observed sparse $kind",identity=>expect(assessmentEligible(eligibleRecord(identity))).toBe(true));
  it("no successful training prerequisite is invented",()=>expect(assessmentEligible({...eligibleRecord(),training:[o(1),o(2),o(3,20,4)]})).toBe(false));
  it.each([{kind:"speed",items:[]},{kind:"accuracy",items:[]},{kind:"unknown",items:["r"]},{kind:"token",items:["x".repeat(32)]}] as const)("unsupported $kind safely refuses",identity=>expect(supportsAssessment(identity as WeaknessIdentity)).toBe(false));
});
describe("strict repeated controlled qualification",()=>{
  it.each(identities)("$kind has exact per-session and repeated thresholds",identity=>{
    const rec=eligibleRecord(identity),kind=identity.kind as keyof typeof A.sessions;
    const observation={...o(9,A.perSession[kind],0,"controlled-transfer-assessment"),attempts:300,ordinal:0};
    expect(assessmentSuccess(rec,observation)).toBe(true);expect(assessmentSuccess(rec,{...observation,opportunities:observation.opportunities-1})).toBe(false);
    expect(controlledMastery({...rec,assessments:[observation]})).toBe(false);
    const rows=Array.from({length:A.sessions[kind]},(_,i)=>({...observation,order:i+9,ordinal:i}));
    expect(controlledMastery({...rec,assessments:rows})).toBe(true);
    expect(controlledMastery({...rec,assessments:rows.slice(1)})).toBe(false);
    expect(controlledMastery({...rec,assessments:rows.map(x=>({...x,ordinal:0}))})).toBe(false);
  });
  it("a target mistake cannot be hidden by high overall accuracy or earlier successes",()=>{
    const rec=eligibleRecord();const rows=Array.from({length:4},(_,i)=>({...o(i+9,10,0,"controlled-transfer-assessment"),attempts:300,ordinal:i}));
    expect(controlledMastery({...rec,assessments:rows.map((x,i)=>i===3 ? {...x,errors:1,accuracy:99.67} : x)})).toBe(false);
  });
  it("accuracy, active-time and attempts boundaries are explicit",()=>{
    const rec=eligibleRecord(),base={...o(9,10,0,"controlled-transfer-assessment"),attempts:100,ordinal:0,accuracy:99.5,activeMs:1000};
    expect(assessmentSuccess(rec,base)).toBe(true);
    for(const patch of [{attempts:99},{activeMs:999},{accuracy:99.49},{context:"adaptive-targeted" as const}])expect(assessmentSuccess(rec,{...base,...patch})).toBe(false);
  });
  it("ordinary severe evidence and enough natural exposure override old controlled success",()=>{
    const rec=eligibleRecord(),assessments=Array.from({length:4},(_,i)=>({...o(i+9,10,0,"controlled-transfer-assessment"),attempts:300,ordinal:i}));
    expect(controlledMastery({...rec,assessments,naturalSinceCheck:40})).toBe(false);
    expect(controlledMastery({...rec,assessments,state:"REGRESSED"})).toBe(false);
  });
});
