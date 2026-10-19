# Deploy to Cloudflare Workers

Cloudflare serves the static Vite frontend, including the lesson catalog.
No database, account sign-in, or Supabase environment variables are required.

## Lessons

Edit `src/features/lessons/bundledLessons.ts` to update lesson titles, order, or
text. It contains the 9 published lessons exported from the existing Supabase
catalog. All visitors receive the same bundled lessons. Changes require a
rebuild and deployment. Do not put private drafts in this public source file.
The existing database is untouched; `/admin` is no longer a route in the app.

## Prepare locally

Run from `frontend/` using Node 22.12+ and pnpm:

```sh
pnpm install --frozen-lockfile
pnpm build:deploy
pnpm preview:cloudflare
```

Preview runs locally. Open the URL printed by Wrangler. SPA routing supports
direct visits and refreshes on `/practice`.

## Publish when ready

```sh
pnpm exec wrangler login
pnpm deploy
```

This rebuilds and publishes to your selected Cloudflare account. The Worker
name is `pa-oh-typing-tutor` in `wrangler.jsonc`. Wrangler prints the deployed
URL. You can add a custom domain in Cloudflare later.

For Git-connected Workers Builds:

- Root directory: `frontend` relative to this repository.
- Build command: `pnpm build:deploy`.
- Deploy command: `pnpm exec wrangler deploy`.
- Node version: 22.12+ (for example `NODE_VERSION=22`).
- No application environment variables are required.

After publishing, check Home, direct visits to Practice, lesson selection,
typing on mobile and desktop, and the light/dark toggle.

Cloudflare routing reference:
https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/
