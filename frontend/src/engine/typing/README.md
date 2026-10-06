# Typing engine — fixed, timed and word-count contract

The engine has no React, DOM, storage, auth, routing, network, or timer dependency.
Fixed configuration contains `targetText` and optional `completionPolicy` (or
explicit `mode: "fixed-text"`). Timed configuration uses `mode: "timed"`, finite
positive `durationMs`, and explicit `textPolicy: "repeat-corpus"`. Scoring version
is fixed by the code: `typing-grapheme-v4`; callers cannot relabel its behavior.

Word configuration uses `mode: "word-count"` and a positive safe-integer
`wordLimit`. Mode-specific fields are forbidden in other modes by TypeScript and
runtime validation. Fixed mode remains optional only for legacy config callers.
All product callers pass an explicit mode through the shared source boundary.

Every mode supplies either legacy `targetText` or immutable `preparedText`, never
both. `prepareTypingText(text)` extends the existing target preparation: it segments
once, caches NFC comparison units, and calculates word boundaries. The engine
reuses that exact object rather than segmenting again; forged/serialized prepared
objects are rejected. Input still segments only the appended tail. Original line
endings remain unchanged unless the feature explicitly requests LF normalization.

## API and lifecycle

`createTypingEngine({ targetText })` returns an engine with `dispatch(event)`,
`getSnapshot()`, `getResult()`, and `reset(config?)`. The class is also exported.
Snapshots are lazy, cached and deeply frozen. Older snapshots remain unchanged.

- Creation rejects an empty string; whitespace-only targets are valid.
- A session is `ready` until its first nonempty accepted `INSERT_TEXT`.
- `DELETE_BACKWARD` on an empty buffer counts a backspace but does not start time.
- `PAUSE` works only while running; `RESUME` works only while paused.
- Paused sessions reject insertion/deletion; ticks do not accrue paused time.
- `ABORT` is terminal from ready/running/paused. It freezes elapsed time but does
  not create a completion result. At a timed deadline, expiration takes precedence
  over ABORT and all other events. `getResult()` returns null until completion.
- Completed/aborted sessions ignore all events. Reset begins a new ready session,
  clears counters/history/time/result, and retains the target unless replaced.
  Invalid replacement targets leave the old session intact.

## Time

Every event has `atMs`, a finite, nonnegative timestamp on a caller-owned
nondecreasing clock. Equal timestamps are valid. Invalid timestamps throw before
mutation. Even ignored nonterminal events participate in timestamp ordering.
Reset starts a new clock sequence. Terminal events are ignored without validation.

Active time is `atMs - startedAtMs - accumulatedPausedDurationMs` while running.
While paused, the reference is the pause timestamp rather than subsequent ticks.
Resume adds that pause interval to accumulated paused duration. Completion and
abort stop the clock. No timer or wall-clock call exists inside the engine;
snapshots reflect the latest dispatched timestamp, not automatically advancing time.

## Text, Unicode, and scored attempts

`Intl.Segmenter("und", { granularity: "grapheme" })` defines units using the
runtime's Unicode data. No fallback silently substitutes UTF-16 or code points.
Unsupported runtimes fail clearly. Target segmentation is prepared once and
reused until an explicit target replacement. Original strings, whitespace, and
line endings are preserved. Comparison is NFC-normalized, case-sensitive
equality per grapheme; no trimming, case folding, or line-ending conversion occurs.
Newlines are valid units. A CRLF sequence is one grapheme under Segmenter rules.

Insertion accepts committed strings, not keys. The engine segments only the last
typed grapheme plus the new string, because a combining mark, ZWJ, or regional
indicator may extend that cluster. It never re-segments the entire target or
typed buffer on input. Segmenter-provided UTF-16 offsets are used only to return
accepted/rejected raw input strings at grapheme boundaries.

Each new grapheme is an insertion attempt. **A changed trailing grapheme is a
new revision attempt** at the same position; the earlier attempt stays historical.
An unchanged trailing grapheme is not rescored. For example, target `é!`, commits
`e` then combining acute create two attempts: incorrect `e`, then correct `é`.
The former error becomes corrected; attempt accuracy is 50%, current character
accuracy is 100%. A single commit `é` creates one correct attempt. This deliberate
event-boundary sensitivity preserves historical errors rather than erasing them.
The browser adapter should commit composition output once, not interim previews.

