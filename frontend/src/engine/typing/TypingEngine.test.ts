import { performance } from "node:perf_hooks";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTypingEngine, SCORING_VERSION } from "./index";
import type { SessionSnapshot, TypingEngine, TypingEvent } from "./index";

function insert(engine: TypingEngine, text: string, atMs = 0) {
  return engine.dispatch({ type: "INSERT_TEXT", text, atMs });
}

function expectInvariants(snapshot: SessionSnapshot) {
  const c = snapshot.counts;
  expect(c.totalInsertionAttempts).toBe(c.correctInsertionAttempts + c.incorrectInsertionAttempts);
  expect(c.incorrectInsertionAttempts).toBe(c.correctedErrors + c.uncorrectedErrors);
  expect(c.currentTypedUnits).toBe(c.currentCorrectUnits + c.uncorrectedErrors);
  expect(c.currentTypedUnits).toBe(snapshot.typedUnits.length);
  expect(c.currentCorrectUnits).toBe(snapshot.typedUnits.filter((unit) => unit.correct).length);
  expect(snapshot.currentPosition).toBe(c.currentTypedUnits);
  expect(snapshot.progress).toBeGreaterThanOrEqual(0);
  expect(snapshot.progress).toBeLessThanOrEqual(1);
  expect(snapshot.activeElapsedMs).toBeGreaterThanOrEqual(0);
  for (const value of Object.values(snapshot.metrics)) expect(Number.isFinite(value)).toBe(true);
}

afterEach(() => vi.restoreAllMocks());

describe("creation and input", () => {
  it("rejects empty targets", () => {
    expect(() => createTypingEngine({ targetText: "" })).toThrow(/non-empty/);
  });

  it("starts ready with safe empty metrics and no result", () => {
    const engine = createTypingEngine({ targetText: "abc" });
    expect(engine.getSnapshot()).toMatchObject({
      status: "ready", startedAtMs: null, completedAtMs: null,
      currentPosition: 0, progress: 0, activeElapsedMs: 0,
      scoringVersion: SCORING_VERSION,
      metrics: { rawWpm: 0, correctWpm: 0, attemptAccuracy: 100, characterAccuracy: 100 },
    });
    expect(engine.getResult()).toBeNull();
    expectInvariants(engine.getSnapshot());
  });

  it("starts only on the first accepted nonempty insertion", () => {
    const engine = createTypingEngine({ targetText: "abc" });
    expect(insert(engine, "", 0).accepted).toBe(false);
    engine.dispatch({ type: "TICK", atMs: 1 });
    expect(engine.getSnapshot().status).toBe("ready");
    expect(insert(engine, "a", 5).accepted).toBe(true);
    insert(engine, "b", 15);
    expect(engine.getSnapshot()).toMatchObject({ status: "running", startedAtMs: 5, activeElapsedMs: 10 });
  });

  it("counts empty backspace without starting the timer", () => {
    const engine = createTypingEngine({ targetText: "abc" });
    engine.dispatch({ type: "DELETE_BACKWARD", atMs: 10 });
    expect(engine.getSnapshot()).toMatchObject({
      status: "ready", startedAtMs: null, activeElapsedMs: 0,
      counts: { backspaces: 1, totalInsertionAttempts: 0 },
    });
    insert(engine, "a", 100);
    expect(engine.getSnapshot().startedAtMs).toBe(100);
  });

  it("records a correct insertion", () => {
    const engine = createTypingEngine({ targetText: "abc" });
    insert(engine, "a");
    expect(engine.getSnapshot()).toMatchObject({
      typedUnits: [{ text: "a", correct: true }],
      counts: { totalInsertionAttempts: 1, correctInsertionAttempts: 1, incorrectInsertionAttempts: 0 },
    });
  });

  it("records an incorrect insertion", () => {
    const engine = createTypingEngine({ targetText: "abc" });
    insert(engine, "X");
    expect(engine.getSnapshot()).toMatchObject({
      typedUnits: [{ text: "X", correct: false }],
      counts: { totalInsertionAttempts: 1, incorrectInsertionAttempts: 1, uncorrectedErrors: 1 },
      metrics: { attemptAccuracy: 0, characterAccuracy: 0 },
    });
    expectInvariants(engine.getSnapshot());
  });

  it("scores mixed correct/incorrect input by target position", () => {
    const engine = createTypingEngine({ targetText: "abcd" });
    insert(engine, "aXc");
    expect(engine.getSnapshot().typedUnits.map((unit) => unit.correct)).toEqual([true, false, true]);
    expect(engine.getSnapshot().counts).toMatchObject({ correctInsertionAttempts: 2, incorrectInsertionAttempts: 1 });
    expectInvariants(engine.getSnapshot());
  });

  it.each([
    ["spaces", "a b", "a b"],
    ["punctuation", "Hi, Bob!", "Hi, Bob!"],
    ["uppercase", "ABC", "ABC"],
    ["newlines", "a\nb", "a\nb"],
    ["tabs", "a\tb", "a\tb"],
    ["whitespace-only target", " \n", " \n"],
  ])("accepts and scores %s without trimming", (_, targetText, input) => {
    const engine = createTypingEngine({ targetText });
    insert(engine, input);
    expect(engine.getSnapshot().status).toBe("completed");
    expect(engine.getResult()?.metrics.characterAccuracy).toBe(100);
    expect(engine.getResult()?.counts.incorrectInsertionAttempts).toBe(0);
    expect(engine.getSnapshot().target.text).toBe(targetText);
    expectInvariants(engine.getSnapshot());
  });

  it("compares case sensitively", () => {
    const engine = createTypingEngine({ completionPolicy: "target-covered", targetText: "Ab" });
    insert(engine, "aB");
    expect(engine.getResult()?.counts.uncorrectedErrors).toBe(2);
    expect(engine.getResult()?.metrics.characterAccuracy).toBe(0);
  });

  it("supports multi-character commits as one synchronous input event", () => {
    const engine = createTypingEngine({ targetText: "hello!" });
    expect(insert(engine, "hello", 17)).toEqual({
      accepted: true, insertedAttempts: 5, acceptedText: "hello", rejectedText: "",
    });
    expect(engine.getSnapshot()).toMatchObject({ startedAtMs: 17, currentPosition: 5, status: "running" });
  });

  it("freezes target data independently of the configuration object", () => {
    const config = { targetText: "abc" };
    const engine = createTypingEngine(config);
    config.targetText = "xyz";
    expect(engine.getSnapshot().target.text).toBe("abc");
    insert(engine, "a");
    expect(engine.getSnapshot().typedUnits[0].correct).toBe(true);
  });
});

