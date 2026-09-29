import { useState, useCallback } from 'react';
import TypingBox, { createTypingState, processKeyPress, TypingState } from '../components/TypingBox';
import VirtualKeyboard from '../components/VirtualKeyboard';
import { PRACTICE_TEXTS } from '../data/mockData';

type TextType = 'words' | 'sentences' | 'paragraphs' | 'code';

const TEXT_TYPES: { key: TextType; label: string; icon: string }[] = [
  { key: 'words', label: 'Words', icon: '🔤' },
  { key: 'sentences', label: 'Sentences', icon: '💬' },
  { key: 'paragraphs', label: 'Paragraph', icon: '📄' },
  { key: 'code', label: 'Code', icon: '💻' },
];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function Practice() {
  const [textType, setTextType] = useState<TextType>('words');
  const [state, setState] = useState<TypingState>(() =>
    createTypingState(getRandom(PRACTICE_TEXTS.words))
  );
  const [pressedKey, setPressedKey] = useState('');
  const [errorKey, setErrorKey] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(true);

  const handleType = useCallback((char: string) => {
    setState(prev => {
      const next = processKeyPress(prev, char);
      const isCorrect = char === prev.text[prev.typed.length];
      setPressedKey(char);
      setErrorKey(isCorrect ? '' : char);
      setTimeout(() => { setPressedKey(''); setErrorKey(''); }, 150);
      return next;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setState(prev => processKeyPress(prev, 'Backspace'));
  }, []);

  const reset = () => {
    const texts = PRACTICE_TEXTS[textType];
    setState(createTypingState(getRandom(texts as string[])));
  };

  const changeType = (t: TextType) => {
    setTextType(t);
    const texts = PRACTICE_TEXTS[t];
    setState(createTypingState(getRandom(texts as string[])));
  };

  const elapsed = state.startTime
    ? Math.floor((( state.endTime ?? Date.now()) - state.startTime) / 1000)
    : 0;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Practice</h1>
          <p className="text-slate-500 text-sm mt-0.5">Open-ended typing without time pressure</p>
        </div>
        <button
          onClick={() => setShowKeyboard(v => !v)}
          className="text-sm text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          {showKeyboard ? 'Hide' : 'Show'} keyboard
        </button>
      </div>

      {/* Text type selector */}
      <div className="flex gap-2 mb-6">
        {TEXT_TYPES.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => changeType(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              textType === key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <span>{icon}</span> {label}
          </button>
        ))}
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'WPM', value: state.wpm, color: 'text-blue-600' },
          { label: 'Accuracy', value: `${state.accuracy}%`, color: 'text-emerald-600' },
          { label: 'Time', value: `${elapsed}s`, color: 'text-slate-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl px-5 py-4 text-center">
            <p className={`text-3xl font-semibold font-mono ${color}`}>{value}</p>
            <p className="text-slate-400 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Typing box */}
      <TypingBox
        state={state}
        onType={handleType}
        onBackspace={handleBackspace}
        pressedKey={pressedKey}
        errorKey={errorKey}
        fontSize="md"
      />

      {/* Complete overlay */}
      {state.isComplete && (
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <h3 className="font-semibold text-emerald-800 text-lg mb-1">Nice work!</h3>
          <p className="text-emerald-600 text-sm mb-4">
            {state.wpm} WPM · {state.accuracy}% accuracy · {state.errors} errors
          </p>
          <button
            onClick={reset}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            Next text →
          </button>
        </div>
      )}

      {/* Controls */}
      {!state.isComplete && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-slate-400 text-xs">Press any key to start · Backspace to correct</p>
          <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            ↺ New text
          </button>
        </div>
      )}

      {/* Virtual keyboard */}
      {showKeyboard && (
        <div className="mt-8">
          <VirtualKeyboard pressedKey={pressedKey} errorKey={errorKey} />
        </div>
      )}
    </div>
  );
}
