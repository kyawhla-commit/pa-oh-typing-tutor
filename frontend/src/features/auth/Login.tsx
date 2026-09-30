import ThemeToggle from '../../components/ThemeToggle';
import { ArrowLeft, ArrowRight, BookOpen, Check, HardDrive, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLearningData } from '../../data/LearningContext';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, learner } = useLearningData();
  const learnerName = learner?.name.trim() || 'Guest learner';

  const continueLearning = () => {
    if (!learner) signIn({ name: 'Guest learner', email: '' });
    navigate('/dashboard');
  };

  return (
    <main className="min-h-screen bg-[#F5F8FF] px-4 py-8 sm:px-6 lg:grid lg:place-items-center lg:py-12">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#E2EAF7] bg-white shadow-[0_24px_80px_-40px_rgba(37,99,235,.28)] lg:grid lg:grid-cols-[.92fr_1.08fr]">
        <section className="relative isolate flex min-h-[260px] flex-col justify-between overflow-hidden bg-[#174FE8] p-7 text-white sm:p-10 lg:min-h-[620px] lg:p-12">
          <div className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full border-[1px] border-white/10" />
          <div className="absolute -bottom-36 -left-28 -z-10 h-96 w-96 rounded-full border-[1px] border-white/10" />
          <Link to="/" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-white/85 transition hover:text-white">
            <ArrowLeft size={16} /> Back to home
          </Link>
          <div className="mt-10 lg:mt-0">
            <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20"><BookOpen size={26} /></div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-100">Typing Tutor</p>
            <h1 className="mt-3 max-w-md text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Small daily practice. Lasting progress.</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-blue-100 sm:text-base">Pick up where you left off and keep building speed, accuracy, and confidence one session at a time.</p>
          </div>
          <div className="mt-10 flex items-center gap-3 text-sm text-blue-100 lg:mt-0">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><HardDrive size={17} /></span>
            Your learner profile stays in this browser
          </div>
        </section>

        <section className="flex items-center p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 flex justify-end"><ThemeToggle /></div>
            <p className="text-sm font-semibold text-blue-700">Your learning space</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Continue learning</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">This app uses a local learner profile. There is no online account or password sign-in.</p>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700"><UserRound size={22} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{learner ? 'This browser profile' : 'Ready to begin'}</p>
                  <p className="mt-1 truncate font-semibold text-slate-900">{learnerName}</p>
                  <p className="mt-1 text-sm text-slate-500">{learner?.email || 'Practice data stays on this device'}</p>
                </div>
              </div>
              <button onClick={continueLearning} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200">
                {learner ? `Continue as ${learnerName}` : 'Continue as guest'} <ArrowRight size={17} />
              </button>
              {learner && <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500"><Check size={14} className="text-emerald-600" /> Your existing practice history is ready</p>}
            </div>

            <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />OR<span className="h-px flex-1 bg-slate-200" /></div>
            <Link to="/register" className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100">
              {learner ? 'Update learner profile' : 'Create a local profile'}
            </Link>
            <p className="mt-5 text-center text-xs leading-5 text-slate-500">One profile is kept in this browser. Renaming it keeps the practice history on this device.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