Free backspace removes one whole current grapheme. Removing/revising an incorrect
unit marks its historical mistake corrected. Removing a correct unit decreases
current correctness without creating a new mistake. Backspaces count accepted
delete commands, including empty-buffer commands, but exclude rejected commands.

At all times:

- total attempts = correct attempts + incorrect attempts;
- incorrect attempts = corrected errors + uncorrected errors;
- current typed units = current correct units + uncorrected errors.

## Metrics, progress, and completion

For active elapsed minutes `m = activeElapsedMs / 60_000`:

- `rawWpm = (totalInsertionAttempts / 5) / m`;
- `correctWpm = (currentCorrectUnits / 5) / m`;
- `attemptAccuracy = correctInsertionAttempts / totalInsertionAttempts * 100`;
- `characterAccuracy = currentCorrectUnits / currentTypedUnits * 100`.

Zero time produces zero WPM. Zero attempts/buffer produces 100% respective
accuracy (no errors). Values are unrounded. Pathological synthetic durations
that would overflow floating-point WPM saturate at `Number.MAX_VALUE` rather
than exposing Infinity. Grapheme counts are five-unit word equivalents, not
linguistic word counts or physical keystrokes.

Consumed means current typed grapheme positions, including incorrect ones.
In fixed mode, `progress = currentTypedUnits / targetUnits.length`, clamped to [0, 1]. Deletion
can reduce progress. The default `require-correct-target` policy completes only
when the full buffer matches all target graphemes by NFC comparison. A full wrong
buffer stays running, accruing time and allowing free backspace or tail revision.
Overflow cannot add positions or attempts. Completion is not lesson qualification.
The explicit `target-covered` policy preserves immediate completion regardless of
correctness for callers that need that contract; Practice does not use it.
`reset()` retains target and policy; `reset(config)` replaces them, defaulting any
omitted policy to `require-correct-target`.

In fixed mode, a commit is segmented with its full Unicode context, then accepted only through
the target's remaining positions. Overflow is not scored: `dispatch` returns it
as `rejectedText`, alongside `acceptedText` and `insertedAttempts`. Later input
is rejected. Completion yields one stable, deeply frozen result with final
snapshot fields, policy, `completionReason: "correct-target"` (or `"target-covered"`
for the explicit alternative), and mistake history.

For target `é`, committed `e` stays running; committed combining acute revises
that same final position to `é` and completes. There are two historical attempts,
one incorrect/corrected and one correct, giving 50% attempt accuracy and 100%
current character accuracy. Already-correct final graphemes still complete
immediately and are terminal; no post-completion extension is supported.
The alternative `target-covered` policy still requires the final cluster to arrive
complete in its commit, since even a wrong final cluster is terminal under it.

## Timed lifecycle, deadlines, and text

Timed mode starts only on the first accepted nonempty insertion. Empty insertions,
backspace, and ready ticks do not start the allowance. Configuration rejects zero,
negative, nonfinite, or missing durations. Reset validates the entire replacement
configuration before mutating the old session; reset without configuration retains
mode, policy, prepared corpus, and duration.

While running, the explicit logical deadline is:
`startedAtMs + accumulatedPausedDurationMs + durationMs`.
Every event validates its timestamp, then checks **timestamp >= deadline before
processing the command**. Strictly earlier commits are atomic at their supplied
timestamp; the engine invents no per-character timestamps inside a commit.
At/exceeding the deadline, the engine completes with `time-expired`, sets
`completedAtMs` to the logical deadline, and sets `activeElapsedMs` to exactly the
configured duration. It rejects late insertion/deletion/lifecycle commands without
scoring them. A TICK that causes expiry is accepted as the refresh command; later
terminal ticks are ignored. Empty late input also triggers expiration.

The explicit deadline comparison matters for fractional floating-point timestamps:
subtracting start from a rounded deadline can produce a value slightly below the
duration. The deadline itself is compared, and the final metric denominator is the
original duration, never a delayed callback timestamp.

Pausing before the deadline freezes active elapsed/remaining time. Paused ticks and
rejected input do not consume the allowance, even beyond the former wall-clock
deadline. RESUME accounts for the paused interval before the next running event.
PAUSE at/after a running deadline expires instead. There is no automatic focus
pause. ABORT before expiry remains terminal without a completion result.

