import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { useLessonCatalog } from '../lessons/LessonCatalogContext';
import type { LessonRecord } from '../lessons/lessonCatalog';
import TutorBrand from './TutorBrand';
import TutorThemeToggle from './TutorThemeToggle';
import './lesson-reading.css';

// The source titles carry volume/lesson/reading numbers in Myanmar digits.
function reference(lesson: LessonRecord) {
  if (!lesson.title.startsWith('လိတ်မွူးအတွယ်ꩻ')) return null;
  const numbers = [...lesson.title.matchAll(/[၀-၉]+/g)].map(match =>
    Number([...match[0]].map(digit => digit.charCodeAt(0) - 0x1040).join('')));
  return numbers.length >= 2 ? { volume: numbers[0], lesson: numbers[1], reading: numbers[2] } : null;
}

function topic(lesson: LessonRecord) {
  const prefix = /^Practice Pa’O patterns from Volume \d+, Lesson \d+\.\s*/;
  return prefix.test(lesson.description) ? lesson.description.replace(prefix, '').trim() : '';
}

function LessonLibrary({ lessons }: { lessons: LessonRecord[] }) {
  const volumes = new Map<number, Map<number, LessonRecord[]>>();
  const passages: LessonRecord[] = [];
  for (const lesson of lessons) {
    const ref = reference(lesson);
    if (!ref) { passages.push(lesson); continue; }
    if (!volumes.has(ref.volume)) volumes.set(ref.volume, new Map());
    const groups = volumes.get(ref.volume)!;
    if (!groups.has(ref.lesson)) groups.set(ref.lesson, []);
    groups.get(ref.lesson)!.push(lesson);
  }
  return <>
    <nav className="reading-volume-links" aria-label="Jump to volume">
      {[...volumes.keys()].map(volume => <a key={volume} href={`#volume-${volume}`} onClick={event => {
        // Avoid replacing HashRouter's route in packaged desktop apps.
        event.preventDefault();
        document.getElementById(`volume-${volume}`)?.scrollIntoView({ block: 'start' });
      }}>Volume {volume}</a>)}
      {!!passages.length && <a href="#reading-passages" onClick={event => {
        event.preventDefault(); document.getElementById('reading-passages')?.scrollIntoView({ block: 'start' });
      }}>Passages</a>}
    </nav>
    {[...volumes].map(([volume, groups]) => <section className="reading-volume" key={volume} aria-labelledby={`volume-${volume}`}>
      <h2 id={`volume-${volume}`}>Volume {volume}</h2>
      <div className="reading-library-grid">{[...groups].map(([number, items]) => <section className="reading-group" key={number} aria-label={`Volume ${volume}, Lesson ${number}`}>
        <h3>Lesson {number}</h3>
        {items.map(item => {
          const ref = reference(item)!;
          return <Link className="reading-choice" key={item.id} to={`/lessons/${item.id}`}>
            <span><strong>{ref.reading ? `Reading ${ref.reading}` : 'Letter patterns'}</strong>{topic(item) && <span lang="blk">{topic(item)}</span>}</span><ArrowRight size={17} aria-hidden="true" />
          </Link>;
        })}
      </section>)}</div>
    </section>)}
    {!!passages.length && <section className="reading-volume" aria-labelledby="reading-passages">
      <h2 id="reading-passages">Reading passages</h2>
      <div className="reading-library-grid">{passages.map(item => <Link className="reading-group reading-choice" key={item.id} to={`/lessons/${item.id}`}>
        <strong lang="blk">{item.title}</strong><ArrowRight size={17} aria-hidden="true" />
      </Link>)}</div>
    </section>}
  </>;
}

