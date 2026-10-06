export interface AuthFailure {
  kind: 'network' | 'credentials' | 'confirmation' | 'rate-limit' | 'service' | 'other'
  title: string
  message: string
  code?: string
  status?: number
}

// A fetch error can be returned by the SDK or thrown by the browser.
// HTTP service errors must not be mistaken for a blocked network request.
export function describeAuthError(error: unknown, online = true): AuthFailure {
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {}
  const message = typeof value.message === 'string' ? value.message : ''
  const code = typeof value.code === 'string' && /^[a-z0-9_]+$/.test(value.code) ? value.code : undefined
  const status = typeof value.status === 'number' && Number.isInteger(value.status) && value.status >= 400 && value.status <= 599 ? value.status : undefined
  const details = { code, status }
  if (status === 429 || code?.startsWith('over_')) return {
    ...details, kind: 'rate-limit', title: 'Too many requests',
    message: 'Too many attempts. Try again in a few minutes.',
  }
  if (status && status >= 500) return {
    ...details, kind: 'service', title: 'Sign-in service unavailable',
    message: 'Sign-in is unavailable. Try again shortly.',
  }
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) return {
    ...details, kind: 'credentials', title: 'Email or password is incorrect',
    message: 'Incorrect email or password. Try again.',
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) return {
    ...details, kind: 'confirmation', title: 'Confirm your email first',
    message: 'Confirm your email before signing in.',
  }
  if (!status && (!online || value.name === 'AuthRetryableFetchError'
    || /NetworkError|Failed to fetch|fetch failed|Load failed|Network request failed|connection refused|ECONNREFUSED|network.*(?:error|fail)|timed? ?out/i.test(message))) return {
    ...details, kind: 'network', title: online ? 'Cannot reach the sign-in server' : 'You appear to be offline',
    message: online ? 'Cannot connect. Check your connection and try again.' : 'You’re offline. Connect to the internet and try again.',
  }
  return {
    ...details, kind: 'other', title: 'Request could not be completed',
    message: 'Request failed. Please try again.',
  }
}
