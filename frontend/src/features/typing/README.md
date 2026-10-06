# Practice browser integration — Slice 2

`inputAdapter.ts` owns native listeners on one editable textarea. Its value is a
scratch buffer, cleared after each committed event. Domain text is rendered
separately, so browser selection can never edit the already scored buffer.

- Cancelable `beforeinput` translates `insertText`, `insertLineBreak` /
  `insertParagraph` (literal LF), and `deleteContentBackward`. It prevents the
  native edit and suppresses a matching subsequent `input` echo.
- Noncancelable `beforeinput` waits for `input`; `input` also supports browsers
  that omit `beforeinput`. Text comes from event data or the scratch value.
- A cancelable insertion without text also waits for the native `input` value.
  Preventing that edit while the scratch buffer is empty would lose the character.
  Missing `inputType` uses a preceding plain character/Enter key or a known
  insertion/commit echo; keydown alone never scores. Named unsupported edits and
  unpaired unknown events remain rejected, and paste/blur/pointer reset that hint.
- Keydown is commands only: unmodified Backspace dispatches deletion even when
  the empty scratch textarea would produce no input event. Ordinary character
  keys and Enter never score on keydown. Tab navigates focus.
- Composition previews stay in the scratch textarea, unscored. Compositionend
  dispatches its nonempty committed data exactly once. Matching trailing
  insertText/insertFromComposition/insertCompositionText echoes are suppressed,
  including null-data echoes. A new keydown/composition/pointer/focus interaction
  clears the pending echo guard; a canceled matching beforeinput consumes it.
