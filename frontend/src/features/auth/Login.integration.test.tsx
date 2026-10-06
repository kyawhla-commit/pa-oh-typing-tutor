// @vitest-environment jsdom
import { act, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Login from './Login'

const { passwordSignIn, signIn, accounts } = vi.hoisted(() => ({
  passwordSignIn: vi.fn(),
  signIn: vi.fn(),
  accounts: [
    { role: 'user', email: 'demo.user@example.test', password: 'fixture-user-password' },
    { role: 'admin', email: 'demo.admin@example.test', password: 'fixture-admin-password' },
  ],
}))

vi.mock('./demoAccounts', () => ({ demoAccounts: accounts }))
vi.mock('../../components/ThemeToggle', () => ({ default: () => null }))
vi.mock('../../data/LearningContext', () => ({ useLearningData: () => ({ learner: null, signIn }) }))
vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: passwordSignIn } },
  getAuthRedirectUrl: (next: string) => next,
}))

let host: HTMLDivElement
let root: Root

function button(label: string) {
  const match = Array.from(host.querySelectorAll('button')).find((element) => element.textContent?.trim() === label)
  if (!match) throw new Error(`Missing button: ${label}`)
  return match
}

function success(role: string, userMetadata = {}) {
  return { data: { user: {
    email: `demo.${role}@example.test`,
    app_metadata: { role },
    user_metadata: { display_name: `Demo ${role}`, ...userMetadata },
  } }, error: null }
}

beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.resetAllMocks()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(<StrictMode><MemoryRouter initialEntries={['/login']}><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/dashboard" element={<p>User workspace</p>} />
    <Route path="/admin" element={<p>Admin workspace</p>} />
  </Routes></MemoryRouter></StrictMode>))
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('Real Supabase demo login', () => {
  it('uses the demo user credentials and opens the learner dashboard', async () => {
    passwordSignIn.mockResolvedValue(success('user'))
    await act(async () => button('Demo user login').click())
    expect(passwordSignIn).toHaveBeenCalledExactlyOnceWith({ email: accounts[0].email, password: accounts[0].password })
    expect(signIn).toHaveBeenCalledWith({ name: 'Demo user', email: accounts[0].email })
    expect(host.textContent).toBe('User workspace')
  })

  it('opens the admin workspace only with the role returned by Supabase', async () => {
    passwordSignIn.mockResolvedValue(success('admin'))
    await act(async () => button('Demo admin login').click())
    expect(passwordSignIn).toHaveBeenCalledExactlyOnceWith({ email: accounts[1].email, password: accounts[1].password })
    expect(host.textContent).toBe('Admin workspace')
  })

  it('does not grant admin access from the button or editable user metadata', async () => {
    passwordSignIn.mockResolvedValue(success('user', { role: 'admin' }))
    await act(async () => button('Demo admin login').click())
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('does not have administrator access')
    expect(signIn).not.toHaveBeenCalled()
    expect(button('Demo admin login').disabled).toBe(false)
  })

  it('shows invalid credentials without creating a local demo session', async () => {
    passwordSignIn.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid login credentials' } })
    await act(async () => button('Demo user login').click())
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('Invalid login credentials')
    expect(signIn).not.toHaveBeenCalled()
    expect(host.querySelector<HTMLInputElement>('#login-email')?.value).toBe(accounts[0].email)
    expect(host.querySelector<HTMLInputElement>('#login-password')?.value).toBe(accounts[0].password)
    expect(button('Demo user login').disabled).toBe(false)
  })

  it('recovers the buttons after a network failure', async () => {
    passwordSignIn.mockRejectedValue(new Error('Connection refused'))
    await act(async () => button('Demo admin login').click())
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Check your connection')
    expect(button('Demo admin login').disabled).toBe(false)
    expect(button('Demo user login').disabled).toBe(false)
    expect(signIn).not.toHaveBeenCalled()
  })

  it('prevents switching accounts while a sign-in request is pending', async () => {
    let resolve!: (value: ReturnType<typeof success>) => void
    passwordSignIn.mockReturnValue(new Promise((done) => { resolve = done }))
    await act(async () => button('Demo user login').click())
    expect(button('Demo user login').disabled).toBe(true)
    expect(button('Demo admin login').disabled).toBe(true)
    await act(async () => button('Demo admin login').click())
    expect(passwordSignIn).toHaveBeenCalledTimes(1)
    await act(async () => resolve(success('user')))
    expect(host.textContent).toBe('User workspace')
  })
})