export default function LessonReading() {
  const { catalog } = useLessonCatalog();
  const { lessonId } = useParams<{ lessonId: string }>();
  const lessons = catalog.filter(item => item.status === 'Published' && item.content.trim());
  const index = lessons.findIndex(item => String(item.id) === lessonId);
  const lesson = lessons[index];
  const previous = lessons[index - 1];
  const next = lessons[index + 1];
  const ref = lesson ? reference(lesson) : null;
  const bookReading = lesson?.id === 51 ? lessons.find(item => item.id === 11) : undefined;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [lessonId]);

  return <div className="simple-tutor reading-page">
    <header className="tutor-header">
      <TutorBrand />
      <nav className="reading-nav" aria-label="Main navigation"><Link to="/">Home</Link><Link to="/lessons" aria-current={lessonId ? undefined : 'page'}>Lessons</Link><Link to="/practice">Practice</Link></nav>
      <TutorThemeToggle />
    </header>
    <main className="reading-main" id="main-content">
      {lessonId === undefined ? <>
        <div className="reading-intro"><p className="reading-eyebrow"><BookOpen size={17} />PA’O READING ROOM</p><h1 ref={heading} tabIndex={-1}>Read & learn Pa’O</h1><p>Explore the letters, read the passages, and learn at your own pace.</p><span>{lessons.length} lessons to explore</span></div>
        {lessons.length ? <LessonLibrary lessons={lessons} /> : <p className="reading-empty">No published lessons yet. Please check back soon.</p>}
      </> : lesson ? <>
        <Link className="reading-back" to="/lessons"><ArrowLeft size={17} />All lessons</Link>
        <article className={`reading-paper${lesson.id === 51 ? ' reading-book-page' : ''}`} aria-labelledby="reading-title">
          {lesson.id === 51 && <div className="reading-book-number" lang="blk">(၁၀)</div>}
          <header className="reading-paper-heading">
            <p className="reading-eyebrow">{ref ? `Volume ${ref.volume} · Lesson ${ref.lesson} · ${ref.reading ? `Reading ${ref.reading}` : 'Letter patterns'}` : 'Reading passage'}</p>
            <h1 id="reading-title" ref={heading} tabIndex={-1} lang="blk">{lesson.title}</h1>
            {topic(lesson) && <p className="reading-topic" lang="blk">{topic(lesson)}</p>}
          </header>
          <div className="reading-passage" lang="blk">{lesson.content.split(/\n\s*\n/).map((paragraph, i) => {
            // This source paragraph contains ten vowel families without row breaks.
            const patternRows = lesson.id === 51 && i === 0;
            if (!patternRows) return lesson.id === 51 ? null : <p key={i}>{paragraph}</p>;
            const rows = paragraph.split(/\s+(?=ကိ |ကု |ကေ့ |ကဲ့ |ကုဲင့် |ကော့ |ကို့ |ကံ့ |ကုံ့ )/).map(row => row.trim().split(/\s+/));
            return <div key={i} className="reading-pattern-scroll" tabIndex={0} role="region" aria-label="Letter pattern table; scroll horizontally to see all columns">
              <table className="reading-pattern-table">
                <thead><tr><th scope="col">တွယ်ꩻ</th><th scope="col">ဗီးတွမ်း မူလသရစဲဉ်း ရော်ꩻခဏ်ꩻ</th><th scope="col">ပွုံႏစံႏ</th></tr></thead>
                <tbody>{rows.map((words, rowIndex) => <tr key={rowIndex}>
                  <th scope="row">{String(rowIndex + 1).replace(/\d/g, digit => '၀၁၂၃၄၅၆၇၈၉'[Number(digit)])}</th>
                  <td><div className="reading-pattern-letters">{words.slice(0, -1).map((word, wordIndex) => <span key={wordIndex}>{word}</span>)}</div></td>
                  <td className="reading-pattern-example">{words[words.length - 1]}</td>
                </tr>)}</tbody>
              </table>
            </div>;
          })}</div>
          {lesson.id === 51 && <div className="reading-book-bottom" lang="blk">
            <p className="reading-book-alphabet">သွုံꩻအာ - က ခ င စ ဆ ည တ ထ ဒ န ပ ဖ ဗ မ ယ ရ လ ၀ ဟ (အဖြုံႏ ၂၀ ယိုသွူ</p>
            {bookReading && <section aria-labelledby="book-reading-title">
              <h2>{lesson.title}</h2>
              <h3 id="book-reading-title">ဖတ်လွူꩻခန်ꩻ (၁)</h3>
              <div className="reading-book-verse">{bookReading.content.split(/\s+(?=မာꩻကုဲင်းကုဲင်း)/).map((column, columnIndex) =>
                <p key={columnIndex}>{column.replace(/\s+(?=နီတထာ|မာꩻအလူႏ|သူႏသေ|ဟဲ့ꩻလိုꩻ|လေားကာႏ|ပအိုဝ်ႏပို|ခူးပါကုံႏ|ယုံယုံသာႏ)/g, '\n')}</p>
              )}</div>
            </section>}
            {lesson.content.split(/\n\s*\n/).slice(1).map((paragraph, i) => <p className="reading-book-note" key={i}>{paragraph}</p>)}
          </div>}

        </article>
        <nav className="reading-pagination" aria-label="Read another lesson">
          {previous ? <Link to={`/lessons/${previous.id}`} rel="prev" aria-label="Previous lesson"><ArrowLeft size={18} /><span>Previous lesson<strong lang="blk">{previous.title}</strong></span></Link> : <span />}
          {next ? <Link to={`/lessons/${next.id}`} rel="next" aria-label="Next lesson"><span>Next lesson<strong lang="blk">{next.title}</strong></span><ArrowRight size={18} /></Link> : <Link to="/lessons">Back to all lessons <BookOpen size={18} /></Link>}
        </nav>
        <p className="reading-position">{index + 1} of {lessons.length} lessons</p>
      </> : <section className="reading-empty"><h1 ref={heading} tabIndex={-1}>Lesson not found</h1><p>This lesson is not available. Choose another lesson from the reading room.</p><Link className="reading-back" to="/lessons"><ArrowLeft size={17} />All lessons</Link></section>}
    </main>
    <footer className="tutor-footer">Read at your own pace. Return to any lesson whenever you like.</footer>
  </div>;
}
