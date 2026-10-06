import { describe, expect, it } from "vitest";
import { createTypingEngine, prepareTypingText, type TypingEngineConfig } from "./index";

const word = (text = "hello world again", wordLimit = 2) => createTypingEngine({ mode: "word-count", wordLimit, targetText: text });
const insert = (e: ReturnType<typeof word>, text: string, atMs: number) => e.dispatch({ type: "INSERT_TEXT", text, atMs });
const remove = (e: ReturnType<typeof word>, atMs: number) => e.dispatch({ type: "DELETE_BACKWARD", atMs });

describe("word configuration and shared preparation", () => {
  it.each([0, -1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, null, undefined, "2"])("rejects invalid wordLimit %s", wordLimit => {
    expect(() => createTypingEngine({ mode: "word-count", wordLimit: wordLimit as number, targetText: "a b" })).toThrow(/positive safe integer/);
  });
  it("rejects insufficient corpus rather than generating text", () => {
    expect(() => word("hello world", 3)).toThrow(/exceeds prepared word count 2/);
    expect(() => word(" \n\t", 1)).toThrow(/prepared word count 0/);
  });
  it.each([
    { mode: "timed", durationMs: 100, textPolicy: "repeat-corpus", wordLimit: 1 },
    { mode: "word-count", wordLimit: 1, durationMs: 100 },
    { mode: "fixed-text", wordLimit: 1 },
    { mode: "fixed-text", durationMs: 100 },
    { mode: "word-count", wordLimit: 1, completionPolicy: "require-correct-target" },
    { mode: "word-count", wordLimit: 1, textPolicy: "repeat-corpus" },
  ])("rejects cross-mode fields at runtime %j", extra => {
    expect(() => createTypingEngine({ targetText: "hello", ...extra } as TypingEngineConfig)).toThrow(/another mode/);
  });
  it("rejects an unknown mode", () => expect(() => createTypingEngine({ mode: "other", targetText: "hello" } as unknown as TypingEngineConfig)).toThrow(/Unknown typing mode/));
  it("preserves the legacy fixed and explicit timed configurations", () => {
    const fixed = createTypingEngine({ targetText: "a" }); insert(fixed, "X", 0); expect(fixed.getResult()).toBeNull();
    const timed = createTypingEngine({ mode: "timed", targetText: "a ", durationMs: 100, textPolicy: "repeat-corpus" });
    insert(timed, "a a ", 0); expect(timed.getSnapshot().status).toBe("running");
    timed.dispatch({ type: "TICK", atMs: 200 }); expect(timed.getResult()?.activeElapsedMs).toBe(100);
  });
  it("reuses immutable prepared segmentation without copying or accepting forged/both targets", () => {
    const target = prepareTypingText("é👩‍💻\nword");
    const e = createTypingEngine({ mode: "word-count", wordLimit: 1, preparedText: target });
    expect(e.getSnapshot().target).toBe(target);
    expect(() => createTypingEngine({ preparedText: { ...target } })).toThrow(/prepareTypingText/);
    expect(() => createTypingEngine({ targetText: "a", preparedText: target } as unknown as TypingEngineConfig)).toThrow(/not both/);
  });
});

