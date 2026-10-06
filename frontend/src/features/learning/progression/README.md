# Slice 8 composition and controlled transfer

This extends the Slice 6 generator and Slice 7 companion. Core typing, scoring, timing, input/composition, Slice 5 recommendation constants, Slice 6 baseline coverage constants, and Slice 7 natural mastery/regression constants are unchanged. Generation and learning updates run at deliberate-start/completed-session boundaries, never on keystrokes. No cloud/schema change.

## Composition contracts

All thresholds are centralized in `constants.ts`. Three exact domain-grapheme sections remain focus, context, mixed. Section share targets guide assembly; actual mixed shares, exposure, diversity, repetition and length limits are verified after assembly. Section-share targets are goals rather than falsely exact proportions (whole phrases vary in length).

- **Level 0:** 160 graphemes, tolerance 144–176; section-share goals 22/38/40%; actual mixed 35–50%; global focus-position density ≤40%; curated contexts ≥3 (tokens ≥3); mixed ordinary token occurrences ≥3; identical token share ≤25%, consecutive identical tokens ≤2. Concentrated short words/units, focused contextual words and simple phrases.
- **Level 1:** 220 graphemes, tolerance 198–242; goals 11/30/59%; actual mixed 50–68%; density ≤25%; curated contexts ≥4 (tokens ≥4); ordinary mixed occurrences ≥6; identical share ≤20%, consecutive identical tokens ≤1. Short warm-up and connected phrase context/mixed practice.
- **Level 2:** 300 graphemes, tolerance 270–330; goals 6/20/74%; actual mixed 65–85%; density ≤16%; curated contexts ≥5 (tokens ≥4); ordinary mixed occurrences ≥12; identical share ≤15%, consecutive identical tokens ≤1. Short warm-up, connected contextual phrases, largest mixed paragraph.

Exact minimum occurrences by section, expressed as focus/context/mixed:

- Grapheme (each focus item): L0 **6/7/5=18**, L1 **4/6/5=15**, L2 **3/5/4=12**.
- Directional substitution: expected uses grapheme minima; counterpart L0 **5/5/4=14**, L1 **3/5/4=12**, L2 **3/4/3=10**. Expected exposure must be at least counterpart exposure; overall balance ≤1.75.
- Exact ordered bigram: L0 **4/5/5=14**, L1 **3/5/4=12**, L2 **2/4/4=10**.
- Exact whitespace-delimited token (each): L0 **2/2/2=6**, L1 **1/2/2=5**, L2 **1/2/1=4**.

All training compositions additionally pass the unchanged Slice 6 verifier: its overall/section exposure, balance, length, section density, isolation and punctuation constraints remain required. Broad accuracy/speed/general composition uses the same profile lengths/shares; accuracy/general use connected phrases and light punctuation at later levels, speed retains familiar easy material without a timer. General content never establishes a specific weakness. Curated contextual padding uses whole phrases rather than filling with arbitrary word lists. Light sentence punctuation is bounded to two additions at L1 or floor(2% of pre-punctuation length) at L2, skips speed, exact end-of-phrase target tokens, and punctuation focuses. Fallback is labeled **target drill, not a linguistic sentence**; no invented Pa’O/Myanmar language or lexical-diversity claim. Its Unicode target remains exact and is blended with neutral English frames.

## Progression and actions

`learningAction` is pure and returns exactly one of targeted-practice, contextual-practice, normal-practice, controlled-assessment, none. It does not generate, navigate, or launch.

Composition level is separate from Slice 7's evidence state so the existing three-success rule remains intact. Initial ACTIVE starts L0. A successful frozen L0 drill advances composition to L1 while its evidence state remains ACTIVE. The second success advances to L2/IMPROVING; the third establishes TRANSFER_CHECK. Migrated IMPROVING records default to L1; CHECK/PROVISIONAL default to L2. Insufficient/unsupported records use normal practice; general recommendations can retain general adaptive content without a weakness. REGRESSED uses L0; provisional mastery suppresses targeted starts. Waiting CHECK uses normal practice; eligible CHECK offers an explicit mastery check. After completion the action recalculates without automatically launching anything.

Training success/severity uses unchanged Slice 7 category policy. Successful drills increment the frozen actual level by one, capped at 2; mild unsuccessful training lowers it by one, floored at 0; severe returns to 0. Assessment mild failure returns ACTIVE/L1, severe ACTIVE/L0; both reset the training/transfer/check epoch and require new training plus ordinary waiting. A token check with one mistake in two target occurrences is severe (50% incidence), not mild. Corrected mistakes remain historical evidence.

## Deterministic variation

Composition input is `{level, ordinal, purpose}`. Stable weakness identity, learner scope, validated specification, composition/generator/bank versions, level, purpose and ordinal participate in generation/identity. Recommendation instance IDs and timestamps do not select content. Seeded ordering varies phrases/contexts and surrounding content; full ordinal distinguishes source IDs, and content uses a finite **32-variant cycle**. Different ordinals may coincide in constrained fallback pools; diversity is bounded, not unlimited. No randomness, network, or private source text is an input.

