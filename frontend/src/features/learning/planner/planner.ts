import { freezeProfileValue, compareUnicode } from "../aggregation";
import { stableHash } from "../exercises/identity";
import { assertContext, compactOption, normalOption } from "./constraints";
import { choosePrimary, secondaryAllowed, activityKey } from "./diversity";
import { activityPurpose, sequencingTier } from "./priorities";
import { explainPurpose } from "./explanations";
import type {
  PlannerContext,
  PlannerOption,
  LearningSessionPlan,
  PlannedActivity,
} from "./types";
const activity = (option: PlannerOption): PlannedActivity => {
  const o =
    option.actionType === "normal-practice"
      ? normalOption(option.policyOrder)
      : option;
  return {
    ...o,
    purpose: activityPurpose(o),
    activityKey: activityKey(o),
    explanation: explainPurpose(activityPurpose(o)),
  };
};
/** Pure compact-state sequence selection. No profile diagnosis, content generation or reservations. */
export function planLearningSession(
  context: PlannerContext,
): LearningSessionPlan {
  assertContext(context);
  const compact = context.options
    .map(compactOption)
    .filter((o): o is PlannerOption => !!o);
  const available = compact.filter(
    (o) => o.executable && o.masteryState !== "PROVISIONAL_MASTERY",
  );
  const unique = new Map<string, PlannerOption>();
  const ordered = [...available].sort(
    (a, b) =>
      sequencingTier(a) - sequencingTier(b) ||
      a.policyOrder - b.policyOrder ||
      compareUnicode(a.id, b.id),
  );
  for (const o of ordered)
    if (!unique.has(activityKey(o))) unique.set(activityKey(o), o);
  const choices = [...unique.values()];
  if (!choices.length) choices.push(normalOption());
  const chosen = choosePrimary(
    choices,
    context.recentActions,
    context.recentOutcomes,
  );
  const primaryAction = activity(chosen.primary);
  const normal = normalOption();
  const secondary = secondaryAllowed(
    chosen.primary,
    choices,
    context.visibleNeedKeys,
  )
    ? activity(normal)
    : null;
  const e = context.evidenceVersion;
  const payload = {
    version: 1 as const,
    learnerScope: context.learnerScope,
    purpose: primaryAction.purpose,
    primaryAction,
    optionalSecondaryAction: secondary,
    estimatedActivities: secondary ? (2 as const) : (1 as const),
    explanation:
      primaryAction.explanation +
      (chosen.repetitionAvoided
        ? " Use an available variation to avoid repeating the same activity."
        : "") +
      (chosen.outcomeDiversion
        ? " Choose another available focus for this session."
        : ""),
    createdFromEvidenceVersion: {
      profile: e.profile,
      mastery: e.mastery,
      sessions: e.sessions,
      masteryOrder: e.masteryOrder,
      generator: e.generator,
      bank: e.bank,
    },
    audit: {
      unavailableActionsAvoided:
        (context.unavailableActions ?? 0) +
        compact.filter((o) => !o.executable).length,
      duplicateActivitiesAvoided: available.length - unique.size,
      masteredActionsAvoided: compact.filter(
        (o) => o.masteryState === "PROVISIONAL_MASTERY",
      ).length,
      repetitionAvoided: chosen.repetitionAvoided,
      ...(context.recentOutcomes?.length
        ? { outcomeDiversion: chosen.outcomeDiversion }
        : {}),
    },
  };
  return freezeProfileValue({
    id: `session-plan-${stableHash(JSON.stringify(context.recentOutcomes?.length ? [payload, context.recentActions, context.recentOutcomes] : [payload, context.recentActions]))}`,
    ...payload,
  });
}
