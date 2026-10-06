import { describe, expect, it } from 'vitest'
import { describeAuthError } from './authError'

describe('Auth failure diagnosis', () => {
  it.each([
    { message: 'NetworkError when attempting to fetch resource.' },
    new TypeError('Failed to fetch'),
    new Error('Connection refused'),
    { name: 'AuthRetryableFetchError', status: 0, message: '' },
    new TypeError('Load failed'),
  ])('identifies transport failures without blaming the password: %s', (error) => {
    expect(describeAuthError(error)).toMatchObject({ kind: 'network', title: 'Cannot reach the sign-in server' })
    expect(describeAuthError(error).message).toBe('Cannot connect. Check your connection and try again.')
  })
  it('describes offline state without overriding a received API rejection', () => {
    expect(describeAuthError(new TypeError('Failed to fetch'), false).title).toBe('You appear to be offline')
    expect(describeAuthError({ code: 'invalid_credentials', status: 400 }, false).kind).toBe('credentials')
  })
  it('recognizes a retryable HTTP 503 as a service failure, not a blocked connection', () => {
    expect(describeAuthError({ name: 'AuthRetryableFetchError', status: 503, message: 'Network request failed' }))
      .toMatchObject({ kind: 'service', status: 503 })
  })
  it.each([
    [{ code: 'invalid_credentials', status: 400 }, 'credentials'],
    [{ message: 'Invalid login credentials' }, 'credentials'],
    [{ code: 'email_not_confirmed', status: 400 }, 'confirmation'],
    [{ status: 429 }, 'rate-limit'],
    [{ code: 'over_email_send_rate_limit', status: 400 }, 'rate-limit'],
  ])('uses the Auth response for actionable guidance: %s', (error, kind) => {
    expect(describeAuthError(error).kind).toBe(kind)
  })
  it('keeps a useful fallback for unknown and missing errors', () => {
    expect(describeAuthError({ message: 'OAuth provider is disabled' }).message).toBe('Request failed. Please try again.')
    expect(describeAuthError(undefined)).toMatchObject({ kind: 'other', title: 'Request could not be completed' })
  })
})
