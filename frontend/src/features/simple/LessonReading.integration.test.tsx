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

it('organizes 42 unique reading pages into six volumes and the standalone passages', () => {
  const host = render('/lessons');
  expect(host.querySelectorAll('.reading-volume')).toHaveLength(7);
  expect(host.querySelectorAll('.reading-choice')).toHaveLength(42);
  const first = host.querySelector('[aria-label="Volume 1, Lesson 1"]')!;
  expect([...first.querySelectorAll('a')].map(a => a.getAttribute('href'))).toEqual(['/lessons/51', '/lessons/10']);
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
  expect(host.querySelector('h1')?.textContent).toBe(bundledLessons[2].title);
  expect(document.activeElement).toBe(host.querySelector('h1'));
  act(() => host.querySelector<HTMLAnchorElement>('[aria-label="Previous lesson"]')!.click());
  expect(host.querySelector('h1')?.textContent).toBe(bundledLessons[0].title);
});

it.each([[53,10],[54,10],[55,4],[56,9],[57,10],[58,3],[59,10],[60,6],[61,4],[62,5],[63,8],[64,3],[65,7],[66,6],[67,3],[68,7]])('shows lesson %i as numbered pattern rows with examples', (id, count) => {
  const host = render(`/lessons/${id}`);
  const lesson = bundledLessons.find(item => item.id === id)!;
  const rows = [...host.querySelectorAll('.reading-pattern-table tbody tr')];
  expect(rows).toHaveLength(count);
  // Letter spans have no separating DOM whitespace; compare their individual values.
  const tokens = rows.flatMap(row => [...row.querySelectorAll('.reading-pattern-letters span, .reading-pattern-example')].map(cell => cell.textContent)).join(' ');
  expect(tokens.replace(/\s+/g, ' ')).toBe(lesson.content.split(/\n\s*\n/)[0].replace(/\s+/g, ' '));
  expect(host.querySelector('thead')?.textContent).toContain('ပွုံႏစံႏ');
  expect(host.querySelector('.reading-book-bottom h3')).not.toBeNull();
  expect(host.querySelector('textarea')).toBeNull();
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

it('shows Lesson 2 book rows and both readings without losing catalog text', () => {
  const host = render('/lessons/52');
  expect(host.querySelectorAll('.reading-pattern-table tbody tr')).toHaveLength(10);
  expect([...host.querySelectorAll('.reading-pattern-example')].filter(cell => cell.textContent === '– (×)')).toHaveLength(3);
  expect(host.querySelector('.reading-paired-verse')?.textContent).toBe(bundledLessons.find(item => item.id === 9)!.content.replace(/\s+(?=တသာႏ|ကျူႏလုဲင်ꩻ|ဟျူႏ|ဖျောႏ)/g, ''));
  act(() => host.querySelector<HTMLAnchorElement>('[aria-label="Next lesson"]')!.click());
  expect(host.querySelector('.reading-dance-illustration')).not.toBeNull();
  expect(host.querySelectorAll('.reading-paired-verse > div')).toHaveLength(6);
  expect(host.querySelector('.reading-paired-verse')?.textContent).toBe(bundledLessons.find(item => item.id === 12)!.content.replace(/\n/g, ''));
});

it.each([14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,45,46,47,48,49,50])('shows restored artwork and complete original text for lesson %i', id => {
  const host = render(`/lessons/${id}`);
  const lesson = bundledLessons.find(item => item.id === id)!;
  const picture = host.querySelector<HTMLImageElement>('.reading-restored-art img');
  if ([14, 34, 38, 40, 44].includes(id)) {
    expect(host.querySelectorAll('.reading-panel-art svg')).toHaveLength(2);
    expect(host.querySelector('.reading-panel-art image')?.getAttribute('href')).toContain(`lesson-${id}.webp`);
  } else {
    expect(picture?.getAttribute('src')).toContain(`lesson-${id}.webp`);
    expect(picture?.alt).toBeTruthy();
  }
  expect([...host.querySelectorAll('.reading-passage p')].map(p => p.textContent).join([14, 34, 38, 40, 44].includes(id) ? '' : '\n\n')).toBe(lesson.content);
  if (id === 14) expect(host.querySelectorAll('.reading-source-stanza > span')).toHaveLength(10);
  expect(host.querySelector('textarea')).toBeNull();
});

it('redirects a bookmarked Reading 1 page to its pattern page without losing the passage', () => {
  const host = render('/lessons/11');
  expect(host.querySelector('h1')?.textContent).toBe(bundledLessons[0].title);
  expect(host.querySelector('.reading-book-verse')).not.toBeNull();
  expect(host.querySelector('[aria-label="Next lesson"]')?.getAttribute('href')).toBe('/lessons/10');
});

it.each([[53, 13], [54, 15], [56, 19], [57, 21]])('preserves the original two five-line stanzas for pattern lesson %i', (patternId, readingId) => {
  const host = render(`/lessons/${patternId}`);
  const verse = host.querySelector('.reading-original-verse');
  expect(verse?.children).toHaveLength(10);
  expect(verse?.textContent).toBe(bundledLessons.find(item => item.id === readingId)!.content);
});


it('matches the five-left, four-right source lines for pattern lesson 59', () => {
  const host = render('/lessons/59');
  const verse = host.querySelector('.reading-original-verse');
  expect(verse?.children).toHaveLength(9);
  expect(verse?.textContent).toBe(bundledLessons.find(item => item.id === 25)!.content);
});


it('preserves the five paired source lines for pattern lesson 60', () => {
  const host = render('/lessons/60');
  const verse = host.querySelector('.reading-compact-source-verse');
  expect(verse?.children).toHaveLength(5);
  expect(verse?.querySelectorAll('span')).toHaveLength(10);
  expect(verse?.textContent).toBe(bundledLessons.find(item => item.id === 27)!.content);
});


it('keeps the two full-width lines in the five-line source passage for lesson 62', () => {
  const host = render('/lessons/62');
  const verse = host.querySelector('.reading-compact-source-verse');
  expect(verse?.children).toHaveLength(5);
  expect(verse?.querySelectorAll('.is-full-line')).toHaveLength(2);
  expect(verse?.textContent).toBe(bundledLessons.find(item => item.id === 31)!.content);
});


it('preserves the two four-line source blocks for lesson 63', () => {
  const host = render('/lessons/63');
  const verse = host.querySelector('.reading-original-verse-four');
  expect(verse?.children).toHaveLength(8);
  expect(verse?.textContent).toBe(bundledLessons.find(item => item.id === 33)!.content);
});


it.each([[67, 41, 3], [68, 43, 7]])('preserves source lines for pattern lesson %i', (patternId, readingId, count) => {
  const host = render(`/lessons/${patternId}`);
  const verse = host.querySelector('.reading-compact-source-verse');
  expect(verse?.children).toHaveLength(count);
  expect(verse?.textContent).toBe(bundledLessons.find(item => item.id === readingId)!.content);
});