describe("backspaces and history", () => {
  it("preserves historical error attempts after correction", () => {
    const engine = createTypingEngine({ targetText: "ab" });
    insert(engine, "X", 0);
    engine.dispatch({ type: "DELETE_BACKWARD", atMs: 100 });
    insert(engine, "a", 200);
    insert(engine, "b", 300);
    expect(engine.getResult()).toMatchObject({
      counts: {
        totalInsertionAttempts: 3, correctInsertionAttempts: 2, incorrectInsertionAttempts: 1,
        correctedErrors: 1, uncorrectedErrors: 0, backspaces: 1,
      },
      mistakes: [{ attempt: 1, position: 0, text: "X", atMs: 0, correctedAtMs: 100 }],
      metrics: { characterAccuracy: 100 },
    });
    expect(engine.getResult()?.metrics.attemptAccuracy).toBeCloseTo(200 / 3);
    expectInvariants(engine.getSnapshot());
  });

  it("deletes a correct unit without creating a typing error", () => {
    const engine = createTypingEngine({ targetText: "abc" });
    insert(engine, "ab");
    engine.dispatch({ type: "DELETE_BACKWARD", atMs: 1000 });
    expect(engine.getSnapshot()).toMatchObject({
      typedUnits: [{ text: "a", correct: true }],
      counts: { totalInsertionAttempts: 2, correctInsertionAttempts: 2, currentCorrectUnits: 1,
        incorrectInsertionAttempts: 0, correctedErrors: 0, backspaces: 1 },
      metrics: { rawWpm: 24, correctWpm: 12 },
    });
    expectInvariants(engine.getSnapshot());
  });

  it("deletes an incorrect unit and moves it from uncorrected to corrected", () => {
    const engine = createTypingEngine({ targetText: "abc" });
    insert(engine, "X");
    engine.dispatch({ type: "DELETE_BACKWARD", atMs: 1 });
    expect(engine.getSnapshot().counts).toMatchObject({
      incorrectInsertionAttempts: 1, correctedErrors: 1, uncorrectedErrors: 0, currentTypedUnits: 0,
    });
    expect(engine.getSnapshot().metrics).toMatchObject({ attemptAccuracy: 0, characterAccuracy: 100 });
    expectInvariants(engine.getSnapshot());
  });

  it("handles repeated backspaces through an empty buffer", () => {
    const engine = createTypingEngine({ targetText: "abcdef" });
    insert(engine, "aX👩‍💻");
    for (let atMs = 1; atMs <= 4; atMs++) {
      engine.dispatch({ type: "DELETE_BACKWARD", atMs });
      expectInvariants(engine.getSnapshot());
    }
    expect(engine.getSnapshot()).toMatchObject({
      status: "running", typedUnits: [],
      counts: { backspaces: 4, totalInsertionAttempts: 3, correctedErrors: 2, uncorrectedErrors: 0 },
    });
  });

  it("keeps a remaining error distinct from previously corrected errors", () => {
    const engine = createTypingEngine({ completionPolicy: "target-covered", targetText: "abc" });
    insert(engine, "X");
    engine.dispatch({ type: "DELETE_BACKWARD", atMs: 1 });
    insert(engine, "Y", 2);
    insert(engine, "bc", 3);
    expect(engine.getResult()).toMatchObject({
      counts: { incorrectInsertionAttempts: 2, correctedErrors: 1, uncorrectedErrors: 1 },
      mistakes: [{ correctedAtMs: 1 }, { correctedAtMs: null }],
    });
    expectInvariants(engine.getSnapshot());
  });
});

