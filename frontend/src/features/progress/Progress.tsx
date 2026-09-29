import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock, Target, TrendingUp, Zap } from "lucide-react";
import { useLearningData } from "../../data/LearningContext";

export default function Progress() {
  const { results } = useLearningData();
  const ordered = [...results].reverse();
  const latest = results.slice(0, 12).reverse();
  const averageWpm = results.length ? Math.round(results.reduce((sum, result) => sum + result.wpm, 0) / results.length) : 0;
  const averageAccuracy = results.length ? Math.round(results.reduce((sum, result) => sum + result.accuracy, 0) / results.length) : 0;
  const bestWpm = Math.max(0, ...results.map((result) => result.wpm));
  const minutes = Math.round(results.reduce((sum, result) => sum + result.durationSeconds, 0) / 60);
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dayResults = results.filter((result) => new Date(result.createdAt).toDateString() === date.toDateString());
    return { day: date.toLocaleDateString(undefined, { weekday: "short" }), minutes: Math.round(dayResults.reduce((sum, result) => sum + result.durationSeconds, 0) / 60) };
  });
  const activeDates = new Set(results.map((result) => new Date(result.createdAt).toDateString()));
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dayCount = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const calendar = [...Array(monthStart.getDay()).fill(null), ...Array.from({ length: dayCount }, (_, index) => index + 1)];
  const cards = [
    { label: "Best speed", value: bestWpm, unit: "WPM", icon: Zap, color: "text-[#2563EB] bg-blue-50" },
    { label: "Average speed", value: averageWpm, unit: "WPM", icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
    { label: "Accuracy", value: `${averageAccuracy}%`, unit: "average", icon: Target, color: "text-[#16A34A] bg-green-50" },
    { label: "Practice time", value: minutes, unit: "minutes", icon: Clock, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="max-w-5xl p-6 lg:p-8">
      <header className="mb-6"><h1 className="mb-1 text-2xl font-bold text-[#0F172A]">Progress</h1><p className="text-sm text-[#64748B]">Results from your practice sessions and typing tests.</p></header>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, unit, icon: Icon, color }) => <article key={label} className="rounded-2xl border border-[#E2E8F0] bg-white p-5"><div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={18}/></div><div className="text-2xl font-bold text-[#0F172A]">{value}</div><div className="mt-0.5 text-xs text-[#64748B]">{label} · <span className="font-medium">{unit}</span></div></article>)}
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5"><h2 className="mb-4 text-sm font-semibold text-[#0F172A]">Speed by session</h2>{results.length ? <ResponsiveContainer width="100%" height={210}><LineChart data={latest}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/><XAxis dataKey="createdAt" tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false}/><YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false}/><Tooltip labelFormatter={(date) => new Date(String(date)).toLocaleString()} formatter={(value) => [`${value} WPM`, "Speed"]}/><Line type="monotone" dataKey="wpm" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }}/></LineChart></ResponsiveContainer> : <EmptyChart message="Complete a practice session or test to see your speed trend."/>}</section>
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5"><h2 className="mb-4 text-sm font-semibold text-[#0F172A]">Practice time · last 7 days</h2><ResponsiveContainer width="100%" height={210}><BarChart data={week}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/><XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false}/><YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false}/><Tooltip formatter={(value) => [`${value} min`, "Practice"]}/><Bar dataKey="minutes" fill="#60A5FA" radius={[6, 6, 0, 0]}/></BarChart></ResponsiveContainer></section>
      </div>
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-[#0F172A]">Practice calendar · {monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
        <p className="mb-4 text-xs text-[#64748B]">{activeDates.size} days with saved activity</p>
        <div className="grid grid-cols-7 gap-1.5">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="pb-1 text-center text-xs font-medium text-[#94A3B8]">{day}</div>)}{calendar.map((day, index) => { const active = day !== null && activeDates.has(new Date(new Date().getFullYear(), new Date().getMonth(), day).toDateString()); return <div key={`${day ?? "blank"}-${index}`} className={`flex aspect-square items-center justify-center rounded-lg text-xs ${day === null ? "" : active ? "bg-[#2563EB] font-semibold text-white" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>{day}</div>; })}</div>
      </section>
      {ordered.length > 0 && <p className="mt-4 text-xs text-[#94A3B8]">Your charts update from {results.length} saved {results.length === 1 ? "session" : "sessions"}.</p>}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-[210px] items-center justify-center px-6 text-center text-sm text-[#94A3B8]">{message}</div>;
}
