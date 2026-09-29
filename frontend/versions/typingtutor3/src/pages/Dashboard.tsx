import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import { USER, WPM_TREND, DAILY_PRACTICE, ACHIEVEMENTS } from '../data/mockData';

const recentSessions = [
  { date: 'Today, 2:14 PM', mode: 'Practice', wpm: 73, accuracy: 94, duration: '5 min' },
  { date: 'Today, 9:30 AM', mode: 'Test 60s', wpm: 81, accuracy: 96, duration: '1 min' },
  { date: 'Yesterday', mode: 'Lesson: Common Words', wpm: 68, accuracy: 98, duration: '10 min' },
  { date: 'Yesterday', mode: 'Test 30s', wpm: 79, accuracy: 93, duration: '30 s' },
  { date: '2 days ago', mode: 'Practice', wpm: 71, accuracy: 91, duration: '8 min' },
];

export default function Dashboard() {
  const earned = ACHIEVEMENTS.filter(a => a.earned);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Good afternoon 👋</h1>
          <p className="text-slate-500 mt-0.5 text-sm">You're on a <span className="text-orange-500 font-semibold">{USER.streak}-day streak</span> — keep it up!</p>
        </div>
        <Link
          to="/practice"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2"
        >
          <span>⌨</span> Start Practicing
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Best WPM" value={USER.bestWpm} sub="Personal record" icon="⚡" accent="blue" />
        <StatCard label="Accuracy" value={`${USER.accuracy}%`} sub="All-time average" icon="🎯" accent="green" />
        <StatCard label="Total Words" value={USER.totalWords.toLocaleString()} sub="Typed in all sessions" icon="📝" accent="purple" />
        <StatCard label="Practice Streak" value={`${USER.streak} days`} sub="Current streak" icon="🔥" accent="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* WPM Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-slate-900">WPM Trend</h2>
              <p className="text-slate-500 text-xs mt-0.5">Last 12 weeks</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-500 text-sm font-medium">
              <span>↑</span> +31 WPM
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={WPM_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} domain={[30, 90]} />
              <Tooltip
                contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#475569', fontWeight: 500 }}
              />
              <Line type="monotone" dataKey="wpm" stroke="#2563EB" strokeWidth={2.5} dot={false} name="WPM" />
              <Line type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={2} dot={false} name="Accuracy %" strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Daily goal */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
          <h2 className="font-semibold text-slate-900 mb-1">Daily Goal</h2>
          <p className="text-slate-500 text-xs mb-6">{USER.dailyGoal} minutes target</p>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#F1F5F9" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none" stroke="#2563EB" strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(22 / 30) * 314} 314`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-slate-900">22</span>
                <span className="text-xs text-slate-400">of 30 min</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4 text-center">8 minutes left to reach your daily goal</p>
          </div>
          <Link to="/practice" className="mt-4 block text-center bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-sm py-2.5 rounded-xl transition-colors">
            Continue Practice →
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Recent sessions */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-5">Recent Sessions</h2>
          <div className="space-y-3">
            {recentSessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{s.mode}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.date} · {s.duration}</p>
                </div>
                <div className="flex gap-4 text-right">
                  <div>
                    <p className="text-sm font-semibold text-blue-600 font-mono">{s.wpm}</p>
                    <p className="text-xs text-slate-400">WPM</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-600 font-mono">{s.accuracy}%</p>
                    <p className="text-xs text-slate-400">Acc</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">Recent Achievements</h2>
            <Link to="/achievements" className="text-xs text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          <div className="space-y-3">
            {earned.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {a.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.title}</p>
                  <p className="text-xs text-slate-400">{a.earnedAt}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">{earned.length}/{ACHIEVEMENTS.length} earned</span>
            <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(earned.length / ACHIEVEMENTS.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
