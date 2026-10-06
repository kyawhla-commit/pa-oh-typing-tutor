# Deterministic adaptive exercises — Slice 6

The pipeline is `PracticeRecommendation → practiceSpec → selectAdaptivePractice
→ generateAdaptiveExercise → prepared fixed Practice → completed evidence`.
Recommendation policy and engine scoring are unchanged. The only domain type
extension is compact `TextSourceIdentity.type = "adaptive"`; the engine receives
prepared text, identity and ordinary `require-correct-target` configuration.

## Versions, content and deterministic selection

- Generator: **adaptive-exercise-v1**.
- Bank: **english-content-v1**.
- The original generic English bank contains **399 words and 52 unique phrases**,
  about **3,289 UTF-8 bytes** of raw content. No fetched passages, external AI,
  machine learning, learner passages or copied quotations are involved.
- `prepareContentBank` prepares content with the existing engine boundary and
  derives grapheme/bigram word indices at module initialization. Familiar warm-up
  words come from accuracy/speed phrases, not a separately maintained dictionary.
  Index lookups and cached per-candidate focus counts keep assembly modest.
- Canonical spec fields, learner scope, generator version and bank version form
  an FNV-1a/64 seed. Independent deterministic xorshift32 Fisher–Yates permutations
  choose content order. No Date, random entropy, network or object-key iteration
  influences generation. Greedy coverage scores prefer useful exposure per length,
  avoid overexposure and use deterministic candidate order for equal scores.

The final identity also hashes the **actual target text**, so material exercise
changes change identity even if a caller accidentally retains a bank version.
Identity is `adaptive-<64-bit hash>` with source version
`adaptive-exercise-v1/english-content-v1`. Hashes are attribution/selection keys,
not security primitives. Learner identity is not retained as raw exercise metadata.
Runtime Unicode segmentation follows the engine's Intl.Segmenter implementation;
cross-runtime Unicode-version identity equivalence is not promised.

## Exercise and section models

An immutable `AdaptiveExercise` contains ID/version, recommendation/focus metadata,
text, compact adaptive source, content strategy/reason, verified coverage, three
sections, frozen originating spec/versions and domain-prepared target text.
Section offsets are exclusive **grapheme** offsets in the final text.

The sections are **focus → context → mixed**. Labels do not enter target text.
Warm-ups use controlled tokens; later curated sections prefer short intact
phrases. Bounded alternate assemblies can use known target-word lists when phrase
coverage is insufficient. Word lists and whole phrases are separate newline
blocks, rather than being spliced into misleading prose. Mixed sections include
ordinary non-focus content for transfer. Fallback sections are explicitly drills.

Desired length is a target, not exact padding: supported desired length is an
integer **80–300 graphemes**; acceptable final length is
`ceil(desired × 0.80)` through `floor(desired × 1.25)` inclusive. Default 120 allows
**96–150**. Assembly appends whole tokens/phrases and stops when another phrase
would worsen a satisfactory length. No mid-grapheme/token truncation or meaningless
space padding. Enter/newline is normal scored target input.

`steady` uses controlled content with moderate mixed application. `gradual-speed`
starts with familiar 2–4-grapheme warm-up words, then short phrases and longer fluent
material; speed padding uses the fluent speed bank. It adds no timer or pressure.
Accuracy warm-ups use familiar 3–5-grapheme tokens and all later phrases remain
in the controlled accuracy bank. No claim about an individual learner's reading
ability is made.

## Exact coverage contracts

All product limits are in `constants.ts`. Twelve grapheme exposures provide a
short useful dose while leaving most of the default exercise available for
context/transfer. Ten bigram occurrences permit varied tokens, and four difficult
token occurrences avoid making one word the whole exercise. These are initial
auditable product settings, not learned/statistical thresholds.

- **Weak grapheme:** each of at most two distinct graphemes receives ≥12 final
  opportunities: ≥3 warm-up, ≥5 context, ≥4 mixed. Curated content requires ≥3
  distinct non-isolated target-token contexts per item.
- **Substitution:** ordered `[expected, counterpart]` metadata is retained.
  Expected receives ≥12 (3/5/4); counterpart ≥10 (3/4/3). Each needs ≥3 curated
  contexts. Expected gets at least as much total exposure as counterpart. Both
  remain ordinary correct target text; the engine sees no confusion rule.
- **Bigram:** `focusItems` is exactly two adjacent target graphemes, not a UTF-16
  substring or arbitrary n-gram. Require ≥10 occurrences (2/4/4), with ≥3 distinct
  containing token contexts when curated. Overlapping occurrences count.
- **Token:** one or two exact source-contract tokens receive ≥4 occurrences each
  (1/2/1). Curated token assembly needs at least three available bank phrases and
  ≥3 distinct immediate-neighbor contexts in final text. Attached punctuation
  remains part of the target token; input is never independently tokenized.
- **Balance:** maximum/minimum total opportunities across multiple focus items
  must be ≤1.75.
