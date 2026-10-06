// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TypingKeyboardFeedback, TypingPracticeSurface } from "./TypingPracticeSurface";
import { createTypingSession, type TypingSession } from "./useTypingSession";

let root: Root, host: HTMLDivElement, session: TypingSession;
const input = () => host.querySelector<HTMLTextAreaElement>("textarea")!;
const button = () => host.querySelector<HTMLButtonElement>("button")!;
const status = () => host.querySelector('[role="status"]')!.textContent;
const typed = () => host.querySelectorAll(".typing-char.correct").length;
const shortcut = (target: EventTarget = document.body, options: KeyboardEventInit = { ctrlKey: true }) => {
  const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, ...options });
  act(() => { target.dispatchEvent(event); });
  return event;
};
const commitWithoutMetadata = (key: string) => act(() => {
  input().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  const before = new InputEvent("beforeinput", { data: null, bubbles: true, cancelable: true });
  input().dispatchEvent(before);
  expect(before.defaultPrevented).toBe(false);
  input().value = key;
  input().setSelectionRange(key.length, key.length);
  input().dispatchEvent(new InputEvent("input", { data: null, bubbles: true }));
});

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.append(host);
  root = createRoot(host);
  session = createTypingSession({ targetText: "abc" }, () => 100);
  act(() => root.render(<StrictMode><TypingPracticeSurface session={session} /></StrictMode>));
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