describe("Unicode segmentation", () => {
  it.each(["😀", "👩‍💻", "🇲🇲", "👍🏽", "e\u0301", "က\u1031"])(
    "scores and deletes %s as one grapheme", (cluster) => {
      const engine = createTypingEngine({ targetText: cluster + "!" });
      insert(engine, cluster);
      expect(engine.getSnapshot().currentPosition).toBe(1);
      expect(engine.getSnapshot().counts.correctInsertionAttempts).toBe(1);
      engine.dispatch({ type: "DELETE_BACKWARD", atMs: 1 });
      expect(engine.getSnapshot().typedUnits).toEqual([]);
      expectInvariants(engine.getSnapshot());
    },
  );

  it("uses canonical NFC comparison without changing the original text", () => {
    const engine = createTypingEngine({ targetText: "é!" });
    insert(engine, "e\u0301");
    expect(engine.getSnapshot().typedUnits).toEqual([{ text: "e\u0301", correct: true }]);
    expect(engine.getSnapshot().target.units).toEqual(["é", "!"]);
  });

  it.each([
    ["combining mark", "é", ["e", "\u0301"]],
    ["ZWJ emoji", "👩‍💻", ["👩", "\u200d", "💻"]],
    ["regional indicators", "🇲🇲", ["🇲", "🇲"]],
    ["Myanmar combining vowel", "က\u1031", ["က", "\u1031"]],
    ["CRLF", "\r\n", ["\r", "\n"]],
  ])("resegments the affected tail for %s across commits", (_, cluster, commits) => {
    const engine = createTypingEngine({ targetText: cluster + "!" });
    commits.forEach((commit, atMs) => {
      insert(engine, commit, atMs);
      expectInvariants(engine.getSnapshot());
    });
    expect(engine.getSnapshot()).toMatchObject({
      currentPosition: 1, typedUnits: [{ text: commits.join(""), correct: true }],
      counts: {
        totalInsertionAttempts: commits.length, correctInsertionAttempts: 1,
        incorrectInsertionAttempts: commits.length - 1,
        correctedErrors: commits.length - 1, uncorrectedErrors: 0,
      },
    });
  });

  it("does not rescore an unchanged preceding grapheme", () => {
    const engine = createTypingEngine({ targetText: "abc" });
    insert(engine, "a");
    expect(insert(engine, "b", 1).insertedAttempts).toBe(1);
    expect(engine.getSnapshot().counts.totalInsertionAttempts).toBe(2);
  });

  it("preserves earlier clusters when a trailing cluster is revised", () => {
    const engine = createTypingEngine({ targetText: "aé!" });
    insert(engine, "ae");
    insert(engine, "\u0301", 1);
    expect(engine.getSnapshot().typedUnits).toEqual([
      { text: "a", correct: true }, { text: "e\u0301", correct: true },
    ]);
    expect(engine.getSnapshot().counts).toMatchObject({ totalInsertionAttempts: 3, correctedErrors: 1 });
    expectInvariants(engine.getSnapshot());
  });

  it("keeps incremental segmentation equal to full Unicode segmentation", () => {
    const engine = createTypingEngine({ targetText: "#".repeat(100) });
    const reference = new Intl.Segmenter("und", { granularity: "grapheme" });
    const commits = ["🇲", "🇲", "🇦", "🇺", "e", "\u0301", "\u0323", "👩", "\u200d", "💻", "\r", "\n", "က", "\u1031", "\u0600", "a"];
    let text = "";
    commits.forEach((commit, atMs) => {
      text += commit;
      insert(engine, commit, atMs);
      expect(engine.getSnapshot().typedUnits.map((unit) => unit.text)).toEqual(
        Array.from(reference.segment(text), (part) => part.segment),
      );
      expectInvariants(engine.getSnapshot());
    });
  });

  it("fails clearly if native grapheme segmentation is unavailable", () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, "Segmenter")!;
    try {
      Object.defineProperty(Intl, "Segmenter", { ...descriptor, value: undefined });
      expect(() => createTypingEngine({ targetText: "abc" })).toThrow(/requires Intl.Segmenter/);
    } finally {
      Object.defineProperty(Intl, "Segmenter", descriptor);
    }
  });
});