- **Density:** count the union of final focused grapheme positions, divided by
  section graphemes. Curated warm-up ≥15%, context ≥8%; fallback warm-up ≥10%,
  context ≥6%. Mixed density cannot exceed either earlier section, and mixed
  application must contain ≥3 ordinary non-focus letter-containing tokens.
- **Repetition:** one identical token occupies at most 25% of token positions in
  curated text, 40% in fallback drills. At most two identical adjacent tokens and
  at most four uninterrupted isolated focus tokens. Fallback marker use varies
  and multi-item drills alternate sides when both still need practice.
- **Accuracy/speed/general:** no false focus items. Require ≥10 distinct tokens,
  punctuation ≤3% of final graphemes, and the same length/repetition/section bounds.
  Accuracy uses common controlled phrases; speed uses fluent low-punctuation
  phrases; general draws from the broader original bank.

## Coverage verification and bounded failure

`analyzeCoverage` uses `prepareTypingText`, the same NFC grapheme/whitespace-run
token contract as the typing domain. It reports final length, per-focus total and
section occurrences, distinct contexts, densities, balance inputs, ordinary mixed
tokens, token share/runs and punctuation. Internal Maps/Sets and output row arrays
handle arbitrary strings such as `__proto__` safely.

The independent final validator recomputes coverage from actual text, checks total
exposures, and proves sections are ordered intact partitions of that target. Cached
coverage claims cannot substitute for verification. A successful exercise is
returned only after every applicable contract passes.

There are at most **8 attempts per strategy**, **16 total** when curated then drill
strategies are applicable. Each section uses at most 24 selection steps; repair
and padding also have 24-step bounds. No indefinite retry. Failure returns a typed
`invalid-spec`, `unsupported-focus` or `coverage-unsatisfied` result with a reason
and attempt count. Empty/incorrect focus arity, unsupported mode/type/difficulty,
bad length or malformed Unicode are rejected. Impossible long-token contracts
remain failures rather than having requirements quietly reduced.

## Unicode, fallback and privacy

If curated contexts are missing or valid curated assembly cannot be found, the
generator uses `contentStrategy: "fallback-drill"` with an explicit reason.
Exact focus atoms/pairs are separated by varied known markers, with ordinary
English practice text in mixed application. If spaces would merge a leading
combining mark into a different grapheme, newline separators preserve the exact
focus. Requested bigram adjacency that itself merges graphemes fails explicitly.

The fallback has the same exposure/length/balance/repetition guarantees. Natural
token-context diversity is not claimed when no such contexts exist; metadata/UI
clearly identify the different drill contract. Pa’O/Myanmar/emoji/combining targets
are grapheme-safe drills, **not fabricated vocabulary or linguistic sentences**.
Whitespace/control focus drills are unsupported in v1 and fail clearly; the
existing Slice 5 policy, including space confusion evidence, remains unchanged.

Generation accepts only bounded aggregate focus items. It never reads transient
mistake context, complete custom/private passages or historic raw results. Private
source tokens remain excluded by Slice 5. Generated text is held in feature memory
and never written as a raw exercise to local/cloud learner history. The compact
profile may retain bounded derived grapheme/bigram/token statistics and source
identity, exactly as for other approved sources.

## Practice integration and persistence boundary

`Practice this` generates once at a start-click boundary. The selection freezes
recommendation, explanation, spec and exercise. Existing Practice renders the
prepared target, a modest focus/drill indicator and the original stats/completion
UI. Profile updates recompute recommendation cards but cannot replace that target.
No lesson catalog entry is changed. Existing native adapter rejects paste and
supports Backspace/composition through its established contract.

Correct full target is required; historical errors remain after correction.
Completion contributes through the existing deferred local-learning service and
persisted run-ID dedupe. Source `adaptive` is retained in results/evidence/profile.
Evidence contributes equally under the unchanged Slice 5 policy; concentrated
self-training opportunities can bias later estimates, deliberately visible for
future weighting work. Legacy Practice saves **summary metrics only**, using the
label Adaptive practice; no generated exercise is uploaded. Test Save is independent.

Completion does not start another exercise. **Practice again** and Restart reuse
the frozen exercise with a new feature-run UUID; selecting a recommendation again
regenerates deterministically from current inputs. Account/lesson-route changes,
navigation away, or reload end the active feature selection and return to normal
Practice. Profile evidence persists; **active exercise/run restoration is not
implemented**. This avoids persisting raw focus specs or claiming an old run resumed
against changed generator content. No additional persistence is needed in Slice 6.

Local storage cross-tab races, shared anonymous guest identity, bounded history
and the 256-ID dedupe horizon remain Slice 5 limitations. No profile-management
screen, cloud analytics, migration or weighting changes are included.

## Validation, quality and observations

Final suite includes the original **306 tests** plus **69 new cases** across
generator, exact coverage, validation/failure and React integration. All **375
tests in 19 files pass**. Existing engine/adapter/Practice/timed/word/manual-save
assertions remain. `pnpm typecheck`, `pnpm build` and `git diff --check` pass;
all 18 new paths also pass whitespace checks. No lint script is configured.
The two stress tests have explicit 15-second allowances:
concurrent execution exceeded the default five seconds while all assertions
passed; no production policy or assertion was relaxed. Initial parameterized
test-data arity mistakes and an undersized neutral fixture were corrected.

