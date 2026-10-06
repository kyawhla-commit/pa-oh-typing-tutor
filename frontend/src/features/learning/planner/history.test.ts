import { describe, it, expect } from "vitest";
import {
  advancePlannerHistory,
  emptyPlannerHistory,
  loadPlannerHistory,
  parsePlannerHistory,
  savePlannerHistory,
  plannerHistoryKey,
} from "./history";
import { completed } from "../testFixtures";
import { extractLearningEvidence } from "../evidence";
import { createTypingEngine } from "../../../engine/typing";
import { canGenerateExercise } from "../exercises/capability";
import { finishExercise, sourceAttribution } from "../progression/testFixtures";
import type { AdaptivePracticeSpec } from "../types";
const summary = (
  id: string,
  mode: "fixed-text" | "timed" | "word-count" = "fixed-text",
) =>
  extractLearningEvidence(completed("r".repeat(20), [], "X", mode), id, 0)!
    .summary;
describe("bounded completion history", () => {
  it("retains exactly three accepted sessions with no passages, timestamps or counters", () => {
    let h = emptyPlannerHistory();
    for (let i = 1; i <= 8; i++)
      h = advancePlannerHistory(h, summary(`s${i}`), i);
    expect(h.recent.map((r) => r.sessionId)).toEqual(["s6", "s7", "s8"]);
    expect(Object.keys(h.recent[0])).toEqual([
      "sessionId",
      "activityKey",
      "sourceId",
    ]);
    expect(Object.isFrozen(h.recent)).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(h)).length).toBeLessThan(
      4096,
    );
  });
  it("does not advance for duplicate or older ingestion order", () => {
    const h = advancePlannerHistory(emptyPlannerHistory(), summary("s"), 1);
    expect(advancePlannerHistory(h, summary("s"), 1)).toBe(h);
    expect(advancePlannerHistory(h, summary("x"), 0)).toBe(h);
  });
  it.each(["timed", "word-count"] as const)(
    "%s tests break the consecutive practice run",
    (mode) => {
      const h = advancePlannerHistory(
        emptyPlannerHistory(),
        summary("s", mode),
        1,
      );
      expect(h.recent[0].activityKey).toBe("other-session");
      expect(h.recent[0].sourceId).toBeNull();
    },
  );
  it("never stores private custom text or source identifiers", () => {
    const privateText = "private custom content";
    const engine = createTypingEngine({
      targetText: privateText,
      sourceIdentity: { type: "custom", id: privateText, version: privateText },
    });
    engine.dispatch({ type: "INSERT_TEXT", text: privateText, atMs: 0 });
    const h = advancePlannerHistory(
      emptyPlannerHistory(),
      extractLearningEvidence(engine.getResult(), "custom", 0)!.summary,
      1,
    );
    expect(JSON.stringify(h)).not.toContain(privateText);
    expect(h.recent[0].activityKey).toContain("normal-practice");
  });
  it("records the exact validated adaptive type, weakness and purpose", () => {
    const spec: AdaptivePracticeSpec = {
      recommendationId: "r",
      focusType: "grapheme",
      focusItems: ["r"],
      desiredLength: { unit: "graphemes", value: 160 },
      difficulty: "steady",
      mode: "fixed-text",
      completionPolicy: "require-correct-target",
    };
    const result = canGenerateExercise(spec, {
      learnerKey: "history",
      composition: { level: 1, ordinal: 0, purpose: "training" },
    });
    if (!result.ok) throw Error(result.reason);
    const evidence = extractLearningEvidence(
      finishExercise(result.exercise),
      "context",
      0,
    )!;
    const h = advancePlannerHistory(
      emptyPlannerHistory(),
      evidence.summary,
      1,
      sourceAttribution(result.exercise),
    );
    expect(JSON.parse(h.recent[0].activityKey)).toEqual([
      "contextual-practice",
      JSON.stringify(["grapheme", "r"]),
      "training",
    ]);
    expect(h.recent[0].sourceId).toBe(result.exercise.source.id);
    expect(parsePlannerHistory(JSON.stringify(h), 1)).toEqual(h);
  });
  it("whitelists persisted data and ignores invalid/old/out-of-sync versions", () => {
    const h = advancePlannerHistory(emptyPlannerHistory(), summary("s"), 1);
    expect(
      parsePlannerHistory(
        JSON.stringify({
          ...h,
          text: "private",
          recent: h.recent.map((r) => ({ ...r, text: "private" })),
        }),
        1,
      ),
    ).toEqual(h);
    for (const value of [
      null,
      "{",
      JSON.stringify({ ...h, version: 2 }),
      JSON.stringify({ ...h, order: 2 }),
      JSON.stringify({ ...h, recent: [...h.recent, ...h.recent] }),
      JSON.stringify({
        ...h,
        recent: [{ ...h.recent[0], activityKey: "nonsense" }],
      }),
      "x".repeat(4097),
    ])
      expect(parsePlannerHistory(value, 1)).toEqual(emptyPlannerHistory(1));
  });
  it("recovers conservatively from storage failures", () => {
    const storage = {
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
    };
    expect(loadPlannerHistory(storage, "a", 3)).toEqual(emptyPlannerHistory(3));
    expect(savePlannerHistory(storage, "a", emptyPlannerHistory())).toBe(false);
    expect(plannerHistoryKey("a")).not.toBe(plannerHistoryKey("b"));
  });
});
