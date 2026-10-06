// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import Test from "./Test";
import { prepareWordTest } from "./timedText";
import { createTypingEngine } from "../../engine/typing";

const { addResult } = vi.hoisted(() => ({ addResult: vi.fn() }));
vi.mock("../../data/LearningContext", () => ({ useLearningData: () => ({
  preferences: { difficulty: "Medium", targetWpm: 100 }, addResult, syncStatus: "local", syncError: null,
}) }));

let host: HTMLDivElement, root: Root, clock: number;
function button(label: string) {
  const element = Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find(el => el.textContent?.trim() === label);
  if (!element) throw new Error(`Missing button ${label}`);
  return element;
}
function click(label: string) { act(() => button(label).click()); }
function input() { return host.querySelector<HTMLTextAreaElement>("textarea")!; }
function commit(text: string) {
  act(() => {
    input().focus(); input().dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: text, bubbles: true, cancelable: true }));
  });
}
function backspace() { act(() => input().dispatchEvent(new InputEvent("beforeinput", { inputType: "deleteContentBackward", bubbles: true, cancelable: true }))); }
function words(limit = 10, difficulty = "Medium") {
  click("Words"); click(`${limit} words`);
  const difficultyButton = Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find(el => el.textContent?.startsWith(difficulty));
  act(() => difficultyButton!.click()); click("Start test");
  const s = createTypingEngine(prepareWordTest(difficulty as "Medium", limit)).getSnapshot();
  return s.target.units.slice(0, s.targetUnitCount).join("");
}
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  clock = 100; vi.useFakeTimers(); vi.spyOn(performance, "now").mockImplementation(() => clock); addResult.mockClear();
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  act(() => root.render(<StrictMode><MemoryRouter><Test /></MemoryRouter></StrictMode>));
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Test route integration under StrictMode", () => {
  it("switches Time ↔ Words and preserves both selections", () => {
    click("30 secShort sprint"); click("Words"); click("50 words");
    expect(host.textContent).toContain("Word target"); expect(host.textContent).not.toContain("Test duration");
    click("Time"); expect(button("30 secShort sprint").getAttribute("aria-pressed")).toBe("true");
    click("Words"); expect(button("50 words").getAttribute("aria-pressed")).toBe("true");
  });
  it.each([10,25])("completes %s words at final target position and shows mode", limit => {
    const target = words(limit); expect(document.activeElement).toBe(input());
    expect(host.textContent).toContain(`0 / ${limit} words consumed`); expect(host.querySelector('[role="timer"]')).toBeNull();
    commit(target.slice(0, -1)); expect(host.textContent).not.toContain("Test complete");
    clock = 37_500.25; commit(target.slice(-1));
    expect(host.textContent).toContain("Test complete"); expect(host.textContent).toContain(`${limit} words · Medium difficulty`);
    expect(host.textContent).toContain(`${target.length}typed`); expect(addResult).not.toHaveBeenCalled();
  });
  it("wrong final input finishes, free Backspace before completion retains history", () => {
    const target = words(); commit(target.slice(0,-1) + "");
    backspace(); commit(target.slice(-2,-1)); clock = 2100; commit("X");
    expect(host.textContent).toContain("Test complete"); expect(host.textContent).toContain("1 remaining errors");
    click("Save result"); expect(addResult).toHaveBeenCalledWith(expect.objectContaining({ label: "10 words · Medium", errors: 1 }));
  });
  it("scores committed input once under StrictMode and guards synchronous double save", () => {
    const target = words(); commit(target.slice(0,1)); clock = 2100; commit(target.slice(1));
    const save = button("Save result"); act(() => { save.click(); save.click(); });
    expect(addResult).toHaveBeenCalledTimes(1);
    expect(addResult).toHaveBeenCalledWith(expect.objectContaining({ mode: "test", label: "10 words · Medium", characters: target.length, durationSeconds: 2, errors: 0, accuracy: 100 }));
    expect(host.textContent).toContain("Saved to your progress");
  });
  it("restarts at the chosen setup with zero counters and restores focus on Start", () => {
    const target = words(); commit(target); click("Try another test");
    expect(button("Words").getAttribute("aria-pressed")).toBe("true");
    expect(button("10 words").getAttribute("aria-pressed")).toBe("true"); click("Start test");
    expect(host.textContent).toContain("0 / 10 words consumed"); expect(document.activeElement).toBe(input()); expect(addResult).not.toHaveBeenCalled();
  });
  it("honors difficulty selection and bounds a 100-word DOM", () => {
    const target = words(100,"Hard"); const spans = host.querySelectorAll('[data-position]');
    expect(spans.length).toBe(240); expect(Array.from(spans).map(s => s.textContent).join("")).toBe(target.slice(0,240));
    expect(host.textContent).toContain("100 words · Hard");
    commit(target.slice(0,120)); expect(host.querySelector('[data-position]')?.getAttribute("data-position")).toBe("120");
    backspace(); expect(host.querySelector('[data-position]')?.getAttribute("data-position")).toBe("0");
    expect(host.querySelectorAll('[data-position]').length).toBe(240);
  });
  it("rejects paste and selection/undo operations without starting", () => {
    words(); act(() => {
      input().dispatchEvent(new Event("paste", { bubbles: true, cancelable: true }));
      for (const inputType of ["insertFromPaste", "historyUndo", "deleteByCut"]) input().dispatchEvent(new InputEvent("beforeinput", { inputType, data: "Good", bubbles: true, cancelable: true }));
    });
    expect(host.textContent).toContain("0 / 10 words consumed"); expect(host.querySelector('[data-testid="typed-preview"]')?.textContent).toContain("Click here");
  });
  it("composition previews do not score and final commit + echo scores once", () => {
    words(); act(() => {
      input().dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      input().value = "G"; input().dispatchEvent(new InputEvent("input", { inputType: "insertCompositionText", data: "G", isComposing: true, bubbles: true }));
    });
    expect(host.querySelector('[data-testid="typed-preview"]')?.textContent).toContain("Click here");
    act(() => {
      input().dispatchEvent(new CompositionEvent("compositionend", { data: "G", bubbles: true }));
      input().dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: "G", bubbles: true, cancelable: true }));
      input().dispatchEvent(new InputEvent("input", { inputType: "insertText", data: "G", bubbles: true }));
    });
    expect(host.querySelector('[data-testid="typed-preview"]')?.textContent).toBe("G");
    const target = createTypingEngine(prepareWordTest("Medium",10)).getSnapshot(); clock = 2100;
    commit(target.target.units.slice(1,target.targetUnitCount).join("")); click("Save result");
    expect(addResult).toHaveBeenCalledWith(expect.objectContaining({ errors: 0, accuracy: 100, characters: target.targetUnitCount }));
  });
  it("keeps ready timed countdown and exact expiration after Words → Time", () => {
    click("Words"); click("Time"); click("15 secQuick warm-up"); click("Start test");
    act(() => vi.advanceTimersByTime(1000)); expect(host.textContent).toContain("15s");
    commit("G"); clock += 15_210; act(() => vi.advanceTimersByTime(250));
    expect(host.textContent).toContain("15 sec · Medium difficulty"); click("Save result");
    expect(addResult).toHaveBeenCalledWith(expect.objectContaining({ label: "15 sec · Medium", durationSeconds: 15, characters: 1 }));
  });
  it("cancels without saving and refocuses without changing scoring", () => {
    words(); commit("G"); act(() => button("End test").focus());
    act(() => host.querySelector<HTMLElement>('[data-testid="timed-passage"]')!.click());
    expect(document.activeElement).toBe(input()); expect(host.querySelector('[data-testid="typed-preview"]')?.textContent).toBe("G");
    click("End test"); expect(button("Start test")).toBeTruthy(); expect(addResult).not.toHaveBeenCalled();
  });
});
