import { useState, useRef, useEffect } from 'react'
import { X, RotateCcw, TrendingUp } from 'lucide-react'
import { useLearningData } from '../../data/LearningContext'

const DURATIONS = [15, 30, 60, 300]
const DIFFICULTIES = ['Easy', 'Medium', 'Hard']
const TEXTS: Record<string, string> = {
  Easy: 'the quick brown fox jumps over the lazy dog and then runs back to the beginning again for another pass',
  Medium: 'Programming requires both analytical thinking and creative problem-solving skills that develop over years of dedicated practice.',
  Hard: 'The Byzantine Empire, also referred to as the Eastern Roman Empire, was the continuation of the Roman Empire in its eastern provinces.',
}

type Result = { wpm: number; accuracy: number; chars: number; errors: number }

export default function Test() {
  const [duration, setDuration] = useState(60)
  const [difficulty, setDifficulty] = useState('Medium')
  const [phase, setPhase] = useState<'setup' | 'typing' | 'result'>('setup')
  const [input, setInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [result, setResult] = useState<Result | null>(null)
  const [saved, setSaved] = useState(false)
  const { addResult } = useLearningData()
  const inputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const text = TEXTS[difficulty]

  const startTest = () => {
    setPhase('typing')
    setInput('')
    setTimeLeft(duration)
    setTimeout(() => inputRef.current?.focus(), 50)
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          finishTest()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const finishTest = () => {
    setPhase('result')
    clearInterval(intervalRef.current!)
  }

  useEffect(() => {
    if (phase === 'typing' && input.length === text.length) finishTest()
  }, [input])

  useEffect(() => {
    if (phase === 'result') {
      const correctChars = input.split('').filter((c, i) => c === text[i]).length
      const errors = input.length - correctChars
      const minutes = (duration - timeLeft) / 60 || duration / 60
      setResult({
        wpm: Math.round((correctChars / 5) / minutes),
        accuracy: input.length > 0 ? Math.round((correctChars / input.length) * 100) : 0,
        chars: input.length,
        errors,
      })
    }
  }, [phase])

  const resetTest = () => {
    clearInterval(intervalRef.current!)
    setPhase('setup')
    setInput('')
    setResult(null)
    setSaved(false)
    setTimeLeft(duration)
  }

  const saveResult = () => {
    if (!result || saved) return
    addResult({ mode: 'test', wpm: result.wpm, accuracy: result.accuracy, characters: result.chars, errors: result.errors, durationSeconds: Math.max(1, duration - timeLeft) })
    setSaved(true)
  }

  if (phase === 'result' && result) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp size={28} className="text-[#2563EB]" />
            </div>
            <h2 className="text-2xl font-bold text-[#0F172A] mb-1">Test Complete!</h2>
            <p className="text-[#64748B] text-sm">Here are your results</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { label: 'Speed', value: `${result.wpm}`, unit: 'WPM', color: 'text-[#2563EB]' },
              { label: 'Accuracy', value: `${result.accuracy}`, unit: '%', color: 'text-[#16A34A]' },
              { label: 'Characters', value: `${result.chars}`, unit: 'chars', color: 'text-[#64748B]' },
              { label: 'Errors', value: `${result.errors}`, unit: 'errors', color: result.errors > 5 ? 'text-[#DC2626]' : 'text-[#64748B]' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="bg-[#F8FAFC] rounded-2xl p-5 text-center border border-[#E2E8F0]">
                <div className={`text-3xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-[#94A3B8] mt-1">{label} · {unit}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetTest}
              className="flex-1 flex items-center justify-center gap-2 border border-[#E2E8F0] text-[#0F172A] font-medium py-2.5 rounded-xl hover:bg-[#F8FAFC] transition-colors text-sm"
            >
              <RotateCcw size={15} /> Retry
            </button>
            <button
              onClick={saveResult}
              className="flex-1 bg-[#2563EB] text-white font-medium py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm"
            >
              {saved ? 'Saved to progress' : 'Save Result'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'typing') {
    const correctChars = input.split('').filter((c, i) => c === text[i]).length

    return (
      <div className="p-6 lg:p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="text-4xl font-bold font-mono text-[#0F172A]">{timeLeft}s</div>
          <button onClick={resetTest} className="text-[#64748B] hover:text-[#DC2626] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 mb-4">
          <div className="font-mono text-lg leading-loose mb-4 p-4 bg-[#F8FAFC] rounded-xl">
            {text.split('').map((char, i) => {
              let cls = 'text-[#94A3B8]'
              if (i < input.length) cls = input[i] === char ? 'text-[#16A34A]' : 'text-[#DC2626] bg-red-50'
              else if (i === input.length) cls = 'bg-[#2563EB] text-white rounded'
              return <span key={i} className={cls}>{char}</span>
            })}
          </div>
          <input
            ref={inputRef}
            value={input}
            onChange={e => { if (e.target.value.length <= text.length) setInput(e.target.value) }}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all"
            placeholder="Type here..."
          />
        </div>

        <div className="flex gap-4 text-sm text-[#64748B]">
          <span className="font-mono">
            {Math.round((correctChars / 5) / Math.max((duration - timeLeft) / 60, 0.016))} WPM
          </span>
          <span className="font-mono">
            {input.length > 0 ? Math.round((correctChars / input.length) * 100) : 100}% accuracy
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Typing Test</h1>
        <p className="text-sm text-[#64748B]">Test your speed and accuracy.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-6">
        <div>
          <label className="text-sm font-medium text-[#0F172A] mb-3 block">Duration</label>
          <div className="flex gap-2 flex-wrap">
            {DURATIONS.map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  duration === d
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB]'
                }`}
              >
                {d < 60 ? `${d} sec` : `${d / 60} min`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[#0F172A] mb-3 block">Difficulty</label>
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  difficulty === d
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startTest}
          className="w-full bg-[#2563EB] text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm"
        >
          Start Test
        </button>
      </div>
    </div>
  )
}