Timed snapshots expose `mode`, `durationMs`, `remainingMs` (clamped to zero), and
`progress = activeElapsedMs / durationMs` clamped to [0, 1]. Fixed snapshots use
null duration/remaining values and retain coverage progress. Timed completion does
not require current correctness. Historical mistakes and remaining current errors
remain separate; all four scoring formulas above are unchanged.

The caller explicitly supplies a prepared cyclic grapheme corpus through
`textPolicy: "repeat-corpus"`. Position `i` compares against prepared unit
`i % corpusUnits.length`. Exhaustion never completes or caps timed input: the same
immutable corpus can be traversed indefinitely. The feature owns corpus selection
and cycle separators; the engine imports no random generator, catalog or content.
A separator between cycles prevents natural-language words and Unicode clusters
from merging across the cycle boundary. Test uses its existing chosen passage plus
a trailing space. Backspace operates on absolute buffer positions across cycles.
The result retains the prepared corpus and text policy, so positions can be
reconstructed. The UI may project a bounded window of that immutable sequence.

## Word-count contract

`wordLimit` must be a positive safe integer no larger than the prepared corpus's
available words. The engine never fills an insufficient source. Features may
repeat/extend selected content before preparing it. The required finite position
`targetUnitCount` is the exclusive end of word N; text after that position is not
part of the session, including any trailing separator. Source leading and interior
whitespace remain required grapheme positions.

The tokenizer is **whitespace-grapheme-runs-v1**: a token is a maximal run of
non-whitespace graphemes. A grapheme is a separator only when its entire string
matches JavaScript `^\s+$` with Unicode regex mode. Multiple spaces, tabs, LF and
CRLF separate runs without creating empty words. Punctuation and emoji attached
to text stay in that word. A standalone punctuation/emoji run is also one token.
This is an English-oriented typing-token policy, not linguistic segmentation;
Myanmar/Pa’O words without whitespace are not linguistically split. Grapheme
segmentation and NFC scoring remain separate, unchanged concerns. Tokens store
text and start/exclusive-end **grapheme** offsets, never UTF-16 typing positions.

Word sessions start on first nonempty accepted insertion. Time alone cannot end
them. Covering the final required position completes atomically with
`word-limit-reached`, regardless of correctness. Overflow is returned unscored.
A wrong final cluster cannot subsequently be revised or deleted: completion is
terminal. For final target `é`, an isolated `e` therefore completes incorrectly;
commit the whole composed cluster to score it correctly. Practice retains its
correction gate and allows that revision while running.

`wordProgress` contains `targetWordCount`, `consumedWords`, `remainingWords` and
`progress`. Consumed words count prepared ends at/before the current position,
including wrong input; typed spaces are never tokenized for progress. Backspace
can reduce consumed words before terminal coverage. Remaining words is never
negative; progress reaches 1 only at the final required end. Snapshot `progress`
uses this ratio in word mode. Word progress is null outside word mode.

Final word WPM uses actual active milliseconds at the completing event, without
rounding. Pause/resume excludes paused time; completion timestamps are the actual
finishing event, unlike timed mode's logical deadline. Metrics and mistake history
use the same formulas and freezing rules across all three modes.

An optional compact `sourceIdentity: { type, id, version }` is copied/frozen into
snapshots/results. It contains attribution, not database entities or UI metadata.
See `features/typing/textSources.ts` for lesson/corpus/quote/custom/adaptive
preparation. Slice 6's `adaptive` tag is compact attribution only; generation,
coverage validation, learner history and recommendations remain outside this
domain. Adaptive Practice uses the existing fixed-text/correct-target contract.

## Performance and limits

Counters update incrementally. Input work depends on the appended tail and commit,
not target length. A very large single grapheme can still require substantial
tail work. Creating a changed snapshot copies current typed units; completion
also copies mistake history once. Avoid requesting a full new snapshot on every
input in a large-text UI without profiling. No worker/store abstraction is added.

The tests include deterministic rapid-input stress, segmentation call/size checks,
and Unicode tail cases. Measurements describe local domain execution, not browser
performance or a guarantee about any device. Browser composition/paste/focus are
handled separately in `src/features/typing`; arbitrary selection edits remain unsupported. Lesson qualification and persistence remain feature-owned. Ill-formed UTF-16 is not separately validated. Unicode boundaries can
vary with runtime Unicode versions; scoring version alone does not pin that data.
