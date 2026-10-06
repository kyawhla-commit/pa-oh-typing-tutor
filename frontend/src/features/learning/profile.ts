import { LEARNING } from "./constants";
import { emptyAggregates, freezeProfileValue, mergeAggregates } from "./aggregation";
import type { LearnerTypingProfile, LearningEvidence } from "./types";
export function emptyProfile(): LearnerTypingProfile {
  return freezeProfileValue({ version: LEARNING.version, sessionCount: 0, totalAttempts: 0, incorrectAttempts: 0,
    correctedErrors: 0, remainingErrors: 0, backspaces: 0, lifetime: emptyAggregates(), recent: [], processedSessionIds: [] });
}
export function applyLearningEvidence(profile: LearnerTypingProfile, evidence: LearningEvidence): LearnerTypingProfile {
  const s = evidence.summary;
  if (profile.processedSessionIds.includes(s.sessionId)) return profile;
  return freezeProfileValue({ version: LEARNING.version, sessionCount: profile.sessionCount+1,
    totalAttempts: profile.totalAttempts+s.totalAttempts, incorrectAttempts: profile.incorrectAttempts+s.incorrectAttempts,
    correctedErrors: profile.correctedErrors+s.correctedErrors, remainingErrors: profile.remainingErrors+s.remainingErrors,
    backspaces: profile.backspaces+s.backspaces, lifetime: mergeAggregates([profile.lifetime,evidence.aggregates]),
    recent: [...profile.recent,{ ...s,aggregates: evidence.aggregates }].slice(-LEARNING.recentSessions),
    processedSessionIds: [...profile.processedSessionIds,s.sessionId].slice(-LEARNING.dedupeSessions) });
}
export function recentAggregates(profile: LearnerTypingProfile) { return mergeAggregates(profile.recent.map(s=>s.aggregates)); }
