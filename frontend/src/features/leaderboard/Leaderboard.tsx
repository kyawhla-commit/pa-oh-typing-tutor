import { useLearningData } from '../../data/LearningContext'

const players = [
  { rank: 1, name: 'Sarah K.', level: 25, wpm: 142, accuracy: 99, avatar: 'S', you: false },
  { rank: 2, name: 'Mike T.', level: 22, wpm: 138, accuracy: 98, avatar: 'M', you: false },
  { rank: 3, name: 'Priya S.', level: 20, wpm: 131, accuracy: 99, avatar: 'P', you: false },
  { rank: 4, name: 'James L.', level: 18, wpm: 125, accuracy: 97, avatar: 'J', you: false },
  { rank: 5, name: 'Anna R.', level: 17, wpm: 119, accuracy: 98, avatar: 'A', you: false },
  { rank: 6, name: 'David W.', level: 16, wpm: 115, accuracy: 96, avatar: 'D', you: false },
  { rank: 7, name: 'Emma C.', level: 15, wpm: 110, accuracy: 97, avatar: 'E', you: false },
]

const rankMedal: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
const avatarColors = ['bg-rose-400', 'bg-blue-400', 'bg-purple-400', 'bg-green-400', 'bg-amber-400', 'bg-pink-400', 'bg-teal-400']

export default function Leaderboard() {
  const { learner, results } = useLearningData()
  const bestWpm = Math.max(0, ...results.map((result) => result.wpm))
  const averageAccuracy = results.length ? Math.round(results.reduce((sum, result) => sum + result.accuracy, 0) / results.length) : 0
  const allPlayers = [...players, { rank: 0, name: learner?.name || 'You', level: Math.floor(results.length / 3) + 1, wpm: bestWpm, accuracy: averageAccuracy, avatar: learner?.name[0]?.toUpperCase() || 'Y', you: true }]
    .sort((left, right) => right.wpm - left.wpm)
    .map((player, index) => ({ ...player, rank: index + 1 }))

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Leaderboard</h1>
        <p className="text-sm text-[#64748B]">Your row uses your best saved speed. Other entries are sample community scores.</p>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {allPlayers.slice(0, 3).map((p, idx) => (
          <div
            key={p.rank}
            className={`bg-white rounded-2xl border p-4 text-center ${
              idx === 0 ? 'border-amber-200 bg-amber-50' : 'border-[#E2E8F0]'
            }`}
          >
            <div className="text-2xl mb-2">{rankMedal[p.rank]}</div>
            <div className={`w-10 h-10 rounded-full ${avatarColors[idx]} flex items-center justify-center text-white font-bold text-sm mx-auto mb-2`}>
              {p.avatar}
            </div>
            <div className="text-sm font-semibold text-[#0F172A] truncate">{p.name}</div>
            <div className="text-lg font-bold text-[#2563EB]">{p.wpm}</div>
            <div className="text-xs text-[#94A3B8]">WPM</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E2E8F0]">
              {['Rank', 'Player', 'Level', 'WPM', 'Accuracy'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-[#94A3B8] px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPlayers.map((p, i) => (
              <tr
                key={p.rank}
                className={`border-b border-[#F1F5F9] last:border-0 ${
                  p.you ? 'bg-blue-50' : 'hover:bg-[#F8FAFC]'
                } transition-colors`}
              >
                <td className="px-4 py-3 text-sm font-medium text-[#64748B]">
                  {rankMedal[p.rank] || `#${p.rank}`}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                      {p.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#0F172A]">
                        {p.name}
                        {p.you && <span className="ml-2 text-xs bg-[#2563EB] text-white px-1.5 py-0.5 rounded-md">You</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[#64748B]">Lv. {p.level}</td>
                <td className="px-4 py-3">
                  <span className="text-sm font-bold text-[#2563EB]">{p.wpm}</span>
                  <span className="text-xs text-[#94A3B8] ml-1">WPM</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${p.accuracy >= 98 ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                    {p.accuracy}%
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
