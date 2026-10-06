// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import Practice from "../../../practice/Practice";
import { createLearningService, type LearningService } from "../../service";
import { evidence, profileOf, completed } from "../../testFixtures";
import { saveProfile } from "../../storage";
import { saveMastery } from "../../transfer/storage";
import { emptyMastery } from "../../transfer/progression";
const control = vi.hoisted(() => ({
  service: null as LearningService | null,
  subject: "A",
  saved: vi.fn(),
}));
vi.mock("../../service", async (original) => ({
  ...(await original<typeof import("../../service")>()),
  getLearningService: () => control.service!,
}));
vi.mock("../../../../data/LearningContext", () => ({
  useLearningData: () => ({
    learner: { name: control.subject, email: `${control.subject}@example.com` },
    authenticatedUserId: control.subject,
    preferences: { keyboardLayout: "QWERTY" },
    addResult: control.saved,
    completeLesson: vi.fn(),
  }),
}));
vi.mock("../../../lessons/LessonCatalogContext", () => ({
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
describe("planned activity outcome controls", () => {
  it("StrictMode offers only once and Skip consumes no ordinal or evidence", () => {
    seed();
    render();
    const before = control.service!.getSnapshot("user:A");
    expect(control.service!.getOutcomeSnapshot("user:A").sequence).toBe(1);
    expect(host.querySelectorAll("button").length).toBeGreaterThan(0);
    expect(host.querySelectorAll('[aria-label="Session focus"]')).toHaveLength(
      1,
    );
    click("Skip activity");
    expect(control.service!.getSnapshot("user:A")).toBe(before);
    expect(
      control
        .service!.getOutcomeSnapshot("user:A")
        .recent.map((o) => o.outcome),
    ).toEqual(["skipped"]);
    expect(document.activeElement).toBe(button("Start session"));
    expect(host.textContent).toContain("still the current valid focus");
  });
  it.each([false, true])(
    "Cancel before/after typing (%s) aborts without evidence or continuation",
    (partial) => {
      seed();
      render();
      click("Start session");
      const n = control.service!.getSnapshot("user:A").profile.sessionCount;
      if (partial) commit(target()[0]);
      click("Cancel activity");
      flush();
      expect(
        control
          .service!.getOutcomeSnapshot("user:A")
          .recent.map((o) => o.outcome),
      ).toEqual(["cancelled"]);
      expect(control.service!.getSnapshot("user:A").profile.sessionCount).toBe(
        n,
      );
      expect(button("Continue planned session")).toBeUndefined();
      expect(host.textContent).toContain("learning progress wasn’t changed");
      expect(host.querySelector("h1")!.textContent).toBe("Practice");
      expect(control.saved).not.toHaveBeenCalled();
    },
  );
  it("restart keeps the frozen target and reserved ordinal", () => {
    seed();
    render();
    click("Start session");
    const text = target(),
      id = control.service!.getOutcomeSnapshot("user:A").current!.attemptId;
    commit(text[0]);
    click("↺ Restart");
    expect(target()).toBe(text);
    expect(
      control.service!.getSnapshot("user:A").mastery.variants?.[0].nextOrdinal,
    ).toBe(1);
    expect(
      control.service!.getOutcomeSnapshot("user:A").current!.attemptId,
    ).toBe(id);
  });
  it("Finish declines offered secondary without secondary evidence", () => {
    seed();
    render();
    click("Start session");
    const text = target();
    commit(text[0]);
    clock = 2100;
    commit(text.slice(1));
    expect(button("Continue planned session")).toBeUndefined();
    flush();
    expect(button("Finish session")).not.toBeUndefined();
    click("Finish session");
    flush();
    expect(
      control
        .service!.getOutcomeSnapshot("user:A")
        .recent.map((o) => o.outcome),
    ).toEqual(["completed", "skipped"]);
    expect(control.service!.getSnapshot("user:A").profile.sessionCount).toBe(3);
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("completed practice is saved");
  });
  it("secondary Cancel preserves accepted primary and ends continuation", () => {
    seed();
    render();
    click("Start session");
    let text = target();
    commit(text[0]);
    clock = 2100;
    commit(text.slice(1));
    flush();
    click("Continue planned session");
    commit(target()[0]);
    click("Cancel activity");
    flush();
    expect(
      control
        .service!.getOutcomeSnapshot("user:A")
        .recent.map((o) => o.outcome),
    ).toEqual(["completed", "cancelled"]);
    expect(control.service!.getSnapshot("user:A").profile.sessionCount).toBe(3);
    expect(button("Continue planned session")).toBeUndefined();
  });
  it("known route removal records planner-only abandonment", async () => {
    seed();
    render();
    click("Start session");
    commit(target()[0]);
    await act(async () => {
      root.render(<div>Other route</div>);
      await Promise.resolve();
    });
    flush();
    expect(
      control
        .service!.getOutcomeSnapshot("user:A")
        .recent.map((o) => o.outcome),
    ).toEqual(["abandoned"]);
    expect(control.service!.getSnapshot("user:A").profile.sessionCount).toBe(2);
    expect(control.saved).not.toHaveBeenCalled();
  });
  it("leaving immediately after completed result does not lose deferred accepted completion", async () => {
    seed();
    render();
    click("Start session");
    const text = target();
    commit(text[0]);
    clock = 2100;
    commit(text.slice(1));
    await act(async () => {
      root.render(<div>Other route</div>);
      await Promise.resolve();
    });
    flush();
    expect(
      control
        .service!.getOutcomeSnapshot("user:A")
        .recent.map((o) => o.outcome),
    ).toEqual(["completed"]);
    expect(control.service!.getSnapshot("user:A").profile.sessionCount).toBe(3);
  });
  it("restarting a completed planned activity preserves completion and declines its optional continuation", () => {
    seed(); render(); click("Start session");
    const text = target(); commit(text[0]); clock = 2100; commit(text.slice(1)); flush();
    expect(button("Continue planned session")).not.toBeUndefined();
    act(() => host.querySelector("textarea")!.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true,
    })));
    expect(target()).toBe(text);
    expect(button("Continue planned session")).toBeUndefined();
    expect(host.querySelectorAll(".typing-char.correct")).toHaveLength(0);
    flush();
    expect(control.service!.getOutcomeSnapshot("user:A").recent.map((outcome) => outcome.outcome)).toEqual(["completed", "skipped"]);
    expect(control.saved).toHaveBeenCalledTimes(1);
    expect(control.service!.getSnapshot("user:A").profile.sessionCount).toBe(3);
  });
  it("choosing ordinary catalogue content declines the offer without starting it", () => {
    seed();
    render();
    click("↺ New text");
    flush();
    expect(
      control.service!.getOutcomeSnapshot("user:A").recent[0].outcome,
    ).toBe("skipped");
    expect(
      control.service!.getSnapshot("user:A").mastery.variants,
    ).toHaveLength(0);
  });
});
