import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import TypingPractice from './pages/TypingPractice'
import TypingTest from './pages/TypingTest'
import LessonLibrary from './pages/LessonLibrary'
import ProgressDashboard from './pages/ProgressDashboard'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import AdminCMS from './pages/AdminCMS'

type Page = 'landing' | 'dashboard' | 'practice' | 'test' | 'lessons' | 'progress' | 'leaderboard' | 'profile' | 'admin'

const appPages: Page[] = ['dashboard', 'practice', 'test', 'lessons', 'progress', 'leaderboard', 'profile', 'admin']

export default function App() {
  const [page, setPage] = useState<Page>('landing')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const navigate = (p: string) => setPage(p as Page)

  if (page === 'landing') {
    return <Landing onNavigate={navigate} />
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={navigate} />
      case 'practice': return <TypingPractice />
      case 'test': return <TypingTest />
      case 'lessons': return <LessonLibrary onNavigate={navigate} />
      case 'progress': return <ProgressDashboard />
      case 'leaderboard': return <Leaderboard />
      case 'profile': return <Profile />
      case 'admin': return <AdminCMS />
      default: return <Dashboard onNavigate={navigate} />
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar
          current={page}
          onNavigate={navigate}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-4 md:px-6 h-16 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <button className="md:hidden w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
              ☰
            </button>
            <div>
              <h2 className="font-display font-semibold text-foreground capitalize text-sm">{page === 'test' ? 'Typing Test' : page === 'lessons' ? 'Lesson Library' : page === 'progress' ? 'Progress' : page === 'practice' ? 'Practice' : page === 'leaderboard' ? 'Leaderboard' : page === 'profile' ? 'My Profile' : page === 'admin' ? 'Admin Panel' : 'Dashboard'}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              <span className="font-mono text-xs bg-muted px-2 py-1 rounded-lg">🔥 7-day streak</span>
            </button>
            <button
              onClick={() => navigate('landing')}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border px-3 py-1.5 rounded-lg"
            >
              ← Landing
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold cursor-pointer" onClick={() => navigate('profile')}>
              S
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t border-border px-2 py-2 z-50">
        <div className="flex justify-around">
          {[
            { id: 'dashboard', icon: '⊞', label: 'Home' },
            { id: 'practice', icon: '⌨', label: 'Practice' },
            { id: 'test', icon: '⏱', label: 'Test' },
            { id: 'lessons', icon: '📚', label: 'Lessons' },
            { id: 'profile', icon: '👤', label: 'Profile' },
          ].map(({ id, icon, label }) => (
            <button key={id} onClick={() => navigate(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${page === id ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className="text-lg">{icon}</span>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
