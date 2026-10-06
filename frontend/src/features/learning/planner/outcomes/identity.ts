import { stableHash } from "../../exercises/identity";
import { weaknessKey } from "../../transfer/classify";
import type { LearningSessionPlan, PlannerOption } from "../types";
import { outcomeActivityKey } from "../diversity";
export { outcomeActivityKey } from "../diversity";
import { activityPurpose } from "../priorities";
import type { ActivityReference } from "./types";
export const outcomeScope = (scope: string) =>
  `planner-scope-${stableHash(scope)}`;
export const sourceReference = (source: { id: string; version: string }) =>
  `source-${stableHash(JSON.stringify([source.id, source.version]))}`;
export const completionReference = (runId: string) =>
  `completion-${stableHash(runId)}`;
export function activityReference(
  plan: LearningSessionPlan,
  slot: "primary" | "secondary" = "primary",
): ActivityReference {
  const activity =
    slot === "primary" ? plan.primaryAction : plan.optionalSecondaryAction;
  if (!activity) throw Error("No supporting activity.");
  return {
    planId: plan.id,
    planVersion: plan.version,
    activityKey: outcomeActivityKey(activity),
    learnerScope: outcomeScope(plan.learnerScope),
    activityType: activity.actionType,
    weaknessId: activity.weakness
      ? `weakness-${stableHash(weaknessKey(activity.weakness))}`
      : null,
    weaknessCategory: activity.weakness?.kind ?? null,
    purpose: activityPurpose(activity),
    slot,
    sourceReference:
      activity.target.type === "adaptive"
        ? sourceReference({
            id: activity.target.sourceId,
            version: activity.target.sourceVersion,
          })
        : null,
  };
}
