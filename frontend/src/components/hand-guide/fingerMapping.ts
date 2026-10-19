import type { KeyHint } from "../keyboardLayouts";

export type FingerKind = "little" | "ring" | "middle" | "index" | "thumb";
export type HandSide = "left" | "right";
export type FingerId = `${HandSide}-${FingerKind}`;
export interface Finger {
  id: FingerId;
  hand: HandSide;
  kind: FingerKind;
  label: string;
  color: string;
  home: string;
}

export const fingerColors: Record<FingerKind, string> = {
  little: "#2563ff", ring: "#09a875", middle: "#f48714", index: "#923bfa", thumb: "#94a3b8",
};

const definitions: [HandSide, FingerKind, string, string[]][] = [
  ["left", "little", "KeyA", ["Backquote", "Digit1", "KeyQ", "KeyA", "KeyZ", "Tab", "Caps", "ShiftLeft"]],
  ["left", "ring", "KeyS", ["Digit2", "KeyW", "KeyS", "KeyX"]],
  ["left", "middle", "KeyD", ["Digit3", "KeyE", "KeyD", "KeyC"]],
  ["left", "index", "KeyF", ["Digit4", "Digit5", "KeyR", "KeyT", "KeyF", "KeyG", "KeyV", "KeyB"]],
  ["left", "thumb", "Space", []],
  ["right", "index", "KeyJ", ["Digit6", "Digit7", "KeyY", "KeyU", "KeyH", "KeyJ", "KeyN", "KeyM"]],
  ["right", "middle", "KeyK", ["Digit8", "KeyI", "KeyK", "Comma"]],
  ["right", "ring", "KeyL", ["Digit9", "KeyO", "KeyL", "Period"]],
  ["right", "little", "Semicolon", ["Digit0", "Minus", "Equal", "KeyP", "BracketLeft", "BracketRight", "Backslash", "Semicolon", "Quote", "Slash", "Enter", "Backspace", "ShiftRight"]],
  ["right", "thumb", "Space", ["Space"]],
];

export const fingers: readonly Finger[] = definitions.map(([hand, kind, home]) => ({
  id: `${hand}-${kind}`, hand, kind, home, color: fingerColors[kind],
  label: `${hand === "left" ? "Left" : "Right"} ${kind}${kind === "thumb" ? "" : " finger"}`,
}));
const byCode = new Map(definitions.flatMap(([, , , codes], index) => codes.map(code => [code, fingers[index]] as const)));

/** Physical touch-typing zones only. Character/IME resolution belongs to typingGuide.ts. */
export function fingerForCode(code: string | undefined): Finger | null {
  return code ? byCode.get(code) ?? null : null;
}

export function fingerGuidance(key: KeyHint | null | undefined) {
  const finger = fingerForCode(key?.code);
  if (!key || !finger) return null;
  // Use the other hand for Shift, including punctuation and Pa'O shifted marks.
  const shiftCode = key.shift ? finger.hand === "left" ? "ShiftRight" : "ShiftLeft" : null;
  return { finger, shiftCode, shiftFinger: fingerForCode(shiftCode ?? undefined) };
}
