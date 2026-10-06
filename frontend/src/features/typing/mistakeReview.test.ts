import { describe, expect, it } from "vitest";
import { createTypingEngine } from "../../engine/typing";
import { describeTypingUnit, mistakePracticeText, reviewMistakes, visibleTypingText } from "./mistakeReview";

function result(text: string, positions: number[]) {
  const engine = createTypingEngine({ targetText: text, completionPolicy: "target-covered" });
  const typed = engine.getSnapshot().target.units.map((unit, index) => positions.includes(index) ? "X" : unit).join("");
  engine.dispatch({ type: "INSERT_TEXT", text: typed, atMs: 0 });
  return engine.getResult()!;
}
describe("mistake review and focused fragments", () => {
  it("locates grapheme mistakes across Unicode and lines", () => {
    expect(reviewMistakes(result("👩‍💻\n  a", [0, 3]))).toMatchObject([
      { expected: "👩‍💻", actual: "X", line: 1, column: 1 },
      { expected: " ", actual: "X", line: 2, column: 2 },
    ]);
  });
  it("makes spaces, indentation, tabs and Enter visible", () => {
    expect(visibleTypingText("\n  a\t")).toBe("↵\n␣␣a⇥");
    expect(describeTypingUnit(" ")).toBe("␣ (Space)");
    expect(describeTypingUnit("\n")).toBe("↵ (Enter)");
  });
  it("selects affected words and deduplicates repeated mistakes in the same word", () => {
    expect(mistakePracticeText(result("one two three", [0, 1, 8]))).toBe("one three");
  });
  it("keeps both words around an incorrect separator", () => {
    expect(mistakePracticeText(result("one two", [3]))).toBe("one two");
  });
  it("preserves indentation in affected code lines", () => {
    expect(mistakePracticeText(result("one\n  two\nthree", [4, 6]))).toBe("  two");
  });
  it("includes the next line when an Enter is missed", () => {
    expect(mistakePracticeText(result("one\n  two\nthree", [3]))).toBe("one\n  two");
  });
  it("reviews corrected errors without changing their original history", () => {
    const engine = createTypingEngine({ targetText: "one two", completionPolicy: "target-covered" });
    engine.dispatch({ type: "INSERT_TEXT", text: "X", atMs: 0 });
    engine.dispatch({ type: "DELETE_BACKWARD", atMs: 1 });
    engine.dispatch({ type: "INSERT_TEXT", text: "one two", atMs: 2 });
    const completed = engine.getResult()!;
    expect(reviewMistakes(completed)).toMatchObject([{ correctedAtMs: 1, expected: "o", actual: "X" }]);
    expect(mistakePracticeText(completed)).toBe("one");
    expect(completed.counts.incorrectInsertionAttempts).toBe(1);
  });
});
