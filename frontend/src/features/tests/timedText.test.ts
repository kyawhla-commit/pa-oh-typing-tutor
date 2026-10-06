import { describe, expect, it } from "vitest";
import { createTypingEngine } from "../../engine/typing";
import { DIFFICULTIES, DURATIONS, prepareTimedTest, timedPassageWindow, prepareWordTest, WORD_LIMITS, prepareTest } from "./timedText";

describe("timed Test text preparation and presentation", () => {
  it.each(DIFFICULTIES)("prepares %s as a deterministic corpus with a safe separator", difficulty => {
    for (const duration of DURATIONS) {
      const config = prepareTimedTest(difficulty, duration);
      const engine = createTypingEngine(config);
      expect(engine.getSnapshot().target.text.endsWith(" ")).toBe(true);
      expect(engine.getSnapshot().durationMs).toBe(duration * 1000);
      expect(config).toEqual(prepareTimedTest(difficulty, duration));
      engine.dispatch({ type: "INSERT_TEXT", text: engine.getSnapshot().target.text.repeat(2), atMs: 0 });
      expect(engine.getSnapshot().counts.incorrectInsertionAttempts).toBe(0);
      expect(engine.getSnapshot().status).toBe("running");
    }
  });
  it("projects only a bounded window and keeps global positions stable through cycling/backspace", () => {
    const engine = createTypingEngine({ mode: "timed", durationMs: 1000, textPolicy: "repeat-corpus", targetText: "ab " });
    const initial = timedPassageWindow(engine.getSnapshot()); expect(initial).toHaveLength(240);
    engine.dispatch({ type: "INSERT_TEXT", text: "ab ".repeat(40), atMs: 0 });
    const next = timedPassageWindow(engine.getSnapshot()); expect(next[0].position).toBe(120);
    expect(next.slice(0,120)).toEqual(initial.slice(120));
    engine.dispatch({ type: "DELETE_BACKWARD", atMs: 1 });
    expect(timedPassageWindow(engine.getSnapshot())).toEqual(initial);
  });
});


describe("word Test preparation and bounded presentation", () => {
  it.each(DIFFICULTIES)("extends %s corpus deterministically for all UI limits", difficulty => {
    for (const wordLimit of WORD_LIMITS) {
      const config = prepareWordTest(difficulty, wordLimit);
      const e = createTypingEngine(config); const snapshot = e.getSnapshot();
      expect(snapshot.target.words.length).toBeGreaterThanOrEqual(wordLimit);
      expect(snapshot.sourceIdentity).toMatchObject({ type: "corpus", version: "1" });
      expect(config).toEqual(prepareWordTest(difficulty, wordLimit));
      const text = snapshot.target.units.slice(0, snapshot.targetUnitCount).join("");
      e.dispatch({ type: "INSERT_TEXT", text, atMs: 0 });
      expect(e.getResult()).toMatchObject({ mode: "word-count", completionReason: "word-limit-reached", wordProgress: { consumedWords: wordLimit }, counts: { uncorrectedErrors: 0 } });
    }
  });
  it("preserves selected mode/configuration in a shared preparation API", () => {
    expect(createTypingEngine(prepareTest({ mode: "word-count", wordLimit: 25, difficulty: "Hard" })).getSnapshot().wordLimit).toBe(25);
    expect(createTypingEngine(prepareTest({ mode: "timed", duration: 30, difficulty: "Easy" })).getSnapshot().durationMs).toBe(30_000);
  });
  it("bounds 100 words, preserves overlap and backspaces across windows", () => {
    const e = createTypingEngine(prepareWordTest("Medium", 100)); const s = e.getSnapshot();
    const first = timedPassageWindow(s); expect(first).toHaveLength(240);
    e.dispatch({ type: "INSERT_TEXT", text: s.target.units.slice(0,120).join(""), atMs: 0 });
    const next = timedPassageWindow(e.getSnapshot()); expect(next.slice(0,120)).toEqual(first.slice(120));
    e.dispatch({ type: "DELETE_BACKWARD", atMs: 1 }); expect(timedPassageWindow(e.getSnapshot())).toEqual(first);
  });
  it("never renders source text beyond the configured final word", () => {
    const e = createTypingEngine(prepareWordTest("Medium",10)); const s = e.getSnapshot(); const window = timedPassageWindow(s);
    expect(window.length).toBe(s.targetUnitCount); expect(window[window.length - 1]?.position).toBe(s.targetUnitCount-1);
  });
});
