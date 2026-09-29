interface Props { onNavigate: (page: string) => void }

const recentActivity = [
  { date: 'Sep 24', lesson: 'Pa-O Alphabet Level 2', speed: '38 WPM', accuracy: '97%' },
  { date: 'Sep 23', lesson: 'Basic Vowels Practice', speed: '35 WPM', accuracy: '94%' },
  { date: 'Sep 22', lesson: 'Consonant Clusters', speed: '31 WPM', accuracy: '91%' },
  { date: 'Sep 21', lesson: 'Speed Test — 60s', speed: '40 WPM', accuracy: '96%' },
  { date: 'Sep 20', lesson: 'Pa-O Numbers', speed: '29 WPM', accuracy: '99%' },
]

export default function Dashboard({ onNavigate }: Props) {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto page-transition">
      {/* Welcome */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Good morning, Saw Maung 👋</h1>
          <p className="text-muted-foreground mt-1">You're on a <span className="text-accent font-semibold">7-day streak</span>. Keep it up!</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-accent px-4 py-2 rounded-xl text-sm font-semibold">
          🔥 7-day streak · Intermediate level
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Typing Speed', value: '38', unit: 'WPM', icon: '⚡', color: 'text-primary', bg: 'bg-blue-50', trend: '+5 this week' },
          { label: 'Accuracy', value: '96', unit: '%', icon: '🎯', color: 'text-secondary', bg: 'bg-green-50', trend: '+2% this week' },
          { label: 'Lessons Done', value: '24', unit: '', icon: '📚', color: 'text-accent', bg: 'bg-amber-50', trend: '3 this week' },
          { label: 'Practice Streak', value: '7', unit: 'days', icon: '🔥', color: 'text-error', bg: 'bg-red-50', trend: 'Personal best!' },
        ].map(({ label, value, unit, icon, color, bg, trend }) => (
          <div key={label} className="bg-card rounded-2xl p-5 border border-border hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center text-xl mb-3`}>{icon}</div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className={`font-mono font-bold text-2xl ${color}`}>{value}</span>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
            <div className="text-sm font-medium text-foreground mb-1">{label}</div>
            <div className="text-xs text-muted-foreground">{trend}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Continue Learning */}
        <div className="md:col-span-2 bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-foreground">Continue Learning</h2>
            <button onClick={() => onNavigate('lessons')} className="text-xs text-primary font-semibold hover:underline">View all →</button>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-foreground">Pa-O Alphabet Level 2</div>
                <div className="text-sm text-muted-foreground mt-0.5">Lesson 3 of 10 · Consonants</div>
              </div>
              <span className="text-xs bg-primary text-white px-2 py-1 rounded-full font-semibold">In Progress</span>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>30%</span>
              </div>
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full w-[30%] progress-bar"></div>
              </div>
            </div>
            <button onClick={() => onNavigate('practice')} className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Continue →
            </button>
          </div>

          {/* Next lessons */}
          <div className="space-y-2">
            {[
              { name: 'Pa-O Vowels Expansion', level: 'Beginner', done: true },
              { name: 'Tone Markers Practice', level: 'Beginner', done: false },
              { name: 'Word Formation Basics', level: 'Intermediate', done: false },
            ].map(({ name, level, done }) => (
              <div key={name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${done ? 'bg-secondary text-white' : 'bg-muted border-2 border-border text-muted-foreground'}`}>
                  {done ? '✓' : '○'}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{name}</div>
                  <div className="text-xs text-muted-foreground">{level}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions + mini stats */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-primary to-blue-700 rounded-2xl p-5 text-white">
            <div className="font-display font-bold text-base mb-1">Daily Goal</div>
            <div className="text-blue-100 text-sm mb-4">15 minutes practiced</div>
            <div className="h-2 bg-white/20 rounded-full mb-2">
              <div className="h-full bg-white rounded-full w-[60%]"></div>
            </div>
            <div className="text-xs text-blue-100">9 min left today</div>
          </div>

          <div className="bg-card rounded-2xl p-5 border border-border">
            <div className="font-display font-bold text-base text-foreground mb-3">Quick Practice</div>
            <div className="space-y-2">
              {[
                { label: '1 minute', sublabel: 'Quick warmup', page: 'test', color: 'bg-blue-50 text-primary' },
                { label: 'Alphabet drill', sublabel: 'Characters only', page: 'practice', color: 'bg-green-50 text-secondary' },
                { label: 'New challenge', sublabel: 'Today\'s test', page: 'test', color: 'bg-amber-50 text-accent' },
              ].map(({ label, sublabel, page, color }) => (
                <button key={label} onClick={() => onNavigate(page)} className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left`}>
                  <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-sm font-bold`}>▶</div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{label}</div>
                    <div className="text-xs text-muted-foreground">{sublabel}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-foreground">Recent Activity</h2>
          <button className="text-xs text-primary font-semibold hover:underline">View all →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Lesson</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Speed</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentActivity.map(({ date, lesson, speed, accuracy }) => (
                <tr key={date} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs">{date}</td>
                  <td className="px-5 py-3.5 font-medium text-foreground">{lesson}</td>
                  <td className="px-5 py-3.5 font-mono font-semibold text-primary">{speed}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${parseInt(accuracy) >= 95 ? 'bg-green-50 text-secondary' : 'bg-amber-50 text-accent'}`}>
                      {accuracy}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
