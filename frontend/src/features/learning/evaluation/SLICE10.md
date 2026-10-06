# Slice 10: generator robustness and recommendation visibility

This change addresses the two accepted Slice 9 engineering blockers. It adds no curriculum/session planner, scheduling, LLM generation, telemetry, Supabase schema, scoring or input-adapter changes. Validation below is synthetic engineering evidence, not human learning calibration.

## Preserved baseline and reproduced failures

The accepted [FINDINGS.md](FINDINGS.md) remains byte-identical. Slice 9 had 699 passing tests, 73 scenarios, 3,860 invariant checks with zero violations, and 1,568 generation attempts: 1,463 generated and 105 failed (6.6964%). No production constants changed in Slice 9. Original starvation histories, full eligible lists, scores, visible actions and records are frozen in [slice9-baseline.json](slice9-baseline.json).

Before generator edits, the full original matrix reproduced all 105 failures. [repairFixtures.ts](../exercises/repairFixtures.ts) freezes those cases: all 32 ordinals for e→i Level 1, Level 2 and controlled checks (96 failures), plus controlled a ordinals 13,14,15,18,19,23,24,29,30 (9).

The original progression bank contained zero phrases free of both e and i. Coverage-bearing contexts existed, but the mixed section could not grow to 220/300 graphemes without violating density/ordinary-content constraints; examined candidates stopped around 105–140 graphemes. This was a content-space and length/density interaction, not a directional coverage-verifier mismatch. Controlled a could reach 303 graphemes but repeated `the` eight times in 63 tokens (12.6984%), exceeding the unchanged 12% identical-token limit. Average reuse scoring concealed that peak-token conflict.

## Generator and capability implementation

The bounded assembler retains focus/context reservation and independent final verification. It now:

- Adds 15 original e/i-free phrases and eight original a-free/article-free phrases, directly supplying ordinary low-density filler and alternatives to repeated articles. The 23 phrases are auditable in [content.ts](../progression/content.ts); no imported passages or learner text were used.
- Prefers seeded target-free intact phrases for controlled warm-up and avoids appending an unrelated word merely to fill the nominal warm-up allocation.
- Scores projected peak identical-token count before average reuse, with existing seeded tie order.
- Uses existing 10% composition length headroom to dilute mixed training sections when necessary. The authoritative verifier still enforces length, density, exposures, contexts, section shares and repetition.

Generator becomes `adaptive-composition-v3`; bank becomes `english-context-v3`; composition schema remains `composition-v1`. Retry bounds remain eight per strategy, at most sixteen for training. Numeric Slice 6/8 coverage policies are unchanged, checked against [coverage-contracts.json](../exercises/coverage-contracts.json). Detection, training, transfer, mastery, waiting and regression thresholds are unchanged.

Controlled checks now require curated resources and independently reject `fallback-drill`. This strengthens the assessment content contract: a Unicode target drill is useful training but cannot stand in for a natural-context controlled check. No exposure, density, diversity, length, repetition or mastery requirement is reduced. Existing provisional mastery is not reset or retroactively reclassified.

Structured diagnostics distinguish insufficient content, unsupported focus, coverage, density, context diversity, repetition, length and bounded assembly exhaustion. The action UI renders plain next-action text rather than internal diagnostics.

[canGenerateExercise](../exercises/capability.ts) returns the real immutable, independently verified exercise as its successful witness. Its answer applies to the exact bank object/version, focus/spec, learner scope, progression level, purpose, ordinal and generator version. A bank-keyed WeakMap bounds the FIFO witness cache to 128 entries per bank. Display and start share the same scope/cursor contract; preflight makes no session and reserves no variant. It does not claim universal support across arbitrary focuses, banks, runtimes or ordinals.

Current controlled combinations without curated contexts (`typing`, `é`, `ပအိုဝ်ႏ`) are unavailable before the learner action. Their training drills remain supported; normal Practice and natural transfer remain available. Progression eligibility gates and actual content availability are separate.

## Visibility policy

The original diagnosis, recent/lifetime aggregates, scores and raw tie order remain intact. [rankPracticeCandidates](../policy.ts) exposes the complete eligible list; legacy `recommendPractice` still returns the original raw top three. Product selection overlays retained mastery records and then explicitly diversifies the full list. Canonical weakness identity deduplicates exact focuses rather than recommendation instance IDs. Legacy record admission is retained and diversified newly visible candidates are also tracked, so consolidating cards never interrupts existing training/transfer observations.

