// Controlled-clock browser fixture; never a product route or production build entry.
import { StrictMode, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createTypingSession, useTypingFeedback, useTypingResult, useTypingStats, type TypingSession } from "../../src/features/typing/useTypingSession";
import { TimedTestMetrics, TimedTestText } from "../../src/features/tests/TimedTestSurface";
import "../../src/index.css";
const corpus = "é👩‍💻\na ";
function Fixture() {
  const clock = useRef(0);
  const [session] = useState(() => createTypingSession({ mode: "timed", durationMs: 1000, textPolicy: "repeat-corpus", targetText: corpus }, () => clock.current));
  const commit = (text: string) => {
    const input = document.querySelector<HTMLTextAreaElement>("textarea")!;
    input.focus();
    input.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: text, cancelable: true, bubbles: true }));
  };
  const compose = () => {
    const input = document.querySelector<HTMLTextAreaElement>("textarea")!; input.focus();
    input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    input.dispatchEvent(new InputEvent("input", { inputType: "insertCompositionText", data: "e", isComposing: true, bubbles: true }));
    input.dispatchEvent(new CompositionEvent("compositionend", { data: "é", bubbles: true }));
    input.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: "é", cancelable: true, bubbles: true }));
    input.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: "é", bubbles: true }));
  };
  return <main className="mx-auto max-w-5xl p-8">
    <h1>Slice 3 controlled-clock browser checks</h1>
    <p>Clock advancement sends no TICK. Native input must enforce expiration itself.</p>
    <div className="my-4 flex flex-wrap gap-4">
      <button onClick={() => { clock.current = 0; session.restart(); }}>Reset clock/session</button>
      <button onClick={() => { clock.current += 999; }}>Advance clock 999 ms</button>
      <button onClick={() => { clock.current += 1; }}>Advance clock 1 ms</button>
      <button onClick={() => { clock.current += 1001; }}>Advance clock 1001 ms</button>
      <button onClick={session.tick}>Tick</button><button onClick={session.pause}>Pause</button><button onClick={session.resume}>Resume</button>
      <button onClick={compose}>Synthetic composition é</button>
      <button onClick={() => commit("\u0301")}>Commit combining acute</button>
      <button onClick={() => commit(corpus.repeat(100))}>Commit 100 corpus cycles</button>
    </div>
    <TimedTestMetrics session={session} /><TimedTestText session={session} /><Diagnostics session={session} />
  </main>;
}
function Diagnostics({ session }: { session: TypingSession }) {
  const { snapshot } = useTypingFeedback(session);
  const stats = useTypingStats(session); const result = useTypingResult(session);
  return <output aria-label="Timed diagnostics">{JSON.stringify({ status: snapshot.status, attempts: snapshot.counts.totalInsertionAttempts, typed: snapshot.currentPosition, errors: snapshot.counts.incorrectInsertionAttempts, backspaces: snapshot.counts.backspaces, remainingMs: stats.remainingMs, result: result ? { reason: result.completionReason, mode: result.mode, configuredMs: result.durationMs, activeMs: result.activeElapsedMs, startedMs: result.startedAtMs, endedMs: result.completedAtMs, rawWpm: result.metrics.rawWpm, correctWpm: result.metrics.correctWpm, attemptAccuracy: result.metrics.attemptAccuracy, characterAccuracy: result.metrics.characterAccuracy } : null })}</output>;
}
const root = createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
root.render(<StrictMode><Fixture /></StrictMode>);
