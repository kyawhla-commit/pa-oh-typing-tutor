// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { CatalogContext, type LessonCatalogValue } from '../lessons/LessonCatalogContext';
import { SimplePractice } from './SimpleTutor';
import type { LessonRecord } from '../lessons/lessonCatalog';

vi.mock('../../components/VirtualKeyboard', () => ({ default: ({ layout }: { layout: string }) => <div data-testid="keyboard">{layout}</div> }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let dispose: (() => void) | undefined;
afterEach(() => dispose?.());
const record = (id: number, status: 'Published' | 'Draft', content: string): LessonRecord => ({ id, status, content, title: `Database lesson ${id}`, description: 'Practice text', category: 'Beginner', difficulty: 'Beginner', durationMinutes: 5, updatedAt: '2026-10-19' });
function render(catalog: LessonRecord[], status: LessonCatalogValue['catalogStatus'] = 'synced') {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const value: LessonCatalogValue = { catalog, catalogStatus: status, catalogError: status === 'error' ? 'Unavailable' : null, canManageCatalog: false, isLocalCatalog: false, saveLesson: vi.fn(), changeLessonStatus: vi.fn(), deleteLesson: vi.fn(), restoreDefaultCatalog: vi.fn() };
  act(() => root.render(<MemoryRouter><CatalogContext.Provider value={value}><SimplePractice /></CatalogContext.Provider></MemoryRouter>));
  dispose = () => { act(() => root.unmount()); host.remove(); };
  return host;
}
it('uses published database content and switches keyboard with the selected lesson', () => {
  const host = render([record(21, 'Draft', 'secret draft'), record(30, 'Published', 'hello world'), record(48, 'Published', 'မမ တတ ကက')]);
  expect(host.querySelector('h1')?.textContent).toBe('Database lesson 30');
  expect(host.textContent).not.toContain('secret draft');
  expect(host.querySelector('[aria-label="Lesson text"]')?.textContent).toBe('hello world');
  expect(host.querySelector('[data-testid="keyboard"]')?.textContent).toBe('QWERTY');
  act(() => (host.querySelector('button[aria-label="Next lesson"]') as HTMLButtonElement).click());
  expect(host.querySelector('h1')?.textContent).toBe('Database lesson 48');
  expect(host.querySelector('[aria-label="Lesson text"]')?.textContent).toBe('မမ တတ ကက');
  expect(host.querySelector('[data-testid="keyboard"]')?.textContent).toBe("Pa'O");
});
it('shows an empty catalog without exposing drafts or built-in practice', () => {
  const host = render([record(9, 'Draft', 'private lesson')]);
  expect(host.textContent).toContain('No published lessons yet');
  expect(host.textContent).not.toContain('private lesson');
  expect(host.querySelector('textarea')).toBeNull();
});
it('shows a retry state when the shared catalog cannot load', () => {
  const host = render([], 'error');
  expect(host.textContent).toContain('Lessons are unavailable');
  expect(host.textContent).toContain('Try again');
});
