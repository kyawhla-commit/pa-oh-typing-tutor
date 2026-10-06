import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Award, Check, Clock3, Crosshair, Gauge, Keyboard, RotateCcw, ShieldCheck, Sparkles, Target, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useLearningData } from "../../data/LearningContext";
import type { SessionResult } from "../../engine/typing";
import { useTypingResult, useTypingSession } from "../typing/useTypingSession";
import { TestMetrics, TestText } from "./TimedTestSurface";
import { DIFFICULTIES, DURATIONS, WORD_LIMITS, prepareTest, type Difficulty, type TestSelection } from "./timedText";

import { testResultSummary } from "./testResult";

import { useLearningScope, useSessionLearning } from "../learning/useLearningProfile";

const DIFFICULTY_DETAILS: Record<Difficulty, string> = {
  Easy: "Common words and a relaxed pace",
  Medium: "Everyday punctuation and longer phrases",
  Hard: "Complex vocabulary and precise punctuation",
};

function formatDuration(seconds: number) {
  return seconds === 300 ? "5 min" : `${seconds} sec`;
}

export default function Test() {
  const { preferences } = useLearningData();
  const [testMode, setTestMode] = useState<"timed" | "word-count">("timed");
  const [wordLimit, setWordLimit] = useState<number>(25);
  const [duration, setDuration] = useState<number>(60);
  const [difficulty, setDifficulty] = useState<Difficulty>(
    DIFFICULTIES.includes(preferences.difficulty as Difficulty) ? preferences.difficulty as Difficulty : "Medium",
  );
  const [run, setRun] = useState<TestSelection | null>(null);
  const startTest = () => setRun(testMode === "timed" ? { mode: "timed", duration, difficulty } : { mode: "word-count", wordLimit, difficulty });
  if (run) return <TestRun selection={run} onReset={() => setRun(null)} />;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-7 p-5 sm:p-7 lg:p-8" aria-labelledby="test-setup-title">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.14em] text-[#94A3B8]">Measure your progress</p>
          <h1 id="test-setup-title" className="text-2xl font-bold text-[#0F172A] sm:text-3xl">Typing test</h1>
          <p className="mt-1 text-sm text-[#64748B]">A focused check of your speed and accuracy. Choose a setup and begin when ready.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"><Sparkles size={15} /> Your goal: {preferences.targetWpm} WPM</div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <section className="space-y-5 rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-7" aria-label="Test settings">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-[#0F172A]">Test type</h2>
            <div className="flex gap-2" role="group" aria-label="Choose test type">
              {(["timed", "word-count"] as const).map(mode => <button key={mode} type="button" aria-pressed={testMode === mode} onClick={() => setTestMode(mode)} className={`rounded-xl border px-5 py-2 text-sm font-semibold ${testMode === mode ? "border-[#2563EB] bg-blue-50 text-[#2563EB]" : "border-[#E2E8F0] text-[#475569]"}`}>{mode === "timed" ? "Time" : "Words"}</button>)}
            </div>
          </div>
          {testMode === "word-count" ? <div>
            <h2 className="mb-3 text-sm font-semibold text-[#0F172A]">Word target</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Choose word target">
              {WORD_LIMITS.map(limit => <button key={limit} type="button" aria-pressed={wordLimit === limit} onClick={() => setWordLimit(limit)} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${wordLimit === limit ? "border-[#2563EB] bg-blue-50 text-[#2563EB] ring-1 ring-blue-200" : "border-[#E2E8F0] text-[#475569] hover:bg-slate-50"}`}>{limit} words</button>)}
            </div>
          </div> : <div>
            <div className="mb-3 flex items-center gap-2"><Clock3 size={16} className="text-[#2563EB]" /><h2 className="text-sm font-semibold text-[#0F172A]">Test duration</h2></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Choose test duration">
              {DURATIONS.map((seconds) => <button key={seconds} type="button" aria-pressed={duration === seconds} onClick={() => setDuration(seconds)} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${duration === seconds ? "border-[#2563EB] bg-blue-50 text-[#2563EB] ring-1 ring-blue-200" : "border-[#E2E8F0] text-[#475569] hover:border-blue-200 hover:bg-slate-50"}`}><span className="block">{formatDuration(seconds)}</span><span className={`mt-1 block text-[10px] font-normal ${duration === seconds ? "text-blue-600" : "text-[#94A3B8]"}`}>{seconds === 15 ? "Quick warm-up" : seconds === 30 ? "Short sprint" : seconds === 60 ? "Recommended" : "Endurance"}</span></button>)}
            </div>
          </div>}

          <div>
            <div className="mb-3 flex items-center gap-2"><Target size={16} className="text-[#2563EB]" /><h2 className="text-sm font-semibold text-[#0F172A]">Passage difficulty</h2></div>
            <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Choose passage difficulty">
              {DIFFICULTIES.map((level) => <button key={level} type="button" aria-pressed={difficulty === level} onClick={() => setDifficulty(level)} className={`rounded-xl border p-3 text-left transition ${difficulty === level ? "border-[#2563EB] bg-blue-50 ring-1 ring-blue-200" : "border-[#E2E8F0] hover:border-blue-200 hover:bg-slate-50"}`}><span className={`block text-sm font-semibold ${difficulty === level ? "text-[#2563EB]" : "text-[#334155]"}`}>{level}</span><span className="mt-1 block text-[10px] leading-relaxed text-[#64748B]">{DIFFICULTY_DETAILS[level]}</span></button>)}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-[#F1F5F9] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-sm text-xs leading-relaxed text-[#64748B]">Find a comfortable posture, keep your eyes on the passage, and let accuracy guide your pace.</p>
            <button type="button" onClick={startTest} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200">Start test <ArrowRight size={16} /></button>
          </div>
        </section>

        <aside className="flex flex-col justify-between gap-5 rounded-3xl bg-gradient-to-br from-[#1D4ED8] to-[#4338CA] p-6 text-white sm:p-7">
          <div>
            <div className="mb-5 grid h-11 w-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20"><Gauge size={20} /></div>
            <h2 className="text-lg font-bold">A better measure of progress</h2>
            <p className="mt-2 text-sm leading-relaxed text-blue-100">Each test tracks correct characters, accuracy, and words per minute to help you see how your typing is changing.</p>
          </div>
          <div className="space-y-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
            <div className="flex items-start gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15"><Check size={13} /></span><div><p className="text-xs font-semibold">Mistakes are okay</p><p className="mt-0.5 text-[11px] leading-relaxed text-blue-100">Correct them with Backspace and keep going.</p></div></div>
            <div className="flex items-start gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15"><Check size={13} /></span><div><p className="text-xs font-semibold">Your choice of pace</p><p className="mt-0.5 text-[11px] leading-relaxed text-blue-100">Cancel a run any time, or finish your selected target.</p></div></div>
            <div className="flex items-start gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15"><Check size={13} /></span><div><p className="text-xs font-semibold">Keep your results</p><p className="mt-0.5 text-[11px] leading-relaxed text-blue-100">Save completed tests to your learning history. Signed-in sessions sync across devices.</p></div></div>
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-[#94A3B8]"><span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> No account sync required</span><span className="inline-flex items-center gap-1.5"><Keyboard size={13} /> Keyboard-first typing</span><span className="inline-flex items-center gap-1.5"><Clock3 size={13} /> Results saved only when you choose</span></div>
    </main>
  );
}

