# Slice 7: local transfer and provisional mastery v1

The engine, input adapter, timing, scoring, Slice 5 evidence semantics/weights/thresholds, Slice 6 generator contracts, and Supabase schema are unchanged. This layer consumes completed learning evidence and returns deterministic progression metadata. No LLM, normative WPM scale, new engine mode, or controlled assessment is introduced.

## Attribution and identities

A completed ordinary fixed session is `ordinary-practice`; ordinary timed and word-count sessions are `timed-test` and `word-test`. Approved structured lesson/corpus/quote/custom sources qualify. Missing/unknown source metadata is `unknown` and excluded. Quote/custom grapheme and broad evidence can qualify, but their Slice 5 privacy exclusions continue to omit tokens and bigrams.

Adaptive completions carry a feature-owned frozen selection's source ID/version and focus type/items through `useSessionLearning`. Owner and attribution are captured at the run's start; completion copies attribution before deferring work. Source ID/version and fixed-text mode must match. Explicit general focus is `adaptive-general`; other valid focuses are `adaptive-targeted`. Missing/invalid metadata stays unknown, never ordinary transfer.

`wasTargeted` matches structured focus to structured weakness identity; it never examines exercise text. Grapheme/token specs can explicitly target up to two independent identities. Bigram and substitution specs match the exact ordered pair. Related but different categories do not count as same-weakness training. **Every adaptive session is excluded from transfer**, including unrelated and general adaptive material. This conservative choice avoids accidental high-density training being called natural transfer.

Identity is JSON `[kind, ...NFC-items]`, with category, case, boundaries and Unicode grapheme clusters preserved. Substitution direction and bigram order matter; `r,r` is a valid pair. Tokens use the existing whitespace-run model, including attached punctuation. Broad accuracy/speed have no items. Recommendation instance ID, generator version and bank version are not weakness identity. Items are bounded to the existing 32 UTF-16 storage limit.

## Exact policy (constants.ts)

Training windows retain the last **3 same-weakness targeted sessions**, including failures/underexposed sessions. Success:

- Grapheme: at least **12** observed opportunities, affected incidence **≤5%**.
- Directional substitution: expected grapheme at least **12** opportunities, **zero** expected→actual attempts.
- Bigram: at least **10** observed occurrences, affected incidence **≤5%**.
- Token: at least **4** exact occurrences, **zero** affected occurrences.
- Broad accuracy: at least **40** attempts, active time **≥1000ms**, attempt accuracy **≥97%**.
- Speed: the same attempt/time/accuracy gates and correct WPM **≥105%** of the personal baseline.

The specific minimums reference Slice 6's coverage constants; observed evidence still confirms actual exposure. Overall accuracy cannot substitute for focus incidence. Corrected and uncorrected mistakes both count. Grapheme/bigram/token error numerator is affected occurrences; directional substitutions count every matching incorrect attempt (possibly more than one per expected position).

One success remains ACTIVE. **2 successes in the latest 3**, latest not severe, means IMPROVING. **3 successes in the latest 3** means TRANSFER_CHECK. A nonsevere failed session can leave improvement intact. A latest severe failure blocks improvement. A transfer-check record loses that state if newer training no longer meets its threshold. Severe is category incidence **≥20%**, token incidence **≥50%**, or broad accuracy **<90%**. Underexposure cannot count as success.

Ordinary transfer retains the last **6 relevant sessions**, in ingestion order. Minimum opportunities per session: grapheme/substitution/bigram **5**, token **1**, accuracy/speed **40**. Broad observations additionally require active time **≥1000ms**. Exact promotion requirements:

- Grapheme: **40** total opportunities in **3** distinct sessions; pooled incidence **≤5%**.
- Substitution: **40** expected opportunities in **3** sessions; **zero** directional confusion attempts.
- Bigram: **30** occurrences in **3** sessions; pooled incidence **≤5%**.
- Token: **6** exact naturally reencountered occurrences in **2** sessions; **zero** affected occurrences. No related-grapheme proxy or fabricated token exposure. Rare tokens can remain waiting indefinitely.
- Accuracy: **120** attempts in **3** sessions, **every retained qualifying session ≥97%** accuracy.
- Speed: the same **120 / 3 / 97%** gates, mean ordinary correct WPM **≥105%** of the personal baseline.

All retained qualifying transfer sessions must be nonsevere. Averages cannot hide a severe small ordinary session. No training prerequisite is required for natural recovery: ordinary transfer can establish provisional mastery independently. Targeted success alone never does. Digest success counts reflect individual session success; pooled exposure/rate and mean-speed criteria determine promotion.

Personal speed baseline: the mean of the **3 prior qualifying ordinary sessions**, each at least **97%** accurate and positive correct WPM. Capture it when speed is tracked, or once later history provides it, before using the current session as transfer. Hold that baseline for the tracked weakness; do not move the goal after every session. Missing baseline means INSUFFICIENT_EVIDENCE. Stable accurate pace is not a gain; faster inaccurate pace is not success. Old profiles may supply a baseline from retained ordinary history, never invented mastery/training.

