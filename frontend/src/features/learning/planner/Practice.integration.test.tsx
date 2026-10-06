// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import Practice from "../../practice/Practice";
import { createLearningService, type LearningService } from "../service";
import { evidence, profileOf, completed } from "../testFixtures";
import { saveProfile } from "../storage";
import { saveMastery } from "../transfer/storage";
import { emptyMastery } from "../transfer/progression";
const control = vi.hoisted(() => ({
  service: null as LearningService | null,
  subject: "A",
  saved: vi.fn(),
}));
vi.mock("../service", async (original) => ({
  ...(await original<typeof import("../service")>()),
  getLearningService: () => control.service!,
}));
vi.mock("../../../data/LearningContext", () => ({
  useLearningData: () => ({
    learner: { name: control.subject, email: `${control.subject}@example.com` },
    authenticatedUserId: control.subject,
    preferences: { keyboardLayout: "QWERTY" },
    addResult: control.saved,
    completeLesson: vi.fn(),
  }),
}));
vi.mock("../../lessons/LessonCatalogContext", () => ({
  useLessonCatalog: () => ({ catalog: [] }),
}));
let host: HTMLDivElement,
  root: Root,
  clock: number,
  jobs: (() => void)[],
  values: Map<string, string>;
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    values.set(key, value);
  },
};
const render = () =>
  act(() =>
    root.render(
      <StrictMode>
        <MemoryRouter>
          <Practice />
        </MemoryRouter>
      </StrictMode>,
    ),
  );
const button = (name: string) =>
  Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => b.textContent?.trim() === name,
  );
