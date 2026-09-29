const achievements = [
  { icon: '🚀', title: 'First Keystroke', desc: 'Completed your first typing session.', unlocked: true, date: 'Aug 12, 2026' },
  { icon: '⚡', title: 'First 30 WPM', desc: 'Reached 30 words per minute.', unlocked: true, date: 'Aug 15, 2026' },
  { icon: '🔥', title: '7 Day Streak', desc: 'Practiced 7 days in a row.', unlocked: true, date: 'Sep 22, 2026' },
  { icon: '🎯', title: 'Accuracy Master', desc: 'Achieved 99% accuracy in a test.', unlocked: true, date: 'Sep 10, 2026' },
  { icon: '📚', title: 'Lesson Complete', desc: 'Finished the Home Row Keys lesson.', unlocked: true, date: 'Aug 18, 2026' },
  { icon: '⏱️', title: 'Marathon Typist', desc: 'Practiced for 1 hour without stopping.', unlocked: false, date: null },
  { icon: '🏆', title: 'Speed Runner', desc: 'Reach 100 words per minute.', unlocked: false, date: null },
  { icon: '💎', title: 'Diamond Fingers', desc: 'Complete all beginner lessons.', unlocked: false, date: null },
  { icon: '🌙', title: 'Night Owl', desc: 'Practice after midnight.', unlocked: false, date: null },
  { icon: '🎮', title: 'Code Wizard', desc: 'Complete a coding lesson.', unlocked: false, date: null },
  { icon: '📈', title: 'Consistent', desc: 'Improve WPM for 5 consecutive sessions.', unlocked: false, date: null },
  { icon: '👑', title: 'TypeMaster', desc: 'Reach 120 WPM with 98% accuracy.', unlocked: false, date: null },
]

export default function Achievements() {
  const unlocked = achievements.filter(a => a.unlocked).length

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Achievements</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{unlocked} of {achievements.length} unlocked</p>
        </div>
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2">
          <span className="text-xl">🏆</span>
          <div>
            <p className="text-sm font-bold text-yellow-800">{unlocked} badges</p>
            <p className="text-xs text-yellow-600">earned</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-[var(--foreground)]">Overall Progress</span>
          <span className="text-[var(--muted-foreground)]">{Math.round((unlocked / achievements.length) * 100)}%</span>
        </div>
        <div className="bg-[var(--muted)] rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-blue-400"
            style={{ width: `${(unlocked / achievements.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Achievement grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((a, i) => (
          <div
            key={i}
            className={`relative bg-[var(--card)] border rounded-2xl p-4 transition-all ${
              a.unlocked
                ? 'border-yellow-200 hover:shadow-lg hover:shadow-yellow-50 hover:-translate-y-0.5'
                : 'border-[var(--border)] opacity-60'
            }`}
          >
            {!a.unlocked && (
              <div className="absolute inset-0 bg-[var(--background)]/40 rounded-2xl flex items-center justify-center">
                <span className="text-2xl opacity-50">🔒</span>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                a.unlocked ? 'bg-yellow-50' : 'bg-[var(--muted)]'
              }`}>
                {a.icon}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-[var(--foreground)] text-sm">{a.title}</h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5 leading-relaxed">{a.desc}</p>
                {a.unlocked && a.date && (
                  <span className="inline-block mt-2 text-[10px] text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full font-medium">
                    ✓ {a.date}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
