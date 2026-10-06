import { createTypingEngine } from "../../../engine/typing";
import { extractLearningEvidence } from "../evidence";
import type { LearningEvidence } from "../types";
import type { AdaptiveAttribution, MasteryRecord, Observation, WeaknessIdentity } from "./types";
export const r:WeaknessIdentity={kind:"grapheme",items:["r"]};
export function observation(order:number,opportunities=20,errors=0,context:Observation["context"]="adaptive-targeted",accuracy=100,correctWpm=40):Observation {
  return {order,opportunities,errors,context,accuracy,correctWpm,activeMs:2000};
}
export function record(identity:WeaknessIdentity=r,training:readonly Observation[]=[],transfer:readonly Observation[]=[],patch:Partial<MasteryRecord>={}):MasteryRecord {
  return {identity,state:"ACTIVE",epoch:0,stateSince:0,lastSeen:20,baselineWpm:null,training,transfer,...patch};
}
export const attribution=(kind:AdaptiveAttribution["focusType"]="grapheme",items:readonly string[]=["r"]):AdaptiveAttribution=>({sourceId:"adaptive-fixture",sourceVersion:"generator/bank-v1",focusType:kind,focusItems:items});
export function session(id:string,text="r".repeat(20),wrong:readonly number[]=[],options:{adaptive?:boolean;actual?:string;corrected?:boolean;mode?:"fixed-text"|"timed"|"word-count";wpm?:number}={}):LearningEvidence {
  const mode=options.mode??"fixed-text";
  const sourceIdentity={type:options.adaptive ? "adaptive" as const : "corpus" as const,id:options.adaptive ? "adaptive-fixture" : "ordinary-fixture",version:options.adaptive ? "generator/bank-v1" : "1"};
  const engine=createTypingEngine(mode==="timed" ? {mode,targetText:text,sourceIdentity,durationMs:2000,textPolicy:"repeat-corpus"} : mode==="word-count" ? {mode,targetText:text,sourceIdentity,wordLimit:1} : {mode,targetText:text,sourceIdentity,completionPolicy:options.corrected ? "require-correct-target" : "target-covered"});
  const target=engine.getSnapshot().target.units;
  if(options.corrected) {
    for(let i=0;i<target.length;i++) {
      if(wrong.includes(i)){engine.dispatch({type:"INSERT_TEXT",text:options.actual??"X",atMs:i*10});engine.dispatch({type:"DELETE_BACKWARD",atMs:i*10+1});}
      engine.dispatch({type:"INSERT_TEXT",text:target[i],atMs:i*10+2});
    }
  } else {
    engine.dispatch({type:"INSERT_TEXT",text:wrong.includes(0) ? options.actual??"X" : target[0],atMs:0});
    engine.dispatch({type:"INSERT_TEXT",text:target.slice(1).map((u,i)=>wrong.includes(i+1) ? options.actual??"X" : u).join(""),atMs:mode==="timed" ? 1999 : 2000});
  }
  if(mode==="timed")engine.dispatch({type:"TICK",atMs:2000});
  const evidence=extractLearningEvidence(engine.getResult(),id,0)!;
  return options.wpm===undefined ? evidence : {...evidence,summary:{...evidence.summary,correctWpm:options.wpm}};
}
