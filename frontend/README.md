# Typing Tutor combined frontend

This folder is the single React/Vite workspace for the five Typing Tutor projects.

## Run it

```powershell
cd frontend
pnpm install
pnpm dev
```

Open the local address printed by Vite. The home page links to each version.

## Versions

- `versions/typingtutor` — Typing Tutor with profile and admin screens
- `versions/typingtutor2` — TypeMaster dashboard and practice flow
- `versions/typingtutor3` — Tutor app with sign in, achievements, and settings
- `versions/typingtutor4` — Streamlined tutor with dark mode
- `versions/typingtutor5` — Routed tutor with charts and responsive navigation

Each version keeps its own `src` tree, styles, assets, and HTML entry. Shared dependencies and build tooling live at the `frontend` root. Build all six pages with `pnpm build`.
