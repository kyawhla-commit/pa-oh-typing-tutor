import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, BookOpen, Clock3, Flame, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLearningData, type PracticeResult } from "../../data/LearningContext";

const dateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

function getStreak(results: PracticeResult[]) {
  const activeDays = new Set(results.map((result) => dateKey(new Date(result.createdAt))));
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (!activeDays.has(dateKey(date))) date.setDate(date.getDate() - 1);

  let streak = 0;
  while (activeDays.has(dateKey(date))) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes} min`;
}

function EmptyChart({ title, message, onPractice }: { title: string; message: string; onPractice: () => void }) {
  return (
    <div className="flex h-[208px] flex-col items-center justify-center rounded-xl bg-slate-50 px-5 text-center">
      <TrendingUp size={20} className="mb-2 text-blue-500" />
      <p className="text-sm font-semibold text-[#0F172A]">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#64748B]">{message}</p>
      <button onClick={onPractice} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-blue-800">
        Start a session <ArrowRight size={13} />
      </button>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { learner, results, completedLessons, preferences } = useLearningData();
  const averageWpm = results.length ? Math.round(results.reduce((sum, result) => sum + result.wpm, 0) / results.length) : null;
  const averageAccuracy = results.length ? Math.round(results.reduce((sum, result) => sum + result.accuracy, 0) / results.length) : null;
  const totalWords = Math.round(results.reduce((sum, result) => sum + result.characters / 5, 0));
  const totalHours = (results.reduce((sum, result) => sum + result.durationSeconds, 0) / 3600).toFixed(1);

  const today = new Date();
  const todayWords = results
    .filter((result) => new Date(result.createdAt).toDateString() === today.toDateString())
    .reduce((sum, result) => sum + result.characters / 5, 0);
  const goalPercent = preferences.dailyGoal > 0 ? Math.min(100, Math.round((todayWords / preferences.dailyGoal) * 100)) : 0;
  const wordsRemaining = Math.max(0, Math.ceil(preferences.dailyGoal - todayWords));
  const streak = getStreak(results);
  const currentLevel = Math.floor(completedLessons.length / 3) + 1;

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weeklyResults = results.filter((result) => {
    const date = new Date(result.createdAt);
    return date >= weekStart && date < weekEnd;
  });
  const weekData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const sessions = weeklyResults.filter((result) => new Date(result.createdAt).toDateString() === date.toDateString());
    const minutes = sessions.reduce((sum, result) => sum + result.durationSeconds, 0) / 60;
    return {
      day: date.toLocaleDateString(undefined, { weekday: "short" }),
      wpm: sessions.length ? Math.round(sessions.reduce((sum, result) => sum + result.wpm, 0) / sessions.length) : null,
      minutes: Number(minutes.toFixed(1)),
      sessions: sessions.length,
    };
  });
  const latestResults = [...results].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const statCards = [
    { label: "Average Speed", value: averageWpm === null ? "—" : String(averageWpm), unit: "WPM", icon: Zap, color: "text-[#2563EB] bg-blue-50" },
    { label: "Accuracy", value: averageAccuracy === null ? "—" : String(averageAccuracy), unit: "%", icon: Target, color: "text-[#16A34A] bg-green-50" },
    { label: "Total Words", value: totalWords.toLocaleString(), unit: "typed", icon: BookOpen, color: "text-purple-600 bg-purple-50" },
    { label: "Practice Time", value: totalHours, unit: "hours", icon: Clock3, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="w-full space-y-6 p-5 sm:p-6 lg:p-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.14em] text-[#94A3B8]">Your learning overview</p>
          <h1 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">Welcome back, {learner?.name.split(" ")[0] || "Learner"} <span aria-hidden>👋</span></h1>
          <p className="mt-1 text-sm text-[#64748B]">A little practice today builds lasting typing speed.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-center">
            <div className="text-[10px] font-medium uppercase tracking-wide text-blue-600">Level</div>
            <div className="text-lg font-bold text-blue-700">{currentLevel}</div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2 text-center">
            <div className="text-[10px] font-medium uppercase tracking-wide text-amber-600">Daily goal</div>
            <div className="text-lg font-bold text-amber-700">{goalPercent}%</div>
          </div>
          <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-2 text-center">
            <div className="text-[10px] font-medium uppercase tracking-wide text-green-600">Streak</div>
            <div className="flex items-center justify-center gap-1 text-lg font-bold text-green-700"><Flame size={15} />{streak}</div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:gap-x-6 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#2563EB]"><Target size={18} /></div>
          <div><p className="text-xs text-[#64748B]">Current level</p><p className="text-sm font-semibold text-[#0F172A]">{completedLessons.length ? `Level ${currentLevel}` : "Getting started"}</p></div>
        </div>
        <div className="hidden h-8 w-px bg-[#E2E8F0] sm:block" />
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-green-50 text-[#16A34A]"><Zap size={18} /></div>
          <div><p className="text-xs text-[#64748B]">Words today</p><p className="text-sm font-semibold text-[#0F172A]">{Math.floor(todayWords)} / {preferences.dailyGoal}</p></div>
        </div>
        <div className="hidden h-8 w-px bg-[#E2E8F0] sm:block" />
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600"><Flame size={18} /></div>
          <div><p className="text-xs text-[#64748B]">Activity</p><p className="text-sm font-semibold text-[#0F172A]">{results.length ? `${new Set(results.map((result) => new Date(result.createdAt).toDateString())).size} active days` : "No sessions yet"}</p></div>
        </div>
        <div className="ml-auto flex min-w-36 flex-1 items-center gap-2 sm:max-w-56">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E2E8F0]" role="progressbar" aria-label="Daily word goal" aria-valuenow={goalPercent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-[#2563EB] transition-[width]" style={{ width: `${goalPercent}%` }} />
          </div>
          <span className="text-xs font-medium text-[#64748B]">{goalPercent}%</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {statCards.map(({ label, value, unit, icon: Icon, color }) => (
          <article key={label} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
            <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={18} /></div>
            <div className="text-2xl font-bold text-[#0F172A] sm:text-3xl">{value}</div>
            <div className="mt-0.5 text-xs text-[#64748B]">{label} · <span className="font-medium">{unit}</span></div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold text-[#0F172A]">Speed This Week</h2><p className="mt-0.5 text-xs text-[#94A3B8]">Average words per minute by day</p></div>
            <TrendingUp size={18} className="text-[#2563EB]" />
          </div>
          {weeklyResults.length ? (
            <ResponsiveContainer width="100%" height={208}>
              <LineChart data={weekData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} width={36} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} domain={[0, "dataMax + 10"]} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 12 }} formatter={(value) => [`${value ?? 0} WPM`, "Average speed"]} />
                <Line type="monotone" dataKey="wpm" connectNulls stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3, fill: "#2563EB" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart title="Your speed chart starts with one session" message="Complete a practice or typing test this week and your daily speed trend will appear here." onPractice={() => navigate("/practice")} />
          )}
        </article>

        <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold text-[#0F172A]">Weekly Practice</h2><p className="mt-0.5 text-xs text-[#94A3B8]">Time spent typing, by day</p></div>
            <Clock3 size={18} className="text-[#2563EB]" />
          </div>
          {weeklyResults.length ? (
            <>
              <ResponsiveContainer width="100%" height={172}>
                <BarChart data={weekData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis width={36} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 12 }} formatter={(value) => [`${value ?? 0} min`, "Practice time"]} />
                  <Bar dataKey="minutes" fill="#4F7DF3" radius={[6, 6, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-1 flex items-center justify-between text-xs text-[#64748B]">
                <span>Total: {(weekData.reduce((sum, day) => sum + day.minutes, 0)).toFixed(1)} min this week</span>
                <span>{weeklyResults.length} {weeklyResults.length === 1 ? "session" : "sessions"}</span>
              </div>
            </>
          ) : (
            <EmptyChart title="No practice time this week yet" message="Your weekly activity chart will fill in as you complete sessions." onPractice={() => navigate("/practice")} />
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.7fr)]">
        <article className="flex min-h-52 flex-col rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] p-5 text-white sm:p-6">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-blue-100"><Trophy size={14} />Today&apos;s challenge</div>
          <h2 className="text-lg font-bold">{goalPercent >= 100 ? "Daily goal complete!" : `Type ${wordsRemaining.toLocaleString()} more ${wordsRemaining === 1 ? "word" : "words"}`}</h2>
          <p className="mt-1 text-sm text-blue-100">{goalPercent >= 100 ? "Great work. Keep your momentum going with another short session." : `Reach your ${preferences.dailyGoal.toLocaleString()} word goal with a focused practice session.`}</p>
          <div className="mt-auto pt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-blue-100"><span>Today&apos;s progress</span><span>{Math.floor(todayWords).toLocaleString()} / {preferences.dailyGoal.toLocaleString()}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-blue-400/40"><div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${goalPercent}%` }} /></div>
            <button onClick={() => navigate("/practice")} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2563EB] transition-colors hover:bg-blue-50">
              {goalPercent >= 100 ? "Keep practicing" : "Continue practice"}<ArrowRight size={15} />
            </button>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-4 sm:px-5">
            <div><h2 className="text-sm font-semibold text-[#0F172A]">Recent Sessions</h2><p className="mt-0.5 text-xs text-[#94A3B8]">Your latest saved practice and tests</p></div>
            <button onClick={() => navigate("/progress")} className="text-xs font-semibold text-[#2563EB] hover:text-blue-800">View progress</button>
          </div>
          {latestResults.length ? (
            <div className="divide-y divide-[#F1F5F9]">
              {latestResults.map((session) => (
                <div key={session.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-5">
                  <time className="w-24 shrink-0 text-xs text-[#64748B]">{new Date(session.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time>
                  <span className="max-w-36 truncate rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">{session.label || (session.mode === "test" ? "Typing Test" : "Practice")}</span>
                  <div className="ml-auto flex items-center gap-2 text-xs sm:gap-3">
                    <span className="font-mono font-semibold text-[#2563EB]">{session.wpm} WPM</span>
                    <span className="text-green-600">{session.accuracy}%</span>
                    <span className="hidden text-[#94A3B8] sm:inline">{formatDuration(session.durationSeconds)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center px-5 py-6 text-center">
              <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-600"><BookOpen size={18} /></div>
              <p className="text-sm font-semibold text-[#0F172A]">Your first session is waiting</p>
              <p className="mt-1 max-w-sm text-xs text-[#64748B]">Complete a short practice or typing test to start building your history.</p>
              <button onClick={() => navigate("/practice")} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-blue-800">Start practicing <ArrowRight size={13} /></button>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
