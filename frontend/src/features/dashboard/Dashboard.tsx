import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, Clock3, Flame,
  Gauge, Play, Sparkles, Target, TrendingUp, Trophy, Zap,
} from "lucide-react";
import { useLearningData } from "../../data/LearningContext";
import { getCurrentPracticeStreak, localDateKey, startOfLocalDay, summarizeSessions } from "../../data/sessionAnalytics";
import { useLessonCatalog } from "../lessons/LessonCatalogContext";
import type { LessonRecord } from "../lessons/lessonCatalog";

const dateKey = localDateKey;

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours} hr`;
}

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function EmptyChart({ title, message, onPractice }: { title: string; message: string; onPractice: () => void }) {
  return <div className="flex h-[210px] flex-col items-center justify-center rounded-xl bg-slate-50 px-5 text-center">
    <TrendingUp size={21} className="mb-2 text-blue-500" /><p className="text-sm font-semibold text-[#0F172A]">{title}</p><p className="mt-1 max-w-xs text-xs leading-relaxed text-[#64748B]">{message}</p>
    <button onClick={onPractice} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-blue-800">Start a session <ArrowRight size={13} /></button>
  </div>;
}

function SummaryCard({ label, value, unit, icon: Icon, color, helper }: {
  label: string; value: string; unit: string; icon: typeof Zap; color: string; helper: string;
}) {
  return <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5">
    <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-[#64748B] sm:text-sm">{label}</span><span className={`grid h-9 w-9 place-items-center rounded-xl ${color}`}><Icon size={17} /></span></div>
    <p className="mt-4 truncate text-2xl font-semibold tracking-tight text-[#0F172A] sm:text-3xl">{value}<span className="ml-1.5 text-xs font-medium text-[#94A3B8] sm:text-sm">{unit}</span></p>
    <p className="mt-1 truncate text-[11px] text-[#94A3B8]">{helper}</p>
  </article>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { learner, results, completedLessons, preferences, syncStatus, syncError } = useLearningData();
  const { catalog } = useLessonCatalog();
  const now = new Date();
  const firstName = learner?.name.trim().split(/\s+/)[0] || "Learner";

  const todayResults = useMemo(() => results.filter((result) => dateKey(result.createdAt) === dateKey(now)), [results]);
  const todayWords = summarizeSessions(todayResults).words;
  const dailyGoal = Math.max(0, preferences.dailyGoal || 0);
  const goalPercent = dailyGoal ? Math.min(100, Math.round((todayWords / dailyGoal) * 100)) : 0;
  const remainingWords = Math.max(0, Math.ceil(dailyGoal - todayWords));
  const streak = getCurrentPracticeStreak(results, now);
  const weekStart = startOfLocalDay(now);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const weeklyResults = results.filter((result) => {
    const date = new Date(result.createdAt);
    return date >= weekStart && date < nextWeekStart;
  });
  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekResults = results.filter((result) => {
    const date = new Date(result.createdAt);
    return date >= previousWeekStart && date < weekStart;
  });

  const weekData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const sessions = weeklyResults.filter((result) => dateKey(result.createdAt) === dateKey(date));
    const summary = summarizeSessions(sessions);
    return {
      day: date.toLocaleDateString(undefined, { weekday: "short" }),
      speed: summary.averageWpm,
      minutes: Number((summary.durationSeconds / 60).toFixed(1)),
      sessions: sessions.length,
    };
  });

  const weeklySummary = summarizeSessions(weeklyResults);
  const previousWeekSummary = summarizeSessions(previousWeekResults);
  const lifetimeSummary = summarizeSessions(results);
  const averageWpm = weeklySummary.averageWpm;
  const averageAccuracy = weeklySummary.averageAccuracy === null ? null : Math.round(weeklySummary.averageAccuracy);
  const previousAverageWpm = previousWeekSummary.averageWpm;
  const speedDelta = averageWpm !== null && previousAverageWpm !== null ? averageWpm - previousAverageWpm : null;
  const totalWords = lifetimeSummary.words;
  const totalPracticeSeconds = lifetimeSummary.durationSeconds;
  const latestResults = useMemo(() => [...results].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5), [results]);
  const publishedLessons = useMemo(() => catalog.filter((lesson) => lesson.status === "Published").sort((a, b) => a.id - b.id), [catalog]);
  const learningPath = publishedLessons.slice(0, 5).map((lesson, index, list) => {
    const completed = completedLessons.includes(lesson.id);
    const previous = list[index - 1];
    const unlocked = index === 0 || (previous ? completedLessons.includes(previous.id) : false);
    return { lesson, completed, unlocked };
  });
  const lessonsCompleted = publishedLessons.filter((lesson) => completedLessons.includes(lesson.id)).length;
  const weekTotalMinutes = weekData.reduce((sum, day) => sum + day.minutes, 0);
  const greetingDate = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const cards = [
    { label: "Average speed", value: averageWpm === null ? "—" : String(averageWpm), unit: "WPM", icon: Zap, color: "bg-blue-50 text-blue-600", helper: "This week" },
    { label: "Accuracy", value: averageAccuracy === null ? "—" : String(averageAccuracy), unit: averageAccuracy === null ? "" : "%", icon: Target, color: "bg-emerald-50 text-emerald-600", helper: "This week" },
    { label: "Words typed", value: totalWords.toLocaleString(), unit: "words", icon: BookOpen, color: "bg-violet-50 text-violet-600", helper: "All time · estimated from characters" },
    { label: "Practice time", value: results.length ? formatDuration(totalPracticeSeconds) : "0 min", unit: "", icon: Clock3, color: "bg-amber-50 text-amber-600", helper: "All time" },
  ];

  const recentDate = (createdAt: string) => {
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return <div className="mx-auto w-full max-w-[1440px] space-y-5 p-4 pb-10 sm:p-6 lg:p-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="mb-1 text-xs font-semibold uppercase tracking-[.14em] text-[#94A3B8]">Learning workspace · {greetingDate}</p><h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">{getGreeting(now)}, {firstName} <span aria-hidden>👋</span></h1><p className="mt-1 text-sm text-[#64748B]">Your practice, progress, and next lesson in one place.</p></div>
      <div className="flex gap-2"><button onClick={() => navigate("/test")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#475569] transition-colors hover:bg-slate-50"><Gauge size={16} />Take a test</button><button onClick={() => navigate("/practice")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"><Play size={15} fill="currentColor" />Start practicing</button></div>
    </header>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(290px,0.36fr)]">
      <article className="relative flex min-h-[208px] flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#1D4ED8] via-[#2563EB] to-[#4F83F1] p-5 text-white sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[38px] border-white/[0.07]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 right-24 h-60 w-60 rounded-full border-[28px] border-white/[0.06]" />
        <div className="relative flex h-full flex-1 flex-col justify-between gap-7 sm:flex-row sm:items-center"><div className="max-w-xl"><div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-blue-50"><Sparkles size={13} />Your learning overview</div><h2 className="text-xl font-semibold leading-snug sm:text-2xl">Build a little speed every day.</h2><p className="mt-2 max-w-lg text-sm leading-relaxed text-blue-100">{streak ? `You’re on a ${streak}-day streak. Keep the momentum going with one focused session.` : "A short, focused session is a great way to get started today."}</p><button onClick={() => navigate("/practice")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50">Continue practice <ArrowRight size={15} /></button></div>
          <div className="grid grid-cols-2 gap-2 self-start sm:min-w-48 sm:grid-cols-1"><div className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15"><Flame size={16} /></span><div><p className="text-[10px] text-blue-100">Current streak</p><p className="text-sm font-semibold">{streak} {streak === 1 ? "day" : "days"}</p></div></div><div className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15"><Trophy size={16} /></span><div><p className="text-[10px] text-blue-100">Lessons completed</p><p className="text-sm font-semibold">{lessonsCompleted} / {publishedLessons.length}</p></div></div></div>
        </div>
      </article>

      <article className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm shadow-slate-900/[0.02] sm:flex-row sm:items-center xl:flex-col xl:items-stretch">
        <div className="flex items-center gap-4"><div className="relative grid h-[84px] w-[84px] shrink-0 place-items-center"><svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" role="img" aria-label={`${goalPercent}% of daily word goal complete`}><circle cx="50" cy="50" r="42" fill="none" stroke="#E2E8F0" strokeWidth="8" /><circle cx="50" cy="50" r="42" fill="none" stroke="#2563EB" strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - goalPercent / 100)} className="transition-[stroke-dashoffset] duration-500" /></svg><span className="text-lg font-bold text-[#0F172A]">{goalPercent}%</span></div><div><p className="text-xs font-medium text-[#64748B]">Today&apos;s word goal</p><p className="mt-1 text-xl font-semibold text-[#0F172A]">{Math.floor(todayWords).toLocaleString()} <span className="text-sm font-normal text-[#94A3B8]">/ {dailyGoal.toLocaleString()}</span></p><p className="mt-1 text-xs text-[#64748B]">{dailyGoal === 0 ? "Set a daily goal in Settings" : goalPercent >= 100 ? "Daily goal complete — great work!" : `${remainingWords.toLocaleString()} words to reach your goal`}</p></div></div>
        <div className="mt-4 sm:mt-0 sm:w-44 xl:mt-5 xl:w-full"><div className="mb-1.5 flex justify-between text-[10px] font-medium text-[#94A3B8]"><span>Daily target</span><span>{goalPercent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Daily word goal" aria-valuenow={goalPercent} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-blue-600 transition-[width] duration-500" style={{ width: `${goalPercent}%` }} /></div><button onClick={() => navigate("/settings")} className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800">Adjust goal</button></div>
      </article>
    </section>

    <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Typing summary">{cards.map((card) => <SummaryCard key={card.label} {...card} />)}</section>

    <section className="grid gap-4 xl:grid-cols-2">
      <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-[#0F172A]">Speed this week</h2><p className="mt-1 text-xs text-[#64748B]">Average words per minute by day</p></div>{speedDelta !== null && <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${speedDelta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{speedDelta >= 0 ? <TrendingUp size={13} /> : <TrendingUp size={13} className="rotate-180" />}{speedDelta >= 0 ? "+" : ""}{speedDelta} vs last week</span>}</div>
        {weeklyResults.length ? <div className="h-[210px] w-full" role="img" aria-label="Average typing speed by day this week"><ResponsiveContainer width="100%" height="100%"><LineChart data={weekData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} width={36} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} domain={[0, "dataMax + 10"]} /><Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 12 }} formatter={(value) => [`${value ?? 0} WPM`, "Average speed"]} /><Line type="monotone" dataKey="speed" connectNulls stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3, fill: "#2563EB", strokeWidth: 0 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div> : <EmptyChart title="Your speed trend starts here" message="Complete a practice or typing test this week to see your daily speed trend." onPractice={() => navigate("/practice")} />}
        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-[#64748B]"><span>{weeklyResults.length} completed {weeklyResults.length === 1 ? "session" : "sessions"}</span><span>{averageWpm === null ? "No speed recorded yet" : `Weekly average · ${averageWpm} WPM`}</span></div>
      </article>

      <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-[#0F172A]">Practice time</h2><p className="mt-1 text-xs text-[#64748B]">Minutes spent typing, by day</p></div><CalendarDays size={18} className="text-blue-600" /></div>
        {weeklyResults.length ? <><div className="h-[174px] w-full" role="img" aria-label="Practice duration by day this week"><ResponsiveContainer width="100%" height="100%"><BarChart data={weekData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis width={36} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 12 }} formatter={(value) => [`${value ?? 0} min`, "Practice time"]} /><Bar dataKey="minutes" fill="#4F7DF3" radius={[6, 6, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer></div><div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-[#64748B]"><span>{weekTotalMinutes.toFixed(1)} min this week</span><span>{weeklyResults.length} {weeklyResults.length === 1 ? "session" : "sessions"}</span></div></> : <EmptyChart title="Your weekly practice chart is ready" message="Your daily practice times will appear here after you complete a session." onPractice={() => navigate("/practice")} />}
      </article>
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <article className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm shadow-slate-900/[0.02]">
        <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-4 sm:px-5"><div><h2 className="text-sm font-semibold text-[#0F172A]">Learning path</h2><p className="mt-1 text-xs text-[#64748B]">Continue where you left off</p></div><button onClick={() => navigate("/lessons")} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">All lessons <ArrowRight size={13} /></button></div>
        {learningPath.length ? <div className="divide-y divide-slate-100">{learningPath.map(({ lesson, completed, unlocked }) => <LessonRow key={lesson.id} lesson={lesson} completed={completed} unlocked={unlocked} onOpen={() => navigate(`/practice?lesson=${lesson.id}`)} />)}</div> : <div className="flex min-h-44 flex-col items-center justify-center px-5 py-8 text-center"><BookOpen size={22} className="mb-2 text-slate-400" /><p className="text-sm font-semibold text-[#0F172A]">No published lessons yet</p><p className="mt-1 text-xs text-[#64748B]">Your lessons will appear here when they’re ready.</p><button onClick={() => navigate("/lessons")} className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800">Browse lessons</button></div>}
      </article>

      <article className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm shadow-slate-900/[0.02]">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-4 sm:px-5"><div><h2 className="text-sm font-semibold text-[#0F172A]">Recent sessions</h2><p className="mt-1 text-xs text-[#64748B]">Your latest completed practice and tests</p></div><button onClick={() => navigate("/progress")} className="text-xs font-semibold text-blue-600 hover:text-blue-800">View progress</button></div>
        {latestResults.length ? <div className="divide-y divide-slate-100">{latestResults.map((session) => <div key={session.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${session.mode === "test" ? "bg-violet-50 text-violet-600" : "bg-blue-50 text-blue-600"}`}>{session.mode === "test" ? <Target size={17} /> : <BookOpen size={17} />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[#0F172A]">{session.label || (session.mode === "test" ? "Typing test" : "Practice session")}</p><p className="mt-0.5 text-xs text-[#64748B]">{recentDate(session.createdAt)} · {formatDuration(session.durationSeconds)}</p></div><div className="shrink-0 text-right"><p className="font-mono text-sm font-semibold text-blue-700">{session.wpm} <span className="text-[10px] font-medium text-[#94A3B8]">WPM</span></p><p className="text-xs text-emerald-700">{session.accuracy}% accuracy</p></div></div>)}</div> : <div className="flex min-h-44 flex-col items-center justify-center px-5 py-8 text-center"><span className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-600"><BookOpen size={18} /></span><p className="text-sm font-semibold text-[#0F172A]">Your first session is waiting</p><p className="mt-1 max-w-xs text-xs text-[#64748B]">Complete a short practice or typing test to start building your history.</p><button onClick={() => navigate("/practice")} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">Start practicing <ArrowRight size={13} /></button></div>}
      </article>
    </section>

    <footer className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs ${syncStatus === "error" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-[#E2E8F0] bg-white text-[#64748B]"}`} role="status">
      <span>Based on your saved typing sessions and published lessons.</span>
      <span className="inline-flex items-center gap-1.5">
        {syncStatus === "synced" ? <><Check size={14} className="text-emerald-600" />Learning data synced</> : null}
        {syncStatus === "syncing" ? "Syncing learning data…" : null}
        {syncStatus === "local" ? "Saved on this device · sign in to sync across devices" : null}
        {syncStatus === "error" ? `Saved on this device · sync issue: ${syncError || "connection unavailable"}` : null}
      </span>
    </footer>
  </div>;
}

function LessonRow({ lesson, completed, unlocked, onOpen }: { lesson: LessonRecord; completed: boolean; unlocked: boolean; onOpen: () => void }) {
  return <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${completed ? "bg-emerald-50 text-emerald-600" : unlocked ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"}`}>{completed ? <CheckCircle2 size={18} /> : <BookOpen size={17} />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[#0F172A]">{lesson.title}</p><p className="mt-0.5 truncate text-xs text-[#64748B]">{lesson.difficulty} · {lesson.durationMinutes} min</p></div><button onClick={onOpen} disabled={!unlocked} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${!unlocked ? "cursor-not-allowed bg-slate-100 text-slate-400" : completed ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-blue-600 text-white hover:bg-blue-700"}`}>{completed ? "Review" : unlocked ? <><Play size={12} fill="currentColor" />Start</> : "Locked"}</button></div>;
}
