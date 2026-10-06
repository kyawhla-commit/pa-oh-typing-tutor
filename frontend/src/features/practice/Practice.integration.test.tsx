// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Practice from "./Practice";
import { createLearningService, type LearningService } from "../learning/service";
import type { LessonRecord } from "../lessons/lessonCatalog";

const control = vi.hoisted(() => ({
  service: null as LearningService | null,
  catalog: [] as LessonRecord[],
  saved: vi.fn(),
  completed: vi.fn(),
}));
vi.mock("../learning/service", async (original) => ({
  ...(await original<typeof import("../learning/service")>()),
  getLearningService: () => control.service!,
}));
vi.mock("../../data/LearningContext", () => ({
  useLearningData: () => ({
    learner: { name: "A", email: "a@example.com" },
    authenticatedUserId: "A",
    preferences: { keyboardLayout: "QWERTY" },
    addResult: control.saved,
    completeLesson: control.completed,
  }),
}));
vi.mock("../lessons/LessonCatalogContext", () => ({
  useLessonCatalog: () => ({ catalog: control.catalog }),
}));

let root: Root, host: HTMLDivElement, clock: number, jobs: (() => void)[];
const lesson = (id: number, content: string, status: LessonRecord["status"] = "Published"): LessonRecord => ({
  id, content, status, title: `Lesson ${id}`, description: "Practice keys",
  category: "Beginner", difficulty: "Beginner", durationMinutes: 1, updatedAt: "2026-10-07T00:00:00Z",
});
function RouteProbe() {
  const location = useLocation();
  return <output data-testid="route">{location.pathname}{location.search}</output>;
}
const render = (path = "/practice?lesson=1") => act(() => root.render(
  <StrictMode><MemoryRouter initialEntries={[path]}><Practice /><RouteProbe /></MemoryRouter></StrictMode>,
));
const input = () => host.querySelector<HTMLTextAreaElement>("textarea")!;
const target = () => host.querySelector('[data-testid="typing-text"]')!.textContent;
const button = (label: string) => Array.from(host.querySelectorAll<HTMLButtonElement>("button"))
  .find((item) => item.textContent?.trim() === label);
const commit = (text: string) => act(() => input().dispatchEvent(new InputEvent("beforeinput", {
  inputType: "insertText", data: text, bubbles: true, cancelable: true,
})));
const complete = () => {
  const text = target()!;
  commit(text[0]); clock += 2000; commit(text.slice(1));
};
const shortcut = (options: KeyboardEventInit = { ctrlKey: true }, source: EventTarget = input()) => {
  const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, ...options });
  act(() => { source.dispatchEvent(event); });
  return event;
};
const flush = () => act(() => { while (jobs.length) jobs.shift()!(); });

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); clock = 100;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  const values = new Map<string, string>(); jobs = [];
  control.service = createLearningService({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  }, (job) => jobs.push(job));
  control.catalog = [lesson(1, "abc"), lesson(2, "def"), lesson(3, "ghi")];
  control.saved.mockClear(); control.completed.mockClear();
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.useRealTimers();
});

