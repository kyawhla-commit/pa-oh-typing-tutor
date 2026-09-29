import { useState } from 'react'

interface Props { onNavigate: (page: string) => void }

const paOChars = ['က', 'ꩫ', 'ꩬ', 'ꩭ', 'ꩮ', 'ꩯ', 'ꩠ', 'ꩡ', 'ꩢ', 'ꩣ']

export default function Landing({ onNavigate }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white font-display font-bold text-sm">
            ပ
          </div>
          <span className="font-display font-bold text-lg text-foreground">Pa-O Typing Tutor</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground font-medium">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#lessons" className="hover:text-foreground transition-colors">Lessons</a>
          <a href="#community" className="hover:text-foreground transition-colors">Community</a>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('dashboard')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2">
            Sign In
          </button>
          <button onClick={() => onNavigate('dashboard')} className="text-sm font-semibold bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-12 items-center">
        <div className="page-transition">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-primary px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border border-blue-100">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
            Free to learn · Open to all
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-foreground leading-[1.1] mb-5">
            Learn Pa-O typing.<br />
            <span className="text-primary">Preserve our language</span><br />
            digitally.
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-md">
            A modern platform to master Pa-O Unicode typing — build speed, accuracy, and confidence in your native language.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onNavigate('dashboard')} className="font-semibold bg-primary text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all hover:shadow-lg hover:shadow-blue-200 active:scale-95">
              Start Learning Free
            </button>
            <button onClick={() => onNavigate('practice')} className="font-semibold border border-border text-foreground px-6 py-3 rounded-xl hover:bg-muted transition-colors">
              Practice Typing
            </button>
          </div>
          <div className="flex items-center gap-6 mt-10 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><span className="text-secondary font-bold">2,400+</span> learners</div>
            <div className="w-px h-4 bg-border"></div>
            <div className="flex items-center gap-2"><span className="text-secondary font-bold">120+</span> lessons</div>
            <div className="w-px h-4 bg-border"></div>
            <div className="flex items-center gap-2"><span className="text-secondary font-bold">Free</span> forever</div>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="page-transition relative">
          <div className="bg-white rounded-2xl shadow-2xl shadow-blue-100 p-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span className="text-xs text-muted-foreground ml-2 font-mono">practice session</span>
            </div>
            <div className="bg-muted rounded-xl p-4 mb-4 font-myanmar text-xl leading-loose text-center">
              <span className="text-secondary font-bold">ပ</span>
              <span className="text-secondary font-bold">အ</span>
              <span className="bg-primary text-white px-1 rounded">ိ</span>
              <span className="text-muted-foreground">ုဝ်ႏ ဘာသာ</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[['⚡', '42 WPM', 'Speed'], ['🎯', '98%', 'Accuracy'], ['🔥', '7 days', 'Streak']].map(([icon, val, label]) => (
                <div key={label} className="bg-muted rounded-xl p-3 text-center">
                  <div className="text-lg mb-1">{icon}</div>
                  <div className="font-mono font-bold text-foreground text-sm">{val}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
            {/* Mini keyboard */}
            <div className="grid grid-cols-10 gap-1">
              {paOChars.map((char, i) => (
                <div
                  key={i}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  className={`aspect-square rounded-lg font-myanmar text-xs flex items-center justify-center cursor-pointer transition-all border ${
                    hovered === i
                      ? 'bg-primary text-white border-primary shadow-md scale-110'
                      : i === 2
                      ? 'bg-secondary/10 text-secondary border-secondary/30'
                      : 'bg-muted text-foreground border-border hover:border-primary/40'
                  }`}
                >
                  {char}
                </div>
              ))}
            </div>
          </div>
          {/* Floating badge */}
          <div className="absolute -top-4 -right-4 bg-accent text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg shadow-amber-200 rotate-3">
            🏆 #1 Pa-O Platform
          </div>
        </div>
      </section>

      {/* Why section */}
      <section id="features" className="bg-white py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-bold text-foreground mb-3">Why Learn Pa-O Typing?</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Empower yourself and your community through digital literacy in your native language.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '⌨️', title: 'Learn Unicode Typing', desc: 'Master the Pa-O Unicode keyboard layout with structured, step-by-step lessons designed for all skill levels.', color: 'bg-blue-50 text-primary' },
              { icon: '📚', title: 'Practice Pa-O Words', desc: 'Build vocabulary and muscle memory through real Pa-O words and culturally meaningful phrases.', color: 'bg-green-50 text-secondary' },
              { icon: '🌱', title: 'Preserve Language', desc: 'Join a growing movement of Pa-O speakers keeping their language alive through digital expression.', color: 'bg-amber-50 text-accent' },
            ].map(({ icon, title, desc, color }) => (
              <div key={title} className="p-6 rounded-2xl border border-border hover:shadow-lg hover:shadow-blue-50 transition-all group">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                  {icon}
                </div>
                <h3 className="font-display font-bold text-lg text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section id="lessons" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-4xl font-bold text-foreground mb-4">Everything you need to master Pa-O typing</h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">From your first character to advanced sentence fluency — structured learning at every level.</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['🔤', 'Alphabet Practice', 'All Pa-O characters'],
                  ['📝', 'Vocabulary Typing', 'Common words'],
                  ['💬', 'Sentence Training', 'Full phrases'],
                  ['⏱️', 'Speed Tests', 'Track your WPM'],
                  ['📈', 'Progress Tracking', 'Charts & stats'],
                  ['🏅', 'Achievements', 'Earn badges'],
                ].map(([icon, title, sub]) => (
                  <div key={title} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
                    <span className="text-xl mt-0.5">{icon}</span>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{title}</div>
                      <div className="text-xs text-muted-foreground">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary to-blue-700 rounded-2xl p-8 text-white">
              <div className="font-display font-bold text-2xl mb-6 opacity-90">Today's Challenge</div>
              <div className="bg-white/10 rounded-xl p-4 mb-4 font-myanmar text-2xl text-center leading-loose">
                ပအိုဝ်ႏ ဘာသာ ရေꩻ
              </div>
              <div className="text-sm opacity-75 text-center mb-6">"Pa-O language development"</div>
              <div className="grid grid-cols-3 gap-3 mb-6 text-center text-sm">
                <div className="bg-white/10 rounded-xl p-3">
                  <div className="font-mono font-bold text-xl">35</div>
                  <div className="opacity-70 text-xs">WPM avg</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <div className="font-mono font-bold text-xl">97%</div>
                  <div className="opacity-70 text-xs">Accuracy</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <div className="font-mono font-bold text-xl">856</div>
                  <div className="opacity-70 text-xs">Players</div>
                </div>
              </div>
              <button onClick={() => onNavigate('test')} className="w-full bg-white text-primary font-bold py-3 rounded-xl hover:bg-blue-50 transition-colors">
                Join Challenge →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="community" className="py-20 bg-gradient-to-r from-primary to-blue-700">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-display text-4xl font-bold text-white mb-4">Ready to preserve Pa-O language?</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">Join thousands of learners who are keeping Pa-O alive through digital typing. Free, always.</p>
          <button onClick={() => onNavigate('dashboard')} className="bg-white text-primary font-bold text-lg px-8 py-4 rounded-xl hover:shadow-xl hover:scale-105 transition-all">
            Start Learning for Free →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-white py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-myanmar text-sm">ပ</div>
            <span className="font-display font-bold">Pa-O Typing Tutor</span>
          </div>
          <div className="text-sm text-white/50">Preserving Pa-O language, one keystroke at a time.</div>
          <div className="text-sm text-white/50">© 2026 Pa-O Typing Tutor</div>
        </div>
      </footer>
    </div>
  )
}
