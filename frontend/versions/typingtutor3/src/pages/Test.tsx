import { useState, useEffect, useCallback, useRef } from 'react';
import TypingBox, { createTypingState, processKeyPress, TypingState } from '../components/TypingBox';
import VirtualKeyboard from '../components/VirtualKeyboard';
import { PRACTICE_TEXTS } from '../data/mockData';

const DURATIONS = [15, 30, 60, 300];
const DURATION_LABELS: Record<number, string> = { 15: '15s', 30: '30s', 60: '1m', 300: '5m' };

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type Phase = 'idle' | 'typing' | 'done';

export default function Test() {
  const [duration, setDuration] = useState(60);
  const [phase, setPhase] = useState<Phase>('idle');
  const [timeLeft, setTimeLeft] = useState(60);
  const [state, setState] = useState<TypingState>(() =>
    createTypingState(getRandom(PRACTICE_TEXTS.words) + ' ' + getRandom(PRACTICE_TEXTS.words))
  );
  const [pressedKey, setPressedKey] = useState('');
  const [errorKey, setErrorKey] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setTimeLeft(duration);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setPhase('done');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [duration]);

  const handleType = useCallback((char: string) => {
    if (phase === 'idle') {
      setPhase('typing');
      startTimer();
    }
    if (phase === 'done') return;

    setState(prev => {
      const next = processKeyPress(prev, char);
      const isCorrect = char === prev.text[prev.typed.length];
      setPressedKey(char);
      setErrorKey(isCorrect ? '' : char);
      setTimeout(() => { setPressedKey(''); setErrorKey(''); }, 150);
      return next;
    });
  }, [phase, startTimer]);

  const handleBackspace = useCallback(() => {
    if (phase === 'done') return;
    setState(prev => processKeyPress(prev, 'Backspace'));
  }, [phase]);

  const reset = () => {
    clearInterval(timerRef.current!);
    setPhase('idle');
    setTimeLeft(duration);
    setState(createTypingState(getRandom(PRACTICE_TEXTS.words) + ' ' + getRandom(PRACTICE_TEXTS.words)));
  };

  useEffect(() => {
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  useEffect(() => () => { clearInterval(timerRef.current!); }, []);

  const timerPct = (timeLeft / duration) * 100;
  const timerColor = timeLeft <= 10 ? '#EF4444' : timeLeft <= 30 ? '#F59E0B' : '#2563EB';

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Speed Test</h1>
        <p className="text-slate-500 text-sm mt-0.5">Measure your WPM under timed pressure</p>
      </div>

      {/* Duration selector */}
      <div className="flex gap-2 mb-8">
        {DURATIONS.map(d => (
          <button
            key={d}
            onClick={() => { if (phase === 'idle') setDuration(d); }}
            disabled={phase !== 'idle'}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
              duration === d
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 disabled:opacity-50'
            }`}
          >
            {DURATION_LABELS[d]}
          </button>
        ))}
      </div>

      {/* Timer */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-500 text-sm font-medium">Time remaining</span>
          <span
            className="text-3xl font-semibold font-mono tabular-nums"
            style={{ color: timerColor }}
          >
            {timeLeft}s
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'WPM', value: state.wpm, color: 'text-blue-600' },
          { label: 'Accuracy', value: `${state.accuracy}%`, color: 'text-emerald-600' },
          { label: 'Errors', value: state.errors, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl px-5 py-4 text-center">
            <p className={`text-3xl font-semibold font-mono ${color}`}>{value}</p>
            <p className="text-slate-400 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Typing box or result */}
      {phase !== 'done' ? (
        <>
          {phase === 'idle' && (
            <p className="text-center text-slate-400 text-sm mb-3">Start typing to begin the test</p>
          )}
          <TypingBox
            state={state}
            onType={handleType}
            onBackspace={handleBackspace}
            pressedKey={pressedKey}
            errorKey={errorKey}
          />
          <VirtualKeyboard pressedKey={pressedKey} errorKey={errorKey} />
        </>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <div className="text-5xl mb-4">🏁</div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-1">Test complete!</h2>
          <p className="text-slate-500 mb-8">{DURATION_LABELS[duration]} test</p>
          <div className="grid grid-cols-3 gap-6 max-w-xs mx-auto mb-8">
            <div>
              <p className="text-4xl font-semibold text-blue-600 font-mono">{state.wpm}</p>
              <p className="text-slate-400 text-sm">WPM</p>
            </div>
            <div>
              <p className="text-4xl font-semibold text-emerald-600 font-mono">{state.accuracy}</p>
              <p className="text-slate-400 text-sm">Accuracy</p>
            </div>
            <div>
              <p className="text-4xl font-semibold text-red-500 font-mono">{state.errors}</p>
              <p className="text-slate-400 text-sm">Errors</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
