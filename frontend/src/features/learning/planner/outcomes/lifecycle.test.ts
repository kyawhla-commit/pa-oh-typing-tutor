import { describe, it, expect } from "vitest";
import { planLearningSession } from "../planner";
import { context, option } from "../scenarioFixtures";
import {
  activityReference,
  completionReference,
  outcomeScope,
} from "./identity";
import {
  emptyOutcomeState,
  transitionOutcome,
  planDisposition,
  OUTCOMES,
} from "./lifecycle";
import type { OutcomeEvent, TerminalOutcome } from "./types";
const plan = planLearningSession(context([option()])),
  ref = activityReference(plan);
function offered() {
  return transitionOutcome(emptyOutcomeState(ref.learnerScope), {
    type: "offer",
    activity: ref,
  }).state;
}
function started() {
  const s = offered();
  return transitionOutcome(s, {
    type: "start",
    attemptId: s.current!.attemptId,
  }).state;
}
describe("explicit planner lifecycle", () => {
  it("offers immutable compact references, without retaining excess private fields", () => {
    const s = transitionOutcome(emptyOutcomeState(ref.learnerScope), {
      type: "offer",
      activity: { ...ref, privateText: "SECRET" } as typeof ref,
    }).state;
    expect(s.current?.lifecycle).toBe("offered");
    expect(s.sequence).toBe(1);
    expect(JSON.stringify(s)).not.toContain("SECRET");
    expect(Object.isFrozen(s.current)).toBe(true);
  });
  it("starts once; binding and restarting retain attempt and sequence", () => {
    const s = started(),
      id = s.current!.attemptId;
    expect(transitionOutcome(s, { type: "start", attemptId: id }).code).toBe(
      "duplicate",
    );
    const a = transitionOutcome(s, {
        type: "bind-run",
        attemptId: id,
        runId: "run1",
      }).state,
      b = transitionOutcome(a, {
        type: "bind-run",
        attemptId: id,
        runId: "run2",
      }).state;
    expect(b.sequence).toBe(1);
    expect(b.current?.attemptId).toBe(id);
    expect(b.current?.runId).toBe("run2");
  });
  it.each(["completed", "cancelled", "abandoned"] as const)(
    "%s requires started and records once",
    (outcome) => {
      const o = offered(),
        id = o.current!.attemptId,
        event: OutcomeEvent = {
          type: outcome,
          attemptId: id,
          completionReference: completionReference("run"),
        };
      expect(transitionOutcome(o, event).code).toBe("invalid-transition");
      const s = started(),
        t = transitionOutcome(s, event);
      expect(t.state.recent[0].outcome).toBe(outcome);
      expect(t.state.current).toBeNull();
      expect(transitionOutcome(t.state, event).state).toBe(t.state);
      expect(transitionOutcome(t.state, event).code).toBe("duplicate");
    },
  );
  it("skip requires offered and cannot cancel a not-yet-started activity", () => {
    const s = offered(),
      id = s.current!.attemptId;
    expect(
      transitionOutcome(s, { type: "cancelled", attemptId: id }).changed,
    ).toBe(false);
    const t = transitionOutcome(s, { type: "skipped", attemptId: id });
    expect(t.state.recent[0].outcome).toBe("skipped");
    expect(
      transitionOutcome(started(), { type: "skipped", attemptId: id }).changed,
    ).toBe(false);
    expect(
      transitionOutcome(t.state, { type: "skipped", attemptId: id }).code,
    ).toBe("duplicate");
  });
  it("completion needs a qualifying reference, and arbitrary runs cannot contain email", () => {
    const s = started(),
      id = s.current!.attemptId;
    expect(
      transitionOutcome(s, { type: "completed", attemptId: id }).changed,
    ).toBe(false);
    expect(
      transitionOutcome(s, {
        type: "bind-run",
        attemptId: id,
        runId: "person@example.com",
      }).changed,
    ).toBe(false);
  });
  it("supersedes an offer without terminal outcome and rejects replacement of a started activity", () => {
    const s = offered(),
      id = s.current!.attemptId;
    expect(
      transitionOutcome(s, { type: "supersede", attemptId: id }).state.recent,
    ).toEqual([]);
    expect(
      transitionOutcome(started(), {
        type: "offer",
        activity: { ...ref, planId: "another" },
      }).changed,
    ).toBe(false);
  });
  it("cross-scope attempts and unsafe sequence do not mutate state", () => {
    expect(
      transitionOutcome(emptyOutcomeState(outcomeScope("b")), {
        type: "offer",
        activity: ref,
      }).changed,
    ).toBe(false);
    expect(
      transitionOutcome(
        { ...offered(), sequence: Number.MAX_SAFE_INTEGER },
        { type: "offer", activity: ref },
      ).changed,
    ).toBe(false);
  });
  it("evicts FIFO at five, retaining monotonic identities and rejecting old replay", () => {
    let s = emptyOutcomeState(ref.learnerScope);
    let old = "";
    for (let i = 0; i < 20; i++) {
      s = transitionOutcome(s, { type: "offer", activity: ref }).state;
      old ||= s.current!.attemptId;
      s = transitionOutcome(s, {
        type: "skipped",
        attemptId: s.current!.attemptId,
      }).state;
    }
    expect(s.recent).toHaveLength(OUTCOMES.maxRecent);
    expect(s.recent.map((o) => o.sequence)).toEqual([16, 17, 18, 19, 20]);
    expect(
      transitionOutcome(s, { type: "skipped", attemptId: old }).changed,
    ).toBe(false);
  });
  it.each([
    "skipped",
    "cancelled",
    "abandoned",
    "completed",
  ] as TerminalOutcome[])(
    "derives %s plan disposition without educational reinterpretation",
    (outcome) => {
      let s = outcome === "skipped" ? offered() : started();
      s = transitionOutcome(s, {
        type: outcome,
        attemptId: s.current!.attemptId,
        completionReference: completionReference("x"),
      }).state;
      expect(planDisposition(plan.id, true, s)).toBe(
        outcome === "skipped"
          ? "declined"
          : outcome === "completed"
            ? "primary-completed"
            : outcome,
      );
      expect(planDisposition("old", false, s)).toBe("superseded");
    },
  );
});
