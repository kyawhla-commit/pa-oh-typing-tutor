import { useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useLearningData } from '../../data/LearningContext'
import { useLessonCatalog } from '../lessons/LessonCatalogContext'
import ThemeToggle from '../../components/ThemeToggle'
import { supabase } from '../../lib/supabase'
import {
  LayoutDashboard, Keyboard, FileText, TrendingUp,
  Trophy, Users, Settings, Menu, X, ChevronRight,
  Zap, UserRound, ShieldCheck, LogOut, Cloud, CloudOff, LoaderCircle, Check
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/practice', icon: Keyboard, label: 'Practice' },
  { to: '/test', icon: Zap, label: 'Test' },
  { to: '/lessons', icon: FileText, label: 'Lessons' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/achievements', icon: Trophy, label: 'Achievements' },
  { to: '/leaderboard', icon: Users, label: 'Leaderboard' },
  { to: '/profile', icon: UserRound, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/admin', icon: ShieldCheck, label: 'Admin' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { learner, results, signOut, preferences, syncStatus, syncError } = useLearningData()
  const { canManageCatalog } = useLessonCatalog()
  const visibleNavItems = navItems.filter((item) => item.to !== '/admin' || canManageCatalog)
  const [signOutError, setSignOutError] = useState('')
  const initials = learner?.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'A'
  const pageTitle = navItems.find((item) => location.pathname.startsWith(item.to))?.label || 'Dashboard'
  const practicedDays = new Set(results.map((result) => new Date(result.createdAt).toDateString())).size

  const handleSignOut = async () => {
    setSignOutError('')
    if (supabase) {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setSignOutError('Could not sign out. Check your connection and try again.')
        return
      }
    }
    signOut()
    navigate('/login')
  }

  return (
    <div className="app-shell flex bg-[#F8FAFC] overflow-hidden" data-theme={preferences.darkMode ? 'dark' : 'light'}>
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-[#E2E8F0] flex flex-col
          transform transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[#E2E8F0]">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center">
            <Keyboard size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg text-[#0F172A] tracking-tight">Typing Tutor</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-[#64748B] hover:text-[#0F172A]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-[#E2E8F0]">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[#F1F5F9] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#60A5FA] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-medium text-[#0F172A] truncate">{learner?.name || 'Guest learner'}</div>
              <div className="text-xs text-[#64748B] truncate">{results.length} saved sessions</div>
            </div>
            <ChevronRight size={14} className="text-[#94A3B8] flex-shrink-0" />
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center px-3 sm:px-4 lg:px-6 gap-2 sm:gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center lg:hidden text-[#64748B] hover:text-[#0F172A]"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="hidden sm:block text-[10px] font-semibold uppercase tracking-[.14em] text-[#94A3B8]">Learning workspace</p>
            <p className="truncate text-sm font-semibold text-[#0F172A]">{pageTitle}</p>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {syncStatus !== 'local' && (
              <span
                className={`hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium sm:inline-flex ${syncStatus === 'error' ? 'bg-rose-50 text-rose-700' : syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}
                role={syncStatus === 'error' ? 'status' : undefined}
                title={syncError || undefined}
              >
                {syncStatus === 'syncing' ? <LoaderCircle size={14} className="animate-spin" /> : syncStatus === 'error' ? <CloudOff size={14} /> : syncStatus === 'synced' ? <Check size={14} /> : <Cloud size={14} />}
                {syncStatus === 'syncing' ? 'Syncing' : syncStatus === 'error' ? 'Sync issue' : 'Synced'}
              </span>
            )}
            <div className="hidden xl:flex items-center gap-1.5 bg-amber-50 text-amber-700 rounded-xl px-3 py-1.5 text-sm font-medium">
              <span>🔥</span>
              <span>{practicedDays ? `${practicedDays} active days` : 'Start your streak'}</span>
            </div>
            <div className="hidden sm:flex w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#60A5FA] items-center justify-center text-white text-sm font-semibold">
              {initials}
            </div>
            <button onClick={() => void handleSignOut()} className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]" aria-label="Sign out">
              <LogOut size={15} /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {signOutError && <p role="alert" className="shrink-0 break-words border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-800">{signOutError}</p>}
        {syncStatus === 'error' && syncError && <p role="status" className="shrink-0 break-words border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">Learning data is saved on this device, but cloud sync needs attention: {syncError}</p>}

        {/* Page content */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          {children}
        </main>
      </div>
    </div>
  )
}
