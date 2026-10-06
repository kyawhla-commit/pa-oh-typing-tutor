import { describe, expect, it } from "vitest";
import { createTypingEngine, type TypingEngineConfig, type TypingEvent } from "./index";

const config = (durationMs = 30_000, targetText = "ab "): TypingEngineConfig => ({ mode: "timed", durationMs, targetText, textPolicy: "repeat-corpus" });
const insert = (engine: ReturnType<typeof createTypingEngine>, text: string, atMs: number) => engine.dispatch({ type: "INSERT_TEXT", text, atMs });

describe("timed configuration and lifecycle", () => {
  it.each([0, -1, NaN, Infinity, -Infinity])("rejects duration %s at construction", duration => {
    expect(() => createTypingEngine(config(duration))).toThrow(/durationMs/);
  });
  it.each([null, undefined, "1000", {}])("rejects nonnumeric duration %s at the runtime boundary", duration => {
    expect(() => createTypingEngine({ mode: "timed", textPolicy: "repeat-corpus", targetText: "a", durationMs: duration as unknown as number })).toThrow(/durationMs/);
  });
  it("requires explicit repeating text policy", () => {
    expect(() => createTypingEngine({ mode: "timed", targetText: "a", durationMs: 100 } as TypingEngineConfig)).toThrow(/repeat-corpus/);
  });
  it("accepts positive fractional duration and remains ready until nonempty insertion", () => {
    const engine = createTypingEngine(config(0.5));
    engine.dispatch({ type: "TICK", atMs: 10 });
    insert(engine, "", 11); engine.dispatch({ type: "DELETE_BACKWARD", atMs: 12 });
    expect(engine.getSnapshot()).toMatchObject({ mode: "timed", durationMs: 0.5, remainingMs: 0.5, progress: 0, status: "ready", completionPolicy: null, startedAtMs: null });
    insert(engine, "a", 20);
    expect(engine.getSnapshot().status).toBe("running");
    engine.dispatch({ type: "TICK", atMs: 20.5 });
    expect(engine.getResult()).toMatchObject({ completionReason: "time-expired", activeElapsedMs: 0.5, completedAtMs: 20.5 });
  });
  it("freezes caller configuration and corpus until reset", () => {
    const mutable = { mode: "timed" as const, durationMs: 1000, textPolicy: "repeat-corpus" as const, targetText: "ab " };
    const engine = createTypingEngine(mutable); mutable.durationMs = 1; mutable.targetText = "BAD";
    insert(engine, "ab ab ", 100);
    expect(engine.getSnapshot()).toMatchObject({ status: "running", durationMs: 1000, target: { text: "ab " }, counts: { currentCorrectUnits: 6 } });
    engine.dispatch({ type: "TICK", atMs: 1100 });
    expect(engine.getResult()?.completedAtMs).toBe(1100);
  });
  it("reset retains timed configuration and clears results, counts, pauses, and timestamps", () => {
    const engine = createTypingEngine(config(100));
    insert(engine, "X", 1000); engine.dispatch({ type: "PAUSE", atMs: 1010 });
    engine.dispatch({ type: "RESUME", atMs: 1050 }); engine.dispatch({ type: "TICK", atMs: 1200 });
    engine.reset();
    expect(engine.getSnapshot()).toMatchObject({ mode: "timed", durationMs: 100, remainingMs: 100, status: "ready", progress: 0, counts: { totalInsertionAttempts: 0, backspaces: 0 } });
    expect(engine.getResult()).toBeNull(); insert(engine, "a", 0);
    engine.dispatch({ type: "TICK", atMs: 100 }); expect(engine.getResult()?.completedAtMs).toBe(100);
  });
  it("invalid replacement configuration leaves the previous session intact", () => {
    const engine = createTypingEngine(config()); insert(engine, "a", 0);
    const snapshot = engine.getSnapshot();
    expect(() => engine.reset(config(NaN))).toThrow(); expect(engine.getSnapshot()).toBe(snapshot);
    expect(() => engine.reset(config(100, ""))).toThrow(); expect(engine.getSnapshot()).toBe(snapshot);
  });
  it("can switch between fixed and timed mode on explicit reset", () => {
    const engine = createTypingEngine({ targetText: "a" });
    engine.reset(config(100, "a ")); insert(engine, "a a ", 0); expect(engine.getResult()).toBeNull();
    engine.reset({ targetText: "a" }); insert(engine, "a", 0);
    expect(engine.getResult()).toMatchObject({ mode: "fixed-text", durationMs: null, remainingMs: null, completionReason: "correct-target" });
  });
});

