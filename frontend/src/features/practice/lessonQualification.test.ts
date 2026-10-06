import { describe, expect, it } from "vitest";
import { createTypingEngine } from "../../engine/typing";
import { qualifiesLesson } from "./lessonQualification";

describe("lesson attempt qualification", () => {
  it.each([0, 120000])("passes exactly 95% without a speed requirement (%s ms)", (elapsed) => {
    const engine = createTypingEngine({ targetText: "a".repeat(20), completionPolicy: "target-covered" });
    engine.dispatch({ type: "INSERT_TEXT", text: "X", atMs: 0 });
    engine.dispatch({ type: "INSERT_TEXT", text: "a".repeat(19), atMs: elapsed });
    expect(engine.getResult()!.metrics.attemptAccuracy).toBe(95);
    expect(qualifiesLesson(engine.getResult()!)).toBe(true);
  });
  it("rejects below-threshold scores before display rounding", () => {
    const engine = createTypingEngine({ targetText: "a".repeat(19), completionPolicy: "target-covered" });
    engine.dispatch({ type: "INSERT_TEXT", text: "X" + "a".repeat(18), atMs: 0 });
    expect(Math.round(engine.getResult()!.metrics.attemptAccuracy)).toBe(95);
    expect(qualifiesLesson(engine.getResult()!)).toBe(false);
  });
  it("retains historical errors when the final passage is entirely correct", () => {
    const engine = createTypingEngine({ targetText: "a".repeat(20), completionPolicy: "target-covered" });
    for (let i = 0; i < 2; i++) {
      engine.dispatch({ type: "INSERT_TEXT", text: "X", atMs: 0 });
      engine.dispatch({ type: "DELETE_BACKWARD", atMs: 0 });
    }
    engine.dispatch({ type: "INSERT_TEXT", text: "a".repeat(20), atMs: 0 });
    expect(engine.getResult()!.counts.uncorrectedErrors).toBe(0);
    expect(engine.getResult()!.metrics.attemptAccuracy).toBeLessThan(95);
    expect(qualifiesLesson(engine.getResult()!)).toBe(false);
  });
});
