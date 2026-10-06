import { stableHash } from "../exercises/identity";
import type { RecentOutcome } from "./outcomes/types";
import { optionIdentity, PLANNER } from "./constraints";
import { sequencingTier } from "./priorities";
import type { PlannerOption } from "./types";
export const activityKey = (o: PlannerOption) =>
  JSON.stringify([
    o.actionType,
    optionIdentity(o),
    o.target.type === "adaptive" ? o.target.purpose : "ordinary-practice",
  ]);
export const outcomeActivityKey = (o: PlannerOption) =>
  `activity-${stableHash(activityKey(o))}`;
function chooseByCompletion(
  options: readonly PlannerOption[],
  recent: readonly string[],
) {
  const first = options[0],
    key = activityKey(first);
  const repeated =
    recent.length === PLANNER.maxRecentActions &&
    recent.every((k) => k === key);
  if (!repeated) return { primary: first, repetitionAvoided: false };
  const alternatives = options.filter(
    (o) =>
      sequencingTier(o) === sequencingTier(first) && activityKey(o) !== key,
  );
  // Variation never invents a level or bypasses regression/check priority.
  const contextual = alternatives.find(
    (o) =>
      optionIdentity(o) === optionIdentity(first) &&
      o.actionType === "contextual-practice",
  );
  const primary = contextual ?? alternatives[0] ?? first;
  return { primary, repetitionAvoided: primary !== first };
}
export function choosePrimary(
  options: readonly PlannerOption[],
  recent: readonly string[],
  outcomes: readonly RecentOutcome[] = [],
) {
  const base = chooseByCompletion(options, recent),
    last = outcomes.at(-1);
  if (
    !last ||
    !["skipped", "cancelled"].includes(last.outcome) ||
    last.activityKey !== outcomeActivityKey(base.primary)
  )
    return { ...base, outcomeDiversion: false };
  const comparable = options.find(
    (o) =>
      sequencingTier(o) === sequencingTier(base.primary) &&
      outcomeActivityKey(o) !== last.activityKey,
  );
  // A declined check may use the strongest remaining visible action, including
  // ordinary Practice. This single latest-outcome hop never changes eligibility.
  const alternate =
    comparable ??
    (base.primary.actionType === "controlled-assessment"
      ? options.find((o) => outcomeActivityKey(o) !== last.activityKey)
      : undefined);
  return alternate
    ? {
        primary: alternate,
        repetitionAvoided: base.repetitionAvoided,
        outcomeDiversion: true,
      }
    : { ...base, outcomeDiversion: false };
}
export function secondaryAllowed(
  primary: PlannerOption,
  options: readonly PlannerOption[],
  visibleNeedKeys: readonly string[] = [],
) {
  return (
    primary.target.type === "adaptive" &&
    primary.target.graphemes <= PLANNER.shortPrimaryGraphemes &&
    visibleNeedKeys.every((key) => key === optionIdentity(primary)) &&
    options.every(
      (o) =>
        o.actionType === "normal-practice" ||
        optionIdentity(o) === optionIdentity(primary),
    )
  );
}
