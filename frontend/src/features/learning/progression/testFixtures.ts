import { createTypingEngine,prepareTypingText,type SessionResult } from "../../../engine/typing";
import { extractLearningEvidence } from "../evidence";
import { applyLearningEvidence,emptyProfile } from "../profile";
import { advanceMastery,emptyMastery } from "../transfer/progression";
import { weaknessKey } from "../transfer/classify";
import { observation,record } from "../transfer/testFixtures";
import type { LearningEvidence } from "../types";
import type { AdaptiveExercise } from "../exercises/types";
import type { AdaptiveAttribution,MasteryProfile,WeaknessIdentity } from "../transfer/types";
export function eligibleRecord(identity:WeaknessIdentity={kind:"grapheme",items:["r"]}){
  const opportunities=identity.kind==="token" ? 6 : 20;
  return record(identity,[observation(1,opportunities),observation(2,opportunities),observation(3,opportunities)],[],{state:"TRANSFER_CHECK",practiceLevel:2,checkOrder:3,stateSince:3,lastSeen:8,naturalSinceCheck:0,masteryVia:null,assessmentFailure:null,waiting:Array.from({length:5},(_,i)=>({...observation(i+4,0,0,"ordinary-practice"),attempts:60})),assessments:[]});
}
export function finishExercise(e:AdaptiveExercise,wrong:readonly number[]=[],actual="X"):SessionResult {
  const engine=createTypingEngine({preparedText:e.preparedText,sourceIdentity:e.source,completionPolicy:"require-correct-target"});
  const units=e.preparedText.units;
  engine.dispatch({type:"INSERT_TEXT",text:wrong.includes(0) ? actual : units[0],atMs:0});
  if(wrong.includes(0)){engine.dispatch({type:"DELETE_BACKWARD",atMs:1});engine.dispatch({type:"INSERT_TEXT",text:units[0],atMs:2});}
  let start=1,at=1000;
  for(const index of wrong.filter(i=>i>0).sort((a,b)=>a-b)){
    if(index>start)engine.dispatch({type:"INSERT_TEXT",text:units.slice(start,index).join(""),atMs:++at});
    engine.dispatch({type:"INSERT_TEXT",text:actual,atMs:++at});engine.dispatch({type:"DELETE_BACKWARD",atMs:++at});engine.dispatch({type:"INSERT_TEXT",text:units[index],atMs:++at});start=index+1;
  }
  if(start<units.length)engine.dispatch({type:"INSERT_TEXT",text:units.slice(start).join(""),atMs:Math.max(2000,at+1)});return engine.getResult()!;
}
export function sourceAttribution(e:AdaptiveExercise,assessmentCheckOrder?:number):AdaptiveAttribution {
  return {sourceId:e.source.id,sourceVersion:e.source.version,focusType:e.focusType,focusItems:e.focusItems,composition:e.generatedFrom.composition,assessmentCheckOrder};
}
export function targetPositions(e:AdaptiveExercise):number[]{
  const units=e.preparedText.expectedUnits;
  const item=e.focusType==="token" ? prepareTypingText(e.focusItems[0]).expectedUnits[0] : e.focusItems[0];
  return units.flatMap((u,i)=>u===item ? [i] : []);
}
export function pipeline(identity:WeaknessIdentity={kind:"grapheme",items:["r"]}){
  let profile=emptyProfile(),mastery:MasteryProfile=emptyMastery();
  const ingestEvidence=(e:LearningEvidence,attribution?:AdaptiveAttribution)=>{const before=profile;profile=applyLearningEvidence(profile,e);mastery=advanceMastery(mastery,before,profile,e,attribution);};
  const ingest=(result:SessionResult,id:string,attribution?:AdaptiveAttribution)=>{const e=extractLearningEvidence(result,id,0);if(!e)throw Error("Invalid fixture result.");ingestEvidence(e,attribution);};
  const target=()=>mastery.records.find(r=>weaknessKey(r.identity)===weaknessKey(identity))!;
  return {ingest,ingestEvidence,target,get profile(){return profile;},get mastery(){return mastery;}};
}
