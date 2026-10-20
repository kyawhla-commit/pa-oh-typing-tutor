// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import App from '../../App';

vi.mock('../../components/VirtualKeyboard', () => ({ default: () => <div /> }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  host?.remove();
  window.history.replaceState({}, '', '/');
  vi.unstubAllEnvs();
});

it.each([
  { mode: 'desktop', href: '#/practice' },
  { mode: 'production', href: '/practice' },
])('opens Practice and restores its route after a reload in $mode', ({ mode, href }) => {
  vi.stubEnv('MODE', mode);
  window.history.replaceState({}, '', '/');
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(<App />));

  const practice = host.querySelector<HTMLAnchorElement>('a.home-start');
  expect(practice?.getAttribute('href')).toBe(href);
  act(() => practice!.click());
  expect(host.querySelector('[aria-label="Lesson text"]')).not.toBeNull();

  // Recreate the app at its current URL, as the webview does on reload.
  act(() => root!.unmount());
  root = createRoot(host);
  act(() => root!.render(<App />));
  expect(host.querySelector('[aria-label="Lesson text"]')).not.toBeNull();
});
