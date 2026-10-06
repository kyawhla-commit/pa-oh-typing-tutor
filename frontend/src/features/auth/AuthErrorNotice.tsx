import type { AuthFailure } from './authError'

export function AuthErrorNotice({ error }: { error: string | AuthFailure }) {
  return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-5 text-rose-800">
    {typeof error === 'string' ? error : error.message}
  </p>
}
