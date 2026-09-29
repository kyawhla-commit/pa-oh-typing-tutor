const rowsByLayout: Record<string, string[][]> = {
  QWERTY: [
    ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
    ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
    ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
    ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift"],
    ["Space"],
  ],
  Dvorak: [
    ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "[", "]", "Backspace"],
    ["Tab", "'", ",", ".", "p", "y", "f", "g", "c", "r", "l", "/", "=", "\\"],
    ["Caps", "a", "o", "e", "u", "i", "d", "h", "t", "n", "s", "-", "Enter"],
    ["Shift", ";", "q", "j", "k", "x", "b", "m", "w", "v", "z", "Shift"],
    ["Space"],
  ],
  Colemak: [
    ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
    ["Tab", "q", "w", "f", "p", "g", "j", "l", "u", "y", ";", "[", "]", "\\"],
    ["Caps", "a", "r", "s", "t", "d", "h", "n", "e", "i", "o", "'", "Enter"],
    ["Shift", "z", "x", "c", "v", "b", "k", "m", ",", ".", "/", "Shift"],
    ["Space"],
  ],
};

const wideKeys = new Set(["Backspace", "Tab", "Caps", "Enter", "Shift", "Space"]);

const wideKeyLabels: Record<string, string> = {
  Backspace: "⌫",
  Tab: "⇥",
  Caps: "⇪",
  Enter: "↵",
  Shift: "⇧",
};

interface VirtualKeyboardProps {
  pressedKey?: string;
  errorKey?: string;
  layout?: string;
}

function normalizeKey(key: string) {
  if (key === "Space") return " ";
  if (key === "Backspace") return "backspace";
  return key.toLowerCase();
}

export default function VirtualKeyboard({ pressedKey, errorKey, layout = "QWERTY" }: VirtualKeyboardProps) {
  const pressed = pressedKey ? normalizeKey(pressedKey) : "";
  const error = errorKey ? normalizeKey(errorKey) : "";
  const rows = rowsByLayout[layout] || rowsByLayout.QWERTY;

  return (
    <div className="space-y-1.5 select-none" aria-hidden>
      {rows.map((row, rowIndex) => (
        <div key={`${layout}-${rowIndex}`} className="flex gap-1.5 justify-center">
          {row.map((key, keyIndex) => {
            const normalized = normalizeKey(key);
            const isSpace = key === "Space";
            const isPressed = normalized === pressed;
            const isError = normalized === error;
            const isWide = wideKeys.has(key);

            return (
              <div
                key={`${key}-${keyIndex}`}
                className={`
                  h-10 flex items-center justify-center rounded-sm text-xs font-medium border transition-all duration-75
                  ${isSpace ? "w-56" : isWide ? "px-3 min-w-[52px]" : "w-10"}
                  ${isError
                    ? "bg-red-500 text-white border-red-400 scale-95 shadow-none"
                    : isPressed
                    ? "bg-blue-600 text-white border-blue-500 scale-95 shadow-none"
                    : "bg-white text-slate-600 border-slate-200 shadow-sm hover:bg-slate-50"}
                }`}
              >
                {isSpace ? null : wideKeyLabels[key] || key}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
