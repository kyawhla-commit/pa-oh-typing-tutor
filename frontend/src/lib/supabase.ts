import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

// The explicit local study mode cannot initialize an authenticated/cloud client.
const localStudy = import.meta.env.DEV && import.meta.env.MODE === 'pilot'
export const supabase = !localStudy && supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function getAuthRedirectUrl(next = '/dashboard') {
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
  const url = new URL('/auth/callback', window.location.origin)
  url.searchParams.set('next', safeNext)
  return url.toString()
}
