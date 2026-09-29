import type { Page } from '../App'

interface Props {
  navigate: (p: Page) => void
}

export default function Landing({ navigate }: Props) {
  return (
    <div className="min-h-screen bg-[var(--background)] overflow-x-hidden">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold font-mono">T</span>
            </div>
            <span className="text-lg font-bold text-[var(--foreground)]">TypeMaster</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--muted-foreground)]">
            <a href="#features" className="hover:text-[var(--foreground)] transition-colors">Features</a>
            <a href="#stats" className="hover:text-[var(--foreground)] transition-colors">About</a>
            <button
              onClick={() => navigate('dashboard')}
              className="text-[var(--primary)] hover:text-blue-700 transition-colors"
            >
              Sign In
            </button>
          </nav>
          <button
            onClick={() => navigate('dashboard')}
            className="bg-[var(--primary)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-[var(--primary)] px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border border-blue-100">
            🚀 Trusted by 1M+ learners
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--foreground)] leading-tight mb-5">
            Type Faster.<br />
            <span className="text-[var(--primary)]">Build a Brighter You.</span>
          </h1>
          <p className="text-lg text-[var(--muted-foreground)] leading-relaxed mb-8 max-w-lg">
            Master touch typing through interactive lessons, practice sessions, and real-time feedback. Go from hunt-and-peck to professional speed.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('dashboard')}
              className="bg-[var(--primary)] text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5"
            >
              Start Learning
            </button>
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
              <PlayIcon />
              Watch Demo
            </button>
          </div>
        </div>

        {/* Hero visual */}
        <div className="relative">
          <div className="bg-white rounded-2xl shadow-2xl shadow-blue-100 border border-[var(--border)] p-5 overflow-hidden">
            {/* Mock typing interface */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-2 text-xs text-[var(--muted-foreground)] font-mono">TypeMaster — Practice</span>
            </div>
            <div className="flex justify-between text-xs font-mono text-[var(--muted-foreground)] mb-3">
              <span className="font-semibold text-green-600">72 WPM</span>
              <span>01:23</span>
              <span className="font-semibold text-blue-600">98% ACC</span>
            </div>
            <div className="bg-[var(--muted)] rounded-xl p-3 mb-3 text-sm leading-7 font-mono">
              <span className="bg-green-100 text-green-800 rounded px-0.5">The quick brown </span>
              <span className="bg-blue-200 text-blue-800 rounded px-0.5">f</span>
              <span className="text-[var(--muted-foreground)]">ox jumps over the lazy dog.</span>
            </div>
            {/* Mini keyboard */}
            <div className="space-y-1">
              {[
                ['Q','W','E','R','T','Y','U','I','O','P'],
                ['A','S','D','F','G','H','J','K','L'],
                ['Z','X','C','V','B','N','M'],
              ].map((row, i) => (
                <div key={i} className="flex gap-1 justify-center">
                  {row.map(k => (
                    <div
                      key={k}
                      className={`w-6 h-6 rounded text-[9px] font-mono font-semibold flex items-center justify-center border transition-all ${
                        k === 'F' ? 'bg-[var(--primary)] text-white border-blue-500 scale-110 shadow-sm' : 'bg-white border-[var(--border)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      {k}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -z-10 inset-0 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-2xl translate-x-3 translate-y-3 opacity-50" />
        </div>
      </section>

      {/* Feature cards */}
      <section id="features" className="bg-white border-y border-[var(--border)] py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-center text-[var(--foreground)] mb-10">
            Everything you need to type at your best
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div key={f.title} className="group p-5 rounded-2xl border border-[var(--border)] hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all cursor-default">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-[var(--foreground)] mb-1.5">{f.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { value: '100+', label: 'Lessons', color: 'text-[var(--primary)]' },
            { value: '1M+', label: 'Users', color: 'text-purple-600' },
            { value: '98%', label: 'Average Accuracy', color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-5xl font-extrabold ${s.color} mb-2`}>{s.value}</p>
              <p className="text-[var(--muted-foreground)] font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--primary)] py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to type faster?</h2>
          <p className="text-blue-100 mb-8 text-lg">Join over 1 million learners improving their typing speed every day.</p>
          <button
            onClick={() => navigate('dashboard')}
            className="bg-white text-[var(--primary)] px-8 py-3.5 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg"
          >
            Start for Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[var(--border)] py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--muted-foreground)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[var(--primary)] rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold font-mono">T</span>
            </div>
            <span className="font-semibold text-[var(--foreground)]">TypeMaster</span>
          </div>
          <p>© 2026 TypeMaster. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

const features = [
  { icon: '⌨️', title: 'Typing Practice', desc: 'Real-time feedback and corrections as you type.' },
  { icon: '⏱️', title: 'Typing Tests', desc: 'Measure your WPM and accuracy with timed tests.' },
  { icon: '📈', title: 'Progress Tracking', desc: 'Track your improvement over time with detailed charts.' },
  { icon: '🏆', title: 'Achievements', desc: 'Stay motivated with goals, badges, and streaks.' },
]

function PlayIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}
