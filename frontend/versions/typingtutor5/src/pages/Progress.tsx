import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Zap, Target, Clock, TrendingUp } from 'lucide-react'

const wpmData = [
  { week: 'W1', wpm: 45 }, { week: 'W2', wpm: 52 }, { week: 'W3', wpm: 58 },
  { week: 'W4', wpm: 61 }, { week: 'W5', wpm: 65 }, { week: 'W6', wpm: 68 },
  { week: 'W7', wpm: 70 }, { week: 'W8', wpm: 75 },
]

const practiceData = [
  { day: 'Mon', hours: 0.5 }, { day: 'Tue', hours: 1.2 }, { day: 'Wed', hours: 0.8 },
  { day: 'Thu', hours: 1.5 }, { day: 'Fri', hours: 0.3 }, { day: 'Sat', hours: 2.0 },
  { day: 'Sun', hours: 1.0 },
]

const calendarDays = Array.from({ length: 35 }, (_, i) => ({
  day: i + 1,
  active: [1,2,3,5,6,7,8,9,12,13,14,15,16,19,20,21,22,23,26,27].includes(i + 1),
}))

const statCards = [
  { label: 'Best Speed', value: '120', unit: 'WPM', icon: Zap, color: 'text-[#2563EB] bg-blue-50' },
  { label: 'Average Speed', value: '75', unit: 'WPM', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
  { label: 'Accuracy', value: '98%', unit: 'avg', icon: Target, color: 'text-[#16A34A] bg-green-50' },
  { label: 'Total Practice', value: '50', unit: 'hours', icon: Clock, color: 'text-amber-600 bg-amber-50' },
]

export default function Progress() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Progress</h1>
        <p className="text-sm text-[#64748B]">Your improvement over time at a glance.</p>
      </div>

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

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <h3 className="font-semibold text-[#0F172A] mb-4 text-sm">WPM Improvement</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={wpmData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[40, 80]} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 12 }}
                formatter={v => [`${v} WPM`, 'Speed']}
              />
              <Line type="monotone" dataKey="wpm" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3, fill: '#2563EB' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <h3 className="font-semibold text-[#0F172A] mb-4 text-sm">Practice Time (hrs)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={practiceData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 12 }}
                formatter={v => [`${v}h`, 'Practice']}
              />
              <Bar dataKey="hours" fill="#60A5FA" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <h3 className="font-semibold text-[#0F172A] mb-4 text-sm">Practice Streak · September 2026</h3>
        <div className="grid grid-cols-7 gap-1.5">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="text-center text-xs text-[#94A3B8] font-medium pb-1">{d}</div>
          ))}
          {calendarDays.map(({ day, active }) => (
            <div
              key={day}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${
                active
                  ? 'bg-[#2563EB] text-white'
                  : day <= 23
                  ? 'bg-[#F1F5F9] text-[#94A3B8]'
                  : 'bg-[#F8FAFC] text-[#CBD5E1]'
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-[#64748B]">
          <div className="w-3 h-3 rounded bg-[#2563EB]" /> Practiced
          <div className="w-3 h-3 rounded bg-[#F1F5F9] ml-2" /> Missed
        </div>
      </div>
    </div>
  )
}
