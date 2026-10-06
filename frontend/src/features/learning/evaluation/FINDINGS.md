# Slice 9 findings

GO for the offline evaluation slice. Hold curriculum planning that repeatedly selects only the top recommendation until generator coverage and recommendation crowding have been reviewed. All results below are synthetic engineering evidence. No anonymized actual learner-history dataset was available in the repository. No production constants, core typing/input code, learning policies, generator architecture or UI were changed in this slice.

## Observed run

- 73 scenarios: 12 personas, 10 recommendation competition cases, 28 progression cases, 16 assessment cases, 3 lifetime competition histories and 4 boundary cases.
- 549 engine-produced scenario sessions; 547 unique sessions ingested. Two intentionally aborted/duplicate inputs were excluded. 220 successful scenario exercise generation attempts and 7 further frozen exercise restarts.
- 22 invariants exercised in 3,860 checks, zero violations; 10/10 semantic goldens passed. Service boundary probes use five additional engine results outside the primary scenario count.
- Sensitivity uses 13 baseline histories containing 66 engine-produced sessions, replayed through 27 isolated policy module graphs: 1,782 evidence replays. It does not simulate a learner changing behavior in response to a different policy.
- The full generator matrix attempts 1,568 exercises. These are separate from the 220 scenario attempts.
- The recorded evaluator runtime was 353.90 seconds under concurrent validation load. Deterministic JSON/Markdown/sample output totals 28,855,171 bytes; the 175,156-byte performance artifact records volatile timings separately.

## Detection, progression and transfer

Clear grapheme `r` and directional `r → t` cases are detected in their first qualifying session with 23 target opportunities. The direction is preserved. The diluted-key `th` case is detected with 25 pair opportunities, and `through` with five token opportunities. The noisy tiny-sample case remains general practice. The accurate 20-WPM learner receives speed-building guidance after three high-accuracy qualifying sessions. Distributed poor accuracy produces the broad accuracy override at the third poor qualifying session.

Successful training advances through levels 0, 1 and 2. In the usual seed-plus-training histories, ACTIVE begins at step 1, IMPROVING at step 3 and TRANSFER_CHECK at step 4. Failed and rollback cases are recorded separately for all four specific categories. Mild failure rolls grapheme/substitution/bigram practice back to level 1; one failed occurrence out of two token opportunities is severe and returns that token to level 0. A failure fraction means different things at small opportunity counts; this deserves real-user observation.

Three successful drills do not establish natural mastery. Typical grapheme/substitution/bigram natural cases qualify after three successful ordinary sessions (step 7), and the token case after two (step 6), subject to opportunity/rate gates. The drill-only persona completes ten adaptive successes, including seven frozen restarts, and never reaches provisional mastery. Level 2 and controlled assessment remain excluded from natural transfer.

Sparse exposure waits five completed ordinary sessions before the first assessment offer. Successful natural qualification takes priority and avoids checks. One successful assessment is insufficient. Grapheme/substitution require four distinct successful checks in these histories, bigram five, and token three; the rare-token persona masters through controlled evidence at step 12. The suite observes 28 eligible snapshots and 27 controlled starts across overlapping fixtures, not a measured user uptake rate. All 28 eligibility checks satisfy the waiting gate.

The regression persona masters at step 7, tolerates a minor isolated error at step 8 and regresses after meaningful failures at steps 9 and 10. Controlled mastery also remains reversible through ordinary failures in all four categories. All 15 isolated-error regression checks pass. State transitions during intentionally worsening/recovering histories are not automatically pathological oscillation; per-scenario transition counts and top changes are in the trace. These finite histories cannot prove absence of long-term loops.

## Competition and starvation

The maximum-three output is preserved. Category recommendations overlap: one mistake can generate grapheme, directional, bigram and token evidence. Broad accuracy takes precedence once its gate qualifies. Mastered records suppress their own action, but mastery of a grapheme does not automatically resolve every neighboring pair or word record.

Three explicit lifetime histories expose limitations:

