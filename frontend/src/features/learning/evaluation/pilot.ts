import { replayHistory } from "./runner";
import type { ScenarioResult } from "./types";
import { completionMilestone } from "../../pilot/observer";
import { createPilotRecorder, pilotEventId } from "../../pilot/recorder";
import {
  createPlannerContext,
  emptyPlannerHistory,
  planLearningSession,
} from "../planner";
/** Existing histories are replayed with capture OFF and a passive milestone sink.
 * No policy overrides, seeded outcomes, typing input or private profile export. */
export function evaluatePilotIsolation(results: readonly ScenarioResult[]) {
  const comparisons: {
    id: string;
    recommendations: boolean;
    mastery: boolean;
    progression: boolean;
    plannerActions: boolean;
    wholeReplay: boolean;
  }[] = [];
  let milestones = 0;
  for (const result of results) {
    const off = replayHistory(result.history),
      values = new Map<string, string>(),
      recorder = createPilotRecorder(
        {
          getItem: (k) => values.get(k) ?? null,
          setItem: (k, v) => {
            values.set(k, v);
          },
        },
        () => 0,
        true,
      );
    recorder.startParticipant("P99", {
      participation: true,
      notes: false,
      audio: false,
      video: false,
      screen: false,
    });
    recorder.startTask("T10");
    const on = replayHistory(result.history, (summary) => {
      if (recorder.record(completionMilestone(summary))) milestones++;
    });
    const equal = (a: unknown, b: unknown) =>
        JSON.stringify(a) === JSON.stringify(b),
      plan = (state: typeof off) =>
        planLearningSession(
          createPlannerContext(
            "anonymous-evaluation",
            state.profile,
            state.mastery,
            emptyPlannerHistory(state.profile.sessionCount),
          ),
        );
    comparisons.push({
      id: result.id,
      recommendations: equal(
        off.trace.map((t) => t.recommendations),
        on.trace.map((t) => t.recommendations),
      ),
      mastery: equal(off.mastery, on.mastery),
      progression: equal(
        off.trace.map((t) =>
          t.records.map((r) => [r.state, r.level, r.action]),
        ),
        on.trace.map((t) => t.records.map((r) => [r.state, r.level, r.action])),
      ),
      plannerActions: equal(plan(off), plan(on)),
      wholeReplay: equal(off, on),
    });
  }
  return {
    historiesCompared: comparisons.length,
    milestonesCaptured: milestones,
    differences: comparisons.filter(
      (x) =>
        !x.recommendations ||
        !x.mastery ||
        !x.progression ||
        !x.plannerActions ||
        !x.wholeReplay,
    ),
    comparisons,
    humanParticipants: 0,
    captureKind: "engineering-rehearsal",
  };
}
export function pilotBenchmark() {
  const values = new Map<string, string>(),
    storage = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
    },
    recorder = createPilotRecorder(storage, () => 0, true),
    consent = {
      participation: true,
      notes: false,
      audio: false,
      video: false,
      screen: false,
    };
  let bytes = 0;
  const start = performance.now();
  for (let n = 0; n < 1000; n++) {
    if (n % 100 === 0) {
      recorder.clear("P99");
      recorder.startParticipant("P99", consent);
      recorder.startTask("T01");
    }
    recorder.record({
      eventId: pilotEventId(`boundary:${n}`),
      eventType: "activity-completed",
      metrics: {
        mode: "fixed-text",
        correctWpm: 40,
        attemptAccuracy: 98,
        attempts: 160,
        errors: 3,
        correctedErrors: 2,
        completionReason: "correct-target",
      },
    });
    bytes = Math.max(bytes, new TextEncoder().encode(recorder.export()).length);
  }
  const elapsedMs = performance.now() - start;
  return {
    milestones: 1000,
    elapsedMs,
    averageMs: elapsedMs / 1000,
    observedExportBytes: bytes,
    measurement:
      "Milestone validation, dedupe, bounded JSON persistence to a memory storage adapter, and export inspection; no per-keystroke instrumentation or browser I/O timing.",
  };
}
