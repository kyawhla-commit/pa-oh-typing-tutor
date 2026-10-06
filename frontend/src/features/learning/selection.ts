import { prepareTypingText } from "../../engine/typing";
import { compareUnicode, exposureRate } from "./aggregation";
import { LEARNING } from "./constants";
import { TRANSFER } from "./transfer/constants";
import { recommendationIdentity, weaknessKey } from "./transfer/classify";
import type { MasteryState } from "./transfer/types";
import type { PracticeRecommendation, LearnerTypingProfile } from "./types";
/** Visibility rules only. Diagnosis, raw scores and learning gates are unchanged. */
export const VISIBILITY = Object.freeze({
  regressionSlots: 1,
  transferSlots: 1,
  directionalErrorShare: 0.5,
  minimumRelatedSessions: 2,
});
export interface VisibilityCandidate {
  readonly recommendation: PracticeRecommendation;
  readonly state?: MasteryState;
  readonly errorSessions?: readonly number[];
}
export interface OverlapSignature {
  readonly weaknessId: string;
  readonly graphemes: readonly string[];
  readonly bigrams: readonly string[];
  readonly tokens: readonly string[];
  readonly anchors: readonly string[];
  readonly errorSessions?: readonly number[];
}
/** Recent session provenance comes from existing aggregates, never new stored
 * mistake text. Different observed error histories preserve separate intents;
 * co-occurrence is overlap evidence, not proof of a common cause. */
const provenanceCache = new WeakMap<
  LearnerTypingProfile,
  ReadonlyMap<string, readonly number[]>
