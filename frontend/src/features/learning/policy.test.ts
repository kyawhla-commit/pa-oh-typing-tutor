import { describe,expect,it } from "vitest";
import { recommendPractice } from "./policy";
import { recommendationText,practiceSpec } from "./recommendations";
import { compareUnicode } from "./aggregation";
import { emptyProfile } from "./profile";
import { evidence,profileOf } from "./testFixtures";
const errors=(n:number)=>Array.from({length:n},(_,i)=>i);
const types=(p:ReturnType<typeof profileOf>)=>recommendPractice(p).map(r=>r.type);
describe("deterministic recommendations",()=> {
  it("no evidence returns honest general practice",()=>expect(types(emptyProfile())).toEqual(["GENERAL_PRACTICE"]));
  it("a single wrong character cannot establish a weakness",()=>expect(types(profileOf(evidence("r",[0])))).toEqual(["GENERAL_PRACTICE"]));
  it("sufficient repeated grapheme mistakes expose exact evidence",()=> {
    const r=recommendPractice(profileOf(evidence("r".repeat(24),errors(5)))).find(r=>r.type==="WEAK_GRAPHEME")!;
    expect(r.targets).toEqual(["r"]); expect(r.evidence.recent).toMatchObject({opportunities:24,errorOccurrences:5,incorrectAttempts:5}); expect(r.evidenceStrength).toBe("medium");
    expect(r.priority).toBe(263); // round(5/24*1000) + 5*2 + 5*3 + 5*2 + 20.
    expect(recommendationText(r).reason).toContain("5 of 24");
  });
  it("many opportunities with a low error rate do not recommend a weak key",()=>expect(types(profileOf(evidence("r".repeat(100),[0])))).toEqual(["GENERAL_PRACTICE"]));
  it("repeated directional substitutions remain distinct",()=> {
    const p=profileOf(evidence("r ".repeat(24),[0,2,4,6],"a","t"),evidence("t ".repeat(24),[0],"b","r"));
    const rows=recommendPractice(p).filter(r=>r.type==="SUBSTITUTION_CONFUSION");
    expect(rows.map(r=>r.targets)).toEqual([["r","t"]]); expect(rows[0].evidence.substitution).toEqual({lifetimeCount:4,recentCount:4});
  });
  it("pair eligibility uses repeated occurrence incidence rather than inventing n-grams",()=> {
    const p=profileOf(evidence("th".repeat(30),[0,4,8,13,17,21])); const rows=recommendPractice(p);
    expect(rows.some(r=>r.type==="WEAK_BIGRAM" && r.targets.join("")==="th")).toBe(true); expect(rows.some(r=>r.type==="WEAK_GRAPHEME")).toBe(false);
  });
  it("repeated source tokens with errors become token recommendations",()=> {
    const rows=recommendPractice(profileOf(evidence("abc ".repeat(6),[0,5,10])));
    expect(rows.find(r=>r.type==="DIFFICULT_WORD")?.targets).toEqual(["abc"]);
  });
  it("broad repeated poor accuracy takes precedence over specific targets",()=> {
    const p=profileOf(...[0,1,2].map(i=>evidence("abcdef".repeat(10),errors(30),`s${i}`)));
    const rows=recommendPractice(p); expect(rows.map(r=>r.type)).toEqual(["ACCURACY_FOCUS"]); expect(rows[0].evidence.sessions).toBe(3);
  });
  it("poor accuracy localized to one grapheme does not become broad accuracy focus",()=> {
    const p=profileOf(...[0,1,2].map(i=>evidence("r".repeat(40),errors(10),`s${i}`)));
    expect(types(p)).not.toContain("ACCURACY_FOCUS"); expect(types(p)).toContain("WEAK_GRAPHEME");
  });
  it("consistently strong accuracy permits modest speed-building fallback",()=> {
    const p=profileOf(...[0,1,2].map(i=>evidence("abc ".repeat(10),[],`s${i}`)));
    const rows=recommendPractice(p); expect(rows.map(r=>r.type)).toEqual(["SPEED_BUILDING"]); expect(recommendationText(rows[0]).reason).not.toMatch(/slow/i);
    expect(rows[0].evidence.speed).toHaveLength(3);
  });
  it("two strong sessions or subsecond samples do not establish stable speed readiness",()=> {
    const a=evidence("a".repeat(40),[],"a"); const b=evidence("a".repeat(40),[],"b"); expect(types(profileOf(a,b))).toEqual(["GENERAL_PRACTICE"]);
    const tiny=[a,b,{...a,summary:{...a.summary,sessionId:"c",activeElapsedMs:0}}]; expect(types(profileOf(...tiny))).toEqual(["GENERAL_PRACTICE"]);
  });
  it("recent improvement suppresses a retained lifetime weakness",()=> {
    const past=Array.from({length:8},(_,i)=>evidence("r".repeat(40),errors(20),`past${i}`));
    const fresh=Array.from({length:8},(_,i)=>evidence("r".repeat(20),[],`new${i}`));
    const p=profileOf(...past,...fresh); expect(p.lifetime.graphemes[0].errorOccurrences).toBe(160); expect(types(p)).not.toContain("WEAK_GRAPHEME");
  });
  it("recent deterioration can qualify despite low lifetime error rate",()=> {
    const past=Array.from({length:10},(_,i)=>evidence("r".repeat(40),[],`past${i}`));
    const fresh=Array.from({length:5},(_,i)=>evidence("r".repeat(40),errors(12),`new${i}`));
    const rows=recommendPractice(profileOf(...past,...fresh)); expect(rows.find(r=>r.type==="WEAK_GRAPHEME")?.evidence.window).toBe("recent");
  });
  it("lifetime weakness requires recent corroboration and is marked as lifetime evidence",()=> {
    const past=Array.from({length:8},(_,i)=>evidence("r".repeat(40),errors(10),`past${i}`));
    const current=Array.from({length:8},(_,i)=>evidence(i===7?"rrr":"r",i===7?[0]:[],`new${i}`));
    const rows=recommendPractice(profileOf(...past,...current));
    expect(rows.find(r=>r.type==="WEAK_GRAPHEME")?.evidence.window).toBe("lifetime");
    expect(rows.find(r=>r.type==="SUBSTITUTION_CONFUSION")?.evidence.window).toBe("lifetime");
    const clean=Array.from({length:8},(_,i)=>evidence(i===7?"rrr":"r",[],`clean${i}`));
    expect(types(profileOf(...past,...clean))).not.toContain("WEAK_GRAPHEME");
    expect(types(profileOf(...past,...clean))).not.toContain("SUBSTITUTION_CONFUSION");
  });
  it("returns at most three ranked recommendations with deterministic ties",()=> {
    const e=evidence("rst".repeat(40),errors(30));
    const p=profileOf({...e,aggregates:{...e.aggregates,bigrams:[],tokens:[]}}); const a=recommendPractice(p),b=recommendPractice(p);
    expect(a.length).toBe(3); expect(a).toEqual(b); expect(a.map(r=>r.priority)).toEqual([...a.map(r=>r.priority)].sort((a,b)=>b-a));
    expect(a[0].targets[0]).toBe("r"); expect(a[1].targets[0]).toBe("s");
  });
  it("Unicode target keys are eligible and scalar-order comparison is locale-free",()=> {
    const rows=recommendPractice(profileOf(evidence("é".repeat(24),errors(5)))); expect(rows.some(r=>r.targets[0]==="é")).toBe(true);
    expect(compareUnicode("𝄞","😀")).toBeLessThan(0); expect(compareUnicode("é","é")).toBe(0);
  });
  it("one noisy punctuation error never dominates",()=> {
    const rows=recommendPractice(profileOf(evidence("a".repeat(100)+"!",[100]))); expect(rows.some(r=>r.targets.includes("!"))).toBe(false);
  });
  it("emits deterministic specifications and structured reasons without generating text",()=> {
    for(const row of recommendPractice(profileOf(evidence("r ".repeat(24),[0,2,4,6],"a","t")))) {
      expect(practiceSpec(row)).toEqual(practiceSpec(row)); expect(practiceSpec(row)).toMatchObject({mode:"fixed-text",completionPolicy:"require-correct-target",desiredLength:{unit:"graphemes",value:120}});
      expect(practiceSpec(row)).not.toHaveProperty("text"); expect(row.reasonCode).toBeTruthy(); expect(row.evidence).toBeTruthy();
    }
  });
});
