import { NavLink, useNavigate } from 'react-router-dom';
import { USER } from '../data/mockData';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { to: '/practice', label: 'Practice', icon: '⌨' },
  { to: '/test', label: 'Speed Test', icon: '⏱' },
  { to: '/lessons', label: 'Lessons', icon: '📖' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/achievements', label: 'Achievements', icon: '🏆' },
  { to: '/leaderboard', label: 'Leaderboard', icon: '🥇' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const xpToNext = 5000;
  const xpProgress = (USER.experiencePoints / xpToNext) * 100;

  return (
    <aside className="flex flex-col h-full w-60 bg-slate-900 text-slate-400 flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold font-mono">TM</span>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">TypeMaster</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`
            }
          >
            <span className="text-base w-5 text-center">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      <div className="p-3 border-t border-slate-800">
        <div className="bg-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {USER.avatar}
            </div>
            <div className="min-w-0">
              <p className="text-slate-100 text-sm font-medium truncate">{USER.username}</p>
              <p className="text-slate-500 text-xs">Level {USER.level}</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">XP Progress</span>
              <span className="text-slate-400">{USER.experiencePoints}/{xpToNext}</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="w-full mt-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-800"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
