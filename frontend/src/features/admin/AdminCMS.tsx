import { useState } from 'react'

const lessons = [
  { id: 1, name: 'Pa-O Alphabet Level 1', level: 'Beginner', chars: 35, status: 'Published' },
  { id: 2, name: 'Basic Characters', level: 'Beginner', chars: 20, status: 'Published' },
  { id: 3, name: 'Tone Markers Practice', level: 'Beginner', chars: 8, status: 'Draft' },
  { id: 4, name: 'Daily Vocabulary', level: 'Intermediate', chars: 150, status: 'Published' },
  { id: 5, name: 'Pa-O Literature', level: 'Advanced', chars: 300, status: 'Draft' },
]

const users = [
  { name: 'Nang Aye', email: 'nang@example.com', level: 'Advanced', joined: 'Jan 2026', status: 'Active' },
  { name: 'Saw Kyaw', email: 'saw.k@example.com', level: 'Advanced', joined: 'Feb 2026', status: 'Active' },
  { name: 'Saw Maung', email: 'saw.m@example.com', level: 'Intermediate', joined: 'Jan 2026', status: 'Active' },
  { name: 'Ma Khin', email: 'ma.k@example.com', level: 'Intermediate', joined: 'Mar 2026', status: 'Inactive' },
]

type AdminView = 'dashboard' | 'lessons' | 'words' | 'users' | 'analytics'

export default function AdminCMS() {
  const [view, setView] = useState<AdminView>('dashboard')
  const [showCreate, setShowCreate] = useState(false)

  const adminNav: { id: AdminView; icon: string; label: string }[] = [
    { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
    { id: 'lessons', icon: '📚', label: 'Lessons' },
    { id: 'words', icon: '🔤', label: 'Words & Chars' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'analytics', icon: '📊', label: 'Analytics' },
  ]

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto page-transition">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 bg-error/10 text-error rounded-lg flex items-center justify-center text-sm">⚙</div>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">Demo content and learner administration for Typing Tutor.</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Admin sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-0.5">
            {adminNav.map(({ id, icon, label }) => (
              <button key={id} onClick={() => setView(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${view === id ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {view === 'dashboard' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Users', value: '2,438', icon: '👥', color: 'bg-blue-50 text-primary' },
                  { label: 'Active Lessons', value: '32', icon: '📚', color: 'bg-green-50 text-secondary' },
                  { label: 'Daily Active', value: '186', icon: '⚡', color: 'bg-amber-50 text-accent' },
                  { label: 'Avg Speed', value: '34 WPM', icon: '⌨', color: 'bg-muted text-muted-foreground' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} className="bg-card rounded-xl border border-border p-4">
                    <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center text-lg mb-3`}>{icon}</div>
                    <div className="font-mono font-bold text-lg text-foreground">{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="font-display font-semibold text-foreground mb-3">Recent Registrations</h3>
                <div className="space-y-2">
                  {users.slice(0, 3).map(({ name, email, joined }) => (
                    <div key={name} className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                        {name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{name}</div>
                        <div className="text-xs text-muted-foreground">{email}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{joined}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'lessons' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-xl text-foreground">Lesson Management</h2>
                <button onClick={() => setShowCreate(!showCreate)} className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                  + Create Lesson
                </button>
              </div>

              {showCreate && (
                <div className="bg-card rounded-2xl border border-border p-6 mb-5">
                  <h3 className="font-display font-semibold text-foreground mb-4">Create New Lesson</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { label: 'Title', placeholder: 'Lesson title...' },
                      { label: 'Description', placeholder: 'Lesson description...' },
                    ].map(({ label, placeholder }) => (
                      <div key={label}>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
                        <input className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder={placeholder} />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Difficulty</label>
                      <select className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Pa-O Content</label>
                      <input className="w-full bg-muted border border-border rounded-xl px-3 py-2 font-myanmar text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="ပအိုဝ်ႏ..." />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Myanmar Translation</label>
                      <input className="w-full bg-muted border border-border rounded-xl px-3 py-2 font-myanmar text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="မြန်မာ..." />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">English Translation</label>
                      <input className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="English meaning..." />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Audio Upload</label>
                      <div className="w-full bg-muted border-2 border-dashed border-border rounded-xl p-4 text-center text-sm text-muted-foreground cursor-pointer hover:border-primary/40 transition-colors">
                        🎵 Click to upload audio
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">Publish</button>
                    <button className="border border-border text-sm font-medium px-4 py-2 rounded-xl hover:bg-muted transition-colors">Save Draft</button>
                    <button onClick={() => setShowCreate(false)} className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 transition-colors">Cancel</button>
                  </div>
                </div>
              )}

              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Lesson Name</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Level</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Characters</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lessons.map(({ id, name, level, chars, status }) => (
                      <tr key={id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-foreground">{name}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${level === 'Beginner' ? 'bg-green-50 text-secondary' : level === 'Intermediate' ? 'bg-amber-50 text-accent' : 'bg-blue-50 text-primary'}`}>
                            {level}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-muted-foreground">{chars}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status === 'Published' ? 'bg-green-50 text-secondary' : 'bg-muted text-muted-foreground'}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-2">
                            <button className="text-xs text-primary hover:underline">Edit</button>
                            <button className="text-xs text-error hover:underline">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(view === 'users') && (
            <div>
              <h2 className="font-display font-bold text-xl text-foreground mb-4">User Management</h2>
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Email</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Level</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Joined</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map(({ name, email, level, joined, status }) => (
                      <tr key={name} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">{name[0]}</div>
                            <span className="font-medium text-foreground">{name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">{email}</td>
                        <td className="px-5 py-3.5"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${level === 'Advanced' ? 'bg-blue-50 text-primary' : level === 'Intermediate' ? 'bg-amber-50 text-accent' : 'bg-green-50 text-secondary'}`}>{level}</span></td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs">{joined}</td>
                        <td className="px-5 py-3.5"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status === 'Active' ? 'bg-green-50 text-secondary' : 'bg-muted text-muted-foreground'}`}>{status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(view === 'words' || view === 'analytics') && (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <div className="text-4xl mb-4">{view === 'words' ? '🔤' : '📊'}</div>
              <h3 className="font-display font-bold text-lg text-foreground mb-2">{view === 'words' ? 'Word & Character Library' : 'Analytics'}</h3>
              <p className="text-muted-foreground text-sm">This section is under development. Coming soon!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
