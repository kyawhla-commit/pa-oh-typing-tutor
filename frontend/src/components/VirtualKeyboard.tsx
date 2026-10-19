import { useRef, type CSSProperties, type ReactNode } from "react";
import "./virtual-keyboard.css";
import { paoKeyLegends, qwertyKeyLegends, type KeyHint } from "./keyboardLayouts";
import { GlassHandGuide } from "./hand-guide/GlassHandGuide";
import { fingerGuidance } from "./hand-guide/fingerMapping";

const rowsByLayout: Record<string, string[][]> = {
  QWERTY: [
    ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
    ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
    ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
    ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift"],
    ["Space"],
  ],
  // Dvorak: [
  //   ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "[", "]", "Backspace"],
  //   ["Tab", "'", ",", ".", "p", "y", "f", "g", "c", "r", "l", "/", "=", "\\"],
  //   ["Caps", "a", "o", "e", "u", "i", "d", "h", "t", "n", "s", "-", "Enter"],
  //   ["Shift", ";", "q", "j", "k", "x", "b", "m", "w", "v", "z", "Shift"],
  //   ["Space"],
  // ],
  // Colemak: [
  //   ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
  //   ["Tab", "q", "w", "f", "p", "g", "j", "l", "u", "y", ";", "[", "]", "\\"],
  //   ["Caps", "a", "r", "s", "t", "d", "h", "n", "e", "i", "o", "'", "Enter"],
  //   ["Shift", "z", "x", "c", "v", "b", "k", "m", ",", ".", "/", "Shift"],
  //   ["Space"],
  // ],
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
const qwertyCodesByKey = new Map(Object.entries(qwertyKeyLegends).map(([code, legends]) => [legends.unshifted, code]));

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
  nextKey?: KeyHint | null;
  showHandGuide?: boolean;
  reserveHandSpace?: boolean;
}

function normalizeKey(key: string) {
  if (key === "Space") return " ";
  if (key === "Backspace") return "backspace";
  return key.toLowerCase();
}

function KeyboardViewport({ children, layout, nextKey, showHandGuide, reserveHandSpace }: {
  children: ReactNode; layout: string; nextKey?: KeyHint | null; showHandGuide: boolean; reserveHandSpace: boolean;
}) {
  const keyboard = useRef<HTMLDivElement>(null);
  return <div className="virtual-keyboard">
    <div ref={keyboard} role="region" aria-label="Keyboard guide" className="keyboard-viewport">
      {children}
      {(reserveHandSpace || showHandGuide) && <div className="keyboard-hand-clearance" aria-hidden="true" />}
      {showHandGuide && <GlassHandGuide keyboard={keyboard} layout={layout} nextKey={nextKey ?? null} />}
    </div>
  </div>;
}

