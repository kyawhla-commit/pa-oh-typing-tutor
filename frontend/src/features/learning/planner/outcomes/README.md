# Slice 12: explicit planned activity outcomes

Outcomes are local planner/UX state. They do not diagnose weakness, measure typing, or change learning evidence. The engine, evidence extractor, recommendation/mastery/transfer thresholds, progression rules and generator coverage are unchanged.

## Lifecycle and identity

`offered` means the Practice card (or eligible optional secondary) actually presented the offer. It reserves an attempt sequence, never an exercise ordinal. Pure `planSession` calls have no writes. `started` means an intentional, freshness-validated launch through the existing service reservation path. Typing the first character is not the start of a planner attempt: launching is.

`completed` requires newly accepted qualifying fixed-text evidence, matching the bound run ID and adaptive source reference or ordinary Practice classification. Legacy direct adaptive service callers without an attached run match the exact generated source reference; the mounted UI always binds its engine UUID. The existing `complete` pipeline extracts and ingests evidence once; the planner only observes that acceptance and stores an opaque completion reference. Opening, partial input, unmount and Save do not mark completion. An accepted completed assessment with errors is still a completed activity; its actual evidence alone determines the existing qualification/failure/rollback result.

`skipped` is explicit decline of an offered attempt. `cancelled` is explicit exit of a started attempt before completion; Practice sends engine ABORT first, and the service requires an aborted run reference matching the bound run. Neither can complete, train, transfer, advance mastery, roll back a check or unlock continuation. Cancellation before the first character is supported. An aborted engine result is ineligible for ingestion.

`abandoned` is used only for a known mounted attempt removed inside the app without result or explicit cancel. Deferred mount leases distinguish real removal from StrictMode effect replay; pending legitimate completion jobs take precedence over removal/restart. A known removal aborts the engine and records planner metadata only. There is no unload/pagehide handler, telemetry or guessed close/crash/reload cause.

Offer references include deterministic plan ID/version, hashed existing canonical activity identity, hashed learner scope, action type, optional hashed weakness/category, purpose, primary/secondary slot and hashed adaptive source identity. Attempts add monotonic sequence/ID and an opaque ASCII engine run ID. Terminal rows replace run ID with an optional hashed completion reference. Raw passages, custom content, input, mistakes, metrics, email and tokens are absent. These unsalted deterministic hashes are compact pseudonymous local references, not a cryptographic anonymization guarantee.

The reducer validates and whitelists references, checks explicit transitions, freezes results and rejects mismatched/inactive attempts. Same-reference offer/effect replay and repeated start/bind/terminal events are no-ops. Terminal replay after FIFO eviction is inactive and cannot recreate a row. The service rejects a second launch of an already started ordinary attempt too. Completion is deduped by the existing learning session identity, not by a second ingestion path.

## Local sequencing

Only the latest retained terminal outcome is considered for immediate skip/cancel avoidance. If it matches the current first choice, use the strongest different, already-visible executable option in the same Slice 11 priority tier. The original completion diversity rule and policy rank remain intact. If no comparable option exists, the same activity may immediately return.

A declined controlled check additionally permits the strongest remaining visible executable action, including ordinary fallback. This one-hop exception changes local choice, not assessment eligibility. Following another outcome the check can return; it is never marked failed. Formal regression cannot be downgraded to a lower tier for variety. Repeated skipping rotates among valid comparable actions and keeps the strongest need eligible to return. There is no cumulative avoidance score or permanent blacklist. Abandonment and completion are not skip preferences.

The planner consumes only `{activityKey, outcome, sequence}` summaries. Empty outcome history produces the exact Slice 11 output. Full plan freshness includes recent outcome summaries. Stale/system-invalid offers are discarded or regenerated; supersession is not learner skip/cancel.

## Ordinals, support and reload

Start reserves one adaptive ordinal through the unchanged generator service. Restart keeps the same frozen target/selection, attempt and ordinal, with a new engine run ID. Cancel followed by a deliberately new plan/start uses the normal next ordinal. Offers, skips, rerenders and completion dedupe consume no extra ordinal.

Only accepted primary completion can unlock the optional ordinary secondary. Continue validates that matching completion, original plan and current competing needs, then starts once. Finish declines the offered secondary and ends the local flow without evidence or automatic launch. Secondary cancel likewise adds no evidence; secondary completion contributes one ordinary session through the existing ingestion. A derived plan disposition is open, primary-completed, completed, declined, cancelled, abandoned or superseded. Completing a flow is not a claim of mastery.

Reload drops unfinished intention and derives a fresh plan; no passage/selection/buffer is persisted for resume. Accepted evidence and already reserved ordinals remain. A new service reconciles a pending attempt as completed only when its exact bound run already exists in accepted profile history with matching source/context, otherwise discards intention without any fabricated terminal event. It cannot infer whether another tab still owns that intention. Cross-tab locking and session resume remain outside scope.

## Persistence and controls

The additive companion key is `typing-learning-outcomes:v1:<hashed-scope>`. It retains at most five FIFO terminal rows and one pending attempt, a safe integer sequence, version and hashed scope, capped at 4,096 UTF-8 bytes. Unknown versions, wrong scope, invalid references/order/fields and oversized or corrupt data fall back to empty state. Extra fields are dropped. Storage exceptions keep visit-local state; failed outcome writes do not invalidate successfully saved learning evidence.

The Slice 11 `typing-learning-planner:v1:<scope>` completion sidecar is unchanged and remains readable. This is a compatible companion schema, not a version replacement: no migration or erasure of valid old completion refs is required. Profile v1/mastery v2 keys/serializers remain unchanged.

Practice adds Skip activity beside Start session, Cancel activity during a planned run, and Continue planned session / Finish session after eligible completion. Notices explain unfinished versus accepted practice without blame. Skip returns focus to the refreshed Start button. New buttons have explicit types, accessible text, focus outlines and appropriate disabled states. Existing catalogue choices remain explicit alternatives; choosing one declines an offer or aborts/cancels an active plan before adopting the chosen text. Test, manual Save and lesson catalogue controls receive no planner Skip/Cancel UI.

Verification covers pure lifecycle/diversity/storage, real engine/service acceptance, StrictMode Practice integration, engineering A–J scenarios in `pnpm learning:evaluate`, and an isolated `/tests/browser/outcome-session.html` fixture. See `USABILITY.md` for the future human protocol. Engineering checks provide no human usability or learning efficacy evidence. Scheduling remains a separate decision.
