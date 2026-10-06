import { describe, expect, it, vi } from "vitest";
import { createTypingSession } from "./useTypingSession";

describe("React session subscription boundary", () => {
  it("publishes input immediately but timer ticks only notify stats", () => {
    let time = 0;
    const session = createTypingSession({ targetText: "abc" }, () => time);
    const text = vi.fn(); const stats = vi.fn(); const page = vi.fn();
    session.feedback.subscribe(text); session.stats.subscribe(stats); session.result.subscribe(page);
    session.insertText("a");
    expect(text).toHaveBeenCalledTimes(1); expect(page).not.toHaveBeenCalled();
    const feedback = session.feedback.getSnapshot();
    time = 1000; session.tick();
    expect(text).toHaveBeenCalledTimes(1); expect(session.feedback.getSnapshot()).toBe(feedback);
    expect(session.stats.getSnapshot().activeElapsedMs).toBe(1000);
    expect(stats).toHaveBeenCalledTimes(2); expect(page).not.toHaveBeenCalled();
    session.insertText("bc");
    expect(page).toHaveBeenCalledTimes(1); expect(session.result.getSnapshot()?.completionReason).toBe("correct-target");
    time = 2000; session.tick();
    expect(session.result.getSnapshot()?.activeElapsedMs).toBe(1000);
  });
  it("freezes configuration until intentional restart and starts clean", () => {
    const config = { targetText: "abc" };
    const session = createTypingSession(config, () => 100);
    session.insertText("X"); config.targetText = "xyz";
    expect(session.feedback.getSnapshot().snapshot.target.text).toBe("abc");
    session.restart(config);
    expect(session.feedback.getSnapshot()).toMatchObject({ generation: 1, pressedKey: "", snapshot: { status: "ready", target: { text: "xyz" }, counts: { totalInsertionAttempts: 0 } } });
    expect(session.result.getSnapshot()).toBeNull();
    session.insertText("xyz"); expect(session.result.getSnapshot()?.mistakes).toEqual([]);
    session.restart(); expect(session.feedback.getSnapshot().snapshot.target.text).toBe("xyz");
  });
  it("keeps callbacks and cached snapshots stable and unsubscribe works", () => {
    const session = createTypingSession({ targetText: "ab" }, () => 0);
    const insert = session.insertText; const subscribe = session.feedback.subscribe;
    const listener = vi.fn(); const unsubscribe = subscribe(listener);
    expect(session.feedback.getSnapshot()).toBe(session.feedback.getSnapshot());
    session.insertText("a"); unsubscribe(); session.deleteBackward();
    expect(listener).toHaveBeenCalledTimes(1); expect(session.insertText).toBe(insert);
    expect(session.feedback.subscribe).toBe(subscribe);
  });
  it("derives transient keyboard feedback outside the engine and clears the latest highlight", () => {
    const session = createTypingSession({ targetText: "abc" }, () => 0);
    session.insertText("X"); expect(session.feedback.getSnapshot().errorKey).toBe("X");
    session.deleteBackward(); session.insertText("a");
    expect(session.feedback.getSnapshot().pressedKey).toBe("a");
    expect(session.feedback.getSnapshot().errorKey).toBe("");
    session.clearHighlight(); expect(session.feedback.getSnapshot().pressedKey).toBe("");
    expect(session.feedback.getSnapshot().snapshot.counts.incorrectInsertionAttempts).toBe(1);
  });
});

describe("timed publication", () => {
  const config = { mode: "timed" as const, durationMs: 1000, textPolicy: "repeat-corpus" as const, targetText: "ab " };
  it.each(["insertText", "deleteBackward"] as const)("publishes expiration caused by rejected %s even if no timer fired", command => {
    let time = 0;
    const session = createTypingSession(config, () => time); session.insertText("a");
    const page = vi.fn(); session.result.subscribe(page);
    time = 1020;
    if (command === "insertText") expect(session.insertText("b").accepted).toBe(false);
    else expect(session.deleteBackward().accepted).toBe(false);
    expect(page).toHaveBeenCalledTimes(1);
    expect(session.result.getSnapshot()).toMatchObject({ completionReason: "time-expired", completedAtMs: 1000, activeElapsedMs: 1000, counts: { totalInsertionAttempts: 1, backspaces: 0 } });
    expect(session.feedback.getSnapshot().snapshot.status).toBe("completed");
    expect(session.stats.getSnapshot().remainingMs).toBe(0);
  });
  it("tick finalizes once, publishes result and final text, and stops further updates", () => {
    let time = 0; const session = createTypingSession(config, () => time); session.insertText("a");
    const text = vi.fn(); const page = vi.fn(); session.feedback.subscribe(text); session.result.subscribe(page);
    time = 999; session.tick(); expect(text).not.toHaveBeenCalled();
    time = 1210; session.tick(); expect(text).toHaveBeenCalledTimes(1); expect(page).toHaveBeenCalledTimes(1);
    time = 2000; session.tick(); session.insertText("b"); expect(page).toHaveBeenCalledTimes(1);
    expect(session.result.getSnapshot()?.activeElapsedMs).toBe(1000);
  });
  it("keeps paused time out of countdown and restart begins with the same ready duration", () => {
    let time = 0; const session = createTypingSession(config, () => time); session.insertText("a");
    time = 100; session.pause(); time = 5000; session.tick(); expect(session.stats.getSnapshot().remainingMs).toBe(900);
    session.resume(); time = 5900; session.tick(); expect(session.result.getSnapshot()?.completedAtMs).toBe(5900);
    session.restart(); expect(session.stats.getSnapshot()).toMatchObject({ status: "ready", remainingMs: 1000, mode: "timed" });
  });
});

it("publishes word completion once across feedback/stats/result channels, independent of ticks", () => {
  let time = 1000;
  const session = createTypingSession({ mode: "word-count", wordLimit: 2, targetText: "a bb c" }, () => time);
  const page = vi.fn(); session.result.subscribe(page);
  session.insertText("a b"); time = 1500; session.tick();
  expect(session.stats.getSnapshot().wordProgress?.consumedWords).toBe(1);
  time = 1600.25; session.insertText("X");
  expect(page).toHaveBeenCalledTimes(1);
  expect(session.result.getSnapshot()).toMatchObject({ mode: "word-count", completionReason: "word-limit-reached", activeElapsedMs: 600.25 });
  expect(session.feedback.getSnapshot().snapshot.status).toBe("completed");
  expect(session.stats.getSnapshot().wordProgress?.remainingWords).toBe(0);
  session.deleteBackward(); session.insertText("b"); time = 99_000; session.tick(); expect(page).toHaveBeenCalledTimes(1);
});
