import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTypingSession, useTypingResult } from "../typing/useTypingSession";
import {
  TypingPracticeSurface,
  TypingLiveStats,
  TypingKeyboardFeedback,
} from "../typing/TypingPracticeSurface";
import type { SessionResult } from "../../engine/typing";
import { MistakePractice, MistakeReview } from "./MistakeReview";
import { LESSON_PASS_ACCURACY, qualifiesLesson } from "./lessonQualification";
import { useLearningData } from "../../data/LearningContext";
import { useLessonCatalog } from "../lessons/LessonCatalogContext";

import {
  createSourceSessionConfig,
  prepareTextSource,
  textContentVersion,
} from "../typing/textSources";

import {
  useLearningProfile,
  useLearningScope,
  useSessionLearning,
} from "../learning/useLearningProfile";
import { LearningRecommendations } from "../learning/Recommendations";
import type { AdaptiveSelection } from "../learning/exercises/selection";
import { getLearningService } from "../learning/service";
import { recommendationIdentity, weaknessKey } from "../learning/transfer";
import { recommendationText } from "../learning/recommendations";

import {
  SessionPlanCard,
  planTitle,
} from "../learning/planner/SessionPlanCard";
import {
  usePlannerOutcomes,
  usePlannedAttempt,
} from "../learning/planner/outcomes/usePlannerOutcomes";
import type { LearningSessionPlan } from "../learning/planner";
type ActivePlan = {
  plan: LearningSessionPlan;
  stage: "primary" | "secondary";
  attemptId: string;
};
type PracticeMode = "words" | "sentences" | "paragraphs" | "code";

const modes: { key: PracticeMode; label: string; icon: string }[] = [
  { key: "words", label: "Words", icon: "🔤" },
  { key: "sentences", label: "Sentences", icon: "💬" },
  { key: "paragraphs", label: "Paragraph", icon: "📄" },
  { key: "code", label: "Code", icon: "💻" },
];

const practiceTexts: Record<PracticeMode, string[]> = {
  words: [
    "the quick brown fox jumps over the lazy dog and runs away into the forest",
    "programming is the art of telling another human what one wants the computer to do",
    "success is not final failure is not fatal it is the courage to continue that counts",
  ],
  sentences: [
    "The best way to predict the future is to create it. Every expert was once a beginner.",
    "Simplicity is the ultimate sophistication. Good design is obvious. Great design is transparent.",
    "Code is like humor. When you have to explain it, it is bad. Write clean self-documenting code.",
  ],
  paragraphs: [
    "In the beginning was the command line. Before the graphical user interface was democratized, people typed their instructions directly into machines. There was no mouse, no icons, no windows. Just text. The command line remains the most direct path to computational power, and those who master it gain a superpower.",
    "Touch typing is one of the most valuable skills a knowledge worker can develop. The ability to type without looking at your keyboard frees your mind to focus on what you're actually creating. Professional typists routinely exceed 80 words per minute, while the average person types around 40. The gap represents hours of productivity every single day.",
  ],
  code: [
    "function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconst result = fibonacci(10);\nconsole.log(result);",
    "const fetchUser = async (id) => {\n  const response = await fetch(`/api/users/${id}`);\n  if (!response.ok) throw new Error('Failed');\n  return response.json();\n};",
  ],
};

