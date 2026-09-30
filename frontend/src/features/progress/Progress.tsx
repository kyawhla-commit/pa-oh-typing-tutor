import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Award, BookOpen, CalendarDays, Check, Clock3, Flame, Gauge, Target, TrendingUp, Zap } from "lucide-react";
import { useLearningData, type PracticeResult } from "../../data/LearningContext";
import {
  filterSessionsByPeriod,
  getCurrentPracticeStreak,
  getLongestPracticeStreak,
  getSessionsOnDay,
  localDateKey,
  startOfLocalDay,
  startOfLocalWeek,
  summarizeSessions,
  sumSessionSeconds,
} from "../../data/sessionAnalytics";

type Period = "7d" | "30d" | "all";
type SessionFilter = "all" | "practice" | "test";
type TimelinePoint = { key: string; label: string; speed: number | null; minutes: number; sessions: number };

const periodOptions: { value: Period; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

const dateKey = localDateKey;
const daySessions = getSessionsOnDay;
const sumSeconds = sumSessionSeconds;

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours} hr`;
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleDateString(undefined, options);
}

function buildTimeline(results: PracticeResult[], period: Period, now: Date): TimelinePoint[] {
  const bucketDates: Date[] = [];
  if (period === "all") {
    const firstResult = results.reduce<Date | null>((earliest, result) => {
      const date = new Date(result.createdAt);
      return !earliest || date < earliest ? date : earliest;
    }, null);
    const firstWeek = startOfLocalWeek(firstResult || now);
    const lastWeek = startOfLocalWeek(now);
    const cursor = new Date(firstWeek);
    while (cursor <= lastWeek) {
      bucketDates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
  } else {
    const days = period === "7d" ? 7 : 30;
    const firstDay = startOfLocalDay(now);
    firstDay.setDate(firstDay.getDate() - (days - 1));
    for (let index = 0; index < days; index += 1) {
      const date = new Date(firstDay);
      date.setDate(firstDay.getDate() + index);
      bucketDates.push(date);
    }
  }

  return bucketDates.map((date) => {
    const key = (period === "all" ? dateKey(startOfLocalWeek(date)) : dateKey(date)) || date.toISOString();
    const sessions = results.filter((result) => {
      const resultDate = new Date(result.createdAt);
      return period === "all" ? dateKey(startOfLocalWeek(resultDate)) === key : dateKey(resultDate) === key;
    });
    const summary = summarizeSessions(sessions);
    const label = period === "all"
      ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : period === "7d"
        ? date.toLocaleDateString(undefined, { weekday: "short" })
        : date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
    return {
      key, label,
      speed: summary.averageWpm,
      minutes: Number((summary.durationSeconds / 60).toFixed(1)),
      sessions: sessions.length,
    };
  });
}

function MetricCard({ label, value, detail, icon: Icon, tone }: {
  label: string; value: string; detail: string; icon: typeof Zap; tone: string;
}) {
  return <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5">
    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-medium text-[#64748B] sm:text-sm">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight text-[#0F172A] sm:text-3xl">{value}</p></div><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={18} /></span></div>
    <p className="mt-2 truncate text-xs text-[#94A3B8]">{detail}</p>
  </article>;
}

function ChartEmpty({ onStart }: { onStart: () => void }) {
  return <div className="flex h-[230px] flex-col items-center justify-center rounded-xl bg-slate-50 px-5 text-center"><TrendingUp size={22} className="mb-2 text-blue-500" /><p className="text-sm font-semibold text-[#0F172A]">Your progress starts with a session</p><p className="mt-1 max-w-xs text-xs leading-relaxed text-[#64748B]">Finish a practice or typing test to see your speed and activity trends here.</p><button onClick={onStart} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">Start practicing <ArrowRight size={13} /></button></div>;
}

export default function Progress() {
  const { results, syncStatus, syncError } = useLearningData();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("30d");
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");
  const now = new Date();
  const selectedResults = useMemo(() => filterSessionsByPeriod(results, period, now), [results, period]);
  const sortedSessions = useMemo(() => [...selectedResults].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [selectedResults]);
  const timeline = useMemo(() => buildTimeline(selectedResults, period, now), [selectedResults, period]);

  const selectedSummary = summarizeSessions(selectedResults);
  const lifetimeSummary = summarizeSessions(results);
  const averageWpm = selectedSummary.averageWpm ?? 0;
  const bestWpm = selectedSummary.bestWpm;
  const averageAccuracy = selectedSummary.averageAccuracy === null ? 0 : Math.round(selectedSummary.averageAccuracy);
  const practiceSeconds = selectedSummary.durationSeconds;
  const currentStreak = getCurrentPracticeStreak(results, now);
  const longestStreak = getLongestPracticeStreak(results);
  const activeDays = selectedSummary.activeDays;
  const totalWords = selectedSummary.words;
  const periodTitle = period === "7d" ? "Last 7 days" : period === "30d" ? "Last 30 days" : "All time";
  const filteredSessions = sortedSessions.filter((session) => sessionFilter === "all" || session.mode === sessionFilter);
  const hasSelectedActivity = selectedResults.length > 0;

  const heatmapWeeks = useMemo(() => {
    const today = startOfLocalDay(new Date());
    const periodStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const gridStart = startOfLocalWeek(periodStart);
    const cursor = new Date(gridStart);
    let daysInGrid = 0;
    while (cursor <= today) {
      daysInGrid += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    const weekCount = Math.ceil(daysInGrid / 7);
    return Array.from({ length: weekCount }, (_, weekIndex) => Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + weekIndex * 7 + dayIndex);
      if (date > today) return null;
      const sessions = daySessions(results, date);
      return { date, minutes: sumSeconds(sessions) / 60, sessions: sessions.length, key: dateKey(date) || date.toISOString() };
    }));
  }, [results]);

  const weekPractice = useMemo(() => {
    const monday = startOfLocalWeek(now);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const sessions = daySessions(results, date);
      return { date, label: date.toLocaleDateString(undefined, { weekday: "short" }), seconds: sumSeconds(sessions) };
    });
  }, [results]);
  const maxWeekSeconds = Math.max(60, ...weekPractice.map((day) => day.seconds));
  const thisWeekSeconds = weekPractice.reduce((sum, day) => sum + day.seconds, 0);

  const cards = [
    { label: "Average speed", value: hasSelectedActivity ? `${averageWpm} WPM` : "—", detail: `${periodTitle} · ${selectedResults.length} ${selectedResults.length === 1 ? "session" : "sessions"}`, icon: Zap, tone: "bg-blue-50 text-blue-600" },
    { label: "Best speed", value: hasSelectedActivity ? `${bestWpm} WPM` : "—", detail: "Personal best in this period", icon: Gauge, tone: "bg-violet-50 text-violet-600" },
    { label: "Accuracy", value: hasSelectedActivity ? `${averageAccuracy}%` : "—", detail: "Average across completed sessions", icon: Target, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Practice time", value: hasSelectedActivity ? formatDuration(practiceSeconds) : "—", detail: `${totalWords.toLocaleString()} words typed`, icon: Clock3, tone: "bg-amber-50 text-amber-600" },
  ];

  const heatColor = (minutes: number) => {
    if (!minutes) return "var(--muted)";
    if (minutes < 5) return "#DBEAFE";
    if (minutes < 15) return "#93C5FD";
    if (minutes < 30) return "#4F83F1";
    return "#1D4ED8";
  };

  return <div className="mx-auto w-full max-w-[1440px] space-y-5 p-4 pb-10 sm:p-6 lg:p-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="mb-1 text-xs font-semibold uppercase tracking-[.14em] text-[#94A3B8]">Learning analytics</p><h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">Your progress</h1><p className="mt-1 text-sm text-[#64748B]">Small, steady sessions add up. Here’s how your typing is improving.</p></div>
      <div className="inline-flex w-fit rounded-xl border border-[#E2E8F0] bg-white p-1 shadow-sm" role="group" aria-label="Progress time period">{periodOptions.map((option) => <button key={option.value} onClick={() => setPeriod(option.value)} aria-pressed={period === option.value} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${period === option.value ? "bg-blue-600 text-white shadow-sm" : "text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A]"}`}>{option.label}</button>)}</div>
    </header>

    <section className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-orange-500 shadow-sm"><Flame size={22} /></span><div><p className="text-xs font-medium text-[#64748B]">Current learning streak</p><p className="text-xl font-semibold text-[#0F172A]">{currentStreak} {currentStreak === 1 ? "day" : "days"}<span className="ml-2 text-sm font-normal text-[#64748B]">{currentStreak ? "Keep your momentum going" : "Start a session today to begin"}</span></p></div></div>
      <div className="flex flex-wrap gap-3 text-xs"><span className="rounded-full border border-white bg-white/80 px-3 py-1.5 text-[#475569]"><strong className="text-[#0F172A]">{longestStreak}</strong> day longest streak</span><span className="rounded-full border border-white bg-white/80 px-3 py-1.5 text-[#475569]"><strong className="text-[#0F172A]">{activeDays}</strong> active days · {periodTitle.toLowerCase()}</span></div>
    </section>

    <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label={`${periodTitle} summary`}>
      {cards.map((card) => <MetricCard key={card.label} {...card} />)}
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-[#0F172A]">Typing speed</h2><p className="mt-1 text-xs text-[#64748B]">Average WPM by {period === "all" ? "week" : "day"} · {periodTitle.toLowerCase()}</p></div>{hasSelectedActivity && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{averageWpm} WPM average</span>}</div>
        {hasSelectedActivity ? <div className="h-[230px] w-full" role="img" aria-label={`Typing speed chart for ${periodTitle.toLowerCase()}`}><ResponsiveContainer width="100%" height="100%"><LineChart data={timeline} margin={{ top: 12, right: 10, bottom: 0, left: -16 }}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} /><XAxis dataKey="label" interval="preserveStartEnd" minTickGap={22} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} width={42} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} domain={[0, "dataMax + 10"]} /><Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, fontSize: 12 }} formatter={(value) => [`${value ?? 0} WPM`, "Average speed"]} labelFormatter={(label) => `${period === "all" ? "Week of " : ""}${label}`} /><Line type="monotone" dataKey="speed" connectNulls stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3, fill: "#2563EB", strokeWidth: 0 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div> : <ChartEmpty onStart={() => navigate("/practice")} />}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-[#64748B]"><span>{selectedResults.length} completed {selectedResults.length === 1 ? "session" : "sessions"}</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-600" />Average speed</span></div>
      </article>

      <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5">
        <div className="mb-4 flex items-start justify-between"><div><h2 className="font-semibold text-[#0F172A]">This week</h2><p className="mt-1 text-xs text-[#64748B]">Time spent typing each day</p></div><CalendarDays size={18} className="text-blue-600" /></div>
        <div className="flex h-40 items-end gap-2 sm:gap-3">{weekPractice.map(({ date, label, seconds }) => <div key={date.toISOString()} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="h-4 whitespace-nowrap text-[10px] font-medium text-[#64748B]">{seconds ? formatDuration(seconds) : ""}</span><div className="flex h-28 w-full items-end"><div className={`w-full rounded-t-lg transition-colors ${seconds ? "bg-blue-500 hover:bg-blue-600" : "bg-slate-100"}`} style={{ height: seconds ? `${Math.max(8, Math.round((seconds / maxWeekSeconds) * 100))}%` : "4px" }} title={`${date.toLocaleDateString()}: ${formatDuration(seconds)}`} /></div><span className="text-[10px] text-[#64748B]">{label}</span></div>)}</div>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs"><span className="text-[#64748B]">Total practice</span><span className="font-semibold text-[#0F172A]">{formatDuration(thisWeekSeconds)}</span></div>
      </article>
    </section>

    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-semibold text-[#0F172A]">Practice consistency</h2><p className="mt-1 text-xs text-[#64748B]">Daily typing activity for the current and previous two months</p></div><div className="flex items-center gap-1.5 text-[10px] text-[#64748B]"><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <span key={level} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: ["var(--muted)", "#DBEAFE", "#93C5FD", "#4F83F1", "#1D4ED8"][level] }} />)}<span>More</span></div></div>
      <div className="overflow-x-auto pb-1"><div className="w-fit min-w-full"><div className="mb-1 grid gap-1" style={{ gridTemplateColumns: `24px repeat(${heatmapWeeks.length}, 14px)` }}><span />{heatmapWeeks.map((week, weekIndex) => { const monthStart = week.find((cell) => cell?.date.getDate() === 1); const firstWeek = weekIndex === 0; const monthDate = monthStart?.date ?? (firstWeek ? week.find((cell) => cell !== null)?.date : undefined); return <span key={weekIndex} className="h-4 whitespace-nowrap text-[10px] text-[#94A3B8]">{monthDate ? monthDate.toLocaleDateString(undefined, { month: "short" }) : ""}</span>; })}</div>
        <div className="flex gap-1"><div className="grid w-6 shrink-0 grid-rows-7 gap-1">{["Mon", "", "Wed", "", "Fri", "", "Sun"].map((weekday, row) => <span key={row} className="flex h-3.5 items-center text-[9px] text-[#94A3B8]">{weekday}</span>)}</div>{heatmapWeeks.map((week, weekIndex) => <div key={weekIndex} className="grid w-[14px] shrink-0 grid-rows-7 gap-1">{week.map((cell, dayIndex) => cell ? <div key={cell.key} role="img" title={`${cell.date.toLocaleDateString()}: ${cell.sessions ? `${cell.sessions} ${cell.sessions === 1 ? "session" : "sessions"}, ${formatDuration(cell.minutes * 60)}` : "No practice"}`} aria-label={`${cell.date.toLocaleDateString()}, ${cell.sessions ? `${cell.sessions} ${cell.sessions === 1 ? "session" : "sessions"}` : "no practice"}`} className="h-3.5 w-3.5 rounded-[3px] outline-offset-1 transition-transform hover:scale-110" style={{ backgroundColor: heatColor(cell.minutes) }} /> : <span key={`future-${weekIndex}-${dayIndex}`} className="h-3.5 w-3.5" aria-hidden="true" />)}</div>)}</div></div></div>
      <p className="mt-3 text-xs text-[#64748B]">{lifetimeSummary.activeDays} total active days · {longestStreak} day longest streak</p>
    </section>

    <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm shadow-slate-900/[0.02]">
      <div className="flex flex-col gap-3 border-b border-[#E2E8F0] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="font-semibold text-[#0F172A]">Session history</h2><p className="mt-1 text-xs text-[#64748B]">Completed sessions · {periodTitle.toLowerCase()}</p></div><div className="inline-flex w-fit rounded-lg bg-slate-100 p-1" role="group" aria-label="Filter sessions">{([{ value: "all", label: "All" }, { value: "practice", label: "Practice" }, { value: "test", label: "Tests" }] as const).map((filter) => <button key={filter.value} onClick={() => setSessionFilter(filter.value)} aria-pressed={sessionFilter === filter.value} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${sessionFilter === filter.value ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"}`}>{filter.label}</button>)}</div></div>
      {filteredSessions.length ? <div className="divide-y divide-slate-100">{filteredSessions.slice(0, 12).map((session) => <div key={session.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:px-5"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${session.mode === "test" ? "bg-violet-50 text-violet-600" : "bg-blue-50 text-blue-600"}`}>{session.mode === "test" ? <Award size={17} /> : <BookOpen size={17} />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[#0F172A]">{session.label || (session.mode === "test" ? "Typing test" : "Practice session")}</p><p className="mt-0.5 text-xs text-[#64748B]">{formatDate(session.createdAt, { month: "short", day: "numeric", year: "numeric" })} · {formatDuration(session.durationSeconds)}</p></div><div className="flex items-center gap-3 sm:gap-5"><span className="min-w-16 text-right"><strong className="block font-mono text-sm text-blue-700">{session.wpm}</strong><span className="text-[10px] text-[#94A3B8]">WPM</span></span><span className="min-w-14 text-right"><strong className="block font-mono text-sm text-emerald-700">{session.accuracy}%</strong><span className="text-[10px] text-[#94A3B8]">accuracy</span></span><span className="hidden min-w-16 text-right sm:block"><strong className="block font-mono text-sm text-[#475569]">{session.errors}</strong><span className="text-[10px] text-[#94A3B8]">errors</span></span></div></div>)}</div> : <div className="px-5 py-12 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-500"><BookOpen size={20} /></span><p className="mt-3 text-sm font-semibold text-[#0F172A]">{results.length ? "No sessions in this view" : "Your first session is waiting"}</p><p className="mt-1 text-xs text-[#64748B]">{results.length ? "Try another time period or session type." : "Complete a practice or typing test to start building your history."}</p>{!results.length && <button onClick={() => navigate("/practice")} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">Start practicing <ArrowRight size={13} /></button>}</div>}
      {filteredSessions.length > 12 && <div className="border-t border-slate-100 px-5 py-3 text-center text-xs text-[#64748B]">Showing the latest 12 of {filteredSessions.length} sessions</div>}
    </section>

    <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-xs leading-5 ${syncStatus === "error" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-[#64748B]"}`} role="status">
      <Check size={15} className={`mt-0.5 shrink-0 ${syncStatus === "error" ? "text-amber-600" : "text-emerald-600"}`} />
      {syncStatus === "synced" && "Progress uses your saved sessions synced with Supabase."}
      {syncStatus === "syncing" && "Progress uses your saved sessions. Syncing changes with Supabase…"}
      {syncStatus === "local" && "Progress uses completed sessions saved on this device. Sign in to sync across devices."}
      {syncStatus === "error" && <>Progress uses saved sessions on this device. Supabase sync needs attention: {syncError || "connection unavailable"}</>}
    </div>
  </div>;
}
