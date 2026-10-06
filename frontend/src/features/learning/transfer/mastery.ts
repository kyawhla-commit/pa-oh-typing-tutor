import { isTransferContext } from "./classify";
import { TRANSFER as T } from "./constants";
import type { EvidenceDigest, MasteryDecision, MasteryRecord, Observation } from "./types";
const mean = (rows: readonly Observation[])=>rows.reduce((n,r)=>n+r.correctWpm,0)/rows.length;
const rate = (o: Observation)=>o.opportunities ? o.errors/o.opportunities : 0;
export function trainingSuccess(record: MasteryRecord, o: Observation): boolean {
  const kind=record.identity.kind;
  if(o.opportunities<T.trainingMinimum[kind]) return false;
  if(kind==="accuracy" || kind==="speed") {
    if(o.activeMs<T.minActiveMs || o.accuracy<T.strongAccuracy) return false;
    return kind==="accuracy" || (record.baselineWpm!==null && o.correctWpm>=record.baselineWpm*T.speedGain);
  }
  return kind==="token" || kind==="substitution" ? o.errors===0 : rate(o)<=T.trainingRate;
}
export function severe(record: MasteryRecord, o: Observation): boolean {
  const kind=record.identity.kind;
  if(!o.opportunities) return false;
  if(kind==="accuracy" || kind==="speed") return o.accuracy<T.poorAccuracy;
  return rate(o)>=(kind==="token" ? T.tokenSevereRate : T.severeRate);
}
function digest(rows: readonly Observation[], successes: number): EvidenceDigest {
  const opportunities=rows.reduce((n,o)=>n+o.opportunities,0),errors=rows.reduce((n,o)=>n+o.errors,0);
  return {sessions:rows.length,opportunities,errors,rate:opportunities ? errors/opportunities : 0,successes};
}
export function evaluateMastery(record: MasteryRecord): MasteryDecision {
  const kind=record.identity.kind;
  const training=record.training.filter(o=>o.context==="adaptive-targeted" && o.order>record.epoch).slice(-T.trainingWindow);
  const transfer=record.transfer.filter(o=>isTransferContext(o.context) && o.order>record.epoch && o.opportunities>=T.sessionMinimum[kind]
    && ((kind!=="accuracy" && kind!=="speed") || o.activeMs>=T.minActiveMs)).slice(-T.transferWindow);
  const successes=training.filter(o=>trainingSuccess(record,o)).length;
  const successfulTransfer=transfer.filter(o=>{
    if(kind==="accuracy" || kind==="speed")return o.accuracy>=T.strongAccuracy && (kind!=="speed" || (record.baselineWpm!==null && o.correctWpm>=record.baselineWpm*T.speedGain));
    return kind==="token" || kind==="substitution" ? o.errors===0 : rate(o)<=T.transferRate;
  }).length;
  const td=digest(training,successes),vd=digest(transfer,successfulTransfer);
  const broad=kind==="accuracy" || kind==="speed";
  const required=T.requiredSessions[kind];
  const strong = transfer.length>=required && vd.opportunities>=T.transferMinimum[kind]
    && transfer.every(o=>!severe(record,o))
    && (broad ? transfer.every(o=>o.accuracy>=T.strongAccuracy)
      : kind==="token" || kind==="substitution" ? vd.errors===0 : vd.rate<=T.transferRate)
    && (kind!=="speed" || (record.baselineWpm!==null && mean(transfer)>=record.baselineWpm*T.speedGain));
  const regressionRows=transfer.filter(o=>o.order>record.stateSince);
  const rd=digest(regressionRows,0);
  const sustained=regressionRows.length>=T.regressionSessions && rd.opportunities>=T.transferMinimum[kind]
    && (broad ? regressionRows.filter(o=>o.accuracy<T.poorAccuracy).length>=T.regressionSessions
      || (kind==="speed" && record.baselineWpm!==null && regressionRows.length>=T.regressionSessions
        && regressionRows.every(o=>o.accuracy>=T.strongAccuracy) && mean(regressionRows)<record.baselineWpm*T.speedRegression)
      : kind==="token" ? rd.errors>=T.tokenRegressionErrors && rd.rate>=T.regressionRate : rd.rate>=T.regressionRate);
  const severeRows=regressionRows.filter(o=>severe(record,o));
  const sd=digest(severeRows,0);
  const recurringSevere=severeRows.length>=T.severeSessions && (broad ? true
    : kind==="token" ? sd.opportunities>=T.tokenRegressionMinimum && sd.errors>=T.tokenRegressionErrors
    : sd.opportunities>=T.severeMinimum && sd.errors>=T.severeErrors);
  let state=record.state;
  if(state==="PROVISIONAL_MASTERY" || state==="TRANSFER_CHECK") {
    if(sustained || recurringSevere) state="REGRESSED";
    else if(state==="TRANSFER_CHECK" && strong) state="PROVISIONAL_MASTERY";
    else if(state==="TRANSFER_CHECK" && successes<T.checkSuccesses) state=successes>=T.improvingSuccesses && training.at(-1) && !severe(record,training.at(-1)!) ? "IMPROVING" : "ACTIVE";
  } else if(strong) state="PROVISIONAL_MASTERY";
  else if(kind==="speed" && record.baselineWpm===null) state="INSUFFICIENT_EVIDENCE";
  else if(successes>=T.checkSuccesses && training.at(-1) && !severe(record,training.at(-1)!)) state="TRANSFER_CHECK";
  else if(successes>=T.improvingSuccesses && training.at(-1) && !severe(record,training.at(-1)!)) state="IMPROVING";
  else state=record.state==="REGRESSED" ? "REGRESSED" : "ACTIVE";
  const map = {
    INSUFFICIENT_EVIDENCE: ["need-baseline",0,"GENERAL_PRACTICE"],
    ACTIVE: ["training-needed",0,"CONTINUE_TARGETED_PRACTICE"],
    IMPROVING: ["training-improving",1,"INCREASE_VARIETY"],
    TRANSFER_CHECK: ["await-ordinary-transfer",2,"WAIT_FOR_TRANSFER_EVIDENCE"],
    PROVISIONAL_MASTERY: ["ordinary-transfer-strong",2,"REDUCE_PRIORITY"],
    REGRESSED: ["ordinary-regression",0,"REACTIVATE_WEAKNESS"],
  } as const;
  const [reason,level,nextAction]=map[state];
  return {state,reason,level,nextAction,training:td,transfer:vd};
}
