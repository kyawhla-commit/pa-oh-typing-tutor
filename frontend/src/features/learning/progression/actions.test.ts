import { describe,expect,it } from "vitest";
import { learningAction,nextCompositionLevel } from "./actions";
import { eligibleRecord } from "./testFixtures";
import { record } from "../transfer/testFixtures";
describe("one pure deterministic learning action",()=>{
  it("insufficient evidence calls for normal practice",()=>expect(learningAction(record(undefined,[],[],{state:"INSUFFICIENT_EVIDENCE"})).type).toBe("normal-practice"));
  it("initial active weakness targets level zero",()=>expect(learningAction(record())).toMatchObject({type:"targeted-practice",progressionLevel:0}));
  it.each([1,2] as const)("contextual level %s",practiceLevel=>expect(learningAction(record(undefined,[],[],{state:"IMPROVING",practiceLevel}))).toMatchObject({type:"contextual-practice",progressionLevel:practiceLevel}));
  it("one successful drill advances composition without changing mastery thresholds",()=>expect(learningAction(record(undefined,[],[],{state:"ACTIVE",practiceLevel:1}))).toMatchObject({type:"contextual-practice",progressionLevel:1}));
  it("transfer waiting calls for normal practice",()=>expect(learningAction({...eligibleRecord(),waiting:[]})).toMatchObject({type:"normal-practice"}));
  it("eligible check requests exactly a controlled assessment",()=>expect(learningAction(eligibleRecord())).toMatchObject({type:"controlled-assessment",progressionLevel:2}));
  it("provisional mastery has no targeted action",()=>expect(learningAction(record(undefined,[],[],{state:"PROVISIONAL_MASTERY"}))).toEqual({type:"none"}));
  it("regression always returns concentrated practice",()=>expect(learningAction(record(undefined,[],[],{state:"REGRESSED",practiceLevel:2}))).toMatchObject({type:"targeted-practice",progressionLevel:0}));
  it("unknown identity falls back safely",()=>expect(learningAction(record({kind:"unknown",items:[]} as never))).toEqual({type:"normal-practice"}));
  it("repeated action evaluation cannot mutate or start anything",()=>{
    const r=eligibleRecord(),before=JSON.stringify(r);expect(learningAction(r)).toEqual(learningAction(r));expect(JSON.stringify(r)).toBe(before);
  });
  it.each([[0,true,false,1],[1,true,false,2],[2,true,false,2],[2,false,false,1],[1,false,false,0],[0,false,false,0],[2,false,true,0]] as const)("level %s success=%s severe=%s -> %s",(level,success,severe,next)=>expect(nextCompositionLevel(level,success,severe)).toBe(next));
});
