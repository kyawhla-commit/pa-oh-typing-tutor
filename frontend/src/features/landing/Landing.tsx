import ThemeToggle from '../../components/ThemeToggle'
import VirtualKeyboard from '../../components/VirtualKeyboard'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useLearningData } from '../../data/LearningContext'
import { Keyboard, Play, CheckCircle, BarChart3, Trophy, Zap, Users, Target, Menu, X } from 'lucide-react'

const features = [
  {
    icon: Keyboard,
    title: 'Typing Practice',
    desc: 'Real-time feedback and corrections as you type.',
    color: 'bg-blue-50 text-[#2563EB]',
  },
  {
    icon: Zap,
    title: 'Typing Tests',
    desc: 'Measure your WPM and accuracy against timed challenges.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: BarChart3,
    title: 'Progress Tracking',
    desc: 'Track your improvement over time with detailed charts.',
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: Trophy,
    title: 'Achievements',
    desc: 'Stay motivated with badges, streaks, and goals.',
    color: 'bg-amber-50 text-amber-600',
  },
]

const stats = [
  { value: '8', label: 'Structured lessons' },
  { value: '4', label: 'Practice modes' },
  { value: '1', label: 'Shared progress record' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { learner, signIn } = useLearningData()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const startGuestPractice = () => {
    if (!learner) signIn({ name: 'Guest learner', email: '' })
    navigate('/practice')
  }

  return (
    <div className="min-h-screen bg-white font-[Inter,sans-serif]">
      {/* Navbar */}
      <nav aria-label="Main navigation" className="border-b border-[#E2E8F0] bg-white px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex min-h-16 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2563EB]">
                <Keyboard size={16} className="text-white" />
              </div>
              <span className="truncate text-lg font-bold tracking-tight text-[#0F172A]">Typing Tutor</span>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <div className="hidden items-center gap-3 sm:flex">
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm font-medium text-[#64748B] transition-colors hover:text-[#0F172A]"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Create free account
                </button>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#475569] transition-colors hover:bg-slate-50 hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:hidden"
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="landing-mobile-menu"
                onClick={() => setMobileMenuOpen((open) => !open)}
              >
                {mobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
          {mobileMenuOpen && (
            <div id="landing-mobile-menu" className="grid grid-cols-2 gap-2 border-t border-[#E2E8F0] py-3 sm:hidden">
              <button
                onClick={() => { setMobileMenuOpen(false); navigate('/login') }}
                className="rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-sm font-semibold text-[#334155] transition-colors hover:bg-slate-50"
              >
                Sign In
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); navigate('/register') }}
                className="rounded-xl bg-[#2563EB] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Create free account
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-[#2563EB] rounded-full px-3 py-1 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
            Practice, lessons, tests, and progress in one place
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold text-[#0F172A] leading-[1.1] tracking-tight mb-6">
            Type Faster.<br />
            <span className="text-[#2563EB]">Build a Brighter</span><br />
            You.
          </h1>
          <p className="text-lg text-[#64748B] leading-relaxed mb-8 max-w-md">
            Master touch typing through interactive lessons, practice sessions, and real-time feedback tailored to your pace.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => navigate('/register')}
              className="w-full rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:w-auto"
            >
              Create free account
            </button>
              <button onClick={startGuestPractice} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] px-6 py-3 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC] sm:w-auto">
              <Play size={15} className="fill-current" />
              Practice as guest
            </button>
          </div>
          <div className="flex items-center gap-4 mt-8 text-sm text-[#64748B]">
            {['Free to start', 'Saved on this device', 'Keyboard-focused'].map(item => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-[#16A34A]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Illustration / typing preview */}
        <div className="relative min-w-0">
          <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-3 sm:p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="font-mono text-base leading-relaxed mb-4 p-4 bg-white rounded-xl border border-[#E2E8F0]">
              <span className="text-[#16A34A]">The quick brown fox </span>
              <span className="bg-[#2563EB] text-white px-0.5 rounded">j</span>
              <span className="text-[#94A3B8]">umps over the lazy dog.</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[['72', 'WPM'], ['98%', 'Accuracy'], ['0', 'Errors']].map(([v, l]) => (
                <div key={l} className="bg-white rounded-xl border border-[#E2E8F0] p-3 text-center">
                  <div className="text-xl font-bold text-[#0F172A]">{v}</div>
                  <div className="text-xs text-[#64748B]">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 py-3 sm:px-4 sm:py-4">
              <VirtualKeyboard layout="Pa'O" />
            </div>
          </div>
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-50 rounded-2xl -z-10" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-amber-50 rounded-2xl -z-10" />
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#F8FAFC] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#0F172A] text-center mb-12">Everything you need to type like a pro</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-[#E2E8F0] hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-[#0F172A] mb-2">{title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-[#2563EB] rounded-3xl p-12 grid sm:grid-cols-3 gap-8 text-center text-white">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <div className="text-5xl font-extrabold mb-2">{value}</div>
                <div className="text-blue-200 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-[#0F172A] mb-4">Ready to type faster?</h2>
          <p className="text-[#64748B] mb-8">Create a local learner profile and start building speed one practice session at a time.</p>
          <button
            onClick={() => navigate('/register')}
            className="bg-[#2563EB] text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-sm"
          >
            Create free account
          </button>
        </div>
      </section>

      <footer className="border-t border-[#E2E8F0] py-8 text-center text-sm text-[#94A3B8]">
        © 2026 Typing Tutor · Your learning data stays in this browser
      </footer>
    </div>
  )
}
