import { useState, useEffect, useRef, useCallback } from 'react'

const TEST_TEXT = 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump! The five boxing wizards jump quickly.'

type Difficulty = 'easy' | 'medium' | 'hard'
type Duration = 15 | 30 | 60 | 300

interface Result {
  wpm: number
  accuracy: number
  chars: number
  errors: number
}

export default function TestPage() {
  const [duration, setDuration] = useState<Duration>(60)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [phase, setPhase] = useState<'setup' | 'running' | 'result'>('setup')
  const [input, setInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [result, setResult] = useState<Result | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentText = TEST_TEXT.repeat(3)

  const startTest = () => {
    setPhase('running')
    setInput('')
    setTimeLeft(duration)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const finishTest = useCallback((inp: string) => {
    if (timerRef.current) clearInterval(timerRef.current)
    const errors = inp.split('').filter((c, i) => c !== currentText[i]).length
    const correct = inp.length - errors
    const wpm = Math.round((correct / 5) / (duration / 60))
    const accuracy = inp.length > 0 ? Math.round((correct / inp.length) * 100) : 100
    setResult({ wpm, accuracy, chars: inp.length, errors })
    setPhase('result')
  }, [currentText, duration])

  useEffect(() => {
    if (phase === 'running') {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setPhase('result-pending' as any)
            return 0
          }
          return t - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  useEffect(() => {
    if (timeLeft === 0 && phase === 'running') {
      finishTest(input)
    }
  }, [timeLeft, phase, input, finishTest])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val.length <= currentText.length) setInput(val)
  }

  const reset = () => {
    setPhase('setup')
    setInput('')
    setResult(null)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="max-w-3xl mx-auto pb-20 lg:pb-0">
      {phase === 'setup' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">Configure Your Test</h2>
            <p className="text-[var(--muted-foreground)] text-sm">Choose your test duration and difficulty level.</p>
          </div>

          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 space-y-6">
            {/* Duration */}
            <div>
              <label className="text-sm font-semibold text-[var(--foreground)] mb-3 block">Duration</label>
              <div className="grid grid-cols-4 gap-2">
                {([15, 30, 60, 300] as Duration[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                      duration === d
                        ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                        : 'bg-[var(--muted)] text-[var(--foreground)] border-transparent hover:border-[var(--border)]'
                    }`}
                  >
                    {d < 60 ? `${d} sec` : d === 60 ? '1 min' : '5 min'}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-sm font-semibold text-[var(--foreground)] mb-3 block">Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-3 rounded-xl text-sm font-semibold border capitalize transition-all ${
                      difficulty === d
                        ? d === 'easy' ? 'bg-green-500 text-white border-green-500'
                        : d === 'medium' ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                        : 'bg-red-500 text-white border-red-500'
                        : 'bg-[var(--muted)] text-[var(--foreground)] border-transparent hover:border-[var(--border)]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={startTest}
            className="w-full bg-[var(--primary)] text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 hover:-translate-y-0.5"
          >
            Start Test
          </button>
        </div>
      )}

      {phase === 'running' && (
        <div className="space-y-5">
          {/* Timer bar */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 flex items-center gap-4">
            <div className="flex-1 bg-[var(--muted)] rounded-full h-3">
              <div
                className="h-3 rounded-full bg-[var(--primary)] transition-all"
                style={{ width: `${(timeLeft / duration) * 100}%` }}
              />
            </div>
            <span className="font-mono text-xl font-bold text-[var(--foreground)] w-16 text-center">
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Text */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 cursor-text" onClick={() => inputRef.current?.focus()}>
            <div className="font-mono text-base leading-8">
              {currentText.slice(0, 200).split('').map((char, i) => {
                let cls = 'text-[var(--muted-foreground)]'
                if (i < input.length) cls = input[i] === char ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-100'
                else if (i === input.length) cls = 'bg-blue-200 text-blue-800 rounded typing-cursor'
                return <span key={i} className={`${cls} rounded-sm`}>{char}</span>
              })}
            </div>
          </div>

          <input
            ref={inputRef}
            value={input}
            onChange={handleInput}
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />

          <button
            onClick={() => finishTest(input)}
            className="w-full py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            End Test Early
          </button>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-[var(--primary)] to-blue-700 rounded-2xl p-6 text-white text-center">
            <p className="text-5xl font-extrabold mb-1">{result.wpm}</p>
            <p className="text-blue-100 text-lg font-medium">Words Per Minute</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Accuracy', value: `${result.accuracy}%`, color: 'text-green-600' },
              { label: 'Characters', value: result.chars, color: 'text-purple-600' },
              { label: 'Errors', value: result.errors, color: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <p className="text-sm font-semibold text-[var(--foreground)] mb-2">Performance</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-[var(--muted)] rounded-full h-2">
                <div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${Math.min(result.wpm, 100)}%` }} />
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">vs. avg 65 WPM</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 bg-[var(--primary)] text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              Retry
            </button>
            <button className="flex-1 bg-[var(--muted)] text-[var(--foreground)] py-3 rounded-xl font-semibold hover:bg-[var(--border)] transition-colors">
              Save Result
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
