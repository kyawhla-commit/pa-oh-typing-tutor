// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { revealTypingPosition } from "./revealTypingPosition";

describe("passage-only scrolling", () => {
  const setup = (caretTop: number, height = 192) => {
    const page = document.createElement("div"), viewport = document.createElement("div"), marker = document.createElement("span");
    page.append(viewport); viewport.append(marker);
    page.scrollTop = 300; viewport.scrollTop = 40;
    Object.defineProperty(viewport, "clientHeight", { value: height });
    viewport.getBoundingClientRect = () => new DOMRect(0, 100, 900, height);
    marker.getBoundingClientRect = () => new DOMRect(0, caretTop, 40, 40);
    return { page, viewport, marker };
  };
  it("keeps already visible text and the page at their existing scroll positions", () => {
    const { page, viewport, marker } = setup(150);
    revealTypingPosition(viewport, marker);
    expect(viewport.scrollTop).toBe(40);
    expect(page.scrollTop).toBe(300);
  });
  it("reveals a lower line inside the passage without moving its page ancestor", () => {
    const { page, viewport, marker } = setup(300);
    revealTypingPosition(viewport, marker);
    expect(viewport.scrollTop).toBe(100);
    expect(page.scrollTop).toBe(300);
  });
  it("returns to an earlier line on correction, without negative scrolling", () => {
    const { page, viewport, marker } = setup(80);
    revealTypingPosition(viewport, marker);
    expect(viewport.scrollTop).toBe(8);
    marker.getBoundingClientRect = () => new DOMRect(0, 0, 40, 40);
    revealTypingPosition(viewport, marker);
    expect(viewport.scrollTop).toBe(0);
    expect(page.scrollTop).toBe(300);
  });
  it("does not try to scroll an unmeasured or hidden passage", () => {
    const { viewport, marker } = setup(300, 0);
    revealTypingPosition(viewport, marker);
    expect(viewport.scrollTop).toBe(40);
  });
});
