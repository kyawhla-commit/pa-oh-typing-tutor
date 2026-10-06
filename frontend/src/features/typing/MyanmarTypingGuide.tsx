import type { SessionSnapshot } from "../../engine/typing";
import { getTypingGuide, inputPreview, keysForText } from "./typingGuide";

const panelClassName = "mb-4 h-80 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/60 p-4 sm:h-64 sm:p-5";

export function MyanmarTypingGuide({ snapshot, layout, compositionDraft }: {
  snapshot: SessionSnapshot; layout: string; compositionDraft: string | null;
}) {
  const guide = getTypingGuide(snapshot);
  if (!guide) return snapshot.status === "completed" || snapshot.status === "aborted" ? null :
    <section aria-label="Next input guide" className={panelClassName}>
      <p className="text-sm font-semibold text-blue-900">Return to the remaining mistakes</p>
      <p className="mt-3 text-sm text-slate-700">Use Backspace to return to the red characters, then retype that part correctly.</p>
    </section>;
  const keys = keysForText(guide.remaining, layout);
  const composing = compositionDraft !== null;
  return <section aria-label="Next input guide" className={panelClassName}>
    <div role="region" aria-label="Typing hints" tabIndex={0} className="grid h-full min-h-0 grid-cols-1 items-start gap-4 overflow-y-auto overscroll-contain pr-2 [overflow-anchor:none] [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-blue-500 sm:grid-cols-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-blue-900">{composing ? "Composing — finish your input" : guide.mistake ? "Correct the previous input" : guide.partial ? "Continue this character group" : "Type next"}</p>
        <p id="typing-next-input" data-testid="next-input" className="mt-2 break-words font-myanmar text-3xl leading-loose text-slate-900">{inputPreview(guide.expected)}</p>
        <p className="mt-1 text-xs text-slate-600">In the passage</p>
        <p data-testid="next-input-context" className="whitespace-pre-wrap break-words font-myanmar text-xl leading-loose text-slate-700">{guide.context}</p>
      </div>
      <div className="min-w-0 flex-1 sm:max-w-sm">
        {composing ? <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-medium text-slate-600">Your draft · not scored yet</p>
          <p data-testid="composition-preview" className="min-h-12 whitespace-pre-wrap break-words font-myanmar text-2xl leading-loose text-slate-800">{compositionDraft || "…"}</p>
        </div> : guide.mistake ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>Expected <span className="font-myanmar text-xl leading-loose">{inputPreview(guide.expected)}</span></p>
          <p>You typed <span className="font-myanmar text-xl leading-loose">{inputPreview(guide.actual)}</span></p>
          <p className="mt-2">Press <kbd className="rounded border border-amber-300 bg-white px-1.5">Backspace</kbd>, then retype this group.</p>
        </div> : <>
          <p className="text-xs font-medium text-blue-900">{guide.partial ? "Keys still needed" : "Keys for this group"}</p>
          {keys?.length ? <ol aria-label="Keys in input order" className="mt-2 flex flex-wrap gap-2">
            {keys.map((key, index) => <li key={index} aria-current={index === 0 ? "step" : undefined} className={`rounded-xl border bg-white px-3 py-2 text-center ${index === 0 ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200"}`}>
              <p className="text-xs font-semibold text-slate-800">{index + 1}. {key.shift ? "Shift + " : ""}<kbd>{key.label}</kbd></p>
              <p className="font-myanmar text-xl leading-loose text-slate-700">{inputPreview(key.text)}</p>
            </li>)}
          </ol> : <p className="mt-2 text-sm text-slate-700">{layout === "Pa'O" ? "No verified key hint for this text. Follow the enlarged text with your input method." : "Select the Pa’O keyboard in Settings for Pa’O key hints."}</p>}
          {keys?.length ? <p className="mt-3 text-xs leading-relaxed text-slate-600">Pa’O (Linux) layout · first outlined key is next. Use a matching keyboard on your device.</p> : null}
          {guide.partial && <p className="mt-2 text-xs text-slate-600">Part entered. Add the remaining marks to finish this group.</p>}
          {/^\p{M}/u.test(guide.remaining) && <p className="mt-2 text-xs text-slate-600">The dotted circle helps show a combining mark; do not type the circle.</p>}
        </>}
      </div>
    </div>
  </section>;
}