The React suite verifies start-click flow, frozen targets on new evidence,
wrong-final correction, history retained, once-only adaptive ingestion,
StrictMode/remount/reconstructed service, new restart IDs, unchanged catalog,
unchanged timed/word/save boundaries, generation outside input, Unicode
composition, paste rejection and account separation.

Actual in-app browser checks used the isolated StrictMode fixture with Supabase
disabled. A seeded weak `r` recommendation opened generated focus text. Sequential
keyboard input, real Enter and Backspace kept a wrong final character running;
correction completed once with two corrected mistakes and recommendation updated.
Ctrl+V was rejected. Practice again kept the target; Restart cleared the buffer;
navigation back returned to normal Practice. A labelled `é` drill scored synthetic
composition plus trailing echoes once and completed with exactly 112 attempts.
Normal Practice completed, a 15-second timed test retained exactly 15,000 active
ms without saving, and a ten-word test completed with 56 attempts. Manual Save
increased only legacy saved history. Reload retained 7 learning sessions and
4 legacy summaries while returning to normal Practice. Browser logs were clean.
These checks do **not** establish physical IME/mobile/other-browser compatibility.

A standalone local Vite/Node run generated **700 exercises**, all curated/valid,
with **0 failures**, in **5,188.36 ms** (**7.41 ms average**) after bank preparation.
This includes assembly/preparation/validation and is a development observation,
not a production or per-keystroke latency guarantee. The automated stress fixture
also checks 350 varied recommendation IDs against independent final validation.

[Reviewed examples](EXAMPLES.md) show every recommendation category plus Myanmar
fallback. Review found no underexposure, malformed Unicode, excessive identical
tokens, duplicated whole phrase blocks or fabricated language claims. Warm-ups
are intentional token lists; later phrase blocks remain intact. Marker drills
are plainly repetitive by design and labelled as such. The small bank and strict
limits mean some long/unsupported targets cannot fit a useful v1 exercise.

## File inventory

Created 18 files:

- This directory: [types.ts](types.ts), [constants.ts](constants.ts),
  [content.ts](content.ts), [coverage.ts](coverage.ts), [generator.ts](generator.ts),
  [identity.ts](identity.ts), [validate.ts](validate.ts), [selection.ts](selection.ts),
  [index.ts](index.ts), [testFixtures.ts](testFixtures.ts),
  [generator.test.ts](generator.test.ts), [coverage.test.ts](coverage.test.ts),
  [validate.test.ts](validate.test.ts), [integration.test.tsx](integration.test.tsx),
  this README and [EXAMPLES.md](EXAMPLES.md).
- Isolated browser fixture: [adaptive-session.html](../../../../tests/browser/adaptive-session.html)
  and [adaptive-session.tsx](../../../../tests/browser/adaptive-session.tsx).

Modified 12 files:

- [Practice.tsx](../../practice/Practice.tsx), [Recommendations.tsx](../Recommendations.tsx).
- [Engine metadata type](../../../engine/typing/types.ts),
  [source preparation](../../typing/textSources.ts), [evidence.ts](../evidence.ts),
  [storage.ts](../storage.ts): additive adaptive attribution.
- [profile.test.ts](../profile.test.ts): stress-only timeout allowance.
- [Root README](../../../../README.md), [learning README](../README.md),
  [typing README](../../typing/README.md), [Test README](../../tests/README.md),
  [engine README](../../../engine/typing/README.md): integration/source documentation.

Slice 7 should evaluate transfer with a deterministic follow-up assessment and
separate adaptive-drill versus ordinary-source evidence when deciding future
weighting. Physical input validation can continue independently. It has not begun.

## Slice 8 composition and controlled transfer

The [progression extension](../progression/README.md) adds verified Level 0/1/2 composition, deterministic ordinal variants, explicit controlled transfer checks after ordinary waiting, pure learning actions, and validated companion v2 persistence with v1 migration. Slice 5 scoring, Slice 6 baseline coverage and Slice 7 natural transfer/regression policy remain unchanged. All adaptive content stays excluded from ordinary transfer. Representative material is saved in the extension’s EXAMPLES.md. Earlier v1 companion documentation above describes the accepted Slice 7 baseline; Slice 8 writes the v2 key.

## Slice 10 extension

The historical Slice 6 contracts above remain. Composition now uses `adaptive-composition-v3/english-context-v3`; details are in [the Slice 10 report](../evaluation/SLICE10.md). No numeric exposure, density, diversity, length or repetition contract was reduced. Structured diagnostics classify bounded failures. `canGenerateExercise` proves an exact contract with a verified immutable witness, cached in at most 128 entries per bank object. Display and start share scope/purpose/level/ordinal; preflight reserves no cursor. Controlled checks require curated contexts and reject `fallback-drill`; training fallback remains available.
