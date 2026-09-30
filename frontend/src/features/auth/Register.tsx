import ThemeToggle from '../../components/ThemeToggle';
import { ArrowLeft, ArrowRight, HardDrive, Info, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLearningData } from '../../data/LearningContext';

export default function Register() {
  const navigate = useNavigate();
  const { signIn, learner } = useLearningData();
  const [name, setName] = useState(learner?.name ?? '');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const displayName = name.trim();
    if (!displayName) return;
    signIn({ name: displayName, email: learner?.email ?? '' });
    navigate('/dashboard');
  };

  return (
    <main className="min-h-screen bg-[#F5F8FF] px-4 py-8 sm:px-6 lg:grid lg:place-items-center lg:py-12">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#E2EAF7] bg-white shadow-[0_24px_80px_-40px_rgba(37,99,235,.28)] lg:grid lg:grid-cols-[.92fr_1.08fr]">
        <section className="relative isolate flex min-h-[260px] flex-col justify-between overflow-hidden bg-[#174FE8] p-7 text-white sm:p-10 lg:min-h-[620px] lg:p-12">
          <div className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute -bottom-36 -left-28 -z-10 h-96 w-96 rounded-full border border-white/10" />
          <Link to="/" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-white/85 transition hover:text-white"><ArrowLeft size={16} /> Back to home</Link>
          <div className="mt-10 lg:mt-0">
            <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20"><UserRound size={26} /></div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-100">A personal starting point</p>
            <h1 className="mt-3 max-w-md text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Make practice feel like yours.</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-blue-100 sm:text-base">Choose the name you want to see on your dashboard. Your typing sessions and lesson progress stay available in this browser.</p>
          </div>
          <div className="mt-10 flex items-center gap-3 text-sm text-blue-100 lg:mt-0"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><HardDrive size={17} /></span>Local profile · no password needed</div>
        </section>

        <section className="flex items-center p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 flex justify-end"><ThemeToggle /></div>
            <p className="text-sm font-semibold text-blue-700">{learner ? 'Profile settings' : 'Get started'}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{learner ? 'Update your profile' : 'Create your profile'}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Set a display name for your local learning workspace.</p>

            <form onSubmit={handleSubmit} className="mt-8">
              <label htmlFor="display-name" className="block text-sm font-semibold text-slate-800">Display name</label>
              <input
                id="display-name"
                type="text"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="How should we address you?"
                maxLength={48}
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <div className="mt-4 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-5 text-blue-900">
                <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
                <p><span className="font-semibold">One profile in this browser.</span> Changing its name keeps the current practice history on this device. There is no email or password sign-up.</p>
              </div>
              <button type="submit" disabled={!name.trim()} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50">
                {learner ? 'Save profile and continue' : 'Create profile and continue'} <ArrowRight size={17} />
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">Prefer not to set a name? <Link to="/login" className="font-semibold text-blue-700 hover:text-blue-800">Continue as guest</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
