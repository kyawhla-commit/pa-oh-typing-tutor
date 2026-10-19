// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TypingKeyboardFeedback, TypingPracticeSurface } from "../../features/typing/TypingPracticeSurface";
import { createTypingSession, type TypingSession } from "../../features/typing/useTypingSession";

let root: Root, host: HTMLDivElement, session: TypingSession, measuredWidth: number;
let observers: { callback: () => void; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[];
let motionListener: (() => void) | undefined, reduced: boolean;
const mount = (text = "asdf J", layout = "QWERTY") => {
  session = createTypingSession({ targetText: text }, () => 100);
  act(() => root.render(<StrictMode><TypingPracticeSurface session={session} layout={layout} showGuide={false} />
    <TypingKeyboardFeedback session={session} layout={layout} /></StrictMode>));
};
const input = () => host.querySelector<HTMLTextAreaElement>("textarea")!;
const toggle = () => host.querySelector<HTMLButtonElement>('[role="switch"][aria-label="Show Hand Guide"]')!;
const active = () => Array.from(host.querySelectorAll('[data-finger][data-active="true"]'), finger => finger.getAttribute("data-finger"));
const key = (code: string) => host.querySelector<HTMLElement>(`[data-key-code="${code}"]`)!;
const commit = (text: string) => act(() => input().dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: text, bubbles: true, cancelable: true })));
const finger = (id: string) => host.querySelector<SVGGElement>(`[data-finger="${id}"]`)!;
const fingerPose = (id: string) => Array.from(finger(id).querySelectorAll("[transform]"), node => node.getAttribute("transform")).join(" ");
const fingertip = (id: string, source: [number, number]) => {
  let [x, y] = source;
  let node: Element | null = finger(id).querySelector(".glass-finger-surface");
  while (node && node.tagName.toLowerCase() !== "svg") {
    const transforms = Array.from((node.getAttribute("transform") ?? "").matchAll(/([a-zA-Z]+)\(([^)]+)\)/g)).reverse();
    for (const [, type, values] of transforms) {
      const [a, b] = values.split(/[ ,]+/).map(Number);
      if (type === "translate") { x += a; y += b ?? 0; }
      if (type === "scale") { x *= a; y *= b ?? a; }
      if (type === "rotate") {
        const radians = a * Math.PI / 180;
        [x, y] = [x * Math.cos(radians) - y * Math.sin(radians), x * Math.sin(radians) + y * Math.cos(radians)];
      }
    }
    node = node.parentElement;
  }
  return { x, y };
};
const expectTipOnKey = (id: string, source: [number, number], code: string) => {
  const position = fingertip(id, source);
  const box = key(code).getBoundingClientRect();
  const keyboard = host.querySelector(".keyboard-keys")!.getBoundingClientRect();
  expect(position.x).toBeCloseTo(box.x - keyboard.x + box.width / 2);
  expect(position.y).toBeCloseTo(box.y - keyboard.y + box.height * .6);
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  measuredWidth = 900; observers = []; reduced = false; motionListener = undefined;
  vi.stubGlobal("ResizeObserver", class {
    observe = vi.fn(); disconnect = vi.fn();
    constructor(callback: () => void) { observers.push({ callback, observe: this.observe, disconnect: this.disconnect }); }
  });
  vi.stubGlobal("matchMedia", () => ({ get matches() { return reduced; },
    addEventListener: (_event: string, listener: () => void) => { motionListener = listener; }, removeEventListener: vi.fn(),
  }));
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function(this: HTMLElement) {
    if (this.classList.contains("keyboard-keys")) return new DOMRect(30, 200, measuredWidth, 280);
    if (this.dataset.keyCode) {
      const row = this.parentElement!;
      const rowIndex = Array.from(row.parentElement!.children).indexOf(row);
      const col = Array.from(row.children).indexOf(this);
      return new DOMRect(30 + col * measuredWidth / 15, 200 + rowIndex * 56, measuredWidth / 16, 50);
    }
    return new DOMRect();
  });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("starts enabled, toggles with an accessible native button, and disposes the decorative overlay", () => {
  mount();
  expect(toggle().getAttribute("aria-checked")).toBe("true");
  const overlay = host.querySelector<HTMLElement>('[data-testid="glass-hand-guide"]')!;
  expect(overlay.style.pointerEvents).toBe("none");
  expect(overlay.getAttribute("aria-hidden")).toBe("true");
  expect(overlay.querySelector("button, input, [tabindex] ")).toBeNull();
  expect(host.querySelectorAll('[data-finger]')).toHaveLength(10);
  const before = session.feedback.getSnapshot();
  const keyboardObserver = observers.filter(observer => observer.observe.mock.calls.some(([element]) => element.classList.contains("keyboard-keys"))).at(-1)!;
  act(() => { toggle().focus(); toggle().click(); });
  expect(toggle().getAttribute("aria-checked")).toBe("false");
  expect(document.activeElement).toBe(toggle());
  expect(host.querySelector('[data-testid="glass-hand-guide"]')).toBeNull();
  expect(host.querySelector('[data-testid="finger-instruction"]')).toBeNull();
  expect(host.querySelector("animate, animateTransform")).toBeNull();
  expect(keyboardObserver.disconnect).toHaveBeenCalledOnce();
  expect(session.feedback.getSnapshot()).toBe(before);
  expect(key("KeyA").dataset.nextKey).toBe("true");
  act(() => toggle().click());
  expect(host.querySelector('[data-testid="glass-hand-guide"]')).not.toBeNull();
});