- `large-lifetime-new-severe`: after twelve old-error sessions and nine severe new-target sessions, intended grapheme `v` never appears. Related `vivid` token and `ev` bigram do appear, so this is not complete failure to recognize the new error family. At the final step, lifetime `ar` still occupies a slot with priority 1,150 despite no recent errors, behind `vivid` (1,179) and `ev` (1,170).
- `large-lifetime-mastered`: old `r` genuinely reaches provisional mastery at step 21, before the new failures. Three ordinary successes were insufficient after that long poor history; six were needed to clear its bounded recent evidence. Intended new grapheme `v` still never appears, while related `every`, `seven` and `visit` tokens fill the final output. Mastery suppression therefore does not ensure category coverage.
- `large-lifetime-other-category`: after old `r` masters at step 21, `through` is detected at step 22 with five opportunities. Repeated ordinary `r` failures reactivate `r` at step 24, but it is outside the three visible recommendations: speed (1,000), `near` (730) and `through` (621). Reactivation is correct internally; a planner constrained to the current visible set could overlook it.

These traces establish category crowding, stale lifetime prominence and hidden reactivation in the tested histories. They do not establish permanent starvation for every history. `targetHiddenActionableSteps` excludes targets never admitted; zero there does not mean no starvation. `targetSuppressedAfterMastery` is vacuously true without observed target mastery; inspect `masteryStep` and record traces before drawing a conclusion.

## Generator coverage and variation

The matrix covers 13 foci at levels 0/1/2 and ordinals 0–31, plus controlled checks for ten specific foci: 49 groups × 32 = 1,568 attempts. Results: 1,463 successes and 105 failures, an exact engineering failure fraction of 105/1,568 (6.6964%). Every failure is `coverage-unsatisfied`, after production's bounded assembly attempts. No extra retries or contract relaxations were added.

Failure reason distribution:

- `e → i`, training level 1: 32/32 failures. Length, ordinary non-focus content, strict composition length, mixed share and lower concentration requirements cannot all be met.
- `e → i`, training level 2: 32/32 failures. The same reasons plus failure to reduce focus density toward mixed application.
- `e → i`, controlled level 2: 32/32 failures. Strict composition length, mixed share and lower concentration requirements fail.
- `a`, controlled level 2: 9/32 failures. Composition repetition exceeds its contract.

Exact ordinals, full production reason strings and bounded attempt counts are in JSON. The three entirely failing `e → i` groups are a generation dead end to address before automated scheduling, rather than a reason to tune detection thresholds.

Summing distinct targets **within each group** yields 1,448, with 15 repeated whole targets among 1,463 successes. This is not a global uniqueness count across categories/levels. Repeats: `r → t` level 1 (1), level 2 (1), controlled (11), `in` controlled (1), and `through` level 0 (1). `r → t` controlled has 21 distinct targets over 32 ordinals, one five-token opening and substantial clause reuse (204 repeated phrase occurrences out of 224). Several other controlled groups likewise share an opening, commonly “keep a calm pace.” Phrase/token reuse measurements are structural, not semantic similarity or language-quality scores.

## Manual content observations

The sample artifact contains 138 successful examples at ordinals 0, 7 and 31. Entirely failed groups have no example; their absence is reported. Representative grapheme, direction, pair, token, broad/general, accented and Myanmar fallback samples were inspected across available levels and checks.

Curated English output is readable in short fragments, but warmups often feel like word lists. Level 1 adds contextual phrases and level 2 adds ordinary mixed text; this changes exposure balance more reliably than literary quality. Finite clauses and occasional artificial punctuation/boundaries remain apparent. Controlled checks reduce concentration but retain visible focus and repeated openings, limiting assessment subtlety and independence. Coverage flags are not evidence of improved learning efficacy or psychometric validity.

The ordinary English token `typing` uses fallback because it lacks curated focus context in the bank; neutral carrier phrases such as “read typing” are drills, not natural prose. Accented `é` and Myanmar/Pa’O token `ပအိုဝ်ႏ` remain exact Unicode in explicitly labeled `fallback-drill` content. English carriers do not constitute fluent Myanmar/Pa’O lessons. Physical IME and linguistic validation were not performed.

## Neighbor sensitivity

Each entry lists current → lower/higher neighbors and the number of affected histories out of 13. JSON includes affected history IDs and exact before/after ranks, states and actions; the generated Markdown includes trade-offs.

