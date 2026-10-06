import { describe,expect,it } from "vitest";
import { observeWeakness } from "./evidence";
import { createTypingEngine } from "../../../engine/typing";
import { extractLearningEvidence } from "../evidence";
import { session,r } from "./testFixtures";
describe("focus-specific evidence",()=>{
  it("overall high accuracy cannot hide repeated focus errors",()=>{
    const e=session("s","r".repeat(12)+"a".repeat(588),[0,1,2]);
    expect(e.summary.attemptAccuracy).toBeGreaterThan(99);
    expect(observeWeakness(e,r,1,"ordinary-practice")).toMatchObject({opportunities:12,errors:3});
  });
  it.each([true,false])("corrected=%s errors remain affected occurrences",(corrected)=>{
    const e=session("s",undefined,[0,1],{corrected});
    expect(observeWeakness(e,r,1,"ordinary-practice").errors).toBe(2);
    expect(e.summary[corrected ? "correctedErrors" : "remainingErrors"]).toBe(2);
  });
  it("counts directional attempts with expected exposure, not counterpart exposure",()=>{
    const e=session("s","rrrrtttt",[0,1,4],{actual:"t"});
    expect(observeWeakness(e,{kind:"substitution",items:["r","t"]},1,"ordinary-practice")).toMatchObject({opportunities:4,errors:2});
    expect(observeWeakness(e,{kind:"substitution",items:["t","r"]},1,"ordinary-practice").errors).toBe(0);
  });
  it("repeated corrected confusion counts attempts while grapheme incidence counts one position",()=>{
    const engine=createTypingEngine({targetText:"rrrr",completionPolicy:"require-correct-target",sourceIdentity:{type:"corpus",id:"fixture",version:"1"}});
    engine.dispatch({type:"INSERT_TEXT",text:"t",atMs:0});engine.dispatch({type:"DELETE_BACKWARD",atMs:1});
    engine.dispatch({type:"INSERT_TEXT",text:"t",atMs:2});engine.dispatch({type:"DELETE_BACKWARD",atMs:3});
    engine.dispatch({type:"INSERT_TEXT",text:"rrrr",atMs:2000});const e=extractLearningEvidence(engine.getResult(),"repeat",0)!;
    expect(observeWeakness(e,r,1,"ordinary-practice")).toMatchObject({opportunities:4,errors:1});
    expect(observeWeakness(e,{kind:"substitution",items:["r","t"]},1,"ordinary-practice")).toMatchObject({opportunities:4,errors:2});
  });
  it("keeps target-pair direction and shared affected positions",()=>{
    const e=session("s","th th th",[0,1]);
    expect(observeWeakness(e,{kind:"bigram",items:["t","h"]},1,"ordinary-practice")).toMatchObject({opportunities:3,errors:1});
    expect(observeWeakness(e,{kind:"bigram",items:["h","t"]},1,"ordinary-practice").opportunities).toBe(0);
  });
  it("counts only exact naturally observed tokens",()=>{
    const e=session("s","through through throughout",[0]);
    expect(observeWeakness(e,{kind:"token",items:["through"]},1,"ordinary-practice")).toMatchObject({opportunities:2,errors:1});
  });
  it("preserves Unicode grapheme and bigram evidence",()=>{
    const e=session("s","éက် éက်",[0]);
    expect(observeWeakness(e,{kind:"grapheme",items:["é"]},1,"ordinary-practice")).toMatchObject({opportunities:2,errors:1});
    expect(observeWeakness(e,{kind:"bigram",items:["é","က်"]},1,"ordinary-practice")).toMatchObject({opportunities:2,errors:1});
  });
  it("broad evidence uses session attempt accuracy and correct WPM",()=>{
    const e=session("s","a".repeat(40),[0]);expect(observeWeakness(e,{kind:"accuracy",items:[]},4,"timed-test")).toMatchObject({opportunities:40,errors:1,accuracy:97.5,correctWpm:e.summary.correctWpm,order:4});
  });
});
