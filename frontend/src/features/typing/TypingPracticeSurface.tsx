import { memo, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import VirtualKeyboard from "../../components/VirtualKeyboard";
import { useTypingInput } from "./useTypingInput";
import { useTypingFeedback, useTypingStats, type TypingSession } from "./useTypingSession";
import type { ComponentProps } from "react";
import { MyanmarTypingGuide } from "./MyanmarTypingGuide";
import { CompactMyanmarTypingGuide } from "./CompactMyanmarTypingGuide";
import { getTypingGuide, hasMyanmarText, nextGuideKey } from "./typingGuide";
import { revealTypingPosition } from "./revealTypingPosition";
import "./typing-layout.css";

export const TypingPracticeSurface = memo(function TypingPracticeSurface({ session, onNext, nextLabel = "Next text", onRestart, layout = "QWERTY", showGuide = true, showProgress = false, compactPassage = false }: { session: TypingSession; onNext?: () => void; nextLabel?: string; onRestart?: () => void; layout?: string; showGuide?: boolean; showProgress?: boolean; compactPassage?: boolean }) {
  const { snapshot, generation, compositionDraft } = useTypingFeedback(session);
  const myanmar = hasMyanmarText(snapshot.target.text);
  const guide = getTypingGuide(snapshot);
  const { input, focus } = useTypingInput(session, generation);
  const [focused, setFocused] = useState(false);
  const finished = snapshot.status === "completed" || snapshot.status === "aborted";
  const pinnedPassage = !showGuide && !finished;
  const viewport = useRef<HTMLDivElement>(null);
  const activeUnit = useRef<HTMLSpanElement>(null);
  const activePosition = guide?.position ?? snapshot.currentPosition;
  useLayoutEffect(() => {
    if (viewport.current) viewport.current.scrollTop = 0;
  }, [session, generation]);
  useLayoutEffect(() => {
    if (viewport.current && activeUnit.current) revealTypingPosition(viewport.current, activeUnit.current);
  }, [snapshot.typedUnits, activePosition, generation, focused]);
  useLayoutEffect(() => {
    const area = viewport.current;
    if (!area || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (activeUnit.current) revealTypingPosition(area, activeUnit.current);
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, [session]);
  const needsCorrection = snapshot.status === "running" && snapshot.progress === 1
    && snapshot.counts.uncorrectedErrors > 0 && !guide?.partial;
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
    <div data-testid="typing-surface" className={`[overflow-anchor:none] ${pinnedPassage ? "typing-surface-bounded" : ""}`}>
      {showProgress && !finished && <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
          <span>Passage progress</span><span>{Math.floor(snapshot.progress * 100)}%</span>
        </div>
        <progress aria-label="Passage progress" value={snapshot.progress} max={1} className="block h-2 w-full accent-blue-600" />
      </div>}
      <div className="typing-status">
        <p role="status" className={`text-sm ${needsCorrection ? "font-medium text-amber-700" : "text-slate-600"}`}>{statusText}</p>
        {snapshot.status !== "completed" && <button type="button" onClick={focus} aria-keyshortcuts="Control+Enter Meta+Enter" className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">{focusLabel}</button>}
      </div>
      {showGuide && <MyanmarTypingGuide snapshot={snapshot} layout={layout} compositionDraft={compositionDraft} />}
      <div className="relative cursor-text rounded-2xl focus-within:ring-2 focus-within:ring-blue-400" onClick={focus}>
        <textarea ref={input} aria-label="Typing input" aria-describedby={guide ? "typing-help typing-next-input" : "typing-help"} spellCheck={false}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          autoCorrect="off" autoCapitalize="off" autoComplete="off"
          className="pointer-events-none absolute left-0 top-0 h-1 w-1 resize-none text-base opacity-0" />
        <div ref={viewport} data-testid="passage-viewport" role="region"
          aria-label="Scrollable passage" tabIndex={0}
          className={`typing-passage-window ${compactPassage ? "typing-passage-window-compact" : ""} overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-sm [overflow-anchor:none] [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-blue-500`}>
          <div data-testid="typing-text" className={`typing-passage pointer-events-none min-h-[120px] select-none whitespace-pre-wrap break-words ${myanmar ? "font-myanmar leading-[2] tracking-normal" : "font-mono text-lg leading-8 tracking-wide"}`}>
            {snapshot.target.units.map((unit, index) => {
              const state = guide?.partial && index === guide.position ? "partial" : index < snapshot.currentPosition
                ? snapshot.typedUnits[index].correct ? "correct" : "incorrect"
                : index === (guide?.partial ? guide.position : snapshot.currentPosition) ? "current" : "pending";
              const styles = {
                correct: "text-emerald-700",
                incorrect: "bg-red-50 text-red-700 underline decoration-red-400",
                current: "shadow-[inset_2px_0_0_#3b82f6] bg-blue-50 text-slate-900",
                pending: "text-slate-600",
                partial: "shadow-[inset_2px_0_0_#3b82f6] bg-blue-50 text-blue-800 underline decoration-blue-400 decoration-dotted underline-offset-4",
              };
              return <span key={index} ref={index === activePosition ? activeUnit : undefined} className={`typing-char ${state} ${styles[state]}`}>{unit}</span>;
            })}
            {snapshot.currentPosition === snapshot.target.units.length && snapshot.status !== "completed" && !guide?.partial && <span className="relative" aria-hidden="true">
              <span ref={activePosition === snapshot.target.units.length ? activeUnit : undefined} className="absolute left-0 top-0 h-5 w-0.5 animate-pulse bg-blue-500" />
            </span>}
          </div>
        </div>
      </div>
      <p id="typing-help" className="typing-help mt-3 text-xs text-slate-600">
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
  return <div className="typing-stats grid grid-cols-3">
    {[
      { label: "WPM", value: Math.round(snapshot.metrics.correctWpm), color: "text-blue-600" },
      { label: "Accuracy", value: `${snapshot.completionPolicy === "target-covered" ? Number(snapshot.metrics.attemptAccuracy.toFixed(2)) : Math.round(snapshot.metrics.attemptAccuracy)}%`, color: "text-emerald-600" },
      { label: "Time", value: `${Math.floor(snapshot.activeElapsedMs / 1000)}s`, color: "text-slate-700" },
    ].map(({ label, value, color }) => <div key={label} className="typing-stat rounded-2xl border border-slate-200 bg-white text-center">
      <p className={`typing-stat-value font-mono font-semibold ${color}`}>{value}</p><p className="mt-1 text-xs text-slate-600">{label}</p>
    </div>)}
  </div>;
});

export const TypingKeyboardFeedback = memo(function TypingKeyboardFeedback({ session, layout, showCompactGuide = true }: { session: TypingSession; layout: ComponentProps<typeof VirtualKeyboard>["layout"]; showCompactGuide?: boolean }) {
  const { snapshot, pressedKey, errorKey, compositionDraft } = useTypingFeedback(session);
  const guide = getTypingGuide(snapshot);
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const composing = compositionDraft !== null;
  const lastOutput = guide && pressedKey !== "Backspace" ? Array.from(pressedKey).at(-1) : pressedKey;
  return <div aria-label="Typing keyboard" className="[overflow-anchor:none]">
    {showCompactGuide && <CompactMyanmarTypingGuide snapshot={snapshot} layout={layout ?? "QWERTY"}
      compositionDraft={compositionDraft} expanded={expanded} detailsId={detailsId} onToggle={() => setExpanded(value => !value)} />}
    <VirtualKeyboard pressedKey={composing ? "" : lastOutput} errorKey={composing || guide?.partial ? "" : errorKey}
      nextKey={composing ? null : nextGuideKey(snapshot, layout ?? "QWERTY")} layout={layout} />
    {showCompactGuide && <div id={detailsId} hidden={!expanded} className={expanded ? "mt-4" : undefined}>
      {expanded && <MyanmarTypingGuide snapshot={snapshot} layout={layout ?? "QWERTY"} compositionDraft={compositionDraft}
        inputId={`${detailsId}-input`} label="Next input details" />}
    </div>}
  </div>;
});
