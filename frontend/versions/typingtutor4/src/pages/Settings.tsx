import { useState } from 'react'

interface Props {
  darkMode: boolean
  setDarkMode: (v: boolean) => void
}

export default function Settings({ darkMode, setDarkMode }: Props) {
  const [username, setUsername] = useState('Alex Johnson')
  const [email, setEmail] = useState('alex@example.com')
  const [targetWpm, setTargetWpm] = useState(100)
  const [dailyGoal, setDailyGoal] = useState(30)
  const [difficulty, setDifficulty] = useState('medium')
  const [sound, setSound] = useState(true)
  const [keyboardLayout, setKeyboardLayout] = useState('qwerty')
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20 lg:pb-0">
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-800 text-sm font-medium">
          <span>✓</span> Settings saved successfully.
        </div>
      )}

      {/* Profile */}
      <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-[var(--foreground)]">Profile</h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            A
          </div>
          <div>
            <button className="text-sm text-[var(--primary)] font-semibold hover:underline">Change avatar</button>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">JPG, PNG or GIF. Max 2MB.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Username</span>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="mt-1.5 w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)] transition-all"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Email</span>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              className="mt-1.5 w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)] transition-all"
            />
          </label>
        </div>
      </section>

      {/* Learning */}
      <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-[var(--foreground)]">Learning</h3>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Target WPM</span>
            <span className="font-mono font-bold text-[var(--primary)]">{targetWpm} WPM</span>
          </div>
          <input
            type="range"
            min={20}
            max={200}
            value={targetWpm}
            onChange={e => setTargetWpm(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mt-1">
            <span>20</span><span>200</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Daily Goal</span>
            <span className="font-mono font-bold text-[var(--primary)]">{dailyGoal} min</span>
          </div>
          <input
            type="range"
            min={5}
            max={120}
            step={5}
            value={dailyGoal}
            onChange={e => setDailyGoal(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mt-1">
            <span>5 min</span><span>2 hrs</span>
          </div>
        </div>

        <div>
          <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Difficulty</span>
          <div className="flex gap-2 mt-2">
            {['easy', 'medium', 'hard'].map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-xl text-sm capitalize font-medium border transition-all ${
                  difficulty === d
                    ? d === 'easy' ? 'bg-green-500 text-white border-green-500'
                    : d === 'medium' ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-red-500 text-white border-red-500'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-[var(--foreground)]">Preferences</h3>

        {[
          { label: 'Dark Mode', sub: 'Switch to dark theme for comfortable night typing', value: darkMode, onChange: setDarkMode },
          { label: 'Sound Effects', sub: 'Play sounds on keypress and achievements', value: sound, onChange: setSound },
        ].map(pref => (
          <div key={pref.label} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">{pref.label}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{pref.sub}</p>
            </div>
            <button
              onClick={() => pref.onChange(!pref.value)}
              className={`relative w-11 h-6 rounded-full transition-colors ${pref.value ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${pref.value ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        ))}

        <div>
          <span className="text-sm font-medium text-[var(--foreground)] block mb-2">Keyboard Layout</span>
          <select
            value={keyboardLayout}
            onChange={e => setKeyboardLayout(e.target.value)}
            className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          >
            <option value="qwerty">QWERTY (Standard)</option>
            <option value="dvorak">Dvorak</option>
            <option value="colemak">Colemak</option>
            <option value="azerty">AZERTY (French)</option>
          </select>
        </div>
      </section>

      <div className="flex gap-3">
        <button
          onClick={save}
          className="flex-1 bg-[var(--primary)] text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          Save Changes
        </button>
        <button className="px-6 py-3 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-semibold hover:bg-[var(--muted)] transition-colors">
          Reset
        </button>
      </div>

      {/* Danger zone */}
      <section className="bg-red-50 border border-red-100 rounded-2xl p-5">
        <h3 className="font-semibold text-red-800 mb-1">Danger Zone</h3>
        <p className="text-xs text-red-600 mb-3">These actions cannot be undone.</p>
        <div className="flex gap-3">
          <button className="text-sm font-semibold text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors">
            Reset Progress
          </button>
          <button className="text-sm font-semibold text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors">
            Delete Account
          </button>
        </div>
      </section>
    </div>
  )
}