- Grapheme opportunities: 20 → 15/25; 1/12 affected. Lowering admits smaller samples; raising delays or changes diagnosis. Candidate for real-user calibration.
- Grapheme error rate: 0.15 → 0.12/0.18; 0/3 affected. Lowering risks noise; raising can miss moderate weaknesses. Candidate.
- Directional recent count: 4 → 3/5; 7/3 affected. Particularly sensitive to small repeated directional samples. Candidate.
- Bigram error rate: 0.20 → 0.15/0.25; 0/3 affected. Category overlap complicates interpreting thresholds. Candidate.
- Token error rate: 0.30 → 0.25/0.35; 0/1 affected. Sparse words make fractional errors coarse. Candidate.
- Training success error rate: 0.05 → 0.03/0.07; 0/1 affected. Lowering can over-penalize one error; raising can advance weak drills. Candidate.
- Required drill successes: 3 → 2/4; 7/7 affected. Two accelerates transfer checks. Four cannot fit the three-entry training window and blocks qualification. Keep three; any future configuration must validate window compatibility.
- Grapheme transfer opportunities: 40 → 30/50; 0/1 affected. Lowering reduces evidence strength; raising delays escape. Candidate; rare-token exposure needs separate real-user study.
- Grapheme distinct natural sessions: 3 → 2/4; 2/3 affected. Lowering weakens repeated validation; raising delays mastery. Candidate.
- Ordinary waiting sessions: 5 → 3/7; 2/2 affected. Lowering adds assessment pressure; raising prolongs sparse-exposure waiting. Candidate.
- Grapheme controlled checks: 4 → 3/5; 0/1 affected. The lower neighbor is masked by the opportunity gate in these histories; more checks delay mastery. Candidate. Required counts above the bounded assessment window would need compatibility checks.
- Regression error rate: 0.15 → 0.12/0.18; 0/1 affected. Lowering risks unnecessary reactivation; raising misses deterioration. Candidate.
- Broad poor-accuracy threshold: 90 → 88/92; 1/0 affected. Lowering delays broad help; raising risks obscuring localized recommendations. Candidate.

Zero observed difference is not proof of insensitivity. These fixed histories are not threshold optimization or real-user calibration. Current constants are retained throughout.

## Validation and readiness

The accepted 589 tests plus 110 new evaluation tests passed: 699 tests in 36 files. An earlier concurrent test/evaluation run timed out in an existing 60-second stress test; its standalone rerun passed without changing that test. Typecheck, production build, evaluation command and diff whitespace checks passed. Evaluation imports do not enter production routes or the keystroke path.

Focused browser regression covered normal/adaptive Practice, explicit level starts, controlled assessment, timed/word tests, Save-independent learning, reload, learner isolation and natural regression. The existing isolated fixture injects synthetic completed results for transfer/progression probes; normal Practice and timed/word completion used actual browser typing. Regression returned the visible targeted practice action and its concentrated level-0 exercise. This is browser integration verification, not real learner evidence or physical IME testing.

The offline importer accepts only strictly validated compact summaries/aggregates with ordered sessions, opaque IDs and bounded adaptive attribution. It rejects private raw passages, typed buffers, extra fields and identifying source values. Approved public corpus identities and token values still need a study allowlist; hashing rare private words is not sufficient anonymization. Future events can derive mode/source, metrics, aggregate opportunities/errors, recommendation/action, progression and mastery transitions. Consent, retention/deletion, pseudonym management, export review and transport remain future work; no telemetry is implemented.

Recommended Slice 10: address reproducible generator coverage failures and review recommendation family competition/visibility with explicit product rules and focused goldens. Then use consented anonymized histories to calibrate timing and thresholds before building a curriculum planner. Slice 10 has not been started.

## Slice 9 file inventory

Created 20 files:

- `src/features/learning/evaluation/`: `types.ts`, `constants.ts`, `behavior.ts`, `scenarios.ts`, `runner.ts`, `import.ts`, `sensitivity.ts`, `goldens.ts`, `generator.ts`, `invariants.ts`, `reports.ts`, `analytics.ts`, `index.ts`, `evaluation.test.ts`, `calibration.test.ts`, `README.md`, `FINDINGS.md`.
- `scripts/`: `learning-evaluate.mjs`, `learning-policy-loader.mjs`, `learning-policy-loader.d.mts`.

Modified for this slice: `package.json` (evaluation command only), `.gitignore` (ignored reports), root `README.md` (evaluation documentation link). Other existing working-tree changes belong to accepted earlier slices and were preserved.
