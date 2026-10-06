# Slice 12 validation report

Engineering validation of deterministic planned activity outcomes. Human participants: **0**. This report compares source against the accepted Slice 11 snapshot, not Git HEAD (the working tree already contains accepted Slices 1–11).

1. **Status: GO.** Slice 12 is implemented and all required validation passes. No Slice 13 work began.
2. **Created files:** `planner/outcomes/` contains `types.ts`, `identity.ts`, `validation.ts`, `lifecycle.ts`, `storage.ts`, `index.ts`, `analytics.ts`, `usePlannerOutcomes.ts`, `testFixtures.ts`, `lifecycle.test.ts`, `diversity.test.ts`, `storage.test.ts`, `service.test.ts`, `Practice.integration.test.tsx`, `README.md`, `USABILITY.md`. Also `evaluation/outcomes.ts`, this `evaluation/SLICE12.md`, and `tests/browser/outcome-session.{tsx,html}`. Learning paths are under `src/features/learning/`.
3. **Modified files:** `src/features/learning/service.ts`; planner `types.ts`, `constraints.ts`, `context.ts`, `diversity.ts`, `planner.ts`, `SessionPlanCard.tsx`, `README.md`; `src/features/practice/Practice.tsx`; `src/features/learning/evaluation/index.ts`; `scripts/learning-evaluate.mjs`; root `README.md`. Existing engine/scoring, typing adapter, evidence, policy, progression, transfer, selection and exercise generation sources are unchanged from accepted Slice 11. Package/lockfile changes already present before Slice 12 are not attributed to this slice.
4. **Lifecycle:** explicit offered → started → completed/cancelled/abandoned, or offered → skipped. System supersession clears an offer without a user terminal event. Invalid transitions are no-ops.
5. **Offered:** a displayed primary/eligible secondary offer allocates an immutable attempt sequence. Pure planning reserves nothing; offer reserves no exercise ordinal and creates no learning evidence.
6. **Started:** deliberate freshness-validated launch, followed by the existing adaptive reservation if required. One active attempt. Intentional restart binds a new engine UUID to the same attempt.
7. **Completed:** newly accepted existing fixed-text completion, matching the bound run and source/context (legacy direct adaptive callers without a binding match the exact generated source); exactly one existing evidence ingestion. A compact opaque completion reference is recorded after acceptance. Opening, partial typing, Save and unmount are not completion.
8. **Skip:** explicit decline before start. No evidence, weakness severity, mastery, failure or cursor change. Only bounded local choice can change.
9. **Cancel:** explicit exit of a started unfinished activity. Engine ABORT comes first; service requires matching aborted run reference. No completion, training/transfer evidence, rollback or continuation unlock.
10. **Abandonment:** deterministic mounted in-app removal only, via deferred lease ownership. StrictMode replay and pending accepted completion are protected. No unload handler or inferred close/crash/reload reason.
11. **Identity:** deterministic plan/version, hashed canonical action key, hashed learner scope, monotonic attempt sequence/ID, action/category/purpose/slot, optional hashed weakness/source/completion references. No raw content, input, mistakes, metrics, email or credentials. Hashes are local pseudonymous references, not cryptographic anonymity.
12. **Idempotency:** stable attempt IDs and transition validation; repeated offer/start/bind/skip/cancel/complete no-op. Evicted old terminal replay cannot recreate history. Existing evidence dedupe remains authoritative.
13. **Skip diversity:** latest skip/cancel matching the first choice selects the strongest different authorized same-tier action. No alternative permits immediate reoffer. The original completion-diversity rule remains intact.
14. **Repeated skip:** latest-outcome rotation, five-row FIFO memory; no cumulative avoidance/blacklist. Comparable alternatives rotate and the strongest need returns. Regression cannot be downgraded merely for variety.
15. **Transfer-check skip:** no assessment evidence, failure or rollback. A one-hop deferral permits another visible executable action, including ordinary fallback. Check eligibility is unchanged and can return after another outcome.
16. **Controlled-assessment cancel:** aborted result cannot enter evidence. Transfer state/check counts are unchanged. Cancel is not failed assessment.
17. **Completed assessment failure:** actual accepted corrected-error evidence still invokes existing mild/severe rollback. Completed good checks retain existing controlled qualification; repeated good checks reach existing provisional mastery.
18. **Ordinals:** Start reserves one. Restart freezes target/selection/ordinal. After Cancel, a deliberately new plan/start uses the already advanced cursor. Offers/skips/render do not consume ordinals.
19. **Secondary:** accepted matching primary alone unlocks Continue. Finish declines the offered secondary and ends flow without evidence. Cancel adds no secondary evidence; Complete adds one ordinary session. No third activity or automatic queue.
20. **Reload:** discard unfinished intention, derive fresh plan, preserve accepted learning and cursors. No raw resume. Reconcile only a pending bound run already accepted in profile history; otherwise clear intention without fabricated terminal outcome.
21. **Persistence:** additive `typing-learning-outcomes:v1:<hashed-scope>` companion. Slice 11 completion sidecar stays v1/readable/unmodified; no replacement-schema migration is needed. Unknown/corrupt/foreign/oversized data resets safely; fields are whitelisted and ordering validated. Blocked writes retain visit-local state independently of learning persistence.
22. **Bounds:** five terminal rows + one pending attempt; safe monotonic sequence; 4,096 UTF-8 byte cap; FIFO eviction. No unlimited outcome/session log.
23. **Integration:** planner consumes only compact `{activityKey,outcome,sequence}` summaries for local sequencing and freshness. Empty history retains exact Slice 11 outputs. Outcomes do not alter recommendations, mastery, regression, transfer or metrics.
24. **UI:** Start/Skip on the planner offer, Cancel during planned typing, Continue/Finish after accepted eligible primary. Neutral status notices; existing catalogue choices remain available. No planner controls added to Test or lesson catalogues.
25. **Accessibility:** engineering browser checks inspect named buttons, keyboard reachability/focus outline, focus after Skip/Start, Enter behavior, StrictMode single controls, and mobile width. State gates prevent continuation before acceptance. These are basic interaction checks, not a full WCAG audit or actual screen-reader/physical IME testing.
26. **Engineering scenarios:** A complete/finish, B skip, C partial cancel, D check skip, E check cancel, F completed failing check, G support decline, H stale rejection, I offered reload, J partial-start reload; additional successful check, secondary completion and known navigation. Real engine results feed acceptance where completion is exercised.
27. **Human protocol:** [USABILITY.md](../planner/outcomes/USABILITY.md) proposes a moderated 6–8 learner pilot with consent, varied experience/language familiarity, think-aloud tasks, manual task/confusion/wrong-click/time/comment notes, optional separate recording consent and short agreed retention. No study was conducted.
28. **Future privacy schema:** `analytics.ts` defines optional consented pseudonym, sequence, action type, category, outcome, alternative flag and purpose. No exact weakness content, raw text/input, email/source/IP/tokens. Type/documentation only; no sink, SDK or network call.
29. **New invariants:** skip/cancel/abandon/supersession never become completed learning failure; no false evidence/rollback; completed bad check still rolls back; secondary gated/decline neutral; stable dedupe; reload neutral; learner isolation; metrics and Save independent; bounded history and deterministic next plan. Fifteen named invariant groups are exercised by the evaluator.
30. **Evaluation:** 16 engineering scenarios; 15 terminal outcomes (5 skipped, 4 cancelled, 5 completed, 1 abandoned); 10 duplicate replays rejected; 2 alternate selections; 0 invalid plans; 15 invariant groups / 80 checks / 0 violations. Existing 80 scenarios, 90 planner plans, 30 invariant groups / 9,378 checks, generator matrix and stress remain passing. All 15 pre-existing Slice 11 report fields are structurally identical to the baseline.
31. **False skip/cancel evidence: 0.** Noncompletion checks also cover known navigation abandonment and secondary decline.
32. **False skip/cancel mastery rollback: 0.** Legitimate completed failing assessments still roll back.
33. **Added tests:** 91 across five new files: 14 lifecycle, 22 diversity, 18 storage, 28 service, 9 StrictMode Practice integration. Covers targeted/contextual/check/ordinary, primary/support, good/bad actual assessments, ordinals, deferred completion/restart/removal, reload, stale external state, old companion compatibility, corruption, privacy, bounded state, learner isolation and blocked writes.
34. **Total tests: 988 passed in 49 files.** All 897 accepted tests + 91 new tests. Full run: 354.02 seconds.
35. **Typecheck: PASS**, `pnpm typecheck`, exit 0, including the final source/fixture state.
36. **Build: PASS**, `pnpm build`, exit 0, 1.91 seconds.
37. **Diff: PASS**, `git diff --check`, exit 0. An additional scan of all new/modified Slice 12 files found zero trailing-whitespace violations, including untracked files.
38. **Evaluation command: PASS**, `pnpm learning:evaluate`, exit 0, 439.578 seconds. All existing 10 goldens and 10 planner goldens pass, 90 plans have no invalidity/determinism differences, generator 1,472/1,568 succeeds with 96 expected unsupported cases and zero supported failures, stress 256/256 passes. No lint script is configured.
39. **Browser: 41 assertions passed, zero runtime errors**, covering all 18 requested flows plus focus, neutral explanations, no third activity, known in-app abandonment and 390 px mobile reachability/no horizontal overflow. Mobile screenshot visually inspected. Isolated local Chromium contexts with cloud configuration disabled. Controlled failure uses a labelled synthetic fixture to complete the exact generated current check at the service acceptance boundary; it is not human typing evidence. No physical IME/live-cloud/human study claim.
40. **Performance:** 1,000 outcome recordings in **35.545 ms** (0.035545 ms each); 1,000 planner decisions with outcome history in **216.316 ms** (0.216316 ms each); maximal valid companion state **3,263 bytes** with five terminal rows + one bound started attempt, below the 4,096-byte cap. Pure 1,000 terminal recordings include offer/start setup; 1,000 compact planner decisions include recent outcomes, separate from capability generation and typing. Serialization is measured at maximum valid field/sequence sizes with five completed rows and one started bound run.
41. **Limitations:** no session resume, browser-close/crash attribution, cross-tab locking, outcome cloud synchronization, physical IME or full screen-reader audit. Storage failure is visit-local; finite dedupe/history can evict old references. Current adaptive bank remains English-limited; neutral Unicode drills are not fluent Pa’O lessons. Engineering checks do not prove human understanding or learning efficacy.
42. **Scheduling:** remains separate. No dates, spaced repetition, reminders, streaks, daily/weekly goals, automatic queues, push, badges, telemetry, AI/LLM or cloud outcome writes.
43. **Recommended Slice 13:** run the consented real-learner pilot, then make narrowly scoped wording/focus/navigation fixes supported by observed findings. Keep policy calibration and scheduling as separate approved work. Slice 13 has not started.