describe("Myanmar input guidance", () => {
  const mountMyanmar = (targetText = "နို့ ကာ", layout = "Pa'O") => {
    session = createTypingSession({ targetText, completionPolicy: "target-covered" }, () => 100);
    act(() => root.render(<StrictMode>
      <TypingPracticeSurface session={session} layout={layout} />
      <TypingKeyboardFeedback session={session} layout={layout} showCompactGuide={false} />
    </StrictMode>));
    act(() => input().focus());
  };
  const guide = () => host.querySelector('[aria-label="Next input guide"]')!;
  const nextCodes = () => Array.from(host.querySelectorAll('[data-next-key="true"]'), key => key.getAttribute("data-key-code"));

  it("shows Myanmar typography, intact context and the next physical key", () => {
    mountMyanmar();
    expect(host.querySelector('[data-testid="typing-text"]')!.textContent).toBe("နို့ ကာ");
    expect(host.querySelector('[data-testid="typing-text"]')!.className).toContain("font-myanmar");
    expect(host.querySelector('[data-testid="typing-text"]')!.className).toContain("tracking-normal");
    expect(host.querySelector('[data-testid="next-input"]')!.textContent).toBe("နို့");
    expect(host.querySelector('[data-testid="next-input-context"]')!.textContent).toBe("နို့");
    expect(nextCodes()).toEqual(["KeyE"]);
  });

  it("keeps a partially entered group current and highlights remaining combining keys", () => {
    mountMyanmar();
    commitWithoutMetadata("န");
    expect(guide().textContent).toContain("Continue this character group");
    expect(guide().textContent).toContain("dotted circle");
    expect(nextCodes()).toEqual(["KeyD"]);
    expect(host.querySelectorAll(".typing-char.partial")).toHaveLength(1);
    expect(host.querySelectorAll(".typing-char.incorrect")).toHaveLength(0);
    expect(host.querySelectorAll(".typing-char.current")).toHaveLength(0);
    commitWithoutMetadata("ိ"); expect(nextCodes()).toEqual(["KeyK"]);
    commitWithoutMetadata("ု"); expect(nextCodes()).toEqual(["KeyH"]);
    commitWithoutMetadata("့"); expect(nextCodes()).toEqual(["Space"]);
    expect(host.querySelector('[data-testid="next-input"]')!.textContent).toBe("Space ␣");
    expect(typed()).toBe(1);
    expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(4);
    expect(host.querySelector('[data-testid="typing-text"]')!.textContent).toBe("နို့ ကာ");
  });

  it("shows Shift with its key and stops guiding once the attempt finishes", () => {
    mountMyanmar("နီ ကာ");
    commitWithoutMetadata("န");
    expect(nextCodes()).toEqual(["KeyD", "ShiftLeft", "ShiftRight"]);
    expect(guide().textContent).toContain("Shift + D");
    commitWithoutMetadata("ီ");
    expect(nextCodes()).toEqual(["Space"]);
    act(() => session.insertText(" ကာ"));
    expect(session.result.getSnapshot()).not.toBeNull();
    expect(host.querySelector('[aria-label="Next input guide"]')).toBeNull();
    expect(nextCodes()).toEqual([]);
  });

  it("shows expected versus typed with Backspace guidance and updates after correction", () => {
    mountMyanmar(); commitWithoutMetadata("မ");
    expect(guide().textContent).toContain("Correct the previous input");
    expect(guide().textContent).toContain("Expected နို့");
    expect(guide().textContent).toContain("You typed မ");
    expect(nextCodes()).toEqual(["Backspace"]);
    act(() => input().dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true })));
    expect(nextCodes()).toEqual(["KeyE"]);
    expect(guide().textContent).not.toContain("You typed");
  });

  it("keeps the guide mounted while correcting a full strict passage with an earlier mistake", () => {
    session = createTypingSession({ targetText: "န က", completionPolicy: "require-correct-target" }, () => 100);
    act(() => root.render(<TypingPracticeSurface session={session} layout="Pa'O" />));
    const panel = guide();
    act(() => session.insertText("မ က"));
    expect(session.feedback.getSnapshot().snapshot.status).toBe("running");
    expect(guide()).toBe(panel);
    expect(guide().textContent).toContain("Return to the remaining mistakes");
    act(() => session.deleteBackward());
    expect(guide()).toBe(panel);
    expect(guide().textContent).toContain("Type next");
  });

  it("renders neutral IME drafts, scores only the commit once, and clears canceled drafts", () => {
    mountMyanmar("နီ ကာ");
    act(() => {
      input().dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      input().dispatchEvent(new CompositionEvent("compositionupdate", { data: "န", bubbles: true }));
    });
    expect(host.querySelector('[data-testid="composition-preview"]')!.textContent).toBe("န");
    expect(guide().textContent).toContain("not scored yet");
    expect(nextCodes()).toEqual([]);
    expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(0);
    act(() => {
      input().value = "နီ";
      input().dispatchEvent(new InputEvent("input", { inputType: "insertCompositionText", data: "နီ", isComposing: true, bubbles: true }));
    });
    expect(host.querySelector('[data-testid="composition-preview"]')!.textContent).toBe("နီ");
    act(() => {
      input().dispatchEvent(new CompositionEvent("compositionend", { data: "နီ", bubbles: true }));
      input().dispatchEvent(new InputEvent("input", { inputType: "insertText", data: "နီ", bubbles: true }));
    });
    expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(1);
    expect(host.querySelector('[data-testid="composition-preview"]')).toBeNull();
    expect(nextCodes()).toEqual(["Space"]);
    act(() => {
      input().dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      input().dispatchEvent(new CompositionEvent("compositionupdate", { data: "က", bubbles: true }));
      input().blur();
      input().dispatchEvent(new CompositionEvent("compositionend", { data: "က", bubbles: true }));
    });
    expect(session.feedback.getSnapshot().compositionDraft).toBeNull();
    expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(1);
    act(() => {
      input().focus();
      input().dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      input().dispatchEvent(new CompositionEvent("compositionupdate", { data: "က", bubbles: true }));
      session.restart();
    });
    expect(host.querySelector('[data-testid="composition-preview"]')).toBeNull();
    expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(0);
    expect(nextCodes()).toEqual(["KeyE"]);
  });

  it("labels Enter and avoids guessed hints for other layouts and unsupported text", () => {
    mountMyanmar("\nန");
    expect(host.querySelector('[data-testid="next-input"]')!.textContent).toBe("Enter ↵");
    expect(nextCodes()).toEqual(["Enter"]);
    mountMyanmar("န", "QWERTY");
    expect(guide().textContent).toContain("Select the Pa’O keyboard");
    expect(nextCodes()).toEqual([]);
    mountMyanmar("😀 န");
    expect(guide().textContent).toContain("No verified key hint");
    expect(nextCodes()).toEqual([]);
    mountMyanmar("abc", "Pa'O");
    expect(guide().textContent).toContain("Select QWERTY in Settings");
    expect(nextCodes()).toEqual([]);
    expect(host.querySelector('[data-testid="typing-text"]')!.className).toContain("font-mono");
  });
});