- Paste, drop, cut, replacement text, forward/word deletion, undo/redo, and
  selection replacement are rejected, including input fallback. Cursor movement
  and selection are anchored to the scratch end. The anchor only changes a range
  that needs moving: `setSelectionRange` can emit `select`, so unconditionally
  setting it from a `select` listener can trigger a selection-event loop.
  [Browser API behavior](https://developer.mozilla.org/en-US/docs/Web/API/HTMLTextAreaElement/setSelectionRange).
  Arbitrary editing is unsupported.
- Click the area to focus. Mount does not steal focus. Intentional restart resets
  the adapter and restores focus locally. Buttons/navigation do not dispatch.
  Practice also offers Start typing / Continue typing with a focused-state hint.
  Ordinary Practice and lesson attempts finish at full coverage, even with mistakes.
  Adaptive/planned sessions retain correct-target completion: a filled passage
  with uncorrected errors shows a Correct mistakes button and correction guidance.
  Ctrl + Enter or Command + Enter focuses the passage without resetting progress
  or starting the clock. After ordinary Practice completes, the same shortcut
  invokes the visible Next text action and focuses the new passage. It never
  skips an unfinished exercise. Passing lesson attempts offer Next lesson with the same
  shortcut; it follows published catalog order, skips drafts and focuses the new
  lesson. Failed attempts disable Next lesson and offer Retry lesson. Passing
  attempts retain Practice again. The last lesson links back to Lessons.
  Adaptive/planned continuation still uses its existing explicit controls.
  Ctrl + Shift + Enter or Command + Shift + Enter invokes the owner's Restart
  action, clears the current attempt and focuses its passage. Timing starts on
  the next committed character. Restart/Retry buttons advertise the shortcut,
  including the local mistake drill. Held keys do not trigger repeated restarts;
  editable fields and IME composition are excluded as with the focus shortcut.
  Saved completed results remain intact. Restarting a completed planned activity
  closes its optional continuation and begins a separate unplanned retry of the
  same passage; an in-progress planned restart retains its existing reservation.
  The shortcut is scoped to a mounted Practice surface,
  ignores other editable fields and IME composition, and prevents Enter from
  becoming a scored newline. Its listener is removed on unmount.
  Native listeners attach before paint so the initial interaction has an adapter.
  Blur cancels any unfinished composition draft but does not pause the session:
  the monotonic clock continues. A late compositionend for that draft is ignored.
- Disposal removes all native listeners; reset clears drafts/deduplication guards.

Input compatibility validation on 6 October 2026: 95 targeted adapter, surface,
session, Practice planner/outcome, and Test integration checks passed, including
selection-event loop prevention, missing insertion metadata, null-data native edits, focus/refocus, duplicate
echo suppression, and unchanged paste/shortcut/composition cancellation behavior.
These checks reproduce the input-loss paths in isolated tests; the reported
Firefox session still requires a live retest after refreshing the app.

Shortcut validation on 7 October 2026: 104 checks in the same targeted suites
passed, including Ctrl/Command focus, retained progress, repeat handling, editable
field/IME exclusions, completion, and unmount cleanup. Typecheck and build passed.

`useTypingSession` creates one active session per mounted controller. The feature
store wraps the synchronous engine with cached feedback, stats, and result
channels. Slice 5 adds a feature-owned run UUID/status/result lifecycle channel;
only restart changes its UUID. It does not publish on ordinary running input.
`useSyncExternalStore` consumes those stable subscribe/getSnapshot
functions. No domain observer, Zustand, Redux, or duplicate scoring was needed.
Input publishes text feedback immediately. A 250 ms interval dispatches TICK with
`performance.now()` and publishes stats only. Completion publishes final stats
and one stable result. The page subscribes only to the result; memoized text,
stats, and keyboard children subscribe separately. One cancellable 140 ms timeout
clears visual key feedback, and both timers/subscriptions clean up on unmount.
The feedback snapshot reflects the last input; the stats snapshot has current
time. Read the result for final data. Highlights belong only to presentation.

Practice selects content and owns qualification/persistence. Ordinary Practice and
catalog lessons use the engine's existing `target-covered` completion. All full
attempts stop the clock and save once. Lesson qualification requires at least 95%
historical attempt accuracy, using the unrounded engine score, without a speed
requirement. Current errors are allowed at a passing score; corrected errors still
count toward attempt accuracy. Adaptive/planned sessions keep their existing
correct-target completion and progression contracts. Existing
LearningContext receives rounded current-correct WPM, attempt accuracy to two decimal places,
current grapheme count, historical incorrect attempts, and rounded elapsed seconds
(minimum one). History remains after correction. A WeakSet guards each frozen
result before saving, including effect replay/context updates. No persistence or
routing enters the engine. Slice 3 migrates Test.tsx to this same architecture;
the original TypingBox remains available as a prototype reference.

Results offer Review mistakes with expected/actual values and line/grapheme
positions, including corrected historical errors. Spaces, tabs and Enter are
visible in review. Practice mistakes launches an isolated, finite, coverage-based
drill made from affected source words or code lines; whitespace mistakes retain
adjacent context and indentation. The original frozen result stays saved. Drills
do not call legacy autosave, lesson completion, learning ingestion or mastery;
passing a full retry is required to improve lesson qualification. Only one input
surface/shortcut listener mounts at a time; returning restores focus to review.

Validation on 7 October 2026: 153 targeted checks passed across Practice, input,
lesson qualification, mistake fragments/review, learning integration, adaptive
exercises, planner outcomes and timed Test. Coverage includes exactly 95%, below
95% despite whole-number rounding, historical corrected errors, clock freezing,
saved failed attempts, isolated drills and next-button/shortcut gating. The live
Practice accuracy card and saved history display up to two decimal places.
Typecheck and production build passed; live Firefox verification remains pending.

Slice 5 separately defers completed-session local evidence ingestion through
`useSessionLearning`; learner ownership and persisted dedupe stay outside the
engine. Slice 6 adds verified deterministic exercise generation from the card;
the active prepared adaptive target stays frozen across ordinary rerenders.
See [the learning policy](../learning/README.md) for counting, thresholds, privacy,
learner scoping and persistence limits. Legacy autosave remains unchanged.
Adaptive Practice uses the same surface/input/stats and correct-target completion;
its compact `adaptive` source identity is attribution only. See the
[exercise contract](../learning/exercises/README.md) for coverage and fallback rules.

Catalog refreshes cannot replace the engine's prepared target. A lesson route-ID
change mounts a fresh controller; an explicit restart adopts the latest available
published content. Catalog removal retains the mounted session's prior target.
Missing lessons never fall back to an unrelated random exercise. General practice
mode/text selection intentionally resets the engine; Restart retains its target.

## Myanmar / Pa'O teaching guide

Practice and local mistake drills detect Myanmar script in the frozen source
target. They use Noto Sans Myanmar at 28px, normal letter spacing and a generous
line height; Latin/code passages retain their existing monospace style.
The next-input panel enlarges the expected engine grapheme and shows unchanged
source context. Context uses existing whitespace runs, bounded for long unspaced
text; it does not claim to segment Burmese or Pa'O syllables. Source text, engine
segmentation, scoring, lesson thresholds and saved history remain unchanged.

A committed trailing prefix of the expected grapheme shows as an unfinished
group, with the remaining combining marks and keys. This is presentation only:
the engine still counts each committed revision under its existing policy.
An incompatible trailing input shows expected/actual values and Backspace
guidance. Completed/aborted attempts hide the guide; existing coverage-based
completion remains authoritative. Dotted circles and Space/Enter labels appear
only in teaching previews, never in the target or scored input.

`components/keyboardLayouts.ts` holds the direct PaOh basic key outputs, checked
against this machine's `/usr/share/X11/xkb/symbols/pao` on 2026-10-07. All 47
unshifted/shifted pairs match. Shift+R was corrected from the expanded `၎င်း`
legend to the actual `၎` output; the minus legend now uses ASCII `-`.
The guide outlines the next physical key and both Shift keys when needed.
Hints are for this Linux layout, not a generic Myanmar3/KeyMagic reorder model.
Unknown text/layouts get no inferred sequence. Tab remains navigation, and
Enter emits LF, so raw CR/CRLF do not get a guessed physical-key hint.
Settings and the panel explain that the device's input method must match.

An optional native-adapter callback publishes composition drafts to the feature
feedback channel only. Drafts show in a neutral preview, suppress keyboard hints,
and never enter scoring/stats/results. Commit, blur, rejected edits, restart and
disposal clear them; existing composition commit/echo behavior is retained.
Automated checks cover direct mapping, split marks, Shift/whitespace hints,
wrong input/correction, preserved target/history, composition commit echoes,
blur/restart cancellation, completion and Latin fallback. Physical keyboard/IME
event order and final font rendering still require a live Firefox retest.

The hint panel reserves 256px on desktop and 320px on small screens. Longer
key sequences, context and explanations scroll within its keyboard-accessible
region; partial/error/composition content cannot resize the passage's container.
The status row also reserves space, and current/partial cursors use an inset
shadow rather than a width-changing border. The surface excludes its dynamic
content from scroll anchoring. Explicit adapter focus, lesson launch and drill
launch use `focus({ preventScroll: true })`; input updates never request focus.
[Focus scrolling behavior](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus).
Manual page scrolling and hint scrolling remain available. These changes target
mid-attempt movement; completing an attempt intentionally switches to its result.
jsdom checks verify focus requests and lifecycle, not real browser scroll geometry.

## Reproducing browser checks

Start `pnpm dev`, then open `/tests/browser/typing-session.html`. This standalone
fixture is not a product route or part of the production build. It mounts the
actual hook, adapter, and surface under StrictMode. Its buttons expose synthetic
composition, split Unicode commits, target refresh/reset, and mount/unmount.
Synthetic composition tests are not proof of a physical IME's event ordering.
`pnpm typecheck` includes the fixture source. Automated adapter tests use a minimal
EventTarget textarea stub; the fixture checks actual DOM + React integration.

Validation on 2026-10-04 used the desktop in-app browser at 127.0.0.1:5188 with
Supabase explicitly disabled for an isolated guest origin. Actual browser actions:

- Sequential continuous typing, wrong final character remaining running, Backspace
  and correction completing with one historical error; exactly one saved result.
- Code punctuation/uppercase/spaces and real Enter producing a correct LF.
- Clipboard Ctrl+V, Delete, Ctrl+Z, and ArrowLeft left the scored buffer unchanged.
- Buttons held focus and did not score typed keys; blur kept elapsed time running;
  refocus/Backspace deleted one unit; restart cleared state and restored focus.
- Lesson 1 completion persisted through existing guest LearningContext, unlocked
  lesson 2, and switching to lesson 2 began with a clean target and buffer.
- Fixture: synthetic composition previews + final echo scored once; e then acute
  revised a full incorrect buffer and completed with two historical attempts.
  A React target refresh left the old target intact until explicit reset.
- Actual browser sequential emoji input formed one final ZWJ grapheme via three
  committed revisions. StrictMode unmount/remount produced one attempt per input.

Temporary component effect counters and a root React Profiler were removed after
measurement. A continuous 50-character burst took about 4.4 s in the automation
and produced 50 text commits, 18 stats commits, and **zero Practice controller
commits**. 67 root profiler commits averaged 8.17 ms, maximum 18.8 ms locally
(development StrictMode, keyboard visible). These are React render durations,
not end-to-end input latency, production/device benchmarks, or a frame-rate guarantee.


Slice 3 extends the store with pause/resume/abort commands and lifecycle
publication. Rejected late input may still complete the engine; that completion
publishes feedback, final stats, and result immediately. TICK also publishes a
result on expiry, rather than updating only stats. Normal running ticks still do
not notify text or page subscribers. `useTypingInput` centralizes adapter attach,
reset, focus and disposal for both surfaces. Practice keeps its mount/no-focus and
intentional restart/focus behavior; Test requests focus on its explicit Start.


## Shared text sources — Slice 4

`textSources.ts` defines lesson/corpus/quote/custom/adaptive sources and one explicit
`prepareTextSource` → `createSourceSessionConfig` boundary. It validates source
identity/text, optionally normalizes CRLF/CR to LF, and delegates segmentation and
word tokenization to the existing domain preparation. Sources/prepared targets
are immutable. Custom and quote sources reject empty/whitespace-only text; a
one-grapheme custom source is valid. No arbitrary size cap, editor, online quote
fetch, custom persistence, or new engine mode is introduced for quote/custom.

Quotes retain optional author/attribution in the feature source. A normal fixed
session passes only compact type/id/version to the engine/result. Callers choose
source versions; Practice derives a deterministic FNV-1a content fingerprint for
catalogs without revision fields. That fingerprint is attribution, not cryptographic
integrity. Practice selects random content outside the engine as before, keeps its
save guard, target freeze, and focus. Its current completion/lesson qualification
policy is documented above.

Test prepares/caches immutable difficulty corpora and repeats them in the feature
when a word limit requires additional words. Timed sessions still cycle the same
prepared corpus in the domain. One hook/store/adapter serves all modes without
mode-specific hooks or new adapter listeners. The adapter and production store
are unchanged in Slice 4; added tests exercise word completion publication.
Stats/progress refresh at 4 Hz, while text/caret and consumed-word feedback remain
immediate; the final result publishes immediately. The React integration suite
uses jsdom 26.1.0 (compatible with the workspace's Node) and actual DOM native
listeners under StrictMode; browser fixtures remain the manual complement.
