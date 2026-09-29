import { useState } from 'react'

type Tab = 'global' | 'weekly' | 'friends'

const generateUsers = (count: number, tab: Tab) => {
  const names = ['Sarah Chen', 'Marcus Williams', 'Alex Johnson', 'Emma Thompson', 'Raj Patel', 'Yuki Tanaka', 'Carlos Rivera', 'Priya Singh', 'Noah Anderson', 'Lena Müller', 'James O\'Brien', 'Aisha Okonkwo']
  const levels = [25, 22, 12, 18, 30, 15, 9, 21, 8, 17, 14, 11]
  const wpms = tab === 'global'
    ? [142, 138, 72, 121, 135, 118, 108, 112, 95, 127, 101, 89]
    : tab === 'weekly'
    ? [98, 95, 78, 91, 102, 88, 82, 85, 76, 93, 80, 72]
    : [112, 95, 72, 88, 102, 85, 78, 92, 65, 80, 71, 68]
  const accs = [99, 98, 98, 97, 99, 96, 97, 98, 95, 97, 96, 94]
  return Array.from({ length: Math.min(count, names.length) }, (_, i) => ({
    rank: i + 1,
    name: names[i],
    level: levels[i],
    wpm: wpms[i],
    accuracy: accs[i],
    isCurrentUser: names[i] === 'Alex Johnson',
    avatar: names[i].split(' ').map(n => n[0]).join(''),
  })).sort((a, b) => b.wpm - a.wpm).map((u, i) => ({ ...u, rank: i + 1 }))
}

export default function Leaderboard() {
  const [tab, setTab] = useState<Tab>('global')
  const users = generateUsers(12, tab)
  const currentUser = users.find(u => u.isCurrentUser)!

  const avatarColors = [
    'from-blue-400 to-blue-600', 'from-purple-400 to-purple-600', 'from-green-400 to-green-600',
    'from-orange-400 to-orange-600', 'from-pink-400 to-pink-600', 'from-teal-400 to-teal-600',
    'from-red-400 to-red-600', 'from-indigo-400 to-indigo-600', 'from-yellow-400 to-yellow-600',
    'from-cyan-400 to-cyan-600', 'from-rose-400 to-rose-600', 'from-violet-400 to-violet-600',
  ]

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Leaderboard</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">See how you rank against other typists</p>
        </div>
        <div className="flex bg-[var(--muted)] rounded-xl p-1 gap-1">
          {(['global', 'weekly', 'friends'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                tab === t ? 'bg-white text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-3">
        {[users[1], users[0], users[2]].map((user, i) => {
          const pos = i === 0 ? 2 : i === 1 ? 1 : 3
          const rank = i === 0 ? '🥈' : i === 1 ? '🥇' : '🥉'
          const height = i === 1 ? 'pt-0' : i === 0 ? 'pt-4' : 'pt-6'
          return (
            <div key={user.rank} className={`flex flex-col items-center ${height}`}>
              <span className="text-2xl mb-1">{rank}</span>
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColors[users.indexOf(user)]} flex items-center justify-center text-white font-bold mb-2 ${user.isCurrentUser ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
                {user.avatar}
              </div>
              <p className="text-xs font-semibold text-[var(--foreground)] text-center truncate max-w-full">{user.name.split(' ')[0]}</p>
              <p className={`text-sm font-bold font-mono ${i === 1 ? 'text-yellow-600' : 'text-[var(--primary)]'}`}>{user.wpm}</p>
              <p className="text-[10px] text-[var(--muted-foreground)]">WPM</p>
            </div>
          )
        })}
      </div>

      {/* Your position */}
      {currentUser && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl font-bold text-[var(--primary)] w-8 text-center">#{currentUser.rank}</span>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ring-2 ring-[var(--primary)] ring-offset-1">
            {currentUser.avatar}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[var(--foreground)] text-sm">Your position</p>
            <p className="text-xs text-[var(--muted-foreground)]">Level {currentUser.level}</p>
          </div>
          <div className="text-right">
            <p className="font-bold font-mono text-[var(--primary)]">{currentUser.wpm} WPM</p>
            <p className="text-xs text-green-600">{currentUser.accuracy}% acc</p>
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[3rem_1fr_4rem_5rem_5rem] gap-2 px-4 py-3 bg-[var(--muted)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
          <span>Rank</span>
          <span>Player</span>
          <span className="text-center">Lvl</span>
          <span className="text-right">WPM</span>
          <span className="text-right">Acc</span>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {users.map((user, i) => (
            <div
              key={user.rank}
              className={`grid grid-cols-[3rem_1fr_4rem_5rem_5rem] gap-2 items-center px-4 py-3 transition-colors ${
                user.isCurrentUser ? 'bg-blue-50 border-l-2 border-l-[var(--primary)]' : 'hover:bg-[var(--muted)]'
              }`}
            >
              <span className="font-bold text-sm text-[var(--muted-foreground)]">
                {user.rank <= 3 ? ['🥇','🥈','🥉'][user.rank - 1] : `#${user.rank}`}
              </span>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColors[i]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {user.avatar}
                </div>
                <span className={`text-sm font-medium truncate ${user.isCurrentUser ? 'text-[var(--primary)] font-semibold' : 'text-[var(--foreground)]'}`}>
                  {user.name}{user.isCurrentUser ? ' (you)' : ''}
                </span>
              </div>
              <span className="text-center text-xs text-[var(--muted-foreground)]">{user.level}</span>
              <span className="text-right font-mono font-bold text-[var(--primary)]">{user.wpm}</span>
              <span className="text-right text-sm text-green-600 font-medium">{user.accuracy}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