describe("compact keyboard guide", () => {
  const mountCompact = (targetText = "နီ ကာ", layout = "Pa'O") => {
    session = createTypingSession({ targetText, completionPolicy: "target-covered" }, () => 100);
    act(() => root.render(<StrictMode>
      <TypingPracticeSurface session={session} layout={layout} showGuide={false} />
      <TypingKeyboardFeedback session={session} layout={layout} />
    </StrictMode>));
  };
  const compact = () => host.querySelector('[data-guide-mode="compact"]')!;
  it("follows the active line within the bounded passage, preserves manual page scrolling, and resets on restart", () => {
    mountCompact("က\nခ\nဂ\nဃ\nင");
    const viewport = host.querySelector<HTMLElement>('[data-testid="passage-viewport"]')!;
    expect(viewport.getAttribute("aria-label")).toBe("Scrollable passage");
    Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 192 });
    viewport.getBoundingClientRect = () => new DOMRect(0, 100, 900, 192);
    Array.from(host.querySelectorAll<HTMLElement>('.typing-char')).forEach((unit, index) => {
      unit.getBoundingClientRect = () => new DOMRect(0, 120 + Math.floor(index / 2) * 56 - viewport.scrollTop, 30, 40);
    });
    host.scrollTop = 220;
    act(() => session.insertText("က\nခ\nဂ\n"));
    expect(viewport.scrollTop).toBe(48);
    expect(host.scrollTop).toBe(220);
    expect(host.querySelector('[data-testid="typing-text"]')!.textContent).toBe("က\nခ\nဂ\nဃ\nင");
    act(() => session.restart());
    expect(viewport.scrollTop).toBe(0);
    expect(host.scrollTop).toBe(220);
    act(() => host.querySelector<HTMLElement>('[data-testid="typing-text"]')!.click());
    expect(document.activeElement).toBe(input());
  });
  it("reveals the current group after a viewport resize without resetting, scoring, or taking focus", () => {
    const observers: { callback: () => void; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
    vi.stubGlobal("ResizeObserver", class {
      observe = vi.fn();
      disconnect = vi.fn();
      constructor(callback: () => void) { observers.push({ callback, observe: this.observe, disconnect: this.disconnect }); }
    });
    mountCompact("က\nခ\nဂ\nဃ\nင");
    act(() => session.insertText("က\nခ\n"));
    const area = host.querySelector<HTMLElement>('[data-testid="passage-viewport"]')!;
    Object.defineProperty(area, "clientHeight", { value: 128 });
    area.getBoundingClientRect = () => new DOMRect(0, 100, 280, 128);
    host.querySelector<HTMLElement>('.typing-char.current')!.getBoundingClientRect = () => new DOMRect(0, 240, 30, 48);
    const passageObserver = [...observers].reverse().find(observer => observer.observe.mock.calls.some(([element]) => element === area))!;
    host.scrollTop = 250;
    const before = session.feedback.getSnapshot();
    const focus = vi.spyOn(input(), "focus");
    act(() => passageObserver.callback());
    expect(area.scrollTop).toBe(72);
    expect(host.scrollTop).toBe(250);
    expect(session.feedback.getSnapshot()).toBe(before);
    expect(focus).not.toHaveBeenCalled();
    act(() => root.render(<div />));
    expect(passageObserver.disconnect).toHaveBeenCalledOnce();
  });
  it.each(["a\nb\nc\nd\ne", "က\nခ\nဂ\nဃ\nင"])("keeps %s bounded and follows typing with the keyboard hidden", (text) => {
    mountCompact(text);
    act(() => root.render(<StrictMode>
      <TypingPracticeSurface session={session} layout="Pa'O" showGuide />
    </StrictMode>));
    const area = host.querySelector<HTMLElement>('[aria-label="Scrollable passage"]')!;
    Object.defineProperty(area, "clientHeight", { value: 192 });
    area.getBoundingClientRect = () => new DOMRect(0, 100, 280, 192);
    Array.from(host.querySelectorAll<HTMLElement>('.typing-char')).forEach((unit, index) => {
      unit.getBoundingClientRect = () => new DOMRect(0, 120 + Math.floor(index / 2) * 56 - area.scrollTop, 30, 40);
    });
    host.scrollTop = 220;
    act(() => session.insertText(text.slice(0, 6)));
    expect(area.scrollTop).toBe(48);
    expect(host.scrollTop).toBe(220);
    expect(host.querySelector('[data-testid="typing-text"]')!.textContent).toBe(text);
    act(() => session.insertText(text.slice(6)));
    expect(session.feedback.getSnapshot().snapshot.status).toBe("completed");
    expect(host.querySelector('[aria-label="Scrollable passage"]')).toBe(area);
    expect(area.scrollTop).toBe(48);
    expect(host.querySelector('[data-testid="typing-text"]')!.textContent).toBe(text);
    act(() => session.restart());
    expect(area.scrollTop).toBe(0);
  });
  it("shows the same guide for Latin typing, including corrections, Shift and completion", () => {
    mountCompact("a A!", "QWERTY");
    const hints = () => Array.from(host.querySelectorAll('[data-next-key="true"]:not([data-key-modifier="true"])'), key => key.textContent!.trim());
    expect(compact().querySelector('[data-testid="next-input"]')!.textContent).toBe("a");
    expect(hints()).toEqual(["a"]);
    act(() => session.insertText("x"));
    expect(compact().textContent).toContain("Correct previous input");
    expect(compact().querySelector('[data-testid="next-key-hint"]')!.textContent).toBe("Backspace");
    expect(hints()).toEqual(["⌫"]);
    act(() => session.deleteBackward());
    act(() => session.insertText("a"));
    expect(compact().querySelector('[data-testid="next-input"]')!.textContent).toBe("Space ␣");
    act(() => session.insertText(" "));
    expect(compact().querySelector('[data-testid="next-key-hint"]')!.textContent).toBe("Shift + A");
    expect(hints()).toEqual(["a"]);
    expect(host.querySelectorAll('[data-next-key="true"]')).toHaveLength(3);
    act(() => Array.from(host.querySelectorAll('button')).find(button => button.textContent === "Show details")!.click());
    expect(host.querySelector('[aria-label="Next input details"]')!.textContent).toContain("US QWERTY");
    expect(host.querySelectorAll('#typing-next-input')).toHaveLength(1);
    act(() => session.insertText("A"));
    expect(compact().querySelector('[data-testid="next-key-hint"]')!.textContent).toBe("Shift + 1");
    expect(hints()).toEqual(["1"]);
    act(() => session.insertText("!"));
    expect(host.querySelector('[aria-label="Next input guide"]')).toBeNull();
    expect(hints()).toEqual([]);
    expect(session.result.getSnapshot()!.counts.incorrectInsertionAttempts).toBe(1);
    expect(host.querySelector('[data-testid="typing-text"]')!.textContent).toBe("a A!");
  });
  it("shows a Latin preview with an honest Pa’O layout mismatch and keeps it when the keyboard is hidden", () => {
    mountCompact("abc", "Pa'O");
    expect(compact().querySelector('[data-testid="next-input"]')!.textContent).toBe("a");
    expect(compact().textContent).toContain("Select QWERTY in Settings");
    expect(host.querySelectorAll('[data-next-key="true"]')).toHaveLength(0);
    act(() => session.insertText("a"));
    act(() => root.render(<StrictMode><TypingPracticeSurface session={session} layout="Pa'O" showGuide /></StrictMode>));
    expect(host.querySelector('[data-testid="next-input"]')!.textContent).toBe("b");
    expect(host.querySelector('[aria-label="Next input guide"]')!.textContent).toContain("Select QWERTY in Settings");
    expect(host.querySelectorAll('.typing-char.correct')).toHaveLength(1);
    expect(host.querySelector('[data-testid="typing-text"]')!.textContent).toBe("abc");
  });
  it("keeps Latin composition drafts neutral and guides only committed input", () => {
    mountCompact("ab", "QWERTY");
    act(() => {
      input().dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      input().dispatchEvent(new CompositionEvent("compositionupdate", { data: "a", bubbles: true }));
    });
    expect(compact().querySelector('[data-testid="composition-preview"]')!.textContent).toBe("a");
    expect(compact().textContent).toContain("Finish composition");
    expect(host.querySelectorAll('[data-next-key="true"]')).toHaveLength(0);
    expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(0);
    act(() => {
      input().dispatchEvent(new CompositionEvent("compositionend", { data: "a", bubbles: true }));
      input().dispatchEvent(new InputEvent("input", { inputType: "insertText", data: "a", bubbles: true }));
    });
    expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(1);
    expect(compact().querySelector('[data-testid="next-input"]')!.textContent).toBe("b");
  });
  it("updates next base/combining output and Shift hints without expanding details or changing source text", () => {
    mountCompact();
    expect(compact().querySelector('[data-testid="next-input"]')!.textContent).toBe("န");
    expect(compact().querySelector('[data-testid="next-key-hint"]')!.textContent).toBe("E");
    act(() => session.insertText("န"));
    expect(compact().querySelector('[data-testid="next-input"]')!.textContent).toBe("◌ီ");
    expect(compact().querySelector('[data-testid="next-key-hint"]')!.textContent).toBe("Shift + D");
    expect(host.querySelector('[aria-label="Next input details"]')).toBeNull();
    expect(input().getAttribute("aria-describedby")).toContain("typing-next-input");
    expect(host.querySelectorAll('#typing-next-input')).toHaveLength(1);
    expect(host.querySelector('[data-testid="typing-text"]')!.textContent).toBe("နီ ကာ");
    act(() => session.insertText("ီ"));
    expect(compact().querySelector('[data-testid="next-input"]')!.textContent).toBe("Space ␣");
  });
  it("shows correction and neutral drafts while suppressing physical key hints during composition", () => {
    mountCompact();
    act(() => input().focus()); commitWithoutMetadata("မ");
    expect(compact().textContent).toContain("Correct previous input");
    expect(compact().querySelector('[data-testid="next-key-hint"]')!.textContent).toBe("Backspace");
    act(() => {
      input().dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      input().dispatchEvent(new CompositionEvent("compositionupdate", { data: "န", bubbles: true }));
    });
    expect(compact().textContent).toContain("Draft · not scored yet");
    expect(compact().querySelector('[data-testid="composition-preview"]')!.textContent).toBe("န");
    expect(compact().querySelector('[data-testid="next-key-hint"]')!.textContent).toBe("Finish composition");
    expect(host.querySelector('[data-next-key="true"]')).toBeNull();
    expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(1);
    act(() => input().blur());
    expect(compact().querySelector('[data-testid="composition-preview"]')).toBeNull();
  });
  it("provides honest fallback instructions for unknown mappings and Latin layout mismatches", () => {
    mountCompact("နီ ကာ", "QWERTY");
    expect(compact().querySelector('[data-testid="next-input"]')!.textContent).toBe("နီ");
    expect(compact().querySelector('[data-testid="next-key-hint"]')!.textContent).toBe("Use your input method");
    mountCompact("abc");
    expect(compact().querySelector('[data-testid="next-input"]')!.textContent).toBe("a");
    expect(compact().textContent).toContain("Select QWERTY in Settings");
    expect(host.querySelector('[aria-label="Typing keyboard"]')).not.toBeNull();
    mountCompact("😀", "Pa'O");
    expect(compact().textContent).toContain("Use your input method");
    expect(compact().textContent).not.toContain("Select QWERTY");
  });
});