[selection.ts](../selection.ts) prepares exact domain grapheme/pair/token signatures. Directional substitution's expected side defines training intent; its actual side remains relationship metadata. Reverse directions stay distinct. Incidental shared English letters do not merge words unless a diagnosed grapheme/pair supplies an anchor. Recent error-session provenance is derived from existing aggregates, with no new persisted mistake text. One coincident session plus separate failures preserves distinct intents; identical error histories or at least two shared error sessions may support consolidation when the structural anchors also match. These relationships do not establish a common cause.

Selection order is:

1. Preserve sole broad accuracy precedence. Broad low-accuracy evidence calls for a comfortable accurate rhythm before localized work; no synthetic threshold contradiction justified changing this rule.
2. Reserve one formally REGRESSED item, preferring more distinct recent error sessions, then original score/tie order. Qualification remains the unchanged Slice 7 regression rule.
3. Reserve one TRANSFER_CHECK item, consolidating its exact weakness rather than duplicating its practice/check action.
4. Surface recently severe eligible grapheme anchors using existing 20-opportunity/3-error and severe-rate 20% gates. A repeated direction can represent a generic anchor when it accounts for at least half its faulty occurrences and meets the existing directional minimum.
5. Fill remaining slots by original score/tie order, suppressing related training intents and maintaining at most three visible cards.

New selection constants are regressionSlots=1, transferSlots=1, directionalErrorShare=0.5 and minimumRelatedSessions=2. No score boost, time decay or scheduling rule is introduced. At most three primary candidates are compared with each candidate; there is no all-pairs graph or transitive cluster union. Token segmentation cache is bounded to 256 entries; frozen-profile provenance uses weak keys.

Provisionally mastered records remain suppressed. Related suppressed candidates remain in the full audit and profile and can appear as supporting explanation metadata (up to two titles in the card). Suppression means visibility, not deletion. Independent needs and bigram specificity remain available. More than three unrelated urgent items still require prioritization; the policy promises one reserved formal regression slot, not simultaneous visibility for all regressions.

Learning stage intent is separate from an executable offer. Hidden evaluator record rows describe potential intent; hidden candidate audit actions are null. Every surfaced focused action uses exact preflight. This avoids generating dozens of invisible exercises in large-profile audits while retaining honest hidden-step metrics. Unsupported assessments show “Practice normally”; controlled failures do not reserve a cursor.

## Validation

Final stable-source checks: `pnpm test --maxWorkers=1` passed 841 tests in 38 files (320.55 seconds), retaining every earlier test case. `pnpm typecheck`, `pnpm build` and `git diff --check` passed. Created/untracked files also passed an explicit trailing-whitespace check. No lint command is configured. Core/input/evidence/mastery/assessment/storage files and Slice 9 `FINDINGS.md` were compared byte-for-byte with the accepted source. Original Slice 9 counts above are preserved independently.

Final `pnpm learning:evaluate` exited successfully: 80 scenarios; 656 primary engine sessions (654 unique ingested); 243 scenario generation attempts plus seven frozen restarts; 30 invariants/9,378 checks/zero violations; ten golden contracts passed. Sensitivity remains thirteen parameter paths, 27 isolated configurations and 1,782 fixed-evidence replays; no production defaults were selected or changed. Total offline runtime was 394.37 seconds.

Generation comparison: Slice 9 1,568 attempts/1,463 generated/105 engineering failures (6.6964%). Slice 10 1,568 attempts/1,472 generated/96 explicit unavailable controls/zero supported failures. The overall not-generated fraction is 6.1224%; the supported failure fraction is 0/1,472=0%. All original 105 failed cases are genuinely generated and independently verified, not reclassified. New unavailable controls are 32 each for `typing`, `é`, and `ပအိုဝ်ႏ`; all are level-two controlled checks with zero assembly attempts. Failure code distribution is `unsupported-focus:96`; diagnostic distribution is `insufficient-content:96`. By type: grapheme 32/token 64; training has 1,176/1,176 generated, and controlled has 296 generated plus 96 unsupported across 392 attempted. No density, repetition, length, coverage or assembly-exhaustion failures remain in this matrix.

Additional repaired-focus stress: 256/256 generated across two further learner scopes, all 32 ordinals and four repaired contracts; zero capability/direct-generation mismatches, 17.61 seconds (two generation calls per row). Matrix generation took 64.14 seconds: mean 40.91 ms, median 34.30 ms, max 243.29 ms, including immediate unsupported outcomes. These are engineering timings on this host.