## Reversibility and hysteresis

States: INSUFFICIENT_EVIDENCE (speed baseline unavailable), ACTIVE (detected difficulty), IMPROVING, TRANSFER_CHECK, PROVISIONAL_MASTERY, REGRESSED. Provisional mastery is a persisted reversible latch: sparse exposure or one new mistake cannot revoke it.

Regression from PROVISIONAL_MASTERY or TRANSFER_CHECK uses only ordinary observations **after entry to that state**:

- Sustained: **3** qualifying sessions and the category's promotion exposure minimum. Specific pooled incidence **≥15%**; tokens also require **≥2** affected occurrences. Broad accuracy requires **3 sessions <90%**. Speed alternatively regresses when all three remain ≥97% accurate but their mean pace falls **below 90% of the original personal baseline**.
- Faster severe recurrence: **2** severe qualifying ordinary sessions. Grapheme/substitution/bigram require at least **10** total opportunities and **4** errors/attempts in those severe sessions. Tokens require **4** occurrences and **2** affected occurrences. Broad categories require two poor sessions (<90%).
- Never reactivate on a single session, even a severe one. Severe recurrence need not be an uninterrupted streak; it must fit the retained ordinary window.

Promotion ≤5% and regression ≥15%, distinct sessions, state-entry boundaries and a fresh epoch after regression prevent minor-error oscillation. Regression clears the current training/transfer windows and requires new evidence for recovery; lifetime profile evidence remains intact. Mild ordinary mistakes below regression thresholds do not remove provisional mastery. Bad targeted drills do not revoke mastery; regression is ordinary-only.

Levels are bounded metadata: **0** concentrated / continue or reactivate, **1** contextual / increase variety, **2** encourage ordinary validation or reduce priority. Generator input/text/densities/coverage remain unchanged. Actual contextual variety and transfer-oriented exercise generation are deferred to Slice 8. The pure decision includes state, reason code, level, action and evidence digests; it never navigates or starts a session.

## Recommendation and UI integration

The overlay keeps original Slice 5 candidates and their scores. A provisional identity is suppressed. Tracked ACTIVE/IMPROVING/TRANSFER_CHECK/REGRESSED records can remain eligible even when mixed ordinary/adaptive Slice 5 recent evidence drops the base candidate. Retained candidates reconstruct the same Slice 5 rate/error/remaining/category score, selected-exposure tie and scalar ID tie. Maximum remains **3**; broad accuracy still overrides with a sole card. Unrelated identities retain base behavior. If all suggestions are suppressed, use general practice, not the suppressed focus again.

Transfer-check cards keep their focus label, show an ordinary-practice message, and offer no targeted start. After sufficient adaptive completions, the completion action changes to “Continue in normal Practice.” Improving and regressed cards remain actionable. Provisional records display “Currently strong,” never permanent mastery. Profile recomputation cannot replace a running exercise. Selection metadata stays outside the engine. `recommendPractice` and its constants are unchanged; a small display-text fallback handles retained identities whose aggregate rows have been pruned.

## Persistence, compatibility, ordering and bounds

Base local profile schema remains **v1**. Companion key is `typing-learning-mastery:v1:<encoded learner scope>`; it uses the same auth/local-email/guest-device identity without guest→account import. No adaptive data is sent to Supabase.

Stored: stable identities, state, current evidence epoch, state-entry/last-observation order, captured personal baseline, three training observations, six transfer observations, three ordinary baseline observations and up to **256** processed IDs. Observations contain scalar opportunities/errors/accuracy/correctWPM/active time/context/order. Derived: rates, successes, digests, levels, actions and candidate scores. State-entry boundaries and the reversible latch persist because the base eight-session history cannot reconstruct them indefinitely. No exercise text, typed buffer, raw event stream, mistake examples, display labels or generated context strings are stored.

Maximum **64** tracked identities, **256KiB UTF-8** companion JSON. Pruning prefers actionable records, then most recently observed records, with Unicode scalar identity ties; output is canonical identity order. Older provisionally strong records can be evicted at the cap and must gather fresh evidence if rediscovered. This is bounded current mastery, not an unlimited lifetime mastery archive.

Parsing whitelists/rebuilds fields, validates versions/numbers/states/identities/context/window bounds/order/unique IDs, strips unknown fields, and fails safely on malformed or blocked storage. Companion order must exactly match base session count, and its processed-ID tail must agree with the base completion tail. Deferred writes save base then companion; localStorage does not offer a two-key transaction. Missing, ahead or behind companion data resets mastery conservatively, leaving base history intact. Blocked writes retain both profiles for the current visit. Cross-tab race resolution and crash-atomic storage remain infrastructure work.

