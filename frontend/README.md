# Typing Tutor

The five prototypes are combined into one routed React app with a shared navigation shell and a shared learner record.

## Run locally

```powershell
cd frontend
pnpm install
pnpm dev
```

Use the local address printed by Vite. Build with `pnpm build`; check TypeScript with `pnpm typecheck`.

Run engine and browser-adapter/session tests with `pnpm test`. They use Vitest 4
in Node; the Test route integration suite uses jsdom under StrictMode, without a database. Practice and Test use the shared fixed/timed/word-count engine. See the [engine contract](src/engine/typing/README.md) and
[Practice integration and browser checks](src/features/typing/README.md), plus
[Test integration](src/features/tests/README.md). Completed sessions also feed a
local, learner-scoped deterministic recommendation policy; see the
[learning policy and thresholds](src/features/learning/README.md). Adaptive
evidence is independent of Test's manual Save button and is not synced to Supabase.
**Practice this** starts a frozen, coverage-verified deterministic exercise using
curated material or a labelled Unicode drill. See the
[adaptive exercise contract and examples](src/features/learning/exercises/README.md).

## Supabase Auth setup

Email/password sign-up, email sign-in, Google OAuth, email confirmation, and password recovery use Supabase Auth. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from your Supabase project's API settings. Never put a service-role key in frontend environment variables.

In the Supabase dashboard, enable Email and Google providers, set the Site URL, and add your local and production app URLs to the Auth redirect allow list. For Google, add the Supabase-provided callback URL to the Google OAuth client and configure the client ID and secret in Supabase. Configure a production SMTP provider for confirmation and recovery emails.

The app redirects through `/auth/callback` and uses `/auth/reset-password` for password recovery. Supabase is optional for local development; when it is not configured, the auth pages show setup guidance and guest practice remains available.

### Demo password accounts

Set `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`, `DEMO_ADMIN_EMAIL`, and `DEMO_ADMIN_PASSWORD` in your ignored `.env` using dedicated Supabase test accounts. Restart `pnpm dev`; the login page shows **Demo user login** and **Demo admin login** buttons that fill the credentials and sign in through Supabase. Password sign-in sends regular users to the dashboard and accounts with trusted `app_metadata.role = admin` to the admin workspace. The buttons do not assign roles.

Vite injects these unprefixed variables only for the development server. They are omitted from every build and from pilot mode. The private `DEMO_ACCOUNTS.local.md` file contains the provisioned credentials. Demo actions save real cloud data, and the admin can edit the shared lesson catalog. Keep these credentials private and retire the accounts after testing.

### Supabase CLI setup

Run these commands from `frontend`. CLI login authenticates your Supabase account separately from the frontend publishable key; keep the access token and database password out of frontend environment files.

```sh
pnpm dlx supabase@2.119.0 login --agent no --output-format text
pnpm dlx supabase@2.119.0 projects list
pnpm dlx supabase@2.119.0 link --project-ref <your-project-ref>
pnpm dlx supabase@2.119.0 migration list
pnpm dlx supabase@2.119.0 db push --dry-run
pnpm dlx supabase@2.119.0 db push
pnpm dlx supabase@2.119.0 config diff
pnpm dlx supabase@2.119.0 config push --agent no --output-format text
```

Check the linked project and pending migrations before pushing. The sparse `supabase/config.toml` enables email sign-up and declares the development Site URL and redirect URLs. Before a config push, merge any existing hosted redirect URLs into `additional_redirect_urls` so production callbacks remain allowed. Add the actual Vite port if it differs from 5173. Google OAuth credentials and production SMTP settings require separate provider configuration; they are not supplied by the frontend keys.

### Supabase learning data

Before enabling synced learning data, apply the migrations in order through the Supabase SQL Editor or Supabase CLI:

1. [`202609300001_learning_data.sql`](supabase/migrations/202609300001_learning_data.sql) creates the profile, preferences, practice-session, and completed-lesson tables. Row-level security restricts each learner to rows whose `user_id` matches their Supabase user ID.
2. [`202609300002_shared_lesson_catalog.sql`](supabase/migrations/202609300002_shared_lesson_catalog.sql) creates the shared lesson catalog, seeds the original lessons, and adds reader/admin policies. Learners can read published lessons; only users with the server-managed `app_metadata.role = admin` claim can manage drafts and publish content. The migration also links completion records to stable lesson IDs and prevents deleting lessons with completion history.
3. [`202609300003_opt_in_leaderboard.sql`](supabase/migrations/202609300003_opt_in_leaderboard.sql) creates private learner-controlled leaderboard profiles and a public RPC that returns only opt-in display names and aggregate typing-test scores. It never exposes emails, auth user IDs, or individual session records.

Provision administrator claims only through a trusted server-side Supabase Admin API workflow. Never set the admin role from browser-editable `user_metadata`, and never expose a service-role key in the frontend. The browser uses only the publishable key.

Signed-in profile details, practice/test history, completed lessons, preferences, and the shared lesson catalog sync to Supabase. Guest learning activity remains on the current device. On the first compatible sign-in, guest learning data is imported once; subsequent writes are cached per account on the device and synced to Supabase. If sync fails, the app keeps the local copy and shows a sync warning in the workspace and Settings. Pre-existing browser-only lesson edits are not imported automatically; the Supabase migration seeds the original eight lessons, and local edits remain in that browser’s local storage as a backup.

### Keep a Free Supabase project active

The GitHub Actions workflow at [`../.github/workflows/supabase-keepalive.yml`](../.github/workflows/supabase-keepalive.yml) makes a read-only request to the published lesson catalog every 8 hours (three times per day). Supabase says a few database requests per day typically help prevent a Free project from pausing due to inactivity. This is best effort and does not automatically resume a project that is already paused.

Before enabling the workflow, apply the migrations above so `public.lesson_catalog` and its published-lesson reader policy exist. In the GitHub repository, go to **Settings → Secrets and variables → Actions → New repository secret** and add:

- `SUPABASE_URL`: the value of `VITE_SUPABASE_URL` from the frontend environment.
- `SUPABASE_PUBLISHABLE_KEY`: the value of `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`.

Never use the service-role key for this workflow. Commit and push the workflow to the repository's default branch, then open **Actions → Keep Supabase project active → Run workflow** to check that it returns HTTP 200. If the project has already paused, resume it in the Supabase dashboard first.

## App features

- Supabase email/password and Google authentication, plus guest practice
- Dashboard and Supabase-synced practice history
- Four practice modes, timed typing tests, and word-count tests
- Explainable next-practice recommendations from bounded local typing evidence
- Supabase-backed lesson catalog with sequential lessons that unlock after completion
- Finished attempts with mistake review, focused word/code-line drills, and lesson retries; lessons pass at 95% attempt accuracy with no speed requirement
- Progress charts, achievement rules, and an opt-in Supabase-backed community leaderboard
- Learner profile, shared preferences, dark mode, and the admin CMS screen

When Supabase is configured, shared lesson edits require a trusted administrator role and are enforced by the catalog's RLS policies. Without Supabase, catalog edits remain local demo functionality. Apply the migrations and configure the project before using cloud sync.

## Source migration

- `src/App.tsx` routes the single app.
- `src/features` groups screens by product feature.
- `src/data/LearningContext.tsx` owns shared local caching and Supabase synchronization for learner data.
- `src/features/lessons/LessonCatalogContext.tsx` loads the shared catalog and protects admin write flows.
- `supabase/migrations/` contains the RLS-protected learner data and shared lesson catalog schema.
- `versions/` retains the five input source trees as reference material. They are not separate production entry points.

### Slice 7: ordinary transfer and reversible mastery

Completed sessions now feed a separate learner-scoped, validated mastery companion. Targeted drills show training response; only ordinary Practice/timed/word sessions establish transfer. The pure policy, exact thresholds, bounded histories, local persistence compatibility, recommendation overlay and deferred Slice 8 work are documented in [transfer/README.md](src/features/learning/transfer/README.md). Engine scoring, Slice 5 thresholds/weighting and Slice 6 coverage contracts remain unchanged.

An isolated cloud-disabled browser fixture is available at `/tests/browser/mastery-session.html` during local development. Its transfer/regression controls explicitly inject synthetic completed results; they do not represent human ordinary typing.