describe("authoritative timed deadline", () => {
  it.each([[-1, true], [0, false], [1, false]])("handles insertion at deadline %+d ms", (offset, accepted) => {
    const engine = createTypingEngine(config()); insert(engine, "a", 1000);
    const outcome = insert(engine, "b", 31_000 + Number(offset));
    expect(outcome.accepted).toBe(accepted);
    expect(engine.getSnapshot().counts.totalInsertionAttempts).toBe(accepted ? 2 : 1);
    if (accepted) expect(engine.getSnapshot()).toMatchObject({ status: "running", remainingMs: 1, activeElapsedMs: 29_999 });
    else expect(engine.getResult()).toMatchObject({ completionReason: "time-expired", completedAtMs: 31_000, activeElapsedMs: 30_000, remainingMs: 0, progress: 1 });
  });
  it("uses the explicit logical deadline for fractional timestamps", () => {
    const engine = createTypingEngine(config(0.1)); insert(engine, "a", 0.7);
    const deadline = 0.7 + 0.1;
    expect(insert(engine, "b", 0.7999999999999998).accepted).toBe(true);
    expect(insert(engine, " ", deadline).accepted).toBe(false);
    expect(engine.getResult()).toMatchObject({ completedAtMs: deadline, activeElapsedMs: 0.1 });
  });
  it.each(["INSERT_TEXT", "DELETE_BACKWARD", "TICK", "PAUSE", "RESUME", "ABORT"] as const)("expires before processing %s at the deadline", type => {
    const engine = createTypingEngine(config()); insert(engine, "a", 1000);
    const event: TypingEvent = type === "INSERT_TEXT" ? { type, text: "b", atMs: 31_000 } : { type, atMs: 31_000 };
    const outcome = engine.dispatch(event);
    expect(outcome.accepted).toBe(type === "TICK");
    expect(engine.getResult()).toMatchObject({ completionReason: "time-expired", completedAtMs: 31_000, pausedAtMs: null, abortedAtMs: null, counts: { currentTypedUnits: 1, backspaces: 0, totalInsertionAttempts: 1 } });
  });
  it("rejects late multi-character input without partial scoring, even with no intervening tick", () => {
    const engine = createTypingEngine(config()); insert(engine, "a", 1000);
    expect(insert(engine, "b XYZ", 31_020)).toEqual({ accepted: false, insertedAttempts: 0, acceptedText: "", rejectedText: "b XYZ" });
    expect(engine.getResult()).toMatchObject({ activeElapsedMs: 30_000, completedAtMs: 31_000, counts: { totalInsertionAttempts: 1 } });
  });
  it("treats a commit before the deadline atomically, without invented per-character times", () => {
    const engine = createTypingEngine(config()); insert(engine, "a", 1000);
    expect(insert(engine, "b ab ab ", 30_999).insertedAttempts).toBe(8);
    expect(engine.getSnapshot().counts.currentCorrectUnits).toBe(9);
    engine.dispatch({ type: "TICK", atMs: 31_001 }); expect(engine.getResult()?.completedAtMs).toBe(31_000);
  });
  it("final WPM uses exact configured duration rather than a delayed timer denominator", () => {
    const engine = createTypingEngine(config(60_000)); insert(engine, "ab ab X", 1000);
    engine.dispatch({ type: "TICK", atMs: 61_210 });
    expect(engine.getResult()).toMatchObject({ activeElapsedMs: 60_000, completedAtMs: 61_000, counts: { totalInsertionAttempts: 7, currentCorrectUnits: 6, uncorrectedErrors: 1 }, metrics: { rawWpm: 1.4, correctWpm: 1.2 } });
    expect(engine.getResult()?.metrics.attemptAccuracy).toBeCloseTo(600 / 7);
  });
  it("empty late insertion still finalizes but does not add an attempt", () => {
    const engine = createTypingEngine(config(100)); insert(engine, "a", 0); insert(engine, "", 100);
    expect(engine.getResult()?.counts.totalInsertionAttempts).toBe(1);
  });
  it("invalid/decreasing event timestamps do not mutate a running timed session", () => {
    const engine = createTypingEngine(config(100)); insert(engine, "a", 1000);
    const snapshot = engine.getSnapshot();
    expect(() => insert(engine, "b", 999)).toThrow(); expect(() => insert(engine, "b", Infinity)).toThrow();
    expect(engine.getSnapshot()).toBe(snapshot);
  });
});

