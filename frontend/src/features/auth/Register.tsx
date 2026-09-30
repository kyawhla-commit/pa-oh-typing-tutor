import ThemeToggle from '../../components/ThemeToggle'
import { useLearningData } from '../../data/LearningContext'
import { getAuthRedirectUrl, supabase } from '../../lib/supabase'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Info, LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 48 48" className="h-[18px] w-[18px]"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 2) scale(1 .92)"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.06 46.98 31.91 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1-.75-4.59c0-1.59.27-3.13.75-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.89.94 7.57 2.56 10.78l7.97-6.19Z" transform="translate(0 -1)"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -1)"/></svg>
}

export default function Register() {
  const navigate = useNavigate()
  const { learner, signIn } = useLearningData()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [loading, setLoading] = useState<'email' | 'google' | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmationSent, setConfirmationSent] = useState(false)

  const continueAsGuest = () => {
    if (!learner) signIn({ name: 'Guest learner', email: '' })
    navigate('/practice')
  }

  const startGoogleSignup = async () => {
    setErrorMessage('')
    if (!supabase) {
      setErrorMessage('Account sign-up is not configured yet. Add your Supabase project URL and publishable key to the frontend environment.')
      return
    }

    setLoading('google')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getAuthRedirectUrl('/dashboard') },
    })
    if (error) {
      setErrorMessage(error.message)
      setLoading(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    if (!supabase) {
      setErrorMessage('Account sign-up is not configured yet. Add your Supabase project URL and publishable key to the frontend environment.')
      return
    }
    if (password.length < 8) {
      setErrorMessage('Use a password with at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('Your passwords do not match.')
      return
    }

    setLoading('email')
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: getAuthRedirectUrl('/dashboard'),
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setLoading(null)
      return
    }

    if (data.session?.user) {
      const user = data.session.user
      signIn({ name: displayName.trim() || user.email?.split('@')[0] || 'Learner', email: user.email || email.trim() })
      navigate('/dashboard', { replace: true })
      return
    }

    setConfirmationSent(true)
    setLoading(null)
  }

  return (
    <main className="min-h-screen bg-[#F5F8FF] px-4 py-6 sm:px-6 sm:py-10 lg:grid lg:place-items-center">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#E2EAF7] bg-white shadow-[0_24px_80px_-40px_rgba(37,99,235,.28)] lg:grid lg:grid-cols-[.88fr_1.12fr]">
        <section className="relative isolate flex min-h-[220px] flex-col justify-between overflow-hidden bg-[#174FE8] p-6 text-white sm:min-h-[250px] sm:p-9 lg:min-h-[700px] lg:p-12">
          <div className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute -bottom-36 -left-28 -z-10 h-96 w-96 rounded-full border border-white/10" />
          <Link to="/" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-white/85 transition hover:text-white"><ArrowLeft size={16} /> Back to home</Link>
          <div className="mt-8 lg:mt-0">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20"><UserRound size={23} /></div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-100">Your learning workspace</p>
            <h1 className="mt-3 max-w-md text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Make every practice session count.</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-blue-100 sm:text-base">Create an account for secure sign-in to your Typing Tutor learning workspace.</p>
          </div>
          <div className="mt-8 hidden items-center gap-3 text-sm text-blue-100 lg:flex"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><LockKeyhole size={16} /></span>Secure sign-in powered by Supabase</div>
        </section>

        <section className="flex items-center p-5 sm:p-9 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-5 flex justify-end"><ThemeToggle /></div>
            {confirmationSent ? (
              <div aria-live="polite" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm"><Mail size={20} /></span>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-emerald-800">Check your inbox</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Confirm your email</h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">We sent a confirmation link to <strong className="break-all">{email.trim()}</strong>. Open it to finish creating your account.</p>
                <Link to="/login" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">Go to sign in <ArrowRight size={16} /></Link>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-blue-700">Get started</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Create your free account</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Choose Google or sign up with your email and password.</p>

                <button type="button" onClick={() => void startGoogleSignup()} disabled={loading !== null} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60">
                  {loading === 'google' ? <LoaderCircle size={18} className="animate-spin" /> : <GoogleMark />}
                  Continue with Google
                </button>

                <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.14em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or sign up with email<span className="h-px flex-1 bg-slate-200" /></div>

                <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3.5">
                  <div>
                    <label htmlFor="display-name" className="block text-sm font-semibold text-slate-800">Name</label>
                    <input id="display-name" type="text" name="name" autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="How should we address you?" maxLength={48} required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-slate-800">Email</label>
                    <input id="email" type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-slate-800">Password</label>
                    <div className="relative mt-1.5">
                      <input id="password" type={passwordVisible ? 'text' : 'password'} name="new-password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} placeholder="At least 8 characters" required className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      <button type="button" aria-label={passwordVisible ? 'Hide password' : 'Show password'} onClick={() => setPasswordVisible((visible) => !visible)} className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-800">Confirm password</label>
                    <div className="relative mt-1.5">
                      <input id="confirm-password" type={confirmVisible ? 'text' : 'password'} name="confirm-password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} placeholder="Enter your password again" required className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      <button type="button" aria-label={confirmVisible ? 'Hide password confirmation' : 'Show password confirmation'} onClick={() => setConfirmVisible((visible) => !visible)} className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{confirmVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                    </div>
                  </div>

                  {errorMessage && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-5 text-rose-800">{errorMessage}</p>}
                  {!supabase && <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900"><Info size={16} className="mt-0.5 shrink-0" />Supabase isn’t configured in this environment yet. Add the project URL and publishable key to enable sign-up.</p>}

                  <button type="submit" disabled={loading !== null} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-60">
                    {loading === 'email' && <LoaderCircle size={17} className="animate-spin" />}
                    Create account
                    {loading !== 'email' && <ArrowRight size={17} />}
                  </button>
                </form>

                <p className="mt-5 text-center text-sm text-slate-600">Already have an account? <Link to="/login" className="font-semibold text-blue-700 hover:text-blue-800">Sign in</Link></p>
                <p className="mt-2 text-center text-xs text-slate-500">Want to try it first? <button type="button" onClick={continueAsGuest} className="font-semibold text-blue-700 hover:text-blue-800">Practice as guest</button></p>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
