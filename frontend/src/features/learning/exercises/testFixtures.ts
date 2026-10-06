import type { AdaptivePracticeSpec } from "../types";
import { generateAdaptiveExercise } from "./generator";
export function spec(focusType:AdaptivePracticeSpec["focusType"]="grapheme",focusItems:readonly string[]=["r"],id="fixture"):AdaptivePracticeSpec {
  return {recommendationId:id,focusType,focusItems,desiredLength:{unit:"graphemes",value:120},difficulty:focusType==="speed"?"gradual-speed":"steady",mode:"fixed-text",completionPolicy:"require-correct-target"};
}
export function exercise(focusType:AdaptivePracticeSpec["focusType"]="grapheme",focusItems:readonly string[]=["r"],id="fixture") {
  const result=generateAdaptiveExercise(spec(focusType,focusItems,id),{learnerKey:"fixture-learner"});
  if(!result.ok)throw Error(JSON.stringify(result));return result.exercise;
}
