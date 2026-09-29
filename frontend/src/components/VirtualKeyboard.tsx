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

const paoKeyLegends: Record<string, { shifted: string; unshifted: string }> = {
  Backquote: { shifted: "ဎ", unshifted: "ၐ" },
  Digit1: { shifted: "ဍ", unshifted: "၁" },
  Digit2: { shifted: "ၒ", unshifted: "၂" },
  Digit3: { shifted: "ဋ", unshifted: "၃" },
  Digit4: { shifted: "ၓ", unshifted: "၄" },
  Digit5: { shifted: "ၔ", unshifted: "၅" },
  Digit6: { shifted: "ၕ", unshifted: "၆" },
  Digit7: { shifted: "ရ", unshifted: "၇" },
  Digit8: { shifted: "*", unshifted: "၈" },
  Digit9: { shifted: "(", unshifted: "၉" },
  Digit0: { shifted: ")", unshifted: "၀" },
  Minus: { shifted: "_", unshifted: "−" },
  Equal: { shifted: "+", unshifted: "=" },
  KeyQ: { shifted: "ဈ", unshifted: "ဆ" },
  KeyW: { shifted: "ဝ", unshifted: "တ" },
  KeyE: { shifted: "ဣ", unshifted: "န" },
  KeyR: { shifted: "၎င်း", unshifted: "မ" },
  KeyT: { shifted: "ဤ", unshifted: "အ" },
  KeyY: { shifted: "၌", unshifted: "ပ" },
  KeyU: { shifted: "ဥ", unshifted: "က" },
  KeyI: { shifted: "၍", unshifted: "င" },
  KeyO: { shifted: "ဿ", unshifted: "သ" },
  KeyP: { shifted: "ဏ", unshifted: "စ" },
  BracketLeft: { shifted: "ဧ", unshifted: "ဟ" },
  BracketRight: { shifted: "ဪ", unshifted: "ဩ" },
  Backslash: { shifted: "ၑ", unshifted: "၏" },
  KeyA: { shifted: "ဗ", unshifted: "ေ" },
  KeyS: { shifted: "ှ", unshifted: "ျ" },
  KeyD: { shifted: "ီ", unshifted: "ိ" },
  KeyF: { shifted: "္", unshifted: "်" },
  KeyG: { shifted: "ွ", unshifted: "ါ" },
  KeyH: { shifted: "ံ", unshifted: "့" },
  KeyJ: { shifted: "ဲ", unshifted: "ြ" },
  KeyK: { shifted: "ဒ", unshifted: "ု" },
  KeyL: { shifted: "ဓ", unshifted: "ူ" },
  Semicolon: { shifted: "ဂ", unshifted: "း" },
  Quote: { shifted: "\"", unshifted: "'" },
  KeyZ: { shifted: "ဇ", unshifted: "ဖ" },
  KeyX: { shifted: "ဌ", unshifted: "ထ" },
  KeyC: { shifted: "ဃ", unshifted: "ခ" },
  KeyV: { shifted: "ဠ", unshifted: "လ" },
  KeyB: { shifted: "ယ", unshifted: "ဘ" },
  KeyN: { shifted: "ဉ", unshifted: "ည" },
  KeyM: { shifted: "ဦ", unshifted: "ာ" },
  Comma: { shifted: "၊", unshifted: "ꩻ" },
  Period: { shifted: "။", unshifted: "ႏ" },
  Slash: { shifted: "?", unshifted: "/" },
};

