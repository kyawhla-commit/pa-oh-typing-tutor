import { useEffect, useRef } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { useLessonCatalog } from '../lessons/LessonCatalogContext';
import type { LessonRecord } from '../lessons/lessonCatalog';
import TutorBrand from './TutorBrand';
import TutorThemeToggle from './TutorThemeToggle';
import './lesson-reading.css';
import { readingIllustrations } from './readingIllustrations';
import danceIllustration from '../../assets/lessons/volume-1/dance.webp';
import boyIllustration from '../../assets/lessons/volume-1/boy.webp';
import childrenIllustration from '../../assets/lessons/volume-1/children.webp';
import girlIllustration from '../../assets/lessons/volume-1/girl.webp';
import landscapeIllustration from '../../assets/lessons/volume-1/landscape.webp';

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

// Each source row has six letter forms and an example, with two documented
// exceptions. Keep source spelling, repeated rows, and missing forms intact.
function patternRowsForLesson(id: number, paragraph: string) {
  const words = paragraph.trim().split(/\s+/);
  const rows: string[][] = [];
  while (words.length) {
    const count = id === 55 && rows.length === 3 ? 6 : id === 66 && rows.length === 0 ? 8 : 7;
    const row = words.splice(0, count);
    if (id === 66 && rows.length === 0) row.splice(6, 2, row.slice(6).join(' '));
    rows.push(row);
  }
  return rows;
}