describe("restart controls", () => {
  it.each(["ctrlKey", "metaKey"])("resets partial lesson typing with %s + Shift + Enter and preserves its route", (modifier) => {
    render(); commit("a"); clock += 3000;
    act(() => vi.advanceTimersByTime(3000));
    expect(shortcut({ [modifier]: true, shiftKey: true }).defaultPrevented).toBe(true);
    expect(target()).toBe("abc");
    expect(host.querySelector('[data-testid="route"]')!.textContent).toBe("/practice?lesson=1");
    expect(host.querySelectorAll(".typing-char.correct")).toHaveLength(0);
    expect(document.activeElement).toBe(input());
    expect(button("↺ Restart")!.getAttribute("aria-keyshortcuts")).toBe("Control+Shift+Enter Meta+Shift+Enter");
    expect(control.saved).not.toHaveBeenCalled();
    complete();
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(control.completed).toHaveBeenCalledExactlyOnceWith(1);
  });
  it("retries a failed lesson with the shortcut while retaining its saved attempt", () => {
    render(); commit("xbc");
    expect(button("Retry lesson")!.getAttribute("aria-keyshortcuts")).toBe("Control+Shift+Enter Meta+Shift+Enter");
    const original = control.saved.mock.calls[0][0];
    shortcut({ ctrlKey: true, shiftKey: true });
    expect(target()).toBe("abc");
    expect(button("Retry lesson")).toBeUndefined();
    expect(document.activeElement).toBe(input());
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(control.saved.mock.calls[0][0]).toEqual(original);
    complete(); flush();
    expect(control.saved).toHaveBeenCalledTimes(2);
    expect(control.completed).toHaveBeenCalledExactlyOnceWith(1);
    expect(control.service!.getSnapshot("user:A").profile.sessionCount).toBe(2);
  });
  it("replays the same ordinary passage after completion using either the button or shortcut", () => {
    render("/practice"); const text = target(); complete();
    expect(button("Restart passage")!.getAttribute("aria-keyshortcuts")).toBe("Control+Shift+Enter Meta+Shift+Enter");
    act(() => button("Restart passage")!.click());
    expect(target()).toBe(text);
    expect(document.activeElement).toBe(input());
    complete(); shortcut({ ctrlKey: true, shiftKey: true });
    expect(target()).toBe(text);
    expect(host.querySelectorAll(".typing-char.correct")).toHaveLength(0);
    expect(control.saved).toHaveBeenCalledTimes(2);
  });
  it("resets only the mistake drill without changing the original result", () => {
    render(); commit("xbc");
    act(() => button("Practice mistakes")!.click());
    const text = target(); commit(text![0]);
    shortcut({ ctrlKey: true, shiftKey: true });
    expect(target()).toBe(text);
    expect(host.querySelectorAll(".typing-char.correct")).toHaveLength(0);
    expect(document.activeElement).toBe(input());
    complete();
    expect(button("Retry mistakes")!.getAttribute("aria-keyshortcuts")).toBe("Control+Shift+Enter Meta+Shift+Enter");
    shortcut({ ctrlKey: true, shiftKey: true });
    expect(button("Retry mistakes")).toBeUndefined();
    expect(target()).toBe(text);
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(control.completed).not.toHaveBeenCalled();
    act(() => button("Back to result")!.click());
    expect(button("Retry lesson")).not.toBeUndefined();
    expect(control.saved).toHaveBeenCalledTimes(1);
  });
});

