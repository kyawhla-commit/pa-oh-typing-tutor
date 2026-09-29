import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { WPM_TREND, DAILY_PRACTICE, WEAK_KEYS, USER } from '../data/mockData';

const keyboardData = WEAK_KEYS.map(k => ({ key: k.key, value: 100 - k.errorRate }));

export default function Progress() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Progress</h1>
        <p className="text-slate-500 text-sm mt-0.5">Your typing analytics and improvement trends</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Current WPM', value: USER.currentWpm, note: '↑ +31 from start', noteColor: 'text-emerald-500' },
          { label: 'Best WPM', value: USER.bestWpm, note: 'Personal record', noteColor: 'text-slate-400' },
          { label: 'Avg Accuracy', value: `${USER.accuracy}%`, note: 'All time', noteColor: 'text-slate-400' },
          { label: 'Total Sessions', value: USER.totalSessions, note: `${USER.totalWords.toLocaleString()} words`, noteColor: 'text-slate-400' },
        ].map(({ label, value, note, noteColor }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-slate-500 text-sm mb-2">{label}</p>
            <p className="text-3xl font-semibold text-slate-900 font-mono">{value}</p>
            <p className={`text-xs mt-1 ${noteColor}`}>{note}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* WPM trend */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-semibold text-slate-900 mb-1">WPM Over Time</h2>
          <p className="text-xs text-slate-400 mb-5">12-week history</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={WPM_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} domain={[30, 90]} />
              <Tooltip contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 12 }} />
              <Line type="monotone" dataKey="wpm" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3, fill: '#2563EB' }} name="WPM" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Accuracy trend */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-semibold text-slate-900 mb-1">Accuracy Trend</h2>
          <p className="text-xs text-slate-400 mb-5">12-week history</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={WPM_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} domain={[80, 100]} />
              <Tooltip contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 12 }} />
              <Line type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981' }} name="Accuracy %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily practice */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-semibold text-slate-900 mb-1">Daily Practice Time</h2>
          <p className="text-xs text-slate-400 mb-5">Minutes per day this week</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={DAILY_PRACTICE} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="minutes" fill="#2563EB" radius={[6, 6, 0, 0]} name="Minutes" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weak keys */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-semibold text-slate-900 mb-1">Key Proficiency</h2>
          <p className="text-xs text-slate-400 mb-5">Accuracy score per key (100 = perfect)</p>
          <div className="space-y-3">
            {WEAK_KEYS.map(({ key, errorRate }) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-mono font-semibold text-slate-700 flex-shrink-0">
                  {key}
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${100 - errorRate}%`,
                        backgroundColor: errorRate > 12 ? '#EF4444' : errorRate > 7 ? '#F59E0B' : '#10B981'
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-400 w-10 text-right">{100 - errorRate}%</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">Practice these keys more in lessons</p>
        </div>
      </div>
    </div>
  );
}