function pickText(mode: PracticeMode, current?: string) {
  const options = practiceTexts[mode];
  const alternatives = options.filter((text) => text !== current);
  const pool = alternatives.length ? alternatives : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function Practice() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lessonId = Number(searchParams.get("lesson")) || null;
  const [focusLesson, setFocusLesson] = useState<number | null>(null);
  const openNextLesson = (id: number) => {
    setFocusLesson(id);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("lesson", String(id));
      return next;
    });
  };
  const [adaptive, setAdaptive] = useState<AdaptiveSelection | null>(null);
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [outcomeNotice, setOutcomeNotice] = useState<string | null>(null);
  const [launch, setLaunch] = useState(0);
  const start = (selection: AdaptiveSelection) => {
    setActivePlan(null);
    setOutcomeNotice(null);
    setAdaptive(selection);
    setLaunch((n) => n + 1);
  };
  const startPlan = (
    plan: LearningSessionPlan,
    selection: AdaptiveSelection | null,
    stage: "primary" | "secondary" = "primary",
  ) => {
    const attempt = getLearningService().getOutcomeSnapshot(
      plan.learnerScope,
    ).current;
    if (!attempt || attempt.lifecycle !== "started") return;
    setActivePlan({ plan, stage, attemptId: attempt.attemptId });
    setOutcomeNotice(null);
    setAdaptive(selection);
    setLaunch((n) => n + 1);
  };
  const exit = (notice?: string) => {
    setAdaptive(null);
    setActivePlan(null);
    setOutcomeNotice(notice ?? null);
    setLaunch((n) => n + 1);
  };
  // Route/account changes end this feature selection; no source text is persisted.
  const scope = useLearningScope();
  useEffect(() => {
    setFocusLesson(null);
    setAdaptive(null);
    setActivePlan(null);
    setOutcomeNotice(null);
  }, [lessonId, scope]);
  if (adaptive && adaptive.learnerScope === scope)
    return (
      <PracticeSession
        key={`adaptive:${launch}`}
        lessonId={null}
        adaptive={adaptive}
        onStartAdaptive={start}
        onExitAdaptive={exit}
        activePlan={activePlan}
        onStartPlan={startPlan}
        onDetachPlan={() => setActivePlan(null)}
        outcomeNotice={outcomeNotice}
      />
    );
  return lessonId ? (
    <LessonPractice
      key={lessonId}
      lessonId={lessonId}
      onStartAdaptive={start}
      onNextLesson={openNextLesson}
      focusOnMount={focusLesson === lessonId}
    />
  ) : (
    <PracticeSession
      key={`general:${scope}:${launch}`}
      lessonId={null}
      onStartAdaptive={start}
      activePlan={activePlan?.plan.learnerScope === scope ? activePlan : null}
      onStartPlan={startPlan}
      onExitAdaptive={exit}
      onDetachPlan={() => setActivePlan(null)}
      outcomeNotice={outcomeNotice}
    />
  );
}

function LessonPractice({
  lessonId,
  onStartAdaptive,
  onNextLesson,
  focusOnMount,
}: {
  lessonId: number;
  onStartAdaptive: (selection: AdaptiveSelection) => void;
  onNextLesson: (id: number) => void;
  focusOnMount: boolean;
}) {
  const { catalog } = useLessonCatalog();
  const published = catalog.filter((lesson) => lesson.status === "Published").sort((a, b) => a.id - b.id);
  const currentIndex = published.findIndex((lesson) => lesson.id === lessonId);
  const nextLesson = currentIndex >= 0 ? published[currentIndex + 1] : undefined;
  const latest = catalog.find(
    (lesson) => lesson.id === lessonId && lesson.status === "Published",
  )?.content;
  const availableText = useRef(latest);
  if (latest) availableText.current = latest;
  // A catalog refresh (including removal) cannot destroy an already mounted session.
  if (!availableText.current)
    return (
      <div className="p-8 text-slate-500">
        This lesson is unavailable. Choose a published lesson to practice.
      </div>
    );
  return (
    <PracticeSession
      lessonId={lessonId}
      lessonText={availableText.current}
      onStartAdaptive={onStartAdaptive}
      onNextLesson={nextLesson ? () => onNextLesson(nextLesson.id) : undefined}
      focusOnMount={focusOnMount}
    />
  );
}