export default function VirtualKeyboard({ pressedKey, errorKey, layout = "QWERTY", nextKey, showHandGuide = false, reserveHandSpace = false }: VirtualKeyboardProps) {
  const pressed = pressedKey ? normalizeKey(pressedKey) : "";
  const error = errorKey ? normalizeKey(errorKey) : "";
  const rows = rowsByLayout[layout] || rowsByLayout.QWERTY;
  const guidance = showHandGuide ? fingerGuidance(nextKey) : null;
  const guidedFinger = (code: string) => code === nextKey?.code ? guidance?.finger
    : code === guidance?.shiftCode ? guidance.shiftFinger : null;

  if (layout === "Pa'O") {
    return (
      <KeyboardViewport layout={layout} nextKey={nextKey} showHandGuide={showHandGuide} reserveHandSpace={reserveHandSpace}><div className="keyboard-layout" role="img" aria-label="Pa'O Myanmar keyboard layout">
        <div className="keyboard-keys mx-auto w-full space-y-[var(--keyboard-key-gap)] select-none">
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
                const isNext = nextKey?.code === key.code || (nextKey?.shift && key.code.startsWith("Shift"));
                const isWide = key.special || key.space;
                const finger = guidedFinger(key.code);
                const keyStyle: CSSProperties = {
                  ...(finger ? { "--finger-color": finger.color } : {}),
                  width: key.space ? "calc(var(--keyboard-key-size) * 5.7)" : isWide ? "calc(var(--keyboard-key-size) * 1.3)" : "var(--keyboard-key-size)",
                  height: "var(--keyboard-key-height)",
                  fontSize: "clamp(8px, calc(var(--keyboard-key-size) * 0.22), 12px)",
                };

                return (
                  <div
                    key={key.code}
                    data-key-code={key.code}
                    data-key-modifier={key.code.startsWith("Shift") ? "true" : undefined}
                    data-next-key={isNext ? "true" : undefined}
                    data-guide-finger={finger?.id}
                    data-key-state={isError ? "error" : isPressed ? "pressed" : undefined}
                    aria-hidden="true"
                    style={keyStyle}
                    className={`relative flex shrink-0 items-center justify-center rounded-sm border font-medium transition-colors duration-75 ${isNext && !guidance ? "ring-2 ring-blue-500 ring-offset-1" : ""}
                      ${isError
                        ? "bg-red-500 text-white border-red-400 scale-95 shadow-none"
                        : isPressed
                          ? "bg-blue-600 text-white border-blue-500 scale-95 shadow-none"
                          : "bg-white text-slate-600 border-slate-200 shadow-sm hover:bg-slate-50"}
                    `}
                  >
                    {key.space ? "Space" : key.special ? (
                      key.label
                    ) : (
                      <>
                        <span style={{ left: "calc(var(--keyboard-key-size) * 0.125)", top: "calc(var(--keyboard-key-size) * 0.09)", fontSize: "clamp(6px, calc(var(--keyboard-key-size) * 0.18), 10px)" }} className={`keyboard-key-latin absolute leading-none ${isPressed || isError ? "text-white" : "text-slate-500"}`}>{key.label}</span>
                        {legends && <span style={{ right: "calc(var(--keyboard-key-size) * 0.125)", top: "calc(var(--keyboard-key-size) * 0.09)", fontSize: "clamp(6px, calc(var(--keyboard-key-size) * 0.23), 13px)" }} className={`absolute font-myanmar leading-relaxed ${isPressed || isError ? "text-white" : "text-slate-600"}`}>{legends.shifted}</span>}
                        {legends && <span style={{ bottom: "calc(var(--keyboard-key-size) * 0.11)", fontSize: "clamp(8px, calc(var(--keyboard-key-size) * 0.286), 16px)" }} className={`absolute left-0 right-0 text-center font-myanmar font-medium leading-relaxed ${isPressed || isError ? "text-white" : "text-slate-800"}`}>{legends.unshifted}</span>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div></KeyboardViewport>
    );
  }

  return (
    <KeyboardViewport layout={layout} nextKey={nextKey} showHandGuide={showHandGuide} reserveHandSpace={reserveHandSpace}><div className="keyboard-layout" aria-hidden>
      <div className="keyboard-keys mx-auto w-full space-y-[var(--keyboard-key-gap)] select-none">
        {rows.map((row, rowIndex) => (
          <div key={`${layout}-${rowIndex}`} className="flex justify-center gap-[var(--keyboard-key-gap)]">
            {row.map((key, keyIndex) => {
              const normalized = normalizeKey(key);
              const isSpace = key === "Space";
              const isPressed = normalized === pressed;
              const isError = normalized === error;
              const isNext = !!nextKey && (normalizeKey(nextKey.label) === normalized || (key === "Shift" && nextKey.shift));
              const isWide = wideKeys.has(key);
              const code = key === "Shift" ? keyIndex === 0 ? "ShiftLeft" : "ShiftRight"
                : qwertyCodesByKey.get(key) ?? key;
              const finger = guidedFinger(code);
              const keyStyle: CSSProperties = {
                ...(finger ? { "--finger-color": finger.color } : {}),
                width: isSpace ? "calc(var(--keyboard-key-size) * 5.7)" : isWide ? "calc(var(--keyboard-key-size) * 1.3)" : "var(--keyboard-key-size)",
                height: "var(--keyboard-key-height)",
                fontSize: "clamp(8px, calc(var(--keyboard-key-size) * 0.22), 12px)",
              };

              return (
                <div
                  key={`${key}-${keyIndex}`}
                  data-key-code={code}
                  data-next-key={isNext ? "true" : undefined}
                  data-guide-finger={finger?.id}
                  data-key-state={isError ? "error" : isPressed ? "pressed" : undefined}
                  data-key-modifier={key === "Shift" ? "true" : undefined}
                  style={keyStyle}
                  className={`flex shrink-0 items-center justify-center rounded-sm border font-medium transition-colors duration-75 ${isNext && !guidance ? "ring-2 ring-blue-500 ring-offset-1" : ""}
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
    </div></KeyboardViewport>
  );
}
