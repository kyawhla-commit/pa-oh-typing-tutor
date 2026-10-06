// Isolated local browser verification route with synthetic seed controls.
import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import {
  LearningProvider,
  useLearningData,
} from "../../src/data/LearningContext";
import { LessonCatalogProvider } from "../../src/features/lessons/LessonCatalogContext";
import Practice from "../../src/features/practice/Practice";
import Test from "../../src/features/tests/Test";
import { createTypingEngine } from "../../src/engine/typing";
import {
  getLearningService,
  createLearningService,
} from "../../src/features/learning/service";
import {
  useLearningProfile,
  useLearningScope,
} from "../../src/features/learning/useLearningProfile";
import "../../src/index.css";
import { recommendWithMastery } from "../../src/features/learning/transfer";
import {
  finishExercise,
  sourceAttribution,
  targetPositions,
} from "../../src/features/learning/progression/testFixtures";
import { SCENARIOS } from "../../src/features/learning/evaluation/scenarios";
import { syntheticSession } from "../../src/features/learning/evaluation/behavior";
import { learningActionWithVariants } from "../../src/features/learning/progression/actions";
import {
  recommendationIdentity,
  weaknessKey,
} from "../../src/features/learning/transfer";
import { usePlannerOutcomes } from "../../src/features/learning/planner/outcomes/usePlannerOutcomes";
import { selectAdaptivePractice } from "../../src/features/learning/exercises/selection";
import { practiceSpec } from "../../src/features/learning/recommendations";
import {
  variantKey,
  nextVariant,
} from "../../src/features/learning/progression/variants";
function Fixture() {
  const { signIn, learner, results } = useLearningData();
  const scope = useLearningScope();
  const { profile, mastery } = useLearningProfile(scope);
  const outcomes = usePlannerOutcomes(scope);
  const sequence = useRef(0);
  const [status, setStatus] = useState("Ready");
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      signIn({
        name: "Slice 12 browser fixture",
        email: "slice12-fixture@example.com",
      });
    }
  }, [signIn]);
  const seed = (unit: string) => {
    const engine = createTypingEngine({
      targetText: unit.repeat(24),
      completionPolicy: "target-covered",
      sourceIdentity: { type: "corpus", id: "browser-seed", version: "1" },
    });
    engine.dispatch({
      type: "INSERT_TEXT",
      text: "txws" + unit.repeat(20),
      atMs: 0,
    });
    getLearningService().complete(
      scope,
      crypto.randomUUID(),
      engine.getResult(),
      Date.now(),
    );
  };
  const ordinary = (
    mode: "fixed-text" | "timed" | "word-count",
    bad = false,
  ) => {
    const common = {
      targetText: "r".repeat(20),
      sourceIdentity: {
        type: "corpus" as const,
        id: "synthetic-ordinary-fixture",
        version: "1",
      },
    };
    const engine = createTypingEngine(
      mode === "timed"
        ? { ...common, mode, durationMs: 2000, textPolicy: "repeat-corpus" }
        : mode === "word-count"
          ? { ...common, mode, wordLimit: 1 }
          : { ...common, mode, completionPolicy: "target-covered" },
    );
    engine.dispatch({ type: "INSERT_TEXT", text: bad ? "txws" : "r", atMs: 0 });
    engine.dispatch({
      type: "INSERT_TEXT",
      text: "r".repeat(bad ? 16 : 19),
      atMs: 1999,
    });
    if (mode === "timed") engine.dispatch({ type: "TICK", atMs: 2000 });
    getLearningService().complete(
      scope,
      crypto.randomUUID(),
      engine.getResult(),
      Date.now(),
    );
  };
  const syntheticRun = (bad = false) => {
    const service = getLearningService(),
      snapshot = service.getSnapshot(scope!);
    const rec = recommendWithMastery(snapshot.profile, snapshot.mastery).find(
      ({ recommendation: r }) => {
        const identity = recommendationIdentity(r),
          record =
            snapshot.mastery.records.find(
              (x) =>
                identity && weaknessKey(x.identity) === weaknessKey(identity),
            ) ?? null;
        return (
          "progressionLevel" in
          learningActionWithVariants(record, r, snapshot.mastery, scope!)
        );
      },
    )?.recommendation;
    if (!rec) return;
    const selected = service.startAdaptive(scope!, rec);
    if (!selected.ok) return;
    const e = selected.selection.exercise;
    service.complete(
      scope,
      crypto.randomUUID(),
      finishExercise(e, bad ? [targetPositions(e)[0]] : []),
      Date.now(),
      sourceAttribution(e, selected.selection.assessmentCheckOrder),
    );
  };
  const sparse = () => {
    const engine = createTypingEngine({
      targetText: "a".repeat(50),
      completionPolicy: "target-covered",
      sourceIdentity: {
        type: "corpus",
        id: "synthetic-sparse-fixture",
        version: "1",
      },
    });
    engine.dispatch({ type: "INSERT_TEXT", text: "a", atMs: 0 });
    engine.dispatch({ type: "INSERT_TEXT", text: "a".repeat(49), atMs: 2000 });
    getLearningService().complete(
      scope,
      crypto.randomUUID(),
      engine.getResult(),
      Date.now(),
    );
  };
  const runHistory = async (id: string, limit?: number) => {
    if (!scope) return;
    setStatus(`Running ${id}`);
    const scenario = SCENARIOS.find((s) => s.id === id)!;
    const service = getLearningService(),
      remembered = new Map<
        string,
        ReturnType<typeof recommendWithMastery>[number]["recommendation"]
      >();
    for (const step of scenario.steps.slice(0, limit)) {
      const snapshot = service.getSnapshot(scope);
      for (const { recommendation: r } of recommendWithMastery(
        snapshot.profile,
        snapshot.mastery,
      )) {
        const identity = recommendationIdentity(r);
        if (identity) remembered.set(weaknessKey(identity), r);
      }
      if (step.kind === "ordinary")
        service.complete(
          scope,
          crypto.randomUUID(),
          syntheticSession(step),
          Date.now(),
        );
      else {
        const r = remembered.get(weaknessKey(step.identity));
        if (r) {
          const selected = service.startAdaptive(scope, r);
          if (selected.ok) {
            const e = selected.selection.exercise;
            service.complete(
              scope,
              crypto.randomUUID(),
              finishExercise(e),
              Date.now(),
              sourceAttribution(e, selected.selection.assessmentCheckOrder),
            );
          }
        }
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    setStatus(`Completed ${id}`);
  };

  const finishCurrentBadCheck = () => {
    if (!scope) return;
    const service = getLearningService(),
      snapshot = service.getSnapshot(scope),
      attempt = service.getOutcomeSnapshot(scope).current;
    if (
      !attempt ||
      attempt.lifecycle !== "started" ||
      attempt.activityType !== "controlled-assessment" ||
      !attempt.runId
    )
      throw Error("Start a check first");
    const entry = recommendWithMastery(snapshot.profile, snapshot.mastery).find(
      ({ recommendation: r }) => {
        const id = recommendationIdentity(r),
          record = snapshot.mastery.records.find(
            (x) => id && weaknessKey(x.identity) === weaknessKey(id),
          );
        return record?.state === "TRANSFER_CHECK";
      },
    );
    if (!entry) throw Error("Missing check");
    const r = entry.recommendation,
      id = recommendationIdentity(r)!;
    const record = snapshot.mastery.records.find(
      (x) => weaknessKey(x.identity) === weaknessKey(id),
    )!;
    const ordinal =
      nextVariant(
        snapshot.mastery.variants ?? [],
        variantKey(practiceSpec(r), "controlled-transfer-assessment"),
      ) - 1;
    const selected = selectAdaptivePractice(r, scope, {
      action: learningActionWithVariants(record, r, snapshot.mastery, scope),
      explanation: "Synthetic engineering verification",
      composition: {
        level: 2,
        ordinal,
        purpose: "controlled-transfer-assessment",
      },
      assessmentCheckOrder: record.checkOrder ?? record.stateSince,
    });
    if (!selected.ok) throw Error("Fixture failed generation");
    const e = selected.selection.exercise;
    if (
      document.querySelector('[data-testid="typing-text"]')?.textContent !==
      e.text
    )
      throw Error("Fixture target mismatch");
    service.complete(
      scope,
      attempt.runId,
      finishExercise(e, targetPositions(e)),
      Date.now(),
      sourceAttribution(e, record.checkOrder ?? record.stateSince),
    );
    setStatus("Seeded completed failing current check");
  };
  const externalEvidence = () => {
    if (!scope) return;
    const engine = createTypingEngine({
      targetText: "abc",
      sourceIdentity: { type: "corpus", id: "external", version: "1" },
    });
    engine.dispatch({ type: "INSERT_TEXT", text: "a", atMs: 0 });
    engine.dispatch({ type: "INSERT_TEXT", text: "bc", atMs: 2000 });
    createLearningService(localStorage, (j) => j()).complete(
      scope,
      crypto.randomUUID(),
      engine.getResult(),
      Date.now(),
    );
    setStatus("External evidence written");
  };

  const compose = () => {
    const input = document.querySelector<HTMLTextAreaElement>("textarea")!;
    input.focus();
    input.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    input.value = "e";
    input.dispatchEvent(
      new InputEvent("input", {
        inputType: "insertCompositionText",
        data: "e",
        isComposing: true,
        bubbles: true,
      }),
    );
    input.dispatchEvent(
      new CompositionEvent("compositionend", { data: "é", bubbles: true }),
    );
    input.dispatchEvent(
      new InputEvent("beforeinput", {
        inputType: "insertText",
        data: "é",
        bubbles: true,
        cancelable: true,
      }),
    );
    input.dispatchEvent(
      new InputEvent("input", {
        inputType: "insertText",
        data: "é",
        bubbles: true,
      }),
    );
  };
  return (
    <div className="mx-auto max-w-6xl p-4">
      <header className="rounded-lg bg-slate-100 p-3 text-sm">
        <p>Slice 12 isolated verification fixture · {learner?.name}</p>
        <nav className="my-2 flex gap-4">
          <Link to="/practice">Practice route</Link>
          <Link to="/test">Test route</Link>
        </nav>
        <div className="flex flex-wrap gap-4">
          <button onClick={() => seed("r")}>Seed weak r evidence</button>
          <button onClick={() => seed("é")}>Seed Unicode evidence</button>
          <button onClick={compose}>Synthetic composition é</button>
        </div>
        <div className="my-2 flex flex-wrap gap-4">
          <button onClick={sparse}>Seed sparse ordinary session</button>
          <button onClick={() => syntheticRun()}>
            Seed successful next adaptive run
          </button>
          <button onClick={() => syntheticRun(true)}>
            Seed corrected failed next assessment
          </button>
          <button onClick={() => ordinary("fixed-text")}>
            Seed ordinary Practice success
          </button>
          <button onClick={() => ordinary("timed")}>
            Seed timed Test success
          </button>
          <button onClick={() => ordinary("word-count")}>
            Seed word Test success
          </button>
          <button onClick={() => ordinary("fixed-text", true)}>
            Seed severe ordinary regression
          </button>
          <button
            onClick={() =>
              signIn({
                name: "Learner A",
                email: "slice12-fixture@example.com",
              })
            }
          >
            Switch to learner A
          </button>
          <button
            onClick={() =>
              signIn({ name: "Learner B", email: "slice12-other@example.com" })
            }
          >
            Switch to learner B
          </button>
        </div>
        <div className="my-2 flex flex-wrap gap-4">
          <button onClick={() => runHistory("large-lifetime-new-severe")}>
            Seed Slice 12 overlap history
          </button>
          <button onClick={() => runHistory("large-lifetime-other-category")}>
            Seed regressed r competition
          </button>
          <button onClick={() => runHistory("repaired-e-to-i", 9)}>
            Seed e to i transfer check
          </button>
          <button onClick={() => runHistory("unsupported-myanmar-check", 9)}>
            Seed unsupported Myanmar check
          </button>
          <button
            onClick={() =>
              signIn({
                name: "E to I fixture",
                email: "slice12-direction@example.com",
              })
            }
          >
            Switch e to i learner
          </button>
          <button
            onClick={() =>
              signIn({
                name: "Myanmar fixture",
                email: "slice12-myanmar@example.com",
              })
            }
          >
            Switch Myanmar learner
          </button>
          <button
            onClick={() =>
              signIn({
                name: "Regression fixture",
                email: "slice12-regression@example.com",
              })
            }
          >
            Switch regression learner
          </button>
        </div>
        <button onClick={finishCurrentBadCheck}>
          Seed failing current planned check
        </button>
        <button onClick={externalEvidence}>Write external evidence</button>
        <output aria-label="Outcome diagnostics">
          Sequence: {outcomes.sequence}; current:{" "}
          {outcomes.current?.lifecycle ?? "none"}; outcomes:{" "}
          {outcomes.recent.map((o) => o.outcome).join(",")}; completed:{" "}
          {outcomes.recent.filter((o) => o.outcome === "completed").length};
          skipped:{" "}
          {outcomes.recent.filter((o) => o.outcome === "skipped").length};
          cancelled:{" "}
          {outcomes.recent.filter((o) => o.outcome === "cancelled").length};
          abandoned:{" "}
          {outcomes.recent.filter((o) => o.outcome === "abandoned").length}
        </output>
        <p aria-label="Verification status">{status}</p>
        <p>
          Seed controls inject synthetic completed engine results for
          verification; these are not human ordinary typing.
        </p>
        <p aria-label="Mastery diagnostics">
          Scope: {scope};{" "}
          {mastery.records
            .map(
              (r) =>
                `${r.identity.kind}:${r.identity.items.join("→")} ${r.state}; training=${r.training.length}; transfer=${r.transfer.length}; level=${r.practiceLevel}; waiting=${r.waiting?.length ?? 0}; checks=${r.assessments?.length ?? 0}; via=${r.masteryVia ?? "none"}`,
            )
            .join(" | ")}
        </p>
        <output aria-label="Learning diagnostics">
          Learning sessions: {profile.sessionCount}; legacy saved:{" "}
          {results.length}; latest source:{" "}
          {profile.recent.at(-1)?.sourceIdentity?.type ?? "none"}; latest mode:{" "}
          {profile.recent.at(-1)?.mode ?? "none"}; active ms:{" "}
          {profile.recent.at(-1)?.activeElapsedMs ?? 0}; last attempts:{" "}
          {profile.recent.at(-1)?.totalAttempts ?? 0}; corrected:{" "}
          {profile.recent.at(-1)?.correctedErrors ?? 0}
        </output>
      </header>
      <Routes>
        <Route path="/practice" element={<Practice />} />
        <Route path="/test" element={<Test />} />
      </Routes>
    </div>
  );
}
// Reuse the root when Vite reevaluates this fixture entry during hot reload.
const root =
  (import.meta.hot?.data.root as ReturnType<typeof createRoot> | undefined) ??
  createRoot(document.getElementById("root")!);
if (import.meta.hot)
  import.meta.hot.dispose((data) => {
    data.root = root;
  });
root.render(
  <StrictMode>
    <LearningProvider>
      <LessonCatalogProvider>
        <MemoryRouter initialEntries={["/practice"]}>
          <Fixture />
        </MemoryRouter>
      </LessonCatalogProvider>
    </LearningProvider>
  </StrictMode>,
);