>();
export function errorSessionProvenance(
  profile: LearnerTypingProfile,
): ReadonlyMap<string, readonly number[]> {
  const cached = provenanceCache.get(profile);
  if (cached) return cached;
  const result = new Map<string, number[]>(),
    add = (key: string, index: number) => {
      const rows = result.get(key) ?? [];
      if (!rows.includes(index)) rows.push(index);
      result.set(key, rows);
    };
  profile.recent.forEach((session, index) => {
    for (const [kind, rows] of [
      ["grapheme", session.aggregates.graphemes],
      ["bigram", session.aggregates.bigrams],
      ["token", session.aggregates.tokens],
    ] as const)
      for (const row of rows)
        if (row.errorOccurrences)
          add(JSON.stringify([kind, ...row.target]), index);
    for (const row of session.aggregates.substitutions)
      if (row.count)
        add(JSON.stringify(["substitution", row.expected, row.actual]), index);
  });
  if (Object.isFrozen(profile)) provenanceCache.set(profile, result);
  return result;
}
export interface SelectionAudit {
  readonly weaknessId: string;
  readonly recommendation: PracticeRecommendation;
  readonly signature: OverlapSignature;
  readonly state: MasteryState | null;
  readonly visible: boolean;
  readonly reason:
    | "selected"
    | "regression-visibility"
    | "transfer-visibility"
    | "recent-severity"
    | "related-evidence"
    | "capacity"
    | "broad-accuracy"
    | "mastery";
  readonly representedBy: string | null;
}
export function visibleWeaknessId(r: PracticeRecommendation): string {
  const identity = recommendationIdentity(r);
  return identity ? weaknessKey(identity) : r.type;
}
export function compareRecommendations(
  a: PracticeRecommendation,
  b: PracticeRecommendation,
): number {
  return (
    b.priority - a.priority ||
    (b.evidence[b.evidence.window === "recent" ? "recent" : "lifetime"]
      ?.opportunities ?? 0) -
      (a.evidence[a.evidence.window === "recent" ? "recent" : "lifetime"]
        ?.opportunities ?? 0) ||
    compareUnicode(a.id, b.id)
  );
}
const tokenUnitsCache = new Map<string, readonly string[]>();
const tokenUnits = (token: string) => {
  const existing = tokenUnitsCache.get(token);
  if (existing) return existing;
  const units = prepareTypingText(token).expectedUnits;
  if (tokenUnitsCache.size >= 256)
    tokenUnitsCache.delete(tokenUnitsCache.keys().next().value!);
  tokenUnitsCache.set(token, units);
  return units;
};
export function overlapSignature(
  r: PracticeRecommendation,
  observedAnchors: ReadonlySet<string>,
): OverlapSignature {
  const units =
    r.type === "DIFFICULT_WORD" ? tokenUnits(r.targets[0]) : r.targets;
  const graphemes = [...new Set(units)].sort(compareUnicode);
  const bigrams =
    r.type === "DIFFICULT_WORD"
      ? units.slice(1).map((u, i) => JSON.stringify([units[i], u]))
      : r.type === "WEAK_BIGRAM"
        ? [JSON.stringify(r.targets)]
        : [];
  // A confusion's expected side is its training intent; the actual side is
  // relationship metadata, not proof that the learner struggles to type it.
  const anchors = (
    r.type === "SUBSTITUTION_CONFUSION" ? [r.targets[0]] : graphemes
  ).filter((u) => observedAnchors.has(u));
  return {
    weaknessId: visibleWeaknessId(r),
    graphemes,
    bigrams: [...new Set(bigrams)].sort(compareUnicode),
    tokens: r.type === "DIFFICULT_WORD" ? r.targets : [],
    anchors,
  };
}
export function selectVisible<T extends VisibilityCandidate>(
  input: readonly T[],
) {
  const ids = new Map(
    input.map((c) => [c, visibleWeaknessId(c.recommendation)]),
  );
  const key = (c: T) => ids.get(c)!;
  const diagnosedPairs = new Set(
    input
      .filter((c) => c.recommendation.type === "WEAK_BIGRAM")
      .map((c) => JSON.stringify(c.recommendation.targets)),
  );
  const unique = new Map<string, T>();
  for (const candidate of [...input].sort((a, b) =>
    compareRecommendations(a.recommendation, b.recommendation),
  ))
    if (!unique.has(key(candidate))) unique.set(key(candidate), candidate);
  const ranked = [...unique.values()];
  const anchors = new Set(
    ranked.flatMap(({ recommendation: r }) =>
      r.type === "WEAK_GRAPHEME"
        ? r.targets
        : r.type === "SUBSTITUTION_CONFUSION"
          ? [r.targets[0]]
          : [],
    ),
  );
  const signatures = new Map(
    ranked.map((c) => [
      key(c),
      {
        ...overlapSignature(c.recommendation, anchors),
        ...(c.errorSessions ? { errorSessions: c.errorSessions } : {}),
      },
    ]),
  );
  const selected: T[] = [],
    reasons = new Map<string, SelectionAudit["reason"]>();
  const related = (a: T, b: T) => {
    const x = signatures.get(key(a))!,
      y = signatures.get(key(b))!;
    if (x.weaknessId === y.weaknessId) return true;
    if (x.errorSessions?.length && y.errorSessions?.length) {
      const shared = x.errorSessions.filter((i) =>
        y.errorSessions!.includes(i),
      ).length;
      const sameHistory =
        shared === x.errorSessions.length && shared === y.errorSessions.length;
      // One coincident mistake does not establish recurring shared intent when
      // either weakness also fails in separate sessions.
      if (!sameHistory && shared < VISIBILITY.minimumRelatedSessions)
        return false;
    }
    return (
      x.anchors.some((u) => y.anchors.includes(u)) ||
      x.bigrams.some((p) => diagnosedPairs.has(p) && y.bigrams.includes(p)) ||
      x.tokens.some((t) => y.tokens.includes(t))
    );
  };
  const add = (c: T, reason: SelectionAudit["reason"]) => {
    if (
      selected.length >= LEARNING.recommendations ||
      selected.some((x) => related(x, c))
    )
      return;
    selected.push(c);
    reasons.set(key(c), reason);
  };
  const broad = ranked.find((c) => c.recommendation.type === "ACCURACY_FOCUS");
  if (broad) add(broad, "broad-accuracy");
  else {
    for (const c of ranked
      .filter((c) => c.state === "REGRESSED")
      // More distinct recent error sessions are stronger recurring evidence;
      // retain raw priority/tie order when that observed breadth is equal.
      .sort(
        (a, b) =>
          (b.errorSessions?.length ?? 0) - (a.errorSessions?.length ?? 0) ||
          compareRecommendations(a.recommendation, b.recommendation),
      )
      .slice(0, VISIBILITY.regressionSlots))
      add(c, "regression-visibility");
    for (const c of ranked
      .filter((c) => c.state === "TRANSFER_CHECK")
      .slice(0, VISIBILITY.transferSlots))
      add(c, "transfer-visibility");
    // Existing meaningful error-rate/opportunity gates establish anchors. A
    // repeated direction can represent its generic key only when it accounts
    // for at least half the observed faulty occurrences. No category is given
    // automatic specificity precedence merely because its name is narrower.
    for (const c of ranked.filter(
      (c) => c.recommendation.type === "WEAK_GRAPHEME",
    )) {
      const r = c.recommendation,
        s = r.evidence.recent;
      if (
        !s ||
        s.opportunities < LEARNING.grapheme.opportunities ||
        s.errorOccurrences < LEARNING.grapheme.errors ||
        exposureRate(s) < TRANSFER.severeRate
      )
        continue;
      const direction = ranked.find(
        (x) =>
          x.recommendation.type === "SUBSTITUTION_CONFUSION" &&
          x.recommendation.targets[0] === r.targets[0] &&
          (x.recommendation.evidence.substitution?.recentCount ?? 0) >=
            Math.max(
              LEARNING.substitution.recentCount,
              s.errorOccurrences * VISIBILITY.directionalErrorShare,
            ),
      );
      add(direction ?? c, "recent-severity");
    }
    for (const c of ranked) add(c, "selected");
  }
  const audit: SelectionAudit[] = ranked.map((c) => {
    const id = key(c),
      visible = selected.includes(c),
      representative = !visible
        ? selected.find((x) => related(x, c))
        : undefined;
    return {
      weaknessId: id,
      recommendation: c.recommendation,
      signature: signatures.get(id)!,
      state: c.state ?? null,
      visible,
      reason:
        reasons.get(id) ??
        (broad
          ? "broad-accuracy"
          : representative
            ? "related-evidence"
            : "capacity"),
      representedBy: representative ? key(representative) : null,
    };
  });
  return { visible: selected, audit };
}
