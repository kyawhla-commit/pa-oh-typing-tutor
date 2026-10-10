// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import VirtualKeyboard from "./VirtualKeyboard";
import type { KeyHint } from "./keyboardLayouts";

let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

it("updates the expected key and Shift hints without moving the page or focus", () => {
  const hint: KeyHint = { code: "KeyE", label: "E", shift: false, text: "န" };
  const render = (nextKey: KeyHint | null) => act(() => root.render(<StrictMode><VirtualKeyboard layout="Pa'O" nextKey={nextKey} /></StrictMode>));
  const input = document.createElement("input");
  document.body.append(input);
  input.focus();
  try {
    render(hint);
    const area = host.querySelector<HTMLElement>('[aria-label="Keyboard guide"]')!;
    host.scrollTop = 220;
    expect(host.querySelector('[data-key-code="KeyE"]')!.getAttribute("data-next-key")).toBe("true");
    render({ code: "KeyD", label: "D", shift: true, text: "ိ" });
    expect(host.querySelector('[data-key-code="KeyE"]')!.getAttribute("data-next-key")).toBeNull();
    for (const code of ["KeyD", "ShiftLeft", "ShiftRight"]) {
      expect(host.querySelector(`[data-key-code="${code}"]`)!.getAttribute("data-next-key")).toBe("true");
    }
    expect(area.scrollLeft).toBe(0);
    expect(host.scrollTop).toBe(220);
    expect(document.activeElement).toBe(input);
    render(null);
    expect(host.querySelector('[data-next-key="true"]')).toBeNull();
  } finally { input.remove(); }
});

it("renders every key without a scroll instruction or an extra tab stop in both layouts", () => {
  for (const layout of ["Pa'O", "QWERTY"]) {
    act(() => root.render(<VirtualKeyboard layout={layout} />));
    const region = host.querySelector<HTMLElement>('[aria-label="Keyboard guide"]')!;
    expect(region.tabIndex).toBe(-1);
    expect(region.hasAttribute("aria-describedby")).toBe(false);
    expect(region.textContent).not.toContain("Scroll sideways");
    expect(region.querySelectorAll(".keyboard-keys > div")).toHaveLength(5);
    expect(region.querySelectorAll(".keyboard-keys > div > div")).toHaveLength(54);
    expect(region.querySelectorAll('[data-next-key="true"]')).toHaveLength(0);
  }
});