describe("word coverage, progress and terminal semantics", () => {
  it("starts ready; empty insertion, tick and empty Backspace do not start", () => {
    const e = word(); insert(e, "", 1); remove(e, 2); e.dispatch({ type: "TICK", atMs: 9000 });
    expect(e.getSnapshot()).toMatchObject({ status: "ready", progress: 0, wordLimit: 2, durationMs: null,
      wordProgress: { targetWordCount: 2, consumedWords: 0, remainingWords: 2, progress: 0 }, startedAtMs: null });
    insert(e, "h", 10_000); expect(e.getSnapshot()).toMatchObject({ status: "running", startedAtMs: 10_000 });
  });
  it("finishes a one-word session at the word end, excluding source suffix whitespace", () => {
    const e = word("hi there  ", 1); insert(e, "h", 100); insert(e, "i", 237.4);
    expect(e.getResult()).toMatchObject({ completionReason: "word-limit-reached", targetUnitCount: 2, activeElapsedMs: 137.4, completedAtMs: 237.4, progress: 1 });
  });
  it("handles ten target words without hardcoded engine options", () => {
    const e = word("one two three four five six seven eight nine ten eleven", 10);
    insert(e, "one ", 0); insert(e, "two three four five six seven eight nine ten", 37_400);
    expect(e.getResult()).toMatchObject({ wordLimit: 10, activeElapsedMs: 37_400, wordProgress: { consumedWords: 10, remainingWords: 0 } });
  });
  it("supports arbitrary positive limits covered by source", () => {
    const e = word("a b c d", 3); insert(e, "a b c", 0); expect(e.getResult()?.wordLimit).toBe(3);
  });
  it("completes atomically on wrong final character; overflow and later events cannot change result", () => {
    const e = word("hello world again", 2); insert(e, "hello worl", 100);
    expect(e.getResult()).toBeNull(); const outcome = insert(e, "X EXTRA", 200);
    expect(outcome).toMatchObject({ insertedAttempts: 1, acceptedText: "X", rejectedText: " EXTRA" });
    const result = e.getResult()!; const snapshot = e.getSnapshot();
    expect(result).toMatchObject({ completionReason: "word-limit-reached", counts: { currentTypedUnits: 11, uncorrectedErrors: 1 }, progress: 1 });
    expect(remove(e, 201).accepted).toBe(false); expect(insert(e, "d", 202).accepted).toBe(false);
    for (const type of ["TICK", "PAUSE", "RESUME", "ABORT"] as const) e.dispatch({ type, atMs: 203 });
    expect(e.getResult()).toBe(result); expect(e.getSnapshot()).toBe(snapshot);
  });
  it("does not count arbitrary typed spaces as completed words", () => {
    const e = word(); insert(e, "    ", 0);
    expect(e.getSnapshot().wordProgress?.consumedWords).toBe(0);
    insert(e, " ", 1); expect(e.getSnapshot().wordProgress?.consumedWords).toBe(1);
    expect(e.getSnapshot().counts.currentCorrectUnits).toBe(0);
  });
  it("advances only at target boundaries, supports free backspace across boundaries", () => {
    const e = word("a  bb\nccc", 3);
    insert(e, "a", 0); expect(e.getSnapshot().wordProgress).toMatchObject({ consumedWords: 1, remainingWords: 2, progress: 1 / 3 });
    remove(e, 1); expect(e.getSnapshot().progress).toBe(0);
    insert(e, "a  b", 2); expect(e.getSnapshot().wordProgress?.consumedWords).toBe(1);
    insert(e, "b", 3); expect(e.getSnapshot().wordProgress?.consumedWords).toBe(2);
    remove(e, 4); expect(e.getSnapshot().wordProgress?.consumedWords).toBe(1);
    insert(e, "b\nccc", 5); expect(e.getResult()?.wordProgress).toMatchObject({ consumedWords: 3, remainingWords: 0, progress: 1 });
  });
  it("time alone never completes word sessions", () => {
    const e = word(); insert(e, "h", 0); e.dispatch({ type: "TICK", atMs: 999_999 });
    expect(e.getSnapshot()).toMatchObject({ status: "running", durationMs: null, remainingMs: null }); expect(e.getResult()).toBeNull();
  });
});

describe("token policy and Unicode", () => {
  it.each([
    ["Hello, world! again.", ["Hello,", "world!", "again."]],
    ["  a   b\t\tc  ", ["a", "b", "c"]],
    ["one\ntwo\r\nthree", ["one", "two", "three"]],
    ["é👩‍💻 word", ["é👩‍💻", "word"]],
    ["မြန်မာ ပအိုဝ်ႏ", ["မြန်မာ", "ပအိုဝ်ႏ"]],
    ["hello... — 👩‍💻", ["hello...", "—", "👩‍💻"]],
  ])("prepares grapheme-aligned whitespace runs for %s", (text, tokens) => {
    const prepared = prepareTypingText(text as string);
    expect(prepared.words.map(w => w.text)).toEqual(tokens);
    for (const w of prepared.words) expect(prepared.units.slice(w.start, w.end).join("")).toBe(w.text);
    const e = word(text as string, prepared.words.length); insert(e, text as string, 0);
    expect(e.getResult()?.counts.uncorrectedErrors).toBe(0);
  });
  it("handles NFC tail revisions inside a word without altering boundaries", () => {
    const e = word("éx👩‍💻 next", 1); insert(e, "e", 100); insert(e, "\u0301", 110); insert(e, "x👩‍💻", 200);
    expect(e.getResult()).toMatchObject({ targetUnitCount: 3, currentPosition: 3,
      counts: { totalInsertionAttempts: 4, correctedErrors: 1, currentCorrectUnits: 3 }, mistakes: [{ correctedAtMs: 110 }] });
  });
  it("final grapheme coverage completes immediately even if a later mark could revise it", () => {
    const e = word("é", 1); insert(e, "e", 0); expect(insert(e, "\u0301", 1).accepted).toBe(false);
    expect(e.getResult()?.counts.uncorrectedErrors).toBe(1);
  });
});

