import { LEARNING } from "./constants";
import { exposureRate } from "./aggregation";
import type { AdaptivePracticeSpec, PracticeRecommendation } from "./types";
export function recommendationText(recommendation: PracticeRecommendation) {
  const { type,targets,evidence } = recommendation;
  if(type === "GENERAL_PRACTICE") return { title: "Keep gathering practice evidence", reason: "Complete more sessions before choosing a specific focus. No weakness is established yet." };
  if(type === "ACCURACY_FOCUS") return { title: "Practice a comfortable, accurate rhythm", reason: `${evidence.sessions} recent qualifying sessions were below ${LEARNING.poorAccuracy}% attempt accuracy, with repeated errors across ${evidence.distinctErrorGraphemes} target graphemes in the recent window.` };
  if(type === "SPEED_BUILDING") return { title: "Build pace gradually", reason: `${evidence.sessions} recent qualifying sessions reached at least ${LEARNING.strongAccuracy}% attempt accuracy. Keep that accuracy while gently increasing pace.` };
  if(type === "SUBSTITUTION_CONFUSION") return { title: `Distinguish ${JSON.stringify(targets[0])} from ${JSON.stringify(targets[1])}`,
    reason: `Expected ${JSON.stringify(targets[0])} was typed as ${JSON.stringify(targets[1])} ${evidence.substitution!.lifetimeCount} times overall; ${evidence.substitution!.recentCount} in the recent window.` };
  const stat = evidence.window === "recent" ? evidence.recent! : evidence.lifetime!;
  return { title: `Focus on ${type === "WEAK_BIGRAM" ? "the target pair" : type === "DIFFICULT_WORD" ? "the target token" : "the grapheme"} ${JSON.stringify(targets.join(""))}`,
    reason: stat ? `${stat.errorOccurrences} of ${stat.opportunities} observed ${type === "WEAK_GRAPHEME" ? "positions" : "occurrences"} had mistakes (${(exposureRate(stat)*100).toFixed(1)}%); ${evidence.recent?.incorrectAttempts ?? 0} incorrect attempts in the recent window. Corrections remain part of this evidence.` : "Continue this tracked focus, then check it in regular typing." };
}
export function practiceSpec(recommendation: PracticeRecommendation): AdaptivePracticeSpec {
  const focusType = { WEAK_GRAPHEME: "grapheme", SUBSTITUTION_CONFUSION: "substitution", WEAK_BIGRAM: "bigram", DIFFICULT_WORD: "token",
    ACCURACY_FOCUS: "accuracy", SPEED_BUILDING: "speed", GENERAL_PRACTICE: "general" } as const;
  return { recommendationId: recommendation.id, focusType: focusType[recommendation.type], focusItems: [...recommendation.targets],
    desiredLength: { unit: "graphemes", value: LEARNING.exerciseGraphemes }, difficulty: recommendation.type === "SPEED_BUILDING" ? "gradual-speed" : "steady",
    mode: "fixed-text", completionPolicy: "require-correct-target" };
}
