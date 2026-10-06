import { describe,expect,it } from "vitest";
import { generateAdaptiveExercise } from "../exercises/generator";
import { spec } from "../exercises/testFixtures";
import { validateCoverage } from "../exercises/validate";
import { focusDensity,validateComposition } from "./composition";
import type { ProgressionLevel } from "./types";
const cases=[spec("grapheme",["r"]),spec("substitution",["r","t"]),spec("bigram",["t","h"]),spec("token",["through"]),spec("accuracy",[]),spec("speed",[]),spec("general",[]),spec("grapheme",["é"]),spec("token",["ပအိုဝ်ႏ"])];
export function generate(s=spec(),level:ProgressionLevel=0,ordinal=0,purpose:"training"|"controlled-transfer-assessment"="training") {
  const result=generateAdaptiveExercise(s,{learnerKey:"slice8",composition:{level,ordinal,purpose}});
  if(!result.ok)throw Error(`${s.focusType}:${s.focusItems} L${level} ${purpose}: ${result.reason}`);return result.exercise;
}
describe("material deterministic composition",()=>{
  it.each(cases)("all levels preserve baseline coverage for $focusType:$focusItems",s=>{
    const exercises=([0,1,2] as const).map(level=>generate(s,level));
    for(let level=0;level<3;level++){
      const e=exercises[level];expect(e).toEqual(generate(s,level as ProgressionLevel));
      expect(validateCoverage(e.text,e.generatedFrom.spec,e.sections,e.contentStrategy).valid).toBe(true);
      expect(validateComposition(e.text,e.generatedFrom.spec,e.sections,e.contentStrategy,e.generatedFrom.composition!).valid).toBe(true);
    }
    expect(new Set(exercises.map(e=>e.id)).size).toBe(3);expect(new Set(exercises.map(e=>e.text)).size).toBe(3);
    if(s.focusItems.length){expect(focusDensity(exercises[0].text,s)).toBeGreaterThan(focusDensity(exercises[2].text,s));}
  });
  it.each(cases.slice(0,4))("explicit assessment coverage for $focusType",s=>{
    const e=generate(s,2,0,"controlled-transfer-assessment");expect(validateComposition(e.text,e.generatedFrom.spec,e.sections,e.contentStrategy,e.generatedFrom.composition!).valid).toBe(true);
    expect(focusDensity(e.text,s)).toBeLessThan(focusDensity(generate(s).text,s));
  });
});
