import { useState } from 'react'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Practice from './pages/Practice'
import TestPage from './pages/Test'
import Lessons from './pages/Lessons'
import Progress from './pages/Progress'
import Achievements from './pages/Achievements'
import Leaderboard from './pages/Leaderboard'
import Settings from './pages/Settings'

export type Page = 'landing' | 'dashboard' | 'practice' | 'test' | 'lessons' | 'progress' | 'achievements' | 'leaderboard' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('landing')
  const [darkMode, setDarkMode] = useState(false)

  const navigate = (p: Page) => setPage(p)

  const appPages: Page[] = ['dashboard', 'practice', 'test', 'lessons', 'progress', 'achievements', 'leaderboard', 'settings']

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {page === 'landing' ? (
          <Landing navigate={navigate} />
        ) : (
          <Layout page={page} navigate={navigate} darkMode={darkMode} setDarkMode={setDarkMode}>
            <div className="page-transition">
              {page === 'dashboard' && <Dashboard navigate={navigate} />}
              {page === 'practice' && <Practice />}
              {page === 'test' && <TestPage />}
              {page === 'lessons' && <Lessons />}
              {page === 'progress' && <Progress />}
              {page === 'achievements' && <Achievements />}
              {page === 'leaderboard' && <Leaderboard />}
              {page === 'settings' && <Settings darkMode={darkMode} setDarkMode={setDarkMode} />}
            </div>
          </Layout>
        )}
      </div>
    </div>
  )
}
