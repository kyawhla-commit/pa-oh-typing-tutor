import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, BarChart3, BookOpen, CheckCircle2, ChevronRight,
  Clock3, Keyboard, Play, RotateCcw, Sparkles, Target, Zap,
} from "lucide-react";

const features = [
  { icon: Keyboard, title: "Practice at your pace", desc: "Type words, sentences, passages, or code with instant accuracy feedback.", tone: "bg-blue-50 text-blue-600" },
  { icon: BookOpen, title: "Build a strong foundation", desc: "Follow a clear lesson path from home-row basics to more advanced drills.", tone: "bg-violet-50 text-violet-600" },
  { icon: Target, title: "Set a goal that fits", desc: "Choose a daily word target and a typing speed to work toward.", tone: "bg-emerald-50 text-emerald-600" },
  { icon: BarChart3, title: "See your improvement", desc: "Review completed sessions, practice time, accuracy, and speed trends.", tone: "bg-amber-50 text-amber-600" },
];

const steps = [
  { number: "01", title: "Choose your starting point", desc: "Open a guided lesson or jump into an open practice session." },
  { number: "02", title: "Practice with feedback", desc: "Focus on the text while accuracy and speed update as you type." },
  { number: "03", title: "Come back and improve", desc: "Your completed sessions build a progress history on this device." },
];

const keyboardRows = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["⇧", "z", "x", "c", "v", "b", "n", "m", "⌫"],
];

