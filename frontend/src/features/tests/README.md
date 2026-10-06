# Test integration — Slices 3–4

The Test route shares the engine, native adapter, `useTypingSession`, cached
`useSyncExternalStore` channels and `useTypingInput` with Practice. Setup/result
appearance and manual saving remain. Active Test contains no independent timer,
scoring, accuracy, text-length completion or WPM formula.

## Modes and prepared content

Setup offers Time (15/30/60/300 seconds) and Words (10/25/50/100 words), retaining
independent selections and the existing Easy/Medium/Hard difficulty. Start mounts
and focuses a ready session. First nonempty committed input starts active time.
End test aborts and returns to setup without saving; restart returns to the selected
setup and starts fresh on the next Start. Focus loss does not pause.

`timedText.ts` retains the existing deterministic passages. The feature prepares
and caches a `corpus` source, with language/difficulty/title outside the engine and
compact `corpus:test-<difficulty>@1` identity in the result. Content changes require
bumping that version. Timed mode compares global positions modulo the immutable
corpus (with a trailing-space separator); duration alone finishes the test.
Word mode repeats the corpus in the feature *before preparation* if needed for
100 words, then configures a finite word limit. Neither engine mode generates text.

The shared domain preparation segments graphemes, NFC comparison units, and
whitespace-grapheme-run tokens once. Word N's exclusive grapheme end defines the
required text. Attached punctuation/emoji are part of a token; standalone
punctuation/emoji runs also count. Multiple source spaces, tabs and newlines do not
create empty words. This is an English-oriented typing contract, not Pa’O/Myanmar
linguistic word segmentation. It never tokenizes the learner's typed spaces.

Word mode completes on coverage of the last required position, including a wrong
final grapheme, with `word-limit-reached`. Later corrections/input are rejected.
Its result retains current errors, historical corrected mistakes and exact active
milliseconds. Fixed Practice still requires a correct full target; timed mode still
checks every running event before processing at `timestamp >= logical deadline`,
finishes with `time-expired`, and uses exactly configured active duration.

Quote/custom APIs live in `features/typing/textSources.ts`. They validate/prepare
sources and create ordinary fixed sessions. Quote author/attribution stays in
feature metadata. Custom text supports one grapheme, multiline and Unicode; empty
or whitespace-only custom text is rejected. LF normalization is opt-in. No
quote/custom editor, external quote API, or persistence is added in this slice.

## Presentation and subscriptions

One memoized metrics/text surface serves both test modes. Word mode replaces the
countdown with words remaining and uses engine word progress; timed display is
unchanged. Text/caret/consumed feedback is immediate; stats and progress refresh
at 4 Hz from `performance.now()` ticks. Completion immediately publishes all final
channels. The controller subscribes only to the result. The existing adapter and
production hook/store require no changes for word mode.

The passage renders at most 240 graphemes, advancing by 120 global positions.
Finite word windows stop at `targetUnitCount`; timed windows cycle the corpus.
Backspace returns to an earlier window without replacing/rescoring positions.
Memoized cells update caret/correctness; a 120-grapheme tail previews current input
under the transparent scratch textarea. Paging is presentation only.

## Result and persistence boundary

The frozen result exposes mode, duration/word-limit configuration, reason,
start/end/active time, target coverage, word progress, all counts/four metrics,
source identity, mistake history and `typing-grapheme-v4`. ABORT remains a terminal
snapshot with no completion result. Quote/custom identities stay local.

`testResult.ts` maps current `correctWpm` rounded to legacy `wpm`, historical
`attemptAccuracy` rounded to `accuracy`, current grapheme count to `characters`,
and incorrect insertion attempts to `errors`. The engine never rounds metrics or
word timing. The existing Supabase `duration_seconds` column is **integer**, so
only the saved summary rounds actual active duration to seconds (possibly zero for
a subsecond word test); timed UI durations remain exact integer seconds. Detailed
engine results preserve fractional milliseconds.

Both tests use legacy `mode: "test"`. Existing `label` distinguishes them:
`60 sec · Medium` / `5 min · Hard` versus `25 words · Medium`. Save is opt-in and
synchronously guarded against repeated clicks. No schema/LearningContext changes.
There is no structured mode/word-limit/source ledger in the legacy record; labels
preserve the mode/limit for people, but durable source identity and full histories
are not persisted. Existing analytics continue grouping both under Test.

## Reproducible checks

Run `pnpm test`, `pnpm typecheck`, `pnpm build`, `git diff --check`.
The suite includes the original 160 tests plus word configuration/engine,
source preparation, result mapping, bounded-window and real React/DOM integration
coverage. Compile-time `@ts-expect-error` assertions also enforce mode exclusions.
jsdom 26.1.0 supplies the DOM suite with the existing native input adapter under
StrictMode; it does not mock scoring or the hook/store.

With Vite running, open:
- `/tests/browser/word-session.html`: controlled-clock Unicode word fixture.
- `/tests/browser/timed-session.html`: controlled-clock deadline fixture.
- `/tests/browser/typing-session.html`: fixed Practice regression fixture.

Fixtures are not product routes or production build entries. They dispose roots
on HMR. Synthetic composition verifies event translation, not physical IME order.

Browser checks on 2026-10-04 used the desktop in-app browser and an isolated
127.0.0.1:5189 guest origin with Supabase disabled:
- Actual 10-word Test: clipboard paste rejected, Backspace before completion,
  corrected historical error retained; wrong final character completed, current
  error remained; Save produced one record and disabled its button.
- Actual 25-word Test: Time ↔ Words switching, all 134 positions supplied through
  sequential input, completion with 100% accuracy and no automatic saving.
- Restart/Start, difficulty selection and refocus were checked manually and/or in
  route integration tests. Actual 100-word text paged at position 120 and returned
  to position 0 after Backspace, with 240 rendered graphemes in both windows.
- Native word fixture: composition é + final echo scored once; sequential emoji,
  Myanmar and real Enter yielded correct current graphemes. Historical revisions
  remained recorded. Final active time was exactly 37,400.25 ms, source identity
  retained, character accuracy 100%, attempt accuracy 90.196% after revisions.
- Existing timed route expired naturally at 15 seconds with four correct units,
  and the original deterministic deadline tests remained green.
- Shared Practice fixture retained wrong-final `hellX` as running; Backspace/o
  completed `hello` with six attempts and one corrected historical error.

## Rendering observations

Temporary effect counters and a root React Profiler on the integrated **100-word
Test route**, removed before delivery, measured a 30-character burst:
31 text commits (including highlight cleanup), 12 stats commits, zero controller
commits and 42 root commits. Root render durations averaged **12.38 ms**, maximum
**31.30 ms** locally. Rendered target count stayed **240**. An idle sample recorded
93 stats commits, zero text commits and zero controller commits. Boundary paging
and Backspace kept that same bound. No domain optimization was needed.

These are local development StrictMode render observations, not end-to-end input
latency, a production benchmark or device/frame-rate guarantees. Physical IMEs,
mobile keyboards and other browsers remain unverified. Snapshot copying still
scales with the actual typed buffer/history; rendering is bounded. Unicode data
and thus grapheme boundaries remain runtime-dependent.

Slice 5 adds [the local learning policy](../learning/README.md) outside the engine.
Completed timed and word-count tests contribute scoped compact evidence once,
after completion, independently of the manual Save result button. Aborts do not
contribute. Manual Save retains its legacy meaning and Supabase boundary; the
new profile never goes to Supabase. Slice 6 adds deterministic adaptive exercises
to Practice through [the exercise layer](../learning/exercises/README.md);
Test modes, input/scoring and manual Save behavior remain unchanged.