Deliberate successful starts reserve the next ordinal, separately for training and controlled checks for each stable weakness. Reservations are persisted at start; failed generation does not consume one. Restart uses the existing immutable selection and never reserves/regenerates. Starting again/new text deliberately reserves a new variant. Selection freezes identity, level, ordinal, versions, prepared text, action, explanation and check epoch; profile changes cannot rewrite the active target. Reload ends an active session; the next deliberate start uses the persisted next ordinal. Given the frozen input metadata, the generator reproduces its text; active-session resumption is not implemented. Cursors cap at 1,000,000,000, retain the latest 64 keys, and fail safely at saturation. Eviction can reset an old unseen weakness's cursor to zero; this is an explicit bounded-history tradeoff.

## Controlled assessment contract

The source remains `adaptive`, fixed-text, `require-correct-target`; IDs begin `assessment-`. Structured attribution identifies `controlled-transfer-assessment` and captures the transfer-check entry order. This is a learning evidence context, not a new engine mode. Controlled observations cannot count as training or ordinary transfer. **All adaptive practice, including L2, unrelated/general content and assessments, stays excluded from natural transfer.** UI says Mastery Check, names the skill only at high level, and does not highlight upcoming focus positions.

Eligibility requires all of: current TRANSFER_CHECK; Slice 7 evaluation still CHECK; at least three training observations, latest three all successful under existing category policy; supported exact grapheme/substitution/bigram/token identity; **five completed ordinary sessions after current CHECK entry**, each ≥40 attempts and ≥1,000 active ms; observed natural target opportunities still below the unchanged category minimum (40 grapheme/substitution, 30 bigram, 6 token); no severe target signal in the latest five qualifying ordinary sessions. Zero target exposure is allowed in waiting observations, but adaptive sessions never satisfy waiting. This observes sparse exposure instead of assuming a target is rare. Very long tokens (>15 graphemes) cannot fit two appearances in the assessment density budget and are unsupported. Other difficult targets may still return a typed generation failure within bounded attempts; no contract is weakened.

Assessment length is **300±10%**, share goals 6/25/69%, actual mixed 60–85%, density ≤10%, ordinary mixed token occurrences ≥15, identical share ≤12%, consecutive identical tokens ≤1, isolated focus run ≤2. Curated grapheme/substitution/bigram contexts ≥5; token surrounding contexts ≥2. Exact section partition and substitution balance/direction are independently checked. Assessment exposure is a distinct explicit contract, not a relaxed training claim:

- Grapheme expected **0/5/5=10** minimum.
- Substitution expected **0/5/5=10**, counterpart **0/4/4=8** minimum.
- Bigram **0/3/3=6** minimum.
- Token **0/1/1=2** minimum, separated across contextual and mixed content; never consecutive target-token drills.

Warm-up is target-free. Category exposure is verified with prepared domain graphemes/ordered pairs/exact tokens. Grapheme/bigram/token success requires **zero affected target occurrences**, and substitution requires **zero exact expected→actual incorrect attempts**, including corrected ones. Every successful check additionally requires overall attempt accuracy ≥99.5%, ≥100 attempts, ≥1,000 active ms, and the category minimum exposure above. Overall accuracy alone is insufficient.

Controlled provisional mastery requires all current eligibility gates plus successful, distinct ordinals in the current check epoch: **grapheme 4 checks/40 opportunities; substitution 4/40 expected opportunities; bigram 5/30; token 3/6**. The bounded history window is five, every check in it must succeed. One check never qualifies. Session-ID dedupe and ordinal dedupe prevent repeating a restarted successful check from substituting for distinct checks. Ordinary exposure is not added to these totals.

Path A remains the exact Slice 7 natural transfer rule (including original training, ordinary session/exposure/error thresholds, baseline handling and regression). Path B requires the stricter zero-error controlled criteria above plus explicit training and waiting. Natural qualification takes precedence; sufficient observed natural exposure makes assessments unnecessary even if performance still needs improvement. Natural evidence continues to regress controlled provisional mastery under unchanged Slice 7 post-mastery rules; controlled success never overrides ordinary regression.

## Persistence and limits

Base learning profile stays v1. Companion key becomes `typing-learning-mastery:v2:<scope>` with canonical validated schema v2. Explicit v1 migration preserves identity, state, evidence, baseline and dedupe order, initializes composition conservatively, records prior provisional mastery as natural, and supplies **no fabricated waiting or assessments**. Load tries valid matching v2, then v1; future writes use v2 and leave the v1 key intact. Corrupt/oversized/mismatched companions fall back conservatively without suppressing weaknesses.

