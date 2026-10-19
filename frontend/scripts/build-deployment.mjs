import { build, loadEnv } from 'vite';

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const url = env.VITE_SUPABASE_URL?.trim();
const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY)?.trim();

if (!url || !key) {
  throw new Error('Deployment requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) at build time. See DEPLOYMENT.md.');
}
if (new URL(url).protocol !== 'https:') {
  throw new Error('Deployment requires an HTTPS Supabase URL.');
}
let role;
try {
  role = JSON.parse(Buffer.from(key.split('.')[1] || '', 'base64url').toString()).role;
} catch {
  // Publishable keys are not JWTs.
}
if (key.startsWith('sb_secret_') || role === 'service_role') {
  throw new Error('Use a public Supabase publishable/anon key, never a secret or service-role key.');
}

await build({ mode: 'production' });
