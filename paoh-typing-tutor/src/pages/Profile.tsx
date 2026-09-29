const achievements = [
  { icon: '🔤', title: 'First Steps', desc: 'Completed first lesson', earned: true },
  { icon: '🔥', title: '7-Day Streak', desc: '7 consecutive days', earned: true },
  { icon: '📚', title: '20 Lessons', desc: 'Completed 20 lessons', earned: true },
  { icon: '⚡', title: '30 WPM', desc: 'Reached 30 WPM', earned: true },
  { icon: '🎯', title: '95% Accuracy', desc: '95%+ accuracy test', earned: true },
  { icon: '🏆', title: '50 WPM', desc: 'Reach 50 WPM — In progress', earned: false },
]

export default function Profile() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto page-transition">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-1">Your Pa-O typing journey at a glance</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Profile card */}
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold">
            S
          </div>
          <h2 className="font-display font-bold text-xl text-foreground">Saw Maung</h2>
          <p className="text-muted-foreground text-sm mb-3">@saw.maung · Intermediate</p>
          <div className="inline-flex items-center gap-1 bg-amber-50 text-accent border border-amber-200 px-3 py-1 rounded-full text-xs font-semibold mb-4">
            🔥 7-day streak
          </div>
          <div className="text-sm text-muted-foreground">Member since January 2026</div>
          <button className="mt-4 w-full border border-border text-sm font-medium py-2 rounded-xl hover:bg-muted transition-colors">
            Edit Profile
          </button>
        </div>

        {/* Stats */}
        <div className="md:col-span-2 bg-card rounded-2xl border border-border p-6">
          <h3 className="font-display font-bold text-lg text-foreground mb-4">Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total Practice Time', value: '14.5 hrs', icon: '⏱' },
              { label: 'Words Typed', value: '9,664', icon: '📝' },
              { label: 'Best Speed', value: '42 WPM', icon: '⚡' },
              { label: 'Average Accuracy', value: '96%', icon: '🎯' },
              { label: 'Lessons Completed', value: '24 / 40', icon: '📚' },
              { label: 'Tests Taken', value: '38', icon: '🏅' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <span className="text-xl">{icon}</span>
                <div>
                  <div className="font-mono font-bold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg text-foreground">Achievements</h3>
          <span className="text-sm text-muted-foreground">5 / 12 earned</span>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {achievements.map(({ icon, title, desc, earned }) => (
            <div key={title} className={`flex items-center gap-3 p-4 rounded-xl border ${earned ? 'border-amber-200 bg-amber-50' : 'border-border opacity-50'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${earned ? 'bg-white' : 'bg-muted'}`}>
                {earned ? icon : '🔒'}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{title}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Level progress */}
      <div className="bg-gradient-to-r from-primary to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-lg">Intermediate Level</h3>
            <p className="text-blue-100 text-sm">480 / 1000 XP to Advanced</p>
          </div>
          <div className="text-4xl">🎓</div>
        </div>
        <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full w-[48%] progress-bar"></div>
        </div>
        <div className="flex justify-between text-xs text-blue-100 mt-2">
          <span>Intermediate</span>
          <span>48%</span>
          <span>Advanced</span>
        </div>
      </div>
    </div>
  )
}
