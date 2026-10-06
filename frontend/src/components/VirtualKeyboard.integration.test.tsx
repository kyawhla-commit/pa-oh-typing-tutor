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

it("follows key changes and screen resizing locally, with observer cleanup", () => {
  const observers: { callback: () => void; disconnect: ReturnType<typeof vi.fn> }[] = [];
  vi.stubGlobal("ResizeObserver", class {
    observe = vi.fn(); disconnect = vi.fn();
    constructor(callback: () => void) { observers.push({ callback, disconnect: this.disconnect }); }
  });
  const hint: KeyHint = { code: "KeyE", label: "E", shift: false, text: "န" };
  const render = (nextKey: KeyHint | null) => act(() => root.render(<StrictMode><VirtualKeyboard layout="Pa'O" nextKey={nextKey} /></StrictMode>));
  render(hint);
  const area = host.querySelector<HTMLElement>('[aria-label="Keyboard guide"]')!;
  let width = 280;
  Object.defineProperties(area, { clientWidth: { get: () => width }, scrollWidth: { value: 600 } });
  area.getBoundingClientRect = () => new DOMRect(0, 0, width, 220);
  const key = (code: string, left: number) => {
    host.querySelector<HTMLElement>(`[data-key-code="${code}"]`)!.getBoundingClientRect = () => new DOMRect(left - area.scrollLeft, 0, 40, 40);
  };
  key("KeyE", 400); key("KeyD", 100);
  host.scrollTop = 220;
  const observer = observers.at(-1)!;
  act(() => observer.callback());
  expect(area.scrollLeft).toBe(168);
  expect(host.scrollTop).toBe(220);
  expect(document.activeElement).not.toBe(area);
  render({ code: "KeyD", label: "D", shift: true, text: "ိ" });
  expect(area.scrollLeft).toBe(92);
  expect(host.querySelector('[data-key-code="ShiftLeft"]')!.getAttribute("data-next-key")).toBe("true");
  width = 900;
  act(() => observer.callback());
  expect(area.scrollLeft).toBe(92); // No overflow: the browser handles its own scroll bounds.
  render(null);
  expect(host.querySelector('[data-next-key="true"]')).toBeNull();
  act(() => observer.callback());
  expect(area.scrollLeft).toBe(92);
  act(() => root.render(<div />));
  expect(observers.every(item => item.disconnect.mock.calls.length === 1)).toBe(true);
});

it("exposes keyboard scrolling for keyboard navigation in both layouts", () => {
  for (const layout of ["Pa'O", "QWERTY"]) {
    act(() => root.render(<VirtualKeyboard layout={layout} />));
    const region = host.querySelector<HTMLElement>('[aria-label="Keyboard guide"]')!;
    expect(region.tabIndex).toBe(0);
    const description = host.querySelector(`[id="${region.getAttribute("aria-describedby")}"]`)!;
    expect(description.textContent).toContain("Scroll sideways");
    expect(region.querySelectorAll('[data-next-key="true"]')).toHaveLength(0);
  }
});
