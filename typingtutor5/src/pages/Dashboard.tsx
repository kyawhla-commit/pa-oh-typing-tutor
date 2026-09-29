import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Zap, Target, Clock, BookOpen, Trophy, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const speedData = [
  { day: 'Mon', wpm: 58 }, { day: 'Tue', wpm: 63 }, { day: 'Wed', wpm: 67 },
  { day: 'Thu', wpm: 65 }, { day: 'Fri', wpm: 70 }, { day: 'Sat', wpm: 68 },
  { day: 'Sun', wpm: 72 },
]

const activityData = [
  { day: 'Mon', min: 20 }, { day: 'Tue', min: 35 }, { day: 'Wed', min: 45 },
  { day: 'Thu', min: 25 }, { day: 'Fri', min: 50 }, { day: 'Sat', min: 60 },
  { day: 'Sun', min: 30 },
]

const statCards = [
  { label: 'Current Speed', value: '72', unit: 'WPM', icon: Zap, color: 'text-[#2563EB] bg-blue-50' },
  { label: 'Accuracy', value: '98', unit: '%', icon: Target, color: 'text-[#16A34A] bg-green-50' },
  { label: 'Total Words', value: '25K', unit: 'typed', icon: BookOpen, color: 'text-purple-600 bg-purple-50' },
  { label: 'Practice Time', value: '25', unit: 'hours', icon: Clock, color: 'text-amber-600 bg-amber-50' },
]

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Good morning, Alex 👋</h1>
        <p className="text-[#64748B] text-sm">Here's your progress overview for today.</p>
      </div>

      {/* Goal bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
            <Target size={18} />
          </div>
          <div>
            <div className="text-xs text-[#64748B]">Current Level</div>
            <div className="text-sm font-semibold text-[#0F172A]">Intermediate · Level 12</div>
          </div>
        </div>
        <div className="w-px h-8 bg-[#E2E8F0] hidden sm:block" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-[#16A34A]">
            <Zap size={18} />
          </div>
          <div>
            <div className="text-xs text-[#64748B]">Daily Goal</div>
            <div className="text-sm font-semibold text-[#0F172A]">450 / 600 words</div>
          </div>
        </div>
        <div className="w-px h-8 bg-[#E2E8F0] hidden sm:block" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <span className="text-base">🔥</span>
          </div>
          <div>
            <div className="text-xs text-[#64748B]">Practice Streak</div>
            <div className="text-sm font-semibold text-[#0F172A]">7 days running</div>
          </div>
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <div className="w-32 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-[#2563EB] rounded-full" />
            </div>
            75%
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
          <h3 className="font-semibold text-[#0F172A] mb-4 text-sm">Daily Practice (min)</h3>
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
          <h3 className="font-bold text-lg mb-1">Type 500 words</h3>
          <p className="text-blue-200 text-sm">Accuracy above 95%</p>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-32 h-1.5 bg-blue-400/40 rounded-full overflow-hidden">
              <div className="w-9/12 h-full bg-white rounded-full" />
            </div>
            <span className="text-xs font-medium">450 / 500</span>
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
