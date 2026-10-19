// @vitest-environment jsdom
import { expect, it } from "vitest";
import { measureKeyboard } from "./handGeometry";

it("measures actual key centres relative to the keyboard at different scales and offsets", () => {
  const keyboard = document.createElement("div");
  Object.defineProperties(keyboard, { clientWidth: { value: 800 }, clientHeight: { value: 280 } });
  let scale = 1, scrollOffset = 0;
  keyboard.getBoundingClientRect = () => new DOMRect(100, 300 - scrollOffset, 800 * scale, 280 * scale);
  for (const [i, code] of ["KeyA", "KeyF", "KeyJ", "Semicolon", "Space"].entries()) {
    const key = document.createElement("div"); key.dataset.keyCode = code;
    key.getBoundingClientRect = () => new DOMRect(100 + i * 60 * scale, 300 - scrollOffset + 100 * scale, 50 * scale, 45 * scale);
    keyboard.append(key);
  }
  const original = measureKeyboard(keyboard);
  expect(original?.keys.KeyF).toEqual({ x: 85, y: 122.5, width: 50, height: 45 });
  scale = 1.25; scrollOffset = 250;
  expect(measureKeyboard(keyboard)).toEqual(original);
  scale = .75; scrollOffset = 60;
  expect(measureKeyboard(keyboard)).toEqual(original);
});

it("waits for a visible keyboard and a complete set of hand anchors", () => {
  const keyboard = document.createElement("div");
  expect(measureKeyboard(keyboard)).toBeNull();
  keyboard.getBoundingClientRect = () => new DOMRect(0, 0, 800, 280);
  expect(measureKeyboard(keyboard)).toBeNull();
});
