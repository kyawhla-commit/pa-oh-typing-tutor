import type { Page } from '../App'

interface Props {
  navigate: (p: Page) => void
}

const weekData = [
  { day: 'Mon', wpm: 68, min: 25 },
  { day: 'Tue', wpm: 72, min: 30 },
  { day: 'Wed', wpm: 70, min: 20 },
  { day: 'Thu', wpm: 75, min: 35 },
  { day: 'Fri', wpm: 72, min: 28 },
  { day: 'Sat', wpm: 78, min: 40 },
  { day: 'Sun', wpm: 76, min: 32 },
]

const speedHistory = [55, 60, 63, 68, 65, 70, 72, 69, 73, 72, 76, 78]

export default function Dashboard({ navigate }: Props) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const maxWpm = Math.max(...weekData.map(d => d.wpm))
  const maxMin = Math.max(...weekData.map(d => d.min))
  const maxSpeed = Math.max(...speedHistory)

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">{greeting}, Alex 👋</h2>
          <p className="text-[var(--muted-foreground)] mt-1 text-sm">Keep up the great work. You're on a 7-day streak!</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-center">
            <p className="text-xs text-[var(--muted-foreground)]">Level</p>
            <p className="text-lg font-bold text-[var(--primary)]">12</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5 text-center">
            <p className="text-xs text-[var(--muted-foreground)]">Daily Goal</p>
            <p className="text-lg font-bold text-orange-600">68%</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 text-center">
            <p className="text-xs text-[var(--muted-foreground)]">Streak</p>
            <p className="text-lg font-bold text-green-600">🔥 7</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Current Speed', value: '72', unit: 'WPM', icon: '⚡', color: 'blue', change: '+4 WPM' },
          { label: 'Accuracy', value: '98', unit: '%', icon: '🎯', color: 'green', change: '+0.5%' },
          { label: 'Total Words', value: '25K', unit: '', icon: '📝', color: 'purple', change: '+1.2K' },
          { label: 'Practice Time', value: '25', unit: 'hrs', icon: '⏰', color: 'orange', change: '+2h' },
        ].map(stat => (
          <div key={stat.label} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xl">{stat.icon}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                stat.color === 'green' ? 'bg-green-50 text-green-600' :
                stat.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                'bg-orange-50 text-orange-600'
              }`}>{stat.change}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--foreground)]">
              {stat.value}<span className="text-sm font-normal text-[var(--muted-foreground)] ml-1">{stat.unit}</span>
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Speed improvement */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5">
          <h3 className="font-semibold text-[var(--foreground)] mb-4">Speed Improvement</h3>
          <div className="relative h-32">
            <svg viewBox={`0 0 ${speedHistory.length * 40} 100`} className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Area */}
              <path
                d={`M 0 ${100 - (speedHistory[0] / maxSpeed) * 90} ${speedHistory.map((v, i) => `L ${i * 40} ${100 - (v / maxSpeed) * 90}`).join(' ')} L ${(speedHistory.length - 1) * 40} 100 L 0 100 Z`}
                fill="url(#speedGrad)"
              />
              {/* Line */}
              <polyline
                points={speedHistory.map((v, i) => `${i * 40},${100 - (v / maxSpeed) * 90}`).join(' ')}
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dots */}
              {speedHistory.map((v, i) => (
                <circle key={i} cx={i * 40} cy={100 - (v / maxSpeed) * 90} r="3" fill="#2563EB" />
              ))}
            </svg>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-[var(--muted-foreground)]">
            <span>12 sessions</span>
            <span className="font-semibold text-[var(--primary)]">Peak: {maxSpeed} WPM</span>
          </div>
        </div>

        {/* Weekly activity */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5">
          <h3 className="font-semibold text-[var(--foreground)] mb-4">Weekly Practice</h3>
          <div className="flex items-end gap-2 h-32">
            {weekData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-0.5">
                  <div
                    className="w-full bg-[var(--primary)] rounded-t-md opacity-80 transition-all hover:opacity-100"
                    style={{ height: `${(d.min / maxMin) * 100}px` }}
                    title={`${d.min} min`}
                  />
                </div>
                <span className="text-[10px] text-[var(--muted-foreground)]">{d.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-[var(--muted-foreground)]">
            <span>Total: 210 min this week</span>
            <span className="font-semibold text-green-600">+15% vs last week</span>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Daily challenge */}
        <div className="bg-gradient-to-br from-[var(--primary)] to-blue-700 rounded-2xl p-5 text-white lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎯</span>
            <h3 className="font-semibold">Today's Challenge</h3>
          </div>
          <p className="text-2xl font-bold mb-1">Type 500 words</p>
          <p className="text-blue-100 text-sm mb-4">Accuracy above 95%</p>
          <div className="bg-white/20 rounded-full h-2 mb-2">
            <div className="bg-white rounded-full h-2 w-[68%]" />
          </div>
          <div className="flex justify-between text-xs text-blue-100">
            <span>340 / 500 words</span>
            <span>68%</span>
          </div>
          <button
            onClick={() => navigate('practice')}
            className="mt-4 w-full bg-white text-[var(--primary)] rounded-xl py-2 text-sm font-semibold hover:bg-blue-50 transition-colors"
          >
            Continue Practice
          </button>
        </div>

        {/* Recent lessons */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--foreground)]">Recent Lessons</h3>
            <button onClick={() => navigate('lessons')} className="text-xs text-[var(--primary)] hover:underline font-medium">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {[
              { title: 'Home Row Keys', progress: 100, status: 'completed', duration: '15 min' },
              { title: 'Top Row Keys', progress: 75, status: 'in-progress', duration: '20 min' },
              { title: 'Bottom Row Keys', progress: 0, status: 'locked', duration: '25 min' },
            ].map((lesson, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--muted)] transition-colors">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                  lesson.status === 'completed' ? 'bg-green-100 text-green-600' :
                  lesson.status === 'in-progress' ? 'bg-blue-100 text-[var(--primary)]' :
                  'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}>
                  {lesson.status === 'completed' ? '✓' : lesson.status === 'in-progress' ? '▶' : '🔒'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)]">{lesson.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-[var(--muted)] rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${lesson.status === 'completed' ? 'bg-green-500' : 'bg-[var(--primary)]'}`}
                        style={{ width: `${lesson.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)]">{lesson.progress}%</span>
                  </div>
                </div>
                <span className="text-xs text-[var(--muted-foreground)] flex-shrink-0">{lesson.duration}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
