// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LearningProvider, useLearningData } from "../../data/LearningContext";
import { TypingKeyboardFeedback } from "./TypingPracticeSurface";
import { createTypingSession, type TypingSession } from "./useTypingSession";

vi.mock("../../lib/supabase", () => ({ supabase: null }));
const storageKey = "typing-tutor.unified-data.v2";
let root: Root, host: HTMLDivElement, session: TypingSession;
function Fixture() {
  const { preferences, updatePreferences } = useLearningData();
  return <TypingKeyboardFeedback session={session} layout={preferences.keyboardLayout}
    showHandGuide={preferences.showHandGuide} onHandGuideChange={enabled => updatePreferences({ showHandGuide: enabled })} />;
}
const mount = () => act(() => root.render(<StrictMode><LearningProvider><Fixture /></LearningProvider></StrictMode>));
const toggle = () => host.querySelector<HTMLButtonElement>('[role="switch"]')!;
const stored = () => JSON.parse(localStorage.getItem(storageKey)!);
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  session = createTypingSession({ targetText: "abc" }, () => 100);
});
afterEach(() => { act(() => root.unmount()); host.remove(); localStorage.clear(); });

it("defaults on for new learners and persists off/on through provider remounts", () => {
  mount();
  expect(toggle().getAttribute("aria-checked")).toBe("true");
  act(() => session.insertText("a"));
  const before = session.feedback.getSnapshot();
  act(() => toggle().click());
  expect(stored().preferences.showHandGuide).toBe(false);
  expect(host.querySelector('[data-testid="glass-hand-guide"]')).toBeNull();
  expect(session.feedback.getSnapshot()).toBe(before);
  act(() => root.render(null)); mount();
  expect(toggle().getAttribute("aria-checked")).toBe("false");
  act(() => toggle().click());
  expect(stored().preferences.showHandGuide).toBe(true);
  expect(host.querySelector('[data-testid="glass-hand-guide"]')).not.toBeNull();
  expect(session.feedback.getSnapshot()).toBe(before);
});

it("migrates existing preferences without dropping history, layout, or lesson completions", () => {
  localStorage.setItem(storageKey, JSON.stringify({ learner: { name: "Learner", email: "" }, results: [],
    completedLessons: [1, 4], preferences: { keyboardLayout: "Pa'O", darkMode: true, targetWpm: 60 } }));
  mount();
  expect(toggle().getAttribute("aria-checked")).toBe("true");
  act(() => toggle().click());
  expect(stored()).toMatchObject({ completedLessons: [1, 4], learner: { name: "Learner" },
    preferences: { keyboardLayout: "Pa'O", darkMode: true, targetWpm: 60, showHandGuide: false } });
});

it("respects an existing disabled preference on first mount", () => {
  localStorage.setItem(storageKey, JSON.stringify({ preferences: { showHandGuide: false } }));
  mount();
  expect(toggle().getAttribute("aria-checked")).toBe("false");
  expect(host.querySelector('[data-testid="glass-hand-guide"]')).toBeNull();
});
