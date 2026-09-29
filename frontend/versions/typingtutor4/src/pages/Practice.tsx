import { useState, useEffect, useRef, useCallback } from 'react'

const SAMPLE_TEXTS = {
  words: 'the quick brown fox jumps over the lazy dog pack my box with five dozen liquor jugs how vexingly quick daft zebras jump',
  sentences: 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!',
  paragraph: 'Programming is the process of creating a set of instructions that tell a computer how to perform a task. It can be done using many programming languages, such as JavaScript, Python, and TypeScript.',
  code: 'const greet = (name: string) => { return `Hello, ${name}!`; }; console.log(greet("World"));',
}

type Mode = keyof typeof SAMPLE_TEXTS

const KEYBOARD_ROWS = [
  ['`','1','2','3','4','5','6','7','8','9','0','-','='],
  ['q','w','e','r','t','y','u','i','o','p','[',']','\\'],
  ['a','s','d','f','g','h','j','k','l',';',"'"],
  ['z','x','c','v','b','n','m',',','.','/'],
]

const FINGER_MAP: Record<string, string> = {
  '`': 'left-pinky', '1': 'left-pinky', 'q': 'left-pinky', 'a': 'left-pinky', 'z': 'left-pinky',
  '2': 'left-ring', 'w': 'left-ring', 's': 'left-ring', 'x': 'left-ring',
  '3': 'left-middle', 'e': 'left-middle', 'd': 'left-middle', 'c': 'left-middle',
  '4': 'left-index', 'r': 'left-index', 'f': 'left-index', 'v': 'left-index',
  '5': 'left-index', 't': 'left-index', 'g': 'left-index', 'b': 'left-index',
  '6': 'right-index', 'y': 'right-index', 'h': 'right-index', 'n': 'right-index',
  '7': 'right-index', 'u': 'right-index', 'j': 'right-index', 'm': 'right-index',
  '8': 'right-middle', 'i': 'right-middle', 'k': 'right-middle', ',': 'right-middle',
  '9': 'right-ring', 'o': 'right-ring', 'l': 'right-ring', '.': 'right-ring',
  '0': 'right-pinky', 'p': 'right-pinky', ';': 'right-pinky', '/': 'right-pinky',
}

const FINGER_COLORS: Record<string, string> = {
  'left-pinky': '#F87171',
  'left-ring': '#FB923C',
  'left-middle': '#FBBF24',
  'left-index': '#34D399',
  'right-index': '#60A5FA',
  'right-middle': '#818CF8',
  'right-ring': '#F472B6',
  'right-pinky': '#A78BFA',
}

export default function Practice() {
  const [mode, setMode] = useState<Mode>('words')
  const [text] = useState(() => SAMPLE_TEXTS.words)
  const [input, setInput] = useState('')
  const [started, setStarted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [activeKey, setActiveKey] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentText = SAMPLE_TEXTS[mode]

  const errors = input.split('').filter((c, i) => c !== currentText[i]).length
  const correct = input.length - errors
  const wpm = elapsed > 0 ? Math.round((correct / 5) / (elapsed / 60)) : 0
  const accuracy = input.length > 0 ? Math.round((correct / input.length) * 100) : 100

  const currentChar = currentText[input.length]?.toLowerCase() || ''

  useEffect(() => {
    if (started && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [started])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!started && val.length > 0) setStarted(true)
    if (val.length <= currentText.length) setInput(val)
  }, [currentText, started])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    setActiveKey(e.key.toLowerCase())
    setTimeout(() => setActiveKey(''), 150)
  }

  const reset = () => {
    setInput('')
    setStarted(false)
    setElapsed(0)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    inputRef.current?.focus()
  }

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const isComplete = input.length === currentText.length

  return (
    <div className="space-y-5 pb-20 lg:pb-0 max-w-4xl mx-auto">
      {/* Mode selector + timer */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex bg-[var(--muted)] rounded-xl p-1 gap-1">
          {(Object.keys(SAMPLE_TEXTS) as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); reset() }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                mode === m ? 'bg-white text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 font-mono text-2xl font-bold text-[var(--foreground)]">
          {formatTime(elapsed)}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main typing area */}
        <div className="lg:col-span-2 space-y-3">
          {/* Text panel */}
          <div
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 cursor-text relative"
            onClick={() => inputRef.current?.focus()}
          >
            <div className="font-mono text-base leading-8 select-none">
              {currentText.split('').map((char, i) => {
                let className = 'text-[var(--muted-foreground)]'
                if (i < input.length) {
                  className = input[i] === char ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-100'
                } else if (i === input.length) {
                  className = 'bg-blue-200 text-blue-800 rounded typing-cursor'
                }
                return (
                  <span key={i} className={`${className} rounded-sm`}>
                    {char}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isComplete}
            placeholder="Start typing to begin..."
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)] transition-all placeholder:text-[var(--muted-foreground)]"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />

          {/* Complete banner */}
          {isComplete && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-green-800">🎉 Great job!</p>
                <p className="text-sm text-green-700">{wpm} WPM · {accuracy}% accuracy · {errors} errors</p>
              </div>
              <button
                onClick={reset}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Live stats panel */}
        <div className="space-y-3">
          {[
            { label: 'WPM', value: wpm, color: 'text-[var(--primary)]' },
            { label: 'Accuracy', value: `${accuracy}%`, color: 'text-green-600' },
            { label: 'Errors', value: errors, color: 'text-red-500' },
            { label: 'Characters', value: input.length, color: 'text-purple-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{stat.label}</p>
            </div>
          ))}
          <button onClick={reset} className="w-full bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] rounded-xl py-2 text-sm font-medium transition-colors">
            Reset
          </button>
        </div>
      </div>

      {/* Virtual Keyboard */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground)] mb-3">Virtual Keyboard</h3>
        <div className="space-y-1.5 overflow-x-auto">
          {KEYBOARD_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1 justify-center" style={{ paddingLeft: `${ri * 12}px` }}>
              {row.map(key => {
                const finger = FINGER_MAP[key]
                const fingerColor = finger ? FINGER_COLORS[finger] : '#E2E8F0'
                const isActive = activeKey === key
                const isCurrent = currentChar === key
                return (
                  <div
                    key={key}
                    className={`
                      min-w-[28px] h-8 rounded-md flex items-center justify-center
                      text-xs font-mono font-semibold border transition-all select-none
                      ${isActive ? 'scale-90 shadow-inner' : isCurrent ? 'scale-110 shadow-md' : ''}
                    `}
                    style={{
                      backgroundColor: isActive ? fingerColor : isCurrent ? fingerColor : `${fingerColor}22`,
                      borderColor: isCurrent ? fingerColor : '#E2E8F0',
                      color: isActive || isCurrent ? '#fff' : '#475569',
                    }}
                  >
                    {key.toUpperCase()}
                  </div>
                )
              })}
            </div>
          ))}
          {/* Space bar */}
          <div className="flex justify-center mt-0.5">
            <div
              className="h-8 w-48 rounded-md border flex items-center justify-center text-xs font-mono text-[var(--muted-foreground)] transition-all"
              style={{
                backgroundColor: activeKey === ' ' ? '#60A5FA' : currentChar === ' ' ? '#93C5FD' : '#F1F5F9',
                borderColor: currentChar === ' ' ? '#60A5FA' : '#E2E8F0',
              }}
            >
              SPACE
            </div>
          </div>
        </div>
        {/* Finger legend */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--border)]">
          {Object.entries(FINGER_COLORS).map(([finger, color]) => (
            <div key={finger} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-[var(--muted-foreground)] capitalize">{finger.replace('-', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