Old Slice 5 profiles remain readable; there is no silent migration and no retroactive inference that old adaptive sessions were transfer. Qualifying old ordinary history can seed the personal speed baseline only. New completions discover initial tracked weaknesses from the unchanged base policy.

Successful ingestion count defines order; timestamps are display metadata only. Duplicate accepted IDs do not increment order. Multiple identities share an observation order, sorted by Unicode scalar keys on ties. Existing dedupe horizon remains **256 IDs**: replays older than that horizon are not globally deduplicated. Session ownership/metadata capture plus pending-job and persisted-ID checks protect StrictMode and remounts within this bound.

## Validation and future work

Run `pnpm test`, `pnpm typecheck`, `pnpm build`, `git diff --check`; no lint script is configured. Tests cover classification, Unicode/directions, exact category boundaries, focus errors/corrections, training windows, ordinary transfer, broad personal progression, regression hysteresis, overlay ordering/suppression/reactivation, corruption/privacy/scopes/reload/dedupe, a real adapter/StrictMode loop, and 1000-session history bounds/determinism.

`tests/browser/mastery-session.html` is an isolated local fixture with cloud settings disabled. It uses actual Practice/Test surfaces and keyboard input for drills; controls explicitly label injected synthetic completed ordinary results. Synthetic evidence demonstrates state/UI integration, not human learning outcomes or physical IME behavior.

Slice 8: connect level metadata to deliberate contextual variation while preserving generator coverage; design an explicitly labeled controlled transfer assessment for rarely reencountered tokens. Do not treat such an assessment as fully natural transfer. Do not start it automatically.

## Slice 7 file manifest and completed validation

Created (21 files):

- [README.md](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/README.md)
- [classify.test.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/classify.test.ts)
- [classify.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/classify.ts)
- [constants.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/constants.ts)
- [evidence.test.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/evidence.test.ts)
- [evidence.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/evidence.ts)
- [index.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/index.ts)
- [mastery.test.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/mastery.test.ts)
- [mastery.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/mastery.ts)
- [progression.test.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/progression.test.ts)
- [progression.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/progression.ts)
- [recommendations.test.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/recommendations.test.ts)
- [recommendations.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/recommendations.ts)
- [storage.test.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/storage.test.ts)
- [storage.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/storage.ts)
- [stress.test.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/stress.test.ts)
- [testFixtures.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/testFixtures.ts)
- [testLoop.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/testLoop.ts)
- [types.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/transfer/types.ts)
- [mastery-session.html](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/tests/browser/mastery-session.html)
- [mastery-session.tsx](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/tests/browser/mastery-session.tsx)

Modified from the accepted Slice 6 snapshot (9 files):

- [README.md](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/README.md)
- [src/features/practice/Practice.tsx](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/practice/Practice.tsx)
- [src/features/learning/Recommendations.tsx](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/Recommendations.tsx)
- [src/features/learning/recommendations.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/recommendations.ts)
- [src/features/learning/service.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/service.ts)
- [src/features/learning/useLearningProfile.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/useLearningProfile.ts)
- [src/features/learning/service.test.ts](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/service.test.ts)
- [src/features/learning/integration.test.tsx](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/integration.test.tsx)
- [src/features/learning/exercises/integration.test.tsx](/home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend/src/features/learning/exercises/integration.test.tsx)

Final validation: **486 tests passed in 26 files** (375 accepted tests plus 111 added); typecheck passed; production build passed; `git diff --check` passed. New-file whitespace was also checked separately because the accepted learning folders remain untracked in the shared working tree. No lint script exists.

Isolated stress observation: two deterministic 1,007-session runs in **610.8ms**, including mild ordinary error noise; final companion **6,318 UTF-8 bytes**. Fixed record/window/dedupe bounds and equal outputs were asserted. This is local test timing, not a production device guarantee.

Browser verification: three real keyboard-driven adaptive completions (ACTIVE → IMPROVING → TRANSFER_CHECK), seeded synthetic ordinary results from each mode (→ PROVISIONAL_MASTERY), one severe-session protection and two severe ordinary results (→ REGRESSED), reload, separate local learner B, real normal Practice, real 15-second Test expiry, real 10-word completion, manual Save without extra learning ingestion, and paste rejection. Browser console had no warnings/errors. StrictMode attribution/reload dedupe and learner ownership are integration-tested. No physical IME validation is claimed. Fixture tab was closed and its dev server stopped after validation.

## Slice 8 composition and controlled transfer

The [progression extension](../progression/README.md) adds verified Level 0/1/2 composition, deterministic ordinal variants, explicit controlled transfer checks after ordinary waiting, pure learning actions, and validated companion v2 persistence with v1 migration. Slice 5 scoring, Slice 6 baseline coverage and Slice 7 natural transfer/regression policy remain unchanged. All adaptive content stays excluded from ordinary transfer. Representative material is saved in the extension’s EXAMPLES.md. Earlier v1 companion documentation above describes the accepted Slice 7 baseline; Slice 8 writes the v2 key.
