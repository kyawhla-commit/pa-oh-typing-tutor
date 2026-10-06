import { describe,expect,it } from "vitest";
import { createTypingEngine,type SessionResult } from "../../engine/typing";
import { extractLearningEvidence } from "./evidence";
import { completed,evidence } from "./testFixtures";
import { targetKey } from "./aggregation";
const graph = (e: NonNullable<ReturnType<typeof extractLearningEvidence>>,g: string) => e.aggregates.graphemes.find(s=>s.target[0]===g)!;
describe("completed-result evidence",()=> {
  it("clean session retains metrics/source/counts without the target buffer",()=> {
    const e=evidence("abc abc"); expect(e.summary).toMatchObject({ sourceIdentity:{type:"corpus",id:"fixture",version:"1"},totalAttempts:7,incorrectAttempts:0,activeElapsedMs:2000 });
    expect(graph(e,"a")).toMatchObject({opportunities:2,errorOccurrences:0}); expect(e.mistakes).toEqual([]);
    expect(e).not.toHaveProperty("target"); expect(e).not.toHaveProperty("typedUnits");
  });
  it("records expected/actual substitutions and remaining mistakes",()=> {
    const e=evidence("abc",[1],"s","r"); expect(e.mistakes).toEqual([{expected:"b",actual:"r",position:1,attempt:2,atMs:2000,correctedAtMs:null}]);
    expect(e.aggregates.substitutions).toEqual([{expected:"b",actual:"r",count:1,corrected:0,remaining:1}]);
    expect(graph(e,"b")).toMatchObject({errorOccurrences:1,incorrectAttempts:1,remainingErrors:1});
  });
  it("retains corrected history and repeats at the same position without inflating opportunities",()=> {
    const engine=createTypingEngine({targetText:"ab",sourceIdentity:{type:"lesson",id:"1",version:"1"}});
    engine.dispatch({type:"INSERT_TEXT",text:"X",atMs:0}); engine.dispatch({type:"DELETE_BACKWARD",atMs:10});
    engine.dispatch({type:"INSERT_TEXT",text:"X",atMs:20}); engine.dispatch({type:"DELETE_BACKWARD",atMs:30});
    engine.dispatch({type:"INSERT_TEXT",text:"ab",atMs:100});
    const e=extractLearningEvidence(engine.getResult(),"s",100)!;
    expect(graph(e,"a")).toMatchObject({opportunities:1,errorOccurrences:1,incorrectAttempts:2,correctedErrors:2,remainingErrors:0});
    expect(e.summary).toMatchObject({totalAttempts:4,incorrectAttempts:2,correctedErrors:2,backspaces:2});
  });
  it.each(["éx","👩‍💻x","ပအိုဝ်ႏ"])("uses grapheme positions for %s",text=> {
    const result=completed(text,[0]); const e=extractLearningEvidence(result,"s",0)!;
    expect(e.mistakes[0].expected).toBe(result.target.units[0].normalize("NFC"));
    expect(e.aggregates.graphemes.reduce((n,s)=>n+s.opportunities,0)).toBe(result.target.units.length);
  });
  it("associates a combining-mark revision with its expected cluster",()=> {
    const engine=createTypingEngine({targetText:"éx"}); engine.dispatch({type:"INSERT_TEXT",text:"e",atMs:0}); engine.dispatch({type:"INSERT_TEXT",text:"\u0301x",atMs:10});
    const e=extractLearningEvidence(engine.getResult(),"s",10)!;
    expect(graph(e,"é")).toMatchObject({opportunities:1,errorOccurrences:1,correctedErrors:1}); expect(e.mistakes[0].actual).toBe("e");
  });
  it("bigram incidence counts an occurrence once even if both positions were wrong",()=> {
    const e=evidence("thth",[0,1]);
    const th=e.aggregates.bigrams.find(s=>targetKey(s.target)===targetKey(["t","h"]))!;
    expect(th).toMatchObject({opportunities:2,errorOccurrences:1,incorrectAttempts:2});
    expect(e.aggregates.bigrams.find(s=>s.target.join("")==="ht")).toMatchObject({opportunities:1,errorOccurrences:1,incorrectAttempts:1});
  });
  it("uses fully observed source token boundaries, retaining attached punctuation",()=> {
    const e=evidence("hi,  hi,\nbye",[0,5]); expect(e.aggregates.tokens.find(s=>s.target[0]==="hi,")).toMatchObject({opportunities:2,errorOccurrences:2,incorrectAttempts:2});
    expect(e.aggregates.tokens.find(s=>s.target[0]==="bye")).toMatchObject({opportunities:1,errorOccurrences:0});
  });
  it("timed positions and token/bigram opportunities cross corpus cycles",()=> {
    const engine=createTypingEngine({mode:"timed",durationMs:1000,textPolicy:"repeat-corpus",targetText:"ab ",sourceIdentity:{type:"corpus",id:"x",version:"1"}});
    engine.dispatch({type:"INSERT_TEXT",text:"ab aX ",atMs:0}); engine.dispatch({type:"TICK",atMs:1000});
    const e=extractLearningEvidence(engine.getResult(),"s",0)!; expect(graph(e,"b")).toMatchObject({opportunities:2,errorOccurrences:1});
    expect(e.aggregates.tokens[0]).toMatchObject({target:["ab"],opportunities:2,errorOccurrences:1}); expect(e.mistakes[0].position).toBe(4);
  });
  it("does not fabricate exposure for correct deleted suffixes absent from the ledger",()=> {
    const engine=createTypingEngine({mode:"timed",durationMs:1000,textPolicy:"repeat-corpus",targetText:"abc "});
    engine.dispatch({type:"INSERT_TEXT",text:"abc",atMs:0}); engine.dispatch({type:"DELETE_BACKWARD",atMs:1}); engine.dispatch({type:"DELETE_BACKWARD",atMs:2}); engine.dispatch({type:"TICK",atMs:1000});
    const e=extractLearningEvidence(engine.getResult(),"s",0)!; expect(e.exposure).toBe("observed-position-lower-bound"); expect(e.aggregates.graphemes.map(s=>s.target[0])).toEqual(["a"]);
  });
  it("includes earlier mistake positions that were deleted before timed completion",()=> {
    const engine=createTypingEngine({mode:"timed",durationMs:1000,textPolicy:"repeat-corpus",targetText:"abc "});
    engine.dispatch({type:"INSERT_TEXT",text:"abX",atMs:0}); engine.dispatch({type:"DELETE_BACKWARD",atMs:1}); engine.dispatch({type:"TICK",atMs:1000});
    expect(graph(extractLearningEvidence(engine.getResult(),"s",0)!,"c")).toMatchObject({opportunities:1,correctedErrors:1});
  });
  it("private/unknown sources omit target tokens and adjacent-pair order",()=> {
    const e=extractLearningEvidence(completed("private passage",[0],"X","fixed-text",true),"s",0)!;
    expect(e.aggregates.tokens).toEqual([]); expect(e.aggregates.bigrams).toEqual([]);
    expect(JSON.stringify(e)).not.toContain("private passage");
    expect(e.summary.sourceIdentity?.type).toBe("custom");
  });
  it.each([null,{status:"aborted"},{status:"running"},{status:"completed"}])("excludes incomplete/invalid result %j",result=>expect(extractLearningEvidence(result as SessionResult,"s",0)).toBeNull());
  it("rejects inconsistent counts and invalid timestamps",()=> {
    const result=completed("abc"); expect(extractLearningEvidence({...result,counts:{...result.counts,totalInsertionAttempts:NaN}},"s",0)).toBeNull();
    expect(extractLearningEvidence(result,"s",NaN)).toBeNull();
  });
  it("rejects invalid ledger entries and prepared boundaries without throwing",()=> {
    const result=completed("abc",[0]);
    for(const mistake of [{...result.mistakes[0],text:null},{...result.mistakes[0],attempt:0}, {...result.mistakes[0],atMs:-1}, {...result.mistakes[0],correctedAtMs:3000}]) {
      expect(extractLearningEvidence({...result,mistakes:[mistake]} as SessionResult,"s",0)).toBeNull();
    }
    expect(extractLearningEvidence({...result,target:{...result.target,words:[{text:"abc",start:0,end:4}]}},"s",0)).toBeNull();
  });
  it("bounds examples and omits exceptionally long clusters while preserving global counts",()=> {
    const e=evidence("a".repeat(100),Array.from({length:100},(_,i)=>i)); expect(e.mistakes.length).toBe(32); expect(e.summary.incorrectAttempts).toBe(100);
    const long=extractLearningEvidence(completed("a"+"\u0301".repeat(40)+"b",[0]),"s",0)!;
    expect(long.aggregates.graphemes.some(s=>s.target[0].length>32)).toBe(false);
  });
});
