const weekData = [
  { day: 'Mon', min: 12, wpm: 32 },
  { day: 'Tue', min: 25, wpm: 35 },
  { day: 'Wed', min: 18, wpm: 33 },
  { day: 'Thu', min: 30, wpm: 38 },
  { day: 'Fri', min: 22, wpm: 37 },
  { day: 'Sat', min: 35, wpm: 40 },
  { day: 'Sun', min: 15, wpm: 36 },
]

const skills = [
  { name: 'Characters', pct: 85, color: 'bg-primary' },
  { name: 'Words', pct: 70, color: 'bg-secondary' },
  { name: 'Sentences', pct: 55, color: 'bg-accent' },
  { name: 'Speed (40 WPM)', pct: 95, color: 'bg-primary' },
  { name: 'Accuracy', pct: 96, color: 'bg-secondary' },
]

const badges = [
  { icon: '🔤', title: 'First 100 Characters', desc: 'Typed 100 Pa-O characters', earned: true },
  { icon: '🔥', title: '10-Day Streak', desc: '10 consecutive days', earned: true },
  { icon: '⚡', title: '50 WPM', desc: 'Reached 50 words per minute', earned: false },
  { icon: '🎯', title: 'Perfect Accuracy', desc: '100% accuracy in a test', earned: false },
  { icon: '📚', title: 'Lesson Master', desc: 'Complete 50 lessons', earned: false },
  { icon: '🏆', title: 'Top 10', desc: 'Reach top 10 leaderboard', earned: false },
]

const calendar: { [key: string]: number } = {
  '2026-09-01': 2, '2026-09-02': 1, '2026-09-04': 3, '2026-09-05': 2,
  '2026-09-07': 1, '2026-09-08': 3, '2026-09-09': 2, '2026-09-10': 3,
  '2026-09-11': 2, '2026-09-13': 1, '2026-09-14': 2, '2026-09-15': 3,
  '2026-09-16': 2, '2026-09-17': 3, '2026-09-18': 1, '2026-09-20': 2,
  '2026-09-21': 3, '2026-09-22': 2, '2026-09-23': 3, '2026-09-24': 2,
}

function CalendarDay({ date, intensity }: { date: string; intensity: number }) {
  const colors = ['bg-muted', 'bg-blue-100', 'bg-blue-300', 'bg-primary']
  return (
    <div className={`w-4 h-4 rounded-sm ${colors[intensity]} transition-all hover:scale-125 cursor-pointer`} title={date}></div>
  )
}

export default function ProgressDashboard() {
  const maxMin = Math.max(...weekData.map(d => d.min))

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(2026, 8, i + 1)
    const key = `2026-09-${String(i + 1).padStart(2, '0')}`
    return { date: key, intensity: calendar[key] ?? 0 }
  })

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto page-transition">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Progress Dashboard</h1>
        <p className="text-muted-foreground mt-1">Track your Pa-O typing journey</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total Practice Time', value: '14.5 hrs', icon: '⏱', color: 'bg-blue-50 text-primary' },
          { label: 'Total Characters Typed', value: '48,320', icon: '⌨', color: 'bg-green-50 text-secondary' },
          { label: 'Best Speed', value: '42 WPM', icon: '⚡', color: 'bg-amber-50 text-accent' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-2xl flex-shrink-0`}>{icon}</div>
            <div>
              <div className="font-mono font-bold text-xl text-foreground">{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Weekly chart */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-display font-bold text-lg text-foreground mb-1">Weekly Practice</h2>
          <p className="text-xs text-muted-foreground mb-5">Minutes practiced per day</p>
          <div className="flex items-end gap-3 h-32">
            {weekData.map(({ day, min }) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs font-mono text-muted-foreground">{min}</div>
                <div
                  className="w-full bg-primary rounded-t-lg transition-all hover:bg-blue-700 cursor-pointer"
                  style={{ height: `${(min / maxMin) * 80}px` }}
                ></div>
                <div className="text-xs text-muted-foreground">{day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* WPM trend */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-display font-bold text-lg text-foreground mb-1">Typing Speed Trend</h2>
          <p className="text-xs text-muted-foreground mb-5">WPM over this week</p>
          <svg viewBox="0 0 280 100" className="w-full h-32">
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* area */}
            <path
              d={`M ${weekData.map((d, i) => `${i * 46 + 5},${100 - (d.wpm - 28) * 4}`).join(' L ')} L ${(weekData.length - 1) * 46 + 5},100 L 5,100 Z`}
              fill="url(#lineGrad)"
            />
            {/* line */}
            <polyline
              points={weekData.map((d, i) => `${i * 46 + 5},${100 - (d.wpm - 28) * 4}`).join(' ')}
              fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            />
            {/* dots */}
            {weekData.map((d, i) => (
              <circle key={d.day} cx={i * 46 + 5} cy={100 - (d.wpm - 28) * 4} r="3.5" fill="var(--primary)" />
            ))}
          </svg>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            {weekData.map(d => <span key={d.day}>{d.day}</span>)}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Skills */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-display font-bold text-lg text-foreground mb-5">Skill Breakdown</h2>
          <div className="space-y-4">
            {skills.map(({ name, pct, color }) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-foreground">{name}</span>
                  <span className="font-mono text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full progress-bar`} style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar heatmap */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-display font-bold text-lg text-foreground mb-1">Practice Calendar</h2>
          <p className="text-xs text-muted-foreground mb-4">September 2026 · Darker = more practice</p>
          <div className="grid grid-cols-7 gap-1.5 mb-3">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-xs text-muted-foreground text-center font-semibold">{d}</div>
            ))}
          </div>
          {/* offset for Sep 1 = Tuesday */}
          <div className="grid grid-cols-7 gap-1.5">
            {[null, null].map((_, i) => <div key={`e${i}`} />)}
            {days.map(({ date, intensity }) => (
              <CalendarDay key={date} date={date} intensity={intensity} />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span>Less</span>
            {[0, 1, 2, 3].map(i => <div key={i} className={`w-3 h-3 rounded-sm ${['bg-muted', 'bg-blue-100', 'bg-blue-300', 'bg-primary'][i]}`}></div>)}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-display font-bold text-lg text-foreground mb-5">Achievements</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {badges.map(({ icon, title, desc, earned }) => (
            <div key={title} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${earned ? 'border-amber-200 bg-amber-50' : 'border-border bg-muted/30 opacity-60'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${earned ? 'bg-amber-100' : 'bg-muted'}`}>
                {earned ? icon : '🔒'}
              </div>
              <div>
                <div className={`text-sm font-semibold ${earned ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
