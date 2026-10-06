import { memo, useEffect, useState } from "react";
import VirtualKeyboard from "../../components/VirtualKeyboard";
import { useTypingInput } from "./useTypingInput";
import { useTypingFeedback, useTypingStats, type TypingSession } from "./useTypingSession";
import type { ComponentProps } from "react";

export const TypingPracticeSurface = memo(function TypingPracticeSurface({ session, onNext, nextLabel = "Next text", onRestart }: { session: TypingSession; onNext?: () => void; nextLabel?: string; onRestart?: () => void }) {
  const { snapshot, generation } = useTypingFeedback(session);
  const { input, focus } = useTypingInput(session, generation);
  const [focused, setFocused] = useState(false);
  const needsCorrection = snapshot.status === "running" && snapshot.progress === 1
    && snapshot.counts.uncorrectedErrors > 0;
  const focusLabel = needsCorrection ? "Correct mistakes" : snapshot.currentPosition > 0 ? "Continue typing" : "Start typing";
  const statusText = snapshot.status === "completed" ? snapshot.completionPolicy === "target-covered" ? "Attempt finished" : "Practice complete"
    : needsCorrection ? `Passage filled — ${snapshot.counts.uncorrectedErrors} ${snapshot.counts.uncorrectedErrors === 1 ? "mistake" : "mistakes"} left to correct`
    : focused ? snapshot.currentPosition > 0 ? "Keep typing the passage below" : "Ready — type the passage below"
    : `Click ${focusLabel} or the passage to ${snapshot.currentPosition > 0 ? "continue" : "begin"}`;
  useEffect(() => {
    const textarea = input.current!;
    const document = textarea.ownerDocument;
    let composing = false;
    const startComposition = () => { composing = true; };
    const endComposition = () => { composing = false; };
    const startTyping = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== "Enter" || !(event.ctrlKey || event.metaKey)
        || event.altKey || event.isComposing || event.keyCode === 229 || composing) return;
      const target = event.target;
      if (target instanceof Element && target !== textarea
        && target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return;
      if (event.shiftKey) {
        if (!onRestart) return;
        event.preventDefault();
        if (!event.repeat) onRestart();
        return;
      }
      const status = session.feedback.getSnapshot().snapshot.status;
      if (status === "aborted" || (status === "completed" && !onNext)) return;
      // Cancel the native Enter edit before the adapter sees the key.
      event.preventDefault();
      if (!event.repeat) {
        if (status === "completed") onNext!();
        else focus();
      }
    };
    document.addEventListener("keydown", startTyping, true);
    textarea.addEventListener("compositionstart", startComposition);
    textarea.addEventListener("compositionend", endComposition);
    textarea.addEventListener("blur", endComposition);
    return () => {
      document.removeEventListener("keydown", startTyping, true);
      textarea.removeEventListener("compositionstart", startComposition);
      textarea.removeEventListener("compositionend", endComposition);
      textarea.removeEventListener("blur", endComposition);
    };
  }, [session, input, focus, onNext, onRestart]);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p role="status" className={`text-sm ${needsCorrection ? "font-medium text-amber-700" : "text-slate-600"}`}>{statusText}</p>
        {snapshot.status !== "completed" && <button type="button" onClick={focus} aria-keyshortcuts="Control+Enter Meta+Enter" className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">{focusLabel}</button>}
      </div>
      <div className="relative cursor-text rounded-2xl focus-within:ring-2 focus-within:ring-blue-400" onClick={focus}>
        <textarea ref={input} aria-label="Typing input" aria-describedby="typing-help" spellCheck={false}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          autoCorrect="off" autoCapitalize="off" autoComplete="off"
          className="absolute inset-0 z-10 h-full w-full resize-none opacity-0" />
        <div data-testid="typing-text" className="pointer-events-none min-h-[120px] select-none whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-white p-6 font-mono text-lg leading-8 tracking-wide shadow-sm">
          {snapshot.target.units.map((unit, index) => {
            const state = index < snapshot.currentPosition
              ? snapshot.typedUnits[index].correct ? "correct" : "incorrect"
              : index === snapshot.currentPosition ? "current" : "pending";
            const styles = {
              correct: "text-emerald-700",
              incorrect: "bg-red-50 text-red-700 underline decoration-red-400",
              current: "border-l-2 border-blue-500 bg-blue-50 text-slate-900",
              pending: "text-slate-600",
            };
            return <span key={index} className={`typing-char ${state} ${styles[state]}`}>{unit}</span>;
          })}
          {snapshot.currentPosition === snapshot.target.units.length && snapshot.status !== "completed" && <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-blue-500 align-middle" />}
        </div>
      </div>
      <p id="typing-help" className="mt-3 text-xs text-slate-600">
        {snapshot.status === "completed" ? onNext ? `Use ${nextLabel} to continue.` : "You finished this passage." : needsCorrection
          ? "Use Backspace to return to the red characters, then retype that part correctly to finish."
          : "Click the text to type · Backspace to correct · Paste is disabled"}
        {snapshot.status !== "completed" && <> · <kbd>Ctrl + Enter</kbd> / <kbd>⌘ + Enter</kbd> to focus typing</>}
        {onRestart && <> · <kbd>Ctrl + Shift + Enter</kbd> / <kbd>⌘ + Shift + Enter</kbd> to restart</>}
      </p>
    </div>
  );
});

export const TypingLiveStats = memo(function TypingLiveStats({ session }: { session: TypingSession }) {
  const snapshot = useTypingStats(session);
  return <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
    {[
      { label: "WPM", value: Math.round(snapshot.metrics.correctWpm), color: "text-blue-600" },
      { label: "Accuracy", value: `${snapshot.completionPolicy === "target-covered" ? Number(snapshot.metrics.attemptAccuracy.toFixed(2)) : Math.round(snapshot.metrics.attemptAccuracy)}%`, color: "text-emerald-600" },
      { label: "Time", value: `${Math.floor(snapshot.activeElapsedMs / 1000)}s`, color: "text-slate-700" },
    ].map(({ label, value, color }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center sm:px-5">
      <p className={`font-mono text-2xl font-semibold sm:text-3xl ${color}`}>{value}</p><p className="mt-1 text-xs text-slate-600">{label}</p>
    </div>)}
  </div>;
});

export const TypingKeyboardFeedback = memo(function TypingKeyboardFeedback({ session, layout }: { session: TypingSession; layout: ComponentProps<typeof VirtualKeyboard>["layout"] }) {
  const { pressedKey, errorKey } = useTypingFeedback(session);
  return <VirtualKeyboard pressedKey={pressedKey} errorKey={errorKey} layout={layout} />;
});
