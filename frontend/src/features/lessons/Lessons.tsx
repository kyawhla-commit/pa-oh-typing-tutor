import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, Clock3,
  Code2, Keyboard, LockKeyhole, Play, Search, Sparkles, Target, X, Zap,
} from "lucide-react";
import { useLearningData } from "../../data/LearningContext";
import { useLessonCatalog } from "./LessonCatalogContext";
import type { LessonCategory, LessonRecord } from "./lessonCatalog";

type LessonProgress = LessonRecord & { completed: boolean; unlocked: boolean; previousTitle?: string };
type CategoryFilter = "All" | LessonCategory;

const categories: LessonCategory[] = ["Beginner", "Intermediate", "Advanced", "Programming"];

const categoryVisuals: Record<LessonCategory, { icon: typeof Keyboard; iconTone: string; wash: string }> = {
  Beginner: { icon: Keyboard, iconTone: "bg-blue-50 text-blue-700", wash: "from-blue-50/80" },
  Intermediate: { icon: Zap, iconTone: "bg-violet-50 text-violet-700", wash: "from-violet-50/80" },
  Advanced: { icon: Target, iconTone: "bg-amber-50 text-amber-700", wash: "from-amber-50/80" },
  Programming: { icon: Code2, iconTone: "bg-emerald-50 text-emerald-700", wash: "from-emerald-50/80" },
};

function getLessonState(catalog: LessonRecord[], completedLessons: number[]): LessonProgress[] {
  const published = catalog.filter((lesson) => lesson.status === "Published").sort((a, b) => a.id - b.id);
  return published.map((lesson, index) => {
    const completed = completedLessons.includes(lesson.id);
    const previous = published[index - 1];
    return { ...lesson, completed, unlocked: index === 0 || (!!previous && completedLessons.includes(previous.id)), previousTitle: previous?.title };
  });
}

function LessonCard({ lesson, index, isNext, onStart }: {
  lesson: LessonProgress; index: number; isNext: boolean; onStart: () => void;
}) {
  const { icon: Icon, iconTone, wash } = categoryVisuals[lesson.category];
  const locked = !lesson.unlocked && !lesson.completed;
  const preview = lesson.content.replace(/\s+/g, " ").trim();

  return <article className={`group relative flex min-h-[264px] flex-col overflow-hidden rounded-2xl border bg-white transition-all ${isNext ? "border-blue-200 shadow-md shadow-blue-900/[0.06] ring-1 ring-blue-100" : "border-[#E2E8F0] shadow-sm shadow-slate-900/[0.02] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"}`}>
    {isNext && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-400" />}
    <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${wash} to-transparent opacity-80`} aria-hidden="true" />
    <div className="relative flex flex-1 flex-col p-5">
      <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className={`grid h-11 w-11 place-items-center rounded-xl ${iconTone}`}><Icon size={19} /></span><span className="text-xs font-medium text-[#94A3B8]">Lesson {index + 1}</span></div>{lesson.completed ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><Check size={12} />Completed</span> : locked ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500"><LockKeyhole size={11} />Locked</span> : isNext ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white"><Sparkles size={11} />Up next</span> : <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700"><Play size={10} fill="currentColor" />Ready</span>}</div>

      <div className="mt-5 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600">{lesson.category}</span><span className="text-[11px] text-slate-400">{lesson.difficulty}</span></div><h3 className="text-base font-semibold tracking-tight text-[#0F172A]">{lesson.title}</h3><p className="mt-1.5 line-clamp-2 min-h-10 text-xs leading-5 text-[#64748B]">{lesson.description}</p></div>

      {preview && <p className="mb-4 line-clamp-1 rounded-lg bg-slate-50 px-3 py-2 font-mono text-[10px] text-slate-500" title={preview}>{preview}</p>}
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3"><span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Clock3 size={13} />{lesson.durationMinutes} min<span className="mx-0.5 text-slate-300">·</span>{lesson.content.length.toLocaleString()} chars</span><button onClick={onStart} disabled={locked} className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${locked ? "cursor-not-allowed bg-slate-100 text-slate-400" : lesson.completed ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-blue-600 text-white hover:bg-blue-700"}`} aria-label={locked ? `Locked: complete ${lesson.previousTitle} first` : `${lesson.completed ? "Review" : "Start"} ${lesson.title}`}>
          {locked ? <><LockKeyhole size={13} />Locked</> : lesson.completed ? <>Review <ArrowRight size={13} /></> : <>Start lesson <ArrowRight size={13} /></>}
        </button></div>
      {locked && <p className="mt-2 text-right text-[10px] text-slate-400">Complete {lesson.previousTitle} to unlock</p>}
    </div>
  </article>;
}