type PaOKey = { code: string; label: string; span: number; modifier?: boolean };
const makeKeys = (letters: string[]) => letters.map((letter) => ({ code: `Key${letter}`, label: letter, span: 2 }));
const paoRows: PaOKey[][] = [
  [
    { code: "Backquote", label: "`", span: 2 },
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => ({ code: `Digit${digit}`, label: String(digit), span: 2 })),
    { code: "Minus", label: "-", span: 2 }, { code: "Equal", label: "=", span: 2 },
    { code: "Backspace", label: "Backspace", span: 4, modifier: true },
  ],
  [
    { code: "Tab", label: "Tab", span: 3, modifier: true }, ...makeKeys(["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"]),
    { code: "BracketLeft", label: "[", span: 2 }, { code: "BracketRight", label: "]", span: 2 }, { code: "Backslash", label: "\\", span: 3 },
  ],
  [
    { code: "Caps", label: "Caps Lock", span: 4, modifier: true }, ...makeKeys(["A", "S", "D", "F", "G", "H", "J", "K", "L"]),
    { code: "Semicolon", label: ";", span: 2 }, { code: "Quote", label: "'", span: 2 }, { code: "Enter", label: "Enter", span: 4, modifier: true },
  ],
  [
    { code: "ShiftLeft", label: "Shift", span: 5, modifier: true }, ...makeKeys(["Z", "X", "C", "V", "B", "N", "M"]),
    { code: "Comma", label: ",", span: 2 }, { code: "Period", label: ".", span: 2 }, { code: "Slash", label: "/", span: 2 }, { code: "ShiftRight", label: "Shift", span: 5, modifier: true },
  ],
  [
    { code: "ControlLeft", label: "Ctrl", span: 3, modifier: true }, { code: "MetaLeft", label: "Win", span: 3, modifier: true },
    { code: "AltLeft", label: "Alt", span: 3, modifier: true }, { code: "Space", label: "", span: 9, modifier: true },
    { code: "AltRight", label: "Alt", span: 3, modifier: true }, { code: "MetaRight", label: "Win", span: 3, modifier: true },
    { code: "ContextMenu", label: "Menu", span: 3, modifier: true }, { code: "ControlRight", label: "Ctrl", span: 3, modifier: true },
  ],
];

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

  if (layout === "Pa'O") {
    return (
      <div className="overflow-x-auto pb-1" role="img" aria-label="Pa'O keyboard layout">
        <div
          className="mx-auto grid min-w-[560px] max-w-[1085px] grid-cols-[repeat(30,minmax(0,1fr))] gap-[5px] rounded-2xl border border-[#e8e8ed] bg-[#efeff2] p-3 sm:p-5"
          style={{ gridTemplateRows: "repeat(5, clamp(44px, 5vw, 60px))" }}
        >
          {paoRows.flat().map((key) => {
            const legends = paoKeyLegends[key.code];
            const normalized = normalizeKey(key.code === "Space" ? " " : legends?.unshifted || key.label);
            const shifted = legends ? normalizeKey(legends.shifted) : "";
            const label = key.label ? normalizeKey(key.label) : "";
            const isPressed = Boolean(pressed) && (normalized === pressed || Boolean(shifted) && shifted === pressed || Boolean(label) && label === pressed);
            const isError = Boolean(error) && (normalized === error || Boolean(shifted) && shifted === error || Boolean(label) && label === error);

            return (
              <div
                key={key.code}
                style={{ gridColumn: `span ${key.span}` }}
                className={`relative min-w-0 overflow-hidden rounded-md border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors ${
                  isError ? "border-red-400 bg-red-500 text-white" : isPressed ? "border-blue-500 bg-blue-600 text-white" : "border-[#d2d2d7] hover:border-[#b8b8bd] hover:bg-[#fafafa]"
                }`}
              >
                {key.modifier ? (
                  <span className={`absolute left-1.5 top-1 text-[8px] font-medium uppercase leading-none sm:left-[7px] sm:top-[5px] sm:text-[10px] ${isPressed || isError ? "text-white" : "text-[#888]"}`}>{key.label}</span>
                ) : (
                  <>
                    <span className={`absolute left-1 top-1 text-[8px] font-medium leading-none sm:left-[7px] sm:top-[5px] sm:text-[10px] ${isPressed || isError ? "text-white" : "text-[#888]"}`}>{key.label}</span>
                    {legends && <span className={`absolute right-1 top-1 font-myanmar text-[9px] leading-none sm:right-[7px] sm:top-[5px] sm:text-[13px] ${isPressed || isError ? "text-white" : "text-[#444]"}`}>{legends.shifted}</span>}
                    {legends && <span className={`absolute bottom-1 left-0 right-0 text-center font-myanmar text-[12px] font-medium leading-none sm:bottom-[6px] sm:text-base ${isPressed || isError ? "text-white" : "text-[#1d1d1f]"}`}>{legends.unshifted}</span>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

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
