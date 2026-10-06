import { prepareTypingText,type TargetText } from "../../../engine/typing";
import type { AdaptivePracticeSpec } from "../types";
import { compareUnicode } from "../aggregation";
import type { ExerciseCoverage,ExerciseSection } from "./types";

export function focusGroups(spec:AdaptivePracticeSpec):readonly (readonly string[])[] {
  return spec.focusType==="bigram" ? [spec.focusItems] : spec.focusItems.map(item=>[item]);
}
function occurrences(target:TargetText,spec:AdaptivePracticeSpec,items:readonly string[]):number[] {
  if(spec.focusType==="token")return target.words.filter(word=>word.text.normalize("NFC")===items[0]).map(word=>word.start);
  const positions:number[]=[];
  for(let i=0;i<=target.expectedUnits.length-items.length;i++)if(items.every((item,n)=>target.expectedUnits[i+n]===item))positions.push(i);
  return positions;
}
export function focusCounts(target:TargetText,spec:AdaptivePracticeSpec):number[] {
  return focusGroups(spec).map(items=>occurrences(target,spec,items).length);
}
export function analyzeCoverage(text:string,spec:AdaptivePracticeSpec,sections:readonly ExerciseSection[]=[],prepared=prepareTypingText(text)):ExerciseCoverage {
  const groups=focusGroups(spec);const allPositions=groups.map(items=>occurrences(prepared,spec,items));
  const tokenHasFocus=(start:number,end:number)=>allPositions.some((positions,n)=>positions.some(p=>p>=start && p+(spec.focusType==="token" ? prepareTypingText(groups[n][0]).units.length : groups[n].length)<=end));
  const focus=groups.map((items,n)=> {
    const positions=allPositions[n];const contexts=new Set<string>();
    prepared.words.forEach((word,i)=> {
      if(!positions.some(p=>p>=word.start && p+(spec.focusType==="token" ? word.end-word.start : items.length)<=word.end))return;
      if(spec.focusType==="token")contexts.add(JSON.stringify([prepared.words[i-1]?.text.normalize("NFC")??"",word.text.normalize("NFC"),prepared.words[i+1]?.text.normalize("NFC")??""]));
      else if(word.end-word.start>items.length)contexts.add(word.text.normalize("NFC"));
    });
    return {items:[...items],occurrences:positions.length,contexts:[...contexts].sort(compareUnicode),
      sections:sections.map(section=>focusCounts(prepareTypingText(section.text),spec)[n])};
  });
  const tokens=prepared.words.map(word=>word.text.normalize("NFC"));const frequencies=new Map<string,number>();let longestRun=0,run=0,previous="",isolatedRun=0,longestIsolated=0;
  for(const token of tokens) {
    frequencies.set(token,(frequencies.get(token)??0)+1);run=token===previous?run+1:1;longestRun=Math.max(longestRun,run);previous=token;
    isolatedRun=groups.some(items=>items.join("")===token)?isolatedRun+1:0;longestIsolated=Math.max(longestIsolated,isolatedRun);
  }
  const mixed=sections.find(section=>section.kind==="mixed");
  return {totalGraphemes:prepared.units.length,tokenCount:tokens.length,distinctTokens:frequencies.size,focus,
    sectionDensities:sections.map(section=> {
      const local=prepareTypingText(section.text);const positions=new Set<number>();
      groups.forEach(items=>occurrences(local,spec,items).forEach(p=> {
        const width=spec.focusType==="token"?local.words.find(w=>w.start===p)!.end-p:items.length;
        for(let j=0;j<width;j++)positions.add(p+j);
      }));
      return positions.size/local.units.length;
    }),
    mixedOrdinaryTokens:mixed?prepared.words.filter(word=>word.start>=mixed.start && word.end<=mixed.end && !tokenHasFocus(word.start,word.end) && /\p{L}/u.test(word.text)).length:0,
    maxTokenShare:tokens.length?Math.max(0,...frequencies.values())/tokens.length:0,longestIdenticalTokenRun:longestRun,longestIsolatedFocusRun:longestIsolated,
    punctuationRatio:prepared.units.filter(unit=>/\p{P}/u.test(unit)).length/prepared.units.length};
}
