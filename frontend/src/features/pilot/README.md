# Slice 13 — local moderated pilot preparation

This tooling prepares a qualitative 6–8 learner pilot. **No real participants have been tested.** Engineering rehearsals are explicitly labelled in exports. Small-sample usability/content perception findings cannot establish learning effectiveness or justify threshold recalibration.

## Run locally

```sh
pnpm pilot:dev
```

Open `http://127.0.0.1:5176/tests/browser/pilot/index.html`. Both development execution and Vite mode `pilot` are required. Query flags cannot enable study mode in normal development or production. Separate static HTML entry points are excluded from the normal production build. The explicit local study mode disables Supabase client initialization even when credentials exist in environment configuration. Do not run an ordinary authenticated account provider inside the study workspace.

Facilitator controls are outside the participant iframe. The iframe reuses the existing Practice and Test components with local study providers, empty lesson catalogue and a synthetic subject scope. It has no email/name/account entry or custom text form. Prior seeded history is labelled synthetic. Context exports and an optional lifecycle observer registration are the provider/typing-adapter extensions. Measured low contrast in existing pending passage text, small typing labels/hints and correct/error text receives a narrow color-only correction in the shared Practice/Test surfaces; the core engine, scoring, policy/thresholds, generator, visibility and planner priorities are unchanged.

## Capture and privacy

Capture requires explicit participation consent, P01–P99 pseudonym and an active T01–T10 task. Default provenance is `engineering-rehearsal`; a facilitator conducting a genuine consented study deliberately selects `consented-pilot`. Consent does not prove a human actually participated; reports must independently state actual recruitment/method/participation. Separate note/quote permission and separate audio/video/screen permission are recorded. This tool implements no media recording.

The passive observer subscribes to existing run status/identity and accepted service outcome boundaries. It does not subscribe to feedback/input, insert/delete characters, ingest evidence, alter profiles or call scoring. Events are offered/start/skip/cancel/accepted completion, check start/completion, known abandonment, navigation, task start, fixture load and manual observation milestones. Unplanned starts are observed at first actual running status; planned starts follow intentional launch. Completed metrics follow accepted existing ingestion, independently of manual Test Save. StrictMode and repeat notifications are deduped. Capture failures cannot interrupt learning subscribers.

Frames send only validated compact messages to their same-origin parent. Parent checks origin, exact iframe window, current participant, task and epoch, rejects unknown envelope fields and revalidates the milestone. Old frames cannot capture after reset. No network transport or SDK collects study data. Study mode removes the existing remote font import and uses system fonts; the study pages also restrict script/font/connect destinations to local resources with a Content Security Policy. Ordinary product CSS is unchanged.

Exports include study version/provenance/pseudonym/consent, predefined task scripts and criteria, ordered relative-time events and manual observations. Metrics are mode, correct WPM, attempt accuracy, attempts, errors, corrected errors and completion reason. Source IDs/versions are opaque hashes. Exact weakness items, target/typed passages, buffers, mistakes, email, credentials, IP, absolute timestamps and localStorage dumps are excluded. Deep unknown-field rejection prevents hidden payloads in metrics. Notes are manual, max 500 characters, opt-in and require facilitator review; obvious email/IP/URL/credential strings are blocked. A text scanner cannot identify every personal name or private quotation: **facilitators must keep notes free of identifiers and passage content**.

## Local persistence and reset

Per-participant capture key: `typing-pilot:v1:participant:P01`. State is schema validated, deeply immutable, capped at 500 events, 100 observations and 256 KiB. Capacity blocks further capture rather than silently discarding study evidence; export before clearing. Relative time is nondecreasing, clamped against backward clocks and resumed from the previous relative offset after reload. Duplicate event IDs do not consume sequence/time. Corrupt saved capture is not silently overwritten: explicitly clear it after review. Failed writes preserve visit-local data and display an export-before-close message.

Study learning scopes are `user:study-v1:<pseudonym>:<epoch>`. `typing-pilot:v1:scope:<pseudonym>` registers exact ownership. Loading a task fixture uses a fresh iframe/service realm, replaces only the registered profile/mastery/completion-history/outcome keys and retains observation history. Reset learning does not clear observations. Clear participant clears its observation key and registered study learning keys; it never calls localStorage.clear(), resets normal accounts, touches guest data or changes another participant. Stop capture removes the active view without deleting saved observations. Facilitators can resume an existing participant with the same consent/provenance and export before clearing.

## Synthetic task fixtures

Seven deterministic nonidentifying fixtures cover no weakness, actionable weak r, improving L1, mixed L2, transfer check waiting, eligible controlled assessment and formal regression. They use public synthetic typing evidence and explicit seeded progression records; these are preparation states, not participant achievements. Normal validated serializers and exact capability checks apply. L0 → L1 → L2 can be explored by facilitator fixture loads during T05 without asking someone to manufacture dozens of completed sessions. Preserve those loads as `fixture-loaded` events so analysis does not mistake them for human learning improvement.

Read [protocol and consent](PROTOCOL.md), [one-page checklist](CHECKLIST.md), [copy audit](COPY_AUDIT.md), [result template](REPORT_TEMPLATE.md), and [engineering validation](SLICE13.md). `pnpm pilot:test` runs tooling tests. The existing `pnpm learning:evaluate` adds passive observer isolation comparisons without policy overrides.

## Interpretation boundary

Manually coded success/help/confusion tags/quotes are usability observations. Task failure is not a typing/mastery failure. Do not infer anxiety/confusion/emotion from metrics. Use counts and themes, not misleading tiny-sample averages, statistical significance or efficacy claims. Keep subjective copy/content changes tied to repeated observations. Scheduling, thresholds, efficacy studies, recruitment and remote analytics remain separately approved work.
