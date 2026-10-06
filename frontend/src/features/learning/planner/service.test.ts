import { describe, it, expect, vi } from "vitest";
import { createLearningService } from "../service";
import { createTypingEngine } from "../../../engine/typing";
import { completed, evidence, profileOf } from "../testFixtures";
import { saveProfile, profileStorageKey } from "../storage";
import { emptyMastery } from "../transfer/progression";
import { saveMastery, masteryStorageKey } from "../transfer/storage";
import { finishExercise, sourceAttribution } from "../progression/testFixtures";
import { plannerHistoryKey } from "./history";
function setup() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const service = createLearningService(storage, (job) => job());
  return { values, storage, service };
}
function seed(storage: ReturnType<typeof setup>["storage"], scope = "a") {
  const profile = profileOf(
    evidence("r".repeat(40), [0, 1, 2, 3], "seed1", "t"),
    evidence("r".repeat(40), [0, 1, 2, 3], "seed2", "t"),
  );
  saveProfile(storage, scope, profile);
  saveMastery(storage, scope, emptyMastery(2));
}
describe("planner start and persistence boundaries", () => {
  it("rendering plans has no writes or cursor reservations", () => {
    const { storage, service } = setup();
    seed(storage);
    const writes = vi.spyOn(storage, "setItem");
    const before = service.getSnapshot("a"),
      plan = service.planSession("a");
    expect(plan.purpose).toBe("targeted-improvement");
    expect(service.planSession("a")).toEqual(plan);
    expect(service.getSnapshot("a")).toBe(before);
    expect(writes).not.toHaveBeenCalled();
  });
  it("starts the exact preflight witness, then reserves one ordinal", () => {
    const { storage, service } = setup();
    seed(storage);
    const plan = service.planSession("a"),
      start = service.startPlanned("a", plan);
    expect(start.ok).toBe(true);
    if (
      !start.ok ||
      !start.selection ||
      plan.primaryAction.target.type !== "adaptive"
    )
      throw Error();
    expect(start.selection.exercise.source.id).toBe(
      plan.primaryAction.target.sourceId,
    );
    expect(start.selection.exercise.source.version).toBe(
      plan.primaryAction.target.sourceVersion,
    );
    expect(start.selection.exercise.generatedFrom.composition?.ordinal).toBe(
      plan.primaryAction.target.ordinal,
    );
    expect(service.getPlannerHistory("a").recent).toHaveLength(0);
    expect(service.startPlanned("a", plan).ok).toBe(false);
  });
  it("rejects plans from another scope or modified compact actions before reservation", () => {
    const { storage, service } = setup();
    seed(storage);
    const plan = service.planSession("a"),
      before = JSON.stringify(service.getSnapshot("a"));
    expect(service.startPlanned("b", plan).ok).toBe(false);
    expect(
      service.startPlanned("a", {
        ...plan,
        primaryAction: { ...plan.primaryAction, explanation: "tampered" },
      }).ok,
    ).toBe(false);
    expect(JSON.stringify(service.getSnapshot("a"))).toBe(before);
  });
  it("rejects old evidence after another service completes a session", () => {
    const { storage, service } = setup();
    seed(storage);
    const plan = service.planSession("a");
    const other = createLearningService(storage, (job) => job());
    other.complete("a", "external", completed("abc"), 0);
    expect(service.startPlanned("a", plan).ok).toBe(false);
    expect(service.getSnapshot("a").mastery.variants).toHaveLength(0);
    expect(service.getPlannerHistory("a").order).toBe(3);
  });
  it("requires successful primary completion before the optional secondary and consumes it once", () => {
    const { storage, service } = setup();
    seed(storage);
    const plan = service.planSession("a");
    expect(plan.optionalSecondaryAction).not.toBeNull();
    expect(service.startPlanned("a", plan, "secondary").ok).toBe(false);
    const start = service.startPlanned("a", plan);
    if (!start.ok || !start.selection) throw Error();
    expect(service.startPlanned("a", plan, "secondary").ok).toBe(false);
    const e = start.selection.exercise;
    service.complete(
      "a",
      "primary",
      finishExercise(e),
      0,
      sourceAttribution(e, start.selection.assessmentCheckOrder),
    );
    expect(service.startPlanned("a", plan, "secondary")).toEqual({
      ok: true,
      selection: null,
    });
    expect(service.startPlanned("a", plan, "secondary").ok).toBe(false);
  });
  it("cannot use an unrelated completion to unlock the optional activity", () => {
    const { storage, service } = setup();
    seed(storage);
    const plan = service.planSession("a");
    service.startPlanned("a", plan);
    service.complete("a", "unrelated", completed("abc"), 0);
    expect(service.startPlanned("a", plan, "secondary").ok).toBe(false);
  });
  it("allows the normal fallback without reserving generated content", () => {
    const { service } = setup();
    const plan = service.planSession("new");
    expect(service.startPlanned("new", plan)).toEqual({
      ok: true,
      selection: null,
    });
    expect(service.getSnapshot("new").mastery.variants).toHaveLength(0);
  });
  it("persists completion history separately, survives reload and dedupes", () => {
    const { storage, values, service } = setup();
    for (let i = 0; i < 4; i++)
      service.complete("a", `s${i}`, completed("abc"), i);
    const history = service.getPlannerHistory("a");
    expect(history.recent).toHaveLength(3);
    const reloaded = createLearningService(storage, (job) => job());
    expect(reloaded.getPlannerHistory("a")).toEqual(history);
    expect(reloaded.planSession("a")).toEqual(service.planSession("a"));
    reloaded.complete("a", "s3", completed("abc"), 99);
    expect(reloaded.getPlannerHistory("a")).toEqual(history);
    expect(JSON.parse(values.get(profileStorageKey("a"))!).version).toBe(1);
    expect(JSON.parse(values.get(masteryStorageKey("a"))!).version).toBe(2);
    expect(JSON.parse(values.get(plannerHistoryKey("a"))!).version).toBe(1);
  });
  it("isolates learner history and plan metadata", () => {
    const { storage, service } = setup();
    seed(storage, "a");
    const b = service.planSession("b");
    service.complete("a", "a1", completed("abc"), 0);
    expect(service.planSession("b")).toEqual(b);
    expect(service.getPlannerHistory("b").recent).toHaveLength(0);
    expect(service.getSnapshot("b").profile.sessionCount).toBe(0);
  });
  it("old profiles without planner data retain identical evidence and mastery", () => {
    const { values, storage, service } = setup();
    seed(storage);
    values.set(plannerHistoryKey("a"), "corrupt");
    const before = [
      values.get(profileStorageKey("a")),
      values.get(masteryStorageKey("a")),
    ];
    service.planSession("a");
    expect(service.getPlannerHistory("a").recent).toHaveLength(0);
    expect([
      values.get(profileStorageKey("a")),
      values.get(masteryStorageKey("a")),
    ]).toEqual(before);
  });
  it("retains visit-local history if all storage is blocked", () => {
    const service = createLearningService(
      {
        getItem: () => {
          throw Error();
        },
        setItem: () => {
          throw Error();
        },
      },
      (job) => job(),
    );
    service.complete("a", "s", completed("abc"), 0);
    service.complete("a", "s", completed("abc"), 1);
    expect(service.getPlannerHistory("a").order).toBe(1);
    expect(service.getPlannerHistory("a").recent).toHaveLength(1);
    expect(service.getSnapshot("a").persisted).toBe(false);
    expect(service.planSession("a").createdFromEvidenceVersion.sessions).toBe(
      1,
    );
  });
  it("a failed sidecar write preserves successfully saved learning evidence", () => {
    const { values, storage } = setup();
    const partial = {
      ...storage,
      setItem: (key: string, value: string) => {
        if (key.startsWith("typing-learning-planner:"))
          throw Error("sidecar blocked");
        storage.setItem(key, value);
      },
    };
    const service = createLearningService(partial, (job) => job());
    service.complete("a", "s", completed("abc"), 0);
    expect(service.getSnapshot("a").persisted).toBe(true);
    expect(service.getPlannerHistory("a").order).toBe(1);
    expect(values.has(plannerHistoryKey("a"))).toBe(false);
    const reloaded = createLearningService(storage, (job) => job());
    expect(reloaded.getSnapshot("a").profile).toEqual(
      service.getSnapshot("a").profile,
    );
    expect(reloaded.getSnapshot("a").mastery).toEqual(
      service.getSnapshot("a").mastery,
    );
    expect(reloaded.getPlannerHistory("a")).toEqual({
      version: 1,
      order: 1,
      recent: [],
    });
  });
  it("aborted sessions, starts, restart metadata and Save duplicates cannot enter history", () => {
    const { service } = setup();
    const result = completed("abc");
    const engine = createTypingEngine({ targetText: "abc" });
    engine.dispatch({ type: "INSERT_TEXT", text: "a", atMs: 0 });
    engine.dispatch({ type: "ABORT", atMs: 1 });
    service.complete("a", "abort", engine.getResult(), 0);
    expect(service.getPlannerHistory("a").order).toBe(0);
    service.complete("a", "s", result, 0);
    service.complete("a", "s", result, 1);
    expect(service.getPlannerHistory("a").order).toBe(1);
  });
});
