import type { PlannerOption, PlanPurpose } from "./types";
export function activityPurpose(option: PlannerOption): PlanPurpose {
  if (option.actionType === "normal-practice") return "general-practice";
  if (option.masteryState === "REGRESSED") return "regression-recovery";
  if (option.actionType === "controlled-assessment") return "transfer-check";
  return option.actionType === "contextual-practice"
    ? "contextual-practice"
    : "targeted-improvement";
}
/** Sequencing tiers, not new recommendation scores. Active needs retain policy order. */
export const sequencingTier = (option: PlannerOption) => {
  const purpose = activityPurpose(option);
  return purpose === "regression-recovery"
    ? 0
    : purpose === "transfer-check"
      ? 1
      : purpose === "general-practice"
        ? 3
        : 2;
};