Selection benchmark: 700 full production overlay/selection calls processed 16,300 audit candidates in 27.48 seconds (39.25 ms/call). The largest actual eligible list had 67 candidates; 100 pure-selection runs took 434.12 ms (4.34 ms/call). Separately, the profile-limit unit fixture exercised 306 candidates over 20 runs within its unchanged ten-second bound, with deterministic reversed-input output and a reserved regression. Cold action preflight remains synchronous and adds generation cost; cached witnesses avoid repeated render/start cost. Timing is not a human-browser responsiveness or learning-effectiveness guarantee.

Browser: 19 automated checks passed with zero runtime errors. The final headless Chromium run used real beforeinput/keyboard adapter events and actual elapsed time for adaptive, ordinary, 15-second timed and ten-word completions. It verified overlap/supporting evidence, Level 0/1 starts, controlled checks, unavailable Myanmar fallback, natural regression, reload, learner isolation, and Save independence. A harness initially selected the Practice text locator on the Test screen; using its actual `timed-passage` locator repaired that harness failure without product changes. Screenshot: `.learning-evaluation/browser-proof.png`. No physical IME testing was performed.

The same 1,568-attempt matrix and additional two-scope/all-ordinal repaired-focus stress are run with production generation and independent validators. The evaluator retains the original 73 histories and 22 invariants and adds seven focused histories and eight contracts (80 histories, 30 invariants). Ten original golden contracts remain. JSON embeds full before/after starvation traces with uncapped eligibility, raw scores, relationships, suppression reasons, visible three and final offered actions. Timings are separate from deterministic JSON.

Tests retain all 699 earlier cases, with narrow expectation updates for intentional consolidation, capability-at-render reuse and the explicitly unsupported drill-only checks. The old full controlled-grapheme path now uses curated r; new cases separately assert accented/Myanmar training and unsupported controlled fallback. A full-suite run caught record-admission loss; preserving legacy admission repaired it. Parallel timing failures in the 264-attempt benchmark and 1,000-session stress are retained in ignored logs; final validation uses one Vitest worker rather than increasing their limits.

Manual review includes repaired e→i L1/L2/controlled, controlled a, existing grapheme/direction/pair/token/broad categories and Unicode fallback. Controlled warm-ups are target-free intact phrases; later text consists of short curated clauses with ordinary mixed content, rather than repeated target drills. Training L0 still deliberately includes token lists. Finite phrase reuse and occasional clause concatenation remain visible. Structural validation does not establish natural-language pedagogy or psychometric independence.

Browser verification uses the isolated cloud-disabled `tests/browser/robustness-session.html` fixture, actual React adapters, generated targets and completed results. Seed controls are explicitly synthetic. Physical keyboard/IME behavior and human learning benefit are not claimed.

## Representative repaired content

Scope `anonymous-evaluation`; exact production-prepared targets are stored in `.learning-evaluation/manual-samples.json`.

- e-to-i, L1, training, ordinal 0: 221 graphemes; peak identical-token share 4.5455%; section densities 30.43%, 18.64%, 6.57%.
- e-to-i, L2, training, ordinal 0: 300 graphemes; peak identical-token share 4.9180%; section densities 33.33%, 14.75%, 3.20%.
- e-to-i, L2, controlled-transfer-assessment, ordinal 0: 302 graphemes; peak identical-token share 6.6667%; section densities 0.00%, 14.75%, 4.00%.
- a, L2, controlled-transfer-assessment, ordinal 13: 302 graphemes; peak identical-token share 5.3571%; section densities 0.00%, 6.49%, 2.39%.

Repaired e→i L1 context: “read each line before you begin. moonlight fills this room.” L2 mixed begins “write one line at a time. bold chalk marks show sharp turns.” The controlled e→i warm-up is “warm sun glows”; controlled a ordinal 13 uses “red birds rest” and context “a small dog plays by a lake. cool winds ripple over ponds. birds sing softly.” Whole-exercise controlled focus densities are 18/302=5.9603% for e→i and 10/302=3.3113% for a, below the unchanged 10% ceiling. These are original short phrase exercises. Later clauses can run together; reliability does not make them polished narrative passages.

## Auditable starvation comparison

Accepted final raw priorities are preserved: new v is 735 while vivid/ev/ar are 1179/1170/1150; after old mastery v is 445 while every/seven/visit are 1070/1035/1035. In both original traces v is eligible but absent from every visible set and its own record is never admitted. Slice 10 surfaces v at step 13 in the first history and step 23 after old mastery (formerly never visible in either); final visible sets are v/ar and v/speed respectively. Severity selection makes v primary, with related candidates retained as supporting evidence rather than raising its raw priority.

