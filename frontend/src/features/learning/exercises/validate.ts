import { prepareTypingText } from "../../../engine/typing";
import type { AdaptivePracticeSpec } from "../types";
import { EXERCISE } from "./constants";
import { analyzeCoverage } from "./coverage";
import type { ContentStrategy,CoverageValidation,ExerciseSection,GenerationResult } from "./types";
export function validateSpec(value:unknown):{ok:true;spec:AdaptivePracticeSpec}|Extract<GenerationResult,{ok:false}> {
  const fail=(reason:string,code:"invalid-spec"|"unsupported-focus"="invalid-spec")=>({ok:false as const,code,reason,attempts:0});
  if(!value || typeof value!=="object")return fail("A structured practice specification is required.");
  const spec=value as AdaptivePracticeSpec;
  if(typeof spec.recommendationId!=="string" || !spec.recommendationId.length || spec.recommendationId.length>EXERCISE.maxIdentityUnits
    || !["grapheme","substitution","bigram","token","accuracy","speed","general"].includes(spec.focusType)
    || !["steady","gradual-speed"].includes(spec.difficulty) || spec.mode!=="fixed-text" || spec.completionPolicy!=="require-correct-target"
    || spec.desiredLength?.unit!=="graphemes" || !Number.isSafeInteger(spec.desiredLength.value)
    || spec.desiredLength.value<EXERCISE.minDesiredLength || spec.desiredLength.value>EXERCISE.maxDesiredLength || !Array.isArray(spec.focusItems))return fail("Unsupported specification, mode, difficulty or desired length (80–300 graphemes).");
  const targeted=["grapheme","substitution","bigram","token"].includes(spec.focusType);
  if((targeted && (!spec.focusItems.length || spec.focusItems.length>EXERCISE.maxFocusItems)) || (!targeted && spec.focusItems.length)
    || (["substitution","bigram"].includes(spec.focusType) && spec.focusItems.length!==2))return fail("Focus arity does not match the specification type.");
  const items:string[]=[];
  for(const raw of spec.focusItems) {
    if(typeof raw!=="string" || !raw.length || raw.length>EXERCISE.maxFocusUnits || Array.from(raw).some(c=>{const cp=c.codePointAt(0)!;return cp>=0xd800 && cp<=0xdfff;}))return fail("Focus items must be bounded, well-formed Unicode strings.");
    const item=raw.normalize("NFC"),target=prepareTypingText(item);
    if(item.length>EXERCISE.maxFocusUnits)return fail("Normalized focus item exceeds the supported size.");
    if(/^\s+$/u.test(item) || /\p{Cc}/u.test(item))return fail("Whitespace/control-only focus drills are not supported in v1.","unsupported-focus");
    if(spec.focusType==="token" ? target.words.length!==1 || target.words[0].text!==item : target.units.length!==1)return fail("Focus items must match the existing grapheme or target-token contract.");
    items.push(item);
  }
  if(spec.focusType!=="bigram" && new Set(items).size!==items.length)return fail("Focus items must be distinct.");
  if(spec.focusType==="bigram" && (prepareTypingText(items.join("")).expectedUnits.length!==2 || !prepareTypingText(items.join("")).expectedUnits.every((u,i)=>u===items[i])))return fail("Requested adjacency merges graphemes and cannot be practiced exactly.","unsupported-focus");
  return {ok:true,spec:{recommendationId:spec.recommendationId,focusType:spec.focusType,focusItems:items,desiredLength:{unit:"graphemes",value:spec.desiredLength.value},difficulty:spec.difficulty,mode:"fixed-text",completionPolicy:"require-correct-target"}};
}
export function sectionMinimums(spec:AdaptivePracticeSpec):readonly (readonly number[])[] {
  if(spec.focusType==="bigram")return [EXERCISE.bigram.sections];
  if(spec.focusType==="substitution")return [EXERCISE.substitution.expected,EXERCISE.substitution.counterpart];
  return spec.focusItems.map(()=>spec.focusType==="token"?EXERCISE.token.sections:EXERCISE.grapheme.sections);
}
export function validateCoverage(text:string,spec:AdaptivePracticeSpec,sections:readonly ExerciseSection[],strategy:ContentStrategy):CoverageValidation {
  const target=prepareTypingText(text);const coverage=analyzeCoverage(text,spec,sections,target);const issues:string[]=[];
  if(coverage.totalGraphemes<Math.ceil(spec.desiredLength.value*EXERCISE.minLengthRatio) || coverage.totalGraphemes>Math.floor(spec.desiredLength.value*EXERCISE.maxLengthRatio))issues.push("Exercise length is outside the controlled tolerance.");
  if(sections.length!==3 || sections.map(s=>s.text).join("\n")!==text || sections.some((s,i)=>s.kind!==["focus","context","mixed"][i] || !s.text.length || s.end<=s.start
    || s.start!==(i?sections[i-1].end+1:0) || target.units.slice(s.start,s.end).join("")!==s.text)
    || sections.at(-1)?.end!==target.units.length)issues.push("Three intact ordered progression sections must partition the final target.");
  const minimums=sectionMinimums(spec);
  coverage.focus.forEach((row,n)=> {
    if(row.occurrences<minimums[n].reduce((a,b)=>a+b,0))issues.push(`Focus ${JSON.stringify(row.items)} lacks total target exposure.`);
    if(row.sections.length!==3 || row.sections.some((count,s)=>count<minimums[n][s]))issues.push(`Focus ${JSON.stringify(row.items)} lacks required section exposure.`);
    if(strategy==="curated" && row.contexts.length<(spec.focusType==="token"?EXERCISE.token.contexts:spec.focusType==="bigram"?EXERCISE.bigram.contexts:EXERCISE.grapheme.contexts))issues.push(`Focus ${JSON.stringify(row.items)} lacks contextual diversity.`);
  });
  if(coverage.focus.length>1 && Math.max(...coverage.focus.map(r=>r.occurrences))/Math.min(...coverage.focus.map(r=>r.occurrences))>EXERCISE.maxBalanceRatio)issues.push("Focus exposure is unbalanced.");
  if(spec.focusType==="substitution" && coverage.focus[0].occurrences<coverage.focus[1].occurrences)issues.push("Expected target must receive at least as much exposure as its confusion counterpart.");
  if(coverage.maxTokenShare>(strategy==="fallback-drill"?EXERCISE.fallbackMaxTokenShare:EXERCISE.maxTokenShare))issues.push("One identical token dominates the exercise.");
  if(coverage.longestIdenticalTokenRun>EXERCISE.maxIdenticalTokenRun || coverage.longestIsolatedFocusRun>EXERCISE.maxIsolatedFocusRun)issues.push("Excessive uninterrupted repetition.");
  if(coverage.focus.length && coverage.mixedOrdinaryTokens<EXERCISE.minMixedOrdinaryTokens)issues.push("Mixed application needs ordinary non-focus content.");
  if(coverage.focus.length && (coverage.sectionDensities[0]<(strategy==="curated"?EXERCISE.minWarmupDensity:EXERCISE.fallbackMinWarmupDensity)
    || coverage.sectionDensities[1]<(strategy==="curated"?EXERCISE.minContextDensity:EXERCISE.fallbackMinContextDensity)
    || coverage.sectionDensities[2]>coverage.sectionDensities[0] || coverage.sectionDensities[2]>coverage.sectionDensities[1]))issues.push("Focus density must progress toward lower-density mixed application.");
  if(!coverage.focus.length && (coverage.distinctTokens<EXERCISE.minBroadDistinctTokens || coverage.punctuationRatio>EXERCISE.maxBroadPunctuationRatio))issues.push("Broad practice needs familiar variety and low punctuation density.");
  return {valid:issues.length===0,issues,coverage};
}
