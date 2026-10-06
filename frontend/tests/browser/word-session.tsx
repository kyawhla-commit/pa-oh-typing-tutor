// Native-input Unicode checks under StrictMode, separate from production routes.
import { StrictMode, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createTypingSession, useTypingFeedback, useTypingResult } from "../../src/features/typing/useTypingSession";
import { TestMetrics, TestText } from "../../src/features/tests/TimedTestSurface";
import { createSourceSessionConfig, prepareTextSource } from "../../src/features/typing/textSources";
import "../../src/index.css";
const prepared = prepareTextSource({ type: "custom", id: "unicode-browser-fixture", version: "1", text: "éx👩‍💻 one\nပအိုဝ်ႏ two three four five six seven ten" });
function Fixture() {
  const clock = useRef(100);
  const [session] = useState(() => createTypingSession(createSourceSessionConfig(prepared,{ mode: "word-count", wordLimit: 10 }), () => clock.current));
  const { snapshot } = useTypingFeedback(session); const result = useTypingResult(session);
  const compose = () => {
    const input = document.querySelector<HTMLTextAreaElement>("textarea")!; input.focus();
    input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    input.value = "e";
    input.dispatchEvent(new InputEvent("input", { inputType: "insertCompositionText", data: "e", isComposing: true, bubbles: true }));
    input.dispatchEvent(new CompositionEvent("compositionend", { data: "é", bubbles: true }));
    input.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: "é", cancelable: true, bubbles: true }));
    input.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: "é", bubbles: true }));
  };
  const remaining = () => {
    const input = document.querySelector<HTMLTextAreaElement>("textarea")!; input.focus();
    const text = snapshot.target.units.slice(snapshot.currentPosition, snapshot.targetUnitCount).join("");
    input.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: text, cancelable: true, bubbles: true }));
  };
  return <main className="mx-auto max-w-5xl space-y-4 p-8">
    <h1>Slice 4 word-count Unicode checks</h1>
    <div className="flex gap-5">
      <button onClick={() => { clock.current = 100; session.restart(); }}>Reset</button>
      <button onClick={compose}>Synthetic composition é</button>
      <button onClick={() => { clock.current += 37_400.25; session.tick(); }}>Advance 37.40025 seconds</button>
      <button onClick={remaining}>Commit remaining target</button>
    </div>
    <TestMetrics session={session} /><TestText session={session} />
    <output aria-label="Word diagnostics">{JSON.stringify({ status: snapshot.status, typed: snapshot.currentPosition, attempts: snapshot.counts.totalInsertionAttempts, errors: snapshot.counts.incorrectInsertionAttempts, progress: snapshot.wordProgress, result: result && { reason: result.completionReason, activeMs: result.activeElapsedMs, startedAtMs: result.startedAtMs, completedAtMs: result.completedAtMs, sourceIdentity: result.sourceIdentity, metrics: result.metrics } })}</output>
  </main>;
}
const root = createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
root.render(<StrictMode><Fixture /></StrictMode>);
