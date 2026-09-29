import { ACHIEVEMENTS } from '../data/mockData';

const rarityConfig: Record<string, { label: string; color: string; bg: string }> = {
  common: { label: 'Common', color: 'text-slate-600', bg: 'bg-slate-100' },
  uncommon: { label: 'Uncommon', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  rare: { label: 'Rare', color: 'text-blue-700', bg: 'bg-blue-50' },
  epic: { label: 'Epic', color: 'text-violet-700', bg: 'bg-violet-50' },
  legendary: { label: 'Legendary', color: 'text-amber-700', bg: 'bg-amber-50' },
};

export default function Achievements() {
  const earned = ACHIEVEMENTS.filter(a => a.earned).length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Achievements</h1>
        <p className="text-slate-500 text-sm mt-0.5">Milestones earned through consistent practice</p>
      </div>

      {/* Progress banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 flex items-center gap-6">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">🏆</div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900 mb-1">{earned} of {ACHIEVEMENTS.length} achievements earned</p>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(earned / ACHIEVEMENTS.length) * 100}%` }} />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-semibold text-amber-500">{Math.round((earned / ACHIEVEMENTS.length) * 100)}%</p>
          <p className="text-xs text-slate-400">Complete</p>
        </div>
      </div>

      {/* Achievement grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACHIEVEMENTS.map(a => {
          const rarity = rarityConfig[a.rarity];
          return (
            <div
              key={a.id}
              className={`bg-white border rounded-2xl p-5 transition-all ${
                a.earned ? 'border-slate-200 hover:shadow-md' : 'border-slate-100 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${a.earned ? 'bg-amber-50' : 'bg-slate-100 grayscale'}`}>
                  {a.icon}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rarity.bg} ${rarity.color}`}>
                  {rarity.label}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{a.title}</h3>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">{a.description}</p>
              {a.earned ? (
                <p className="text-xs text-emerald-600 font-medium">✓ Earned {a.earnedAt}</p>
              ) : (
                <p className="text-xs text-slate-400">Not yet earned</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
