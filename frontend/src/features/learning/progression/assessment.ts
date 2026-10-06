import { prepareTypingText } from "../../../engine/typing";
import { evaluateMastery,trainingSuccess,severe } from "../transfer/mastery";
import { weaknessIdentity } from "../transfer/classify";
import { TRANSFER } from "../transfer/constants";
import type { MasteryRecord,Observation,WeaknessIdentity } from "../transfer/types";
import { ASSESSMENT as A } from "./constants";
export type AssessmentKind=keyof typeof A.sessions;
export function supportsAssessment(identity:WeaknessIdentity):boolean {
  try {weaknessIdentity(identity.kind,identity.items);
    if(!["grapheme","substitution","bigram","token"].includes(identity.kind))return false;
    // Very long tokens cannot fit the low-density, exact-token assessment contract.
    return identity.kind!=="token" || prepareTypingText(identity.items[0]).units.length*A.perSession.token<=30;
  }catch{return false;}
}
export function assessmentEligible(record:MasteryRecord):boolean {
  if(record.state!=="TRANSFER_CHECK" || !supportsAssessment(record.identity))return false;
  const kind=record.identity.kind;
  const decision=evaluateMastery(record);
  return decision.state==="TRANSFER_CHECK" && record.training.slice(-TRANSFER.trainingWindow).every(o=>trainingSuccess(record,o))
    && record.training.length>=TRANSFER.checkSuccesses
    && (record.waiting?.length??0)>=A.waitingSessions
    && (record.naturalSinceCheck??decision.transfer.opportunities)<TRANSFER.transferMinimum[kind]
    && !(record.waiting??[]).some(o=>severe(record,o));
}
export function assessmentSuccess(record:MasteryRecord,o:Observation):boolean {
  if(!supportsAssessment(record.identity))return false;
  const kind=record.identity.kind as AssessmentKind;
  return o.context==="controlled-transfer-assessment" && o.opportunities>=A.perSession[kind] && o.errors===0
    && o.accuracy>=A.accuracy && o.activeMs>=A.minActiveMs && (o.attempts??0)>=A.minAttempts;
}
export function controlledMastery(record:MasteryRecord):boolean {
  if(!assessmentEligible(record))return false;
  const kind=record.identity.kind as AssessmentKind,rows=(record.assessments??[]).slice(-A.window);
  return rows.length>=A.sessions[kind] && new Set(rows.map(o=>o.ordinal)).size>=A.sessions[kind]
    && rows.every(o=>assessmentSuccess(record,o)) && rows.reduce((n,o)=>n+o.opportunities,0)>=A.total[kind];
}
