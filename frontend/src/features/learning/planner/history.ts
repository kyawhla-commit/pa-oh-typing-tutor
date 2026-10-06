import { freezeProfileValue } from "../aggregation";
import {
  classifyEvidence,
  weaknessIdentity,
  weaknessKey,
} from "../transfer/classify";
import type { AdaptiveAttribution, WeaknessKind } from "../transfer/types";
import type { SessionSummary } from "../types";
import type { ProfileStorage } from "../storage";
import { PLANNER } from "./constraints";
import type { PlannerHistory } from "./types";
export const plannerHistoryKey = (scope: string) =>
  `typing-learning-planner:v1:${scope}`;
export const emptyPlannerHistory = (order = 0): PlannerHistory =>
  freezeProfileValue({ version: 1 as const, order, recent: [] });
function validActivityKey(key: string) {
  if (key === "other-session") return true;
  try {
    const [type, identity, purpose] = JSON.parse(key);
    if (type === "normal-practice")
      return (
        key === JSON.stringify([type, "ordinary-practice", "ordinary-practice"])
      );
    const [kind, ...items] = JSON.parse(identity);
    const canonical = weaknessKey(weaknessIdentity(kind, items));
    return (
      identity === canonical &&
      [
        "targeted-practice",
        "contextual-practice",
        "controlled-assessment",
      ].includes(type) &&
      purpose ===
        (type === "controlled-assessment"
          ? "controlled-transfer-assessment"
          : "training") &&
      key === JSON.stringify([type, identity, purpose])
    );
  } catch {
    return false;
  }
}
export function parsePlannerHistory(
  text: string | null,
  profileOrder: number,
): PlannerHistory {
  try {
    if (
      !text ||
      new TextEncoder().encode(text).length > PLANNER.maxHistoryBytes
    )
      return emptyPlannerHistory(profileOrder);
    const v = JSON.parse(text);
    if (
      v.version !== 1 ||
      !Number.isSafeInteger(v.order) ||
      v.order < 0 ||
      v.order !== profileOrder ||
      !Array.isArray(v.recent) ||
      v.recent.length > 3 ||
      v.order < v.recent.length
    )
      throw Error();
    const recent = v.recent.map(
      (r: { sessionId: unknown; activityKey: unknown; sourceId: unknown }) => {
        if (
          typeof r.sessionId !== "string" ||
          !r.sessionId.length ||
          r.sessionId.length > 128 ||
          typeof r.activityKey !== "string" ||
          r.activityKey.length > 256 ||
          !validActivityKey(r.activityKey) ||
          (r.sourceId !== null &&
            (typeof r.sourceId !== "string" ||
              !r.sourceId.length ||
              r.sourceId.length > 128))
        )
          throw Error();
        return {
          sessionId: r.sessionId,
          activityKey: r.activityKey,
          sourceId: r.sourceId,
        };
      },
    );
    if (
      new Set(recent.map((r: { sessionId: string }) => r.sessionId)).size !==
      recent.length
    )
      throw Error();
    return freezeProfileValue({ version: 1 as const, order: v.order, recent });
  } catch {
    return emptyPlannerHistory(profileOrder);
  }
}
export function loadPlannerHistory(
  storage: ProfileStorage,
  scope: string,
  order: number,
) {
  try {
    return parsePlannerHistory(
      storage.getItem(plannerHistoryKey(scope)),
      order,
    );
  } catch {
    return emptyPlannerHistory(order);
  }
}
export function savePlannerHistory(
  storage: ProfileStorage,
  scope: string,
  history: PlannerHistory,
) {
  try {
    storage.setItem(plannerHistoryKey(scope), JSON.stringify(history));
    return true;
  } catch {
    return false;
  }
}
/** Only accepted new completions enter. Tests/custom/unknown sessions break the
 * consecutive practice run; they never become invented focused activities. */
export function advancePlannerHistory(
  current: PlannerHistory,
  summary: SessionSummary,
  order: number,
  attribution?: AdaptiveAttribution,
): PlannerHistory {
  if (order <= current.order) return current;
  const context = classifyEvidence(summary, attribution);
  let key = "other-session";
  if (context === "ordinary-practice")
    key = JSON.stringify([
      "normal-practice",
      "ordinary-practice",
      "ordinary-practice",
    ]);
  else if (
    (context === "adaptive-targeted" ||
      context === "controlled-transfer-assessment") &&
    attribution
  ) {
    try {
      const identity = weaknessKey(
        weaknessIdentity(
          attribution.focusType as WeaknessKind,
          attribution.focusItems,
        ),
      );
      const purpose = attribution.composition?.purpose ?? "training";
      const type =
        purpose === "controlled-transfer-assessment"
          ? "controlled-assessment"
          : (attribution.composition?.level ?? 0) === 0
            ? "targeted-practice"
            : "contextual-practice";
      key = JSON.stringify([type, identity, purpose]);
    } catch {
      /* unknown metadata breaks repetition conservatively */
    }
  }
  return freezeProfileValue({
    version: 1 as const,
    order,
    recent: [
      ...current.recent,
      {
        sessionId: summary.sessionId,
        activityKey: key,
        sourceId:
          key !== "other-session" && context !== "ordinary-practice"
            ? (summary.sourceIdentity?.id ?? null)
            : null,
      },
    ].slice(-PLANNER.maxRecentActions),
  });
}
