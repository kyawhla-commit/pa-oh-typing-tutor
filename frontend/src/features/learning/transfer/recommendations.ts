import { LEARNING } from "../constants";
import { compareUnicode, exposureRate, targetKey } from "../aggregation";
import { rankPracticeCandidates } from "../policy";
import {
  selectVisible,
  visibleWeaknessId,
  compareRecommendations,
  overlapSignature,
  errorSessionProvenance,
  type SelectionAudit,
} from "../selection";
import { recentAggregates } from "../profile";
import type { LearnerTypingProfile, PracticeRecommendation } from "../types";
import { recommendationIdentity, weaknessKey } from "./classify";
import { evaluateMastery } from "./mastery";
import type { MasteryDecision, MasteryProfile, MasteryRecord } from "./types";
export interface ProgressionRecommendation {
  readonly recommendation: PracticeRecommendation;
  readonly decision: MasteryDecision | null;
  readonly supportingEvidence?: readonly PracticeRecommendation[];
}
function retainedRecommendation(
  profile: LearnerTypingProfile,
  record: MasteryRecord,
): PracticeRecommendation {
  const { kind, items } = record.identity,
    recent = recentAggregates(profile);
  const type = {
    grapheme: "WEAK_GRAPHEME",
    substitution: "SUBSTITUTION_CONFUSION",
    bigram: "WEAK_BIGRAM",
    token: "DIFFICULT_WORD",
    accuracy: "ACCURACY_FOCUS",
    speed: "SPEED_BUILDING",
  } as const;
  const category =
    kind === "bigram" ? "bigrams" : kind === "token" ? "tokens" : "graphemes";
  const target = kind === "substitution" ? [items[0]] : items;
  const lifetime =
    profile.lifetime[category].find(
      (r) => targetKey(r.target) === targetKey(target),
    ) ?? null;
  const current =
    recent[category].find((r) => targetKey(r.target) === targetKey(target)) ??
    null;
  const selected = current ?? lifetime;
  const p = LEARNING.priority;
  const bonus = {
    grapheme: LEARNING.categoryBonus.grapheme,
    substitution: LEARNING.categoryBonus.substitution,
    bigram: LEARNING.categoryBonus.bigram,
    token: LEARNING.categoryBonus.token,
    accuracy: 0,
    speed: 0,
  }[kind];
  const priority =
    kind === "accuracy"
      ? LEARNING.focusPriority
      : kind === "speed"
        ? LEARNING.speedPriority
        : selected
          ? Math.round(exposureRate(selected) * p.rate) +
            Math.min(selected.errorOccurrences, p.errorCap) * p.errors +
            Math.min(current?.errorOccurrences ?? 0, p.recentCap) *
              p.recentErrors +
            Math.min(selected.remainingErrors, p.remainingCap) *
              p.remainingErrors +
            bonus
          : bonus;
  const trend = profile.recent.filter(
    (s) =>
      s.totalAttempts >= LEARNING.trendAttempts &&
      s.activeElapsedMs >= LEARNING.trendMinActiveMs,
  );
  return {
    id: items.length ? `${type[kind]}:${targetKey(items)}` : type[kind],
    type: type[kind],
    targets: items,
    priority,
    evidenceStrength: "medium",
    reasonCode:
      kind === "substitution"
        ? "repeated-confusion"
        : kind === "accuracy"
          ? "broad-low-accuracy"
          : kind === "speed"
            ? "consistent-accuracy"
            : "repeated-errors",
    evidence: {
      window: current ? "recent" : lifetime ? "lifetime" : "sessions",
      lifetime,
      recent: current,
      substitution:
        kind === "substitution"
          ? {
              lifetimeCount:
                profile.lifetime.substitutions.find(
                  (r) => r.expected === items[0] && r.actual === items[1],
                )?.count ?? 0,
              recentCount:
                recent.substitutions.find(
                  (r) => r.expected === items[0] && r.actual === items[1],
                )?.count ?? 0,
            }
          : null,
      sessions: trend.length,
      attempts: trend.reduce((n, s) => n + s.totalAttempts, 0),
      accuracy: trend.map((s) => s.attemptAccuracy),
      speed: trend.map((s) => s.correctWpm),
      distinctErrorGraphemes: recent.graphemes.filter(
        (r) => r.errorOccurrences >= LEARNING.broadErrorsPerGrapheme,
      ).length,
    },
  };
}
/** Minimal overlay: original candidates keep their original scores and tie order. */
export function selectionWithMastery(
  profile: LearnerTypingProfile,
  mastery: MasteryProfile,
) {
  const base = rankPracticeCandidates(profile);
  const provenance = errorSessionProvenance(profile);
  const mastered: SelectionAudit[] = [];
  const candidates = new Map<
    string,
    ProgressionRecommendation & {
      state?: MasteryRecord["state"];
      errorSessions: readonly number[];
    }
  >();
  for (const rec of base) {
    const identity = recommendationIdentity(rec);
    const record = identity
      ? mastery.records.find(
          (r) => weaknessKey(r.identity) === weaknessKey(identity),
        )
      : undefined;
    if (record?.state === "PROVISIONAL_MASTERY") {
      mastered.push({
        weaknessId: visibleWeaknessId(rec),
        recommendation: rec,
        signature: overlapSignature(rec, new Set()),
        state: record.state,
        visible: false,
        reason: "mastery",
        representedBy: null,
      });
      continue;
    }
    candidates.set(visibleWeaknessId(rec), {
      recommendation: rec,
      decision: record ? evaluateMastery(record) : null,
      state: record?.state,
      errorSessions: provenance.get(visibleWeaknessId(rec)) ?? [],
    });
  }
  for (const record of mastery.records) {
    if (
      record.state === "PROVISIONAL_MASTERY" ||
      record.state === "INSUFFICIENT_EVIDENCE"
    )
      continue;
    const rec = retainedRecommendation(profile, record);
    if (!candidates.has(visibleWeaknessId(rec)))
      candidates.set(visibleWeaknessId(rec), {
        recommendation: rec,
        decision: evaluateMastery(record),
        state: record.state,
        errorSessions: provenance.get(visibleWeaknessId(rec)) ?? [],
      });
  }
  let result = [...candidates.values()];
  if (result.some((r) => r.recommendation.type !== "GENERAL_PRACTICE"))
    result = result.filter((r) => r.recommendation.type !== "GENERAL_PRACTICE");
  // Slice 5's broad accuracy override remains a sole recommendation.
  result.sort((a, b) =>
    compareRecommendations(a.recommendation, b.recommendation),
  );
  if (result.length) {
    const selected = selectVisible(result);
    return {
      audit: [...selected.audit, ...mastered],
      visible: selected.visible.map(({ recommendation, decision }) => ({
        recommendation,
        decision,
        supportingEvidence: selected.audit
          .filter((x) => x.representedBy === visibleWeaknessId(recommendation))
          .map((x) => x.recommendation),
      })),
    };
  }
  // Do not ask the base policy to reintroduce a suppressed focus through its fallback.
  const fallback = base[0];
  return {
    audit: mastered,
    visible: [
      {
        recommendation: {
          ...fallback,
          id: "GENERAL_PRACTICE",
          type: "GENERAL_PRACTICE" as const,
          targets: [],
          priority: 0,
          reasonCode: "more-evidence-needed" as const,
          evidenceStrength: "low" as const,
        },
        decision: null,
        supportingEvidence: [],
      },
    ],
  };
}
export function recommendWithMastery(
  profile: LearnerTypingProfile,
  mastery: MasteryProfile,
): readonly ProgressionRecommendation[] {
  return selectionWithMastery(profile, mastery).visible;
}
export function progressionText(decision: MasteryDecision) {
  switch (decision.state) {
    case "IMPROVING":
      return {
        label: "Improving",
        message:
          "Practice is going well. We’ll watch for this skill in regular typing.",
      };
    case "TRANSFER_CHECK":
      return {
        label: "Check in regular typing",
        message:
          "Practice normally so we can check whether this improvement carries over.",
      };
    case "PROVISIONAL_MASTERY":
      return {
        label: "Currently strong",
        message:
          "Recent regular typing shows this skill is holding up. We’ll keep watching.",
      };
    case "REGRESSED":
      return {
        label: "Needs more practice",
        message:
          "This difficulty appeared again in regular typing. Targeted practice can help.",
      };
    case "INSUFFICIENT_EVIDENCE":
      return {
        label: "Gathering evidence",
        message: "Complete regular typing sessions to establish your own pace.",
      };
    default:
      return {
        label: "Needs more practice",
        message: "Keep practicing this focus, then check it in regular typing.",
      };
  }
}