Companion retains ≤64 records, training 3, natural 6, waiting 5, checks 5 per record, ordinary speed baseline 3, processed IDs 256, variant cursors 64, serialized ceiling 262,144 bytes. Natural-since-check counters saturate at category minima. It persists counts, bounded weakness items, orders, metrics, cursors and path/failure flags; no exercise text, custom passages, input buffers or full raw mistake ledger. Base Slice 5 privacy and evidence aggregation remain unchanged. Blocked storage retains bounded visit-local state.

The prior cross-tab last-writer-wins race and two-key crash atomicity limitation remain: click-boundary reads normally see another service's cursor, but simultaneous reservations/completions are not transactional. A crash between base and companion writes can conservatively reset progression. There is no cross-tab lock, server planner, decay model, or cloud synchronization. Controlled thresholds are explicit initial product policy, not a validated psychometric claim. Engine/input limitations, including lack of physical IME validation, are inherited.

## Validation artifacts

`EXAMPLES.md` contains generated L0/L1/L2 and controlled examples for all four exact categories. `BENCHMARK.json` captures the deterministic 264-exercise batch; rerun with `SLICE8_WRITE_REPORT=1 pnpm test src/features/learning/progression/benchmark.test.ts` to refresh both artifacts. Ordinary tests never rewrite documentation. Batch includes broad categories, accented grapheme and Myanmar token fallback, eight ordinals and every level/purpose. Scenario tests use real engine completed results. Stress replays cached immutable source evidence with distinct session IDs through actual aggregation and mastery ingestion, covering repeated training, waiting, controlled/natural mastery, rollback, regression and dedupe; it is a completed-boundary policy benchmark, not a keystroke benchmark. Browser fixture is isolated in `tests/browser/progression-session.html`; seed buttons explicitly inject synthetic engine results and never claim human ordinary exposure.

## Slice 8 file manifest

Created (23):

- `src/features/learning/exercises/assembly.ts`
- `src/features/learning/progression/BENCHMARK.json`
- `src/features/learning/progression/EXAMPLES.md`
- `src/features/learning/progression/README.md`
- `src/features/learning/progression/actions.test.ts`
- `src/features/learning/progression/actions.ts`
- `src/features/learning/progression/assembly.ts`
- `src/features/learning/progression/assessment.test.ts`
- `src/features/learning/progression/assessment.ts`
- `src/features/learning/progression/benchmark.test.ts`
- `src/features/learning/progression/composition.ts`
- `src/features/learning/progression/constants.ts`
- `src/features/learning/progression/content.ts`
- `src/features/learning/progression/generation.test.ts`
- `src/features/learning/progression/persistence.test.ts`
- `src/features/learning/progression/scenarios.test.ts`
- `src/features/learning/progression/stress.test.ts`
- `src/features/learning/progression/testFixtures.ts`
- `src/features/learning/progression/types.ts`
- `src/features/learning/progression/variants.ts`
- `src/features/learning/progression/variation.test.ts`
- `tests/browser/progression-session.html`
- `tests/browser/progression-session.tsx`

Modified relative to the accepted Slice 7 snapshot (17):

- `src/features/learning/README.md`
- `src/features/learning/Recommendations.tsx`
- `src/features/learning/exercises/EXAMPLES.md`
- `src/features/learning/exercises/README.md`
- `src/features/learning/exercises/generator.ts`
- `src/features/learning/exercises/integration.test.tsx`
- `src/features/learning/exercises/selection.ts`
- `src/features/learning/exercises/types.ts`
- `src/features/learning/service.ts`
- `src/features/learning/transfer/README.md`
- `src/features/learning/transfer/classify.ts`
- `src/features/learning/transfer/evidence.ts`
- `src/features/learning/transfer/progression.ts`
- `src/features/learning/transfer/storage.ts`
- `src/features/learning/transfer/types.ts`
- `README.md`
- `src/features/practice/Practice.tsx`

Earlier uncommitted Slice 1–7 files and package changes are retained; they are not counted as Slice 8 modifications.

## Slice 10 robustness

The Slice 8 descriptions and archived benchmark above describe the accepted baseline. Current composition uses `adaptive-composition-v3/english-context-v3`, adds 23 original short phrases for proven content gaps, varies target-free warm-ups, and balances peak token repetition during padding. Numeric contracts, training/transfer/mastery/wait/regression gates, companion v2 schema and migration are unchanged.

Current controlled checks require curated content. Accented and Myanmar focuses lacking those contexts receive normal Practice while retaining natural-transfer eligibility; their training drills remain valid. The updated 264-attempt benchmark explicitly expects 16 unsupported controlled combinations and zero supported failures, rather than silently treating drills as checks. Archived `BENCHMARK.json` and `EXAMPLES.md` have not been rewritten. See [SLICE10.md](../evaluation/SLICE10.md) for current validation and the isolated `tests/browser/robustness-session.html` fixture.
