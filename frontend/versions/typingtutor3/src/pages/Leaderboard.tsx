import { useState } from 'react';
import { LEADERBOARD } from '../data/mockData';

type Period = 'global' | 'weekly' | 'monthly';

const periodLabels: Record<Period, string> = {
  global: 'All Time',
  weekly: 'This Week',
  monthly: 'This Month',
};

const rankMedals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function Leaderboard() {
  const [period, setPeriod] = useState<Period>('global');

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Leaderboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Top typists ranked by WPM, accuracy, and consistency</p>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-8">
        {(['global', 'weekly', 'monthly'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              period === p ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[LEADERBOARD[1], LEADERBOARD[0], LEADERBOARD[2]].map((entry, i) => {
          const heights = ['h-28', 'h-36', 'h-24'];
          const positions = [2, 1, 3];
          return (
            <div key={entry.rank} className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 mb-2 text-sm">
                {entry.avatar}
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-0.5">{entry.username}</p>
              <p className="text-xs text-slate-400 mb-2 font-mono">{entry.wpm} WPM</p>
              <div
                className={`w-full ${heights[i]} rounded-t-xl flex items-start justify-center pt-3`}
                style={{ background: i === 1 ? '#2563EB' : '#E2E8F0' }}
              >
                <span className="text-2xl">{rankMedals[positions[i]]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-12">Rank</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Typist</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">WPM</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Accuracy</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {LEADERBOARD.map(entry => (
              <tr
                key={entry.rank}
                className={`border-b border-slate-50 last:border-0 transition-colors ${
                  entry.isMe ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <td className="px-5 py-4">
                  <span className={`text-sm font-semibold ${entry.rank <= 3 ? 'text-lg' : 'text-slate-600'}`}>
                    {rankMedals[entry.rank] ?? `#${entry.rank}`}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${entry.isMe ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {entry.avatar}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${entry.isMe ? 'text-blue-700' : 'text-slate-800'}`}>
                        {entry.username} {entry.isMe && <span className="text-xs font-normal">(you)</span>}
                      </p>
                      <p className="text-xs text-slate-400">{entry.country}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <span className="font-semibold font-mono text-blue-600 text-sm">{entry.wpm}</span>
                </td>
                <td className="px-5 py-4 text-right">
                  <span className="font-semibold font-mono text-emerald-600 text-sm">{entry.accuracy}%</span>
                </td>
                <td className="px-5 py-4 text-right hidden md:table-cell">
                  <span className="text-sm text-slate-500">{entry.sessions.toLocaleString()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