describe("restart shortcut", () => {
  const mountRestart = () => {
    const restart = vi.fn(() => session.restart());
    act(() => root.render(<StrictMode><TypingPracticeSurface session={session} onRestart={restart} /></StrictMode>));
    return restart;
  };
  it.each(["ctrlKey", "metaKey"])("restarts with %s + Shift + Enter once without scoring the shortcut", (modifier) => {
    const restart = mountRestart();
    act(() => input().focus()); commitWithoutMetadata("a");
    const run = session.run.getSnapshot().id;
    expect(shortcut(input(), { [modifier]: true, shiftKey: true }).defaultPrevented).toBe(true);
    expect(restart).toHaveBeenCalledTimes(1);
    expect(session.run.getSnapshot().id).not.toBe(run);
    expect(session.feedback.getSnapshot().generation).toBe(1);
    expect(session.feedback.getSnapshot().snapshot).toMatchObject({ status: "ready", currentPosition: 0, activeElapsedMs: 0 });
    expect(document.activeElement).toBe(input());
    expect(shortcut(input(), { [modifier]: true, shiftKey: true, repeat: true }).defaultPrevented).toBe(true);
    expect(restart).toHaveBeenCalledTimes(1);
    expect(session.feedback.getSnapshot().generation).toBe(1);
    commitWithoutMetadata("a");
    expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(1);
    expect(typed()).toBe(1);
  });
  it("ignores other editable fields, composition and Alt-modified keys", () => {
    const restart = mountRestart();
    act(() => input().focus()); commitWithoutMetadata("a");
    for (const kind of ["input", "textarea", "select", "div"]) {
      const other = document.createElement(kind);
      if (kind === "div") other.setAttribute("contenteditable", "true");
      host.append(other);
      expect(shortcut(other, { ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(false);
    }
    for (const extra of [{ isComposing: true }, { keyCode: 229 }, { altKey: true }]) {
      expect(shortcut(input(), { ctrlKey: true, shiftKey: true, ...extra }).defaultPrevented).toBe(false);
    }
    act(() => input().dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true })));
    expect(shortcut(input(), { ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(false);
    act(() => input().dispatchEvent(new CompositionEvent("compositionend", { data: "b", bubbles: true })));
    expect(typed()).toBe(2);
    expect(restart).not.toHaveBeenCalled();
  });
  it("restarts a completed passage instead of advancing and cleans up on unmount", () => {
    const restart = vi.fn(() => session.restart()), next = vi.fn();
    act(() => root.render(<StrictMode><TypingPracticeSurface session={session} onRestart={restart} onNext={next} /></StrictMode>));
    act(() => session.insertText("abc"));
    const completed = session.result.getSnapshot();
    expect(shortcut(document.body, { ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true);
    expect(next).not.toHaveBeenCalled();
    expect(restart).toHaveBeenCalledTimes(1);
    expect(completed!.status).toBe("completed");
    expect(session.feedback.getSnapshot().snapshot.target.text).toBe("abc");
    act(() => root.render(null));
    expect(shortcut(document.body, { ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(false);
    expect(restart).toHaveBeenCalledTimes(1);
  });
});

describe("Practice focus and browser input", () => {
  it("focuses and restarts without requesting page scrolling, and never refocuses per character", () => {
    const nativeFocus = vi.spyOn(input(), "focus");
    act(() => button().click());
    expect(nativeFocus).toHaveBeenLastCalledWith({ preventScroll: true });
    nativeFocus.mockClear();
    commitWithoutMetadata("a"); commitWithoutMetadata("b");
    expect(nativeFocus).not.toHaveBeenCalled();
    act(() => session.restart());
    expect(nativeFocus).toHaveBeenCalledTimes(1);
    expect(nativeFocus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(input());
    nativeFocus.mockRestore();
  });

  it("starts only on committed input after the explicit focus button", () => {
    expect(document.activeElement).not.toBe(input());
    act(() => button().click());
    expect(document.activeElement).toBe(input());
    expect(status()).toContain("Ready");
    expect(session.feedback.getSnapshot().snapshot.status).toBe("ready");
    commitWithoutMetadata("a");
    expect(typed()).toBe(1);
    expect(session.feedback.getSnapshot().snapshot.status).toBe("running");
  });

  it("clicking the passage focuses input and updates its visible feedback", () => {
    act(() => host.querySelector<HTMLElement>('[data-testid="typing-text"]')!.click());
    expect(document.activeElement).toBe(input());
    commitWithoutMetadata("a");
    expect(typed()).toBe(1);
    expect(input().value).toBe("");
  });

  it("refocuses without losing progress and restart resets once under StrictMode", () => {
    act(() => button().click()); commitWithoutMetadata("a");
    act(() => input().blur());
    expect(status()).toContain("Click Continue typing");
    act(() => button().click()); commitWithoutMetadata("b");
    expect(typed()).toBe(2);
    expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(2);
    act(() => session.restart());
    expect(document.activeElement).toBe(input());
    expect(typed()).toBe(0);
    commitWithoutMetadata("a");
    expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(1);
  });

  it.each(["ctrlKey", "metaKey"])("focuses with %s + Enter without starting the clock", (modifier) => {
    expect(shortcut(document.body, { [modifier]: true }).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input());
    expect(status()).toContain("Ready");
    expect(session.feedback.getSnapshot().snapshot.status).toBe("ready");
    expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(0);
    expect(button().getAttribute("aria-keyshortcuts")).toBe("Control+Enter Meta+Enter");
  });

  it("continues existing progress and consumes shortcut repeats without scoring Enter", () => {
    shortcut(); commitWithoutMetadata("a");
    act(() => input().blur());
    shortcut();
    expect(document.activeElement).toBe(input());
    expect(typed()).toBe(1);
    expect(shortcut(input()).defaultPrevented).toBe(true);
    expect(shortcut(input(), { ctrlKey: true, repeat: true }).defaultPrevented).toBe(true);
    expect(input().value).toBe("");
    commitWithoutMetadata("b");
    expect(typed()).toBe(2);
    expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(2);
  });

  it.each(["input", "textarea", "select", "contenteditable"])("leaves another %s in control", (kind) => {
    const other = document.createElement(kind === "contenteditable" ? "div" : kind);
    if (kind === "contenteditable") {
      other.setAttribute("contenteditable", "true");
      other.tabIndex = 0;
    }
    host.append(other);
    act(() => other.focus());
    const event = shortcut(other);
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(other);
    expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(0);
  });

  it("ignores IME composition and modified alternatives", () => {
    for (const options of [{ ctrlKey: true, isComposing: true }, { ctrlKey: true, keyCode: 229 },
      { ctrlKey: true, altKey: true }, { ctrlKey: true, shiftKey: true }, {}]) {
      expect(shortcut(document.body, options).defaultPrevented).toBe(false);
      expect(document.activeElement).not.toBe(input());
    }
    act(() => input().focus());
    act(() => input().dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true })));
    expect(shortcut(input()).defaultPrevented).toBe(false);
    act(() => input().dispatchEvent(new CompositionEvent("compositionend", { data: "a", bubbles: true })));
    expect(shortcut(input()).defaultPrevented).toBe(true);
    expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(1);
  });

  it("ignores completed sessions and removes the shortcut when the surface unmounts", () => {
    act(() => session.insertText("abc"));
    expect(session.feedback.getSnapshot().snapshot.status).toBe("completed");
    expect(shortcut().defaultPrevented).toBe(false);
    act(() => session.restart());
    act(() => root.render(null));
    expect(shortcut().defaultPrevented).toBe(false);
  });

  it("explains full coverage with remaining mistakes and completes after correction", () => {
    shortcut();
    commitWithoutMetadata("x"); commitWithoutMetadata("b"); commitWithoutMetadata("c");
    act(() => input().blur());
    expect(session.feedback.getSnapshot().snapshot.status).toBe("running");
    expect(status()).toBe("Passage filled — 1 mistake left to correct");
    expect(button().textContent).toBe("Correct mistakes");
    expect(host.querySelector("#typing-help")!.textContent).toContain("return to the red characters");
    act(() => button().click());
    expect(document.activeElement).toBe(input());
    expect(status()).toBe("Passage filled — 1 mistake left to correct");
    act(() => {
      for (let index = 0; index < 3; index++) {
        input().dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true }));
      }
    });
    commitWithoutMetadata("a"); commitWithoutMetadata("b"); commitWithoutMetadata("c");
    expect(session.feedback.getSnapshot().snapshot.status).toBe("completed");
    expect(status()).toBe("Practice complete");
    expect(host.querySelector("button")).toBeNull();
    expect(host.querySelector("#typing-help")!.textContent).toBe("You finished this passage.");
    expect(session.feedback.getSnapshot().snapshot.metrics.attemptAccuracy).toBeLessThan(100);
    expect(session.result.getSnapshot()).not.toBeNull();
  });
});
