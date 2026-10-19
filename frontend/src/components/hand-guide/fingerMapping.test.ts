import { describe, expect, it } from "vitest";
import { paoKeyLegends, qwertyKeyLegends } from "../keyboardLayouts";
import { keysForText } from "../../features/typing/typingGuide";
import { fingerForCode, fingerGuidance } from "./fingerMapping";

describe("physical finger zones", () => {
  it.each([
    ["KeyA", "left-little"], ["KeyQ", "left-little"], ["Digit1", "left-little"],
    ["KeyS", "left-ring"], ["KeyW", "left-ring"], ["KeyX", "left-ring"],
    ["KeyD", "left-middle"], ["KeyE", "left-middle"], ["Digit3", "left-middle"],
    ["KeyF", "left-index"], ["KeyB", "left-index"], ["KeyT", "left-index"],
    ["KeyJ", "right-index"], ["KeyN", "right-index"], ["Digit6", "right-index"],
    ["KeyK", "right-middle"], ["Comma", "right-middle"], ["Digit8", "right-middle"],
    ["KeyL", "right-ring"], ["Period", "right-ring"], ["Digit9", "right-ring"],
    ["Semicolon", "right-little"], ["Backspace", "right-little"], ["Enter", "right-little"],
    ["Backslash", "right-little"], ["Space", "right-thumb"],
  ])("assigns %s to %s", (code, finger) => expect(fingerForCode(code)?.id).toBe(finger));

  it.each([["Pa'O", paoKeyLegends], ["QWERTY", qwertyKeyLegends]] as const)("covers every verified %s output", (layout, legends) => {
    for (const [code, outputs] of Object.entries(legends)) {
      expect(fingerForCode(code), code).not.toBeNull();
      for (const text of Object.values(outputs)) {
        const key = keysForText(text, layout)?.[0];
        expect(key, text).toBeDefined();
        expect(fingerGuidance(key)?.finger).toEqual(fingerForCode(key!.code));
      }
    }
  });

  it("uses the opposite little finger for shifted Latin and Myanmar input", () => {
    for (const [text, layout, finger, shiftCode] of [
      ["A", "QWERTY", "left-little", "ShiftRight"], ["?", "QWERTY", "right-little", "ShiftLeft"],
      ["ီ", "Pa'O", "left-middle", "ShiftRight"], ["ဒ", "Pa'O", "right-middle", "ShiftLeft"],
    ]) {
      expect(fingerGuidance(keysForText(text, layout)![0])).toMatchObject({ finger: { id: finger }, shiftCode, shiftFinger: { kind: "little" } });
    }
  });

  it("does not invent mappings for input methods or unsupported physical keys", () => {
    expect(fingerGuidance(null)).toBeNull();
    for (const code of ["Unidentified", "constructor", "ControlLeft", ""]) expect(fingerForCode(code)).toBeNull();
  });
});
