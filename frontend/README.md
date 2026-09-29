# Typing Tutor

The five prototypes are combined into one routed React app with a shared navigation shell and a shared learner record.

## Run locally

```powershell
cd frontend
pnpm install
pnpm dev
```

Use the local address printed by Vite. Build with `pnpm build`; check TypeScript with `pnpm typecheck`.

## App features

- Local demo sign in and learner registration
- Dashboard and practice history
- Four practice modes and timed typing tests
- Sequential lessons that unlock after completion
- Progress charts, achievement rules, and a sample community leaderboard
- Learner profile, shared preferences, dark mode, and the admin CMS screen

Practice results, completed lessons, profile details, and preferences persist in browser local storage. Authentication and admin permissions are demo-only; connect a backend and enforce server-side authorization before using real accounts or private data.

## Source migration

- `src/App.tsx` routes the single app.
- `src/features` groups screens by product feature.
- `src/data/LearningContext.tsx` owns the shared browser-persisted learner state.
- `versions/` retains the five input source trees as reference material. They are not separate production entry points.
