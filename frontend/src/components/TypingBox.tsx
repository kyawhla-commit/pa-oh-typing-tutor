import { useEffect, useRef, useCallback } from 'react';

export interface TypingState {
  text: string;
  typed: string;
  startTime: number | null;
  endTime: number | null;
  errors: number;
  wpm: number;
  accuracy: number;
  isComplete: boolean;
}

interface TypingBoxProps {
  state: TypingState;
  onType: (char: string) => void;
  onBackspace: () => void;
  pressedKey: string;
  errorKey: string;
  fontSize?: 'sm' | 'md' | 'lg';
}

export function createTypingState(text: string): TypingState {
  return { text, typed: '', startTime: null, endTime: null, errors: 0, wpm: 0, accuracy: 100, isComplete: false };
}

export function processKeyPress(state: TypingState, key: string): TypingState {
  if (state.isComplete) return state;

  const startTime = state.startTime ?? Date.now();
  let { typed, errors } = state;

  if (key === 'Backspace') {
    typed = typed.slice(0, -1);
  } else if (typed.length < state.text.length) {
    if (key !== state.text[typed.length]) errors++;
    typed = typed + key;
  }

  const isComplete = typed.length === state.text.length;
  const endTime = isComplete ? Date.now() : null;
  const elapsed = ((endTime ?? Date.now()) - startTime) / 1000 / 60;
  const wordCount = typed.length / 5;
  const wpm = elapsed > 0 ? Math.round(wordCount / elapsed) : 0;
  const correct = typed.split('').filter((c, i) => c === state.text[i]).length;
  const accuracy = typed.length > 0 ? Math.round((correct / typed.length) * 100) : 100;

  return { ...state, typed, startTime, endTime, errors, wpm, accuracy, isComplete };
}

const fontSizes = { sm: 'text-base', md: 'text-lg', lg: 'text-xl' };

export default function TypingBox({ state, onType, onBackspace, pressedKey, errorKey, fontSize = 'md' }: TypingBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      onBackspace();
    } else if (e.key.length === 1) {
      e.preventDefault();
      onType(e.key);
    }
  }, [onType, onBackspace]);

  const { text, typed } = state;

  return (
    <div
      className="relative cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <input
        ref={inputRef}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        onKeyDown={handleKeyDown}
        readOnly
        value=""
        aria-label="Typing input"
      />
      <div
        ref={containerRef}
        className={`font-mono leading-8 ${fontSizes[fontSize]} tracking-wide break-words whitespace-pre-wrap select-none p-6 rounded-2xl bg-white border border-slate-200 min-h-[120px] shadow-sm`}
      >
        {text.split('').map((char, i) => {
          let cls = 'typing-char pending';
          if (i < typed.length) {
            cls = typed[i] === char ? 'typing-char correct' : 'typing-char incorrect';
          } else if (i === typed.length) {
            cls = 'typing-char current';
          }
          return (
            <span key={i} className={cls}>
              {char === ' ' ? ' ' : char}
            </span>
          );
        })}
        {typed.length === text.length && text.length > 0 && (
          <span className="inline-block w-0.5 h-5 bg-blue-500 animate-pulse ml-0.5 align-middle" />
        )}
        {typed.length < text.length && (
          <span className="inline-block" />
        )}
      </div>
    </div>
  );
}
