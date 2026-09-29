import { useState, useEffect, useRef, useCallback } from 'react'

const lessons = [
  { id: 1, title: 'Pa-O Alphabet Level 1', difficulty: 'Beginner', text: 'က ခ ဂ ဃ င စꩡ ꩡ ꩢ ꩣ ꩤ' },
  { id: 2, title: 'Basic Words Practice', difficulty: 'Beginner', text: 'ပ အ ိ ု ဝ် ႏ ဘ သ ရ ေ ꩻ' },
  { id: 3, title: 'Pa-O Sentence 1', difficulty: 'Intermediate', text: 'ပအိုဝ်ႏ ဘာသာ ရေꩻ တောင်ႏပေါ်ႏ' },
]

const paOText = 'ပ အ ိ ု ဝ် ႏ ဘ သ ရ ေ ꩻ က ခ ဂ ဃ'

const keyboardRows = [
  ['ꩠ', 'ꩡ', 'ꩢ', 'ꩣ', 'ꩤ', 'ꩥ', 'ꩦ', 'ꩧ', 'ꩨ', 'ꩩ'],
  ['ပ', 'အ', 'က', 'ခ', 'ဂ', 'ဃ', 'င', 'စ', 'ဆ', 'ဇ'],
  ['ေ', 'ာ', 'ိ', 'ီ', 'ု', 'ူ', 'ဲ', 'ံ', 'ႏ', 'ꩻ'],
]

export default function TypingPractice() {
  const [selectedLesson, setSelectedLesson] = useState(0)
  const [typed, setTyped] = useState('')
  const [started, setStarted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [pressedKey, setPressedKey] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const target = paOText

  const startTimer = useCallback(() => {
    if (!started) {
      setStarted(true)
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
  }, [started])

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!started && val.length > 0) startTimer()
    setTyped(val)
  }

  const reset = () => {
    setTyped('')
    setStarted(false)
    setElapsed(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
    inputRef.current?.focus()
  }

  const correctChars = typed.split('').filter((c, i) => c === target[i]).length
  const accuracy = typed.length > 0 ? Math.round((correctChars / typed.length) * 100) : 100
  const wpm = elapsed > 0 ? Math.round((typed.length / 5) / (elapsed / 60)) : 0
  const errors = typed.length - correctChars

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto page-transition">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Typing Practice</h1>
          <p className="text-muted-foreground mt-1">Practice Pa-O Unicode typing with real-time feedback</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
            ⏱ {Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Lesson selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {lessons.map((l, i) => (
          <button
            key={l.id}
            onClick={() => { setSelectedLesson(i); reset() }}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              selectedLesson === i
                ? 'bg-primary text-white border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40'
            }`}
          >
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${l.difficulty === 'Beginner' ? 'bg-secondary' : l.difficulty === 'Intermediate' ? 'bg-accent' : 'bg-error'}`}></span>
            {l.title}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Speed', value: wpm, unit: 'WPM', color: 'text-primary' },
          { label: 'Accuracy', value: accuracy, unit: '%', color: accuracy >= 90 ? 'text-secondary' : 'text-error' },
          { label: 'Errors', value: errors, unit: '', color: errors === 0 ? 'text-secondary' : 'text-error' },
        ].map(({ label, value, unit, color }) => (
          <div key={label} className="bg-card rounded-xl p-4 border border-border text-center">
            <div className={`font-mono font-bold text-2xl ${color}`}>{value}<span className="text-base text-muted-foreground ml-1">{unit}</span></div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Text display */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{lessons[selectedLesson].title}</span>
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
            lessons[selectedLesson].difficulty === 'Beginner' ? 'bg-green-50 text-secondary' :
            lessons[selectedLesson].difficulty === 'Intermediate' ? 'bg-amber-50 text-accent' :
            'bg-red-50 text-error'
          }`}>{lessons[selectedLesson].difficulty}</span>
        </div>

        {/* Target text with character highlighting */}
        <div className="font-myanmar text-3xl leading-loose tracking-wider mb-6 select-none min-h-[80px]">
          {target.split('').map((char, i) => {
            const typedChar = typed[i]
            const isCurrent = i === typed.length
            const isCorrect = typedChar === char
            const isTyped = typedChar !== undefined

            return (
              <span
                key={i}
                className={`relative transition-colors ${
                  isCurrent
                    ? 'bg-primary/10 text-primary'
                    : isTyped
                    ? isCorrect
                      ? 'text-secondary'
                      : 'text-error bg-red-50 rounded'
                    : 'text-foreground/40'
                }`}
              >
                {isCurrent && <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary typing-cursor rounded-full"></span>}
                {char}
              </span>
            )
          })}
        </div>

        {/* Input */}
        <div className="relative">
          <input
            ref={inputRef}
            value={typed}
            onChange={handleInput}
            maxLength={target.length}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 font-myanmar text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            placeholder="ဒီမှာ ရိုက်ပါ… (Type here)"
            autoFocus
          />
          {typed.length === target.length && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-sm font-bold">Complete! ✓</div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mb-8">
        <button onClick={reset} className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          ↺ Reset
        </button>
        <button className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors">
          Next Lesson →
        </button>
      </div>

      {/* Virtual Keyboard */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <span>⌨</span> Pa-O Virtual Keyboard
          <span className="text-xs text-muted-foreground font-normal ml-2">Hover to explore characters</span>
        </h3>
        <div className="space-y-2">
          {keyboardRows.map((row, ri) => (
            <div key={ri} className={`flex gap-1.5 ${ri === 1 ? 'ml-4' : ri === 2 ? 'ml-8' : ''}`}>
              {row.map((key) => {
                const isNext = key === target[typed.length]
                return (
                  <button
                    key={key}
                    onMouseEnter={() => setPressedKey(key)}
                    onMouseLeave={() => setPressedKey(null)}
                    className={`w-10 h-10 rounded-lg font-myanmar text-sm flex items-center justify-center transition-all border font-medium select-none cursor-pointer ${
                      isNext
                        ? 'bg-primary text-white border-primary shadow-md shadow-blue-200 scale-105'
                        : pressedKey === key
                        ? 'bg-muted border-primary text-primary scale-105'
                        : 'bg-muted/50 border-border text-foreground hover:bg-muted hover:border-primary/40'
                    }`}
                  >
                    {key}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