it("updates the key and finger through real input without changing scoring, focus, or keyboard clicks", () => {
  mount();
  act(() => input().focus());
  expect(active()).toEqual(["left-little"]);
  expect(key("KeyA").dataset.guideFinger).toBe("left-little");
  expect(key("KeyA").style.getPropertyValue("--finger-color")).toBe("#2563ff");
  commit("a");
  expect(active()).toEqual(["left-ring"]);
  expect(key("KeyS").dataset.guideFinger).toBe("left-ring");
  expect(host.querySelector('[data-testid="finger-name"]')!.textContent).toBe("Left ring finger");
  expect(document.activeElement).toBe(input());
  expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(1);
  const clicked = vi.fn(); host.addEventListener("click", clicked);
  act(() => key("Space").click());
  expect(clicked).toHaveBeenCalledOnce();
  expect(session.feedback.getSnapshot().snapshot.target.text).toBe("asdf J");
  act(() => toggle().click());
  commit("sdf J");
  expect(session.result.getSnapshot()?.metrics.attemptAccuracy).toBe(100);
  expect(host.querySelector('[data-next-key="true"]')).toBeNull();
});

it("follows every remaining Myanmar/Pa-Oh keystroke, including Shift and Space", () => {
  mount("နီ ꩻ", "Pa'O");
  expect(active()).toEqual(["left-middle"]);
  expect(key("KeyE").dataset.guideFinger).toBe("left-middle");
  commit("န");
  expect(active()).toEqual(["left-middle", "right-little"]);
  expect(key("KeyD").dataset.guideFinger).toBe("left-middle");
  expect(key("ShiftRight").dataset.guideFinger).toBe("right-little");
  expect(key("ShiftLeft").dataset.guideFinger).toBeUndefined();
  expect(host.querySelector('[data-testid="finger-instruction"]')!.textContent).toContain("Hold right Shift");
  commit("ီ"); expect(active()).toEqual(["right-thumb"]);
  commit(" "); expect(active()).toEqual(["right-middle"]);
  expect(key("Comma").dataset.guideFinger).toBe("right-middle");
  commit("ꩻ");
  expect(active()).toEqual([]);
  expect(host.querySelector('[data-testid="finger-instruction"]')).toBeNull();
  expect(session.feedback.getSnapshot().snapshot.status).toBe("completed");
});

it("guides Backspace for mistakes and resumes the expected finger after correction", () => {
  mount(); commit("x");
  expect(active()).toEqual(["right-little"]);
  expect(key("Backspace").dataset.guideFinger).toBe("right-little");
  act(() => input().dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true })));
  expect(active()).toEqual(["left-little"]);
  expect(session.feedback.getSnapshot().snapshot.counts.incorrectInsertionAttempts).toBe(1);
});

