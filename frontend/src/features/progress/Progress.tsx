import { useMemo } from "react";
import { useLearningData, type PracticeResult } from "../../data/LearningContext";

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const dayResults = (results: PracticeResult[], date: Date) => results.filter((result) => dayKey(new Date(result.createdAt)) === dayKey(date));
const totalSeconds = (results: PracticeResult[]) => results.reduce((sum, result) => sum + result.durationSeconds, 0);

function getStreak(activityDays: Set<string>) {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!activityDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (activityDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes} min`;
}

export default function Progress() {
  const { results } = useLearningData();
  const chronological = useMemo(() => [...results].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [results]);
  const trend = chronological.slice(-12);
  const latest = [...results].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const bestWpm = Math.max(0, ...results.map((result) => result.wpm));
  const averageWpm = results.length ? Math.round(results.reduce((sum, result) => sum + result.wpm, 0) / results.length) : 0;
  const averageAccuracy = results.length ? Math.round(results.reduce((sum, result) => sum + result.accuracy, 0) / results.length) : 0;
  const practiceHours = totalSeconds(results) / 3600;
  const activityDays = new Set(results.map((result) => dayKey(new Date(result.createdAt))));
  const streak = getStreak(activityDays);

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    const daysSinceMonday = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - daysSinceMonday + index);
    const sessions = dayResults(results, date);
    return { date, day: date.toLocaleDateString(undefined, { weekday: "short" }), seconds: totalSeconds(sessions) };
  });
  const weekSeconds = week.map((day) => day.seconds);
  const weekMax = Math.max(1, ...weekSeconds);
  const weekTotal = weekSeconds.reduce((sum, seconds) => sum + seconds, 0);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const calendar = [
    ...Array.from({ length: monthStart.getDay() }, () => null as Date | null),
    ...Array.from({ length: monthEnd.getDate() }, (_, index) => new Date(year, month, index + 1) as Date | null),
  ];
  while (calendar.length % 7) calendar.push(null);

  const cards = [
    { label: "Best Speed", value: `${bestWpm} WPM`, icon: "🏆" },
    { label: "Average Speed", value: `${averageWpm} WPM`, icon: "⚡" },
    { label: "Accuracy", value: `${averageAccuracy}%`, icon: "🎯" },
    { label: "Total Practice", value: `${practiceHours.toFixed(1)} hrs`, icon: "⏰" },
  ];

  const improvement = trend.length > 1 ? trend[trend.length - 1].wpm - trend[0].wpm : null;
  const chartPoints = trend.map((result, index) => {
    const x = trend.length > 1 ? (index / (trend.length - 1)) * 1000 : 500;
    const minWpm = Math.min(...trend.map((item) => item.wpm));
    const maxWpm = Math.max(...trend.map((item) => item.wpm));
    const range = maxWpm - minWpm || 1;
    const y = 145 - ((result.wpm - minWpm) / range) * 110;
    return { x, y, result };
  });
  const linePath = chartPoints.map(({ x, y }, index) => `${index ? "L" : "M"} ${x} ${y}`).join(" ");
  const areaPath = chartPoints.length ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} 160 L ${chartPoints[0].x} 160 Z` : "";
  const labelPoints = chartPoints.filter((_, index) => index === 0 || index === chartPoints.length - 1 || index % 3 === 0);

  return (
    <div className="space-y-5 p-5 pb-20 sm:p-6 lg:p-8 lg:pb-8">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-5">
            <span className="text-xl" aria-hidden>{card.icon}</span>
            <p className="mt-2 text-xl font-bold text-[var(--foreground)]">{card.value}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{card.label}</p>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-[var(--foreground)]">WPM Improvement</h2>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${improvement === null ? "bg-slate-100 text-slate-500" : improvement >= 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
            {improvement === null ? "Complete more sessions to see your trend" : `${improvement >= 0 ? "+" : ""}${improvement} WPM across the latest ${trend.length} sessions`}
          </span>
        </div>
        {chartPoints.length ? (
          <>
            <div className="h-40 w-full">
              <svg viewBox="0 0 1000 160" className="h-full w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label="Typing speed across recent sessions">
                <defs>
                  <linearGradient id="progress-wpm-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[35, 90, 145].map((y) => <line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="4 6" />)}
                <path d={areaPath} fill="url(#progress-wpm-fill)" />
                {chartPoints.length > 1 && <path d={linePath} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                {chartPoints.map(({ x, y, result }) => <circle key={result.id} cx={x} cy={y} r="5" fill="white" stroke="#2563EB" strokeWidth="3" vectorEffect="non-scaling-stroke"><title>{`${result.wpm} WPM · ${new Date(result.createdAt).toLocaleDateString()}`}</title></circle>)}
              </svg>
            </div>
            <div className="mt-2 flex justify-between gap-2">
              {labelPoints.map(({ result }) => <span key={result.id} className="text-[10px] text-[var(--muted-foreground)]">{new Date(result.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>)}
            </div>
          </>
        ) : (
          <div className="flex h-40 items-center justify-center px-6 text-center text-sm text-[var(--muted-foreground)]">Finish a practice session or typing test to see your speed trend.</div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="min-h-[270px] rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-5">
          <h2 className="mb-5 font-semibold text-[var(--foreground)]">Practice Time This Week</h2>
          <div className="flex h-32 items-end gap-2 sm:gap-3">
            {week.map(({ date, day, seconds }) => (
              <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="whitespace-nowrap text-[10px] font-mono font-semibold text-[var(--primary)]">{(seconds / 3600).toFixed(1)}h</span>
                <div className="w-full max-w-16 rounded-t-lg bg-[var(--primary)] transition-opacity hover:opacity-80" style={{ height: `${Math.max(seconds ? 8 : 3, (seconds / weekMax) * 90)}px` }} title={`${date.toLocaleDateString()}: ${formatDuration(seconds)}`} />
                <span className="text-[10px] text-[var(--muted-foreground)]">{day}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--muted-foreground)]">Total: {(weekTotal / 3600).toFixed(1)} hrs · Avg: {(weekTotal / 7 / 3600).toFixed(1)} hrs/day</p>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-[var(--foreground)]">Practice Streak</h2>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
            </div>
            <span className="text-sm font-bold text-orange-500">🔥 {streak} {streak === 1 ? "day" : "days"}</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {["S", "M", "T", "W", "T", "F", "S"].map((weekday, index) => <span key={`${weekday}-${index}`} className="pb-1 text-center text-[10px] text-[var(--muted-foreground)]">{weekday}</span>)}
            {calendar.map((date, index) => {
              if (!date) return <div key={`blank-${index}`} className="aspect-square" aria-hidden />;
              const sessions = dayResults(results, date);
              const seconds = totalSeconds(sessions);
              const opacity = seconds >= 1800 ? 1 : seconds >= 900 ? 0.78 : seconds >= 300 ? 0.58 : seconds > 0 ? 0.36 : 0;
              return (
                <div
                  key={date.toISOString()}
                  className={`aspect-square rounded-md transition-transform hover:scale-105 ${seconds ? "" : "bg-slate-100"}`}
                  style={seconds ? { backgroundColor: `rgba(37, 99, 235, ${opacity})` } : undefined}
                  title={`${date.toLocaleDateString()}: ${sessions.length ? `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}, ${formatDuration(seconds)}` : "No practice"}`}
                  aria-label={`${date.toLocaleDateString()}, ${sessions.length ? `${sessions.length} sessions` : "no practice"}`}
                />
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
            <span>Less</span>
            {[0, 0.36, 0.58, 0.78, 1].map((opacity) => <span key={opacity} className="h-3 w-3 rounded-sm" style={{ backgroundColor: opacity ? `rgba(37, 99, 235, ${opacity})` : "#F1F5F9" }} />)}
            <span>More</span>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
          <h2 className="font-semibold text-[var(--foreground)]">Recent Sessions</h2>
        </div>
        {latest.length ? (
          <div className="divide-y divide-[var(--border)]">
            {latest.slice(0, 10).map((session) => (
              <div key={session.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-slate-50 sm:px-5">
                <time className="w-28 shrink-0 text-sm text-[var(--muted-foreground)]">{new Date(session.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{session.label || (session.mode === "test" ? "Typing Test" : "Practice")}</span>
                <div className="ml-auto flex items-center gap-3 sm:gap-4">
                  <span className="whitespace-nowrap font-mono text-sm font-bold text-[var(--primary)]">{session.wpm} WPM</span>
                  <span className="whitespace-nowrap font-mono text-sm text-green-600">{session.accuracy}%</span>
                  <span className="whitespace-nowrap text-xs text-[var(--muted-foreground)]">{formatDuration(session.durationSeconds)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">Your completed sessions will appear here.</p>
        )}
      </section>
    </div>
  );
}
