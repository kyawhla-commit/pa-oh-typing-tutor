import { useState } from 'react'

const data = {
  Weekly: [
    { rank: 1, name: 'Nang Aye', avatar: 'N', speed: 62, accuracy: 99, level: 'Advanced' },
    { rank: 2, name: 'Saw Kyaw', avatar: 'S', speed: 58, accuracy: 97, level: 'Advanced' },
    { rank: 3, name: 'Ma Khin', avatar: 'M', speed: 54, accuracy: 98, level: 'Intermediate' },
    { rank: 4, name: 'Saw Maung', avatar: 'S', speed: 42, accuracy: 96, level: 'Intermediate', isMe: true },
    { rank: 5, name: 'Naw Eh', avatar: 'N', speed: 38, accuracy: 94, level: 'Intermediate' },
    { rank: 6, name: 'Sai Lao', avatar: 'S', speed: 35, accuracy: 92, level: 'Beginner' },
    { rank: 7, name: 'Ma Moe', avatar: 'M', speed: 32, accuracy: 95, level: 'Beginner' },
    { rank: 8, name: 'Saw Bo', avatar: 'S', speed: 29, accuracy: 91, level: 'Beginner' },
    { rank: 9, name: 'Nang Su', avatar: 'N', speed: 27, accuracy: 88, level: 'Beginner' },
    { rank: 10, name: 'Ko Hla', avatar: 'K', speed: 25, accuracy: 90, level: 'Beginner' },
  ],
  Monthly: [
    { rank: 1, name: 'Saw Kyaw', avatar: 'S', speed: 65, accuracy: 98, level: 'Advanced' },
    { rank: 2, name: 'Nang Aye', avatar: 'N', speed: 60, accuracy: 99, level: 'Advanced' },
    { rank: 3, name: 'Saw Maung', avatar: 'S', speed: 45, accuracy: 97, level: 'Intermediate', isMe: true },
    { rank: 4, name: 'Ma Khin', avatar: 'M', speed: 50, accuracy: 97, level: 'Intermediate' },
    { rank: 5, name: 'Naw Eh', avatar: 'N', speed: 40, accuracy: 93, level: 'Intermediate' },
  ],
  'All Time': [
    { rank: 1, name: 'Nang Aye', avatar: 'N', speed: 68, accuracy: 99, level: 'Advanced' },
    { rank: 2, name: 'Saw Kyaw', avatar: 'S', speed: 66, accuracy: 98, level: 'Advanced' },
    { rank: 3, name: 'Ko Tin', avatar: 'K', speed: 62, accuracy: 97, level: 'Advanced' },
    { rank: 4, name: 'Ma Khin', avatar: 'M', speed: 55, accuracy: 98, level: 'Advanced' },
    { rank: 5, name: 'Saw Maung', avatar: 'S', speed: 48, accuracy: 97, level: 'Intermediate', isMe: true },
  ],
}

const medalColors = ['text-amber-500', 'text-slate-400', 'text-orange-500']
const medals = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const [tab, setTab] = useState<keyof typeof data>('Weekly')
  const rows = data[tab]

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto page-transition">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">Top Pa-O typists in the community</p>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[rows[1], rows[0], rows[2]].map((user, i) => {
          if (!user) return <div key={i} />
          const podiumOrder = [2, 1, 3]
          const rank = podiumOrder[i]
          return (
            <div key={user.name} className={`bg-card rounded-2xl border p-5 text-center transition-all ${rank === 1 ? 'border-amber-300 bg-amber-50 shadow-lg shadow-amber-100 -mt-2' : 'border-border'}`}>
              <div className="text-3xl mb-2">{medals[rank - 1]}</div>
              <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-white text-lg ${rank === 1 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-primary to-blue-700'}`}>
                {user.avatar}
              </div>
              <div className="font-semibold text-foreground text-sm">{user.name}</div>
              <div className="text-xs text-muted-foreground mb-2">{user.level}</div>
              <div className="font-mono font-bold text-xl text-primary">{user.speed}<span className="text-xs text-muted-foreground ml-1">WPM</span></div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl mb-6 w-fit">
        {(Object.keys(data) as (keyof typeof data)[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground w-12">Rank</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">User</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Speed</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Accuracy</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(({ rank, name, avatar, speed, accuracy, level, isMe }) => (
              <tr key={name} className={`hover:bg-muted/30 transition-colors ${isMe ? 'bg-blue-50 border-l-2 border-l-primary' : ''}`}>
                <td className="px-5 py-4">
                  {rank <= 3 ? (
                    <span className="text-xl">{medals[rank - 1]}</span>
                  ) : (
                    <span className="font-mono font-bold text-muted-foreground">{rank}</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${isMe ? 'bg-gradient-to-br from-primary to-blue-700' : 'bg-gradient-to-br from-muted-foreground to-slate-600'}`}>
                      {avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{name}{isMe && <span className="ml-2 text-xs text-primary font-bold">(You)</span>}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="font-mono font-bold text-primary">{speed} WPM</span>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${accuracy >= 97 ? 'bg-green-50 text-secondary' : accuracy >= 93 ? 'bg-amber-50 text-accent' : 'bg-muted text-muted-foreground'}`}>
                    {accuracy}%
                  </span>
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${level === 'Advanced' ? 'bg-blue-50 text-primary' : level === 'Intermediate' ? 'bg-amber-50 text-accent' : 'bg-green-50 text-secondary'}`}>
                    {level}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
