import { useState, useRef, useEffect } from 'react'

const MODES = ['Words', 'Sentences', 'Paragraph', 'Code']

const TEXTS: Record<string, string> = {
  Words: 'the quick brown fox jumps over the lazy dog and runs into the forest',
  Sentences: 'The quick brown fox jumps over the lazy dog. A journey of a thousand miles begins with a single step.',
  Paragraph: 'Typing is a fundamental skill in the digital age. Regular practice helps improve speed and accuracy over time. Focus on rhythm and precision rather than just raw speed.',
  Code: 'const greet = (name) => { return `Hello, ${name}!`; }; console.log(greet("world"));',
}

const KEYBOARD_ROWS = [
  [['`','~'],['1','!'],['2','@'],['3','#'],['4','$'],['5','%'],['6','^'],['7','&'],['8','*'],['9','('],['0',')'],['−','_'],['=','+']],
  [['q'],['w'],['e'],['r'],['t'],['y'],['u'],['i'],['o'],['p'],['[','{'],[']','}'],['\\','|']],
  [['a'],['s'],['d'],['f'],['g'],['h'],['j'],['k'],['l'],[';',':'],[`'`,'"']],
  [['z'],['x'],['c'],['v'],['b'],['n'],['m'],[',','<'],['.','>'],['/','>']],
]

export default function Practice() {
  const [mode, setMode] = useState('Words')
  const [input, setInput] = useState('')
  const [started, setStarted] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [activeKey, setActiveKey] = useState('')

  const text = TEXTS[mode]

  useEffect(() => {
    if (started) {
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - (startTime ?? Date.now()))
      }, 500)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [started, startTime])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!started && val.length === 1) {
      setStarted(true)
      setStartTime(Date.now())
    }
    if (val.length <= text.length) setInput(val)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    setActiveKey(e.key.toLowerCase())
    setTimeout(() => setActiveKey(''), 150)
  }

  const reset = () => {
    setInput('')
    setStarted(false)
    setStartTime(null)
    setElapsed(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
    inputRef.current?.focus()
  }

  const correctChars = input.split('').filter((c, i) => c === text[i]).length
  const errors = input.length - correctChars
  const wpm = started && elapsed > 0 ? Math.round((correctChars / 5) / (elapsed / 60000)) : 0
  const accuracy = input.length > 0 ? Math.round((correctChars / input.length) * 100) : 100
  const minutes = Math.floor(elapsed / 60000)
  const seconds = Math.floor((elapsed % 60000) / 1000)
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Practice</h1>
          <p className="text-sm text-[#64748B]">Focus, type, improve.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-xl p-1">
          {MODES.map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); reset() }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === m ? 'bg-[#2563EB] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_160px] gap-4 mb-4">
        {/* Typing area */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-[#64748B] font-medium uppercase tracking-wide">Type the text below</span>
            <span className="font-mono text-lg font-bold text-[#0F172A]">{timeStr}</span>
          </div>

          {/* Text display */}
          <div
            className="font-mono text-base leading-loose mb-4 p-4 bg-[#F8FAFC] rounded-xl cursor-text select-none"
            onClick={() => inputRef.current?.focus()}
          >
            {text.split('').map((char, i) => {
              let cls = 'text-[#94A3B8]'
              if (i < input.length) {
                cls = input[i] === char ? 'text-[#16A34A]' : 'text-[#DC2626] bg-red-50'
              } else if (i === input.length) {
                cls = 'bg-[#2563EB] text-white rounded'
              }
              return (
                <span key={i} className={cls}>
                  {char}
                </span>
              )
            })}
          </div>

          <input
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 font-mono text-sm text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all"
            placeholder="Start typing here..."
          />

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <div className="w-24 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563EB] rounded-full transition-all"
                  style={{ width: `${Math.min((input.length / text.length) * 100, 100)}%` }}
                />
              </div>
              {input.length}/{text.length} chars
            </div>
            <button onClick={reset} className="text-xs text-[#64748B] hover:text-[#2563EB] transition-colors font-medium">
              Reset
            </button>
          </div>
        </div>

        {/* Live stats */}
        <div className="flex flex-col gap-3">
          {[
            { label: 'WPM', value: wpm, color: 'text-[#2563EB]' },
            { label: 'Accuracy', value: `${accuracy}%`, color: 'text-[#16A34A]' },
            { label: 'Errors', value: errors, color: errors > 0 ? 'text-[#DC2626]' : 'text-[#94A3B8]' },
            { label: 'Chars', value: input.length, color: 'text-[#64748B]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-[#E2E8F0] p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-[#94A3B8] mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Virtual Keyboard */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <div className="text-xs text-[#64748B] font-medium mb-3">Virtual Keyboard</div>
        <div className="space-y-1.5">
          {KEYBOARD_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1 justify-center">
              {row.map(([main]) => {
                const isActive = activeKey === main.toLowerCase()
                return (
                  <div
                    key={main}
                    className={`min-w-[32px] h-8 px-1.5 rounded-lg flex items-center justify-center text-xs font-medium border transition-all duration-100 ${
                      isActive
                        ? 'bg-[#2563EB] text-white border-[#2563EB] scale-95'
                        : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]'
                    }`}
                  >
                    {main.toUpperCase()}
                  </div>
                )
              })}
            </div>
          ))}
          <div className="flex justify-center">
            <div
              className={`w-48 h-8 rounded-lg flex items-center justify-center text-xs font-medium border transition-all duration-100 ${
                activeKey === ' '
                  ? 'bg-[#2563EB] text-white border-[#2563EB]'
                  : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]'
              }`}
            >
              SPACE
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
