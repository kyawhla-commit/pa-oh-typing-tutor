import { describe,expect,it } from "vitest";
import { TRANSFER as T } from "./constants";
import { evaluateMastery,trainingSuccess } from "./mastery";
import { observation as o,record,r } from "./testFixtures";
import type { WeaknessIdentity } from "./types";
const training=(n=3)=>Array.from({length:n},(_,i)=>o(i+1));
const transfers=(n=3,opps=20,errors=0)=>Array.from({length:n},(_,i)=>o(i+4,opps,errors,"ordinary-practice"));
describe("recent targeted response",()=>{
  it("one success is active, two improve, three enter transfer check, none master",()=>{
    expect(evaluateMastery(record(r,training(1))).state).toBe("ACTIVE");
    expect(evaluateMastery(record(r,training(2)))).toMatchObject({state:"IMPROVING",level:1,nextAction:"INCREASE_VARIETY"});
    expect(evaluateMastery(record(r,training()))).toMatchObject({state:"TRANSFER_CHECK",level:2,nextAction:"WAIT_FOR_TRANSFER_EVIDENCE"});
  });
  it("repeated failures remain active",()=>expect(evaluateMastery(record(r,training().map(x=>({...x,errors:4})))).state).toBe("ACTIVE"));
  it("old good results cannot override recent deterioration",()=>{
    expect(evaluateMastery(record(r,[...training(),o(4,20,3),o(5,20,3),o(6,20,3)])).state).toBe("ACTIVE");
    expect(evaluateMastery(record(r,[o(2),o(3),o(4,20,2)],[],{state:"TRANSFER_CHECK",stateSince:3})).state).toBe("IMPROVING");
    expect(evaluateMastery(record(r,[o(2),o(3),o(4,20,4)],[],{state:"TRANSFER_CHECK",stateSince:3})).state).toBe("ACTIVE");
  });
  it("latest severe failure blocks improvement despite two earlier successes",()=>expect(evaluateMastery(record(r,[o(1),o(2),o(3,20,4)])).state).toBe("ACTIVE"));
  it("a single nonsevere failed drill does not reset a forever streak",()=>expect(evaluateMastery(record(r,[o(1),o(2,20,2),o(3)])).state).toBe("IMPROVING"));
  it.each(["grapheme","substitution","bigram","token","accuracy","speed"] as const)("exact %s training exposure boundary",kind=>{
    const identity:WeaknessIdentity={kind,items:kind==="substitution" ? ["r","t"] : kind==="bigram" ? ["t","h"] : kind==="grapheme" ? ["é"] : kind==="token" ? ["through"] : []};
    const rec=record(identity,[],[],{baselineWpm:kind==="speed" ? 30 : null});
    expect(trainingSuccess(rec,o(1,T.trainingMinimum[kind]))).toBe(true);
    expect(trainingSuccess(rec,o(1,T.trainingMinimum[kind]-1))).toBe(false);
  });
  it("exact focus incidence threshold is inclusive",()=>{
    expect(trainingSuccess(record(),o(1,20,1))).toBe(true);
    expect(trainingSuccess(record(),o(1,19,1))).toBe(false);
  });
  it.each(["token","substitution"] as const)("%s requires zero errors including corrections",kind=>expect(trainingSuccess(record({kind,items:kind==="token" ? ["through"] : ["r","t"]}),o(1,100,1))).toBe(false));
  it("broad training accuracy requires active time and strong accuracy",()=>{
    const rec=record({kind:"accuracy",items:[]});
    expect(trainingSuccess(rec,o(1,40,0,"adaptive-targeted",97))).toBe(true);
    expect(trainingSuccess(rec,o(1,40,0,"adaptive-targeted",96.99))).toBe(false);
    expect(trainingSuccess(rec,{...o(1,40),activeMs:999})).toBe(false);
  });
});
describe("ordinary transfer and reversible provisional mastery",()=>{
  it("insufficient exposure and one easy session cannot master",()=>{
    expect(evaluateMastery(record(r,training(),transfers(3,5))).state).toBe("TRANSFER_CHECK");
    expect(evaluateMastery(record(r,training(),transfers(1,100))).state).toBe("TRANSFER_CHECK");
  });
  it("enough distinct ordinary sessions master with or without drills",()=>{
    expect(evaluateMastery(record(r,[],transfers())).state).toBe("PROVISIONAL_MASTERY");
    expect(evaluateMastery(record(r,training(),transfers())).nextAction).toBe("REDUCE_PRIORITY");
  });
  it("even manually supplied adaptive observations cannot prove transfer",()=>expect(evaluateMastery(record(r,[],transfers().map(x=>({...x,context:"adaptive-targeted"})))).state).toBe("ACTIVE"));
  it("fresh transfer only after a regression epoch",()=>{
    const rec=record(r,training(),transfers(),{state:"REGRESSED",epoch:7,stateSince:7});
    expect(evaluateMastery(rec).state).toBe("REGRESSED");
    expect(evaluateMastery({...rec,transfer:[o(8,20,0,"word-test"),o(9,20,0,"timed-test"),o(10,20,0,"ordinary-practice")]}).state).toBe("PROVISIONAL_MASTERY");
  });
  it("low pooled rate cannot hide a severe most recent ordinary session",()=>expect(evaluateMastery(record(r,training(),[...transfers(3,100),o(8,5,1,"ordinary-practice")])).state).toBe("TRANSFER_CHECK"));
  it("exact transfer rate boundary is inclusive",()=>{
    expect(evaluateMastery(record(r,[],transfers(3,20,1))).state).toBe("PROVISIONAL_MASTERY");
    expect(evaluateMastery(record(r,[],transfers(3,19,1))).state).toBe("ACTIVE");
  });
  it.each(["grapheme","substitution","bigram","token"] as const)("exact %s transfer opportunity/session boundaries",kind=>{
    const identity:WeaknessIdentity={kind,items:kind==="substitution" ? ["r","t"] : kind==="bigram" ? ["t","h"] : kind==="token" ? ["through"] : ["é"]};
    const n=T.requiredSessions[kind],total=T.transferMinimum[kind];
    const rows=Array.from({length:n},(_,i)=>o(i+1,i===n-1 ? total-Math.floor(total/n)*(n-1) : Math.floor(total/n),0,"ordinary-practice"));
    expect(evaluateMastery(record(identity,[],rows)).state).toBe("PROVISIONAL_MASTERY");
    expect(evaluateMastery(record(identity,[],rows.map((x,i)=>i===n-1 ? {...x,opportunities:x.opportunities-1} : x))).state).toBe("ACTIVE");
    expect(evaluateMastery(record(identity,[],rows.slice(1))).state).toBe("ACTIVE");
  });
  it("specific tokens and directional substitutions require zero natural errors",()=>{
    for(const identity of [{kind:"token",items:["through"]},{kind:"substitution",items:["r","t"]}] as const)
      expect(evaluateMastery(record(identity,[],transfers(3,100,1))).state).toBe("ACTIVE");
  });
  it("one mild or severe session cannot reactivate current mastery",()=>{
    for(const errors of [1,10])expect(evaluateMastery(record(r,[],[...transfers(),o(8,20,errors,"ordinary-practice")],{state:"PROVISIONAL_MASTERY",stateSince:6})).state).toBe("PROVISIONAL_MASTERY");
  });
  it("sustained drift at 15% regresses, below 15% holds",()=>{
    const rec=record(r,[],[o(7,20,3,"ordinary-practice"),o(8,20,3,"timed-test"),o(9,20,3,"word-test")],{state:"PROVISIONAL_MASTERY",stateSince:6});
    expect(evaluateMastery(rec)).toMatchObject({state:"REGRESSED",level:0,nextAction:"REACTIVATE_WEAKNESS"});
    expect(evaluateMastery({...rec,transfer:rec.transfer.map(x=>({...x,opportunities:21}))}).state).toBe("PROVISIONAL_MASTERY");
  });
  it("two severe recurring directional confusions reactivate faster",()=>{
    const rec=record({kind:"substitution",items:["r","t"]},[],[o(7,10,2,"ordinary-practice"),o(8,10,2,"ordinary-practice")],{state:"PROVISIONAL_MASTERY",stateSince:6});
    expect(evaluateMastery(rec).state).toBe("REGRESSED");
    expect(evaluateMastery({...rec,transfer:[rec.transfer[0],{...rec.transfer[1],errors:1}]}).state).toBe("PROVISIONAL_MASTERY");
  });
  it("hysteresis ignores pre-mastery errors and waits for new multi-session regression",()=>{
    const rec=record(r,[],[o(1,20,6,"ordinary-practice"),o(2,20,6,"ordinary-practice"),...transfers(),o(8,20,1,"ordinary-practice")],{state:"PROVISIONAL_MASTERY",stateSince:6});
    expect(evaluateMastery(rec).state).toBe("PROVISIONAL_MASTERY");
  });
});
describe("broad accuracy and personal pace",()=>{
  const accuracy={kind:"accuracy",items:[]} as const,speed={kind:"speed",items:[]} as const;
  it("accuracy drills only enter validation; ordinary accuracy masters",()=>{
    const drills=training().map(x=>({...x,opportunities:40}));
    expect(evaluateMastery(record(accuracy,drills)).state).toBe("TRANSFER_CHECK");
    expect(evaluateMastery(record(accuracy,drills,transfers(3,40))).state).toBe("PROVISIONAL_MASTERY");
    expect(evaluateMastery(record(accuracy,drills,transfers(3,40).map(x=>({...x,accuracy:96.99})))).state).toBe("TRANSFER_CHECK");
  });
  it("two poor ordinary sessions regress broad accuracy",()=>expect(evaluateMastery(record(accuracy,[],transfers(2,40).map(x=>({...x,accuracy:89})),{state:"PROVISIONAL_MASTERY",stateSince:3})).state).toBe("REGRESSED"));
  it("pace gains need a personal baseline and accuracy",()=>{
    const ordinary=transfers(3,40).map(x=>({...x,correctWpm:42,accuracy:97}));
    expect(evaluateMastery(record(speed,[],ordinary,{baselineWpm:40})).state).toBe("PROVISIONAL_MASTERY");
    expect(evaluateMastery(record(speed,[],ordinary,{baselineWpm:null})).state).toBe("INSUFFICIENT_EVIDENCE");
    expect(evaluateMastery(record(speed,[],ordinary.map(x=>({...x,accuracy:96})),{baselineWpm:40})).state).toBe("ACTIVE");
    expect(evaluateMastery(record(speed,[],ordinary.map(x=>({...x,correctWpm:40})),{baselineWpm:40})).state).toBe("ACTIVE");
  });
  it("uses relative gains equally at different personal baselines",()=>{
    for(const baselineWpm of [10,80])expect(evaluateMastery(record(speed,[],transfers(3,40).map(x=>({...x,correctWpm:baselineWpm*1.05})),{baselineWpm})).state).toBe("PROVISIONAL_MASTERY");
  });
  it("stable accuracy alone and unsafe drill speed do not progress pace",()=>{
    const drills=training().map(x=>({...x,opportunities:40,correctWpm:100,accuracy:94}));
    expect(evaluateMastery(record(speed,drills,[],{baselineWpm:30})).state).toBe("ACTIVE");
    expect(evaluateMastery(record(speed,drills.map(x=>({...x,accuracy:100,correctWpm:30})),[],{baselineWpm:30})).state).toBe("ACTIVE");
  });
  it("sustained personal pace loss regresses only with strong accuracy",()=>{
    const rec=record(speed,[],transfers(3,40).map(x=>({...x,correctWpm:35})),{state:"PROVISIONAL_MASTERY",stateSince:3,baselineWpm:40});
    expect(evaluateMastery(rec).state).toBe("REGRESSED");
    expect(evaluateMastery({...rec,transfer:rec.transfer.map(x=>({...x,correctWpm:36}))}).state).toBe("PROVISIONAL_MASTERY");
  });
});
