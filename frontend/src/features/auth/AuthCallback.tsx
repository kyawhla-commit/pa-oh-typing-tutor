import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, LoaderCircle, ShieldAlert } from 'lucide-react'
import { useLearningData } from '../../data/LearningContext'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { learner, signIn } = useLearningData()
  const [message, setMessage] = useState('Confirming your secure sign-in…')

  useEffect(() => {
    let active = true

    const finish = async () => {
      const providerError = searchParams.get('error_description') || searchParams.get('error')
      if (providerError) {
        setMessage(providerError)
        return
      }

      if (!supabase) {
        setMessage('Supabase is not configured for this app yet.')
        return
      }

      const { data, error } = await supabase.auth.getSession()
      if (!active) return

      if (error || !data.session?.user) {
        setMessage(error?.message || 'We couldn’t confirm your sign-in. Please try again.')
        return
      }

      const user = data.session.user
      const metadataName = user.user_metadata.display_name || user.user_metadata.full_name || user.user_metadata.name
      const fallbackName = user.email?.split('@')[0] || 'Learner'
      const profile = { name: typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : fallbackName, email: user.email || '' }
      if (learner?.name !== profile.name || learner?.email !== profile.email) signIn(profile)

      const requestedNext = searchParams.get('next') || '/dashboard'
      const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard'
      navigate(next, { replace: true })
    }

    void finish()
    return () => { active = false }
  }, [learner?.email, learner?.name, navigate, searchParams, signIn])

  const failed = message !== 'Confirming your secure sign-in…'

  return (
    <main className="grid min-h-screen place-items-center bg-[#F5F8FF] px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[#E2EAF7] bg-white p-8 text-center shadow-[0_24px_80px_-40px_rgba(37,99,235,.28)] sm:p-10" aria-live="polite">
        <span className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${failed ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
          {failed ? <ShieldAlert size={24} /> : <LoaderCircle size={24} className="animate-spin" />}
        </span>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-950">{failed ? 'Sign-in needs another step' : 'Finishing sign-in'}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        {failed && <Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"><ArrowLeft size={16} /> Return to sign in</Link>}
      </section>
    </main>
  )
}
