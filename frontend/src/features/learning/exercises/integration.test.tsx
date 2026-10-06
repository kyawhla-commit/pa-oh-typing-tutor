// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import Practice from "../../practice/Practice";
import Test from "../../tests/Test";
import { createTypingEngine, prepareTypingText } from "../../../engine/typing";
import {
  createTypingSession,
  type TypingSession,
} from "../../typing/useTypingSession";
import { createLearningService, type LearningService } from "../service";
import { useSessionLearning } from "../useLearningProfile";
import { extractLearningEvidence } from "../evidence";
import { applyLearningEvidence, emptyProfile } from "../profile";
import { parseProfile, profileStorageKey, serializeProfile } from "../storage";
import {
  masteryStorageKey,
  parseMastery,
  type AdaptiveAttribution,
} from "../transfer";
import { completed } from "../testFixtures";
import { exercise } from "./testFixtures";
import * as generator from "./generator";
const control = vi.hoisted(() => ({
  service: null as LearningService | null,
  subject: "A",
  addResult: vi.fn(),
  completeLesson: vi.fn(),
}));
vi.mock("../service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../service")>()),
  getLearningService: () => control.service!,
}));
vi.mock("../../../data/LearningContext", () => ({
  useLearningData: () => ({
    learner: { name: control.subject, email: `${control.subject}@example.com` },
    authenticatedUserId: control.subject,
    preferences: {
      difficulty: "Medium",
      targetWpm: 100,
      keyboardLayout: "QWERTY",
    },
    addResult: control.addResult,
    completeLesson: control.completeLesson,
    syncStatus: "local",
    syncError: null,
  }),
}));
vi.mock("../../lessons/LessonCatalogContext", () => ({
  useLessonCatalog: () => ({
    catalog: [{ id: 1, status: "Published", content: "abc" }],
  }),
}));
let host: HTMLDivElement,
  root: Root,
  clock: number,
  jobs: (() => void)[],
  values: Map<string, string>;
function seededProfile(unit = "r") {
  const engine = createTypingEngine({
    targetText: unit.repeat(24),
    completionPolicy: "target-covered",
    sourceIdentity: { type: "corpus", id: "seed", version: "1" },
  });
  engine.dispatch({
    type: "INSERT_TEXT",
    text: "txws" + unit.repeat(20),
    atMs: 0,
  });
  return applyLearningEvidence(
    emptyProfile(),
    extractLearningEvidence(engine.getResult(), "seed", 0)!,
  );
}
const flush = () =>
  act(() => {
    while (jobs.length) jobs.shift()!();
  });
const button = (label: string) =>
  Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => b.textContent?.trim() === label,
  )!;
const click = (label: string) => act(() => button(label).click());
const start = () =>
  act(() =>
    Array.from(host.querySelectorAll<HTMLButtonElement>("button"))
      .find((b) =>
        b
          .getAttribute("aria-label")
          ?.startsWith("Practice this: Focus on the grapheme"),
      )!
      .click(),
  );
const target = () =>
  host.querySelector('[data-testid="typing-text"]')!.textContent!;
