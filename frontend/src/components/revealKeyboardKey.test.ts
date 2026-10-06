// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { revealKeyboardKey } from "./revealKeyboardKey";

describe("keyboard-only scrolling", () => {
  const setup = (left: number, width = 280, contentWidth = 600) => {
    const page = document.createElement("div"), viewport = document.createElement("div"), key = document.createElement("div");
    page.append(viewport); viewport.append(key);
    key.dataset.nextKey = "true";
    page.scrollTop = 200; page.scrollLeft = 20; viewport.scrollTop = 10;
    Object.defineProperties(viewport, { clientWidth: { value: width }, scrollWidth: { value: contentWidth } });
    viewport.getBoundingClientRect = () => new DOMRect(10, 100, width, 250);
    key.getBoundingClientRect = () => new DOMRect(left, 120, 40, 40);
    return { page, viewport, key };
  };
  it("reveals the next key without scrolling the page or keyboard vertically", () => {
    const { page, viewport } = setup(500);
    revealKeyboardKey(viewport);
    expect(viewport.scrollLeft).toBe(258);
    expect(viewport.scrollTop).toBe(10);
    expect(page.scrollTop).toBe(200);
    expect(page.scrollLeft).toBe(20);
  });
  it("leaves a visible key and manual horizontal scroll alone", () => {
    const { viewport } = setup(100);
    viewport.scrollLeft = 100;
    revealKeyboardKey(viewport);
    expect(viewport.scrollLeft).toBe(100);
  });
  it("follows a leftward correction and clamps at the scroll boundary", () => {
    const { viewport } = setup(0);
    viewport.scrollLeft = 100;
    revealKeyboardKey(viewport);
    expect(viewport.scrollLeft).toBe(82);
    viewport.scrollLeft = 0;
    revealKeyboardKey(viewport);
    expect(viewport.scrollLeft).toBe(0);
  });
  it("prioritizes the character key over a Shift modifier", () => {
    const { viewport } = setup(500);
    const shift = document.createElement("div");
    shift.dataset.nextKey = "true"; shift.dataset.keyModifier = "true";
    shift.getBoundingClientRect = () => new DOMRect(20, 100, 40, 40);
    viewport.prepend(shift);
    revealKeyboardKey(viewport);
    expect(viewport.scrollLeft).toBe(258);
  });
  it("does not move a keyboard with no hint, no measurements, or no overflow", () => {
    const { viewport, key } = setup(500);
    key.removeAttribute("data-next-key");
    revealKeyboardKey(viewport);
    expect(viewport.scrollLeft).toBe(0);
    const hidden = setup(500, 0), wide = setup(500, 900);
    revealKeyboardKey(hidden.viewport); revealKeyboardKey(wide.viewport);
    expect(hidden.viewport.scrollLeft).toBe(0);
    expect(wide.viewport.scrollLeft).toBe(0);
  });
});
