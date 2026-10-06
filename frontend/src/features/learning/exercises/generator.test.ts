import { describe,expect,it,vi } from "vitest";
import { prepareTypingText } from "../../../engine/typing";
import { generateAdaptiveExercise } from "./generator";
import { ENGLISH_CONTENT,prepareContentBank } from "./content";
import { validateCoverage } from "./validate";
import { EXERCISE } from "./constants";
import { spec,exercise } from "./testFixtures";

describe("deterministic curated exercise generation",()=> {
  it("same inputs repeatedly return identical frozen exercises",()=> {
    const s=spec();const a=generateAdaptiveExercise(s,{learnerKey:"a"}),b=generateAdaptiveExercise(s,{learnerKey:"a"});expect(a).toEqual(b);
    if(!a.ok)throw Error(a.reason);expect(Object.isFrozen(a.exercise)).toBe(true);expect(Object.isFrozen(a.exercise.generatedFrom.spec)).toBe(true);
  });
  it("recommendation and learner identities can change valid deterministic selection",()=> {
    const a=exercise("general",[],"one"),b=exercise("general",[],"two");expect(a.id).not.toBe(b.id);expect(a.text).not.toBe(b.text);
    expect(generateAdaptiveExercise(spec("general",[],"one"),{learnerKey:"other"})).not.toEqual({ok:true,exercise:a});
  });
  it("generator/content versions affect stable identity",()=> {
    const s=spec(),a=generateAdaptiveExercise(s,{learnerKey:"a"}),b=generateAdaptiveExercise(s,{learnerKey:"a",generatorVersion:"adaptive-exercise-v2"}),c=generateAdaptiveExercise(s,{learnerKey:"a",bank:{...ENGLISH_CONTENT,version:"english-content-v2"}});
    expect(a.ok && b.ok && c.ok).toBe(true);if(!a.ok||!b.ok||!c.ok)return;
    expect(new Set([a.exercise.id,b.exercise.id,c.exercise.id]).size).toBe(3);expect(b.exercise.source.version).toContain("v2");
  });
  it("does not depend on Date or Math.random",()=> {
    const original=exercise();const random=vi.spyOn(Math,"random").mockImplementation(()=>{throw Error("random");});const now=vi.spyOn(Date,"now").mockImplementation(()=>{throw Error("time");});
    try{expect(exercise()).toEqual(original);}finally{random.mockRestore();now.mockRestore();}
  });
  it.each([{items:["r"]},{items:["r","t"]}])("weak graphemes $items receive sufficient balanced contextual exposure",({items})=> {
    const e=exercise("grapheme",items);expect(e.contentStrategy).toBe("curated");
    for(const row of e.coverage.focus){expect(row.occurrences).toBeGreaterThanOrEqual(12);expect(row.contexts.length).toBeGreaterThanOrEqual(3);expect(row.sections[0]).toBeGreaterThanOrEqual(3);expect(row.sections[1]).toBeGreaterThanOrEqual(5);expect(row.sections[2]).toBeGreaterThanOrEqual(4);}
    expect(e.coverage.mixedOrdinaryTokens).toBeGreaterThanOrEqual(3);
    expect(Math.max(...e.coverage.focus.map(r=>r.occurrences))/Math.min(...e.coverage.focus.map(r=>r.occurrences))).toBeLessThanOrEqual(1.75);
  });
  it("preserves directional substitutions and balances both sides",()=> {
    const a=exercise("substitution",["r","t"]),b=exercise("substitution",["t","r"]);
    expect(a.generatedFrom.spec.focusItems).toEqual(["r","t"]);expect(b.generatedFrom.spec.focusItems).toEqual(["t","r"]);expect(a.id).not.toBe(b.id);
    expect(a.coverage.focus[0].occurrences).toBeGreaterThanOrEqual(12);expect(a.coverage.focus[1].occurrences).toBeGreaterThanOrEqual(10);
    expect(a.coverage.focus[0].occurrences).toBeGreaterThanOrEqual(a.coverage.focus[1].occurrences);
  });
  it.each([{items:["t","h"]},{items:["e","r"]},{items:["i","n"]}])("bigram $items appears in varied target-token contexts",({items})=> {
    const e=exercise("bigram",items);expect(e.coverage.focus[0].occurrences).toBeGreaterThanOrEqual(10);expect(e.coverage.focus[0].contexts.length).toBeGreaterThanOrEqual(3);expect(e.contentStrategy).toBe("curated");
  });
  it.each(["é","e\u0301","👩‍💻","𝄞","ပ","\u0301"])("unsupported-bank grapheme %s gets an exact Unicode drill",item=> {
    const e=exercise("grapheme",[item]);expect(e.contentStrategy).toBe("fallback-drill");expect(e.strategyReason).toMatch(/not a linguistic sentence/);
    expect(e.focusItems).toEqual([item.normalize("NFC")]);expect(e.coverage.focus[0].occurrences).toBeGreaterThanOrEqual(12);expect(e.preparedText.expectedUnits.filter(u=>u===item.normalize("NFC")).length).toBeGreaterThanOrEqual(12);
  });
  it.each([{items:["👩‍💻","😀"]},{items:["é","𝄞"]},{items:["ပ","အ"]}])("unsupported Unicode bigram $items remains adjacent",({items})=> {
    const e=exercise("bigram",items);expect(e.contentStrategy).toBe("fallback-drill");expect(e.coverage.focus[0].occurrences).toBeGreaterThanOrEqual(10);
  });
  it("difficult known token has repeated varied contextual use",()=> {
    const e=exercise("token",["through"]);expect(e.contentStrategy).toBe("curated");expect(e.coverage.focus[0].occurrences).toBeGreaterThanOrEqual(4);expect(e.coverage.focus[0].contexts.length).toBeGreaterThanOrEqual(3);expect(e.coverage.maxTokenShare).toBeLessThanOrEqual(.25);
  });
  it.each([{items:["word,"]},{items:["ပအိုဝ်ႏ"]},{items:["👩‍💻"]},{items:["__proto__"]},{items:["hello","road"]}])("token targets $items are preserved and balanced without endless repetition",({items})=> {
    const e=exercise("token",items);expect(e.coverage.focus.every(row=>row.occurrences>=4)).toBe(true);expect(e.coverage.longestIdenticalTokenRun).toBeLessThanOrEqual(2);expect(e.contentStrategy).toBe("fallback-drill");
    expect(e.coverage.maxTokenShare).toBeLessThanOrEqual(.4);
  });
  it.each(["accuracy","speed","general"] as const)("%s uses varied familiar text without false target metadata",type=> {
    const e=exercise(type,[]);expect(e.contentStrategy).toBe("curated");expect(e.focusItems).toEqual([]);expect(e.coverage.focus).toEqual([]);
    expect(e.coverage.distinctTokens).toBeGreaterThanOrEqual(10);expect(e.coverage.punctuationRatio).toBeLessThanOrEqual(.03);expect(e.coverage.totalGraphemes).toBeGreaterThanOrEqual(96);expect(e.coverage.totalGraphemes).toBeLessThanOrEqual(150);
    expect(e.sections.map(s=>s.composition)).toEqual(["controlled","contextual","fluent"]);
    if(type==="accuracy" || type==="speed")for(const token of prepareTypingText(e.sections[0].text).words)expect(ENGLISH_CONTENT.familiarWords.some(w=>w.text===token.text)).toBe(true);
    if(type==="speed")expect(prepareTypingText(e.sections[0].text).words.every(w=>w.end-w.start<=4)).toBe(true);
  });
  it("source identity is compact and domain-prepared content remains intact",()=> {
    const e=exercise();expect(e.source.type).toBe("adaptive");expect(e.source.id.length).toBeLessThan(128);expect(e.source.version.length).toBeLessThanOrEqual(128);
    expect(e.preparedText).toEqual(prepareTypingText(e.text));for(const s of e.sections)expect(e.preparedText.units.slice(s.start,s.end).join("")).toBe(s.text);
  });
  it("deterministic content indices exactly match domain graphemes/adjacent pairs",()=> {
    for(const [unit,words] of ENGLISH_CONTENT.wordsByGrapheme)for(const word of words)expect(word.prepared.expectedUnits).toContain(unit);
    for(const [key,words] of ENGLISH_CONTENT.wordsByBigram)for(const word of words){const [a,b]=JSON.parse(key);expect(word.prepared.expectedUnits.some((u,i)=>u===a && word.prepared.expectedUnits[i+1]===b)).toBe(true);}
    for(const word of ENGLISH_CONTENT.words)for(const unit of new Set(word.prepared.expectedUnits))expect(ENGLISH_CONTENT.wordsByGrapheme.get(unit)).toContain(word);
  });
  it("empty curated contexts fall back without silently dropping a focus",()=> {
    const bank=prepareContentBank("empty-focus-v1",[],{accuracy:ENGLISH_CONTENT.accuracy.map(c=>c.text),speed:ENGLISH_CONTENT.speed.map(c=>c.text),general:ENGLISH_CONTENT.general.map(c=>c.text)});
    const r=generateAdaptiveExercise(spec("grapheme",["é"]),{learnerKey:"a",bank});expect(r.ok).toBe(true);if(r.ok)expect(r.exercise.contentStrategy).toBe("fallback-drill");
  });
  it("stress: 350 deterministic exercises all satisfy final contracts",()=> {
    const cases=[spec("grapheme",["r"]),spec("substitution",["r","t"]),spec("bigram",["t","h"]),spec("token",["through"]),spec("accuracy",[]),spec("speed",[]),spec("general",[])];
    const start=performance.now();let generated=0;
    for(let i=0;i<50;i++)for(const s of cases){const r=generateAdaptiveExercise({...s,recommendationId:`${s.focusType}-${i}`},{learnerKey:"stress"});expect(r.ok).toBe(true);if(!r.ok)throw Error(r.reason);
      expect(validateCoverage(r.exercise.text,r.exercise.generatedFrom.spec,r.exercise.sections,r.exercise.contentStrategy).valid).toBe(true);generated++;}
    console.info(`Exercise stress: ${generated} valid exercises in ${(performance.now()-start).toFixed(1)} ms; ${ENGLISH_CONTENT.words.length} words, ${ENGLISH_CONTENT.phrases.length} phrases.`);
  },15000);
});