export default function Landing() {
  const navigate = useNavigate();

  return <div className="min-h-screen overflow-hidden bg-white font-[Inter,sans-serif] text-[#0F172A]">
    <nav className="sticky top-0 z-30 border-b border-[#E2E8F0]/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6" aria-label="Main navigation">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-blue-100"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20"><Keyboard size={18} /></span><span className="text-base font-bold tracking-tight sm:text-lg">Typing Tutor</span></a>
        <div className="hidden items-center gap-7 md:flex"><a href="#features" className="text-sm font-medium text-[#64748B] transition-colors hover:text-[#0F172A]">Features</a><a href="#how-it-works" className="text-sm font-medium text-[#64748B] transition-colors hover:text-[#0F172A]">How it works</a></div>
        <div className="flex items-center gap-2"><button onClick={() => navigate("/login")} className="rounded-xl px-3 py-2 text-sm font-semibold text-[#475569] transition-colors hover:bg-slate-100">Sign in</button><button onClick={() => navigate("/register")} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:px-4">Get started <ArrowRight size={15} /></button></div>
      </div>
    </nav>

    <main id="top">
      <section className="relative isolate px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"><div className="absolute -right-36 -top-36 h-[540px] w-[540px] rounded-full bg-blue-100/60 blur-3xl" /><div className="absolute -left-44 bottom-0 h-80 w-80 rounded-full bg-indigo-50 blur-3xl" /></div>
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm"><span className="grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-white"><Sparkles size={11} /></span>A calm, structured way to learn touch typing</div>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-[#0F172A] sm:text-5xl lg:text-[64px]">Make every keystroke <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">count.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#64748B] sm:text-lg">Build speed and accuracy with guided lessons, focused practice, and progress you can understand. Start with the basics and grow at your own pace.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row"><button onClick={() => navigate("/register")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700">Create your learner profile <ArrowRight size={16} /></button><button onClick={() => navigate("/login")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white/90 px-5 py-3 text-sm font-semibold text-[#334155] transition-colors hover:border-blue-200 hover:bg-white"><Play size={15} fill="currentColor" /> Continue as guest</button></div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#64748B]">{["Free to use", "No password stored", "Progress stays in this browser"].map((item) => <span key={item} className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-600" />{item}</span>)}</div>
          </div>

          <LivePracticePreview />
        </div>
      </section>

      <section id="features" className="scroll-mt-24 border-y border-slate-100 bg-[#F8FAFC] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl"><div className="mx-auto mb-10 max-w-2xl text-center"><p className="mb-2 text-xs font-semibold uppercase tracking-[.15em] text-blue-600">A complete learning toolkit</p><h2 className="text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl">Everything you need to improve</h2><p className="mt-3 text-sm leading-6 text-[#64748B]">Practice, learn, and review in one focused workspace.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{features.map(({ icon: Icon, title, desc, tone }) => <article key={title} className="group rounded-2xl border border-[#E2E8F0] bg-white p-5 transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/[0.04] sm:p-6"><span className={`mb-5 grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon size={20} /></span><h3 className="font-semibold text-[#0F172A]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#64748B]">{desc}</p></article>)}</div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20"><div className="mx-auto max-w-7xl"><div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.15em] text-blue-600">Simple by design</p><h2 className="text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl">Start small. Keep improving.</h2></div><p className="max-w-md text-sm leading-6 text-[#64748B]">No complicated setup. Choose a lesson, practice for a few minutes, then see what changed.</p></div>
          <div className="grid gap-4 md:grid-cols-3">{steps.map(({ number, title, desc }, index) => <article key={number} className="relative rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">{index < steps.length - 1 && <ChevronRight size={17} className="absolute -right-3 top-8 z-10 hidden rounded-full border border-slate-200 bg-white p-0.5 text-slate-400 md:block" />}<span className="font-mono text-sm font-semibold text-blue-600">{number}</span><h3 className="mt-5 font-semibold text-[#0F172A]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#64748B]">{desc}</p></article>)}</div>
        </div></section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20"><div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-[#0F2D66] px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-14"><div aria-hidden className="absolute -right-8 -top-32 h-80 w-80 rounded-full border-[48px] border-white/[0.06]" /><div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div className="max-w-2xl"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-200"><Zap size={14} />Your next session is a good place to start</span><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Ready to build a better rhythm?</h2><p className="mt-3 text-sm leading-6 text-blue-100">Create a local learner profile and begin with a short, guided lesson.</p></div><button onClick={() => navigate("/register")} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-800 shadow-sm transition-colors hover:bg-blue-50">Get started <ArrowRight size={16} /></button></div></div></section>
    </main>

    <footer className="border-t border-[#E2E8F0] bg-white px-4 py-6 sm:px-6"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-[#64748B] sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} Typing Tutor</p><p className="max-w-2xl leading-5 sm:text-right">This version keeps learner profiles, lesson edits, and practice history in this browser. It does not sync data between devices.</p></div></footer>
  </div>;
}

const DEMO_PASSAGE = "Keep your fingers on the home row.";

function LivePracticePreview() {
  const [typed, setTyped] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);
  const navigate = useNavigate();
  const isComplete = typed.length === DEMO_PASSAGE.length;

  useEffect(() => {
    if (startedAt === null || isComplete) return;
    const intervalId = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, [startedAt, isComplete]);

  const elapsedMs = startedAt === null ? 0 : Math.max(1000, now - startedAt);
  const elapsedSeconds = startedAt === null ? 0 : Math.floor(elapsedMs / 1000);
  const accuracy = attempts ? Math.round(((attempts - mistakes) / attempts) * 100) : null;
  const speed = startedAt === null ? null : Math.round((typed.length / 5) / (elapsedMs / 60_000));
  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, "0");
  const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");
  const highlightedKey = typed ? typed.at(-1)?.toLowerCase() : "";

  const handleChange = (value: string) => {
    const nextValue = value.slice(0, DEMO_PASSAGE.length);
    if (startedAt === null && nextValue.length) {
      const started = Date.now();
      setStartedAt(started);
      setNow(started);
    }
    setTyped(nextValue);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      return;
    }
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
    setAttempts((count) => count + 1);
    if (event.key !== DEMO_PASSAGE[typed.length]) setMistakes((count) => count + 1);
  };

  const restart = () => {
    setTyped("");
    setAttempts(0);
    setMistakes(0);
    setStartedAt(null);
    setNow(Date.now());
  };

  return <div className="relative mx-auto w-full max-w-[560px] lg:ml-auto">
    <div aria-hidden className="absolute -right-6 -top-8 h-28 w-28 rounded-[28px] border border-blue-100 bg-blue-50/80" /><div aria-hidden className="absolute -bottom-7 -left-7 h-24 w-24 rounded-full border-[14px] border-amber-100/70" />
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-white p-4 shadow-[0_30px_80px_-28px_rgba(37,99,235,0.28)] sm:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Keyboard size={19} /></span><div><p className="text-sm font-semibold text-slate-900">Try a quick practice</p><p className="text-xs text-slate-500">A short sample · no sign-in needed</p></div></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isComplete ? "bg-emerald-50 text-emerald-700" : startedAt !== null ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}><span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${isComplete ? "bg-emerald-500" : startedAt !== null ? "bg-blue-500" : "bg-slate-400"}`} />{isComplete ? "Complete" : startedAt !== null ? "In progress" : "Ready"}</span></div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"><div className="mb-3 flex items-center justify-between text-[11px] font-medium text-slate-500"><span>Type the passage below</span><span className="inline-flex items-center gap-1"><Clock3 size={12} /> No rush</span></div><p id="demo-passage" className="min-h-[56px] font-mono text-[15px] leading-7 tracking-wide sm:text-base" aria-label={`Passage to type: ${DEMO_PASSAGE}`}>{Array.from(DEMO_PASSAGE).map((character, index) => {
        const isTyped = index < typed.length;
        const isCorrect = typed[index] === character;
        const isCursor = index === typed.length && !isComplete;
        return <span key={index} className={`${isTyped ? isCorrect ? "text-emerald-700" : "rounded-sm bg-rose-100 text-rose-700" : "text-slate-400"} ${isCursor ? "rounded-sm bg-blue-600 text-white" : ""}`}>{character}</span>;
      })}</p>
        <label htmlFor="landing-practice-input" className="sr-only">Type the practice passage</label><textarea id="landing-practice-input" aria-describedby="demo-passage demo-practice-note" value={typed} onChange={(event) => handleChange(event.target.value)} onKeyDown={handleKeyDown} onPaste={(event) => event.preventDefault()} disabled={isComplete} rows={2} maxLength={DEMO_PASSAGE.length} spellCheck={false} autoCapitalize="sentences" autoCorrect="off" placeholder="Click here and type the passage…" className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-mono text-sm leading-6 text-slate-800 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50" />
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Practice sample progress" aria-valuemin={0} aria-valuemax={DEMO_PASSAGE.length} aria-valuenow={typed.length}><div className="h-full rounded-full bg-blue-600 transition-[width] duration-150" style={{ width: `${(typed.length / DEMO_PASSAGE.length) * 100}%` }} /></div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3"><div className="flex gap-5"><div><p className="text-lg font-bold text-blue-700">{speed ?? "—"}</p><p className="text-[10px] text-slate-500">WPM</p></div><div><p className="text-lg font-bold text-emerald-600">{accuracy === null ? "—" : `${accuracy}%`}</p><p className="text-[10px] text-slate-500">Accuracy</p></div><div><p className="text-lg font-bold text-slate-700">{minutes}:{seconds}</p><p className="text-[10px] text-slate-500">Time</p></div></div>{typed.length > 0 && <button onClick={restart} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"><RotateCcw size={13} />Restart</button>}</div>

      <div className="mt-5 space-y-1.5 rounded-2xl bg-slate-100/80 p-3 sm:p-4">{keyboardRows.map((row, rowIndex) => <div key={rowIndex} className="flex justify-center gap-1.5">{row.map((key) => <span key={key} className={`grid h-8 min-w-7 max-w-10 flex-1 place-items-center rounded-lg border text-[11px] font-medium shadow-[0_1px_1px_rgba(15,23,42,0.05)] sm:h-9 ${key === highlightedKey ? "border-blue-500 bg-blue-600 text-white" : key === "f" || key === "j" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}>{key}</span>)}</div>)}<div className="mx-auto h-8 w-[45%] rounded-lg border border-slate-200 bg-white shadow-[0_1px_1px_rgba(15,23,42,0.05)] sm:h-9" /></div>
      <div id="demo-practice-note" className="mt-3 flex min-h-8 items-center justify-between gap-2 text-[10px] text-slate-400" aria-live="polite">{isComplete ? <><span className="font-medium text-emerald-700">Nice work — {speed} WPM at {accuracy}% accuracy. This demo isn’t saved.</span><button onClick={() => navigate("/register")} className="shrink-0 font-semibold text-blue-600 hover:text-blue-800">Keep learning <ArrowRight size={12} className="inline" /></button></> : <span>{startedAt === null ? "Your timer starts when you type. This demo won’t change your saved progress." : `${typed.length} of ${DEMO_PASSAGE.length} characters`}</span>}</div>
    </div>
    <div className="absolute -bottom-4 right-4 hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-lg sm:flex"><span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600"><Zap size={16} /></span><div><p className="text-[11px] font-semibold text-slate-800">A few minutes makes a difference</p><p className="text-[10px] text-slate-500">Start at your own pace</p></div></div>
  </div>;
}
