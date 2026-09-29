const wpmHistory = [
  { date: 'Aug 15', wpm: 55 }, { date: 'Aug 18', wpm: 58 }, { date: 'Aug 21', wpm: 60 },
  { date: 'Aug 25', wpm: 63 }, { date: 'Sep 1', wpm: 65 }, { date: 'Sep 5', wpm: 68 },
  { date: 'Sep 8', wpm: 66 }, { date: 'Sep 12', wpm: 70 }, { date: 'Sep 15', wpm: 72 },
  { date: 'Sep 18', wpm: 74 }, { date: 'Sep 20', wpm: 73 }, { date: 'Sep 22', wpm: 78 },
]

const practiceTime = [
  { day: 'Mon', hrs: 0.5 }, { day: 'Tue', hrs: 1.2 }, { day: 'Wed', hrs: 0.8 },
  { day: 'Thu', hrs: 1.5 }, { day: 'Fri', hrs: 0.7 }, { day: 'Sat', hrs: 2.0 }, { day: 'Sun', hrs: 1.3 },
]

const calendarData = Array.from({ length: 35 }, (_, i) => ({
  date: i + 1,
  practiced: Math.random() > 0.3,
  intensity: Math.random(),
}))

export default function Progress() {
  const maxWpm = Math.max(...wpmHistory.map(d => d.wpm))
  const maxHrs = Math.max(...practiceTime.map(d => d.hrs))

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Best Speed', value: '120 WPM', icon: '🏆', color: 'yellow' },
          { label: 'Average Speed', value: '75 WPM', icon: '⚡', color: 'blue' },
          { label: 'Accuracy', value: '98%', icon: '🎯', color: 'green' },
          { label: 'Total Practice', value: '50 hrs', icon: '⏰', color: 'purple' },
        ].map(stat => (
          <div key={stat.label} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <span className="text-xl">{stat.icon}</span>
            <p className="text-xl font-bold text-[var(--foreground)] mt-2">{stat.value}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* WPM line chart */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--foreground)]">WPM Improvement</h3>
          <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full">+23 WPM over 5 weeks</span>
        </div>
        <div className="relative" style={{ height: 160 }}>
          <svg viewBox={`0 0 ${(wpmHistory.length - 1) * 80} 120`} className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="wpmGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M 0 ${120 - (wpmHistory[0].wpm / maxWpm) * 100} ${wpmHistory.map((d, i) => `L ${i * 80} ${120 - (d.wpm / maxWpm) * 100}`).join(' ')} L ${(wpmHistory.length - 1) * 80} 120 L 0 120 Z`}
              fill="url(#wpmGrad)"
            />
            <polyline
              points={wpmHistory.map((d, i) => `${i * 80},${120 - (d.wpm / maxWpm) * 100}`).join(' ')}
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {wpmHistory.map((d, i) => (
              <g key={i}>
                <circle cx={i * 80} cy={120 - (d.wpm / maxWpm) * 100} r="4" fill="white" stroke="#2563EB" strokeWidth="2" />
              </g>
            ))}
          </svg>
        </div>
        <div className="flex justify-between mt-2">
          {wpmHistory.filter((_, i) => i % 3 === 0).map(d => (
            <span key={d.date} className="text-[10px] text-[var(--muted-foreground)]">{d.date}</span>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <h3 className="font-semibold text-[var(--foreground)] mb-4">Practice Time This Week</h3>
          <div className="flex items-end gap-2 h-32">
            {practiceTime.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-[var(--primary)] font-mono font-semibold">{d.hrs}h</span>
                <div
                  className="w-full bg-[var(--primary)] rounded-t-lg hover:opacity-90 transition-opacity"
                  style={{ height: `${(d.hrs / maxHrs) * 90}px` }}
                />
                <span className="text-[10px] text-[var(--muted-foreground)]">{d.day}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-3">Total: 8.0 hrs · Avg: 1.1 hrs/day</p>
        </div>

        {/* Practice calendar */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[var(--foreground)]">Practice Streak</h3>
            <span className="text-orange-500 font-bold text-sm">🔥 7 days</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {['S','M','T','W','T','F','S'].map(d => (
              <span key={d} className="text-[10px] text-[var(--muted-foreground)] text-center">{d}</span>
            ))}
            {calendarData.map((d, i) => (
              <div
                key={i}
                className="aspect-square rounded-sm transition-transform hover:scale-110"
                style={{
                  backgroundColor: d.practiced
                    ? `rgba(37, 99, 235, ${0.2 + d.intensity * 0.8})`
                    : 'var(--muted)',
                }}
                title={d.practiced ? `Day ${d.date}: practiced` : `Day ${d.date}: no activity`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-[10px] text-[var(--muted-foreground)]">
            <span>Less</span>
            {[0.2, 0.4, 0.6, 0.8, 1.0].map(v => (
              <div key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(37, 99, 235, ${v})` }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Recent sessions table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--foreground)]">Recent Sessions</h3>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {[
            { date: 'Sep 22, 2026', mode: 'Words', wpm: 78, acc: 98, duration: '15 min' },
            { date: 'Sep 21, 2026', mode: 'Sentences', wpm: 75, acc: 97, duration: '10 min' },
            { date: 'Sep 20, 2026', mode: 'Test', wpm: 73, acc: 99, duration: '1 min' },
            { date: 'Sep 19, 2026', mode: 'Paragraph', wpm: 70, acc: 96, duration: '20 min' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--muted)] transition-colors">
              <div className="text-sm text-[var(--muted-foreground)] w-28 flex-shrink-0">{s.date}</div>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{s.mode}</span>
              <div className="flex-1 flex items-center gap-4 justify-end">
                <span className="font-mono font-bold text-[var(--primary)] text-sm">{s.wpm} WPM</span>
                <span className="font-mono text-green-600 text-sm">{s.acc}%</span>
                <span className="text-xs text-[var(--muted-foreground)]">{s.duration}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
