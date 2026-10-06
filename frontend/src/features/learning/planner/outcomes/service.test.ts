import { describe, it, expect, vi } from "vitest";
import { outcomeFixture } from "./testFixtures";
import { createLearningService } from "../../service";
import { completed } from "../../testFixtures";
import { targetPositions } from "../../progression/testFixtures";
import { outcomeStorageKey } from "./storage";
import { planDisposition } from "./lifecycle";
const learning = (f: ReturnType<typeof outcomeFixture>) => ({
  profile: f.service.getSnapshot(f.scope).profile,
  records: f.service.getSnapshot(f.scope).mastery.records,
});
describe("accepted completion versus planner preferences", () => {
  it.each(["targeted", "contextual", "check", "normal"] as const)(
    "skip %s neither ingests nor reserves nor rolls back",
    (kind) => {
      const f = outcomeFixture(kind),
        before = f.service.getSnapshot("a");
      const o = f.service.offerPlanned("a", f.plan);
      expect(o.ok).toBe(true);
      if (!o.ok) throw Error();
      expect(f.service.skipPlanned("a", o.attempt.attemptId).changed).toBe(
        true,
      );
      expect(f.service.getSnapshot("a")).toBe(before);
      expect(f.service.skipPlanned("a", o.attempt.attemptId).code).toBe(
        "duplicate",
      );
      expect(f.service.canContinuePlanned("a", f.plan)).toBe(false);
    },
  );
  it.each(["targeted", "contextual", "check", "normal"] as const)(
    "cancel %s after partial input requires engine ABORT and preserves learning",
    (kind) => {
      const f = outcomeFixture(kind),
        run = f.start(),
        before = learning(f);
      run.engine.dispatch({ type: "INSERT_TEXT", text: "x", atMs: 0 });
      expect(
        f.service.cancelPlanned("a", run.attempt.attemptId, {
          id: "run1",
          status: "running",
        }).changed,
      ).toBe(false);
      run.engine.dispatch({ type: "ABORT", atMs: 10 });
      expect(run.engine.getSnapshot().status).toBe("aborted");
      f.service.complete("a", "run1", run.engine.getResult(), 0);
      expect(
        f.service.cancelPlanned("a", run.attempt.attemptId, {
          id: "run1",
          status: "aborted",
        }).changed,
      ).toBe(true);
      expect(learning(f)).toEqual(before);
      expect(
        f.service.cancelPlanned("a", run.attempt.attemptId, {
          id: "run1",
          status: "aborted",
        }).code,
      ).toBe("duplicate");
      expect(f.service.canContinuePlanned("a", f.plan)).toBe(false);
    },
  );
  it("a repeated ordinary start cannot reuse an active attempt", () => {
    const f = outcomeFixture("normal");
    f.start();
    const state = f.service.getOutcomeSnapshot("a");
    expect(f.service.startPlanned("a", f.plan).ok).toBe(false);
    expect(f.service.getOutcomeSnapshot("a")).toBe(state);
  });
  it("an unrelated run completion cannot satisfy a bound attempt", () => {
    const f = outcomeFixture(),
      r = f.start(),
      e = r.selected.selection!.exercise;
    f.service.complete(
      "a",
      "other-run",
      requireFixtures.finishExercise(e),
      0,
      requireFixtures.sourceAttribution(e),
    );
    expect(f.service.getOutcomeSnapshot("a").recent).toEqual([]);
    expect(f.service.canContinuePlanned("a", f.plan)).toBe(false);
  });
  it("deferred accepted completion survives immediate restart binding and unmount", async () => {
    const f = outcomeFixture(),
      jobs: (() => void)[] = [],
      service = createLearningService(f.storage, (j) => jobs.push(j)),
      plan = service.planSession("a"),
      start = service.startPlanned("a", plan);
    if (!start.ok || !start.selection) throw Error();
    const a = service.getOutcomeSnapshot("a").current!,
      e = start.selection.exercise;
    service.bindPlannedRun("a", a.attemptId, "old");
    service.complete(
      "a",
      "old",
      requireFixtures.finishExercise(e),
      0,
      requireFixtures.sourceAttribution(e),
    );
    service.bindPlannedRun("a", a.attemptId, "new");
    const token = service.attachPlanned("a", a.attemptId),
      abort = vi.fn();
    service.releasePlanned("a", a.attemptId, token, false, abort);
    await Promise.resolve();
    expect(abort).not.toHaveBeenCalled();
    jobs.shift()!();
    expect(
      service.getOutcomeSnapshot("a").recent.map((o) => o.outcome),
    ).toEqual(["completed"]);
    expect(service.getSnapshot("a").profile.sessionCount).toBe(3);
  });
  it("repeated completed good checks still achieve existing controlled mastery", () => {
    const f = outcomeFixture("check");
    for (let i = 0; i < 4; i++) {
      const p = f.service.planSession("a"),
        r = f.service.startPlanned("a", p);
      if (!r.ok || !r.selection) throw Error();
      const a = f.service.getOutcomeSnapshot("a").current!,
        e = r.selection.exercise;
      f.service.bindPlannedRun("a", a.attemptId, `good${i}`);
      f.service.complete(
        "a",
        `good${i}`,
        requireFixtures.finishExercise(e),
        0,
        requireFixtures.sourceAttribution(e, r.selection.assessmentCheckOrder),
      );
    }
    const r = f.service
      .getSnapshot("a")
      .mastery.records.find(
        (r) => r.identity.items[0] === "r" && r.identity.kind === "grapheme",
      )!;
    expect(r.state).toBe("PROVISIONAL_MASTERY");
    expect(r.masteryVia).toBe("controlled");
    expect(f.service.getOutcomeSnapshot("a").recent).toHaveLength(4);
  });
  it("cancel before any input records no evidence and rejects wrong run reference", () => {
    const f = outcomeFixture(),
      run = f.start(),
      n = f.service.getSnapshot("a").profile.sessionCount;
    run.engine.dispatch({ type: "ABORT", atMs: 0 });
    expect(
      f.service.cancelPlanned("a", run.attempt.attemptId, {
        id: "wrong",
        status: "aborted",
      }).changed,
    ).toBe(false);
    expect(
      f.service.cancelPlanned("a", run.attempt.attemptId, {
        id: "run1",
        status: "aborted",
      }).changed,
    ).toBe(true);
    expect(f.service.getSnapshot("a").profile.sessionCount).toBe(n);
  });
  it("new start after cancel reserves next ordinal; render and restart binding do not", () => {
    const f = outcomeFixture(),
      r = f.start();
    const variants = f.service.getSnapshot("a").mastery.variants;
    f.service.bindPlannedRun("a", r.attempt.attemptId, "restarted");
    expect(f.service.getSnapshot("a").mastery.variants).toBe(variants);
    f.service.cancelPlanned("a", r.attempt.attemptId, {
      id: "restarted",
      status: "aborted",
    });
    const next = f.service.planSession("a");
    expect(next.primaryAction.target.type).toBe("adaptive");
    if (next.primaryAction.target.type !== "adaptive") throw Error();
    expect(next.primaryAction.target.ordinal).toBe(1);
    for (let i = 0; i < 10; i++) f.service.planSession("a");
    expect(f.service.getSnapshot("a").mastery.variants).toBe(variants);
    expect(f.service.startPlanned("a", next).ok).toBe(true);
    expect(f.service.getSnapshot("a").mastery.variants?.[0].nextOrdinal).toBe(
      2,
    );
  });
  it("accepted primary completion records once and gates secondary", () => {
    const f = outcomeFixture();
    expect(f.service.canContinuePlanned("a", f.plan)).toBe(false);
    f.complete();
    expect(f.service.getSnapshot("a").profile.sessionCount).toBe(3);
    expect(
      f.service.getOutcomeSnapshot("a").recent.map((o) => o.outcome),
    ).toEqual(["completed"]);
    expect(f.service.canContinuePlanned("a", f.plan)).toBe(true);
    const s = f.service.getOutcomeSnapshot("a");
    f.service.complete("a", "run1", completed("abc"), 0);
    expect(f.service.getOutcomeSnapshot("a")).toBe(s);
    expect(f.service.getSnapshot("a").profile.sessionCount).toBe(3);
  });
  it.each(["skipped", "cancelled", "completed"] as const)(
    "secondary %s ends locally and only completion adds ordinary evidence",
    (outcome) => {
      const f = outcomeFixture();
      f.complete();
      const before = learning(f),
        n = f.service.getSnapshot("a").profile.sessionCount;
      const o = f.service.offerPlanned("a", f.plan, "secondary");
      if (!o.ok) throw Error();
      if (outcome === "skipped")
        f.service.skipPlanned("a", o.attempt.attemptId);
      else {
        expect(f.service.startPlanned("a", f.plan, "secondary").ok).toBe(true);
        f.service.bindPlannedRun("a", o.attempt.attemptId, "secondary");
        if (outcome === "cancelled")
          f.service.cancelPlanned("a", o.attempt.attemptId, {
            id: "secondary",
            status: "aborted",
          });
        else {
          f.service.complete("a", "secondary", completed("abc"), 0);
          f.service.complete("a", "secondary", completed("abc"), 0);
        }
      }
      expect(f.service.getSnapshot("a").profile.sessionCount).toBe(
        n + (outcome === "completed" ? 1 : 0),
      );
      if (outcome !== "completed") expect(learning(f)).toEqual(before);
      expect(f.service.canContinuePlanned("a", f.plan)).toBe(false);
      expect(
        planDisposition(f.plan.id, true, f.service.getOutcomeSnapshot("a")),
      ).toBe("completed");
      expect(f.service.getOutcomeSnapshot("a").recent.at(-1)?.outcome).toBe(
        outcome,
      );
    },
  );
  it("completed good check retains existing transfer qualification", () => {
    const f = outcomeFixture("check");
    expect(f.plan.purpose).toBe("transfer-check");
    f.complete();
    const r = f.service
      .getSnapshot("a")
      .mastery.records.find((r) => r.identity.items[0] === "r")!;
    expect(r.state).toBe("TRANSFER_CHECK");
    expect(r.assessments).toHaveLength(1);
    expect(r.assessmentFailure).toBeNull();
    expect(f.service.getOutcomeSnapshot("a").recent[0].outcome).toBe(
      "completed",
    );
  });
  it("completed severe check still rolls back; cancel is not the failing path", () => {
    const f = outcomeFixture("check");
    const probe = f.service.planSession("a");
    expect(probe.purpose).toBe("transfer-check");
    const start = f.service.startPlanned("a", probe);
    if (!start.ok || !start.selection) throw Error();
    const attempt = f.service.getOutcomeSnapshot("a").current!;
    f.service.bindPlannedRun("a", attempt.attemptId, "bad");
    const { finishExercise, sourceAttribution } = requireFixtures;
    const e = start.selection.exercise;
    f.service.complete(
      "a",
      "bad",
      finishExercise(e, targetPositions(e)),
      0,
      sourceAttribution(e, start.selection.assessmentCheckOrder),
    );
    const r = f.service
      .getSnapshot("a")
      .mastery.records.find((r) => r.identity.items[0] === "r")!;
    expect(r.assessmentFailure).toBe("severe");
    expect(r.state).toBe("ACTIVE");
    expect(f.service.getOutcomeSnapshot("a").recent[0].outcome).toBe(
      "completed",
    );
  });
  it.each(["offered", "started"] as const)(
    "reload %s loses unfinished intention without fake terminal event",
    (stage) => {
      const f = outcomeFixture();
      if (stage === "started") f.start();
      else f.service.offerPlanned("a", f.plan);
      const n = f.service.getSnapshot("a").profile.sessionCount;
      const reload = createLearningService(f.storage, (j) => j());
      expect(reload.getOutcomeSnapshot("a").current).toBeNull();
      expect(reload.getOutcomeSnapshot("a").recent).toEqual([]);
      expect(reload.getSnapshot("a").profile.sessionCount).toBe(n);
      expect(reload.planSession("a").primaryAction.executable).toBe(true);
    },
  );
  it("reload reconciles only already accepted completion, with no second ingestion", () => {
    const f = outcomeFixture(),
      r = f.start(),
      pending = f.values.get(outcomeStorageKey("a"))!;
    const e = r.selected.selection!.exercise;
    f.service.complete(
      "a",
      "run1",
      requireFixtures.finishExercise(e),
      0,
      requireFixtures.sourceAttribution(e),
    );
    f.values.set(outcomeStorageKey("a"), pending);
    const reload = createLearningService(f.storage, (j) => j());
    expect(reload.getSnapshot("a").profile.sessionCount).toBe(3);
    expect(reload.getOutcomeSnapshot("a").recent[0].outcome).toBe("completed");
  });
  it("stale rejection is system invalidation, never skip/cancel", () => {
    const f = outcomeFixture();
    f.service.offerPlanned("a", f.plan);
    createLearningService(f.storage, (j) => j()).complete(
      "a",
      "external",
      completed("abc"),
      0,
    );
    expect(f.service.startPlanned("a", f.plan).ok).toBe(false);
    expect(f.service.getOutcomeSnapshot("a").recent).toEqual([]);
    expect(f.service.getOutcomeSnapshot("a").current).toBeNull();
  });
  it("sequential external skip invalidates an old plan conservatively", () => {
    const f = outcomeFixture("check");
    f.service.offerPlanned("a", f.plan);
    const other = createLearningService(f.storage, (j) => j());
    const o = other.offerPlanned("a", other.planSession("a"));
    if (!o.ok) throw Error();
    other.skipPlanned("a", o.attempt.attemptId);
    expect(f.service.startPlanned("a", f.plan).ok).toBe(false);
    expect(
      f.service.getOutcomeSnapshot("a").recent.map((o) => o.outcome),
    ).toEqual(["skipped"]);
  });
  it("known navigation abandonment aborts once, while StrictMode lease replay does not", async () => {
    const f = outcomeFixture(),
      r = f.start(),
      abort = vi.fn(),
      token = f.service.attachPlanned("a", r.attempt.attemptId),
      before = learning(f);
    f.service.releasePlanned("a", r.attempt.attemptId, token, false, abort);
    const next = f.service.attachPlanned("a", r.attempt.attemptId);
    await Promise.resolve();
    expect(abort).not.toHaveBeenCalled();
    f.service.releasePlanned("a", r.attempt.attemptId, next, false, abort);
    await Promise.resolve();
    expect(abort).toHaveBeenCalledTimes(1);
    expect(f.service.getOutcomeSnapshot("a").recent[0].outcome).toBe(
      "abandoned",
    );
    expect(learning(f)).toEqual(before);
    expect(f.service.canContinuePlanned("a", f.plan)).toBe(false);
  });
  it("independent outcome write failure preserves saved learning and visit-local dedupe", () => {
    const f = outcomeFixture("normal"),
      service = createLearningService(
        {
          ...f.storage,
          setItem: (k, v) => {
            if (k.startsWith("typing-learning-outcomes:")) throw Error();
            f.storage.setItem(k, v);
          },
        },
        (j) => j(),
      ),
      plan = service.planSession("a");
    service.startPlanned("a", plan);
    const a = service.getOutcomeSnapshot("a").current!;
    service.bindPlannedRun("a", a.attemptId, "r");
    service.complete("a", "r", completed("abc"), 0);
    expect(service.getSnapshot("a").persisted).toBe(true);
    expect(service.getOutcomeSnapshot("a").recent[0].outcome).toBe("completed");
    expect(service.getSnapshot("a").profile.sessionCount).toBe(1);
  });
  it("learner separation and unplanned timed/word/Test Save do not complete pending offers", () => {
    const f = outcomeFixture();
    f.service.offerPlanned("a", f.plan);
    f.service.complete("b", "b1", completed("abc"), 0);
    expect(f.service.getOutcomeSnapshot("a").recent).toEqual([]);
    expect(f.service.getOutcomeSnapshot("b").recent).toEqual([]);
    expect(f.service.getSnapshot("a").profile.sessionCount).toBe(2);
  });
});
import * as requireFixtures from "../../progression/testFixtures";