describe("pause, repeat corpus, scoring and immutable timed results", () => {
  it("excludes five paused seconds from a thirty-second active test", () => {
    const engine = createTypingEngine(config()); insert(engine, "a", 1000);
    engine.dispatch({ type: "PAUSE", atMs: 11_000 });
    const paused = engine.getSnapshot(); engine.dispatch({ type: "TICK", atMs: 15_000 });
    expect(engine.getSnapshot()).toBe(paused); expect(insert(engine, "b", 15_500).accepted).toBe(false);
    engine.dispatch({ type: "RESUME", atMs: 16_000 });
    engine.dispatch({ type: "TICK", atMs: 35_999 });
    expect(engine.getSnapshot()).toMatchObject({ activeElapsedMs: 29_999, remainingMs: 1 });
    engine.dispatch({ type: "TICK", atMs: 36_000 });
    expect(engine.getResult()).toMatchObject({ activeElapsedMs: 30_000, completedAtMs: 36_000, remainingMs: 0 });
  });
  it("can pause one millisecond before expiry and resume after the old wall-clock deadline", () => {
    const engine = createTypingEngine(config()); insert(engine, "a", 100);
    engine.dispatch({ type: "PAUSE", atMs: 30_099 }); engine.dispatch({ type: "TICK", atMs: 999_999 });
    expect(engine.getResult()).toBeNull(); engine.dispatch({ type: "RESUME", atMs: 1_000_000 });
    expect(insert(engine, "b", 1_000_000).accepted).toBe(true);
    expect(insert(engine, " ", 1_000_001).accepted).toBe(false);
    expect(engine.getResult()?.completedAtMs).toBe(1_000_001);
  });
  it("accumulates multiple pauses without consuming the remaining allowance", () => {
    const engine = createTypingEngine(config(1000)); insert(engine, "a", 0);
    engine.dispatch({ type: "PAUSE", atMs: 100 }); engine.dispatch({ type: "RESUME", atMs: 200 });
    engine.dispatch({ type: "PAUSE", atMs: 300 }); engine.dispatch({ type: "RESUME", atMs: 600 });
    engine.dispatch({ type: "TICK", atMs: 1399 }); expect(engine.getSnapshot().remainingMs).toBe(1);
    engine.dispatch({ type: "TICK", atMs: 1401 }); expect(engine.getResult()?.completedAtMs).toBe(1400);
  });
  it("never completes on passage exhaustion, even when several cycles are typed in one commit", () => {
    const engine = createTypingEngine(config());
    expect(insert(engine, "ab ".repeat(100), 0).insertedAttempts).toBe(300);
    expect(engine.getSnapshot()).toMatchObject({ status: "running", currentPosition: 300, progress: 0, remainingMs: 30_000 });
    expect(engine.getResult()).toBeNull(); expect(engine.getSnapshot().counts.currentCorrectUnits).toBe(300);
    const target = engine.getSnapshot().target; insert(engine, "ab ", 1);
    expect(engine.getSnapshot().target).toBe(target); expect(engine.getSnapshot().counts.currentCorrectUnits).toBe(303);
  });
  it("retains free backspace, corrected attempts, and remaining mistakes at expiry", () => {
    const engine = createTypingEngine(config(1000)); insert(engine, "aX", 0);
    engine.dispatch({ type: "DELETE_BACKWARD", atMs: 10 }); insert(engine, "b X", 20);
    engine.dispatch({ type: "TICK", atMs: 1001 });
    expect(engine.getResult()).toMatchObject({ counts: { backspaces: 1, incorrectInsertionAttempts: 2, correctedErrors: 1, uncorrectedErrors: 1 }, mistakes: [{ text: "X", correctedAtMs: 10 }, { text: "X", correctedAtMs: null }] });
  });
  it("preserves NFC/Unicode tail revision without requiring target correctness to expire", () => {
    const engine = createTypingEngine(config(100, "é👩‍💻\n"));
    insert(engine, "e", 0); insert(engine, "\u0301", 1); insert(engine, "👩‍💻\né", 2);
    expect(engine.getSnapshot()).toMatchObject({ currentPosition: 4, counts: { currentCorrectUnits: 4, totalInsertionAttempts: 5, correctedErrors: 1 } });
    engine.dispatch({ type: "TICK", atMs: 100 }); expect(engine.getResult()?.completionReason).toBe("time-expired");
  });
  it("clamps remaining time and progress, then freezes result and ignores all terminal events", () => {
    const engine = createTypingEngine(config(100)); insert(engine, "X", 10);
    engine.dispatch({ type: "TICK", atMs: 10_000 });
    const result = engine.getResult()!; const snapshot = engine.getSnapshot();
    expect(result.remainingMs).toBe(0); expect(result.progress).toBe(1); expect(result.activeElapsedMs).toBe(100);
    for (const value of [result, result.counts, result.metrics, result.mistakes, result.mistakes[0], result.typedUnits]) expect(Object.isFrozen(value)).toBe(true);
    for (const type of ["DELETE_BACKWARD", "TICK", "PAUSE", "RESUME", "ABORT"] as const) engine.dispatch({ type, atMs: 20_000 });
    insert(engine, "ab", 20_000); expect(engine.getResult()).toBe(result); expect(engine.getSnapshot()).toBe(snapshot);
  });
  it("abort before the deadline is terminal and never creates a time-expired result", () => {
    const engine = createTypingEngine(config()); insert(engine, "a", 0);
    engine.dispatch({ type: "ABORT", atMs: 1000 }); engine.dispatch({ type: "TICK", atMs: 40_000 });
    expect(engine.getSnapshot()).toMatchObject({ status: "aborted", activeElapsedMs: 1000, remainingMs: 29_000 }); expect(engine.getResult()).toBeNull();
  });
});