export default function Lessons() {
  const navigate = useNavigate();
  const { completedLessons } = useLearningData();
  const { catalog, catalogStatus, catalogError } = useLessonCatalog();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");
  const [search, setSearch] = useState("");

  const lessons = useMemo(() => getLessonState(catalog, completedLessons), [catalog, completedLessons]);
  const nextLesson = lessons.find((lesson) => !lesson.completed && lesson.unlocked);
  const completedCount = lessons.filter((lesson) => lesson.completed).length;
  const completionPercent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const filtered = lessons.filter((lesson) => {
    const matchesCategory = activeCategory === "All" || lesson.category === activeCategory;
    const matchesSearch = `${lesson.title} ${lesson.description} ${lesson.category} ${lesson.difficulty}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const categoryCount = (category: CategoryFilter) => category === "All" ? lessons.length : lessons.filter((lesson) => lesson.category === category).length;
  const totalDuration = lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0);

  return <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 pb-10 sm:p-6 lg:p-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.14em] text-[#94A3B8]">Your learning path</p><h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">Lessons</h1><p className="mt-1 text-sm text-[#64748B]">Learn one skill at a time, at a pace that works for you.</p></div><div className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-xs font-medium text-[#64748B]"><BookOpen size={15} className="text-blue-600" />{lessons.length} lessons <span className="text-slate-300">·</span>{totalDuration} min total</div></header>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
      <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1D4ED8] via-[#2563EB] to-[#4F83F1] p-5 text-white shadow-sm sm:p-6"><div aria-hidden="true" className="absolute -right-16 -top-28 h-64 w-64 rounded-full border-[36px] border-white/[0.07]" /><div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center"><div className="max-w-xl"><span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-blue-50"><Sparkles size={12} />{lessons.length ? "A clear path, one lesson at a time" : "Ready when your lessons are"}</span><h2 className="mt-3 text-xl font-semibold sm:text-2xl">{nextLesson ? `Pick up with ${nextLesson.title}` : lessons.length && completedCount === lessons.length ? "You completed your learning path!" : "Your next skill starts here"}</h2><p className="mt-2 max-w-lg text-sm leading-6 text-blue-100">{nextLesson ? nextLesson.description : lessons.length ? "Revisit any lesson to keep your touch typing sharp." : "Published lessons will appear here when they’re available."}</p>{nextLesson && <button onClick={() => navigate(`/practice?lesson=${nextLesson.id}`)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"><Play size={14} fill="currentColor" />Continue learning <ArrowRight size={15} /></button>}</div><div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 sm:min-w-48"><div className="relative grid h-14 w-14 shrink-0 place-items-center"><svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" /><circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - completionPercent / 100)} /></svg><span className="text-sm font-bold">{completionPercent}%</span></div><div><p className="text-xs text-blue-100">Your progress</p><p className="mt-0.5 text-sm font-semibold">{completedCount} of {lessons.length} complete</p><p className="mt-0.5 text-[10px] text-blue-100">{lessons.length ? `${lessons.length - completedCount} left to explore` : "No published lessons"}</p></div></div></div></article>

      <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm shadow-slate-900/[0.02]"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={19} /></span><div><h2 className="text-sm font-semibold text-[#0F172A]">How your path works</h2><p className="mt-0.5 text-xs text-[#64748B]">A simple sequence, with room to practice freely.</p></div></div><ol className="mt-5 space-y-3">{["Start the available lesson", "Finish the full passage", "The next lesson unlocks"].map((step, index) => <li key={step} className="flex items-center gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">{index + 1}</span><span className="text-xs font-medium text-slate-700">{step}</span>{index < 2 && <ChevronRight size={13} className="ml-auto text-slate-300" />}</li>)}</ol><button onClick={() => navigate("/practice")} className="mt-5 inline-flex items-center gap-1.5 border-t border-slate-100 pt-4 text-xs font-semibold text-blue-600 hover:text-blue-800">Prefer open practice? Try it here <ArrowRight size={13} /></button></article>
    </section>

    <section aria-label="Filter lessons"><div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-[#0F172A]">Explore your lessons</h2><p className="mt-1 text-xs text-[#64748B]">Finish each available lesson to unlock the next one.</p></div><label className="relative block w-full sm:max-w-xs"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search lessons" aria-label="Search lessons" className="w-full rounded-xl border border-[#E2E8F0] bg-white py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={14} /></button>}</label></div>
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filter by lesson category">{(["All", ...categories] as CategoryFilter[]).map((category) => <button key={category} role="tab" aria-selected={activeCategory === category} onClick={() => setActiveCategory(category)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:px-3.5 ${activeCategory === category ? "bg-blue-600 text-white shadow-sm" : "border border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"}`}>{category}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeCategory === category ? "bg-white/20 text-white" : "bg-white/80 text-slate-500"}`}>{categoryCount(category)}</span></button>)}</div>
    </section>

    {filtered.length ? <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3" aria-label={`${activeCategory} lessons`}>{filtered.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} index={lessons.findIndex((item) => item.id === lesson.id)} isNext={lesson.id === nextLesson?.id} onStart={() => navigate(`/practice?lesson=${lesson.id}`)} />)}</section>
      : <section className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-6 py-14 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><BookOpen size={22} /></span><h2 className="mt-4 font-semibold text-[#0F172A]">{lessons.length ? "No lessons match this view" : "No published lessons yet"}</h2><p className="mx-auto mt-1 max-w-md text-sm text-[#64748B]">{lessons.length ? "Try another category or clear your search to see more lessons." : "Published learning content will appear here. You can still practice freely while you wait."}</p>{search && <button onClick={() => { setSearch(""); setActiveCategory("All"); }} className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-800">Clear filters</button>}{!lessons.length && <button onClick={() => navigate("/practice")} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800">Open free practice <ChevronRight size={15} /></button>}</section>}

    {catalogError && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">Could not refresh the shared lesson catalog. Showing the available cached lessons.</p>}
    <footer className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-600" />{catalogStatus === "synced" ? "Lessons are shared through Supabase; your completion progress syncs with your account." : "Your lesson progress is saved on this device."}</span><button onClick={() => navigate("/progress")} className="inline-flex items-center gap-1 self-start font-semibold text-blue-600 hover:text-blue-800 sm:self-auto">View your progress <ArrowRight size={13} /></button></footer>
  </div>;
}