function TestRun({ selection, onReset }: { selection: TestSelection; onReset: () => void }) {
  const { difficulty } = selection;
  const session = useTypingSession(prepareTest(selection));
  const result = useTypingResult(session);
  const learningScope = useLearningScope();
  useSessionLearning(session,learningScope);
  if (result) return <TestResults snapshot={result} difficulty={difficulty} onReset={onReset} />;
  return <main className="mx-auto w-full max-w-5xl space-y-5 p-5 sm:p-7 lg:p-8" aria-labelledby="active-test-title">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#94A3B8]">Typing test · {selection.mode === "word-count" ? `${selection.wordLimit} words` : "Time"} · {difficulty}</p><h1 id="active-test-title" className="mt-1 text-xl font-bold text-[#0F172A]">Stay in your rhythm</h1></div>
      <button type="button" onClick={() => { session.abort(); onReset(); }} className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm font-medium text-[#64748B] transition hover:border-red-200 hover:text-red-600"><X size={16} /> End test</button>
    </header>
    <TestMetrics session={session} />
    <TestText session={session} />
  </main>;
}

function TestResults({ snapshot, difficulty, onReset: resetTest }: { snapshot: SessionResult; difficulty: Difficulty; onReset: () => void }) {
  const { addResult, preferences, syncStatus, syncError } = useLearningData();
  const [saved, setSaved] = useState(false);
  const savedRef = useRef(false);
  // Display/persistence mapping only: the engine owns metrics and final timing.
  const result = testResultSummary(snapshot, difficulty);
  const saveResult = () => {
    if (savedRef.current) return;
    savedRef.current = true;
    addResult(result);
    setSaved(true);
  };
  const targetReached = result.wpm >= preferences.targetWpm;
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-5 sm:p-7 lg:p-8" aria-labelledby="test-results-title">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#64748B] transition hover:text-[#2563EB]"><ArrowLeft size={16} /> Back to dashboard</Link>
      <section className="overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-sm">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-8 text-white sm:px-10 sm:py-10">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20"><Award size={28} /></div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-100">{result.label} difficulty</p>
            <h1 id="test-results-title" className="mt-2 text-3xl font-bold sm:text-4xl">Test complete</h1>
            <p className="mt-2 text-sm text-blue-100">{targetReached ? "You reached your target speed. Keep building that accuracy." : "A focused session is a good step forward. Your next run is ready when you are."}</p>
            <div className="mt-6 flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium"><Target size={16} /> Your target: {preferences.targetWpm} WPM</div>
          </div>
        </div>
        <div className="p-5 sm:p-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Typing speed", value: result.wpm, unit: "WPM", icon: Gauge, color: "text-blue-600 bg-blue-50" },
              { label: "Accuracy", value: result.accuracy, unit: "%", icon: Crosshair, color: "text-emerald-600 bg-emerald-50" },
              { label: "Characters", value: result.characters, unit: "typed", icon: Keyboard, color: "text-violet-600 bg-violet-50" },
              { label: "Errors", value: result.errors, unit: "errors", icon: ShieldCheck, color: result.errors ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50" },
            ].map(({ label, value, unit, icon: Icon, color }) => (
              <article key={label} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
                <div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={18} /></div>
                <p className="text-2xl font-bold tabular-nums text-[#0F172A] sm:text-3xl">{value}<span className="ml-1 text-xs font-medium text-[#64748B]">{unit}</span></p>
                <p className="mt-1 text-xs text-[#64748B]">{label}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-[#F8FAFC] p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-[#0F172A]">Attempt accuracy</span><span className="font-semibold text-emerald-600">{result.accuracy}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E2E8F0]"><div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${result.accuracy}%` }} /></div>
            <p className="mt-2 text-xs text-[#64748B]">{snapshot.counts.currentCorrectUnits} currently correct graphemes out of {result.characters} typed; {snapshot.counts.uncorrectedErrors} remaining errors.</p>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={resetTest} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] px-5 py-3 text-sm font-semibold text-[#334155] transition hover:bg-slate-50"><RotateCcw size={16} /> Try another test</button>
            <button type="button" onClick={saveResult} disabled={saved} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-default disabled:bg-emerald-600">{saved ? <><Check size={16} /> Saved to your progress</> : <>Save result <ArrowRight size={16} /></>}</button>
          </div>
          <p className="mt-3 text-center text-xs text-[#64748B]" role={syncStatus === "error" && saved ? "status" : undefined}>
            {!saved && "Save this result to add it to your learning history."}
            {saved && syncStatus === "synced" && "Saved to your account and synced with Supabase."}
            {saved && syncStatus === "syncing" && "Saved to your history on this device. Syncing with Supabase…"}
            {saved && syncStatus === "local" && "Saved to your learning history on this device."}
            {saved && syncStatus === "error" && `Saved on this device, but account sync needs attention${syncError ? `: ${syncError}` : "."}`}
          </p>
        </div>
      </section>
    </main>
  );
}