function PairedPassage({ text }: { text: string }) {
  // Keep the exact source whitespace for selection and copying.
  const phrases = text.match(/\S+\s*/g) ?? [];
  return <p className="reading-flow-verse">{phrases.map((phrase, index) => <span key={index}>{phrase}</span>)}</p>;
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
  const published = catalog.filter(item => item.status === 'Published' && item.content.trim());
  const patternFor = (item: LessonRecord) => {
    const itemRef = reference(item);
    if (itemRef?.reading !== 1) return undefined;
    return published.find(candidate => {
      const candidateRef = reference(candidate);
      return candidateRef?.volume === itemRef.volume && candidateRef?.lesson === itemRef.lesson
        && /^Practice Pa’O patterns from Volume/.test(candidate.description);
    });
  };
  const lessons = published.filter(item => !patternFor(item));
  const requested = published.find(item => String(item.id) === lessonId);
  const redirect = requested ? patternFor(requested) : undefined;
  const index = lessons.findIndex(item => String(item.id) === lessonId);
  const lesson = lessons[index];
  const previous = lessons[index - 1];
  const next = lessons[index + 1];
  const ref = lesson ? reference(lesson) : null;
  const isBookPattern = !!lesson && /^Practice Pa’O patterns from Volume \d+, Lesson \d+\./.test(lesson.description);
  const bookReading = isBookPattern ? published.find(item => { const itemRef = reference(item); return itemRef?.volume === ref?.volume && itemRef?.lesson === ref?.lesson && itemRef?.reading === 1; }) : undefined;
  const illustration = lesson ? readingIllustrations[lesson.id] : undefined;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [lessonId]);

  if (redirect) return <Navigate to={`/lessons/${redirect.id}`} replace />;

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
        <article className={`reading-paper${isBookPattern ? ' reading-book-page' : lesson.id === 10 ? ' reading-illustrated-page' : lesson.id === 12 ? ' reading-dance-page' : illustration ? ' reading-restored-page' : ''}`} aria-labelledby="reading-title">
          {(lesson.id === 51 || lesson.id === 52) && <div className="reading-book-number" lang="blk">{lesson.id === 51 ? '(၁၀)' : '(၁၂)'}</div>}
          <header className="reading-paper-heading">
            <p className="reading-eyebrow">{ref ? `Volume ${ref.volume} · Lesson ${ref.lesson} · ${ref.reading ? `Reading ${ref.reading}` : 'Letter patterns'}` : 'Reading passage'}</p>
            <h1 id="reading-title" ref={heading} tabIndex={-1} lang="blk">{lesson.title}</h1>
            {!isBookPattern && topic(lesson) && <p className="reading-topic" lang="blk">{topic(lesson)}</p>}
          </header>
          {lesson.id === 10 && <div className="reading-illustration-strip">
            <img src={boyIllustration} alt="A smiling boy in a collared shirt" width={1254} height={1254} />
            <img src={childrenIllustration} alt="Two children carrying shoulder bags" width={1254} height={1254} />
            <img src={girlIllustration} alt="A girl wearing a patterned headwrap and eating fruit" width={1254} height={1254} />
          </div>}
          <div className={illustration ? 'reading-restored-composition' : undefined} data-lesson={lesson.id}>
          {illustration && <figure className="reading-restored-art"><img src={illustration.src} alt={illustration.alt} decoding="async" /></figure>}
          <div className="reading-passage" lang="blk">{lesson.content.split(/\n\s*\n/).map((paragraph, i) => {
            // This source paragraph contains ten vowel families without row breaks.
            const patternRows = isBookPattern && i === 0;
            if (!patternRows) {
              if (isBookPattern) return null;
              if ([46, 47, 48, 49].includes(lesson.id)) {
                const phrases = paragraph.match(/\S+\s*/g) ?? [];
                let offset = 0;
                const poemLines: Record<number, number[]> = {
                  46: [2, 2, 2, 1, 2, 2, 5],
                  47: [4, 2, 2, 1, 2, 1, 2, 1, 2, 1, 2, 2, 3],
                  48: [2, 1, 2, 1, 2, 1, 2, 1, 3],
                  49: [2, 2, 2, 2, 1, 2, 1, 2, 3, 2, 1, 2, 2, 2],
                };
                const lineLengths = poemLines[lesson.id];
                return <p key={i} className="reading-bird-verse">{lineLengths.map((count, line) => {
                  const text = phrases.slice(offset, offset + count).join('');
                  offset += count;
                  return <span key={line}>{text}</span>;
                })}</p>;
              }
              if (lesson.id !== 12) return <PairedPassage key={i} text={paragraph} />;
              if (lesson.id === 12) return <div key={i} className="reading-paired-verse">{paragraph.split('\n').map((line, row) => {
                const split = line.indexOf(' ');
                return <div key={row}><span>{line.slice(0, split)}</span>{' '}<span>{line.slice(split + 1)}</span></div>;
              })}</div>;
              return <PairedPassage key={i} text={paragraph} />;
            }
            const rowBoundary = lesson.id === 51 ? /\s+(?=ကိ |ကု |ကေ့ |ကဲ့ |ကုဲင့် |ကော့ |ကို့ |ကံ့ |ကုံ့ )/ : /\s+(?=ကျု |ကျေ့ |ကျော့ |ကျို့ |ကျံ့ |ကျုံ့ )/;
            const rows = lesson.id <= 52
              ? paragraph.split(rowBoundary).map(row => row.trim().split(/\s+/))
              : patternRowsForLesson(lesson.id, paragraph);
            if (lesson.id === 52) {
              // Reading-only rows marked with × in the supplied book photograph.
              rows.splice(1, 0, ['ကျိ', 'ကျိꩻ', 'ကျီ', 'ကျီꩻ', 'ကျီး', 'ကျီႏ', '– (×)']);
              rows.splice(4, 0, ['ကျဲ့', 'ကျဲ့ꩻ', 'ကျဲ', 'ကျဲꩻ', 'ကျဲး', 'ကျဲႏ', '– (×)'], ['ကျုဲင့်', 'ကျုဲင့်ꩻ', 'ကျုဲင်', 'ကျုဲင်ꩻ', 'ကျုဲင်း', 'ကျုဲင်ႏ', '– (×)']);
            }
            return <div key={i} className="reading-pattern-scroll" tabIndex={0} role="region" aria-label="Letter pattern table; scroll horizontally to see all columns">
              <table className="reading-pattern-table">
                <thead><tr><th scope="col">တွယ်ꩻ</th><th scope="col">{topic(lesson) || 'ဗီးတွမ်း မူလသရစဲဉ်း ရော်ꩻခဏ်ꩻ'}</th><th scope="col">ပွုံႏစံႏ</th></tr></thead>
                <tbody>{rows.map((words, rowIndex) => <tr key={rowIndex}>
                  <th scope="row">{String(rowIndex + 1).replace(/\d/g, digit => '၀၁၂၃၄၅၆၇၈၉'[Number(digit)])}</th>
                  <td><div className="reading-pattern-letters">{words.slice(0, -1).map((word, wordIndex) => <span key={wordIndex}>{word}</span>)}</div></td>
                  <td className="reading-pattern-example">{words[words.length - 1]}</td>
                </tr>)}</tbody>
              </table>
            </div>;
          })}</div>
          </div>
          {isBookPattern && <div className="reading-book-bottom" lang="blk">
            {lesson.id === 51 && <p className="reading-book-alphabet">သွုံꩻအာ - က ခ င စ ဆ ည တ ထ ဒ န ပ ဖ ဗ မ ယ ရ လ ၀ ဟ (အဖြုံႏ ၂၀ ယိုသွူ</p>}
            {bookReading && <section aria-labelledby="book-reading-title">
              <h2>{lesson.title}</h2>
              <h3 id="book-reading-title">ဖတ်လွူꩻခန်ꩻ (၁)</h3>
              {lesson.id === 51 ? <div className="reading-book-verse">{bookReading.content.split(/\s+(?=မာꩻကုဲင်းကုဲင်း)/).map((column, columnIndex) =>
                <p key={columnIndex}>{column.replace(/\s+(?=နီတထာ|မာꩻအလူႏ|သူႏသေ|ဟဲ့ꩻလိုꩻ|လေားကာႏ|ပအိုဝ်ႏပို|ခူးပါကုံႏ|ယုံယုံသာႏ)/g, '\n')}</p>
              )}</div> : lesson.id !== 52 ? <div className="reading-book-verse reading-book-general-verse">{bookReading.content.split(/\n\s*\n/).map((paragraph, i) => <PairedPassage key={i} text={paragraph} />)}</div> : <div className="reading-paired-verse">{bookReading.content.split(/\s+(?=တသာႏ|ကျူႏလုဲင်ꩻ|ဟျူႏ|ဖျောႏ)/).map((line, row) => {
                const split = line.search(/\s+(?=အုံထာꩻ|ကျိုꩻစာꩻ|နီပအိုဝ်ႏ|ကျံႏစံႏ|ပျုံးဖါ)/);
                return <div key={row}><span>{line.slice(0, split)}</span>{' '}<span>{line.slice(split).trim()}</span></div>;
              })}</div>}

            </section>}
            {lesson.content.split(/\n\s*\n/).slice(1).map((paragraph, i) => <p className="reading-book-note" key={i}>{paragraph}</p>)}
          </div>}

          {lesson.id === 10 && <img className="reading-landscape" src={landscapeIllustration} alt="Rice fields, distant hills, trees, and a hut beside a stream" width={2172} height={724} loading="lazy" />}
          {lesson.id === 12 && <img className="reading-dance-illustration" src={danceIllustration} alt="Two Pa’O dancers in traditional clothing accompanied by a drummer and a cymbal player" width={1448} height={1086} loading="lazy" />}

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