describe("word metrics, clocks, resets and results", () => {
  it("uses exact fractional active duration with historical and current accuracy", () => {
    const e = word("abc def", 2); insert(e, "aX", 1000); remove(e, 1500); insert(e, "bc deX", 38_400.25);
    const r = e.getResult()!;
    expect(r).toMatchObject({ activeElapsedMs: 37_400.25, startedAtMs: 1000, completedAtMs: 38_400.25,
      counts: { totalInsertionAttempts: 8, correctInsertionAttempts: 6, incorrectInsertionAttempts: 2, correctedErrors: 1, backspaces: 1, currentTypedUnits: 7, currentCorrectUnits: 6 },
      mistakes: [{ position: 1, atMs: 1000, correctedAtMs: 1500 }, { position: 6, atMs: 38_400.25, correctedAtMs: null }] });
    expect(r.metrics.rawWpm).toBe(8 * 12_000 / 37_400.25); expect(r.metrics.correctWpm).toBe(6 * 12_000 / 37_400.25);
    expect(r.metrics.attemptAccuracy).toBe(75); expect(r.metrics.characterAccuracy).toBe(600 / 7);
  });
  it("excludes exact paused duration without preventing later word completion", () => {
    const e = word("ab", 1); insert(e, "a", 1000); e.dispatch({ type: "PAUSE", atMs: 2000 });
    expect(insert(e, "b", 3000).accepted).toBe(false); e.dispatch({ type: "RESUME", atMs: 7000 }); insert(e, "b", 8000.5);
    expect(e.getResult()).toMatchObject({ startedAtMs: 1000, completedAtMs: 8000.5, activeElapsedMs: 2000.5 });
  });
  it("rejects invalid and decreasing timestamps without mutation", () => {
    const e = word(); insert(e, "h", 10); const s = e.getSnapshot();
    for (const atMs of [9, -1, Infinity, NaN]) expect(() => insert(e, "e", atMs)).toThrow(/atMs/);
    expect(e.getSnapshot()).toBe(s);
  });
  it("freezes nested prepared text, word progress, mistakes, source identity and result", () => {
    const identity = { type: "corpus" as const, id: "test", version: "v1" };
    const e = createTypingEngine({ mode: "word-count", targetText: "ab", wordLimit: 1, sourceIdentity: identity });
    identity.version = "changed"; insert(e, "Xb", 0); const r = e.getResult()!;
    expect(r.sourceIdentity?.version).toBe("v1");
    for (const value of [r, r.target, r.target.units, r.target.expectedUnits, r.target.words, r.target.words[0], r.counts, r.metrics, r.typedUnits, r.typedUnits[0], r.wordProgress, r.sourceIdentity, r.mistakes, r.mistakes[0]]) expect(Object.isFrozen(value)).toBe(true);
  });
  it("resets the same source/mode and clears all counters/results/clocks", () => {
    const e = word("a b", 2); insert(e, "a X", 100); e.reset();
    expect(e.getSnapshot()).toMatchObject({ status: "ready", wordLimit: 2, progress: 0, counts: { totalInsertionAttempts: 0 }, startedAtMs: null });
    expect(e.getResult()).toBeNull(); insert(e, "a b", 0); expect(e.getResult()?.mistakes).toEqual([]);
  });
  it("invalid reset preserves session and valid reset can change all three modes", () => {
    const e = word(); insert(e, "h", 0); const s = e.getSnapshot();
    expect(() => e.reset({ mode: "word-count", targetText: "a", wordLimit: 2 })).toThrow(); expect(e.getSnapshot()).toBe(s);
    e.reset({ targetText: "a" }); expect(e.getSnapshot().wordLimit).toBeNull(); insert(e, "a", 0); expect(e.getResult()?.completionReason).toBe("correct-target");
    e.reset({ mode: "timed", targetText: "a ", durationMs: 100, textPolicy: "repeat-corpus" }); expect(e.getSnapshot().wordProgress).toBeNull();
    e.reset({ mode: "word-count", targetText: "ab", wordLimit: 1 }); expect(e.getSnapshot().wordProgress?.remainingWords).toBe(1);
  });
  it("aborts before completion and never fabricates a result", () => {
    const e = word(); insert(e, "h", 0); e.dispatch({ type: "ABORT", atMs: 123.4 });
    expect(e.getSnapshot()).toMatchObject({ status: "aborted", abortedAtMs: 123.4, activeElapsedMs: 123.4 });
    expect(insert(e, "ello world", 200).accepted).toBe(false); expect(e.getResult()).toBeNull();
  });
});