const input = () => host.querySelector<HTMLTextAreaElement>("textarea")!;
const commit = (text: string, type = "insertText") =>
  act(() => {
    input().focus();
    input().dispatchEvent(
      new InputEvent("beforeinput", {
        inputType: type,
        data: text,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
const remove = () =>
  act(() =>
    input().dispatchEvent(
      new InputEvent("beforeinput", {
        inputType: "deleteContentBackward",
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
const profile = () => control.service!.getSnapshot("user:A").profile;
function render(path = "/practice") {
  act(() =>
    root.render(
      <StrictMode>
        <MemoryRouter initialEntries={[path]}>
          <nav>
            <Link to="/practice">Practice route</Link>
            <Link to="/test">Test route</Link>
          </nav>
          <Routes>
            <Route path="/practice" element={<Practice />} />
            <Route path="/test" element={<Test />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    ),
  );
}
function Probe({
  session,
  service,
  attribution,
}: {
  session: TypingSession;
  service: LearningService;
  attribution?: AdaptiveAttribution;
}) {
  useSessionLearning(session, "user:A", service, attribution);
  return null;
}
beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  clock = 100;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  control.subject = "A";
  control.addResult.mockClear();
  control.completeLesson.mockClear();
  jobs = [];
  values = new Map([
    [profileStorageKey("user:A"), serializeProfile(seededProfile())],
  ]);
  control.service = createLearningService(
    {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
    },
    (job) => jobs.push(job),
  );
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe("recommendation to fixed Practice learning loop", () => {
  it("Practice this opens verified focus material and freezes it across new profile evidence", () => {
    render();
    expect(host.textContent).toContain('Focus on the grapheme "r"');
    start();
    const text = target();
    expect(host.textContent).toContain("Adaptive Practice");
    expect(host.textContent).toContain("Focus: r");
    expect(
      prepareTypingText(text).expectedUnits.filter((u) => u === "r").length,
    ).toBeGreaterThanOrEqual(12);
    act(() =>
      control.service!.complete(
        "user:A",
        "external",
        completed("t".repeat(24), [0, 1, 2, 3, 4, 5, 6]),
        1,
      ),
    );
    flush();
    expect(profile().sessionCount).toBe(2);
    expect(target()).toBe(text);
  });
  it("wrong final stays running; correction completes once and feeds adaptive evidence", () => {
    render();
    start();
    const units = prepareTypingText(target()).units;
    commit(units.slice(0, -1).join(""));
    clock = 2100;
    commit("X");
    flush();
    expect(host.textContent).not.toContain("Nice work!");
    expect(profile().sessionCount).toBe(1);
    remove();
    commit(units.at(-1)!);
    expect(jobs.length).toBe(1);
    flush();
    expect(host.textContent).toContain("Nice work!");
    expect(profile().sessionCount).toBe(2);
    expect(profile().recent.at(-1)).toMatchObject({
      mode: "fixed-text",
      completionReason: "correct-target",
      correctedErrors: 1,
      remainingErrors: 0,
      sourceIdentity: { type: "adaptive" },
    });
    expect(control.addResult).toHaveBeenCalledTimes(1);
    expect(control.addResult.mock.calls[0][0].label).toBe("Adaptive practice");
    expect(control.completeLesson).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Needs more practice");
    expect(host.querySelector("h1")!.textContent).toBe("Adaptive Practice");
    const serialized = values.get(profileStorageKey("user:A"))!;
    expect(serialized).not.toContain(units.join(""));
    expect(parseProfile(serialized).recent.at(-1)?.sourceIdentity?.type).toBe(
      "adaptive",
    );
  });
  it("restart preserves the target; deliberate Practice again varies it with a new run ID", () => {
    render();
    start();
    const text = target();
    commit("X");
    click("↺ Restart");
    expect(target()).toBe(text);
    expect(profile().sessionCount).toBe(1);
    commit(text.slice(0, 1));
    clock = 2100;
    commit(text.slice(1));
    flush();
    const first = profile().processedSessionIds.at(-1);
    const source = profile().recent.at(-1)?.sourceIdentity;
    click("Practice again");
    const next = target();
    expect(next).not.toBe(text);
    commit(next.slice(0, 1));
    clock = 4100;
    commit(next.slice(1));
    flush();
    expect(profile().sessionCount).toBe(3);
    expect(profile().processedSessionIds.at(-1)).not.toBe(first);
    expect(profile().recent.at(-1)?.sourceIdentity).not.toEqual(source);
  });
  it("completed adaptive result dedupes across StrictMode/remount/service reconstruction", () => {
    const e = exercise();
    const session = createTypingSession(
      { preparedText: e.preparedText, sourceIdentity: e.source },
      () => clock,
    );
    session.insertText(e.text.slice(0, 1));
    clock = 2100;
    session.insertText(e.text.slice(1));
    act(() =>
      root.render(
        <StrictMode>
          <Probe session={session} service={control.service!} />
        </StrictMode>,
      ),
    );
    flush();
    expect(profile().sessionCount).toBe(2);
    act(() => root.unmount());
    root = createRoot(host);
    const reloaded = createLearningService(
      {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
      },
      (job) => jobs.push(job),
    );
    act(() =>
      root.render(
        <StrictMode>
          <Probe session={session} service={reloaded} />
        </StrictMode>,
      ),
    );
    flush();
    expect(reloaded.getSnapshot("user:A").profile.sessionCount).toBe(2);
  });
  it("normal catalog Practice remains intact after leaving adaptive practice", () => {
    render("/practice?lesson=1");
    expect(target()).toBe("abc");
    start();
    expect(target()).not.toBe("abc");
    click("Back to normal Practice");
    expect(target()).toBe("abc");
    commit("a");
    clock = 2100;
    commit("bc");
    flush();
    expect(control.completeLesson).toHaveBeenCalledExactlyOnceWith(1);
    expect(profile().recent.at(-1)?.sourceIdentity?.type).toBe("lesson");
  });
  it("preflight generation is reused at start and never runs on input or restart", () => {
    const generate = vi.spyOn(generator, "generateAdaptiveExercise");
    render();
    const before = generate.mock.calls.length;
    start();
    expect(generate.mock.calls.length).toBe(before);
    const text = target();
    commit(text.slice(0, 1));
    clock = 2100;
    commit(text.slice(1));
    flush();
    click("Practice again");
    const after = generate.mock.calls.length;
    const second = target();
    expect(second).not.toBe(text);
    commit("X");
    remove();
    click("↺ Restart");
    expect(target()).toBe(second);
    expect(generate.mock.calls.length).toBe(after);
  });
  it("Unicode drill supports synthetic composition and rejects paste", () => {
    values.set(
      profileStorageKey("user:A"),
      serializeProfile(seededProfile("é")),
    );
    render();
    start();
    expect(host.textContent).toContain("Target drill");
    const text = target();
    commit("PASTE", "insertFromPaste");
    expect(host.querySelectorAll(".typing-char.correct").length).toBe(0);
    act(() => {
      input().dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true }),
      );
      input().dispatchEvent(
        new CompositionEvent("compositionupdate", { data: "e", bubbles: true }),
      );
      input().dispatchEvent(
        new CompositionEvent("compositionend", { data: "é", bubbles: true }),
      );
      input().dispatchEvent(
        new InputEvent("input", {
          inputType: "insertFromComposition",
          data: "é",
          bubbles: true,
        }),
      );
    });
    expect(host.querySelectorAll(".typing-char.correct").length).toBe(1);
    clock = 2100;
    commit(prepareTypingText(text).units.slice(1).join(""));
    flush();
    expect(profile().recent.at(-1)?.sourceIdentity?.type).toBe("adaptive");
  });
  it("navigation ends the selection; timed/word tests and manual Save remain independent", () => {
    render();
    start();
    act(() =>
      Array.from(host.querySelectorAll("a"))
        .find((a) => a.textContent === "Test route")!
        .click(),
    );
    click("15 secQuick warm-up");
    click("Start test");
    commit("G");
    clock = 15310;
    act(() => vi.advanceTimersByTime(250));
    flush();
    expect(profile().sessionCount).toBe(2);
    expect(control.addResult).not.toHaveBeenCalled();
    click("Save result");
    expect(control.addResult).toHaveBeenCalledTimes(1);
    expect(profile().sessionCount).toBe(2);
    click("Try another test");
    click("Words");
    click("10 words");
    click("Start test");
    commit("Good typing is less about ");
    clock = 17310;
    commit("rushing and more about finding");
    flush();
    expect(profile().sessionCount).toBe(3);
    expect(control.addResult).toHaveBeenCalledTimes(1);
    act(() =>
      Array.from(host.querySelectorAll("a"))
        .find((a) => a.textContent === "Practice route")!
        .click(),
    );
    expect(host.querySelector("h1")?.textContent).toBe("Practice");
  });
  it("switching learners discards an adaptive selection from the previous account", () => {
    render();
    start();
    control.subject = "B";
    render();
    expect(host.querySelector("h1")?.textContent).toBe("Practice");
    expect(control.service!.getSnapshot("user:B").profile.sessionCount).toBe(0);
  });
  it("real adapter drill completions progress, ordinary evidence suppresses, regression and reload reactivate", () => {
    render();
    start();
    for (let i = 0; i < 3; i++) {
      const text = target();
      commit(text.slice(0, 1));
      clock += 2000;
      commit(text.slice(1));
      flush();
      if (i === 0) expect(host.textContent).toContain("Needs more practice");
      if (i === 1) expect(host.textContent).toContain("Improving");
      if (i < 2) click("Practice again");
    }
    expect(host.textContent).toContain("Practice normally so we can check");
    expect(
      Array.from(host.querySelectorAll("button")).some((b) =>
        b
          .getAttribute("aria-label")
          ?.startsWith("Practice this: Focus on the grapheme"),
      ),
    ).toBe(false);
    click("Continue in normal Practice");
    expect(host.querySelector("h1")!.textContent).toBe("Practice");
    for (let i = 0; i < 3; i++) {
      act(() =>
        control.service!.complete(
          "user:A",
          `ordinary-${i}`,
          completed("r".repeat(20)),
          0,
        ),
      );
      flush();
    }
    expect(host.textContent).toContain("Currently strong: r");
    expect(
      Array.from(host.querySelectorAll("button")).some((b) =>
        b
          .getAttribute("aria-label")
          ?.startsWith("Practice this: Focus on the grapheme"),
      ),
    ).toBe(false);
    for (let i = 0; i < 3; i++) {
      act(() =>
        control.service!.complete(
          "user:A",
          `regression-${i}`,
          completed("r".repeat(20), [0, 1, 2]),
          0,
        ),
      );
      flush();
    }
    expect(host.textContent).toContain(
      "This difficulty appeared again in regular typing",
    );
    const persisted = parseMastery(values.get(masteryStorageKey("user:A"))!)!;
    expect(
      persisted.records.find((r) => r.identity.kind === "grapheme")?.state,
    ).toBe("REGRESSED");
    control.service = createLearningService(
      {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
      },
      (job) => jobs.push(job),
    );
    render();
    expect(host.textContent).toContain(
      "This difficulty appeared again in regular typing",
    );
    expect(control.service.getSnapshot("user:B").mastery.records).toHaveLength(
      0,
    );
    expect(control.addResult).toHaveBeenCalledTimes(3);
  });
  it("structured adaptive attribution survives StrictMode, remount and service reconstruction exactly once", () => {
    const e = exercise();
    const session = createTypingSession(
      { preparedText: e.preparedText, sourceIdentity: e.source },
      () => clock,
    );
    const attribution: AdaptiveAttribution = {
      sourceId: e.source.id,
      sourceVersion: e.source.version,
      focusType: e.generatedFrom.spec.focusType,
      focusItems: e.generatedFrom.spec.focusItems,
    };
    session.insertText(e.text.slice(0, 1));
    clock = 2100;
    session.insertText(e.text.slice(1));
    act(() =>
      root.render(
        <StrictMode>
          <Probe
            session={session}
            service={control.service!}
            attribution={attribution}
          />
        </StrictMode>,
      ),
    );
    flush();
    const r = control
      .service!.getSnapshot("user:A")
      .mastery.records.find((r) => r.identity.kind === "grapheme")!;
    expect(r.training).toHaveLength(1);
    act(() => root.unmount());
    root = createRoot(host);
    const reloaded = createLearningService(
      {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
      },
      (job) => jobs.push(job),
    );
    act(() =>
      root.render(
        <StrictMode>
          <Probe
            session={session}
            service={reloaded}
            attribution={attribution}
          />
        </StrictMode>,
      ),
    );
    flush();
    expect(
      reloaded
        .getSnapshot("user:A")
        .mastery.records.find((r) => r.identity.kind === "grapheme")?.training,
    ).toHaveLength(1);
  });

  function reachSparseCheck() {
    render();
    start();
    for (let i = 0; i < 3; i++) {
      const text = target();
      commit(text.slice(0, 1));
      clock += 2000;
      commit(text.slice(1));
      flush();
      if (i < 2) click("Practice again");
    }
    click("Continue in normal Practice");
    expect(host.textContent).not.toContain("Take mastery check");
    for (let i = 0; i < 5; i++) {
      act(() =>
        control.service!.complete(
          "user:A",
          `sparse-${i}`,
          completed("a".repeat(50)),
          0,
        ),
      );
      flush();
      if (i < 4) expect(host.textContent).not.toContain("Take mastery check");
    }
    expect(host.textContent).toContain("Take mastery check");
  }
  it("sparse exposure unlocks explicit checks; four strict adapter completions establish controlled mastery", () => {
    reachSparseCheck();
    for (let i = 0; i < 4; i++) {
      act(() =>
        Array.from(host.querySelectorAll<HTMLButtonElement>("button"))
          .find((b) =>
            b
              .getAttribute("aria-label")
              ?.startsWith("Take mastery check: Focus on the grapheme"),
          )!
          .click(),
      );
      expect(host.querySelector("h1")!.textContent).toBe("Mastery Check");
      expect(host.textContent).toContain(
        "Controlled assessment · not ordinary transfer",
      );
      const text = target();
      commit(text.slice(0, 1));
      clock += 2000;
      commit(text.slice(1));
      flush();
      const r = control
        .service!.getSnapshot("user:A")
        .mastery.records.find((r) => r.identity.kind === "grapheme")!;
      expect(r.transfer).toHaveLength(0);
      expect(r.assessments).toHaveLength(i + 1);
      expect(r.state).toBe(i === 3 ? "PROVISIONAL_MASTERY" : "TRANSFER_CHECK");
      if (i < 3) expect(host.textContent).not.toContain("Currently strong: r");
      click("Continue in normal Practice");
    }
    expect(host.textContent).toContain("Currently strong: r");
    expect(host.textContent).toContain("Repeated mastery checks show");
    expect(
      control
        .service!.getSnapshot("user:A")
        .mastery.variants?.map((v) => v.nextOrdinal),
    ).toEqual([3, 4]);
    control.service = createLearningService(
      {
        getItem: (k) => values.get(k) ?? null,
        setItem: (k, v) => values.set(k, v),
      },
      (job) => jobs.push(job),
    );
    render();
    expect(host.textContent).toContain("Currently strong: r");
  }, 15000); // Seven real adapter completions can exceed the default limit under suite load.
  it("corrected check error denies mastery and offers contextual retry; restart keeps its variant", () => {
    reachSparseCheck();
    act(() =>
      Array.from(host.querySelectorAll<HTMLButtonElement>("button"))
        .find((b) =>
          b
            .getAttribute("aria-label")
            ?.startsWith("Take mastery check: Focus on the grapheme"),
        )!
        .click(),
    );
    const text = target();
    click("↺ Restart");
    expect(target()).toBe(text);
    const index = text.indexOf("r");
    commit(text.slice(0, index));
    commit("X");
    remove();
    commit("r");
    clock += 2000;
    commit(text.slice(index + 1));
    flush();
    const r = control
      .service!.getSnapshot("user:A")
      .mastery.records.find((r) => r.identity.kind === "grapheme")!;
    expect(r).toMatchObject({
      state: "ACTIVE",
      practiceLevel: 1,
      assessmentFailure: "mild",
      assessments: [],
    });
    expect(host.textContent).toContain("Practice with more context");
    expect(
      control.service!.getSnapshot("user:A").mastery.variants?.at(-1)
        ?.nextOrdinal,
    ).toBe(1);
    click("Practice again");
    expect(host.textContent).toContain("Level 1 · Contextual training");
    expect(host.querySelector("h1")!.textContent).toBe("Adaptive Practice");
  });
});
