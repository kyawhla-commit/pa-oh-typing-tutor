# Typing Tutor

The five prototypes are combined into one routed React app with a shared navigation shell and a shared learner record.

## Run locally

```powershell
cd frontend
pnpm install
pnpm dev
```

Use the local address printed by Vite. Build with `pnpm build`; check TypeScript with `pnpm typecheck`.

## Supabase Auth setup

Email/password sign-up, email sign-in, Google OAuth, email confirmation, and password recovery use Supabase Auth. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from your Supabase project's API settings. Never put a service-role key in frontend environment variables.

In the Supabase dashboard, enable Email and Google providers, set the Site URL, and add your local and production app URLs to the Auth redirect allow list. For Google, add the Supabase-provided callback URL to the Google OAuth client and configure the client ID and secret in Supabase. Configure a production SMTP provider for confirmation and recovery emails.

The app redirects through `/auth/callback` and uses `/auth/reset-password` for password recovery. Supabase is optional for local development; when it is not configured, the auth pages show setup guidance and guest practice remains available.

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
- Four practice modes and timed typing tests
- Supabase-backed lesson catalog with sequential lessons that unlock after completion
- Progress charts, achievement rules, and an opt-in Supabase-backed community leaderboard
- Learner profile, shared preferences, dark mode, and the admin CMS screen

Admin permissions remain demo-only. Do not use the current admin screen for real authorization until server-side roles and row-level security policies are configured. Supabase project configuration and migration application are required before cloud sync can be verified against a live project.

## Source migration

- `src/App.tsx` routes the single app.
- `src/features` groups screens by product feature.
- `src/data/LearningContext.tsx` owns shared local caching and Supabase synchronization for learner data.
- `src/features/lessons/LessonCatalogContext.tsx` loads the shared catalog and protects admin write flows.
- `supabase/migrations/` contains the RLS-protected learner data and shared lesson catalog schema.
- `versions/` retains the five input source trees as reference material. They are not separate production entry points.
