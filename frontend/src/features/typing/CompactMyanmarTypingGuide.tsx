import type { SessionSnapshot } from "../../engine/typing";
import { getTypingGuide, hasMyanmarText, inputPreview, keysForText, nextGuideKey } from "./typingGuide";

/** One fixed-height row beside the keyboard; only an explicit disclosure changes layout. */
export function CompactMyanmarTypingGuide({ snapshot, layout, compositionDraft, expanded, detailsId, onToggle }: {
  snapshot: SessionSnapshot; layout: string; compositionDraft: string | null;
  expanded: boolean; detailsId: string; onToggle: () => void;
}) {
  if (snapshot.status === "completed" || snapshot.status === "aborted") return null;
  const guide = getTypingGuide(snapshot);
  const key = nextGuideKey(snapshot, layout);
  const myanmar = hasMyanmarText(snapshot.target.text);
  const composing = compositionDraft !== null;
  const correcting = !guide || guide.mistake;
  const caption = composing ? "Draft · not scored yet" : correcting ? "Correct previous input" : "Type next";
  const preview = composing ? compositionDraft || "…" : !guide ? "↶" : guide.mistake
    ? inputPreview(guide.expected) : inputPreview(key?.text || guide.remaining);
  const action = composing ? "Finish composition" : correcting ? "Backspace" : key
    ? `${key.shift ? "Shift + " : ""}${key.label}` : layout === "Pa'O" && !!keysForText(guide?.remaining ?? "", "QWERTY")?.length ? "Select QWERTY in Settings" : "Use your input method";
  return <section aria-label="Next input guide" data-guide-mode="compact"
    className="typing-compact-guide mb-3 grid items-center rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-2 [overflow-anchor:none]">
    <div className="min-w-0 overflow-hidden">
      <p className="truncate text-xs font-semibold text-blue-900" title={caption}>{caption}</p>
      <p id="typing-next-input" data-testid={composing ? "composition-preview" : "next-input"}
        className={`h-16 overflow-x-auto whitespace-nowrap text-3xl leading-[2] text-slate-900 ${myanmar ? "font-myanmar" : "font-mono"}`}>{preview}</p>
    </div>
    <div className="min-w-0 break-words">
      <p className="text-xs text-slate-600">{composing ? "Your input method" : correcting ? "To correct" : "Next key"}</p>
      <p data-testid="next-key-hint" className="mt-1 text-sm font-semibold text-blue-900">{!composing && (key || correcting) ? <kbd>{action}</kbd> : action}</p>
    </div>
    <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={onToggle}
      className="justify-self-end rounded-lg px-2 py-1 text-xs font-medium text-blue-800 underline underline-offset-2 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600">
      {expanded ? "Hide details" : "Show details"}
    </button>
  </section>;
}
