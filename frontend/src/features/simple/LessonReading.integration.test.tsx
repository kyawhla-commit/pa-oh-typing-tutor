// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import { CatalogContext, type LessonCatalogValue } from '../lessons/LessonCatalogContext';
import { bundledLessons } from '../lessons/bundledLessons';
import LessonReading from './LessonReading';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let dispose: (() => void) | undefined;
afterEach(() => { dispose?.(); dispose = undefined; });

function render(path: string, catalog = bundledLessons) {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const noOp = async () => {};
  const value: LessonCatalogValue = { catalog, catalogStatus: 'local', catalogError: null, canManageCatalog: false, isLocalCatalog: true,
    saveLesson: noOp, changeLessonStatus: noOp, deleteLesson: noOp, restoreDefaultCatalog: noOp };
  act(() => root.render(<MemoryRouter initialEntries={[path]}><CatalogContext.Provider value={value}><Routes>
    <Route path="/lessons" element={<LessonReading />} />
    <Route path="/lessons/:lessonId" element={<LessonReading />} />
  </Routes></CatalogContext.Provider></MemoryRouter>));
  dispose = () => { act(() => root.unmount()); host.remove(); };
  return host;
}

it('organizes all 60 lessons into six volumes and the standalone passages', () => {
  const host = render('/lessons');
  expect(host.querySelectorAll('.reading-volume')).toHaveLength(7);
  expect(host.querySelectorAll('.reading-choice')).toHaveLength(60);
  const first = host.querySelector('[aria-label="Volume 1, Lesson 1"]')!;
  expect([...first.querySelectorAll('a')].map(a => a.getAttribute('href'))).toEqual(['/lessons/51', '/lessons/11', '/lessons/10']);
  act(() => first.querySelector('a')!.click());
  expect(host.querySelector('h1')?.textContent).toBe(bundledLessons[0].title);
});

it('shows all paragraphs, follows catalog order, and focuses the new reading title', () => {
  const host = render('/lessons/51');
  const rows = [...host.querySelectorAll('.reading-pattern-table tbody tr')];
  expect(rows).toHaveLength(10);
  expect(rows[0].querySelector('th')?.textContent).toBe('၁');
  expect(rows[9].querySelector('th')?.textContent).toBe('၁၀');
  expect([...rows[0].querySelectorAll('.reading-pattern-letters span')].map(cell => cell.textContent)).toEqual(['က', 'ကꩻ', 'ကာ', 'ကာꩻ', 'ကား', 'ကာႏ']);
  expect(rows[0].querySelector('.reading-pattern-example')?.textContent).toBe('ကာꩻကားငါႏ');
  expect(rows[1].querySelector('.reading-pattern-example')?.textContent).toBe('နီဝါးကီႏ');
  const renderedWords = rows.flatMap(row => [...row.querySelectorAll('.reading-pattern-letters span, .reading-pattern-example')].map(cell => cell.textContent));
  expect(renderedWords.join(' ')).toBe(bundledLessons[0].content.split('\n\n')[0]);
  expect(host.querySelector('.reading-book-page')).not.toBeNull();
  const verse = [...host.querySelectorAll('.reading-book-verse p')];
  expect(verse).toHaveLength(2);
  expect(verse.map(p => p.textContent).join(' ').replace(/\s+/g, ' ')).toBe(bundledLessons.find(item => item.id === 11)!.content);
  expect(host.querySelector('textarea')).toBeNull();
  expect(host.querySelector('[aria-label="Keyboard guide"]')).toBeNull();
  expect(host.querySelector('[aria-label="Previous lesson"]')).toBeNull();
  act(() => host.querySelector<HTMLAnchorElement>('[aria-label="Next lesson"]')!.click());
  expect(host.querySelector('h1')?.textContent).toBe(bundledLessons[1].title);
  expect(document.activeElement).toBe(host.querySelector('h1'));
  act(() => host.querySelector<HTMLAnchorElement>('[aria-label="Previous lesson"]')!.click());
  expect(host.querySelector('h1')?.textContent).toBe(bundledLessons[0].title);
});

it('preserves line breaks and displays the topic on a letter-pattern lesson', () => {
  const host = render('/lessons/58');
  const lesson = bundledLessons.find(item => item.id === 58)!;
  expect(host.querySelector('.reading-passage p')?.textContent).toBe(lesson.content);
  expect(host.querySelector('.reading-topic')?.textContent).toBe('ယပယ် ဗီးသွတ်ꩻခဏ်ꩻ');
});

it('offers the lesson library at the end of the readings', () => {
  const host = render('/lessons/50');
  expect(host.querySelector('[aria-label="Next lesson"]')).toBeNull();
  expect(host.querySelector('.reading-pagination a:last-child')?.getAttribute('href')).toBe('/lessons');
});

it('excludes drafts and blank lessons, including direct links', () => {
  const draft = { ...bundledLessons[0], id: 99, status: 'Draft' as const, content: 'Private draft' };
  const blank = { ...bundledLessons[0], id: 100, content: '  ' };
  const host = render('/lessons/99', [draft, blank]);
  expect(host.textContent).toContain('Lesson not found');
  expect(host.textContent).not.toContain('Private draft');
  act(() => host.querySelector<HTMLAnchorElement>('.reading-back')!.click());
  expect(host.querySelectorAll('.reading-choice')).toHaveLength(0);
  expect(host.textContent).toContain('No published lessons yet');
});


it('pairs the Reading 2 illustrations with the complete selectable passage', () => {
  const host = render('/lessons/10');
  expect(host.querySelectorAll('.reading-illustration-strip img')).toHaveLength(3);
  expect(host.querySelector('.reading-landscape')).not.toBeNull();
  expect(host.querySelector('.reading-passage')?.textContent).toBe(bundledLessons.find(item => item.id === 10)!.content);
});
