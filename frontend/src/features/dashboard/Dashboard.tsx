import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Zap, Target, Clock, BookOpen, Trophy, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLearningData } from '../../data/LearningContext'

export default function Dashboard() {
  const navigate = useNavigate()
  const { learner, results, completedLessons, preferences } = useLearningData()
  const latestResults = [...results].slice(0, 7).reverse()
  const speedData = latestResults.map((result) => ({ day: new Date(result.createdAt).toLocaleDateString(undefined, { weekday: 'short' }), wpm: result.wpm }))
  const activityData = latestResults.map((result) => ({ day: new Date(result.createdAt).toLocaleDateString(undefined, { weekday: 'short' }), min: Math.max(1, Math.round(result.durationSeconds / 60)) }))
  const averageWpm = results.length ? Math.round(results.reduce((sum, result) => sum + result.wpm, 0) / results.length) : 0
  const averageAccuracy = results.length ? Math.round(results.reduce((sum, result) => sum + result.accuracy, 0) / results.length) : 0
  const totalWords = Math.round(results.reduce((sum, result) => sum + result.characters / 5, 0))
  const totalHours = (results.reduce((sum, result) => sum + result.durationSeconds, 0) / 3600).toFixed(1)
  const todayWords = results.filter((result) => new Date(result.createdAt).toDateString() === new Date().toDateString()).reduce((sum, result) => sum + result.characters / 5, 0)
  const goalPercent = Math.min(100, Math.round((todayWords / preferences.dailyGoal) * 100))
  const statCards = [
    { label: 'Average Speed', value: String(averageWpm), unit: 'WPM', icon: Zap, color: 'text-[#2563EB] bg-blue-50' },
    { label: 'Accuracy', value: String(averageAccuracy), unit: '%', icon: Target, color: 'text-[#16A34A] bg-green-50' },
    { label: 'Total Words', value: totalWords.toLocaleString(), unit: 'typed', icon: BookOpen, color: 'text-purple-600 bg-purple-50' },
    { label: 'Practice Time', value: totalHours, unit: 'hours', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Welcome back, {learner?.name.split(' ')[0]} 👋</h1>
        <p className="text-[#64748B] text-sm">Your learning activity and goals are in one place.</p>
      </div>

      {/* Goal bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
            <Target size={18} />
          </div>
          <div>
            <div className="text-xs text-[#64748B]">Current Level</div>
            <div className="text-sm font-semibold text-[#0F172A]">{completedLessons.length ? `Level ${Math.floor(completedLessons.length / 3) + 1}` : 'Getting started'}</div>
          </div>
        </div>
        <div className="w-px h-8 bg-[#E2E8F0] hidden sm:block" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-[#16A34A]">
            <Zap size={18} />
          </div>
          <div>
            <div className="text-xs text-[#64748B]">Daily Goal</div>
            <div className="text-sm font-semibold text-[#0F172A]">{Math.round(todayWords)} / {preferences.dailyGoal} words</div>
          </div>
        </div>
        <div className="w-px h-8 bg-[#E2E8F0] hidden sm:block" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <span className="text-base">🔥</span>
          </div>
          <div>
            <div className="text-xs text-[#64748B]">Practice Activity</div>
            <div className="text-sm font-semibold text-[#0F172A]">{results.length ? `${new Set(results.map((result) => new Date(result.createdAt).toDateString())).size} active days` : 'No sessions yet'}</div>
          </div>
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <div className="w-32 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${goalPercent}%` }} />
            </div>
            {goalPercent}%
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, unit, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} />
            </div>
            <div className="text-2xl font-bold text-[#0F172A]">{value}</div>
            <div className="text-xs text-[#64748B] mt-0.5">{label} · <span className="font-medium">{unit}</span></div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <h3 className="font-semibold text-[#0F172A] mb-4 text-sm">Speed This Week</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={speedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[50, 80]} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 12 }}
                formatter={(v) => [`${v} WPM`, 'Speed']}
              />
              <Line type="monotone" dataKey="wpm" stroke="#2563EB" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#2563EB' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <h3 className="font-semibold text-[#0F172A] mb-4 text-sm">Recent Sessions (min)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={activityData} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 12 }}
                formatter={(v) => [`${v} min`, 'Practice']}
              />
              <Bar dataKey="min" fill="#60A5FA" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Challenge */}
      <div className="bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-2xl p-6 text-white flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-blue-200 mb-1">📅 Today's Challenge</div>
          <h3 className="font-bold text-lg mb-1">Reach your daily goal</h3>
          <p className="text-blue-200 text-sm">Practice a little every day to build speed and accuracy.</p>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-32 h-1.5 bg-blue-400/40 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-white" style={{ width: `${goalPercent}%` }} />
            </div>
            <span className="text-xs font-medium">{Math.round(todayWords)} / {preferences.dailyGoal}</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/practice')}
          className="bg-white text-[#2563EB] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2 flex-shrink-0"
        >
          Continue <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
