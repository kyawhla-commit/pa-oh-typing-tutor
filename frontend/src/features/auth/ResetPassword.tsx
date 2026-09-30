import { useLearningData } from '../../data/LearningContext'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { learner, signIn } = useLearningData()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    if (!supabase) {
      setErrorMessage('Supabase is not configured for this app yet.')
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

    setLoading(true)
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }
    const user = data.user
    const name = user.user_metadata.display_name || user.user_metadata.full_name || user.user_metadata.name || learner?.name || user.email?.split('@')[0] || 'Learner'
    signIn({ name, email: user.email || learner?.email || '' })
    navigate('/dashboard', { replace: true })
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#F5F8FF] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-[#E2EAF7] bg-white p-6 shadow-[0_24px_80px_-40px_rgba(37,99,235,.28)] sm:p-9">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><LockKeyhole size={22} /></span>
        <p className="mt-5 text-sm font-semibold text-blue-700">Account recovery</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Choose a new password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Set a new password for your Typing Tutor account.</p>
        <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-semibold text-slate-800">New password</label>
            <div className="relative mt-1.5"><input id="new-password" type={visible ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2.5 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((state) => !state)} className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-slate-500">{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-800">Confirm new password</label>
            <input id="confirm-password" type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </div>
          {errorMessage && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">{errorMessage}</p>}
          {!supabase && <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-900">Supabase isn’t configured yet.</p>}
          <button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{loading ? <LoaderCircle size={17} className="animate-spin" /> : <>Save new password <ArrowRight size={17} /></>}</button>
        </form>
        <Link to="/login" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft size={15} />Back to sign in</Link>
      </section>
    </main>
  )
}
