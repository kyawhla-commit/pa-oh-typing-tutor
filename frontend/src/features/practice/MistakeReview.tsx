import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import type { SessionResult } from "../../engine/typing";
import VirtualKeyboard from "../../components/VirtualKeyboard";
import { TypingKeyboardFeedback, TypingLiveStats, TypingPracticeSurface } from "../typing/TypingPracticeSurface";
import { useTypingResult, useTypingSession } from "../typing/useTypingSession";
import { describeTypingUnit, mistakePracticeText, reviewMistakes, visibleTypingText } from "../typing/mistakeReview";

export function MistakeReview({ result }: { result: SessionResult }) {
  const mistakes = useMemo(() => reviewMistakes(result), [result]);
  return <section aria-label="Mistake review" className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-left">
    <h3 className="font-semibold text-slate-900">Expected vs typed</h3>
    <p className="mt-1 text-xs text-slate-600">␣ = Space · ⇥ = Tab · ↵ = Enter. Spaces at the start of a line are indentation.</p>
    <ol className="mt-3 max-h-80 space-y-2 overflow-y-auto">
      {mistakes.map((mistake) => <li key={mistake.attempt} className="rounded-lg bg-slate-50 p-3 text-sm">
        <p className="text-xs text-slate-600">Line {mistake.line}, character {mistake.column} · {mistake.correctedAtMs === null ? "Uncorrected" : "Corrected during attempt"}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <span>Expected: <code className="whitespace-pre-wrap text-emerald-700">{describeTypingUnit(mistake.expected)}</code></span>
          <span>Typed: <code className="whitespace-pre-wrap text-red-700">{describeTypingUnit(mistake.actual)}</code></span>
        </div>
      </li>)}
    </ol>
  </section>;
}

/** Local review drill: never marks a lesson passed or replaces its saved result. */
export function MistakePractice({ original, onBack, layout, showKeyboard }: {
  original: SessionResult; onBack: () => void;
  layout: ComponentProps<typeof VirtualKeyboard>["layout"]; showKeyboard: boolean;
}) {
  const text = useMemo(() => mistakePracticeText(original), [original]);
  const session = useTypingSession({ targetText: text, completionPolicy: "target-covered" });
  const result = useTypingResult(session);
  const host = useRef<HTMLDivElement>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(showKeyboard);
  useEffect(() => { host.current?.querySelector("textarea")?.focus({ preventScroll: true }); }, []);
  return <div ref={host} className="practice-content mx-auto max-w-4xl" aria-label="Mistake practice">
    <header className="mb-5">
      <h1 className="text-2xl font-semibold text-slate-900">Practice mistakes</h1>
      <p className="mt-2 text-sm text-slate-600">Practice the affected words or code lines. Your original score stays saved. To improve that score, retry the full passage.</p>
      <button type="button" onClick={onBack} className="mt-3 text-sm font-medium text-blue-700 underline">Back to result</button>
    </header>
    <details className="mb-5 rounded-xl border border-slate-200 bg-white p-3 text-sm">
      <summary className="cursor-pointer text-slate-700">Show spaces and line breaks in this drill</summary>
      <pre className="mt-3 whitespace-pre-wrap break-words text-slate-700">{visibleTypingText(text)}</pre>
    </details>
    <TypingLiveStats session={session} />
    <TypingPracticeSurface session={session} onNext={result ? onBack : undefined} nextLabel="Back to result" onRestart={() => session.restart()} layout={layout} showGuide={!keyboardVisible} />
    {!result && <button type="button" onClick={() => session.restart()} aria-keyshortcuts="Control+Shift+Enter Meta+Shift+Enter" className="mt-4 text-sm text-slate-600">Restart drill</button>}
    {result && <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
      <p role="status" className="font-medium text-slate-800">Drill finished — {result.metrics.attemptAccuracy.toFixed(2)}% accuracy</p>
      {result.mistakes.length > 0 && <MistakeReview result={result} />}
      <button type="button" onClick={() => session.restart()} aria-keyshortcuts="Control+Shift+Enter Meta+Shift+Enter" className="mr-3 mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">Retry mistakes</button>
      <button type="button" onClick={onBack} aria-keyshortcuts="Control+Enter Meta+Enter" className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm">Back to result</button>
      <p className="mt-3 text-xs text-slate-600">Ctrl + Enter / ⌘ + Enter to return to your result.</p>
    </div>}
    <button type="button" onClick={() => setKeyboardVisible((visible) => !visible)} className="mt-5 text-sm text-slate-600">{keyboardVisible ? "Hide" : "Show"} keyboard</button>
    {keyboardVisible && <div className="mt-4"><TypingKeyboardFeedback session={session} layout={layout} /></div>}
  </div>;
}
