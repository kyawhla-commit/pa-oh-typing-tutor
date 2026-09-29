const rows = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
  ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
  ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
  ['Space'],
];

const wideKeys = new Set(['Backspace', 'Tab', 'Caps', 'Enter', 'Shift', 'Space']);

interface VirtualKeyboardProps {
  pressedKey?: string;
  errorKey?: string;
}

function normalizeKey(key: string): string {
  return key.toLowerCase();
}

export default function VirtualKeyboard({ pressedKey, errorKey }: VirtualKeyboardProps) {
  const pk = pressedKey ? normalizeKey(pressedKey) : '';
  const ek = errorKey ? normalizeKey(errorKey) : '';

  return (
    <div className="space-y-1.5 select-none" aria-hidden>
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-1.5 justify-center">
          {row.map((key) => {
            const k = normalizeKey(key);
            const isSpace = key === 'Space';
            const isPressed = k === pk || (isSpace && pk === ' ');
            const isError = k === ek || (isSpace && ek === ' ');
            const isWide = wideKeys.has(key);

            return (
              <div
                key={key}
                className={`
                  h-10 flex items-center justify-center rounded-lg text-xs font-medium border transition-all duration-75
                  ${isSpace ? 'w-56' : isWide ? 'px-3 min-w-[52px]' : 'w-10'}
                  ${isError
                    ? 'bg-red-500 text-white border-red-400 scale-95 shadow-none'
                    : isPressed
                    ? 'bg-blue-600 text-white border-blue-500 scale-95 shadow-none'
                    : 'bg-white text-slate-600 border-slate-200 shadow-sm hover:bg-slate-50'
                  }
                `}
              >
                {isSpace ? '' : key === 'Backspace' ? '⌫' : key === 'Tab' ? '⇥' : key === 'Caps' ? '⇪' : key === 'Enter' ? '↵' : key === 'Shift' ? '⇧' : key}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
