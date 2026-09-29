const achievements = [
  { icon: '🏆', title: 'First 30 WPM', desc: 'Reach a typing speed of 30 WPM.', unlocked: true, date: 'Sep 1' },
  { icon: '🔥', title: '7 Day Streak', desc: 'Practice for 7 consecutive days.', unlocked: true, date: 'Sep 10' },
  { icon: '⭐', title: 'Accuracy Master', desc: 'Maintain 99% accuracy for 10 tests.', unlocked: true, date: 'Sep 15' },
  { icon: '🚀', title: 'Speed Runner', desc: 'Reach 80 WPM in a timed test.', unlocked: false, date: null },
  { icon: '📚', title: 'Lesson Finisher', desc: 'Complete all beginner lessons.', unlocked: false, date: null },
  { icon: '💎', title: 'Diamond Fingers', desc: 'Type 100,000 words total.', unlocked: false, date: null },
  { icon: '🌙', title: 'Night Owl', desc: 'Practice after midnight 5 times.', unlocked: true, date: 'Sep 8' },
  { icon: '🎯', title: 'Perfect Round', desc: 'Complete a test with 100% accuracy.', unlocked: false, date: null },
]

export default function Achievements() {
  const unlocked = achievements.filter(a => a.unlocked)
  const locked = achievements.filter(a => !a.unlocked)

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Achievements</h1>
        <p className="text-sm text-[#64748B]">{unlocked.length} of {achievements.length} unlocked</p>
      </div>

      <div className="bg-[#2563EB] rounded-2xl p-5 mb-6 flex items-center gap-4 text-white">
        <div className="text-4xl">🏅</div>
        <div>
          <div className="font-bold text-lg">{unlocked.length} Achievements Earned</div>
          <div className="text-blue-200 text-sm">{locked.length} more to unlock. Keep going!</div>
          <div className="w-48 h-2 bg-blue-400/40 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{ width: `${(unlocked.length / achievements.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Unlocked</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
        {unlocked.map(a => (
          <div key={a.title} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">{a.icon}</div>
            <div className="font-semibold text-[#0F172A] text-sm mb-1">{a.title}</div>
            <div className="text-xs text-[#64748B] leading-relaxed mb-3">{a.desc}</div>
            <div className="text-xs text-[#16A34A] font-medium">Earned {a.date}</div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Locked</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {locked.map(a => (
          <div key={a.title} className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-4 opacity-60">
            <div className="text-3xl mb-3 grayscale">{a.icon}</div>
            <div className="font-semibold text-[#64748B] text-sm mb-1">{a.title}</div>
            <div className="text-xs text-[#94A3B8] leading-relaxed mb-3">{a.desc}</div>
            <div className="text-xs text-[#94A3B8] font-medium">🔒 Locked</div>
          </div>
        ))}
      </div>
    </div>
  )
}