function PracticeSession({
  lessonId,
  lessonText,
  adaptive,
  onStartAdaptive,
  onExitAdaptive,
  activePlan,
  onStartPlan,
  onDetachPlan,
  outcomeNotice,
  onNextLesson,
  focusOnMount = false,
}: {
  lessonId: number | null;
  lessonText?: string;
  adaptive?: AdaptiveSelection;
  onStartAdaptive: (selection: AdaptiveSelection) => void;
  onExitAdaptive?: (notice?: string) => void;
  onDetachPlan?: () => void;
  outcomeNotice?: string | null;
  activePlan?: ActivePlan | null;
  onNextLesson?: () => void;
  focusOnMount?: boolean;
  onStartPlan?: (
    plan: LearningSessionPlan,
    selection: AdaptiveSelection | null,
    stage?: "primary" | "secondary",
  ) => void;
}) {
  const surfaceRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activePlan || focusOnMount) surfaceRoot.current?.querySelector("textarea")?.focus();
  }, [activePlan, focusOnMount]);
  const [mode, setMode] = useState<PracticeMode>("words");
  const [launchFailure, setLaunchFailure] = useState<string | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [showMistakePractice, setShowMistakePractice] = useState(false);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const wasPracticingMistakes = useRef(false);
  useEffect(() => {
    if (wasPracticingMistakes.current && !showMistakePractice) reviewButton.current?.focus();
    wasPracticingMistakes.current = showMistakePractice;
  }, [showMistakePractice]);
  const [passage, setPassage] = useState(
    () => adaptive?.exercise.text ?? pickText("words"),
  );
  const configFor = (text: string, sourceMode = mode, planned = !!activePlan) =>
    adaptive
      ? {
          mode: "fixed-text" as const,
          completionPolicy: "require-correct-target" as const,
          preparedText: adaptive.exercise.preparedText,
          sourceIdentity: adaptive.exercise.source,
        }
      : createSourceSessionConfig(
          prepareTextSource({
            type: lessonId ? "lesson" : "corpus",
            id: lessonId ? `lesson-${lessonId}` : `practice-${sourceMode}`,
            version: textContentVersion(text),
            text,
          }),
          { mode: "fixed-text", completionPolicy: planned ? "require-correct-target" : "target-covered" },
        );
  const config = useMemo(
    () => configFor(lessonText || passage),
    [lessonId, lessonText, passage, mode, activePlan],
  );
  const session = useTypingSession(config);
  const result = useTypingResult(session);
  const lessonPassed = !!result && qualifiesLesson(result);
  useEffect(() => {
    if (!result) { setShowReview(false); setShowMistakePractice(false); }
  }, [result]);
  const learningScope = useLearningScope();
  const { mastery } = useLearningProfile(learningScope);
  const service = getLearningService();
  usePlannerOutcomes(learningScope);
  usePlannedAttempt(
    session,
    activePlan?.plan.learnerScope ?? null,
    activePlan?.attemptId ?? null,
  );
  const secondaryReady = !!(
    activePlan?.stage === "primary" &&
    learningScope &&
    service.canContinuePlanned(learningScope, activePlan.plan)
  );
  useEffect(() => {
    if (secondaryReady && activePlan && learningScope)
      service.offerPlanned(learningScope, activePlan.plan, "secondary");
  }, [secondaryReady, activePlan?.plan.id, learningScope, service]);
  const adaptiveIdentity = adaptive
    ? recommendationIdentity(adaptive.recommendation)
    : null;
  const adaptiveState = adaptiveIdentity
    ? mastery.records.find(
        (r) => weaknessKey(r.identity) === weaknessKey(adaptiveIdentity),
      )?.state
    : null;
  const isAssessment =
    adaptive?.exercise.generatedFrom.composition?.purpose ===
    "controlled-transfer-assessment";
  const waitingForTransfer =
    adaptiveState === "TRANSFER_CHECK" ||
    adaptiveState === "PROVISIONAL_MASTERY";
  useSessionLearning(
    session,
    learningScope,
    undefined,
    adaptive
      ? {
          sourceId: adaptive.exercise.source.id,
          sourceVersion: adaptive.exercise.source.version,
          focusType: adaptive.spec.focusType,
          focusItems: adaptive.spec.focusItems,
          composition: adaptive.exercise.generatedFrom.composition,
          assessmentCheckOrder: adaptive.assessmentCheckOrder,
        }
      : undefined,
  );
  const saved = useRef(new WeakSet<SessionResult>());
  const { addResult, completeLesson, preferences } = useLearningData();

  useEffect(() => {
    if (!result || saved.current.has(result)) return;
    saved.current.add(result);
    addResult({
      mode: "practice",
      label: adaptive
        ? adaptive.exercise.generatedFrom.composition?.purpose ===
          "controlled-transfer-assessment"
          ? "Mastery check"
          : "Adaptive practice"
        : lessonId
          ? `Lesson ${lessonId}`
          : modes.find((item) => item.key === mode)?.label || "Practice",
      wpm: Math.round(result.metrics.correctWpm),
      accuracy: Number(result.metrics.attemptAccuracy.toFixed(2)),
      characters: result.counts.currentTypedUnits,
      errors: result.counts.incorrectInsertionAttempts,
      durationSeconds: Math.max(1, Math.round(result.activeElapsedMs / 1000)),
    });
    if (lessonId && qualifiesLesson(result)) completeLesson(lessonId);
  }, [result, lessonId, mode, adaptive, addResult, completeLesson]);

  const declineOffer = () => {
    if (!learningScope) return;
    const offered = service.getOutcomeSnapshot(learningScope).current;
    if (offered?.lifecycle === "offered")
      service.skipPlanned(learningScope, offered.attemptId);
  };
  const finishPlan = () => {
    if (secondaryReady && activePlan && learningScope) {
      const offered = service.offerPlanned(
        learningScope,
        activePlan.plan,
        "secondary",
      );
      if (offered.ok)
        service.skipPlanned(learningScope, offered.attempt.attemptId);
    }
    onExitAdaptive?.("Session finished. Your completed practice is saved.");
  };
  const cancelCurrent = () => {
    if (!result) {
      session.abort();
      if (activePlan && learningScope)
        service.cancelPlanned(
          learningScope,
          activePlan.attemptId,
          session.run.getSnapshot(),
        );
    } else if (secondaryReady && activePlan && learningScope) {
      const offered = service.offerPlanned(
        learningScope,
        activePlan.plan,
        "secondary",
      );
      if (offered.ok)
        service.skipPlanned(learningScope, offered.attempt.attemptId);
    }
  };
  const exitActivity = () => {
    cancelCurrent();
    if (!activePlan) declineOffer();
    onExitAdaptive?.(
      activePlan && !result
        ? "This activity wasn’t completed. Your learning progress wasn’t changed."
        : undefined,
    );
  };
  const chooseAdaptive = (selection: AdaptiveSelection) => {
    cancelCurrent();
    if (!activePlan) declineOffer();
    onStartAdaptive(selection);
  };
  const detachToNormal = () => {
    if (activePlan) {
      cancelCurrent();
      onDetachPlan?.();
    } else declineOffer();
  };
  const changeMode = (nextMode: PracticeMode) => {
    detachToNormal();
    setMode(nextMode);
    const nextText = pickText(
      nextMode,
      mode === nextMode ? passage : undefined,
    );
    setPassage(nextText);
    session.restart(configFor(nextText, nextMode, false));
  };
  const newText = () => {
    if (adaptive) {
      const next = learningScope
        ? getLearningService().startAdaptive(
            learningScope,
            adaptive.recommendation,
          )
        : null;
      if (next?.ok) {
        setLaunchFailure(null);
        chooseAdaptive(next.selection);
      } else
        setLaunchFailure(
          "The next exercise could not be prepared. Choose the next practice card or return to normal Practice.",
        );
      return;
    }
    detachToNormal();
    const nextText = lessonText || pickText(mode, passage);
    setPassage(nextText);
    session.restart(configFor(nextText, mode, false));
  };
  const continuePlan = () => {
    if (!activePlan || !learningScope) return;
    const next = getLearningService().startPlanned(
      learningScope,
      activePlan.plan,
      "secondary",
    );
    if (next.ok) {
      setLaunchFailure(null);
      onStartPlan?.(activePlan.plan, next.selection, "secondary");
    } else setLaunchFailure(next.reason);
  };
  const restart = () => {
    if (result && activePlan) {
      // A completed planned activity stays completed; a retry is a separate run.
      detachToNormal();
      session.restart(configFor(passage, mode, false));
    } else session.restart(lessonText ? configFor(lessonText) : undefined);
  };
  const nextAction = result && !adaptive ? lessonId ? lessonPassed ? onNextLesson : undefined : newText : undefined;

  if (showMistakePractice && result) return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <MistakePractice original={result} onBack={() => setShowMistakePractice(false)} layout={preferences.keyboardLayout} showKeyboard={showKeyboard} />
    </div>
  );

  return (
    <div ref={surfaceRoot} className="mx-auto max-w-6xl p-5 sm:p-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-7 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {adaptive
                ? isAssessment
                  ? "Mastery Check"
                  : "Adaptive Practice"
                : lessonId
                  ? `Lesson ${lessonId} practice`
                  : "Practice"}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {adaptive
                ? isAssessment
                  ? "Let’s see how this skill holds up in mixed typing."
                  : (adaptive.explanation ??
                    recommendationText(adaptive.recommendation).reason)
                : lessonId
                  ? `Finish the passage to save your attempt. Reach ${LESSON_PASS_ACCURACY}% accuracy to pass this lesson.`
                  : "Open-ended typing without time pressure"}
            </p>
          </div>
          <button
            onClick={() => setShowKeyboard((visible) => !visible)}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700"
            aria-expanded={showKeyboard}
          >
            {showKeyboard ? "Hide" : "Show"} keyboard
          </button>
        </header>

        {adaptive && (
          <div
            className="mb-5 rounded-xl bg-blue-50 p-3 text-sm text-blue-900"
            aria-label="Adaptive exercise focus"
          >
            {adaptive.exercise.generatedFrom.composition && (
              <p className="mb-1 text-xs">
                {isAssessment
                  ? "Controlled assessment · not ordinary transfer"
                  : `Level ${adaptive.exercise.generatedFrom.composition.level} · ${["Concentrated training", "Contextual training", "Mixed training"][adaptive.exercise.generatedFrom.composition.level]}`}
              </p>
            )}
            <p>
              {adaptive.spec.focusItems.length
                ? `Focus: ${adaptive.spec.focusItems.join(" · ")}`
                : recommendationText(adaptive.recommendation).title}
            </p>
            {adaptive.exercise.contentStrategy === "fallback-drill" && (
              <p className="mt-1 text-xs">
                Target drill with neutral separators and English practice text.
                This does not claim natural-language practice for the focus
                items.
              </p>
            )}
            <button
              type="button"
              onClick={exitActivity}
              className="mt-2 text-xs underline"
            >
              Back to normal Practice
            </button>
          </div>
        )}
        {outcomeNotice && (
          <p role="status" className="mb-3 text-sm text-slate-600">
            {outcomeNotice}
          </p>
        )}
        {activePlan && !result && (
          <button
            type="button"
            onClick={exitActivity}
            className="mb-4 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Cancel activity
          </button>
        )}
        {launchFailure && (
          <p role="alert" className="mb-3 text-sm text-amber-700">
            {launchFailure}
          </p>
        )}
        {!lessonId && !adaptive && (!activePlan || result) && onStartPlan && (
          <SessionPlanCard onStart={onStartPlan} />
        )}
        {activePlan && (
          <p
            className="mb-3 text-sm text-blue-700"
            aria-label="Current session focus"
          >
            {activePlan.stage === "secondary"
              ? "Supporting activity: general typing practice"
              : planTitle[activePlan.plan.purpose]}
          </p>
        )}
        <LearningRecommendations
          onStart={chooseAdaptive}
          onNormal={exitActivity}
        />

        {!lessonId && !adaptive && (
          <div
            className="mb-6 flex flex-wrap gap-2"
            role="tablist"
            aria-label="Practice text type"
          >
            {modes.map(({ key, label, icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={mode === key}
                onClick={() => changeMode(key)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${mode === key ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
              >
                <span aria-hidden>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}

        <TypingLiveStats session={session} />
        <TypingPracticeSurface session={session} onNext={nextAction} nextLabel={lessonId ? "Next lesson" : "Next text"} onRestart={restart} />

        {result ? (
          <div className={`mt-6 rounded-2xl border p-6 text-center ${lessonId && !lessonPassed ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
            <p className="mb-2 text-2xl" aria-hidden>
              {lessonId && !lessonPassed ? "📝" : "🎉"}
            </p>
            <h2 className={`mb-1 text-lg font-semibold ${lessonId && !lessonPassed ? "text-amber-800" : "text-emerald-800"}`}>
              {lessonId ? lessonPassed ? "Lesson passed!" : "Attempt finished — try again" : result.counts.uncorrectedErrors ? "Attempt finished" : "Nice work!"}
            </h2>
            <p className="mb-4 text-sm text-emerald-700">
              {Math.round(result.metrics.correctWpm)} WPM ·{" "}
              {result.metrics.attemptAccuracy.toFixed(2)}% accuracy ·{" "}
              {result.counts.incorrectInsertionAttempts} {result.counts.incorrectInsertionAttempts === 1 ? "mistake" : "mistakes"} · {result.counts.uncorrectedErrors} uncorrected
            </p>
            {lessonId && <p role="status" className={`mb-4 text-sm ${lessonPassed ? "text-emerald-700" : "text-amber-800"}`}>
              {lessonPassed ? "Your lesson is complete and your attempt is saved." : `Your attempt is saved. Reach ${LESSON_PASS_ACCURACY}% attempt accuracy to unlock the next lesson. No speed requirement.`}
            </p>}
            {result.mistakes.length > 0 && <div className="mb-4">
              <div className="flex flex-wrap justify-center gap-2">
                <button ref={reviewButton} type="button" onClick={() => setShowReview((visible) => !visible)} aria-expanded={showReview} aria-controls="practice-mistake-review" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800">{showReview ? "Hide mistakes" : "Review mistakes"}</button>
                <button type="button" onClick={() => setShowMistakePractice(true)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">Practice mistakes</button>
              </div>
              {showReview && <div id="practice-mistake-review"><MistakeReview result={result} /></div>}
            </div>}
            {secondaryReady && (
              <div className="mb-3">
                <p className="mb-3 text-sm text-emerald-700">
                  Nice work. You can continue with a short general practice, or
                  finish here.
                </p>
                <button
                  type="button"
                  onClick={continuePlan}
                  className="mr-3 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Continue planned session
                </button>
                <button
                  type="button"
                  onClick={finishPlan}
                  className="mt-2 rounded-xl border border-emerald-300 px-6 py-2.5 text-sm font-medium text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Finish session
                </button>
              </div>
            )}
            {activePlan?.stage === "secondary" && (
              <p className="mb-3 text-sm text-emerald-700">
                Session plan complete.
              </p>
            )}
            <button
              onClick={adaptive && waitingForTransfer ? exitActivity : lessonId ? restart : newText}
              aria-keyshortcuts={lessonId ? "Control+Shift+Enter Meta+Shift+Enter" : !adaptive ? "Control+Enter Meta+Enter" : undefined}
              className={lessonId && onNextLesson
                ? "mr-3 rounded-xl border border-emerald-300 px-6 py-2.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
                : "rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"}
            >
              {adaptive && waitingForTransfer
                ? "Continue in normal Practice"
                : lessonId || adaptive
                  ? lessonId && !lessonPassed ? "Retry lesson" : "Practice again"
                  : "Next text →"}
            </button>
            {!lessonId && <button
              type="button"
              onClick={restart}
              aria-keyshortcuts="Control+Shift+Enter Meta+Shift+Enter"
              className="ml-3 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white"
            >Restart passage</button>}
            {lessonId && onNextLesson && (
              <button
                type="button"
                onClick={onNextLesson}
                disabled={!lessonPassed}
                aria-keyshortcuts={lessonPassed ? "Control+Enter Meta+Enter" : undefined}
                className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                Next lesson →
              </button>
            )}
            {lessonId && !onNextLesson && (
              <p className="mt-3 text-sm text-emerald-700">
                No next published lesson is available. <Link to="/lessons" className="font-medium underline">Back to lessons</Link>
              </p>
            )}
            {nextAction && (
              <p className="mt-3 text-xs text-emerald-700">
                <kbd>Ctrl + Enter</kbd> / <kbd>⌘ + Enter</kbd> for next {lessonId ? "lesson" : "text"}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              onClick={restart}
              aria-keyshortcuts="Control+Shift+Enter Meta+Shift+Enter"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              ↺ Restart
            </button>
            {!adaptive && (
              <button
                onClick={newText}
                className="text-sm text-slate-500 transition-colors hover:text-slate-700"
              >
                {lessonId ? "Practice again" : "↺ New text"}
              </button>
            )}
          </div>
        )}
      </div>

      {showKeyboard && (
        <div className="mx-auto mt-8 w-full max-w-[1100px]">
          <TypingKeyboardFeedback
            session={session}
            layout={preferences.keyboardLayout}
          />
        </div>
      )}
    </div>
  );
}
