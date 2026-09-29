import type { CSSProperties } from "react";

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

type PaOKey = { code: string; label: string; special?: boolean; space?: boolean };
const makeKeys = (letters: string[]) => letters.map((letter) => ({ code: `Key${letter}`, label: letter }));
const paoRows: PaOKey[][] = [
  [
    { code: "Backquote", label: "`" },
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => ({ code: `Digit${digit}`, label: String(digit) })),
    { code: "Minus", label: "-" }, { code: "Equal", label: "=" }, { code: "Backspace", label: "⌫", special: true },
  ],
  [
    { code: "Tab", label: "⇥", special: true }, ...makeKeys(["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"]),
    { code: "BracketLeft", label: "[" }, { code: "BracketRight", label: "]" }, { code: "Backslash", label: "\\" },
  ],
  [
    { code: "Caps", label: "⇪", special: true }, ...makeKeys(["A", "S", "D", "F", "G", "H", "J", "K", "L"]),
    { code: "Semicolon", label: ";" }, { code: "Quote", label: "'" }, { code: "Enter", label: "↵", special: true },
  ],
  [
    { code: "ShiftLeft", label: "⇧", special: true }, ...makeKeys(["Z", "X", "C", "V", "B", "N", "M"]),
    { code: "Comma", label: "," }, { code: "Period", label: "." }, { code: "Slash", label: "/" }, { code: "ShiftRight", label: "⇧", special: true },
  ],
  [{ code: "Space", label: "", space: true }],
];

const wideKeys = new Set(["Backspace", "Tab", "Caps", "Enter", "Shift", "Space"]);

const wideKeyLabels: Record<string, string> = {
  Backspace: "⌫",
  Tab: "⇥",
  Caps: "⇪",
  Enter: "↵",
  Shift: "⇧",
};

const keyboardSizing = {
  "--keyboard-key-gap": "clamp(2px, 0.55cqw, 6px)",
  "--keyboard-key-size": "clamp(16px, calc((100cqw - 78px) / 14.3), 56px)",
} as CSSProperties;

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
      <div className="w-full min-w-0" style={{ containerType: "inline-size" }} role="img" aria-label="Pa'O Myanmar keyboard layout">
        <div className="mx-auto w-full space-y-[var(--keyboard-key-gap)] select-none" style={keyboardSizing}>
          {paoRows.map((row, rowIndex) => (
            <div key={`pao-row-${rowIndex}`} className="flex justify-center gap-[var(--keyboard-key-gap)]">
              {row.map((key) => {
                const legends = paoKeyLegends[key.code];
                const typedKey = key.space ? " " : key.special ? key.code : key.label;
                const expectedKey = key.space ? " " : legends?.unshifted || typedKey;
                const shiftedKey = legends?.shifted || "";
                const candidates = [typedKey, expectedKey, shiftedKey].filter(Boolean).map(normalizeKey);
                const isPressed = Boolean(pressed) && candidates.includes(pressed);
                const isError = Boolean(error) && candidates.includes(error);
                const isWide = key.special || key.space;
                const keyStyle: CSSProperties = {
                  width: key.space ? "calc(var(--keyboard-key-size) * 5.7)" : isWide ? "calc(var(--keyboard-key-size) * 1.3)" : "var(--keyboard-key-size)",
                  height: "var(--keyboard-key-size)",
                  fontSize: "clamp(8px, calc(var(--keyboard-key-size) * 0.22), 12px)",
                };

                return (
                  <div
                    key={key.code}
                    aria-hidden="true"
                    style={keyStyle}
                    className={`relative flex shrink-0 items-center justify-center rounded-sm border font-medium transition-all duration-75
                      ${isError
                        ? "bg-red-500 text-white border-red-400 scale-95 shadow-none"
                        : isPressed
                          ? "bg-blue-600 text-white border-blue-500 scale-95 shadow-none"
                          : "bg-white text-slate-600 border-slate-200 shadow-sm hover:bg-slate-50"}
                    `}
                  >
                    {key.space ? null : key.special ? (
                      key.label
                    ) : (
                      <>
                        <span style={{ left: "calc(var(--keyboard-key-size) * 0.125)", top: "calc(var(--keyboard-key-size) * 0.09)", fontSize: "clamp(6px, calc(var(--keyboard-key-size) * 0.18), 10px)" }} className={`absolute leading-none ${isPressed || isError ? "text-white" : "text-slate-500"}`}>{key.label}</span>
                        {legends && <span style={{ right: "calc(var(--keyboard-key-size) * 0.125)", top: "calc(var(--keyboard-key-size) * 0.09)", fontSize: "clamp(6px, calc(var(--keyboard-key-size) * 0.23), 13px)" }} className={`absolute font-myanmar leading-none ${isPressed || isError ? "text-white" : "text-slate-600"}`}>{legends.shifted}</span>}
                        {legends && <span style={{ bottom: "calc(var(--keyboard-key-size) * 0.11)", fontSize: "clamp(7px, calc(var(--keyboard-key-size) * 0.286), 16px)" }} className={`absolute left-0 right-0 text-center font-myanmar font-medium leading-none ${isPressed || isError ? "text-white" : "text-slate-800"}`}>{legends.unshifted}</span>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0" style={{ containerType: "inline-size" }} aria-hidden>
      <div className="mx-auto w-full space-y-[var(--keyboard-key-gap)] select-none" style={keyboardSizing}>
        {rows.map((row, rowIndex) => (
          <div key={`${layout}-${rowIndex}`} className="flex justify-center gap-[var(--keyboard-key-gap)]">
            {row.map((key, keyIndex) => {
              const normalized = normalizeKey(key);
              const isSpace = key === "Space";
              const isPressed = normalized === pressed;
              const isError = normalized === error;
              const isWide = wideKeys.has(key);
              const keyStyle: CSSProperties = {
                width: isSpace ? "calc(var(--keyboard-key-size) * 5.7)" : isWide ? "calc(var(--keyboard-key-size) * 1.3)" : "var(--keyboard-key-size)",
                height: "var(--keyboard-key-size)",
                fontSize: "clamp(8px, calc(var(--keyboard-key-size) * 0.22), 12px)",
              };

              return (
                <div
                  key={`${key}-${keyIndex}`}
                  style={keyStyle}
                  className={`flex items-center justify-center rounded-sm border font-medium transition-all duration-75
                    ${isError
                      ? "bg-red-500 text-white border-red-400 scale-95 shadow-none"
                      : isPressed
                        ? "bg-blue-600 text-white border-blue-500 scale-95 shadow-none"
                        : "bg-white text-slate-600 border-slate-200 shadow-sm hover:bg-slate-50"}
                  `}
                >
                  {isSpace ? null : wideKeyLabels[key] || key}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
