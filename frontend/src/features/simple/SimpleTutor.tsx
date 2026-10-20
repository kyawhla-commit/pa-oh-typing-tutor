import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import VirtualKeyboard from '../../components/VirtualKeyboard';
import { useLessonCatalog } from '../lessons/LessonCatalogContext';
import type { LessonRecord } from '../lessons/lessonCatalog';
import TutorThemeToggle from './TutorThemeToggle';
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Keyboard as KeyboardIcon, RotateCcw, Play, Check, X, BookOpen } from 'lucide-react';
import { paoKeyLegends } from '../../components/keyboardLayouts';
import { useTypingFeedback, useTypingSession, useTypingStats } from '../typing/useTypingSession';
import { useTypingInput } from '../typing/useTypingInput';
import { revealTypingPosition } from '../typing/revealTypingPosition';
import { getTypingGuide, nextGuideKey } from '../typing/typingGuide';
import dakkhindaLogo from '../../assets/dakkhinda-logo.webp';

function Brand() {
  return <Link className="tutor-brand" to="/" aria-label="Pa’O Typing Tutor home"><span className="brand-icon"><KeyboardIcon size={22} /></span><span>pa’o<span className="brand-caption">typing tutor</span></span></Link>;
}
export function Home() {
  return <div className="simple-tutor home-page">
    <header className="tutor-header"><Brand /><div className="header-actions"><TutorThemeToggle /><Link className="header-link" to="/practice">Let’s practice <ArrowRight size={16} /></Link></div></header>
    <main id="main-content" className="tutor-home">
      <section className="home-hero">
        <div className="hero-copy">
          <p className="home-eyebrow"><span /> MADE FOR THE PA’O LANGUAGE</p>
          <h1>Your language.<br />Your keyboard.<br /><em>Your rhythm.</em></h1>
          <p className="home-description">Make every keystroke feel a little more natural. A quiet place to learn the Pa’O keyboard, one small lesson at a time.</p>
          <Link to="/practice" className="tutor-start home-start">Start practicing <ArrowRight size={19} /></Link>
          <p className="home-reassurance"><Check size={14} /> Free to use <span>·</span> No account needed</p>
        </div>
        <div className="home-original-preview relative min-w-0">
          <div className="p-3 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="font-mono text-base leading-relaxed mb-4 p-4 bg-white rounded-xl border border-[#E2E8F0]">
              <span className="text-[#16A34A]">ဒဒꩻ </span>
              <span className="bg-[#2563EB] text-white px-0.5 rounded">ဒါ</span>
              <span className="text-[#94A3B8]">ဒါႏ ဖူးပေႏဆား ဟိဟိꩻ ဟီဟီး ငတသီး</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[['72', 'WPM'], ['98%', 'Accuracy'], ['0', 'Errors']].map(([v, l]) => (
                <div key={l} className="bg-white rounded-xl border border-[#E2E8F0] p-3 text-center">
                  <div className="text-xl font-bold text-[#0F172A]">{v}</div>
                  <div className="text-xs text-[#64748B]">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 py-3 sm:px-4 sm:py-4">
              <VirtualKeyboard layout="Pa'O" />
            </div>
          </div>
        </div>
      </section>
      <section className="home-overview" aria-label="How practice works">
        <div><span className="step-number">01</span><h2>Find your starting point.</h2><p>Focused lessons, from first letters to a comfortable typing rhythm.</p></div>
        <div><span className="step-number">02</span><h2>Follow the next key.</h2><p>A clear keyboard guide helps your fingers find their way, at your own pace.</p></div>
        <div><span className="step-number">03</span><h2>Let accuracy lead.</h2><p>See your speed and errors as you type. Take your time. Try again.</p></div>
      </section>
    </main>
    <footer className="tutor-footer"><span>Made for the words that matter.</span><a className="tutor-credit" href="https://github.com/kyawhla-commit/dakkhinda" target="_blank" rel="noopener noreferrer"><span>Built by</span><img src={dakkhindaLogo} alt="Dakkhinda Technologies" /></a></footer>
  </div>;
}
export function SimplePractice() {
  const { catalog, catalogStatus, catalogError } = useLessonCatalog();
  const published = catalog.filter(item => item.status === 'Published' && item.content.trim());
  if (!published.length) return <div className="simple-tutor"><header className="tutor-header"><Brand /><TutorThemeToggle /></header><main className="classic-practice"><h1>{catalogStatus === 'loading' ? 'Loading lessons…' : catalogStatus === 'error' ? 'Lessons are unavailable' : 'No published lessons yet'}</h1><p role="status">{catalogError ? 'We could not load the lesson catalog. Please try again.' : catalogStatus === 'loading' ? 'Getting your lessons ready.' : 'Published lessons will appear here.'}</p><Link className="header-link" to="/">Back to home</Link>{catalogStatus === 'error' && <button className="tutor-start" onClick={() => window.location.reload()}>Try again</button>}</main></div>;
  return <PracticeSession availableLessons={published} />;
}

function PracticeSession({ availableLessons }: { availableLessons: LessonRecord[] }) {
  // Pin this visit's catalog so background edits never replace an active typing target.
  const [sessionLessons] = useState(availableLessons);
  const lessons = sessionLessons.map(item => item.content);
  const lessonNames = sessionLessons.map(item => item.title);
  const [lesson, setLesson] = useState(0);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const lessonDialog = useRef<HTMLDialogElement>(null);
  const pausedForLessons = useRef(false);
  const [started, setStarted] = useState(false);
  const [focused, setFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(() => {
    try { return localStorage.getItem('typing-tutor.keyboard-visible') !== 'false'; }
    catch { return true; }
  });
  const toggleKeyboard = () => {
    const next = !keyboardVisible;
    setKeyboardVisible(next);
    try { localStorage.setItem('typing-tutor.keyboard-visible', String(next)); } catch { /* Keep the control usable without storage. */ }
  };
  const session = useTypingSession({ targetText: lessons[0] });
  const { snapshot, generation, compositionDraft, pressedKey, errorKey } = useTypingFeedback(session);
  const stats = useTypingStats(session);
  const { input, focus } = useTypingInput(session, generation);
  const guide = getTypingGuide(snapshot);
  const layout = /\p{Script=Myanmar}/u.test(snapshot.target.text) ? "Pa'O" : "QWERTY";
  const nextKey = nextGuideKey(snapshot, layout);
  const current = useRef<HTMLSpanElement>(null);
  const typedLine = useRef<HTMLDivElement>(null);
  const passageViewport = useRef<HTMLDivElement>(null);
  const complete = snapshot.status === 'completed';
  const units = snapshot.target.units;
  const lastLineStart = snapshot.typedUnits.reduce((start, unit, index) => /[\n\r]/u.test(unit.text) ? index + 1 : start, 0);
  const visibleTypedUnits = snapshot.typedUnits.slice(lastLineStart);
  const position = Math.min(guide?.position ?? snapshot.currentPosition, units.length - 1);
  let sentenceStart = 0;
  let sentenceEnd = units.length;
  for (let index = 0; index < units.length; index++) {
    if (!/[။.!?\n\r]/u.test(units[index])) continue;
    let end = index + 1;
    while (end < units.length && /^\s+$/u.test(units[end])) end++;
    if (position < end) { sentenceEnd = end; break; }
    sentenceStart = end;
    index = end - 1;
  }

  useEffect(() => {
    if (!lessonsOpen) return;
    const dialog = lessonDialog.current!;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [lessonsOpen]);
  const openLessons = () => {
    pausedForLessons.current = session.feedback.getSnapshot().snapshot.status === 'running';
    if (pausedForLessons.current) session.pause();
    setLessonsOpen(true);
  };
  const closeLessons = () => {
    setLessonsOpen(false);
    if (pausedForLessons.current && session.feedback.getSnapshot().snapshot.status === 'paused') session.resume();
    pausedForLessons.current = false;
  };

  useLayoutEffect(() => {
    const passage = passageViewport.current;
    if (passage) { passage.scrollTop = 0; passage.scrollLeft = 0; }
  }, [generation, sentenceStart]);
  useLayoutEffect(() => {
    const passage = passageViewport.current;
    const reveal = () => {
      if (passage && current.current) {
        revealTypingPosition(passage, current.current);
        const marker = current.current.getBoundingClientRect();
        const area = passage.getBoundingClientRect();
        if (marker.left < area.left || marker.right > area.right - 12) passage.scrollLeft += marker.left - area.left - 12;
      }
    };
    reveal();
    if (typedLine.current) {
      typedLine.current.scrollLeft = typedLine.current.scrollWidth;
      typedLine.current.scrollTop = 0;
    }
    if (!passage || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(reveal);
    observer.observe(passage);
    return () => observer.disconnect();
  }, [snapshot.typedUnits, compositionDraft, generation]);
  const changeLesson = (index: number) => {
    setLesson(index);
    setStarted(false);
    session.restart({ targetText: lessons[index] });
  };
  const start = () => {
    session.restart({ targetText: lessons[lesson] });
    setStarted(true);
  };
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || event.altKey || lessonsOpen) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        if (event.repeat) return;
        if (event.shiftKey) {
          start();
        } else if (snapshot.status === 'ready' || !started) {
          start();
        } else if (snapshot.status === 'paused') {
          session.resume();
          focus();
        } else if (snapshot.status === 'running') {
          focus();
        }
        return;
      }
      if (event.shiftKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
      event.preventDefault();
      if (event.repeat) return;
      const nextLesson = lesson + (event.key === 'ArrowRight' ? 1 : -1);
      if (nextLesson >= 0 && nextLesson < lessons.length) changeLesson(nextLesson);
    };
    document.addEventListener('keydown', handleShortcut, true);
    return () => document.removeEventListener('keydown', handleShortcut, true);
  }, [changeLesson, focus, lesson, lessonsOpen, session, snapshot.status, start, started]);
  return <div className="simple-tutor practice-page">
    <header className="tutor-header"><Brand />      <div className="lesson-toolbar">
        <button onClick={() => changeLesson(lesson - 1)} disabled={lesson === 0} aria-label="Previous lesson" aria-keyshortcuts="Control+ArrowLeft Meta+ArrowLeft"><ChevronLeft size={18} /></button>
        <button className="lesson-picker-trigger" aria-haspopup="dialog" aria-expanded={lessonsOpen} aria-controls="lesson-picker" onClick={openLessons}><BookOpen size={16} /> Lesson {lesson + 1}</button>
        <button onClick={() => changeLesson(lesson + 1)} disabled={lesson === lessons.length - 1} aria-label="Next lesson" aria-keyshortcuts="Control+ArrowRight Meta+ArrowRight"><ChevronRight size={18} /></button>
      </div><div className="header-actions"><TutorThemeToggle /><Link className="header-link" to="/"><ArrowLeft size={16} /> Home</Link></div></header>
    <dialog ref={lessonDialog} id="lesson-picker" className="lesson-modal" aria-labelledby="lesson-modal-title" aria-describedby="lesson-modal-description"
      onCancel={event => { event.preventDefault(); closeLessons(); }}
      onClose={closeLessons}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeLessons();
      }}>
      <div className="lesson-modal-header"><div><p className="home-eyebrow">YOUR PRACTICE LIBRARY</p><h2 id="lesson-modal-title">Choose a lesson</h2></div><button className="lesson-modal-close" aria-label="Close lessons" onClick={closeLessons} autoFocus><X size={20} /></button></div>
      <p id="lesson-modal-description">Build your confidence one lesson at a time. Choose a lesson to load it, then press Start lesson.</p>
      <div className="lesson-modal-grid">
        {lessonNames.map((name, index) => <button key={name} className={`lesson-choice${index === lesson ? ' is-selected' : ''}`} aria-current={index === lesson ? 'true' : undefined}
          onClick={() => { if (index !== lesson) changeLesson(index); closeLessons(); }}>
          <span className="lesson-choice-top"><span>LESSON {String(index + 1).padStart(2, '0')}</span>{index === lesson ? <span className="lesson-current"><Check size={13} /> Current</span> : <ArrowRight size={16} />}</span>
          <strong>{name}</strong><span className="lesson-preview" lang={layout === "Pa'O" ? "blk" : "en"}>{lessons[index]}</span>
        </button>)}
      </div>
      <p className="lesson-modal-note">Choosing a different lesson starts fresh. Closing this window keeps your current practice.</p>
    </dialog>
    <main className="classic-practice" aria-label="Typing practice">
      <section className="practice-card">
      <div className="practice-card-top"><div className="lesson-title"><span>LESSON {String(lesson + 1).padStart(2, '0')} / {lessons.length}</span><h1>{lessonNames[lesson]}</h1></div>

      </div>
      <div className="lesson-progress" role="progressbar" aria-label="Lesson progress" aria-valuenow={Math.round(snapshot.progress * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${snapshot.progress * 100}%` }} /></div>
      <div className="passage-label"><span>TEXT TO TYPE</span><span>{Math.round(snapshot.progress * 100)}% complete</span></div>
      <div ref={passageViewport} className="classic-passage" role="region" tabIndex={0} aria-label="Lesson text" lang={layout === "Pa'O" ? "blk" : "en"}>
        {units.slice(sentenceStart, sentenceEnd).map((unit, offset) => {
          const i = sentenceStart + offset;
          return <span key={i} ref={i === guide?.position ? current : undefined}
            className={snapshot.typedUnits[i]?.correct ? 'typed-correct' : i === guide?.position ? 'current-unit' : ''}>{/[\n\r]/u.test(unit) ? '↵' : unit}</span>;
        })}
      </div>
      <div className={`classic-input-shell${focused ? " is-focused" : ""}`} onClick={() => { if (started && !complete) focus(); }}>
        <div className="classic-typed-line" ref={typedLine} aria-hidden="true" lang={layout === "Pa'O" ? "blk" : "en"}>
          {visibleTypedUnits.map((unit, i) => <span className={unit.correct ? '' : 'typed-error'} key={lastLineStart + i}>{unit.text}</span>)}
          {!snapshot.typedUnits.length && !focused && !compositionDraft && <span className="input-placeholder">{started ? "Type here. Follow the highlighted key…" : "Press Start lesson below to begin."}</span>}
          {compositionDraft}<span className={started && !complete ? 'typing-caret' : ''} />
        </div>
        <textarea ref={input} aria-label="Type the lesson here" disabled={!started || complete}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off"
          onKeyDownCapture={event => {
            if (event.nativeEvent.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey) return;
            // Latin keyboards use the displayed layout; native Myanmar input uses the IME adapter.
            const legend = paoKeyLegends[event.code];
            if (layout === "Pa'O" && legend && event.key.length === 1 && /^[\x20-\x7e]$/.test(event.key)) {
              event.preventDefault();
              session.insertText(event.shiftKey ? legend.shifted : legend.unshifted);
            }
          }} />
      </div>

      <div className="classic-bottom">
        <button className="tutor-start" onClick={start} aria-keyshortcuts={started ? 'Control+Shift+Enter Meta+Shift+Enter' : 'Control+Enter Meta+Enter'}>{started ? <RotateCcw size={15} /> : <Play size={15} />}{started ? 'Restart' : 'Start lesson'}</button>
        <div className="classic-metrics">
          <div><span>Speed</span><strong>{Math.round(stats.metrics.correctWpm)} <b>WPM</b></strong></div>
          <div><span>Errors</span><strong>{Math.round(stats.counts.totalInsertionAttempts ? 100 - stats.metrics.attemptAccuracy : 0)}<b>%</b></strong></div>
        </div>
      </div>
      <p className="practice-feedback" role="status">{complete ? 'Lesson complete.' : started && guide?.mistake ? 'Press Backspace to correct the mistake.' : started && !focused ? 'Click the typing area to continue.' : ''}</p>
      <details className="shortcut-help">
        <summary>Keyboard shortcuts</summary>
        <dl>
          <div><dt>Start or focus</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>Enter</kbd></dd></div>
          <div><dt>Restart lesson</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>Shift</kbd> + <kbd>Enter</kbd></dd></div>
          <div><dt>Previous / next lesson</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>← / →</kbd></dd></div>
        </dl>
      </details>
      {complete && <div className="completion-actions"><span><Check size={18} /> {lesson === lessons.length - 1 ? 'All lessons explored. Keep practicing at your own pace.' : 'Ready for the next step?'}</span>{lesson < lessons.length - 1 && <button className="tutor-start" onClick={() => changeLesson(lesson + 1)}>Next lesson <ArrowRight size={16} /></button>}</div>}
      </section>
      <section className="keyboard-panel" aria-label="Keyboard guide"><div className="keyboard-panel-heading"><span><KeyboardIcon size={17} /> YOUR KEYBOARD GUIDE</span><span className="key-legend"><i /> Next key{nextKey ? ` · ${nextKey.shift ? 'Shift + ' : ''}${nextKey.label}` : ''}</span></div>
      <div className="mobile-next-key" aria-live="polite"><div><span>{complete ? 'Well done' : 'Next key'}</span><strong>{complete ? 'Lesson complete' : nextKey ? `${nextKey.shift ? 'Shift + ' : ''}${nextKey.label}` : 'Follow the lesson'}</strong></div><span className="mobile-key-preview" lang={layout === "Pa'O" ? "blk" : "en"}>{nextKey?.code === 'Space' ? '␣' : nextKey?.code === 'Backspace' ? '⌫' : nextKey?.text || '✓'}</span></div>
      <button type="button" className="keyboard-visibility-toggle" onClick={toggleKeyboard} aria-expanded={keyboardVisible} aria-controls="practice-keyboard"><KeyboardIcon size={16} />{keyboardVisible ? 'Hide keyboard' : 'Show keyboard'}</button>
      <div id="practice-keyboard" hidden={!keyboardVisible}>
      <div className="keyboard-scroll" aria-label={`${layout} keyboard`}><VirtualKeyboard layout={layout} nextKey={nextKey} pressedKey={pressedKey} errorKey={errorKey} /></div>
      <p className="keyboard-note">Use your keyboard to type. The blue key shows what comes next.<span>{layout === "Pa'O" ? "English keyboards work too — letters map to Pa’O automatically." : "Type the lesson using your English keyboard."}</span></p></div></section>
    </main>
    <footer className="tutor-footer"><span>Small steps. Steady progress.</span><a className="tutor-credit" href="https://github.com/kyawhla-commit/dakkhinda" target="_blank" rel="noopener noreferrer"><span>Built by</span><img src={dakkhindaLogo} alt="Dakkhinda Technologies" /></a></footer>
  </div>;
}
