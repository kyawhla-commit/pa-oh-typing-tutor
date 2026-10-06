import ThemeToggle from '../../components/ThemeToggle'
import { useLearningData } from '../../data/LearningContext'
import { getAuthRedirectUrl, supabase } from '../../lib/supabase'
import { ArrowLeft, ArrowRight, BookOpen, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { demoAccounts } from './demoAccounts'
import { describeAuthError, type AuthFailure } from './authError'
import { AuthErrorNotice } from './AuthErrorNotice'

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 48 48" className="h-[18px] w-[18px]"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 2) scale(1 .92)"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.06 46.98 31.91 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1-.75-4.59c0-1.59.27-3.13.75-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.89.94 7.57 2.56 10.78l7.97-6.19Z" transform="translate(0 -1)"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -1)"/></svg>
}

export default function Login() {
  const navigate = useNavigate()
  const { learner, signIn } = useLearningData()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [loading, setLoading] = useState<'email' | 'google' | 'reset' | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | AuthFailure>('')
  const [notice, setNotice] = useState('')

  const continueAsGuest = () => {
    if (!learner) signIn({ name: 'Guest learner', email: '' })
    navigate('/practice')
  }

  const startGoogleLogin = async () => {
    setErrorMessage('')
    setNotice('')
    if (!supabase) {
      setErrorMessage('Sign-in is unavailable. Contact the project owner.')
      return
    }
    setLoading('google')
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getAuthRedirectUrl('/dashboard') } })
      if (error) {
        setErrorMessage(describeAuthError(error, navigator.onLine))
        setLoading(null)
      }
    } catch (error) {
      setErrorMessage(describeAuthError(error, navigator.onLine))
      setLoading(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await passwordLogin(email, password)
  }

  const passwordLogin = async (accountEmail: string, accountPassword: string, demoRole?: 'user' | 'admin') => {
    setErrorMessage('')
    setNotice('')
    if (!supabase) {
      setErrorMessage('Sign-in is unavailable. Contact the project owner.')
      return
    }
    setLoading('email')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: accountEmail.trim().toLowerCase(), password: accountPassword })
      if (error) {
        setErrorMessage(describeAuthError(error, navigator.onLine))
        return
      }
      const user = data.user
      const isAdmin = user.app_metadata.role === 'admin'
      if (demoRole === 'admin' && !isAdmin) {
        setErrorMessage('This account does not have administrator access.')
        return
      }
      const metadataName = user.user_metadata.display_name || user.user_metadata.full_name || user.user_metadata.name
      const fallbackName = user.email?.split('@')[0] || 'Learner'
      signIn({ name: typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : fallbackName, email: user.email || accountEmail.trim() })
      navigate(isAdmin ? '/admin' : '/dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(describeAuthError(error, navigator.onLine))
    } finally {
      setLoading(null)
    }
  }

  const sendPasswordReset = async () => {
    setErrorMessage('')
    setNotice('')
    if (!email.trim()) {
      setErrorMessage('Enter your email to reset your password.')
      return
    }
    if (!supabase) {
      setErrorMessage('Password reset is unavailable. Contact the project owner.')
      return
    }
    setLoading('reset')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: getAuthRedirectUrl('/auth/reset-password') })
      if (error) setErrorMessage(describeAuthError(error, navigator.onLine))
      else setNotice('If an account exists for that address, a password reset link is on its way.')
    } catch (error) {
      setErrorMessage(describeAuthError(error, navigator.onLine))
    } finally {
      setLoading(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F8FF] px-4 py-6 sm:px-6 sm:py-10 lg:grid lg:place-items-center">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#E2EAF7] bg-white shadow-[0_24px_80px_-40px_rgba(37,99,235,.28)] lg:grid lg:grid-cols-[.88fr_1.12fr]">
        <section className="relative isolate flex min-h-[220px] flex-col justify-between overflow-hidden bg-[#174FE8] p-6 text-white sm:min-h-[250px] sm:p-9 lg:min-h-[660px] lg:p-12">
          <div className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute -bottom-36 -left-28 -z-10 h-96 w-96 rounded-full border border-white/10" />
          <Link to="/" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-white/85 transition hover:text-white"><ArrowLeft size={16} /> Back to home</Link>
          <div className="mt-8 lg:mt-0">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20"><BookOpen size={23} /></div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-100">Typing Tutor</p>
            <h1 className="mt-3 max-w-md text-3xl font-bold leading-tight tracking-tight sm:text-4xl">A little practice adds up.</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-blue-100 sm:text-base">Sign in to continue building speed, accuracy, and confidence.</p>
          </div>
          <div className="mt-8 hidden items-center gap-3 text-sm text-blue-100 lg:flex"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><LockKeyhole size={16} /></span>Secure sign-in powered by Supabase</div>
        </section>

        <section className="flex items-center p-5 sm:p-9 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-5 flex justify-end"><ThemeToggle /></div>
            <p className="text-sm font-semibold text-blue-700">Welcome back</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Sign in to your account</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Use Google or sign in with your email and password.</p>

            {supabase && demoAccounts.length > 0 && <section aria-label="Demo accounts" className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <p className="text-sm font-semibold text-slate-900">Try a demo account</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Sign in instantly with the demo user or admin. Changes are saved to this Supabase project.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {demoAccounts.map((account) => <button key={account.role} type="button" disabled={loading !== null} onClick={() => {
                  setEmail(account.email)
                  setPassword(account.password)
                  void passwordLogin(account.email, account.password, account.role)
                }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-wait disabled:opacity-60">
                  {account.role === 'admin' ? <ShieldCheck size={17} /> : <UserRound size={17} />}
                  {account.role === 'admin' ? 'Demo admin login' : 'Demo user login'}
                </button>)}
              </div>
            </section>}

            <button type="button" onClick={() => void startGoogleLogin()} disabled={loading !== null} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60">
              {loading === 'google' ? <LoaderCircle size={18} className="animate-spin" /> : <GoogleMark />}
              Continue with Google
            </button>
            <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.14em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or sign in with email<span className="h-px flex-1 bg-slate-200" /></div>

            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3.5">
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-slate-800">Email</label>
                <input id="login-email" type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </div>
              <div>
                <div className="flex items-center justify-between gap-3"><label htmlFor="login-password" className="block text-sm font-semibold text-slate-800">Password</label><button type="button" onClick={() => void sendPasswordReset()} disabled={loading !== null} className="text-xs font-semibold text-blue-700 hover:text-blue-900 disabled:opacity-50">Forgot password?</button></div>
                <div className="relative mt-1.5">
                  <input id="login-password" type={passwordVisible ? 'text' : 'password'} name="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <button type="button" aria-label={passwordVisible ? 'Hide password' : 'Show password'} onClick={() => setPasswordVisible((visible) => !visible)} className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </div>
              </div>
              {errorMessage && <AuthErrorNotice error={errorMessage} />}
              {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm leading-5 text-emerald-800">{notice}</p>}
              {!supabase && <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900">Supabase isn’t configured yet. You can still try the app without an account.</p>}
              <button type="submit" disabled={loading !== null} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-60">
                {loading === 'email' && <LoaderCircle size={17} className="animate-spin" />}
                Sign in
                {loading !== 'email' && <ArrowRight size={17} />}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-600">New here? <Link to="/register" className="font-semibold text-blue-700 hover:text-blue-800">Create free account</Link></p>
            <button type="button" onClick={continueAsGuest} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"><UserRound size={16} />Practice as guest</button>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs leading-5 text-slate-500"><Mail size={13} />Your profile, preferences, lesson progress, and typing sessions sync to your account.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
