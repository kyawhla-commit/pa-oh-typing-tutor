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

Before enabling synced learning data, apply [`supabase/migrations/202609300001_learning_data.sql`](supabase/migrations/202609300001_learning_data.sql) to your Supabase project (for example, in the SQL Editor). It creates the profile, preferences, practice-session, and completed-lesson tables and enables row-level security so authenticated users can only access rows whose `user_id` matches their Supabase user ID. The browser uses only the publishable key; never expose a service-role key.

Signed-in profile details, practice/test history, completed lessons, and preferences sync to Supabase. Guest activity remains on the current device. On the first compatible sign-in, guest data is imported once; subsequent writes are cached per account on the device and synced to Supabase. If sync fails, the app keeps the local copy and shows a sync warning in the workspace and Settings.

## App features

- Supabase email/password and Google authentication, plus guest practice
- Dashboard and Supabase-synced practice history
- Four practice modes and timed typing tests
- Sequential lessons that unlock after completion
- Progress charts, achievement rules, and a sample community leaderboard
- Learner profile, shared preferences, dark mode, and the admin CMS screen

Admin permissions remain demo-only. Do not use the current admin screen for real authorization until server-side roles and row-level security policies are configured. Supabase project configuration and migration application are required before cloud sync can be verified against a live project.

## Source migration

- `src/App.tsx` routes the single app.
- `src/features` groups screens by product feature.
- `src/data/LearningContext.tsx` owns shared local caching and Supabase synchronization for learner data.
- `supabase/migrations/` contains the RLS-protected learning data schema.
- `versions/` retains the five input source trees as reference material. They are not separate production entry points.
