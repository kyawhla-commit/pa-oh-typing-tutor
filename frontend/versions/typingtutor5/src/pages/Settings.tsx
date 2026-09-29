import { useState } from 'react'
import { User, BookOpen, Sliders } from 'lucide-react'

export default function Settings() {
  const [darkMode, setDarkMode] = useState(false)
  const [sounds, setSounds] = useState(true)
  const [targetWpm, setTargetWpm] = useState(100)
  const [dailyGoal, setDailyGoal] = useState(600)
  const [difficulty, setDifficulty] = useState('Medium')
  const [layout, setLayout] = useState('QWERTY')

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Settings</h1>
        <p className="text-sm text-[#64748B]">Customize your TypeMaster experience.</p>
      </div>

      <div className="space-y-4">
        {/* Profile */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-[#2563EB]" />
            <h2 className="font-semibold text-[#0F172A] text-sm">Profile</h2>
          </div>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#60A5FA] flex items-center justify-center text-white text-2xl font-bold">
              A
            </div>
            <button className="text-sm text-[#2563EB] font-medium border border-[#E2E8F0] px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
              Change Avatar
            </button>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Username', value: 'alex_johnson', type: 'text' },
              { label: 'Email', value: 'alex@email.com', type: 'email' },
            ].map(({ label, value, type }) => (
              <div key={label}>
                <label className="text-xs text-[#64748B] font-medium mb-1 block">{label}</label>
                <input
                  type={type}
                  defaultValue={value}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Learning */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-[#2563EB]" />
            <h2 className="font-semibold text-[#0F172A] text-sm">Learning</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-[#64748B] font-medium">Target WPM</label>
                <span className="text-sm font-bold text-[#2563EB]">{targetWpm}</span>
              </div>
              <input
                type="range" min={20} max={200} value={targetWpm}
                onChange={e => setTargetWpm(Number(e.target.value))}
                className="w-full accent-[#2563EB]"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-[#64748B] font-medium">Daily Goal (words)</label>
                <span className="text-sm font-bold text-[#2563EB]">{dailyGoal}</span>
              </div>
              <input
                type="range" min={100} max={2000} step={100} value={dailyGoal}
                onChange={e => setDailyGoal(Number(e.target.value))}
                className="w-full accent-[#2563EB]"
              />
            </div>
            <div>
              <label className="text-xs text-[#64748B] font-medium mb-2 block">Default Difficulty</label>
              <div className="flex gap-2">
                {['Easy', 'Medium', 'Hard'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      difficulty === d ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'border-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sliders size={16} className="text-[#2563EB]" />
            <h2 className="font-semibold text-[#0F172A] text-sm">Preferences</h2>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Dark Mode', desc: 'Switch to dark theme', value: darkMode, set: setDarkMode },
              { label: 'Sound Effects', desc: 'Play key sounds while typing', value: sounds, set: setSounds },
            ].map(({ label, desc, value, set }) => (
              <div key={label} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[#0F172A]">{label}</div>
                  <div className="text-xs text-[#94A3B8]">{desc}</div>
                </div>
                <button
                  onClick={() => set(!value)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${value ? 'bg-[#2563EB]' : 'bg-[#E2E8F0]'}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? 'left-5' : 'left-1'}`}
                  />
                </button>
              </div>
            ))}
            <div>
              <label className="text-xs text-[#64748B] font-medium mb-2 block">Keyboard Layout</label>
              <div className="flex gap-2">
                {['QWERTY', 'Dvorak', 'Colemak'].map(l => (
                  <button
                    key={l}
                    onClick={() => setLayout(l)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      layout === l ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'border-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <button className="w-full bg-[#2563EB] text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm">
          Save Changes
        </button>
      </div>
    </div>
  )
}
