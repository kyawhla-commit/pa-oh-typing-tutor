import { useState, useEffect, useRef, useCallback } from 'react'

const testTexts = {
  Beginner: 'က ခ ဂ ဃ င စꩡ ꩡ ꩢ ꩣ ပ အ ိ ု ဝ် ႏ ဘ သ ရ ေ ꩻ',
  Intermediate: 'ပအိုဝ်ႏ ဘာသာ ရေꩻ တောင်ႏပေါ်ႏ ကꩻ နောင် ချင်း',
  Advanced: 'ပအိုဝ်ႏ လိုꩻမျိုꩻ ဘာသာ ရေꩻ ကျောင်ꩻ ပညာ တောင်ႏပေါ်ႏ ခမ်းနေ့',
}

interface Results {
  wpm: number
  accuracy: number
  chars: number
  errors: number
}

export default function TypingTest() {
  const [duration, setDuration] = useState(60)
  const [difficulty, setDifficulty] = useState<keyof typeof testTexts>('Beginner')
  const [typed, setTyped] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<Results | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const target = testTexts[difficulty]

  const endTest = useCallback(() => {
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    const correct = typed.split('').filter((c, i) => c === target[i]).length
    setResults({
      wpm: Math.round((typed.length / 5) / (duration / 60)),
      accuracy: typed.length ? Math.round((correct / typed.length) * 100) : 0,
      chars: typed.length,
      errors: typed.length - correct,
    })
  }, [typed, target, duration])

  useEffect(() => {
    if (running && timeLeft === 0) endTest()
  }, [running, timeLeft, endTest])

  const start = () => {
    setTyped('')
    setResults(null)
    setTimeLeft(duration)
    setRunning(true)
    intervalRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000)
    inputRef.current?.focus()
  }

  const reset = () => {
    setTyped('')
    setResults(null)
    setRunning(false)
    setTimeLeft(duration)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!running) return
    setTyped(e.target.value)
  }

  const pct = ((duration - timeLeft) / duration) * 100
  const liveWpm = timeLeft < duration ? Math.round((typed.length / 5) / ((duration - timeLeft) / 60 || 0.1)) : 0
  const liveAccuracy = typed.length ? Math.round(typed.split('').filter((c, i) => c === target[i]).length / typed.length * 100) : 100

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto page-transition">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Typing Test</h1>
        <p className="text-muted-foreground mt-1">Test your Pa-O typing speed and accuracy</p>
      </div>

      {results ? (
        /* Results */
        <div className="page-transition">
          <div className="bg-gradient-to-br from-primary to-blue-700 rounded-2xl p-8 text-white text-center mb-6">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-display text-2xl font-bold mb-2">Test Complete!</h2>
            <p className="text-blue-100">Great work on your Pa-O typing practice</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Speed', value: results.wpm, unit: 'WPM', color: 'text-primary', icon: '⚡' },
              { label: 'Accuracy', value: results.accuracy, unit: '%', color: results.accuracy >= 90 ? 'text-secondary' : 'text-accent', icon: '🎯' },
              { label: 'Characters', value: results.chars, unit: '', color: 'text-foreground', icon: '✍' },
              { label: 'Errors', value: results.errors, unit: '', color: results.errors === 0 ? 'text-secondary' : 'text-error', icon: '❌' },
            ].map(({ label, value, unit, color, icon }) => (
              <div key={label} className="bg-card rounded-2xl p-5 border border-border text-center hover:shadow-md transition-shadow">
                <div className="text-2xl mb-2">{icon}</div>
                <div className={`font-mono font-bold text-3xl ${color}`}>{value}<span className="text-lg text-muted-foreground ml-1">{unit}</span></div>
                <div className="text-sm text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-blue-700 transition-colors">
              ↺ Try Again
            </button>
            <button onClick={() => { reset(); setDifficulty('Advanced') }} className="px-6 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors">
              Next Challenge →
            </button>
            <button className="px-6 py-3 rounded-xl border border-border text-muted-foreground font-semibold hover:bg-muted transition-colors">
              Share Result ↗
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Options */}
          <div className="bg-card rounded-2xl border border-border p-5 mb-6">
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Duration</div>
                <div className="flex gap-2">
                  {[30, 60, 120].map(d => (
                    <button key={d} onClick={() => { setDuration(d); setTimeLeft(d); reset() }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${duration === d ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Difficulty</div>
                <div className="flex gap-2">
                  {(['Beginner', 'Intermediate', 'Advanced'] as const).map(d => (
                    <button key={d} onClick={() => { setDifficulty(d); reset() }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${difficulty === d ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Timer ring + stats */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="6" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--primary)" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
                  strokeLinecap="round" className="transition-all" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono font-bold text-xl text-foreground">{timeLeft}</span>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="font-mono font-bold text-2xl text-primary">{liveWpm}</div>
                <div className="text-xs text-muted-foreground">WPM</div>
              </div>
              <div className="text-center">
                <div className={`font-mono font-bold text-2xl ${liveAccuracy >= 90 ? 'text-secondary' : 'text-accent'}`}>{liveAccuracy}%</div>
                <div className="text-xs text-muted-foreground">Accuracy</div>
              </div>
            </div>
          </div>

          {/* Text area */}
          <div className="bg-card rounded-2xl border border-border p-6 mb-4">
            <div className="font-myanmar text-2xl leading-loose tracking-wide mb-6 min-h-[80px] select-none">
              {target.split('').map((char, i) => {
                const typedChar = typed[i]
                const isCurrent = i === typed.length
                const isTyped = typedChar !== undefined
                return (
                  <span key={i} className={`relative transition-colors ${
                    isCurrent ? 'bg-primary/10 text-primary' :
                    isTyped ? (typedChar === char ? 'text-secondary' : 'text-error bg-red-50 rounded') :
                    'text-foreground/40'
                  }`}>
                    {isCurrent && <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary typing-cursor rounded-full"></span>}
                    {char}
                  </span>
                )
              })}
            </div>
            <input
              ref={inputRef}
              value={typed}
              onChange={handleInput}
              disabled={!running}
              maxLength={target.length}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 font-myanmar text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={running ? 'ရိုက်ပါ…' : 'Press Start to begin'}
            />
          </div>

          <div className="flex gap-3">
            {!running ? (
              <button onClick={start} className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-blue-700 transition-colors shadow-md shadow-blue-100">
                ▶ Start Test
              </button>
            ) : (
              <button onClick={endTest} className="px-6 py-3 rounded-xl bg-error text-white font-semibold hover:bg-red-600 transition-colors">
                ■ End Test
              </button>
            )}
            <button onClick={reset} className="px-6 py-3 rounded-xl border border-border text-muted-foreground font-semibold hover:bg-muted transition-colors">
              ↺ Reset
            </button>
          </div>
        </>
      )}
    </div>
  )
}
