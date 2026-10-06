import { outcomeFixture } from "../planner/outcomes/testFixtures";
import { createLearningService } from "../service";
import { completed } from "../testFixtures";
import {
  finishExercise,
  sourceAttribution,
  targetPositions,
} from "../progression/testFixtures";
import { planLearningSession } from "../planner";
import { context, option } from "../planner/scenarioFixtures";
import {
  outcomeActivityKey,
  activityReference,
  completionReference,
} from "../planner/outcomes/identity";
import {
  transitionOutcome,
  emptyOutcomeState,
  OUTCOMES,
} from "../planner/outcomes/lifecycle";
import { serializeOutcomeState } from "../planner/outcomes/storage";
import type { PlannerOutcomeState } from "../planner/outcomes/types";
import type { PlannerContext } from "../planner/types";
/** Engineering scenarios with real accepted engine results; no human study or telemetry. */
export async function evaluatePlannerOutcomes() {
  const names = [
    "skip-no-evidence",
    "cancel-no-evidence",
    "cancel-check-no-rollback",
    "skip-check-no-rollback",
    "completed-bad-check-rolls-back",
    "secondary-gated",
    "secondary-decline-no-evidence",
    "outcome-idempotency",
    "stale-not-user-outcome",
    "reload-offer-no-outcome",
    "scope-isolation",
    "engine-metrics-independent",
    "manual-save-independent",
    "bounded-history",
    "deterministic-plan",
  ];
  const invariants = names.map((id) => ({
    id,
    checks: 0,
    violations: [] as string[],
  }));
  const check = (index: number, ok: boolean, label: string) => {
    invariants[index].checks++;
    if (!ok) invariants[index].violations.push(label);
  };
  const flows: {
    id: string;
    outcomes: string[];
    sessionsBefore: number;
    sessionsAfter: number;
  }[] = [];
  const snapshots: PlannerOutcomeState[] = [];
  let falseLearningEvidenceIngestions = 0,
    falseAssessmentRollbacks = 0,
    duplicateOutcomesRejected = 0,
    alternatePlansSelected = 0,
    invalidPlans = 0;
  const collect = (
    id: string,
    f: ReturnType<typeof outcomeFixture>,
    before: number,
  ) => {
    const state = f.service.getOutcomeSnapshot(f.scope);
    snapshots.push(state);
    flows.push({
      id,
      outcomes: state.recent.map((o) => o.outcome),
      sessionsBefore: before,
      sessionsAfter: f.service.getSnapshot(f.scope).profile.sessionCount,
    });
    const p = f.service.planSession(f.scope);
    if (!p.primaryAction.executable || p.estimatedActivities > 2)
      invalidPlans++;
  };
  const unchanged = (
    index: number,
    f: ReturnType<typeof outcomeFixture>,
    before: ReturnType<typeof f.service.getSnapshot>,
    label: string,
  ) => {
    const after = f.service.getSnapshot(f.scope);
    const delta = after.profile.sessionCount - before.profile.sessionCount;
    falseLearningEvidenceIngestions += Math.abs(delta);
    check(index, delta === 0, label);
    const rollback =
      JSON.stringify(after.mastery.records) !==
      JSON.stringify(before.mastery.records);
    if (rollback) falseAssessmentRollbacks++;
    check(
      index,
      JSON.stringify(after.profile) === JSON.stringify(before.profile),
      `${label}: profile unchanged`,
    );
  };
  for (const kind of ["targeted", "contextual", "check", "normal"] as const) {
    const f = outcomeFixture(kind),
      before = f.service.getSnapshot("a");
    f.service.offerPlanned("a", f.plan);
    const id = f.service.getOutcomeSnapshot("a").current!.attemptId;
    f.service.skipPlanned("a", id);
    unchanged(0, f, before, `B/D skip ${kind}`);
    check(5, !f.service.canContinuePlanned("a", f.plan), "skip cannot unlock");
    check(7, !f.service.skipPlanned("a", id).changed, "duplicate skip");
    duplicateOutcomesRejected++;
    if (kind === "check") {
      check(
        3,
        JSON.stringify(f.service.getSnapshot("a").mastery.records) ===
          JSON.stringify(before.mastery.records),
        "skip check retains eligibility",
      );
      if (f.service.planSession("a").purpose === "general-practice")
        alternatePlansSelected++;
    }
    collect(
      kind === "check" ? "D" : `B:${kind}`,
      f,
      before.profile.sessionCount,
    );
    const c = outcomeFixture(kind),
      run = c.start(),
      pre = c.service.getSnapshot("a");
    run.engine.dispatch({ type: "INSERT_TEXT", text: "X", atMs: 0 });
    const metrics = JSON.stringify(run.engine.getSnapshot().counts);
    run.engine.dispatch({ type: "ABORT", atMs: 100 });
    c.service.cancelPlanned("a", run.attempt.attemptId, {
      id: "run1",
      status: "aborted",
    });
    c.service.complete("a", "run1", run.engine.getResult(), 0);
    unchanged(1, c, pre, `C/E cancel ${kind}`);
    check(
      11,
      JSON.stringify(run.engine.getSnapshot().counts) === metrics,
      "planner does not change engine counts",
    );
    check(
      5,
      !c.service.canContinuePlanned("a", c.plan),
      "cancel cannot unlock",
    );
    check(
      7,
      !c.service.cancelPlanned("a", run.attempt.attemptId, {
        id: "run1",
        status: "aborted",
      }).changed,
      "duplicate cancel",
    );
    duplicateOutcomesRejected++;
    if (kind === "check")
      check(
        2,
        JSON.stringify(c.service.getSnapshot("a").mastery.records) ===
          JSON.stringify(pre.mastery.records),
        "cancel check retains eligibility",
      );
    collect(kind === "check" ? "E" : `C:${kind}`, c, pre.profile.sessionCount);
  }
  for (const bad of [false, true]) {
    const f = outcomeFixture("check"),
      r = f.start(),
      e = r.selected.selection!.exercise,
      result = finishExercise(e, bad ? targetPositions(e) : []),
      metric = JSON.stringify(result);
    const before = f.service.getSnapshot("a").profile.sessionCount;
    f.service.complete(
      "a",
      "run1",
      result,
      0,
      sourceAttribution(e, r.selected.selection!.assessmentCheckOrder),
    );
    const record = f.service
      .getSnapshot("a")
      .mastery.records.find((r) => r.identity.items[0] === "r")!;
    check(
      4,
      bad
        ? record.assessmentFailure === "severe" && record.state === "ACTIVE"
        : record.assessmentFailure === null && record.assessments?.length === 1,
      bad ? "F legitimate failing check" : "good completed check",
    );
    check(11, JSON.stringify(result) === metric, "accepted result immutable");
    const state = f.service.getOutcomeSnapshot("a");
    f.service.complete("a", "run1", result, 0, sourceAttribution(e));
    check(
      7,
      f.service.getOutcomeSnapshot("a") === state,
      "duplicate completion",
    );
    duplicateOutcomesRejected++;
    collect(bad ? "F" : "good-check", f, before);
  }
  for (const decline of [true, false]) {
    const f = outcomeFixture(),
      before = f.service.getSnapshot("a").profile.sessionCount;
    check(
      5,
      !f.service.canContinuePlanned("a", f.plan),
      "secondary initially gated",
    );
    f.complete();
    check(
      5,
      f.service.canContinuePlanned("a", f.plan),
      "accepted primary unlocks",
    );
    const o = f.service.offerPlanned("a", f.plan, "secondary");
    if (!o.ok) throw Error("secondary fixture");
    const pre = f.service.getSnapshot("a");
    if (decline) {
      f.service.skipPlanned("a", o.attempt.attemptId);
      unchanged(6, f, pre, "G secondary decline");
    } else {
      f.service.startPlanned("a", f.plan, "secondary");
      f.service.bindPlannedRun("a", o.attempt.attemptId, "secondary");
      f.service.complete("a", "secondary", completed("abc"), 0);
      check(
        5,
        f.service.getSnapshot("a").profile.sessionCount === before + 2,
        "secondary once ordinary",
      );
    }
    check(
      5,
      !f.service.canContinuePlanned("a", f.plan),
      "secondary cannot recur",
    );
    collect(decline ? "A/G" : "secondary-complete", f, before);
  }
  const stale = outcomeFixture();
  stale.service.offerPlanned("a", stale.plan);
  createLearningService(stale.storage, (j) => j()).complete(
    "a",
    "external",
    completed("abc"),
    0,
  );
  check(
    8,
    !stale.service.startPlanned("a", stale.plan).ok &&
      stale.service.getOutcomeSnapshot("a").recent.length === 0,
    "H stale is system invalidation",
  );
  collect("H", stale, 2);
  for (const started of [false, true]) {
    const f = outcomeFixture();
    if (started) f.start();
    else f.service.offerPlanned("a", f.plan);
    const reload = createLearningService(f.storage, (j) => j());
    check(
      9,
      reload.getOutcomeSnapshot("a").recent.length === 0 &&
        reload.getOutcomeSnapshot("a").current === null,
      "I/J reload no invented outcome",
    );
    check(
      9,
      reload.getSnapshot("a").profile.sessionCount === 2,
      "reload no evidence",
    );
    collect(started ? "J" : "I", f, 2);
  }
  const abandon = outcomeFixture(),
    run = abandon.start(),
    pre = abandon.service.getSnapshot("a"),
    token = abandon.service.attachPlanned("a", run.attempt.attemptId);
  abandon.service.releasePlanned("a", run.attempt.attemptId, token, false, () =>
    run.engine.dispatch({ type: "ABORT", atMs: 10 }),
  );
  await Promise.resolve();
  unchanged(1, abandon, pre, "known navigation abandonment");
  check(
    5,
    !abandon.service.canContinuePlanned("a", abandon.plan),
    "abandon cannot unlock",
  );
  collect("known-navigation", abandon, 2);
  const isolate = outcomeFixture();
  isolate.service.offerPlanned("a", isolate.plan);
  isolate.service.skipPlanned(
    "a",
    isolate.service.getOutcomeSnapshot("a").current!.attemptId,
  );
  check(
    10,
    isolate.service.getOutcomeSnapshot("b").recent.length === 0 &&
      isolate.service.getSnapshot("b").profile.sessionCount === 0,
    "scope isolated",
  );
  const manual = outcomeFixture("normal");
  manual.service.complete("a", "saved", completed("abc"), 0);
  const n = manual.service.getSnapshot("a").profile.sessionCount;
  manual.service.complete("a", "saved", completed("abc"), 0);
  check(
    12,
    manual.service.getSnapshot("a").profile.sessionCount === n &&
      manual.service.getOutcomeSnapshot("a").recent.length === 0,
    "unplanned Save replay independent",
  );
  const a = option(),
    b = option("p", { policyOrder: 1 }),
    input = {
      ...context([a, b]),
      recentOutcomes: [
        {
          activityKey: outcomeActivityKey(a),
          outcome: "skipped" as const,
          sequence: 1,
        },
      ],
    };
  const plan = planLearningSession(input);
  alternatePlansSelected += Number(plan.primaryAction.id === "p");
  check(
    14,
    JSON.stringify(plan) === JSON.stringify(planLearningSession(input)),
    "same outcomes deterministic",
  );
  for (const s of snapshots)
    check(
      13,
      s.recent.length <= 5 &&
        new TextEncoder().encode(serializeOutcomeState(s)).length <= 4096,
      "bounded retained sidecar",
    );
  const rows = snapshots.flatMap((s) => s.recent);
  return {
    engineeringScenarios: flows.length,
    flows,
    outcomesSimulated: rows.length,
    skips: rows.filter((o) => o.outcome === "skipped").length,
    cancels: rows.filter((o) => o.outcome === "cancelled").length,
    completions: rows.filter((o) => o.outcome === "completed").length,
    abandonmentCases: rows.filter((o) => o.outcome === "abandoned").length,
    duplicateOutcomesRejected,
    falseLearningEvidenceIngestions,
    falseAssessmentRollbacks,
    alternatePlansSelected,
    invalidPlans,
    invariants,
    invariantChecks: invariants.reduce((n, i) => n + i.checks, 0),
    violations: invariants.flatMap((i) => i.violations),
    humanParticipants: 0,
  };
}
export function outcomeBenchmark(contexts: readonly PlannerContext[]) {
  const plan = planLearningSession(contexts[0]),
    ref = activityReference(plan);
  let state = emptyOutcomeState(ref.learnerScope);
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    state = transitionOutcome(state, { type: "offer", activity: ref }).state;
    state = transitionOutcome(state, {
      type: "start",
      attemptId: state.current!.attemptId,
    }).state;
    state = transitionOutcome(state, {
      type: "completed",
      attemptId: state.current!.attemptId,
      completionReference: completionReference(`run${i}`),
    }).state;
  }
  const recordingsMs = performance.now() - start;
  // Use longest accepted compact fields and maximum safe sequence; no raw content.
  const maximal = {
    ...ref,
    activityType: "targeted-practice" as const,
    purpose: "targeted-improvement" as const,
    weaknessCategory: "substitution" as const,
    weaknessId: "weakness-" + "a".repeat(16),
    sourceReference: "source-" + "b".repeat(16),
  };
  let bounds = emptyOutcomeState(ref.learnerScope);
  bounds = { ...bounds, sequence: Number.MAX_SAFE_INTEGER - 6 };
  for (let i = 0; i < 5; i++) {
    bounds = transitionOutcome(bounds, {
      type: "offer",
      activity: maximal,
    }).state;
    bounds = transitionOutcome(bounds, {
      type: "start",
      attemptId: bounds.current!.attemptId,
    }).state;
    bounds = transitionOutcome(bounds, {
      type: "completed",
      attemptId: bounds.current!.attemptId,
      completionReference: completionReference("max"),
    }).state;
  }
  bounds = transitionOutcome(bounds, {
    type: "offer",
    activity: maximal,
  }).state;
  bounds = transitionOutcome(bounds, {
    type: "start",
    attemptId: bounds.current!.attemptId,
  }).state;
  bounds = transitionOutcome(bounds, {
    type: "bind-run",
    attemptId: bounds.current!.attemptId,
    runId: "r".repeat(128),
  }).state;
  const history = state.recent.map(({ activityKey, outcome, sequence }) => ({
    activityKey,
    outcome,
    sequence,
  }));
  const enriched = contexts.map((c) => ({ ...c, recentOutcomes: history }));
  for (const c of enriched) planLearningSession(c);
  const decisionStart = performance.now();
  let checksum = 0;
  for (let i = 0; i < 1000; i++)
    checksum += planLearningSession(enriched[i % enriched.length]).id.length;
  const decisionsMs = performance.now() - decisionStart;
  return {
    recordings: 1000,
    recordingsMs,
    averageRecordingMs: recordingsMs / 1000,
    decisions: 1000,
    decisionsMs,
    averageDecisionMs: decisionsMs / 1000,
    retainedRecords: bounds.recent.length,
    pendingRecords: 1,
    maxSerializedBytes: new TextEncoder().encode(serializeOutcomeState(bounds))
      .length,
    byteCap: OUTCOMES.maxBytes,
    checksum,
  };
}
