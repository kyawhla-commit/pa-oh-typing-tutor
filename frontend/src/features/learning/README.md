# Local learning policy — Slice 5

The boundary is `SessionResult → extractLearningEvidence → applyLearningEvidence
→ recommendPractice → practiceSpec`. Everything here is outside the engine.
The engine's scoring, Unicode preparation and completion rules are unchanged.
`constants.ts` is the single place for the initial adjustable product thresholds;
they are understandable heuristics, not trained weights or statistical confidence.

## Evidence and counting

Completed fixed Practice, timed Test and word-count Test contribute equally.
Aborted, incomplete, zero-attempt and invalid results are excluded. Extraction
checks mode/reason, finite metrics/clocks, count relationships, prepared boundaries
and mistake-ledger entries. Engine metrics are copied, never recomputed.

`LearningEvidence` contains a compact summary (source identity, mode, reason,
wall recording time, exact active milliseconds, raw/correct WPM, historical
attempt/current character accuracy, attempts, corrected/remaining errors and
backspaces), bounded aggregates, and at most 32 transient mistake examples.
Examples preserve expected/actual graphemes, position, attempt order and monotonic
mistake/correction timestamps. They are **not persisted**. No full target, typed
buffer, browser events or surrounding passage text is copied.

Exposure is deliberately `observed-position-lower-bound`. The existing engine
retains mistakes and its current buffer, not every correct insertion later
deleted. Observe the contiguous prefix ending at the greater of current position
and the largest historical mistake position plus one. Each source position counts
once per session, including timed positions in later corpus cycles. Correct
deleted suffixes with no retained mistake cannot be recovered. Exact correct
first-attempt counts are therefore not claimed or fabricated.

- Grapheme: each observed expected position is an opportunity. An occurrence with
  any historical mistake contributes one `errorOccurrence`. All mistake attempts
  at that position contribute `incorrectAttempts`, split into corrected/remaining.
- Substitution: each ledger mistake increments the directional NFC-normalized
  expected → actual pair. Corrections retain the original confusion. Reverse
  direction is a separate key; combining-mark revisions remain historical errors.
- Bigram: two adjacent **target** graphemes. Both positions must be observed.
  Either/both positions with mistakes count the occurrence once, while all their
  mistake attempts are associated with it. A mistake can affect two neighboring
  pairs; these counters must not be summed as a session-wide error total.
- Token: use prepared source `whitespace-grapheme-runs-v1` boundaries, only when
  the full token is observed. Attached punctuation stays attached. Count one
  mistake-containing occurrence and all associated attempts. Timed sessions map
  global positions to prepared corpus cycles. Never tokenize learner input.

Error rate is `errorOccurrences / opportunities` (0–1), **not** incorrect attempts
divided by opportunities: repeated mistakes at one position must not inflate an
incidence rate beyond 100%. Policy ignores whitespace-only weak graphemes and
pairs containing whitespace-only units. Substitution evidence can include spaces.
Tokens are labelled **target tokens**, including for Pa’O/Myanmar; this does not
claim validated linguistic segmentation.

Custom, quote and unknown source types omit tokens and bigrams to avoid retaining
private passage fragments or order. Grapheme/confusion aggregates remain.
Graphemes/actual strings and tokens longer than 32 UTF-16 code units are skipped
as storage guards; positions/counting still use engine graphemes, never UTF-16
indexing. Global counts remain intact. Source IDs/versions and session IDs are
bounded at 128 code units; source identity is whitelisted to type/id/version.

## Profile, recent history and pruning

`LearnerTypingProfile` v1 keeps exact global session/attempt/error/correction/
backspace counters, retained lifetime aggregates, the last **8 qualifying
completed sessions** with summaries and aggregates, and the last **256 processed
session IDs**. New profiles and updates are recursively frozen.

Each aggregate is bounded to 96 graphemes, 64 substitutions, 96 bigrams and 48
tokens. These bounds apply to lifetime and each recent session; merging the recent
window uses the same limits. Recent is ingestion order, not wall-clock sort.
WPM, accuracy and recording time support future trend analysis without claiming
that speed causes errors.

Exposure pruning prefers more error occurrences, then more incorrect attempts,
then more opportunities, then Unicode scalar lexicographic key order. Confusion
pruning prefers more occurrences, then remaining errors, then that key order.
Age alone never removes a valuable retained weakness. Stored arrays are key-sorted
for canonical serialization. A pruned target loses its detailed past counters if
later reintroduced; lifetime target counters are **retained aggregates**, not an
unlimited exact census. Global counters remain exact within safe integer range.

## Eligibility and precedence

These are initial product settings, deliberately conservative and adjustable;
test data exercises the rules rather than changing the rules to fit fixtures.

- `WEAK_GRAPHEME`: recent opportunities ≥20, error occurrences ≥3, rate ≥15%.
  Lifetime path: opportunities ≥40, error occurrences ≥6, rate ≥15%.
- `WEAK_BIGRAM`: recent opportunities ≥20, error occurrences ≥4, rate ≥20%.
  Lifetime path: opportunities ≥40, error occurrences ≥8, rate ≥20%.
