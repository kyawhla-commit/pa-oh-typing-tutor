import { targetKey } from "../aggregation";
import type { LearningEvidence } from "../types";
import type { EvidenceContext, Observation, WeaknessIdentity } from "./types";
export function observeWeakness(evidence: LearningEvidence, identity: WeaknessIdentity, order: number, context: EvidenceContext): Observation {
  const {summary:s,aggregates:a}=evidence;
  let opportunities=s.totalAttempts,errors=s.incorrectAttempts;
  if(identity.kind!=="accuracy" && identity.kind!=="speed") {
    const rows=identity.kind==="token" ? a.tokens : identity.kind==="bigram" ? a.bigrams : a.graphemes;
    const target=identity.kind==="substitution" ? [identity.items[0]] : identity.items;
    const row=rows.find(r=>targetKey(r.target)===targetKey(target));
    opportunities=row?.opportunities??0;
    // Directional recurrence counts ALL incorrect attempts, including corrected ones.
    errors=identity.kind==="substitution" ? a.substitutions.find(r=>r.expected===identity.items[0] && r.actual===identity.items[1])?.count??0 : row?.errorOccurrences??0;
  }
  return {order,context,attempts:s.totalAttempts,opportunities,errors,accuracy:s.attemptAccuracy,correctWpm:s.correctWpm,activeMs:s.activeElapsedMs};
}
