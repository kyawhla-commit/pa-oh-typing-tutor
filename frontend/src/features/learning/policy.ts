import { LEARNING } from "./constants";
import { compareUnicode, exposureRate, targetKey } from "./aggregation";
import { recentAggregates } from "./profile";
import type {
  ExposureStat,
  LearnerTypingProfile,
  PracticeRecommendation,
  RecommendationEvidence,
  RecommendationType,
} from "./types";

type Threshold = typeof LEARNING.grapheme;
const find = (rows: readonly ExposureStat[], target: readonly string[]) =>
  rows.find((r) => targetKey(r.target) === targetKey(target)) ?? null;
function chooseWindow(
  lifetime: ExposureStat | null,
  recent: ExposureStat | null,
  threshold: Threshold,
): "recent" | "lifetime" | null {
  if (
    recent &&
    recent.opportunities >= LEARNING.improvement.opportunities &&
    exposureRate(recent) < LEARNING.improvement.rate
  )
    return null;
  if (
    recent &&
    recent.opportunities >= threshold.opportunities &&
    recent.errorOccurrences >= threshold.errors &&
    exposureRate(recent) >= threshold.rate
  )
    return "recent";
  if (
    lifetime &&
    lifetime.opportunities >= threshold.lifetimeOpportunities &&
    lifetime.errorOccurrences >= threshold.lifetimeErrors &&
    exposureRate(lifetime) >= threshold.rate &&
    recent &&
    recent.opportunities >= Math.ceil(threshold.opportunities / 2) &&
    exposureRate(recent) >= threshold.rate / 2 &&
    recent.errorOccurrences > 0
  )
    return "lifetime";
  return null;
}
/** Complete eligible list with unchanged Slice 5 evidence gates and scores. */
export function rankPracticeCandidates(
  profile: LearnerTypingProfile,
): readonly PracticeRecommendation[] {
  const recent = recentAggregates(profile);
  const trend = profile.recent.filter(
    (s) =>
      s.totalAttempts >= LEARNING.trendAttempts &&
      s.activeElapsedMs >= LEARNING.trendMinActiveMs,
  );
  const broadErrors = recent.graphemes.filter(
    (s) =>
      s.errorOccurrences >= LEARNING.broadErrorsPerGrapheme &&
      !s.target.every((t) => /^\s+$/u.test(t)),
  ).length;
  const sessionEvidence: RecommendationEvidence = {
    window: "sessions",
    lifetime: null,
    recent: null,
    substitution: null,
    sessions: trend.length,
    attempts: trend.reduce((n, s) => n + s.totalAttempts, 0),
    accuracy: trend.map((s) => s.attemptAccuracy),
    speed: trend.map((s) => s.correctWpm),
    distinctErrorGraphemes: broadErrors,
  };
  const poor = trend.filter((s) => s.attemptAccuracy < LEARNING.poorAccuracy);
  if (
    poor.length >= LEARNING.trendSessions &&
    broadErrors >= LEARNING.broadGraphemes
  ) {
    return [
      {
        id: "ACCURACY_FOCUS",
        type: "ACCURACY_FOCUS",
        priority: LEARNING.focusPriority,
        evidenceStrength: "high",
        reasonCode: "broad-low-accuracy",
        targets: [],
        evidence: {
          ...sessionEvidence,
          sessions: poor.length,
          attempts: poor.reduce((n, s) => n + s.totalAttempts, 0),
          accuracy: poor.map((s) => s.attemptAccuracy),
          speed: poor.map((s) => s.correctWpm),
        },
      },
    ];
  }
  const candidates: PracticeRecommendation[] = [];
  const score = (row: ExposureStat, recentErrors: number, bonus: number) =>
    Math.round(exposureRate(row) * LEARNING.priority.rate) +
    Math.min(row.errorOccurrences, LEARNING.priority.errorCap) *
      LEARNING.priority.errors +
    Math.min(recentErrors, LEARNING.priority.recentCap) *
      LEARNING.priority.recentErrors +
    Math.min(row.remainingErrors, LEARNING.priority.remainingCap) *
      LEARNING.priority.remainingErrors +
    bonus;
  function add(
    type: RecommendationType,
    target: readonly string[],
    lifetime: ExposureStat | null,
    current: ExposureStat | null,
    window: "recent" | "lifetime",
    bonus: number,
    substitution: RecommendationEvidence["substitution"] = null,
  ) {
    const selected = window === "recent" ? current! : lifetime!;
    candidates.push({
      id: `${type}:${targetKey(target)}`,
      type,
      targets: [...target],
      priority: score(selected, current?.errorOccurrences ?? 0, bonus),
      evidenceStrength:
        selected.opportunities >= LEARNING.grapheme.lifetimeOpportunities &&
        (current?.errorOccurrences ?? 0) >= LEARNING.grapheme.errors
          ? "high"
          : "medium",
      reasonCode: substitution ? "repeated-confusion" : "repeated-errors",
      evidence: {
        ...sessionEvidence,
        window,
        lifetime,
        recent: current,
        substitution,
      },
    });
  }
  for (const [type, lifetimeRows, recentRows, threshold, bonus] of [
    [
      "WEAK_GRAPHEME",
      profile.lifetime.graphemes,
      recent.graphemes,
      LEARNING.grapheme,
      LEARNING.categoryBonus.grapheme,
    ],
    [
      "WEAK_BIGRAM",
      profile.lifetime.bigrams,
      recent.bigrams,
      LEARNING.bigram,
      LEARNING.categoryBonus.bigram,
    ],
    [
      "DIFFICULT_WORD",
      profile.lifetime.tokens,
      recent.tokens,
      LEARNING.token,
      LEARNING.categoryBonus.token,
    ],
  ] as const) {
    const keys = new Map(
      [...lifetimeRows, ...recentRows].map((row) => [
        targetKey(row.target),
        row.target,
      ]),
    );
    for (const target of keys.values()) {
      if (type !== "DIFFICULT_WORD" && target.some((t) => /^\s+$/u.test(t)))
        continue;
      const lifetime = find(lifetimeRows, target),
        current = find(recentRows, target);
      const window = chooseWindow(lifetime, current, threshold);
      if (window) add(type, target, lifetime, current, window, bonus);
    }
  }
  const substitutions = new Map(
    [...profile.lifetime.substitutions, ...recent.substitutions].map((s) => [
      targetKey([s.expected, s.actual]),
      s,
    ]),
  );
  for (const s of substitutions.values()) {
    const lifetimePair = profile.lifetime.substitutions.find(
      (p) => p.expected === s.expected && p.actual === s.actual,
    );
    const recentPair = recent.substitutions.find(
      (p) => p.expected === s.expected && p.actual === s.actual,
    );
    const lifetime = find(profile.lifetime.graphemes, [s.expected]),
      current = find(recent.graphemes, [s.expected]);
    if (
      current &&
      current.opportunities >= LEARNING.improvement.opportunities &&
      exposureRate(current) < LEARNING.improvement.rate
    )
      continue;
    const window =
      current &&
      current.opportunities >= LEARNING.substitution.opportunities &&
      (recentPair?.count ?? 0) >= LEARNING.substitution.recentCount
        ? "recent"
        : lifetime &&
            lifetime.opportunities >= LEARNING.substitution.opportunities &&
            (lifetimePair?.count ?? 0) >= LEARNING.substitution.lifetimeCount &&
            (recentPair?.count ?? 0) > 0
          ? "lifetime"
          : null;
    if (window)
      add(
        "SUBSTITUTION_CONFUSION",
        [s.expected, s.actual],
        lifetime,
        current,
        window,
        LEARNING.categoryBonus.substitution,
        {
          lifetimeCount: lifetimePair?.count ?? 0,
          recentCount: recentPair?.count ?? 0,
        },
      );
  }
  candidates.sort(
    (a, b) =>
      b.priority - a.priority ||
      (b.evidence[b.evidence.window === "recent" ? "recent" : "lifetime"]
        ?.opportunities ?? 0) -
        (a.evidence[a.evidence.window === "recent" ? "recent" : "lifetime"]
          ?.opportunities ?? 0) ||
      compareUnicode(a.id, b.id),
  );
  if (candidates.length) return candidates;
  const strong =
    trend.length >= LEARNING.trendSessions &&
    trend.every((s) => s.attemptAccuracy >= LEARNING.strongAccuracy);
  return [
    {
      id: strong ? "SPEED_BUILDING" : "GENERAL_PRACTICE",
      type: strong ? "SPEED_BUILDING" : "GENERAL_PRACTICE",
      priority: strong ? LEARNING.speedPriority : 0,
      evidenceStrength: strong ? "medium" : "low",
      reasonCode: strong ? "consistent-accuracy" : "more-evidence-needed",
      targets: [],
      evidence: sessionEvidence,
    },
  ];
}
/** Legacy raw-ranking API; product visibility is selected after mastery overlay. */
export function recommendPractice(
  profile: LearnerTypingProfile,
): readonly PracticeRecommendation[] {
  return rankPracticeCandidates(profile).slice(0, LEARNING.recommendations);
}
