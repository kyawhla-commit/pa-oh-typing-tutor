import { LEARNING } from "../constants";
import { weaknessIdentity, weaknessKey } from "../transfer/classify";
import type { PlannerContext, PlannerOption } from "./types";
export const PLANNER = Object.freeze({
  version: 1 as const,
  maxOptions: 8,
  maxScopeUnits: LEARNING.maxScopeUnits,
  maxRecentActions: 3,
  maxActivities: 2,
  shortPrimaryGraphemes: 180,
  maxHistoryBytes: 4096,
});
export function optionIdentity(o: PlannerOption): string {
  return o.weakness ? weaknessKey(o.weakness) : "ordinary-practice";
}
/** Defensive whitelist at the compact boundary; callers cannot leak arbitrary fields into plans. */
export function compactOption(o: PlannerOption): PlannerOption | null {
  try {
    if (
      typeof o.id !== "string" ||
      !o.id ||
      o.id.length > 256 ||
      !Number.isSafeInteger(o.policyOrder) ||
      o.policyOrder < 0
    )
      return null;
    if (
      o.recommendationId !== null &&
      (typeof o.recommendationId !== "string" ||
        !o.recommendationId.length ||
        o.recommendationId.length > 256)
    )
      return null;
    const weakness = o.weakness
      ? weaknessIdentity(o.weakness.kind, o.weakness.items)
      : null;
    if (
      ![
        null,
        "ACTIVE",
        "IMPROVING",
        "TRANSFER_CHECK",
        "REGRESSED",
        "PROVISIONAL_MASTERY",
        "INSUFFICIENT_EVIDENCE",
      ].includes(o.masteryState)
    )
      return null;
    if (o.actionType === "normal-practice") {
      if (o.target.type !== "ordinary-practice") return null;
      return {
        id: o.id,
        recommendationId: o.recommendationId,
        policyOrder: o.policyOrder,
        actionType: o.actionType,
        weakness,
        masteryState: o.masteryState,
        executable: o.executable === true,
        target: { type: "ordinary-practice" },
      };
    }
    const t = o.target;
    if (
      t.type !== "adaptive" ||
      !weakness ||
      typeof t.sourceId !== "string" ||
      !t.sourceId ||
      t.sourceId.length > 128 ||
      typeof t.sourceVersion !== "string" ||
      !t.sourceVersion ||
      t.sourceVersion.length > 128 ||
      !Number.isSafeInteger(t.ordinal) ||
      t.ordinal < 0 ||
      t.ordinal >= 1e9 ||
      !Number.isSafeInteger(t.graphemes) ||
      t.graphemes < 1 ||
      t.graphemes > 330
    )
      return null;
    if (
      o.actionType === "controlled-assessment"
        ? t.purpose !== "controlled-transfer-assessment" ||
          t.level !== 2 ||
          o.masteryState !== "TRANSFER_CHECK"
        : !["targeted-practice", "contextual-practice"].includes(
            o.actionType,
          ) ||
          t.purpose !== "training" ||
          (o.actionType === "targeted-practice"
            ? t.level !== 0
            : ![1, 2].includes(t.level))
    )
      return null;
    if (
      o.actionType !== "controlled-assessment" &&
      ["INSUFFICIENT_EVIDENCE", "TRANSFER_CHECK"].includes(o.masteryState ?? "")
    )
      return null;
    if (
      o.masteryState === "REGRESSED" &&
      (o.actionType !== "targeted-practice" || t.level !== 0)
    )
      return null;
    if (
      typeof o.recommendationId !== "string" ||
      !o.recommendationId.length ||
      o.recommendationId.length > 256
    )
      return null;
    return {
      id: o.id,
      recommendationId: o.recommendationId,
      policyOrder: o.policyOrder,
      actionType: o.actionType,
      weakness,
      masteryState: o.masteryState,
      executable: o.executable === true,
      target: {
        type: "adaptive",
        sourceId: t.sourceId,
        sourceVersion: t.sourceVersion,
        level: t.level,
        ordinal: t.ordinal,
        purpose: t.purpose,
        graphemes: t.graphemes,
      },
    };
  } catch {
    return null;
  }
}
export function assertContext(c: PlannerContext) {
  const e = c.evidenceVersion;
  if (
    c.recentOutcomes &&
    (c.recentOutcomes.length > 5 ||
      c.recentOutcomes.some(
        (o, i) =>
          !/^activity-[a-f0-9]{16}$/.test(o.activityKey) ||
          !["completed", "cancelled", "skipped", "abandoned"].includes(
            o.outcome,
          ) ||
          !Number.isSafeInteger(o.sequence) ||
          o.sequence < 1 ||
          (i > 0 && c.recentOutcomes![i - 1].sequence >= o.sequence),
      ))
  )
    throw Error("Invalid bounded outcome context.");
  if (
    c.visibleNeedKeys &&
    (c.visibleNeedKeys.length > PLANNER.maxOptions ||
      c.visibleNeedKeys.some((k) => typeof k !== "string" || k.length > 256))
  )
    throw Error("Invalid visible need references.");
  if (
    c.unavailableActions !== undefined &&
    (!Number.isSafeInteger(c.unavailableActions) ||
      c.unavailableActions < 0 ||
      c.unavailableActions > PLANNER.maxOptions)
  )
    throw Error("Invalid unavailable action count.");
  if (
    typeof c.learnerScope !== "string" ||
    !c.learnerScope ||
    c.learnerScope.length > PLANNER.maxScopeUnits ||
    c.options.length > PLANNER.maxOptions ||
    c.recentActions.length > PLANNER.maxRecentActions ||
    c.recentActions.some((k) => typeof k !== "string" || k.length > 256) ||
    e.profile !== 1 ||
    ![1, 2].includes(e.mastery) ||
    !Number.isSafeInteger(e.sessions) ||
    e.sessions < 0 ||
    !Number.isSafeInteger(e.masteryOrder) ||
    e.masteryOrder < 0 ||
    e.masteryOrder > e.sessions ||
    typeof e.generator !== "string" ||
    !e.generator ||
    e.generator.length > 128 ||
    typeof e.bank !== "string" ||
    !e.bank ||
    e.bank.length > 128
  )
    throw Error("Invalid bounded planner context.");
}
export function normalOption(
  order: number = PLANNER.maxOptions,
): PlannerOption {
  return {
    id: "ordinary-practice",
    recommendationId: null,
    policyOrder: order,
    actionType: "normal-practice",
    weakness: null,
    masteryState: null,
    executable: true,
    target: { type: "ordinary-practice" },
  };
}