## Slice 8 composition and controlled transfer

The [progression extension](src/features/learning/progression/README.md) adds verified Level 0/1/2 composition, deterministic ordinal variants, explicit controlled transfer checks after ordinary waiting, pure learning actions, and validated companion v2 persistence with v1 migration. Slice 5 scoring, Slice 6 baseline coverage and Slice 7 natural transfer/regression policy remain unchanged. All adaptive content stays excluded from ordinary transfer. Representative material is saved in the extension’s EXAMPLES.md. Earlier v1 companion documentation above describes the accepted Slice 7 baseline; Slice 8 writes the v2 key.

### Offline learning evaluation (Slice 9)

Run `pnpm learning:evaluate` to replay deterministic learner histories through the production learning loop, evaluate neighboring thresholds in isolated module graphs, and generate the full content variation matrix. Ignored JSON/Markdown reports and separate performance measurements are written under `.learning-evaluation/`. See [the evaluator documentation](src/features/learning/evaluation/README.md) for scenarios, invariants, privacy boundaries, interpretation and the proposed future analytics schema. This tooling adds no production UI, planner or telemetry.

### Slice 10: generator robustness and recommendation visibility

Exact preflight witnesses make focused actions executable before they are offered. The deterministic assembler repairs the accepted e→i/a dead ends with unchanged numeric coverage contracts; unsupported controlled contexts lead to ordinary Practice. A separate selection step consolidates related evidence, preserves formal regression and recent severe needs, and retains the maximum of three cards and broad accuracy precedence. No curriculum planner or scoring change is added. See [the Slice 10 implementation and validation report](src/features/learning/evaluation/SLICE10.md); accepted Slice 9 findings remain intact.

### Slice 11: bounded session focus

Practice now offers a deterministic Session focus from existing executable policy actions, with at most one short supporting activity. Three completed activity references provide immediate repetition avoidance; evidence, recommendation ranking, generation, progression and scoring remain unchanged. Plans contain compact references, never passages or typed buffers. See [the planner contract and boundaries](src/features/learning/planner/README.md) and [the Slice 11 validation report](src/features/learning/evaluation/SLICE11.md). Curriculum scheduling remains separate.

### Slice 12 — planned activity outcomes

Practice now distinguishes offered, started, completed, skipped, cancelled and known in-app abandonment. Skip/Cancel are local planner state; only the existing accepted completion pipeline contributes learning evidence. A five-outcome, 4 KiB companion sidecar provides bounded immediate diversity without changing mastery or assessment failure rules. Restart preserves the frozen target; a new plan after Cancel uses the normal next ordinal. Reload derives a fresh plan without pretending an unfinished run completed.

See [outcome semantics](src/features/learning/planner/outcomes/README.md), [future human usability protocol](src/features/learning/planner/outcomes/USABILITY.md), and [Slice 12 validation](src/features/learning/evaluation/SLICE12.md). `pnpm learning:evaluate` includes planner outcome scenarios and performance. Human usability has not yet been studied. There is no telemetry, scheduling, automatic queue or cloud outcome synchronization.

### Slice 13 — local moderated pilot preparation

Run `pnpm pilot:dev` and open `http://127.0.0.1:5176/tests/browser/pilot/index.html` for a consent-gated local facilitator workspace. Participant views reuse Practice/Test with isolated synthetic learning scopes; capture stores compact milestones and manual observations, with explicit local JSON export. Normal production builds exclude the study entry points. No real learners have been tested and no feedback is fabricated.

Read [the pilot architecture](src/features/pilot/README.md), [consent and ten-task protocol](src/features/pilot/PROTOCOL.md), [facilitator checklist](src/features/pilot/CHECKLIST.md), [copy audit](src/features/pilot/COPY_AUDIT.md), [unfilled findings template](src/features/pilot/REPORT_TEMPLATE.md), and [engineering validation](src/features/pilot/SLICE13.md). `pnpm pilot:test` verifies capture/privacy/isolation/reset; the development evaluator checks identical learning outputs with passive capture off/on. Conduct a genuine consented 6–8 learner usability pilot next; learning efficacy, threshold calibration and scheduling remain separate work.