- `DIFFICULT_WORD` (displayed as token): recent opportunities ≥5, error occurrences
  ≥3, rate ≥30%. Lifetime path: opportunities ≥10, errors ≥4, rate ≥30%.
- Each lifetime exposure path additionally needs recent opportunities at least
  half its recent threshold, rounded up (10/10/3 respectively), recent rate at
  least half its category threshold (7.5%/10%/15%), and a recent error. Prefer the
  recent path when both qualify. Recent exposure ≥20 with rate <5% suppresses
  specific weakness/confusion recommendations as improvement.
- `SUBSTITUTION_CONFUSION`: expected grapheme's recent exposure ≥20 and recent
  pair count ≥4; alternatively lifetime expected exposure ≥20, lifetime pair count
  ≥6 and at least one recent repetition. Apply the same improvement suppression.
- Trend-qualified sessions have ≥40 insertion attempts and ≥1,000 active ms.
  `ACCURACY_FOCUS` takes precedence and returns alone when at least 3 recent
  trend-qualified sessions have historical attempt accuracy **<90%**, and recent
  aggregate errors span ≥5 non-whitespace target graphemes with ≥2 error
  occurrences each. Structured evidence exposes the breadth and poor sessions.
- Otherwise return at most **3** ranked specific recommendations.
- With no eligible specific candidate, `SPEED_BUILDING` requires at least 3
  recent trend-qualified sessions and **all** such sessions in the window at
  **≥97%** attempt accuracy. No absolute WPM is classified as slow.
- Otherwise return `GENERAL_PRACTICE` with an honest more-evidence-needed reason.

Specific priority is:

```text
round(selected.errorRate * 1000)
+ min(selected.errorOccurrences, 50) * 2
+ min(recent.errorOccurrences, 25) * 3
+ min(selected.remainingErrors, 20) * 2
+ categoryBonus
```

Bonuses: confusion 30, grapheme 20, bigram 10, token 0. A confusion uses its
expected grapheme's incidence row for severity and exposes pair counts separately.
Ranking ties use more selected opportunities, then ascending recommendation ID
(category plus JSON target tuple), compared by Unicode scalar values without
locale collation. Accuracy focus has priority 2,000; speed fallback 1,000; general
fallback 0. WPM does not rank specific weaknesses.

Specific evidence strength is medium, or high when selected exposure ≥40 and
recent error occurrences ≥3. Broad focus is high, speed medium and general low.
This is an evidence-volume heuristic, not statistical confidence. Structured
outputs expose lifetime/recent counters, selected window, reason code, pair counts
and recent session speed/accuracy. Display strings are separate from policy.

## Specifications and UI

`practiceSpec` produces recommendation ID, focus type/items, desired length
`{ unit: "graphemes", value: 120 }`, difficulty `steady` or `gradual-speed`, fixed
mode and `require-correct-target` completion. Focus types are grapheme,
substitution, bigram, token, accuracy, speed and general. The spec itself contains
**no exercise text**. A small Practice card shows up to three titles, explanations and
evidence strengths. Slice 6 adds real **Practice this** generation through
[the verified deterministic exercise layer](exercises/README.md). Policy thresholds
and spec/scoring rules remain unchanged. Adaptive source attribution is accepted
by evidence/storage; concentrated adaptive exposure currently has equal weight.

## Ingestion, identity and persistence

The feature session owns a random UUID per run; restart creates a fresh UUID.
Its lifecycle channel publishes only status/result changes, separate from text
feedback. `useSessionLearning` captures the learner at the first transition out
of ready. Account changes during a run retain that owner; a restart captures the
current learner. Ownership survives hook remount while the feature session lives.
Auth may resolve while ready; unresolved identity at start safely excludes that
run. No engine account/policy dependencies were added.

Completion schedules extraction, aggregation and storage after the input callback
(default `setTimeout(..., 0)`). The input path performs no profile storage writes.
Persisted processed IDs protect against StrictMode replay/remount and reconstructed
services within the 256-ID horizon. A pending set also coalesces queued duplicates.
This is deliberately bounded, not indefinite duplicate protection for arbitrarily
old replays. Test's manual **Save result** still writes legacy history separately;
unsaved legitimately completed tests also contribute local learning. Existing
Practice autosave still contributes each full attempt once. As of 7 October 2026,
ordinary Practice/catalog lessons finish at coverage; catalog lessons qualify at
95% unrounded attempt accuracy, with no speed requirement. Completed low-accuracy
attempts still contribute their real mistake evidence. Local mistake-review drills
do not enter learning ingestion or qualify a lesson. Adaptive/planned contracts
retain correct-target completion.

`LearningContext` exposes its existing Supabase auth subject; profile keys are
`typing-learning-profile:v1:<encoded scope>` with scopes `user:<auth ID>`,
`local-email:<normalized existing local email>`, or `guest:<stable device UUID>`.
The guest UUID uses a separate versioned local key. Pending auth/no learner yields
no scope. Two authenticated IDs/local emails do not share adaptive evidence.
Anonymous guest means one device persona; different people using guest cannot be
distinguished. There is no automatic guest-to-account adaptive-profile import.