describe("time and metrics", () => {
  it("computes raw and current-correct WPM exactly from active milliseconds", () => {
    const engine = createTypingEngine({ targetText: "abcdef" });
    insert(engine, "abX", 1000);
    engine.dispatch({ type: "TICK", atMs: 61_000 });
    expect(engine.getSnapshot().activeElapsedMs).toBe(60_000);
    expect(engine.getSnapshot().metrics.rawWpm).toBe(0.6);
    expect(engine.getSnapshot().metrics.correctWpm).toBe(0.4);
    expect(engine.getSnapshot().metrics.attemptAccuracy).toBeCloseTo(200 / 3);
    expect(engine.getSnapshot().metrics.characterAccuracy).toBeCloseTo(200 / 3);
    engine.dispatch({ type: "DELETE_BACKWARD", atMs: 61_000 });
    insert(engine, "c", 61_000);
    expect(engine.getSnapshot().metrics).toEqual({
      rawWpm: 0.8, correctWpm: 0.6, attemptAccuracy: 75, characterAccuracy: 100,
    });
    expectInvariants(engine.getSnapshot());
  });

  it.each([0, 0.001, Number.MIN_VALUE])("keeps metrics finite at elapsed time %s", (elapsed) => {
    const engine = createTypingEngine({ targetText: "ab" });
    insert(engine, "a", 0);
    engine.dispatch({ type: "TICK", atMs: elapsed });
    expectInvariants(engine.getSnapshot());
    if (elapsed === 0) expect(engine.getSnapshot().metrics.rawWpm).toBe(0);
    if (elapsed === Number.MIN_VALUE) expect(engine.getSnapshot().metrics.rawWpm).toBe(Number.MAX_VALUE);
  });

  it("does not round fractional metrics", () => {
    const engine = createTypingEngine({ targetText: "ab" });
    insert(engine, "a", 0);
    engine.dispatch({ type: "TICK", atMs: 7000 });
    expect(engine.getSnapshot().metrics.rawWpm).toBe(12 / 7);
  });

  it("updates idle WPM only when supplied a tick, without owning a clock", () => {
    const engine = createTypingEngine({ targetText: "ab" });
    insert(engine, "a", 0);
    engine.dispatch({ type: "TICK", atMs: 1000 });
    expect(engine.getSnapshot().metrics.rawWpm).toBe(12);
    engine.dispatch({ type: "TICK", atMs: 2000 });
    expect(engine.getSnapshot().metrics.rawWpm).toBe(6);
  });

  it("pauses, rejects edits while paused, and excludes paused duration", () => {
    const engine = createTypingEngine({ targetText: "abcd" });
    insert(engine, "a", 100);
    engine.dispatch({ type: "PAUSE", atMs: 1100 });
    expect(engine.getSnapshot()).toMatchObject({ status: "paused", activeElapsedMs: 1000 });
    const paused = engine.getSnapshot();
    engine.dispatch({ type: "TICK", atMs: 3000 });
    expect(engine.getSnapshot()).toBe(paused);
    expect(insert(engine, "x", 5000)).toMatchObject({ accepted: false, rejectedText: "x" });
    expect(engine.dispatch({ type: "DELETE_BACKWARD", atMs: 6000 }).accepted).toBe(false);
    expect(engine.getSnapshot().counts.backspaces).toBe(0);
    engine.dispatch({ type: "RESUME", atMs: 10_100 });
    engine.dispatch({ type: "TICK", atMs: 11_100 });
    expect(engine.getSnapshot()).toMatchObject({ status: "running", activeElapsedMs: 2000,
      metrics: { rawWpm: 6, correctWpm: 6 } });
    insert(engine, "bcd", 12_100);
    expect(engine.getResult()).toMatchObject({ activeElapsedMs: 3000, completedAtMs: 12_100,
      metrics: { rawWpm: 16, correctWpm: 16 } });
  });

  it("accumulates multiple pause intervals", () => {
    const engine = createTypingEngine({ targetText: "abc" });
    insert(engine, "a", 0);
    for (const event of [
      { type: "PAUSE", atMs: 100 }, { type: "RESUME", atMs: 500 },
      { type: "PAUSE", atMs: 700 }, { type: "RESUME", atMs: 1000 },
      { type: "TICK", atMs: 1500 },
    ] as const) engine.dispatch(event);
    expect(engine.getSnapshot().activeElapsedMs).toBe(800);
  });

  it("ignores invalid lifecycle transitions without starting time", () => {
    const engine = createTypingEngine({ targetText: "ab" });
    expect(engine.dispatch({ type: "PAUSE", atMs: 0 }).accepted).toBe(false);
    expect(engine.dispatch({ type: "RESUME", atMs: 0 }).accepted).toBe(false);
    expect(engine.getSnapshot().status).toBe("ready");
    insert(engine, "a", 0);
    expect(engine.dispatch({ type: "RESUME", atMs: 1 }).accepted).toBe(false);
    engine.dispatch({ type: "PAUSE", atMs: 2 });
    engine.dispatch({ type: "PAUSE", atMs: 3 });
    engine.dispatch({ type: "RESUME", atMs: 5 });
    engine.dispatch({ type: "TICK", atMs: 7 });
    expect(engine.getSnapshot().activeElapsedMs).toBe(4);
  });

  it.each([-1, NaN, Infinity, -Infinity])("rejects timestamp %s before mutation", (atMs) => {
    const engine = createTypingEngine({ targetText: "abc" });
    const snapshot = engine.getSnapshot();
    expect(() => insert(engine, "a", atMs)).toThrow(/atMs/);
    expect(engine.getSnapshot()).toBe(snapshot);
    insert(engine, "a", 0);
    expect(engine.getSnapshot().startedAtMs).toBe(0);
  });

  it("rejects decreasing timestamps, accepts ties, and orders ignored events too", () => {
    const engine = createTypingEngine({ targetText: "abcd" });
    engine.dispatch({ type: "TICK", atMs: 10 });
    expect(() => insert(engine, "a", 9)).toThrow(/nondecreasing/);
    insert(engine, "a", 10);
    insert(engine, "b", 10);
    const snapshot = engine.getSnapshot();
    expect(() => engine.dispatch({ type: "DELETE_BACKWARD", atMs: 8 })).toThrow(/nondecreasing/);
    expect(engine.getSnapshot()).toBe(snapshot);
    expect(snapshot.counts.totalInsertionAttempts).toBe(2);
  });
});

