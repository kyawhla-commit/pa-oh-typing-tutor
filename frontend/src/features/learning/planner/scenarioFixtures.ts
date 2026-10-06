import { normalOption } from "./constraints";
import { activityKey } from "./diversity";
import type { PlannerContext, PlannerOption, PlanPurpose } from "./types";
export function option(
  id = "r",
  patch: Partial<PlannerOption> = {},
): PlannerOption {
  return {
    id,
    recommendationId: id,
    policyOrder: 0,
    actionType: "targeted-practice",
    weakness: { kind: "grapheme", items: [id] },
    masteryState: "ACTIVE",
    executable: true,
    target: {
      type: "adaptive",
      sourceId: `adaptive-${id}`,
      sourceVersion: "generator/bank",
      level: 0,
      ordinal: 0,
      purpose: "training",
      graphemes: 160,
    },
    ...patch,
  };
}
export function context(
  options: readonly PlannerOption[],
  recentActions: readonly string[] = [],
): PlannerContext {
  return {
    learnerScope: "fixture:a",
    evidenceVersion: {
      profile: 1,
      mastery: 2,
      sessions: 8,
      masteryOrder: 8,
      generator: "generator",
      bank: "bank",
    },
    options,
    recentActions,
  };
}
const targeted = option(),
  newWeak = option("p", { policyOrder: 1 });
const recovery = option("r", { masteryState: "REGRESSED", policyOrder: 1 });
const check = option("r", {
  actionType: "controlled-assessment",
  masteryState: "TRANSFER_CHECK",
  target: {
    type: "adaptive",
    sourceId: "assessment-r",
    sourceVersion: "generator/bank",
    level: 2,
    ordinal: 0,
    purpose: "controlled-transfer-assessment",
    graphemes: 300,
  },
});
const contextual = option("r", {
  actionType: "contextual-practice",
  target: {
    type: "adaptive",
    sourceId: "context-r",
    sourceVersion: "generator/bank",
    level: 1,
    ordinal: 0,
    purpose: "training",
    graphemes: 220,
  },
  policyOrder: 1,
});
export const PLANNER_GOLDENS: readonly {
  id: string;
  input: PlannerContext;
  purpose: PlanPurpose;
  primaryId: string;
  activities: 1 | 2;
  repetition?: boolean;
}[] = [
  {
    id: "regression-plus-weakness",
    input: context([newWeak, recovery]),
    purpose: "regression-recovery",
    primaryId: "r",
    activities: 1,
  },
  {
    id: "transfer-plus-new-weakness",
    input: context([newWeak, check]),
    purpose: "transfer-check",
    primaryId: "r",
    activities: 1,
  },
  {
    id: "strong-active-need",
    input: context([targeted]),
    purpose: "targeted-improvement",
    primaryId: "r",
    activities: 2,
  },
  {
    id: "no-weakness",
    input: context([normalOption()]),
    purpose: "general-practice",
    primaryId: "ordinary-practice",
    activities: 1,
  },
  {
    id: "unavailable-assessment",
    input: context([{ ...check, executable: false }]),
    purpose: "general-practice",
    primaryId: "ordinary-practice",
    activities: 1,
  },
  // Compact contract can accept a same-weakness contextual alternative only if
  // its producer has already authorized and validated it. The production adapter
  // emits only the current progression level, never manufactures this option.
  {
    id: "repeat-with-authorized-context",
    input: context(
      [targeted, contextual],
      [activityKey(targeted), activityKey(targeted), activityKey(targeted)],
    ),
    purpose: "contextual-practice",
    primaryId: "r",
    activities: 1,
    repetition: true,
  },
  {
    id: "single-priority-action-repeat",
    input: context(
      [targeted, normalOption()],
      [activityKey(targeted), activityKey(targeted), activityKey(targeted)],
    ),
    purpose: "targeted-improvement",
    primaryId: "r",
    activities: 2,
    repetition: false,
  },
  {
    id: "unrelated-competing-needs",
    input: context([newWeak, targeted]),
    purpose: "targeted-improvement",
    primaryId: "r",
    activities: 1,
  },
  {
    id: "duplicate-cluster",
    input: context([
      contextual,
      { ...contextual, id: "r-copy" },
      { ...contextual, id: "r-copy-2" },
    ]),
    purpose: "contextual-practice",
    primaryId: "r",
    activities: 1,
  },
  {
    id: "mastered-excluded",
    input: context([{ ...targeted, masteryState: "PROVISIONAL_MASTERY" }]),
    purpose: "general-practice",
    primaryId: "ordinary-practice",
    activities: 1,
  },
];