## Recorded command and browser results

Local machine timing is a single engineering observation, not a performance guarantee. Required command logs and generated reports are in the ignored `.learning-evaluation/` directory. The developer-server/browser contexts started for verification have been closed.


```text
pnpm test --maxWorkers=1   PASS: 988 tests / 49 files
pnpm typecheck            PASS
pnpm build                PASS
git diff --check          PASS
pnpm learning:evaluate    PASS
lint                      Not configured
```

Browser assertions actually executed:

- 1 targeted Start/Complete accepted exactly once
- primary completion reveals optional secondary
- 7 secondary decline adds no evidence
- Finish returns explicit fresh offer
- 2 targeted Skip has no evidence or cursor completion
- Skip returns keyboard focus to Start
- 3 partial targeted Cancel has no completion
- Cancel explanation is neutral
- check seed offers executable controlled assessment
- 4 skipped mastery check retains transfer state
- skipped check offers another executable action with normal Practice still available
- declined check remains eligible to return
- check seed offers executable controlled assessment
- 5 cancelled mastery check no assessment or rollback
- check seed offers executable controlled assessment
- 6 seeded completed failing check uses existing rollback
- 8 secondary ordinary completion ingests once
- secondary does not unlock a third activity
- 9 offered reload no invented outcome
- 10 partial reload no completion or guessed abandonment
- 11 stale offer rejected without user outcome
- refreshed stale plan starts
- 12 unplanned ordinary Practice unchanged
- 13 direct adaptive Practice opens
- direct adaptive completion is ordinary evidence boundary without planned completion
- 14 timed Test completes independently of planner
- 16 timed Save changes saved result only
- 15 word Test unchanged
- word Save remains independent
- 17 learner B isolated
- learner A retains its bounded outcomes
- 18 keyboard reaches labelled Skip
- visible keyboard focus
- Enter on Skip declines only
- Enter on focused Start opens typing input
- Enter while typing does not activate another control
- no duplicate StrictMode controls
- known route exit records planner-only abandonment
- mobile layout has no horizontal overflow
- mobile Start and Skip accessible
- no browser runtime errors

Reports: [evaluation JSON](../../../../.learning-evaluation/evaluation-report.json), [evaluation Markdown](../../../../.learning-evaluation/evaluation-report.md), [performance](../../../../.learning-evaluation/performance.json), [browser assertions](../../../../.learning-evaluation/slice12-browser-validation.json), [mobile screenshot](../../../../.learning-evaluation/slice12-browser-mobile.png), [source integrity](../../../../.learning-evaluation/slice12-source-integrity.json), [Slice 11 report compatibility](../../../../.learning-evaluation/slice12-report-compatibility.json). Generated artifacts are local and ignored by Git.
