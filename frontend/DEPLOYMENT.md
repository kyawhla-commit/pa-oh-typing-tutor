# Deploy to Cloudflare Workers

Cloudflare serves the Vite frontend; Supabase continues to provide lessons and
admin authentication. No database migration to Cloudflare is needed.

## Build configuration

Run commands from `frontend/`. Use Node 22.12 or newer and pnpm.
Install dependencies with `pnpm install --frozen-lockfile`.

Set these **build-time** environment variables in Cloudflare Workers Builds:

- `VITE_SUPABASE_URL`: your existing Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the project's public publishable key.
  `VITE_SUPABASE_ANON_KEY` is supported as a legacy fallback.

For local builds, put them in ignored `.env.production.local` or `.env`.
These public values are embedded in the browser bundle. Never supply a
service-role key, secret key, or demo account password. Changing these values
requires a new build; Worker runtime variables do not change the bundle.

## Prepare locally

```sh
pnpm build:deploy
pnpm preview:cloudflare
```

The preview runs locally. Open the URL it prints and visit `/`, `/practice`,
and `/admin` directly. The Wrangler SPA fallback supports refreshed routes.
Admin has no public navigation link but remains available at `/admin`.

## Deploy when ready

```sh
pnpm exec wrangler login
pnpm deploy
```

`pnpm deploy` rebuilds with the required Supabase configuration and publishes
to the Cloudflare account you selected. The Worker name is
`pa-oh-typing-tutor` in `wrangler.jsonc`; change it before deployment if needed.
Wrangler prints the deployed URL. Add a custom domain later in Cloudflare.

For Git-connected Workers Builds, use:

- Root directory: `frontend` (relative to this repository).
- Build command: `pnpm build:deploy`.
- Deploy command: `pnpm exec wrangler deploy`.
- Set the two public Supabase variables in the **build environment**.
- Use Node 22.12+ (for example, set `NODE_VERSION=22`).

## Supabase and launch checks

Keep the existing `lesson_catalog` table, migrations, and RLS policies.
The admin account must have server-managed `app_metadata.role = admin`.
Do not make the table publicly writable. No migrations are run by deployment.

After publishing, confirm that published lessons load, drafts stay hidden,
typing works on mobile and desktop, and an admin can sign in at `/admin`.
Check direct route refreshes and the light/dark toggle. Set the final domain
as the Supabase Auth Site URL if you use email links or redirect auth flows.

Cloudflare routing reference:
https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/