const click = (name: string) => act(() => button(name)!.click());
const commit = (text: string) =>
  act(() =>
    host.querySelector("textarea")!.dispatchEvent(
      new InputEvent("beforeinput", {
        inputType: "insertText",
        data: text,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
const flush = () =>
  act(() => {
    while (jobs.length) jobs.shift()!();
  });
const target = () =>
  host.querySelector('[data-testid="typing-text"]')!.textContent!;
const shortcut = (options: KeyboardEventInit = { ctrlKey: true }, source: EventTarget = host.querySelector("textarea")!) => {
  const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, ...options });
  act(() => { source.dispatchEvent(event); });
  return event;
};
const completePassage = () => {
  const text = target();
  commit(text[0]);
  clock += 2000;
  commit(text.slice(1));
};
function seed() {
  const profile = profileOf(
    evidence("r".repeat(40), [0, 1, 2, 3], "seed1", "t"),
    evidence("r".repeat(40), [0, 1, 2, 3], "seed2", "t"),
  );
  saveProfile(storage, "user:A", profile);
  saveMastery(storage, "user:A", emptyMastery(2));
}
beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  clock = 100;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  control.subject = "A";
  control.saved.mockClear();
  values = new Map();
  jobs = [];
  control.service = createLearningService(storage, (job) => jobs.push(job));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe("minimal Practice session focus", () => {
  it("shows the plan without a reservation and opens its exact generated witness", () => {
    seed();
    render();
    const plan = control.service!.planSession("user:A");
    expect(host.querySelector('[aria-label="Session focus"]')).not.toBeNull();
    expect(
      control.service!.getSnapshot("user:A").mastery.variants,
    ).toHaveLength(0);
    expect(button("Continue planned session")).toBeUndefined();
    click("Start session");
    expect(host.querySelector("h1")!.textContent).toBe("Adaptive Practice");
    expect(host.querySelector('[aria-label="Session focus"]')).toBeNull();
    expect(
      host.querySelector('[aria-label="Current session focus"]'),
    ).not.toBeNull();
    expect(plan.primaryAction.target.type).toBe("adaptive");
    expect(
      control.service!.getSnapshot("user:A").mastery.variants?.[0].nextOrdinal,
    ).toBe(1);
    expect(target().length).toBeGreaterThan(140);
  });
  it("offers a secondary only after completion and finishes after two activities", () => {
    seed();
    render();
    click("Start session");
    const text = target();
    commit(text[0]);
    clock = 2100;
    commit(text.slice(1));
    flush();
    expect(button("Continue planned session")).not.toBeUndefined();
    expect(control.saved).toHaveBeenCalledTimes(1);
    click("Continue planned session");
    expect(host.querySelector("h1")!.textContent).toBe("Practice");
    expect(host.textContent).toContain(
      "Supporting activity: general typing practice",
    );
    expect(button("Continue planned session")).toBeUndefined();
    const ordinary = target();
    clock = 3000;
    commit(ordinary[0]);
    clock = 5000;
    commit(ordinary.slice(1));
    flush();
    expect(host.textContent).toContain("Session plan complete.");
    expect(host.querySelector('[aria-label="Session focus"]')).not.toBeNull();
    expect(control.saved).toHaveBeenCalledTimes(2);
    expect(control.service!.getSnapshot("user:A").profile.sessionCount).toBe(4);
  });
  it("starts and completes the normal fallback through existing Practice", () => {
    render();
    expect(host.textContent).toContain("General typing practice");
    click("Start session");
    const text = target();
    commit(text[0]);
    clock = 2100;
    commit(text.slice(1));
    flush();
    expect(host.textContent).toContain("Nice work!");
    expect(host.querySelector('[aria-label="Session focus"]')).not.toBeNull();
    expect(control.service!.getSnapshot("user:A").profile.sessionCount).toBe(1);
    expect(
      control.service!.getSnapshot("user:A").mastery.variants,
    ).toHaveLength(0);
    expect(control.saved).toHaveBeenCalledTimes(1);
  });
  it("clears plan/target on learner changes while preserving completed evidence", () => {
    seed();
    render();
    click("Start session");
    commit(target()[0]);
    control.subject = "B";
    render();
    expect(host.querySelector("h1")!.textContent).toBe("Practice");
    expect(host.textContent).toContain("General typing practice");
    expect(control.service!.getSnapshot("user:B").profile.sessionCount).toBe(0);
    expect(control.service!.getSnapshot("user:A").profile.sessionCount).toBe(2);
  });
  it("reports stale evidence, refreshes the card and starts only the updated plan", () => {
    seed();
    render();
    const other = createLearningService(storage, (job) => job());
    other.complete("user:A", "external", completed("abc"), 0);
    click("Start session");
    expect(host.textContent).toContain("Your session focus has changed");
    expect(host.querySelector("h1")!.textContent).toBe("Practice");
    click("Start session");
    expect(host.querySelector("h1")!.textContent).toBe("Adaptive Practice");
  });
});

describe("Practice next text shortcut", () => {
  it.each(["ctrlKey", "metaKey"])("opens and focuses the next passage with %s + Enter after completion", (modifier) => {
    render();
    const previous = target();
    completePassage();
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(button("Next text →")!.getAttribute("aria-keyshortcuts")).toBe("Control+Enter Meta+Enter");
    expect(host.textContent).toContain("for next text");
    expect(shortcut({ [modifier]: true }).defaultPrevented).toBe(true);
    expect(target()).not.toBe(previous);
    expect(document.activeElement).toBe(host.querySelector("textarea"));
    expect(host.querySelectorAll(".typing-char.correct")).toHaveLength(0);
    expect(button("Next text →")).toBeUndefined();
    expect(button("Start typing")).not.toBeUndefined();
    expect(control.saved).toHaveBeenCalledTimes(1);
    completePassage();
    expect(control.saved).toHaveBeenCalledTimes(2);
    flush();
    expect(control.service!.getSnapshot("user:A").profile.sessionCount).toBe(2);
  });

  it("focuses an unfinished passage without skipping it or discarding typed progress", () => {
    render();
    const text = target();
    commit(text[0]);
    act(() => host.querySelector<HTMLTextAreaElement>("textarea")!.blur());
    expect(shortcut().defaultPrevented).toBe(true);
    expect(target()).toBe(text);
    expect(host.querySelectorAll(".typing-char.correct")).toHaveLength(1);
    clock += 2000;
    commit(text.slice(1));
    expect(button("Next text →")).not.toBeUndefined();
    expect(control.saved).toHaveBeenCalledTimes(1);
  });

  it("keeps completed results visible while repeating the key, composing, or editing another field", () => {
    render();
    const text = target();
    completePassage();
    expect(shortcut({ ctrlKey: true, repeat: true }).defaultPrevented).toBe(true);
    expect(shortcut({ ctrlKey: true, isComposing: true }).defaultPrevented).toBe(false);
    const other = document.createElement("input");
    host.append(other);
    act(() => other.focus());
    expect(shortcut({ ctrlKey: true }, other).defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(other);
    expect(target()).toBe(text);
    expect(button("Next text →")).not.toBeUndefined();
    expect(control.saved).toHaveBeenCalledTimes(1);
  });

  it("leaves completed adaptive plans awaiting their explicit continuation", () => {
    seed(); render(); click("Start session");
    const text = target();
    completePassage(); flush();
    expect(button("Continue planned session")).not.toBeUndefined();
    expect(shortcut().defaultPrevented).toBe(false);
    expect(target()).toBe(text);
    expect(button("Continue planned session")).not.toBeUndefined();
    expect(control.saved).toHaveBeenCalledTimes(1);
  });
});
