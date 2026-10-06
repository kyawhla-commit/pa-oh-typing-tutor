# Slice 11: bounded deterministic session planning

The planner sequences already-selected executable learning actions. Evidence extraction, recommendation scores, overlap consolidation, mastery/regression thresholds, progression levels, generation and engine scoring remain owned by the accepted Slice 1–10 modules.

## Architecture and compact contract

`context.ts` consumes `selectionWithMastery(...).visible`, `learningActionWithVariants` and the exact `canGenerateExercise` witness. It projects the witness to source ID/version, level, purpose, next ordinal and verified grapheme length. It does not retain passages/prepared targets. Hidden audit recommendations never become planner candidates. Visible needs remain compact identity references even when their action falls back to ordinary Practice, so unavailable competing needs still prevent an unrelated supporting activity.

`planner.ts` is pure and independent of React, browser storage, profile diagnosis and content generation. Its context contains the existing learner scope, profile/mastery version and ingestion counters, bank/generator stamps, at most eight compact options, at most eight visible need references, and the last three completed activity keys. Each option has its existing policy order, action type, canonical weakness identity, existing mastery state, executable flag and compact target. No ranking score, raw text, typed buffer, private source content or full history enters this contract.

The deeply immutable `LearningSessionPlan` has version/ID/scope/purpose, primary action, nullable supporting action, one/two estimated activities, plain explanations, evidence stamps and small diagnostic counters. Its deterministic ID covers the whitelisted plan and recent activity keys; source/ordinal references capture reservation changes. Plans are regenerated rather than persisted. Known focus identities from the existing policy remain present; this is not an anonymized export format.

## Ordering and diversity

1. Official executable regression recovery.
2. Executable controlled transfer check.
3. Active needs in the existing visible recommendation order, using the progression level the policy already requires. Targeted and contextual actions share this tier, so a weaker targeted action cannot displace a stronger need whose current stage requires context.
4. Ordinary Practice fallback.

Broad accuracy precedence is preserved by consuming only the existing visible selection. A regression hidden by that accepted override is not independently promoted. Provisional mastery and unavailable/malformed focused options cannot be selected.

After three consecutive completions with the same action type, canonical weakness and exercise purpose, select another already-authorized executable option in the same sequencing tier. Prefer a same-weakness contextual alternative if supplied; otherwise use the next existing policy-ranked option. A timed/word/unknown session breaks the consecutive run. Never downgrade regression/check/active work to ordinary practice merely for variety. If no valid alternative remains, repeat. Context levels and variant ordinals are not invented. The current production adapter offers one current level per weakness: the synthetic contextual-alternative golden verifies the compact sequencing contract; production variation remains limited to actual policy outputs.

Maximum two activities. Only a verified focused primary of at most 180 graphemes can have ordinary Practice as its optional supporting activity. No competing unrelated visible need may exist, including an unavailable need. The secondary has a different purpose and never adds another focused exercise from an overlapping cluster. The 180-unit bound is a session-size rule, not a recalibrated learning threshold.

## Completion, storage and starts

The learning service keeps a separate `typing-learning-planner:v1:<scope>` sidecar with version, ingestion order and three `{sessionId, activityKey, sourceId}` references, bounded to 4 KiB. Only newly accepted completed evidence advances it. Starts, render, restarts, aborts, duplicate Save and invalid evidence do not. Ordinary/custom source identifiers are omitted; only validated adaptive source references are retained. Private custom passages/labels/buffers never enter this sidecar.

The original profile v1 and mastery v2 serializers/keys remain intact; legacy mastery migration still belongs to the existing storage module. Missing/corrupt/oversized/out-of-sync sidecars reset conservatively at the current profile order. Blocked storage retains visit-local history. A sidecar write failure does not invalidate a successfully saved existing profile/mastery snapshot. localStorage has no cross-tab transaction; mismatched writes lose diversity history conservatively, not learning evidence.

An explicit Start session re-reads current stored evidence/mastery and recomputes the full plan before reserving any variant. Scope/evidence/action/cursor changes reject the stale plan. A focused start delegates to the existing adaptive selection/reservation path and opens its exact witness. Normal starts open existing corpus Practice. A supporting start requires a plan actually launched by this service, the matching primary's completed source/activity reference, and no new competing visible need. It is consumed once, never auto-launched or queued. Its button appears only after deferred completion ingestion confirms readiness. Ephemeral activity intentions are cleared on account/lesson changes and reload; reloading generates a fresh plan and retains completed evidence, history and ordinal cursors.

## UI and verification

Normal Practice adds one Session focus card (activity, reason, optional support, Start session). Existing recommendations, lessons, adaptive Practice, Test, Save and normal text modes remain available. An adaptive plan may offer Continue planned session only after completion; the second activity marks the intention complete. After normal completion, the Session focus card offers a fresh plan on the same screen. Restart/Practice again remain explicit existing actions. No planner work occurs in the engine or production keystroke path.

`pnpm learning:evaluate` adds the ten planner golden scenarios plus compact contexts from all 80 existing final scenario outputs. It reports plans, invalid plans, unavailable/duplicate actions avoided, exact witnesses, sequencing/secondary bounds and repeated-output determinism. Performance measures 1,000 pure compact decisions separately from existing policy/capability generation. Maximum serialized context/plan bytes describe bounded retained input/output; the observed JavaScript heap delta is transient and GC-sensitive.

Golden coverage includes regression competition, transfer versus new weakness, strongest active need, no weakness, unsupported assessment, authorized contextual variation, unavoidable repetition, unrelated competition, duplicate cluster and provisional mastery. Unit/integration coverage also verifies actual policy adapters, broad override, Unicode capability, privacy whitelists, persistence, stale starts, completed-boundary ownership and two-activity UI behavior. `/tests/browser/planner-session.html` is an isolated synthetic local verification fixture, excluded from the production build.

## Boundaries and next slice

Immediate repetition avoidance is not spaced repetition or curriculum scheduling. There are no dates, daily goals, reminders, streaks, automatic queues, behavior predictions, AI/LLM generation, telemetry or new cloud writes. The planner is English-bank limited, and exact Unicode fallback drills are not fluent Pa’O language lessons. Synthetic tests establish engineering behavior, not learning efficacy or optimal calibration. A possible Slice 12 is a separately scoped local session-plan outcome review with explicit cancellation/skip handling and real-user usability validation; scheduling requires its own approved design and evidence.

## Slice 12 extension

The accepted Slice 11 rules above remain the empty-outcome baseline. [Planner outcomes](outcomes/README.md) add explicit attempts, accepted-completion observation, neutral Skip/Cancel controls, bounded local diversity and conservative reload/navigation behavior. The compatible Slice 11 completion sidecar remains unchanged. A latest declined check may defer once to another visible executable action; neither decline nor cancellation changes eligibility or invokes assessment rollback. Engineering validation and a [future real-learner protocol](outcomes/USABILITY.md) are separate from human usability evidence.