describe("completion, overflow, abort and reset", () => {
  it("progress counts consumed positions, including wrong input, and decreases on deletion", () => {
    const engine = createTypingEngine({ completionPolicy: "target-covered", targetText: "abcd" });
    insert(engine, "Xb");
    expect(engine.getSnapshot().progress).toBe(0.5);
    engine.dispatch({ type: "DELETE_BACKWARD", atMs: 1 });
    expect(engine.getSnapshot().progress).toBe(0.25);
    insert(engine, "bcd", 2);
    expect(engine.getResult()?.progress).toBe(1);
  });

  it("completes exactly at target length regardless of lesson qualification", () => {
    const engine = createTypingEngine({ completionPolicy: "target-covered", targetText: "abc" });
    insert(engine, "XY", 0);
    expect(engine.getResult()).toBeNull();
    insert(engine, "Z", 1000);
    expect(engine.getResult()).toMatchObject({
      status: "completed", completionReason: "target-covered", startedAtMs: 0, completedAtMs: 1000,
      activeElapsedMs: 1000, progress: 1,
      counts: { totalInsertionAttempts: 3, uncorrectedErrors: 3 },
      metrics: { rawWpm: 36, correctWpm: 0, characterAccuracy: 0 },
    });
  });

  it("returns rejected overflow and never scores it", () => {
    const engine = createTypingEngine({ targetText: "ab" });
    expect(insert(engine, "abXYZ", 0)).toEqual({
      accepted: true, insertedAttempts: 2, acceptedText: "ab", rejectedText: "XYZ",
    });
    expect(engine.getResult()?.counts.totalInsertionAttempts).toBe(2);
  });

  it("does not split Unicode clusters at the overflow boundary", () => {
    const engine = createTypingEngine({ targetText: "😀" });
    expect(insert(engine, "😀👩‍💻")).toMatchObject({ acceptedText: "😀", rejectedText: "👩‍💻", insertedAttempts: 1 });
    expect(engine.getResult()?.target.units).toEqual(["😀"]);
  });

  it("returns the correct overflow after revising a preceding grapheme", () => {
    const engine = createTypingEngine({ targetText: "é!" });
    insert(engine, "e");
    expect(insert(engine, "\u0301!EXTRA", 1)).toMatchObject({
      acceptedText: "\u0301!", rejectedText: "EXTRA", insertedAttempts: 2,
    });
    expect(engine.getResult()?.counts).toMatchObject({ totalInsertionAttempts: 3, correctedErrors: 1, uncorrectedErrors: 0 });
  });

  it("requires the final grapheme to be complete in its commit under immediate completion", () => {
    const engine = createTypingEngine({ completionPolicy: "target-covered", targetText: "é" });
    insert(engine, "e");
    const result = engine.getResult();
    expect(result?.counts.uncorrectedErrors).toBe(1);
    expect(insert(engine, "\u0301", 1)).toMatchObject({ accepted: false, rejectedText: "\u0301" });
    expect(engine.getResult()).toBe(result);
  });

  it("completes once and rejects every event type afterward", () => {
    const engine = createTypingEngine({ targetText: "ab" });
    insert(engine, "a", 0);
    insert(engine, "b", 1000);
    const result = engine.getResult();
    const snapshot = engine.getSnapshot();
    const events: TypingEvent[] = [
      { type: "INSERT_TEXT", text: "x", atMs: 2000 },
      ...(["DELETE_BACKWARD", "TICK", "PAUSE", "RESUME", "ABORT"] as const)
        .map((type) => ({ type, atMs: 2000 })),
    ];
    for (const event of events) {
      expect(engine.dispatch(event).accepted).toBe(false);
      expect(engine.getResult()).toBe(result);
      expect(engine.getSnapshot()).toBe(snapshot);
    }
    expect(result?.activeElapsedMs).toBe(1000);
  });

  it.each(["ready", "running", "paused"] as const)("aborts from %s without producing a completed result", (status) => {
    const engine = createTypingEngine({ targetText: "abc" });
    if (status !== "ready") insert(engine, "a", 0);
    if (status === "paused") engine.dispatch({ type: "PAUSE", atMs: 100 });
    engine.dispatch({ type: "ABORT", atMs: 1000 });
    expect(engine.getSnapshot()).toMatchObject({ status: "aborted", abortedAtMs: 1000, pausedAtMs: null,
      activeElapsedMs: status === "ready" ? 0 : status === "paused" ? 100 : 1000 });
    const snapshot = engine.getSnapshot();
    expect(insert(engine, "bc", 2000).accepted).toBe(false);
    engine.dispatch({ type: "TICK", atMs: 3000 });
    expect(engine.getSnapshot()).toBe(snapshot);
    expect(engine.getResult()).toBeNull();
    expectInvariants(snapshot);
  });

  it("reset clears history, pauses, results and timestamp ordering but retains target", () => {
    const engine = createTypingEngine({ targetText: "ab" });
    insert(engine, "X", 100);
    engine.dispatch({ type: "DELETE_BACKWARD", atMs: 101 });
    insert(engine, "a", 102);
    engine.dispatch({ type: "PAUSE", atMs: 103 });
    engine.dispatch({ type: "RESUME", atMs: 200 });
    insert(engine, "b", 300);
    const oldResult = engine.getResult();
    engine.reset();
    expect(engine.getSnapshot()).toMatchObject({ status: "ready", target: { text: "ab" }, startedAtMs: null,
      pausedAtMs: null, completedAtMs: null, activeElapsedMs: 0,
      counts: { totalInsertionAttempts: 0, correctedErrors: 0, backspaces: 0 } });
    expect(engine.getResult()).toBeNull();
    insert(engine, "ab", 0);
    expect(engine.getResult()?.activeElapsedMs).toBe(0);
    expect(engine.getResult()?.mistakes).toEqual([]);
    expect(oldResult?.counts.correctedErrors).toBe(1);
  });

  it("can reset an aborted session with a replacement target", () => {
    const engine = createTypingEngine({ targetText: "abc" });
    engine.dispatch({ type: "ABORT", atMs: 1 });
    engine.reset({ targetText: "😀!" });
    expect(engine.getSnapshot().target.units).toEqual(["😀", "!"]);
    insert(engine, "😀!", 0);
    expect(engine.getResult()?.counts.correctInsertionAttempts).toBe(2);
  });

  it("rejects invalid reset targets without losing the current session", () => {
    const engine = createTypingEngine({ targetText: "ab" });
    insert(engine, "a");
    const snapshot = engine.getSnapshot();
    expect(() => engine.reset({ targetText: "" })).toThrow();
    expect(engine.getSnapshot()).toBe(snapshot);
  });
});

