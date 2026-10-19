import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import TutorThemeToggle from '../simple/TutorThemeToggle';
import AdminCMS from './AdminCMS';
import '../../theme.css';

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (active) { setUser(session?.user ?? null); setLoading(false); }
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setUser(data.session?.user ?? null); setLoading(false);
      if (error) setError(error.message);
    }).catch(() => { if (active) { setLoading(false); setError('Could not check your session. Please sign in again.'); } });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError(error.message);
      else setPassword('');
    } catch { setError('Sign-in failed. Please check your connection and try again.'); }
    finally { setBusy(false); }
  };
  const signOut = async () => {
    if (!supabase) return;
    setBusy(true); setError('');
    try { const { error } = await supabase.auth.signOut(); if (error) setError(error.message); }
    catch { setError('Could not sign out. Please try again.'); }
    finally { setBusy(false); }
  };
  return <div className="simple-tutor">
    <header className="tutor-header"><Link className="header-link" to="/">← Home</Link><div className="header-actions"><TutorThemeToggle />{user && <button className="tutor-start" disabled={busy} onClick={() => void signOut()}>Sign out</button>}</div></header>
    {error && <p role="alert" className="mx-auto max-w-xl p-4 text-red-600">{error}</p>}
    {loading ? <p role="status" className="p-8 text-center">Checking admin access…</p> : !supabase ? <main className="classic-practice"><h1>Supabase is not configured</h1><p>Configure the Supabase URL and publishable key to manage shared lessons.</p></main> : !user ?
      <main className="mx-auto max-w-md px-5 py-12"><h1 className="text-2xl font-semibold">Admin sign in</h1><p className="mt-2 mb-6 text-sm">Sign in with your lesson administrator account.</p><form onSubmit={signIn} className="grid gap-4">
        <label className="grid gap-2 text-sm">Email<input className="rounded-lg border border-slate-300 bg-white p-3 text-slate-900" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label>
        <label className="grid gap-2 text-sm">Password<input className="rounded-lg border border-slate-300 bg-white p-3 text-slate-900" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
        <button className="tutor-start" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form></main> : user.app_metadata.role !== 'admin' ? <main className="classic-practice"><h1>Administrator access required</h1><p>This account cannot manage lessons. Sign out and use your administrator account.</p></main> : <AdminCMS lessonsOnly />}
  </div>;
}