At step 24 of `large-lifetime-other-category`, the original visible set is speed (1000), near (730), through (621). Official r is REGRESSED and has raw eligibility priority 398, but its old retained overlay recomputes 214 after the early cap discarded its raw candidate. Slice 10 preserves uncapped raw r=398 and reserves its regression slot; the final visible set is r, speed, through. Near/rare/river and the related ar evidence remain auditable supporting candidates. Through retains its separate action because its error occurred in a separate history from the two recurring r failures. No priority boost or larger visible list is used.

The complete original and current per-step eligible lists, scores, signatures, suppression explanations and visible actions are embedded in `.learning-evaluation/evaluation-report.json` under `robustness`. The original baseline fixture is independently checked in, so regenerating current reports cannot erase the accepted findings.

## Remaining limits and Slice 11 boundary

No anonymized real learner dataset was available. Thresholds remain initial policy; synthetic history improvements do not justify recalibration. Unsupported controlled focuses still need curated language resources or natural exposure. Capability is exact-contract proof, not a promise for arbitrary content. Finite bank reuse, cap-three prioritization, browser Unicode-runtime differences, localStorage last-writer-wins and base/companion two-key crash atomicity remain inherited limits.

Slice 10 is GO. The two demonstrated engineering blockers are resolved for the accepted cases, so Slice 11 receives GO for a bounded curriculum/session planner that respects executable content and the existing evidence boundary. Unsupported language resources and real-user calibration remain limitations, rather than failed engineering checks. It should consume visible needs and explicit executable actions, preserve ordinary versus adaptive evidence, use normal Practice when content is unavailable, honor provisionally mastered/regressed states, and avoid repeated content. It must not infer calibrated learning outcomes from this synthetic evaluation. Slice 11 has not been started.

## File inventory relative to accepted Slice 9

Created (12):

- `src/features/learning/evaluation/SLICE10.md`
- `src/features/learning/evaluation/robustness.ts`
- `src/features/learning/evaluation/slice9-baseline.json`
- `src/features/learning/exercises/capability.ts`
- `src/features/learning/exercises/coverage-contracts.json`
- `src/features/learning/exercises/diagnostics.ts`
- `src/features/learning/exercises/repair.test.ts`
- `src/features/learning/exercises/repairFixtures.ts`
- `src/features/learning/selection.test.ts`
- `src/features/learning/selection.ts`
- `tests/browser/robustness-session.html`
- `tests/browser/robustness-session.tsx`

Modified (35):

- `README.md`
- `scripts/learning-evaluate.mjs`
- `src/features/learning/Recommendations.tsx`
- `src/features/learning/evaluation/README.md`
- `src/features/learning/evaluation/constants.ts`
- `src/features/learning/evaluation/evaluation.test.ts`
- `src/features/learning/evaluation/generator.ts`
- `src/features/learning/evaluation/index.ts`
- `src/features/learning/evaluation/reports.ts`
- `src/features/learning/evaluation/runner.ts`
- `src/features/learning/evaluation/scenarios.ts`
- `src/features/learning/evaluation/types.ts`
- `src/features/learning/exercises/README.md`
- `src/features/learning/exercises/generator.ts`
- `src/features/learning/exercises/index.ts`
- `src/features/learning/exercises/integration.test.tsx`
- `src/features/learning/exercises/selection.ts`
- `src/features/learning/exercises/types.ts`
- `src/features/learning/policy.ts`
- `src/features/learning/progression/README.md`
- `src/features/learning/progression/actions.ts`
- `src/features/learning/progression/assembly.ts`
- `src/features/learning/progression/benchmark.test.ts`
- `src/features/learning/progression/composition.ts`
- `src/features/learning/progression/constants.ts`
- `src/features/learning/progression/content.ts`
- `src/features/learning/progression/persistence.test.ts`
- `src/features/learning/progression/scenarios.test.ts`
- `src/features/learning/progression/types.ts`
- `src/features/learning/progression/variation.test.ts`
- `src/features/learning/service.ts`
- `src/features/learning/transfer/progression.test.ts`
- `src/features/learning/transfer/progression.ts`
- `src/features/learning/transfer/recommendations.test.ts`
- `src/features/learning/transfer/recommendations.ts`

Earlier uncommitted accepted files are retained. Ignored generated reports, reproduction sources and browser proof are not production source additions.
