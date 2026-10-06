import { describe, it, expect } from "vitest";
import { createPassivePilotObserver, completionMilestone } from "./observer";
import { createLearningService } from "../learning/service";
import { createTypingSession } from "../typing/useTypingSession";
import { createTypingEngine } from "../../engine/typing";
import { completed } from "../learning/testFixtures";
import { installPilotFixture } from "./fixtures";
import {
  finishExercise,
  sourceAttribution,
} from "../learning/progression/testFixtures";
import { validateMilestone } from "./schema";
import type { Milestone } from "./types";
const epoch = "00000000-0000-4000-8000-000000000001";
function setup() {
  const values = new Map<string, string>(),
    storage = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
      removeItem: (k: string) => {
        values.delete(k);
      },
    };
  return { storage, service: createLearningService(storage, (j) => j()) };
}
describe("passive milestone observer", () => {
  it("observes planned offers/start/skip/cancel without changing learning state", () => {
    const f = setup(),
      scope = installPilotFixture(f.storage, "P01", epoch, "active", true),
      events: Milestone[] = [],
      observer = createPassivePilotObserver(f.service, scope, (e) =>
        events.push(e),
      ),
      plan = f.service.planSession(scope);
    const before = f.service.getSnapshot(scope);
    const offered = f.service.offerPlanned(scope, plan);
    if (!offered.ok) throw Error();
    expect(events.map((e) => e.eventType)).toEqual(["recommendation-shown"]);
    expect(f.service.getSnapshot(scope)).toBe(before);
    f.service.skipPlanned(scope, offered.attempt.attemptId);
    expect(events.at(-1)?.eventType).toBe("activity-skipped");
    const next = f.service.planSession(scope);
    f.service.startPlanned(scope, next);
    const attempt = f.service.getOutcomeSnapshot(scope).current!;
    f.service.cancelPlanned(scope, attempt.attemptId, {
      id: "aborted-run",
      status: "aborted",
    });
    expect(events.map((e) => e.eventType)).toContain("activity-cancelled");
    observer.dispose();
  });
  it("completion is observed once at accepted ingestion and contains only compact metrics", () => {
    const f = setup(),
      scope = installPilotFixture(
        f.storage,
        "P01",
        epoch,
        "assessment-eligible",
        true,
      ),
      events: Milestone[] = [],
      o = createPassivePilotObserver(f.service, scope, (e) => events.push(e)),
      plan = f.service.planSession(scope),
      run = f.service.startPlanned(scope, plan);
    if (!run.ok || !run.selection) throw Error();
    const a = f.service.getOutcomeSnapshot(scope).current!,
      e = run.selection.exercise;
    f.service.bindPlannedRun(scope, a.attemptId, "result1");
    const result = finishExercise(e);
    f.service.complete(
      scope,
      "result1",
      result,
      0,
      sourceAttribution(e, run.selection.assessmentCheckOrder),
    );
    f.service.complete(
      scope,
      "result1",
      result,
      0,
      sourceAttribution(e, run.selection.assessmentCheckOrder),
    );
    expect(
      events.filter((e) => e.eventType === "mastery-check-completed"),
    ).toHaveLength(1);
    expect(
      events.filter((e) => e.eventType === "mastery-check-started"),
    ).toHaveLength(1);
    expect(events.at(-1)?.metrics?.attempts).toBe(
      result.counts.totalInsertionAttempts,
    );
    expect(JSON.stringify(events)).not.toContain(e.text);
    o.dispose();
  });
  it("run observation is milestone-only: repeated keys emit one start; abort does not complete", () => {
    const f = setup(),
      events: Milestone[] = [],
      o = createPassivePilotObserver(f.service, "a", (e) => events.push(e));
    let clock = 0;
    const session = createTypingSession(
        { targetText: "abcdefg" },
        () => ++clock,
      ),
      off = o.observeSession(session);
    for (const c of "abcdef") session.insertText(c);
    expect(
      events.filter((e) => e.eventType === "activity-started"),
    ).toHaveLength(1);
    session.abort();
    expect(events.map((e) => e.eventType)).toEqual([
      "activity-started",
      "activity-cancelled",
    ]);
    off();
    o.dispose();
  });
  it("StrictMode-like subscription replay dedupes lifecycle milestones", () => {
    const f = setup(),
      events: Milestone[] = [],
      o = createPassivePilotObserver(f.service, "a", (e) => events.push(e)),
      session = createTypingSession({ targetText: "abc" }, () => 0);
    let off = o.observeSession(session);
    session.insertText("a");
    off();
    off = o.observeSession(session);
    expect(events).toHaveLength(1);
    off();
    o.dispose();
  });
  it("observer attachment and failed sinks cannot mutate or interrupt learning", () => {
    const off = setup(),
      on = setup();
    const o = createPassivePilotObserver(on.service, "a", () => {
      throw Error("capture blocked");
    });
    for (let i = 0; i < 5; i++) {
      off.service.complete("a", `run${i}`, completed("abc"), 0);
      on.service.complete("a", `run${i}`, completed("abc"), 0);
    }
    expect(on.service.getSnapshot("a")).toEqual(off.service.getSnapshot("a"));
    expect(on.service.planSession("a")).toEqual(off.service.planSession("a"));
    o.dispose();
  });
  it("raw/private source identity is hashed and typed buffer/mistakes/timestamp are excluded", () => {
    const f = setup();
    const engine = createTypingEngine({
      targetText: "abc",
      sourceIdentity: {
        type: "custom",
        id: "PRIVATE passage label",
        version: "private-version",
      },
    });
    engine.dispatch({ type: "INSERT_TEXT", text: "a", atMs: 0 });
    engine.dispatch({ type: "INSERT_TEXT", text: "bc", atMs: 2000 });
    f.service.complete("a", "run", engine.getResult(), 0);
    const event = completionMilestone(
      f.service.getSnapshot("a").profile.recent[0],
    );
    expect(validateMilestone(event)).toEqual(event);
    const text = JSON.stringify(event);
    for (const secret of [
      "PRIVATE",
      "private-version",
      "typedUnits",
      "mistakes",
      "recordedAt",
    ])
      expect(text).not.toContain(secret);
  });
});
