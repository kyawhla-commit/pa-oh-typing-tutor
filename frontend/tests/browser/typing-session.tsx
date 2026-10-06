// Local-only verification fixture; never routed or included in the production app.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { TypingPracticeSurface, TypingLiveStats } from "../../src/features/typing/TypingPracticeSurface";
import { useTypingSession, useTypingFeedback, useTypingResult } from "../../src/features/typing/useTypingSession";
import "../../src/index.css";

function Fixture() {
  const [candidate, setCandidate] = useState("é");
  const [mounted, setMounted] = useState(true);
  return <main className="mx-auto max-w-4xl p-8">
    <h1>Slice 2 browser checks</h1>
    <p>Synthetic composition events test the adapter; they do not verify a physical IME.</p>
    <button onClick={() => setCandidate("hello")}>Refresh target to hello</button>{" · "}
    <button onClick={() => setMounted(!mounted)}>{mounted ? "Unmount session" : "Mount session"}</button>
    {mounted && <Session candidate={candidate} />}
  </main>;
}
function Session({ candidate }: { candidate: string }) {
  const session = useTypingSession({ targetText: candidate });
  const { snapshot } = useTypingFeedback(session);
  const result = useTypingResult(session);
  const input = () => document.querySelector<HTMLTextAreaElement>("textarea")!;
  const emit = (type: string, data: string) => input().dispatchEvent(new InputEvent(type, { inputType: "insertText", data, bubbles: true, cancelable: true }));
  const compose = () => {
    const element = input();
    element.focus();
    element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    element.dispatchEvent(new CompositionEvent("compositionupdate", { data: "e", bubbles: true }));
    element.dispatchEvent(new InputEvent("input", { inputType: "insertCompositionText", data: "e", isComposing: true, bubbles: true }));
    element.dispatchEvent(new CompositionEvent("compositionupdate", { data: "é", bubbles: true }));
    element.dispatchEvent(new CompositionEvent("compositionend", { data: "é", bubbles: true }));
    emit("beforeinput", "é"); emit("input", "é");
  };
  return <section>
    <TypingLiveStats session={session} /><TypingPracticeSurface session={session} />
    <div className="my-4 flex flex-wrap gap-4">
      <button onClick={compose}>Synthetic composition é</button>
      <button onClick={() => { input().focus(); emit("beforeinput", "e"); }}>Commit e</button>
      <button onClick={() => emit("beforeinput", "\u0301")}>Commit combining acute</button>
      <button onClick={() => { input().focus(); emit("beforeinput", "👩‍💻"); }}>Commit emoji</button>
      <button onClick={() => session.restart()}>Restart frozen target</button>
      <button onClick={() => session.restart({ targetText: candidate })}>Reset to refreshed target</button>
      <button onClick={() => session.restart({ targetText: "👩‍💻" })}>Reset to emoji target</button>
    </div>
    <output aria-label="Session diagnostics">{JSON.stringify({ target: snapshot.target.text, status: snapshot.status, attempts: snapshot.counts.totalInsertionAttempts, incorrect: snapshot.counts.incorrectInsertionAttempts, corrected: snapshot.counts.correctedErrors, typed: snapshot.typedUnits.map(x => x.text).join(""), result: result?.completionReason ?? null })}</output>
  </section>;
}
const root = createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
root.render(<StrictMode><Fixture /></StrictMode>);