it("suspends hints during composition and never guesses a key for unsupported text", () => {
  mount("နီ က", "Pa'O");
  act(() => {
    input().dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    input().dispatchEvent(new CompositionEvent("compositionupdate", { data: "န", bubbles: true }));
  });
  expect(active()).toEqual([]);
  expect(host.querySelector('[data-guide-finger]')).toBeNull();
  expect(host.querySelector('[data-testid="finger-name"]')!.textContent).toBe("Finish composition");
  act(() => input().dispatchEvent(new CompositionEvent("compositionend", { data: "နီ", bubbles: true })));
  expect(active()).toEqual(["right-thumb"]);
  expect(session.feedback.getSnapshot().snapshot.counts.totalInsertionAttempts).toBe(1);
  act(() => session.restart({ targetText: "😀" }));
  expect(active()).toEqual([]);
  expect(host.querySelector('[data-testid="finger-name"]')!.textContent).toBe("Follow your input method");
});

it("remeasures keys on resize, keeps focus and session state, and simplifies small keyboards", () => {
  mount();
  act(() => input().focus());
  const svg = () => host.querySelector(".glass-hands")!;
  const beforeTransform = host.querySelector('[data-hand="left"]')!.getAttribute("transform");
  const before = session.feedback.getSnapshot();
  measuredWidth = 420;
  act(() => observers.filter(observer => !observer.disconnect.mock.calls.length).forEach(observer => observer.callback()));
  expect(svg().getAttribute("viewBox")).toMatch(/^0 0 420 /);
  expect(host.querySelector('[data-hand="left"]')!.getAttribute("transform")).not.toBe(beforeTransform);
  expect(svg().getAttribute("data-motion")).toBe("reduced");
  expect(svg().querySelector("animate, animateTransform")).toBeNull();
  expect(document.activeElement).toBe(input());
  expect(session.feedback.getSnapshot()).toBe(before);
});

it("omits reaching animations when reduced motion is requested", () => {
  reduced = true; mount("q");
  expect(host.querySelector(".glass-hands")!.getAttribute("data-motion")).toBe("reduced");
  expect(host.querySelector("animate, animateTransform")).toBeNull();
  expect(active()).toEqual(["left-little"]);
  expectTipOnKey("left-little", [150, 290], "KeyQ");
});

it("transitions finger poses with the expected key and removes motion when the preference changes", () => {
  mount("qw");
  const stationaryMiddle = fingerPose("left-middle");
  const activeLittle = fingerPose("left-little");
  expect(finger("left-little").querySelectorAll("animateTransform")).toHaveLength(2);
  expect(finger("left-little").querySelector("animateTransform")!.getAttribute("repeatCount")).toBe("1");
  expectTipOnKey("left-little", [150, 290], "KeyQ");
  commit("q");
  expect(fingerPose("left-little")).not.toBe(activeLittle);
  expectTipOnKey("left-little", [150, 290], "KeyA");
  expectTipOnKey("left-ring", [313, 263], "KeyW");
  expect(fingerPose("left-middle")).toBe(stationaryMiddle);
  expect(finger("left-little").querySelector("animateTransform")).toBeNull();
  expect(finger("left-ring").querySelectorAll("animateTransform")).toHaveLength(2);
  reduced = true;
  act(() => motionListener?.());
  expect(host.querySelector("animateTransform")).toBeNull();
  expect(active()).toEqual(["left-ring"]);
});

it("redirects ယ to B with opposite Shift, then follows လ to V and returns home on completion", () => {
  mount("ယလ", "Pa'O");
  expect(active()).toEqual(["left-index", "right-little"]);
  expect(key("KeyB").dataset.guideFinger).toBe("left-index");
  expect(key("ShiftRight").dataset.guideFinger).toBe("right-little");
  expect(finger("left-index").dataset.targetKey).toBe("KeyB");
  expectTipOnKey("left-index", [681, 263], "KeyB");
  expectTipOnKey("right-little", [150, 290], "ShiftRight");
  // Remeasuring keeps the same destination, rather than restarting a nudge home.
  measuredWidth = 420;
  act(() => observers.filter(observer => !observer.disconnect.mock.calls.length).forEach(observer => observer.callback()));
  expectTipOnKey("left-index", [681, 263], "KeyB");
  expect(finger("left-index").querySelector("animateTransform")).toBeNull();
  commit("ယ");
  expect(active()).toEqual(["left-index"]);
  expectTipOnKey("left-index", [681, 263], "KeyV");
  expectTipOnKey("right-little", [150, 290], "Semicolon");
  commit("လ");
  expect(active()).toEqual([]);
  expectTipOnKey("left-index", [681, 263], "KeyF");
});
