import {
  createPlannerContext,
  planLearningSession,
  emptyPlannerHistory,
  advancePlannerHistory,
} from "../planner";
import { PLANNER_GOLDENS } from "../planner/scenarioFixtures";
import { sequencingTier } from "../planner/priorities";
import { activityKey, secondaryAllowed } from "../planner/diversity";
import type { PlannerContext, LearningSessionPlan } from "../planner";
import type { ScenarioResult } from "./types";
/** Evaluate the already-produced policy/mastery outputs; no new diagnoses or scores. */
export function evaluatePlanner(
  results: readonly Pick<
    ScenarioResult,
    "id" | "finalProfile" | "finalMastery" | "history"
  >[],
) {
  const contexts = results.map((result) => {
    let history = emptyPlannerHistory(),
      order = 0;
    const seen = new Set<string>();
    for (const row of result.history.sessions) {
      if (seen.has(row.summary.sessionId)) continue;
      seen.add(row.summary.sessionId);
      history = advancePlannerHistory(
        history,
        row.summary,
        ++order,
        row.attribution,
      );
    }
    if (order !== result.finalProfile.sessionCount)
      history = emptyPlannerHistory(result.finalProfile.sessionCount);
    return {
      id: result.id,
      context: createPlannerContext(
        "anonymous-evaluation",
        result.finalProfile,
        result.finalMastery,
        history,
      ),
    };
  });
  const fixtures = [
    ...contexts,
    ...PLANNER_GOLDENS.map((g) => ({ id: `golden:${g.id}`, context: g.input })),
  ];
  const invalid: { id: string; reasons: string[] }[] = [],
    plans: { id: string; plan: LearningSessionPlan }[] = [];
  let deterministicComparisons = 0,
    nonDeterministic = 0;
  for (const fixture of fixtures) {
    const plan = planLearningSession(fixture.context),
      again = planLearningSession(fixture.context),
      reasons: string[] = [];
    deterministicComparisons++;
    if (JSON.stringify(plan) !== JSON.stringify(again)) {
      nonDeterministic++;
      reasons.push("non-deterministic plan");
    }
    if (
      plan.learnerScope !== fixture.context.learnerScope ||
      JSON.stringify(plan.createdFromEvidenceVersion) !==
        JSON.stringify(fixture.context.evidenceVersion)
    )
      reasons.push("wrong owner/evidence");
    const activities = [
      plan.primaryAction,
      ...(plan.optionalSecondaryAction ? [plan.optionalSecondaryAction] : []),
    ];
    if (
      activities.length > 2 ||
      plan.estimatedActivities !== activities.length ||
      new Set(activities.map((a) => a.activityKey)).size !== activities.length
    )
      reasons.push("duplicate/excess activities");
    for (const action of activities) {
      if (!action.executable || action.masteryState === "PROVISIONAL_MASTERY")
        reasons.push("unavailable/mastered activity");
      if (
        action.target.type === "adaptive" &&
        !fixture.context.options.some(
          (o) =>
            o.executable &&
            o.masteryState !== "PROVISIONAL_MASTERY" &&
            JSON.stringify(o.target) === JSON.stringify(action.target) &&
            activityKey(o) === action.activityKey,
        )
      )
        reasons.push("missing exact capability witness");
    }
    const available = fixture.context.options.filter(
      (o) => o.executable && o.masteryState !== "PROVISIONAL_MASTERY",
    );
    if (
      available.some(
        (o) => sequencingTier(o) < sequencingTier(plan.primaryAction),
      )
    )
      reasons.push("higher sequencing priority skipped");
    if (
      plan.optionalSecondaryAction &&
      (!secondaryAllowed(
        plan.primaryAction,
        available,
        fixture.context.visibleNeedKeys,
      ) ||
        plan.primaryAction.purpose === plan.optionalSecondaryAction.purpose)
    )
      reasons.push("invalid secondary");
    if (reasons.length) invalid.push({ id: fixture.id, reasons });
    plans.push({ id: fixture.id, plan });
  }
  const goldens = PLANNER_GOLDENS.map((g) => {
    const plan = plans.find((p) => p.id === `golden:${g.id}`)!.plan;
    return {
      id: g.id,
      passed:
        plan.purpose === g.purpose &&
        plan.primaryAction.id === g.primaryId &&
        plan.estimatedActivities === g.activities &&
        plan.audit.repetitionAvoided === (g.repetition ?? false),
      purpose: plan.purpose,
      activities: plan.estimatedActivities,
    };
  });
  return {
    report: {
      plansGenerated: plans.length,
      policyOutputContexts: contexts.length,
      invalidPlans: invalid.length,
      invalid,
      unavailableActionsAvoided: plans.reduce(
        (n, p) => n + p.plan.audit.unavailableActionsAvoided,
        0,
      ),
      duplicateActivitiesAvoided: plans.reduce(
        (n, p) => n + p.plan.audit.duplicateActivitiesAvoided,
        0,
      ),
      deterministicComparisons,
      nonDeterministic,
      deterministic: nonDeterministic === 0,
      goldens,
      plans,
    },
    contexts: fixtures.map((f) => f.context),
  };
}
export function plannerBenchmark(
  contexts: readonly PlannerContext[],
  decisions = 1000,
) {
  if (!contexts.length || decisions !== 1000)
    throw Error("Benchmark requires contexts and 1,000 decisions.");
  // Warm pure decision code; exclude adapter/generation/content from its timing.
  for (const context of contexts) planLearningSession(context);
  const heapBefore = process.memoryUsage().heapUsed,
    start = performance.now();
  let checksum = 0;
  for (let i = 0; i < decisions; i++)
    checksum += planLearningSession(contexts[i % contexts.length]).id.length;
  const runtimeMs = performance.now() - start,
    heapAfter = process.memoryUsage().heapUsed;
  const bytes = (value: unknown) =>
    new TextEncoder().encode(JSON.stringify(value)).length;
  const maxContextBytes = Math.max(...contexts.map(bytes)),
    maxPlanBytes = Math.max(
      ...contexts.map((c) => bytes(planLearningSession(c))),
    );
  return {
    decisions,
    contexts: contexts.length,
    runtimeMs,
    averageMs: runtimeMs / decisions,
    maxContextBytes,
    maxPlanBytes,
    maxSerializedWorkingSetBytes: maxContextBytes + maxPlanBytes,
    observedHeapDeltaBytes: heapAfter - heapBefore,
    heapMeasurement:
      "Transient allocation, GC-sensitive; serialized bounds describe retained compact state.",
    checksum,
  };
}
export function renderPlannerReport(
  report: ReturnType<typeof evaluatePlanner>["report"],
) {
  return (
    `\n# Slice 11 session planner\n\n${report.plansGenerated} plans from ${report.policyOutputContexts} existing policy output contexts and 10 golden fixtures. Invalid: ${report.invalidPlans}. Unavailable actions avoided: ${report.unavailableActionsAvoided}. Duplicate activities avoided: ${report.duplicateActivitiesAvoided}. Determinism: ${report.deterministicComparisons} comparisons, ${report.nonDeterministic} differences.\n\n` +
    report.goldens
      .map(
        (g) =>
          `- ${g.id}: ${g.passed ? "PASS" : "FAIL"} (${g.purpose}, ${g.activities} activity/activities)`,
      )
      .join("\n") +
    "\n"
  );
}
