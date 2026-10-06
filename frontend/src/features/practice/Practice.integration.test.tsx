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
  keyboardLayout: "QWERTY",
}));
vi.mock("../learning/service", async (original) => ({
  ...(await original<typeof import("../learning/service")>()),
  getLearningService: () => control.service!,
}));
vi.mock("../../data/LearningContext", () => ({
  useLearningData: () => ({
    learner: { name: "A", email: "a@example.com" },
    authenticatedUserId: "A",
    preferences: { keyboardLayout: control.keyboardLayout },
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
  control.keyboardLayout = "QWERTY";
  control.saved.mockClear(); control.completed.mockClear();
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.useRealTimers();
});

describe("Myanmar guide placement", () => {
  it("keeps the compact guide next to the keyboard, toggles details, and preserves progress when hiding the keyboard", () => {
    control.catalog = [lesson(1, "နီ ကာ")];
    control.keyboardLayout = "Pa'O";
    render();
    const passage = host.querySelector('[data-testid="typing-text"]')!;
    const guide = () => host.querySelector('[aria-label="Next input guide"]')!;
    const keyboard = () => host.querySelector('[aria-label="Pa\'O Myanmar keyboard layout"]')!;
    expect(guide().getAttribute("data-guide-mode")).toBe("compact");
    expect(passage.compareDocumentPosition(guide()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(guide().nextElementSibling!.contains(keyboard())).toBe(true);
    expect(host.querySelector('[data-testid="typing-surface"]')!.parentElement)
      .toBe(host.querySelector('[aria-label="Typing keyboard"]')!.parentElement!.parentElement);
    expect(host.querySelector('[aria-label="Keys in input order"]')).toBeNull();
    commit("န");
    expect(guide().querySelector('[data-testid="next-key-hint"]')!.textContent).toBe("Shift + D");
    const snapshotText = passage.textContent;
    const viewport = host.querySelector<HTMLElement>('[aria-label="Scrollable passage"]')!;
    viewport.scrollTop = 40;
    const disclosure = button("Show details")!;
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    act(() => disclosure.click());
    expect(disclosure.getAttribute("aria-expanded")).toBe("true");
    const details = host.querySelector('[aria-label="Next input details"]')!;
    expect(keyboard().compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(host.querySelectorAll('#typing-next-input')).toHaveLength(1);
    expect(details.parentElement!.id).toBe(disclosure.getAttribute("aria-controls"));
    act(() => button("Hide details")!.click());
    expect(host.querySelector('[aria-label="Next input details"]')).toBeNull();
    act(() => button("Hide keyboard")!.click());
    expect(host.querySelector('[aria-label="Typing keyboard"]')).toBeNull();
    expect(guide().getAttribute("data-guide-mode")).toBeNull();
    expect(guide().compareDocumentPosition(passage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(host.querySelector('[aria-label="Keys in input order"]')).not.toBeNull();
    expect(passage.textContent).toBe(snapshotText);
    expect(host.querySelector('[aria-label="Scrollable passage"]')).toBe(viewport);
    expect(viewport.scrollTop).toBe(40);
    expect(host.querySelectorAll('.typing-char.partial')).toHaveLength(1);
    act(() => button("Show keyboard")!.click());
    expect(guide().getAttribute("data-guide-mode")).toBe("compact");
    expect(guide().nextElementSibling!.contains(keyboard())).toBe(true);
    expect(host.querySelectorAll('.typing-char.partial')).toHaveLength(1);
    commit("ီ ကာ");
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(control.saved.mock.calls[0][0]).toMatchObject({ accuracy: 80, errors: 1 });
    expect(host.querySelector('[aria-label="Next input guide"]')).toBeNull();
  });
  it("uses the same compact/detailed switch in an isolated mistake drill", () => {
    control.catalog = [lesson(1, "နီ ကာ")];
    control.keyboardLayout = "Pa'O";
    render(); commit("မ ကာ");
    expect(control.saved).toHaveBeenCalledTimes(1);
    act(() => button("Practice mistakes")!.click());
    expect(host.querySelector('[aria-label="Mistake practice"]')).not.toBeNull();
    expect(host.querySelector('[data-guide-mode="compact"]')).not.toBeNull();
    const drillText = target();
    act(() => button("Hide keyboard")!.click());
    expect(host.querySelector('[data-guide-mode="compact"]')).toBeNull();
    expect(host.querySelector('[aria-label="Keys in input order"]')).not.toBeNull();
    expect(target()).toBe(drillText);
    act(() => button("Show keyboard")!.click());
    expect(host.querySelector('[data-guide-mode="compact"]')).not.toBeNull();
    commit(drillText!);
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(control.completed).not.toHaveBeenCalled();
  });
});

describe("regular Practice guide", () => {
  it.each(["QWERTY", "Pa'O"])("shows the next-input panel in regular Practice with %s selected", (layout) => {
    control.keyboardLayout = layout;
    render("/practice");
    const panel = host.querySelector('[data-guide-mode="compact"]')!;
    expect(panel.querySelector('[data-testid="next-input"]')!.textContent).toBe(target()![0]);
    if (layout === "Pa'O") expect(panel.textContent).toContain("Select QWERTY in Settings");
    else expect(panel.querySelector('[data-testid="next-key-hint"]')!.textContent).toBe(target()![0].toUpperCase());
    expect(host.querySelector('.typing-stats')).toBeNull();
    complete();
    expect(host.querySelector('[aria-label="Next input guide"]')).toBeNull();
    expect(host.querySelector('[aria-label="Practice result"]')!.querySelector('.typing-stats')).not.toBeNull();
    act(() => button("Next text →")!.click());
    expect(host.querySelector('[data-guide-mode="compact"]')).not.toBeNull();
    expect(host.querySelector('.typing-stats')).toBeNull();
  });
});

describe("compact regular practice", () => {
  it.each(["Words", "Sentences", "Paragraph", "Code"])("follows the current line in %s, retains the full target across keyboard toggles, and resets on Restart/Next", (mode) => {
    render("/practice");
    const tab = (label: string) => Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
      .find((item) => item.textContent?.includes(label))!;
    act(() => tab(mode).click());
    const passage = target()!;
    expect(passage.length).toBeGreaterThan(30);
    if (mode === "Paragraph") expect(passage.length).toBeGreaterThan(300);
    if (mode === "Code") expect(passage).toContain("\n  ");
    const typedCount = Math.min(90, passage.length - 1);
    const viewport = host.querySelector<HTMLElement>('[aria-label="Scrollable passage"]')!;
    expect(viewport.classList.contains("typing-passage-window-compact")).toBe(true);
    Object.defineProperty(viewport, "clientHeight", { value: 128 });
    viewport.getBoundingClientRect = () => new DOMRect(0, 100, 280, 128);
    Array.from(host.querySelectorAll<HTMLElement>('.typing-char')).forEach((unit, index) => {
      unit.getBoundingClientRect = () => new DOMRect(0, 116 + Math.floor(index / 10) * 32 - viewport.scrollTop, 10, 32);
    });
    host.scrollTop = 200;
    commit(passage.slice(0, typedCount));
    const followedScroll = 116 + Math.floor(typedCount / 10) * 32 + 32 - 216;
    expect(viewport.scrollTop).toBe(followedScroll);
    expect(host.scrollTop).toBe(200);
    for (const label of ["Hide keyboard", "Show keyboard"]) {
      act(() => button(label)!.click());
      expect(host.querySelector('[aria-label="Scrollable passage"]')).toBe(viewport);
      expect(viewport.classList.contains("typing-passage-window-compact")).toBe(true);
      expect(viewport.scrollTop).toBe(followedScroll);
      expect(target()).toBe(passage);
      expect(host.querySelectorAll('.typing-char.correct')).toHaveLength(typedCount);
    }
    shortcut({ ctrlKey: true, shiftKey: true });
    expect(viewport.scrollTop).toBe(0);
    expect(target()).toBe(passage);
    expect(host.querySelectorAll('.typing-char.correct')).toHaveLength(0);
    complete();
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(control.saved.mock.calls[0][0]).toMatchObject({ accuracy: 100, errors: 0 });
    act(() => button("Next text →")!.click());
    expect(tab(mode).getAttribute("aria-selected")).toBe("true");
    expect(viewport.classList.contains("typing-passage-window-compact")).toBe(true);
    expect(target()).not.toBe(passage);
    expect(target()!.length).toBeGreaterThan(30);
    expect(viewport.scrollTop).toBe(0);
    act(() => tab(mode === "Code" ? "Words" : "Code").click());
    expect(viewport.classList.contains("typing-passage-window-compact")).toBe(true);
    expect(control.saved).toHaveBeenCalledTimes(1);
  });
});

describe("practice feedback timing", () => {
  it.each([{ first: "a", accuracy: "100%", passed: true }, { first: "x", accuracy: "66.67%", passed: false }])(
    "shows metrics only after a finished attempt (passed: $passed), then hides them on restart",
    ({ first, accuracy, passed }) => {
      render();
      const progress = () => host.querySelector<HTMLProgressElement>('progress[aria-label="Passage progress"]');
      expect(host.querySelector('.typing-stats')).toBeNull();
      expect(progress()!.value).toBe(0);
      commit(first);
      expect(progress()!.value).toBeCloseTo(1 / 3);
      expect(host.querySelector('.typing-stats')).toBeNull();
      clock += 2000; commit("bc");
      const result = host.querySelector('[aria-label="Lesson result"]')!;
      expect(result.querySelector('.typing-stats')!.textContent).toContain(accuracy);
      expect(result.querySelector('.typing-stats')!.textContent).toContain("Time");
      expect(progress()).toBeNull();
      expect(control.saved).toHaveBeenCalledTimes(1);
      expect(control.completed).toHaveBeenCalledTimes(passed ? 1 : 0);
      act(() => button(passed ? "Practice again" : "Retry lesson")!.click());
      expect(host.querySelector('.typing-stats')).toBeNull();
      expect(host.querySelector('[aria-label="Lesson result"]')).toBeNull();
      expect(progress()!.value).toBe(0);
      expect(control.saved).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["Restart passage", "Next text →"])("uses progress during regular Practice, final metrics on completion, and resets feedback with %s", (action) => {
    render("/practice");
    const passage = target()!;
    const progress = () => host.querySelector<HTMLProgressElement>('progress[aria-label="Passage progress"]');
    expect(host.querySelector('.typing-stats')).toBeNull();
    expect(progress()!.value).toBe(0);
    commit(passage[0]);
    expect(host.querySelector('.typing-stats')).toBeNull();
    expect(progress()!.value).toBeCloseTo(1 / passage.length);
    act(() => button("Hide keyboard")!.click());
    expect(target()).toBe(passage);
    expect(progress()!.value).toBeCloseTo(1 / passage.length);
    expect(host.querySelector('[aria-label="Scrollable passage"]')).not.toBeNull();
    clock += 2000; commit(passage.slice(1));
    const result = host.querySelector('[aria-label="Practice result"]')!;
    const metrics = result.querySelector('.typing-stats')!;
    expect(metrics.textContent).toContain("100%");
    expect(metrics.textContent).toContain("2sTime");
    expect(progress()).toBeNull();
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(control.completed).not.toHaveBeenCalled();
    clock += 5000; act(() => vi.advanceTimersByTime(5000));
    expect(metrics.textContent).toContain("2sTime");
    act(() => button(action)!.click());
    expect(host.querySelector('.typing-stats')).toBeNull();
    expect(host.querySelector('[aria-label="Practice result"]')).toBeNull();
    expect(progress()!.value).toBe(0);
    expect(document.activeElement).toBe(input());
    if (action === "Restart passage") expect(target()).toBe(passage);
    expect(control.saved).toHaveBeenCalledTimes(1);
  });
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
    expect(host.querySelector('[aria-label="Lesson result"]')!.textContent).toContain("66.67%");
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
    expect(host.querySelector('[aria-label="Lesson result"]')!.querySelector(".typing-stats")!.textContent).toContain("95%");
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
    expect(host.querySelector('[aria-label="Lesson result"]')!.textContent).toContain("94.74%");
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