describe("immutability and rapid input", () => {
  it("deeply freezes cached snapshots and keeps old snapshots independent", () => {
    const engine = createTypingEngine({ targetText: "abc" });
    insert(engine, "a");
    const old = engine.getSnapshot();
    expect(engine.getSnapshot()).toBe(old);
    for (const value of [old, old.target, old.target.units, old.typedUnits, old.typedUnits[0], old.counts, old.metrics]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    expect(Reflect.set(old.counts, "totalInsertionAttempts", 999)).toBe(false);
    expect(Reflect.set(old.target.units, "0", "X")).toBe(false);
    insert(engine, "b", 1);
    expect(old.typedUnits).toEqual([{ text: "a", correct: true }]);
    expect(engine.getSnapshot().typedUnits).toHaveLength(2);
    expect(old.counts.totalInsertionAttempts).toBe(1);
  });

  it("deeply freezes final result and mistake history", () => {
    const engine = createTypingEngine({ completionPolicy: "target-covered", targetText: "ab" });
    insert(engine, "Xb");
    const result = engine.getResult()!;
    for (const value of [result, result.mistakes, result.mistakes[0], result.typedUnits,
      result.typedUnits[0], result.target, result.target.units, result.counts, result.metrics]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    expect(Reflect.set(result.mistakes[0], "correctedAtMs", 50)).toBe(false);
    expect(result.mistakes[0].correctedAtMs).toBeNull();
  });

  it("processes rapid ordered input deterministically without coalescing events", () => {
    const engine = createTypingEngine({ targetText: "abcde" });
    for (const [text, atMs] of [["a", 0], ["b", 0], ["c", 0.001], ["d", 0.002], ["e", 0.002]] as const) {
      insert(engine, text, atMs);
      expectInvariants(engine.getSnapshot());
    }
    expect(engine.getResult()).toMatchObject({ activeElapsedMs: 0.002,
      counts: { totalInsertionAttempts: 5, currentCorrectUnits: 5 },
      metrics: { rawWpm: 30_000_000, correctWpm: 30_000_000 } });
  });

  it("maintains invariants through a deterministic mixed event stream", () => {
    const engine = createTypingEngine({ targetText: "abcé👩‍💻\n" });
    let seed = 12345;
    for (let i = 0; i < 1500; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      if (engine.getSnapshot().status === "completed" || engine.getSnapshot().status === "aborted") engine.reset();
      const commands: TypingEvent[] = [
        { type: "INSERT_TEXT", text: ["a", "X", "e", "\u0301", "👩‍💻"][seed % 5], atMs: i },
        { type: "DELETE_BACKWARD", atMs: i }, { type: "TICK", atMs: i },
        { type: "PAUSE", atMs: i }, { type: "RESUME", atMs: i }, { type: "ABORT", atMs: i },
      ];
      engine.dispatch(commands[seed % commands.length]);
      expectInvariants(engine.getSnapshot());
    }
  });

  it("stress: 20,000 rapid inserts segment the target once and only the input tail thereafter", () => {
    const units = 20_000;
    const targetText = "a".repeat(units);
    const segment = vi.spyOn(Intl.Segmenter.prototype, "segment");
    const start = performance.now();
    const engine = createTypingEngine({ targetText });
    for (let i = 0; i < units; i++) insert(engine, "a", i * 60);
    const elapsedMs = performance.now() - start;
    expect(engine.getResult()?.counts.totalInsertionAttempts).toBe(units);
    expect(engine.getResult()?.counts.currentCorrectUnits).toBe(units);
    expect(engine.getResult()?.activeElapsedMs).toBe((units - 1) * 60);
    expect(segment).toHaveBeenCalledTimes(units + 1);
    expect(segment.mock.calls[0][0]).toBe(targetText);
    expect(segment.mock.calls.filter(([text]) => text === targetText)).toHaveLength(1);
    expect(segment.mock.calls.slice(1).every(([text]) => text.length <= 2)).toBe(true);
    const segmentedCodeUnits = segment.mock.calls.reduce((sum, [text]) => sum + text.length, 0);
    expect(segmentedCodeUnits).toBe(units * 3 - 1);
    expectInvariants(engine.getSnapshot());
    console.info(`TypingEngine stress: ${units} inserts; ${elapsedMs.toFixed(2)} ms locally; target segmented once; ${segmentedCodeUnits} total code units submitted to segmentation.`);
  });
});

describe("correct-target completion policy", () => {
  it("keeps a wrong final position running, allows correction and retains historical mistakes", () => {
    const engine = createTypingEngine({ targetText: "hello" });
    insert(engine, "hellp", 0);
    expect(engine.getSnapshot()).toMatchObject({ status: "running", progress: 1, completionPolicy: "require-correct-target" });
    expect(engine.getResult()).toBeNull();
    engine.dispatch({ type: "TICK", atMs: 1000 });
    expect(engine.getSnapshot().activeElapsedMs).toBe(1000);
    engine.dispatch({ type: "DELETE_BACKWARD", atMs: 1100 });
    expect(engine.getSnapshot().currentPosition).toBe(4);
    insert(engine, "o", 1200);
    expect(engine.getResult()).toMatchObject({ completionReason: "correct-target", counts: { totalInsertionAttempts: 6, incorrectInsertionAttempts: 1, correctedErrors: 1, uncorrectedErrors: 0 }, mistakes: [{ text: "p", correctedAtMs: 1100 }] });
    expect(engine.getResult()?.metrics.attemptAccuracy).toBeCloseTo(500 / 6);
    expectInvariants(engine.getSnapshot());
  });
  it("rejects overflow at a full wrong buffer without scoring another position", () => {
    const engine = createTypingEngine({ targetText: "ab" });
    insert(engine, "aX");
    expect(insert(engine, "Y😀", 1)).toMatchObject({ accepted: false, insertedAttempts: 0, rejectedText: "Y😀" });
    expect(engine.getSnapshot().counts.totalInsertionAttempts).toBe(2);
    expectInvariants(engine.getSnapshot());
  });
  it("allows backspacing through an earlier error after covering the target", () => {
    const engine = createTypingEngine({ targetText: "abc" });
    insert(engine, "Xbc");
    for (let atMs = 1; atMs <= 3; atMs++) engine.dispatch({ type: "DELETE_BACKWARD", atMs });
    insert(engine, "abc", 4);
    expect(engine.getResult()?.counts).toMatchObject({ totalInsertionAttempts: 6, correctedErrors: 1, backspaces: 3 });
  });
  it.each([["é", "e", "\u0301"], ["e\u0301", "e", "\u0301"], ["👩‍💻", "👩", "\u200d💻"]])(
    "revises the final grapheme for target %s before completion", (targetText, first, suffix) => {
      const engine = createTypingEngine({ targetText });
      insert(engine, first, 0);
      expect(engine.getSnapshot().status).toBe("running");
      expect(engine.getResult()).toBeNull();
      expect(insert(engine, suffix, 1)).toMatchObject({ acceptedText: suffix, insertedAttempts: 1 });
      expect(engine.getResult()).toMatchObject({ typedUnits: [{ text: first + suffix, correct: true }], counts: { totalInsertionAttempts: 2, correctedErrors: 1, uncorrectedErrors: 0 }, mistakes: [{ text: first, correctedAtMs: 1 }] });
      expectInvariants(engine.getSnapshot());
    },
  );
  it("completes correct ASCII without requiring another event", () => {
    const engine = createTypingEngine({ targetText: "a" });
    insert(engine, "a");
    expect(engine.getResult()?.completionReason).toBe("correct-target");
  });
  it("retains a policy on reset and adopts explicit replacement configuration", () => {
    const engine = createTypingEngine({ targetText: "a", completionPolicy: "target-covered" });
    engine.reset();
    expect(engine.getSnapshot().completionPolicy).toBe("target-covered");
    engine.reset({ targetText: "b" });
    expect(engine.getSnapshot().completionPolicy).toBe("require-correct-target");
  });
});
