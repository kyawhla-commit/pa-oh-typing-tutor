import { describe,expect,it } from "vitest";
import { generateAdaptiveExercise } from "./generator";
import { validateCoverage,validateSpec } from "./validate";
import { spec,exercise } from "./testFixtures";
describe("typed specification/coverage failure",()=> {
  it.each([null,{}, {...spec(),focusItems:[]},{...spec(),focusType:"unknown"},{...spec(),mode:"timed"},{...spec(),completionPolicy:"target-covered"},{...spec(),difficulty:"hard"},
    {...spec(),desiredLength:{unit:"graphemes",value:NaN}}, {...spec(),desiredLength:{unit:"graphemes",value:0}}, {...spec(),desiredLength:{unit:"graphemes",value:301}},
    {...spec(),focusItems:["rr"]},{...spec("token",["two words"])},{...spec(),focusItems:["\ud800"]}, {...spec(),focusItems:["r","r"]},spec("general",["r"])])("invalid spec fails without throwing: %j",value=> {
    expect(validateSpec(value).ok).toBe(false);const r=generateAdaptiveExercise(value,{learnerKey:"a"});expect(r).toMatchObject({ok:false,code:"invalid-spec",attempts:0});
  });
  it("unsupported whitespace and merged bigram adjacency return a clear failure",()=> {
    expect(validateSpec(spec("grapheme",[" "]))).toMatchObject({ok:false,code:"unsupported-focus"});
    expect(validateSpec(spec("bigram",["a","\u0301"]))).toMatchObject({ok:false,code:"unsupported-focus"});
  });
  it("impossible token exposure fails within the strict attempt bound",()=> {
    const r=generateAdaptiveExercise(spec("token",["a".repeat(32)]),{learnerKey:"a"});expect(r.ok).toBe(false);
    if(!r.ok){expect(r.code).toBe("coverage-unsatisfied");expect(r.attempts).toBeLessThanOrEqual(16);expect(r.reason).toMatch(/contract/);}
  });
  it("final text tampering cannot pass a cached coverage claim",()=> {
    const e=exercise();expect(validateCoverage(e.text.replace(/r/g,"x"),e.generatedFrom.spec,e.sections,e.contentStrategy).valid).toBe(false);
  });
  it("oversized text, repetition and missing sections fail independent verification",()=> {
    const e=exercise();expect(validateCoverage(e.text+" red".repeat(100),e.generatedFrom.spec,e.sections,"curated").valid).toBe(false);
    expect(validateCoverage(e.text,e.generatedFrom.spec,[],"curated").valid).toBe(false);
    expect(validateCoverage(e.text,e.generatedFrom.spec,[e.sections[0],{...e.sections[1],start:e.sections[0].start},e.sections[2]],"curated").valid).toBe(false);
  });
});