Only compact profiles are persisted, never engine results or transient examples.
Loading whitelists/rebuilds known fields and validates bounds, unique keys/IDs,
versions and counter relationships. Canonical serialization is deterministic.
Corrupt, oversized or unknown-version data safely resets to empty; no migration
framework. Maximum JSON size is **2 MiB UTF-8**, with row/string limits keeping
normal profiles much smaller. Storage failure keeps bounded evidence in memory
and the card displays that it is available only for the visit.

The service re-reads storage at completion to preserve sequential external writes;
localStorage offers **no atomic cross-tab merge**, so simultaneous writes may lose
updates. Profiles are local device data, without encryption, cloud sync, Supabase
schema changes or legacy summary-only mistake reconstruction. Existing legacy
Reset progress does not clear this separately versioned profile; no dedicated
adaptive-profile reset/export UI is included yet.

## Validation and limits

Evidence, profile, storage, policy, completion service and React integration suites
cover Unicode/combining revisions, corrected/remaining errors, repeated mistakes,
privacy, incidence rules, threshold paths, deterministic ties, pruning, roundtrip,
bad storage, identity separation, StrictMode/remount, restart and deferred writes.
The original 240 engine/adapter/Practice/Test tests remain part of the suite.
Final validation: **306 tests pass across 15 files** (66 added in six learning
suites); `pnpm typecheck`, `pnpm build` and `git diff --check` pass. New/untracked
Slice 5 paths were also checked for whitespace errors. No lint script is configured.

A deterministic 1,000-session stress fixture produced **58,680 UTF-8 bytes** with
8 recent sessions, 256 dedupe IDs and all aggregate caps respected. A standalone
local Vite/Node development run took **2,564.61 ms** including engine preparation,
result construction, extraction, merging and serialization (~2.56 ms/record).
This is a local observation, not a production latency or per-keystroke guarantee.

Actual in-app Chromium browser validation on an isolated local origin (Supabase
disabled) completed one Practice and two ten-word tests with sequential native
input. Neither Test was manually saved. Practice showed 3 learning sessions,
1 legacy saved session and a speed-building recommendation; reload preserved it.
No browser warnings/errors were logged. Integration tests additionally exercise
timed expiry, abort, learner changes and repeated completed-result ingestion.

Limitations include conservative exposure, bounded/pruned detailed history,
heuristic thresholds, no causal/statistical modeling, unvalidated linguistic word
segmentation, local storage concurrency/availability, shared guest persona and
bounded dedupe horizon. Physical IME/mobile/other browser compatibility remains
limited to evidence from Slices 1–4; this slice expands no such claim.

Slice 6 now converts these specifications into deterministic exercises using
curated source material and explicit target-coverage rules. See
[the exercise contract and reviewed examples](exercises/README.md).

## Slice 5 file inventory

Created 21 files in this directory:

- Core: [types.ts](types.ts), [constants.ts](constants.ts),
  [aggregation.ts](aggregation.ts), [evidence.ts](evidence.ts),
  [profile.ts](profile.ts), [policy.ts](policy.ts),
  [recommendations.ts](recommendations.ts), [storage.ts](storage.ts),
  [identity.ts](identity.ts), [service.ts](service.ts), [index.ts](index.ts).
- React: [useLearningProfile.ts](useLearningProfile.ts),
  [Recommendations.tsx](Recommendations.tsx).
- Tests: [testFixtures.ts](testFixtures.ts), [evidence.test.ts](evidence.test.ts),
  [profile.test.ts](profile.test.ts), [storage.test.ts](storage.test.ts),
  [policy.test.ts](policy.test.ts), [service.test.ts](service.test.ts),
  [integration.test.tsx](integration.test.tsx).
- Documentation: this README.

Modified eight existing files:

- [LearningContext.tsx](../../data/LearningContext.tsx): expose resolved auth ID.
- [Practice.tsx](../practice/Practice.tsx): completion hook and recommendation card.
- [Test.tsx](../tests/Test.tsx): completion hook.
- [useTypingSession.ts](../typing/useTypingSession.ts): run identity/lifecycle channel.
- [vitest.config.ts](../../../vitest.config.ts): include learning test suites.
- [Root README](../../../README.md), [typing README](../typing/README.md),
  [Test README](../tests/README.md): integration and policy documentation.

Accepted Slices 1–4 working-tree changes were preserved. No Slice 5 dependency,
engine, Supabase schema or migration changes were needed.

## Slice 8 composition and controlled transfer

The [progression extension](progression/README.md) adds verified Level 0/1/2 composition, deterministic ordinal variants, explicit controlled transfer checks after ordinary waiting, pure learning actions, and validated companion v2 persistence with v1 migration. Slice 5 scoring, Slice 6 baseline coverage and Slice 7 natural transfer/regression policy remain unchanged. All adaptive content stays excluded from ordinary transfer. Representative material is saved in the extension’s EXAMPLES.md. Earlier v1 companion documentation above describes the accepted Slice 7 baseline; Slice 8 writes the v2 key.
