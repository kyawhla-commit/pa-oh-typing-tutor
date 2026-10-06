import { describe, expect, it } from "vitest";
import { createTypingEngine } from "../../engine/typing";
import { testResultSummary } from "./testResult";

describe("legacy Test result mapping", () => {
  it("uses exact word-test metrics while rounding only the integer persistence duration", () => {
    const e = createTypingEngine({ mode: "word-count", wordLimit: 2, targetText: "abc def" });
    e.dispatch({ type: "INSERT_TEXT", text: "a", atMs: 1000 });
    e.dispatch({ type: "INSERT_TEXT", text: "bc deX", atMs: 38_400.25 });
    const result = e.getResult()!; const summary = testResultSummary(result,"Hard");
    expect(result.activeElapsedMs).toBe(37_400.25); expect(result.metrics.correctWpm).toBe(6 * 12_000 / 37_400.25);
    expect(summary).toEqual({ mode: "test", label: "2 words · Hard", wpm: Math.round(result.metrics.correctWpm), accuracy: Math.round(result.metrics.attemptAccuracy), characters: 7, errors: 1, durationSeconds: 37 });
  });
  it("retains timed labels and integer configured duration including 5 min", () => {
    for (const ms of [15_000,300_000]) {
      const e = createTypingEngine({ mode: "timed", durationMs: ms, textPolicy: "repeat-corpus", targetText: "a " });
      e.dispatch({ type: "INSERT_TEXT", text: "a", atMs: 0 }); e.dispatch({ type: "TICK", atMs: ms+210 });
      expect(testResultSummary(e.getResult()!,"Medium")).toMatchObject({ label: `${ms === 300_000 ? "5 min" : "15 sec"} · Medium`, durationSeconds: ms/1000 });
    }
  });
});
