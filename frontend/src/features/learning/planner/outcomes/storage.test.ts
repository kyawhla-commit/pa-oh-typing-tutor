import { describe, it, expect } from "vitest";
import { outcomeFixture } from "./testFixtures";
import {
  parseOutcomeState,
  serializeOutcomeState,
  outcomeStorageKey,
  loadOutcomeState,
  saveOutcomeState,
} from "./storage";
import { OUTCOMES } from "./lifecycle";
import { plannerHistoryKey } from "../history";
import { completed } from "../../testFixtures";
import { createLearningService } from "../../service";
describe("outcome companion storage", () => {
  it("roundtrips whitelisted refs while excluding email, raw content, metrics and buffers", () => {
    const f = outcomeFixture("targeted", "user:private@example.com");
    f.complete();
    const state = f.service.getOutcomeSnapshot(f.scope),
      text = serializeOutcomeState(state);
    expect(parseOutcomeState(text, f.scope)).toEqual(state);
    for (const secret of [
      "private@example.com",
      "rrrr",
      "typedBuffer",
      "mistakeLedger",
      "totalAttempts",
    ])
      expect(text).not.toContain(secret);
    expect(outcomeStorageKey(f.scope)).not.toContain("@");
    expect(Object.isFrozen(parseOutcomeState(text, f.scope).recent)).toBe(true);
  });
  it.each(["bad json", "null", "[]", '{"version":99}', "x".repeat(4097)])(
    "corrupt/unknown/oversized input safely falls back: %s",
    (text) => {
      expect(parseOutcomeState(text, "a").sequence).toBe(0);
    },
  );
  it("drops unknown extra properties rather than retaining private fields", () => {
    const f = outcomeFixture();
    f.complete();
    const state = f.service.getOutcomeSnapshot("a");
    expect(
      parseOutcomeState(
        JSON.stringify({
          ...state,
          email: "SECRET",
          recent: state.recent.map((o) => ({ ...o, rawText: "SECRET" })),
        }),
        "a",
      ),
    ).toEqual(state);
  });
  it.each([
    "scope",
    "sequence",
    "count",
    "order",
    "identity",
    "completion",
    "category",
    "current",
  ])("rejects invalid %s", (kind) => {
    const f = outcomeFixture();
    f.complete();
    const value = JSON.parse(
      serializeOutcomeState(f.service.getOutcomeSnapshot("a")),
    );
    if (kind === "scope") value.learnerScope = "foreign";
    if (kind === "sequence") value.sequence = -1;
    if (kind === "count") value.recent = Array(6).fill(value.recent[0]);
    if (kind === "order") value.recent = [value.recent[0], value.recent[0]];
    if (kind === "identity") value.recent[0].attemptId = "fake";
    if (kind === "completion") value.recent[0].completionReference = null;
    if (kind === "category") value.recent[0].weaknessCategory = "private text";
    if (kind === "current")
      value.current = {
        ...value.recent[0],
        lifecycle: "offered",
        runId: "email@example.com",
      };
    expect(parseOutcomeState(JSON.stringify(value), "a").sequence).toBe(0);
  });
  it("bounds five maximal completed rows plus one pending attempt below 4 KiB", () => {
    const f = outcomeFixture("normal");
    for (let i = 0; i < 10; i++) {
      const p = f.service.planSession("a");
      f.service.startPlanned("a", p);
      const a = f.service.getOutcomeSnapshot("a").current!;
      f.service.bindPlannedRun("a", a.attemptId, `run${i}`);
      f.service.complete("a", `run${i}`, completed("abc"), 0);
    }
    f.service.offerPlanned("a", f.service.planSession("a"));
    const s = f.service.getOutcomeSnapshot("a");
    expect(s.recent).toHaveLength(5);
    expect(s.sequence).toBe(11);
    expect(
      new TextEncoder().encode(serializeOutcomeState(s)).length,
    ).toBeLessThan(OUTCOMES.maxBytes);
    expect(parseOutcomeState(serializeOutcomeState(s), "a")).toEqual(s);
  });
  it("legacy Slice 11 completion history remains readable and unchanged", () => {
    const f = outcomeFixture();
    f.service.complete("a", "ordinary", completed("abc"), 0);
    const key = plannerHistoryKey("a"),
      old = f.values.get(key);
    f.service.offerPlanned("a", f.service.planSession("a"));
    f.service.skipPlanned(
      "a",
      f.service.getOutcomeSnapshot("a").current!.attemptId,
    );
    const reload = createLearningService(f.storage, (j) => j());
    expect(reload.getPlannerHistory("a")).toEqual(
      f.service.getPlannerHistory("a"),
    );
    expect(f.values.get(key)).toBe(old);
  });
  it("isolates scopes and tolerates blocked reads and writes", () => {
    const f = outcomeFixture();
    f.complete();
    expect(
      parseOutcomeState(
        serializeOutcomeState(f.service.getOutcomeSnapshot("a")),
        "b",
      ).recent,
    ).toEqual([]);
    const blocked = {
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
    };
    expect(loadOutcomeState(blocked, "a").recent).toEqual([]);
    expect(
      saveOutcomeState(blocked, "a", f.service.getOutcomeSnapshot("a")),
    ).toBe(false);
  });
});