describe("next lesson controls", () => {
  it("opens the next published lesson with the button and keeps both completions", () => {
    render("/practice?lesson=1&source=lessons");
    expect(document.activeElement).not.toBe(input());
    expect(button("Next lesson →")).toBeUndefined();
    complete();
    expect(button("Practice again")).not.toBeUndefined();
    expect(button("Next lesson →")!.getAttribute("aria-keyshortcuts")).toBe("Control+Enter Meta+Enter");
    expect(host.textContent).toContain("for next lesson");
    act(() => button("Next lesson →")!.click());
    expect(host.querySelector("h1")!.textContent).toBe("Lesson 2 practice");
    expect(host.querySelector('[data-testid="route"]')!.textContent).toBe("/practice?lesson=2&source=lessons");
    expect(target()).toBe("def");
    expect(document.activeElement).toBe(input());
    expect(host.querySelectorAll(".typing-char.correct")).toHaveLength(0);
    expect(button("Start typing")).not.toBeUndefined();
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(control.completed).toHaveBeenCalledExactlyOnceWith(1);
    complete(); flush();
    expect(control.saved).toHaveBeenCalledTimes(2);
    expect(control.completed.mock.calls).toEqual([[1], [2]]);
    expect(control.service!.getSnapshot("user:A").profile.sessionCount).toBe(2);
  });

  it.each(["ctrlKey", "metaKey"])("advances with %s + Enter and waits for real input on the new lesson", (modifier) => {
    render(); complete();
    expect(shortcut({ [modifier]: true }).defaultPrevented).toBe(true);
    expect(host.querySelector("h1")!.textContent).toBe("Lesson 2 practice");
    expect(target()).toBe("def");
    expect(document.activeElement).toBe(input());
    expect(shortcut({ [modifier]: true, repeat: true }).defaultPrevented).toBe(true);
    expect(host.querySelectorAll(".typing-char.correct")).toHaveLength(0);
    commit("d");
    expect(host.querySelectorAll(".typing-char.correct")).toHaveLength(1);
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(control.completed).toHaveBeenCalledExactlyOnceWith(1);
  });

  it("follows sorted published IDs through gaps and drafts", () => {
    control.catalog = [lesson(7, "ghi"), lesson(2, "draft", "Draft"), lesson(4, "def"), lesson(1, "abc")];
    render(); complete(); shortcut();
    expect(host.querySelector("h1")!.textContent).toBe("Lesson 4 practice");
    expect(target()).toBe("def");
  });

  it("finishes and saves a failed attempt, then passes only a qualifying full retry", () => {
    render(); commit("xbc");
    expect(button("Next lesson →")!.disabled).toBe(true);
    expect(shortcut().defaultPrevented).toBe(false);
    expect(host.querySelector("h1")!.textContent).toBe("Lesson 1 practice");
    expect(host.textContent).toContain("Attempt finished — try again");
    expect(host.textContent).toContain("66.67% accuracy");
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(control.saved).toHaveBeenCalledWith(expect.objectContaining({ accuracy: 66.67, errors: 1 }));
    expect(control.completed).not.toHaveBeenCalled();
    const time = () => Array.from(host.querySelectorAll("p")).find((item) => item.textContent === "Time")!.previousElementSibling!.textContent;
    const finishedTime = time();
    clock += 90000; act(() => vi.advanceTimersByTime(90000));
    expect(time()).toBe(finishedTime);
    expect(control.saved).toHaveBeenCalledTimes(1);
    act(() => button("Retry lesson")!.click());
    expect(target()).toBe("abc");
    expect(document.activeElement).toBe(input());
    complete();
    expect(button("Next lesson →")!.disabled).toBe(false);
    expect(control.saved).toHaveBeenCalledTimes(2);
    expect(control.completed).toHaveBeenCalledExactlyOnceWith(1);
  });

  it("keeps results visible for held keys, IME composition and other editable fields", () => {
    render(); complete();
    expect(shortcut({ ctrlKey: true, repeat: true }).defaultPrevented).toBe(true);
    expect(shortcut({ ctrlKey: true, isComposing: true }).defaultPrevented).toBe(false);
    const other = document.createElement("input"); host.append(other);
    act(() => other.focus());
    expect(shortcut({ ctrlKey: true }, other).defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(other);
    expect(host.querySelector("h1")!.textContent).toBe("Lesson 1 practice");
    expect(button("Next lesson →")).not.toBeUndefined();
    expect(control.saved).toHaveBeenCalledTimes(1);
  });

  it("retains Practice again and gives a return link on the final lesson", () => {
    render("/practice?lesson=3"); complete();
    expect(button("Next lesson →")).toBeUndefined();
    expect(shortcut().defaultPrevented).toBe(false);
    expect(host.textContent).toContain("No next published lesson is available.");
    expect(host.querySelector('a[href="/lessons"]')).not.toBeNull();
    act(() => button("Practice again")!.click());
    expect(target()).toBe("ghi");
    expect(host.querySelectorAll(".typing-char.correct")).toHaveLength(0);
    expect(control.completed).toHaveBeenCalledExactlyOnceWith(3);
  });

  it("updates the next action after a catalog refresh without replacing the completed target", () => {
    control.catalog = [lesson(1, "abc"), lesson(2, "def")];
    render(); complete();
    expect(button("Next lesson →")).not.toBeUndefined();
    control.catalog = [lesson(1, "updated"), lesson(2, "def", "Draft")];
    render();
    expect(target()).toBe("abc");
    expect(button("Next lesson →")).toBeUndefined();
    expect(shortcut().defaultPrevented).toBe(false);
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(control.completed).toHaveBeenCalledExactlyOnceWith(1);
  });

  it("passes at exactly 95% with an uncorrected error and keeps its original accuracy", () => {
    control.catalog = [lesson(1, "a".repeat(20)), lesson(2, "def")];
    render(); commit("X" + "a".repeat(19));
    expect(host.textContent).toContain("95.00% accuracy");
    expect(host.textContent).toContain("1 uncorrected");
    expect(button("Next lesson →")!.disabled).toBe(false);
    expect(control.completed).toHaveBeenCalledExactlyOnceWith(1);
    expect(control.saved).toHaveBeenCalledWith(expect.objectContaining({ accuracy: 95, errors: 1 }));
    shortcut();
    expect(host.querySelector("h1")!.textContent).toBe("Lesson 2 practice");
  });

  it("does not pass a score below 95% even when the live score rounds to 95", () => {
    control.catalog = [lesson(1, "a".repeat(19)), lesson(2, "def")];
    render(); commit("X" + "a".repeat(18));
    expect(host.textContent).toContain("94.74% accuracy");
    expect(Array.from(host.querySelectorAll("p")).find((item) => item.textContent === "Accuracy")!.previousElementSibling!.textContent).toBe("94.74%");
    expect(control.saved).toHaveBeenCalledWith(expect.objectContaining({ accuracy: 94.74, errors: 1 }));
    expect(button("Next lesson →")!.disabled).toBe(true);
    act(() => button("Next lesson →")!.click());
    expect(shortcut().defaultPrevented).toBe(false);
    expect(control.completed).not.toHaveBeenCalled();
    expect(host.querySelector("h1")!.textContent).toBe("Lesson 1 practice");
  });

  it("reviews whitespace and practices mistakes without overwriting or passing the lesson", () => {
    control.catalog = [lesson(1, "a\n  b"), lesson(2, "def")];
    render(); commit("aX Yb");
    act(() => button("Review mistakes")!.click());
    const review = host.querySelector('[aria-label="Mistake review"]')!;
    expect(review.textContent).toContain("↵ (Enter)");
    expect(review.textContent).toContain("␣ (Space)");
    expect(review.textContent).toContain("Typed: X");
    expect(review.textContent).toContain("Typed: Y");
    const originalSaved = control.saved.mock.calls[0][0];
    act(() => button("Practice mistakes")!.click());
    expect(host.querySelector('[aria-label="Mistake practice"]')).not.toBeNull();
    expect(document.activeElement).toBe(input());
    complete();
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(control.completed).not.toHaveBeenCalled();
    expect(shortcut().defaultPrevented).toBe(true);
    expect(host.querySelector("h1")!.textContent).toBe("Lesson 1 practice");
    expect(target()).toBe("a\n  b");
    expect(button("Next lesson →")!.disabled).toBe(true);
    expect(control.saved.mock.calls[0][0]).toEqual(originalSaved);
    expect(document.activeElement).toBe(button("Hide mistakes"));
    flush();
    expect(control.service!.getSnapshot("user:A").profile.sessionCount).toBe(1);
  });

  it("lets ordinary Practice move to the next text after an attempt with mistakes", () => {
    render("/practice");
    const text = target()!;
    commit("X" + text.slice(1));
    expect(button("Next text →")).not.toBeUndefined();
    expect(button("Review mistakes")).not.toBeUndefined();
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(control.completed).not.toHaveBeenCalled();
    shortcut();
    expect(target()).not.toBe(text);
    expect(document.activeElement).toBe(input());
  });
});
