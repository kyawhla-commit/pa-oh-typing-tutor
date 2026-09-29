interface Props {
  current: string
  onNavigate: (page: string) => void
  collapsed?: boolean
  onToggle?: () => void
}

const navItems = [
  { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
  { id: 'practice', icon: '⌨', label: 'Practice' },
  { id: 'lessons', icon: '📚', label: 'Lessons' },
  { id: 'test', icon: '⏱', label: 'Typing Test' },
  { id: 'progress', icon: '📈', label: 'Progress' },
  { id: 'leaderboard', icon: '🏆', label: 'Leaderboard' },
  { id: 'profile', icon: '👤', label: 'Profile' },
]

export default function Sidebar({ current, onNavigate, collapsed, onToggle }: Props) {
  return (
    <aside className={`flex flex-col bg-card border-r border-border h-full transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-border min-h-[65px]">
        <button
          onClick={() => onNavigate('landing')}
          className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white font-myanmar font-bold text-base flex-shrink-0 hover:bg-blue-700 transition-colors"
        >
          ပ
        </button>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-display font-bold text-sm text-foreground leading-tight whitespace-nowrap">Pa-O Typing</div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">Tutor Platform</div>
          </div>
        )}
        {!collapsed && (
          <button onClick={onToggle} className="ml-auto text-muted-foreground hover:text-foreground text-lg transition-colors">
            ←
          </button>
        )}
      </div>

      {collapsed && (
        <button onClick={onToggle} className="p-4 text-muted-foreground hover:text-foreground text-lg transition-colors mx-auto">
          →
        </button>
      )}

      {/* Nav items */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
              current === id
                ? 'bg-primary text-white shadow-sm shadow-blue-200'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title={collapsed ? label : undefined}
          >
            <span className="text-base flex-shrink-0">{icon}</span>
            {!collapsed && <span className="truncate">{label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom: Admin + User */}
      <div className="p-2 border-t border-border space-y-0.5">
        <button
          onClick={() => onNavigate('admin')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            current === 'admin'
              ? 'bg-primary text-white'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          title={collapsed ? 'Admin' : undefined}
        >
          <span className="text-base flex-shrink-0">⚙</span>
          {!collapsed && <span>Admin</span>}
        </button>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
            S
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-foreground truncate">Saw Maung</div>
              <div className="text-xs text-muted-foreground">Intermediate</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
