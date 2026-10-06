import { memo } from "react";
import { useTypingFeedback, useTypingStats, type TypingSession } from "../typing/useTypingSession";
import { useTypingInput } from "../typing/useTypingInput";
import { timedPassageWindow } from "./timedText";

export const TestMetrics = memo(function TestMetrics({ session }: { session: TypingSession }) {
  const snapshot = useTypingStats(session);
  const words = snapshot.wordProgress;
  const timeLeft = Math.ceil((snapshot.remainingMs ?? 0) / 1000);
  return <section className="grid grid-cols-3 gap-3" aria-label="Live test metrics">
    <article className={`rounded-2xl border p-4 text-center ${!words && timeLeft <= 10 ? "border-amber-200 bg-amber-50" : "border-[#E2E8F0] bg-white"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#475569]">{words ? "Words left" : "Time left"}</p>
      <p role={words ? undefined : "timer"} aria-label={words ? `${words.remainingWords} words remaining` : `${timeLeft} seconds remaining`} className={`mt-1 font-mono text-2xl font-bold tabular-nums sm:text-3xl ${!words && timeLeft <= 10 ? "text-amber-600" : "text-[#0F172A]"}`}>{words ? words.remainingWords : timeLeft}<span className="ml-1 text-xs font-medium">{words ? "words" : "s"}</span></p>
    </article>
    <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4 text-center"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#475569]">Speed</p><p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#2563EB] sm:text-3xl">{Math.round(snapshot.metrics.correctWpm)}<span className="ml-1 text-xs font-medium">WPM</span></p></article>
    <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4 text-center"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#475569]">Accuracy</p><p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-600 sm:text-3xl">{Math.round(snapshot.metrics.attemptAccuracy)}<span className="ml-1 text-xs font-medium">%</span></p></article>
  </section>;
});

const TimedProgress = memo(function TimedProgress({ session }: { session: TypingSession }) {
  const snapshot = useTypingStats(session);
  const progress = Math.floor(snapshot.progress * 100);
  return <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#F1F5F9]" role="progressbar" aria-label={snapshot.mode === "word-count" ? "Target word progress" : "Test duration progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
    <div className="h-full rounded-full bg-[#2563EB] transition-[width] duration-200" style={{ width: `${progress}%` }} />
  </div>;
});

const TimedCharacter = memo(function TimedCharacter({ position, text, correct, current }: {
  position: number; text: string; correct: boolean | undefined; current: boolean;
}) {
  return <span data-position={position} className={`typing-char ${correct === undefined ? current ? "pending" : "pending text-[#475569]" : correct ? "correct text-emerald-700" : "incorrect rounded bg-red-100 text-red-700"} ${current ? "current rounded bg-[#2563EB] text-white ring-2 ring-blue-200" : ""}`}>{text}</span>;
});

export const TestText = memo(function TestText({ session }: { session: TypingSession }) {
  const { snapshot, generation } = useTypingFeedback(session);
  const { input, focus } = useTypingInput(session, generation, true);
  const window = timedPassageWindow(snapshot);
  const typedPreview = snapshot.typedUnits.slice(-120).map(unit => unit.text).join("");
  return <section className="rounded-3xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-7">
    <div className="mb-4 flex items-center justify-between gap-3 text-xs text-[#64748B]"><span className="font-medium">Type the passage below</span><span className="tabular-nums">{snapshot.wordProgress ? `${snapshot.wordProgress.consumedWords} / ${snapshot.wordProgress.targetWordCount} words consumed` : `${snapshot.currentPosition} graphemes typed`}</span></div>
    <TimedProgress session={session} />
    <div onClick={focus} data-testid="timed-passage" className="mb-4 min-h-44 cursor-text whitespace-pre-wrap rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 font-mono text-base leading-8 tracking-wide sm:min-h-48 sm:p-7 sm:text-lg">
      {window.map(({ position, text }) => <TimedCharacter key={position} position={position} text={text}
        correct={snapshot.typedUnits[position]?.correct} current={position === snapshot.currentPosition} />)}
    </div>
    <label htmlFor="typing-test-input" className="mb-2 mt-5 block text-xs font-semibold text-[#334155]">Your typing</label>
    <div onClick={focus} className="relative min-h-28 cursor-text rounded-2xl border border-[#CBD5E1] bg-white px-4 py-3 font-mono text-sm leading-7 text-[#0F172A] focus-within:border-[#2563EB] focus-within:ring-4 focus-within:ring-blue-100">
      <textarea id="typing-test-input" ref={input} aria-label="Typing input" aria-describedby="typing-test-hint" rows={3} autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="off" className="absolute inset-0 h-full w-full resize-none opacity-0" />
      <div aria-hidden="true" className="pointer-events-none whitespace-pre-wrap break-words" data-testid="typed-preview">{typedPreview || <span className="text-[#475569]">Click here and start typing…</span>}</div>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]"><p id="typing-test-hint">Backspace corrects mistakes. Pasting is disabled. {snapshot.mode === "word-count" ? "The test finishes at the final target character." : "The timer starts with your first character."}</p></div>
  </section>;
});

// Existing Slice 3 fixtures retain their imports; the implementation serves both tests.
export { TestMetrics as TimedTestMetrics, TestText as TimedTestText };
