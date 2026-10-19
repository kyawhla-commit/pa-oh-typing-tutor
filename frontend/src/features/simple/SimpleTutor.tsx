import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import TutorThemeToggle from './TutorThemeToggle';
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Keyboard as KeyboardIcon, RotateCcw, Play, Check, Leaf } from 'lucide-react';
import { paoKeyLegends, qwertyKeyLegends } from '../../components/keyboardLayouts';
import { useTypingFeedback, useTypingSession, useTypingStats } from '../typing/useTypingSession';
import { useTypingInput } from '../typing/useTypingInput';
import { getTypingGuide, nextGuideKey } from '../typing/typingGuide';

const lessons = [
  'မမ တတ ကက အအ ပပ မက ကမ တက ကတ မတ တမ ပက ကပ မမ တတ ကက',
  'ဆ တ န မ အ ပ က င သ စ ဟ ဆတ နမ အပ ကင သစ ဟဟ',
  'ဖ ထ ခ လ ဘ ည ဖထ ခလ ဘည ဖဖ ထထ ခခ လလ ဘဘ ညည',
  'ကာ မာ ပါ တာ နာ သာ ကိ မိ ပိ တိ ကီ မီ ပီ တီ',
  'ကု ကူ မု မူ ပု ပူ တု တူ ကေ မေ ပေ တေ ကဲ မဲ ပဲ တဲ',
  'ကꩻ မꩻ ပꩻ တꩻ ကႏ မႏ ပႏ တႏ ကာꩻ မာꩻ ပါꩻ တာꩻ',
  '၁ ၂ ၃ ၄ ၅ ၆ ၇ ၈ ၉ ၀ ၁၂ ၃၄ ၅၆ ၇၈ ၉၀',
  'ဒ ဒꩻ ဒါဒါႏ ဖူးပေႏဆား ဟိဟိꩻ ဟီဟီး ငတသီး',
];
const lessonNames = ['First letters', 'Upper row', 'Lower row', 'Vowel foundations', 'Vowel combinations', 'Pa’O tone marks', 'Numbers', 'Words & rhythm'];

type Key = { code: string; label?: string; width?: number };
const keys = (codes: string): Key[] => codes.split(' ').map(code => ({ code }));
const rows: Key[][] = [
  [...keys('Backquote Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0 Minus Equal'), { code: 'Backspace', label: 'BACK', width: 1.8 }],
  [{ code: 'Tab', label: 'TAB', width: 1.6 }, ...keys('KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP BracketLeft BracketRight Backslash')],
  [{ code: 'CapsLock', label: 'CAPS LOCK', width: 1.9 }, ...keys('KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL Semicolon Quote'), { code: 'Enter', label: 'ENTER', width: 1.9 }],
  [{ code: 'ShiftLeft', label: 'SHIFT', width: 2.3 }, ...keys('KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma Period Slash'), { code: 'ShiftRight', label: 'SHIFT', width: 2.5 }],
  [{ code: 'ControlLeft', label: 'CTRL', width: 1.3 }, { code: 'AltLeft', label: 'ALT', width: 1.3 }, { code: 'Space', label: ' ', width: 10.1 }, { code: 'ControlRight', label: 'CTRL', width: 1.3 }, { code: 'AltRight', label: 'ALT', width: 1.3 }],
];
function Brand() {
  return <Link className="tutor-brand" to="/" aria-label="Pa’O Typing Tutor home"><span className="brand-icon"><KeyboardIcon size={22} /></span><span>pa’o<span className="brand-caption">typing tutor</span></span></Link>;
}
function Keyboard({ active = 'KeyR', shift = false }: { active?: string; shift?: boolean }) {
  return <div className="classic-keyboard" aria-label="Pa’O keyboard. The blue key is the next key to type.">
    {rows.map((row, i) => <div className="classic-key-row" key={i}>
      {row.map(({ code, label, width = 1 }) => {
        const legend = paoKeyLegends[code];
        const english = qwertyKeyLegends[code];
        const highlighted = code === active || (shift && code.startsWith('Shift'));
        return <div key={code} style={{ flex: `${width} 1 0%` }} className={`classic-key${highlighted ? ' is-next' : ''}`}>
          {legend ? <><span className="key-pao"><span>{legend.shifted}</span><span>{legend.unshifted}</span></span><span className="key-latin">{code.startsWith('Key') ? code.slice(3) : english?.unshifted}</span></> : <span className="key-special">{label}</span>}
        </div>;
      })}
    </div>)}
  </div>;
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
        <div className="hero-art" aria-hidden="true">
          <div className="art-caption"><span>SMALL STEPS. LASTING HABITS.</span><Leaf size={20} /></div>
          <div className="floating-keys"><div className="hero-key"><span>ပ</span><small>Y</small></div><div className="hero-key"><span>အ</span><small>T</small></div><div className="hero-key"><span>မ</span><small>R</small></div></div>
          <div className="art-bottom"><span className="art-line" /><p>A language worth<br /><strong>putting into words.</strong></p><span className="art-number">01 — 08</span></div>
        </div>
      </section>
      <section className="home-overview" aria-label="How practice works">
        <div><span className="step-number">01</span><h2>Find your starting point.</h2><p>Eight focused lessons, from first letters to a comfortable typing rhythm.</p></div>
        <div><span className="step-number">02</span><h2>Follow the next key.</h2><p>A clear keyboard guide helps your fingers find their way, at your own pace.</p></div>
        <div><span className="step-number">03</span><h2>Let accuracy lead.</h2><p>See your speed and errors as you type. Take your time. Try again.</p></div>
      </section>
    </main>
    <footer className="tutor-footer"><span>Made for the words that matter.</span><span>PA’O TYPING TUTOR</span></footer>
  </div>;
}
export function SimplePractice() {
  const [lesson, setLesson] = useState(0);
  const [started, setStarted] = useState(false);
  const [focused, setFocused] = useState(false);
  const session = useTypingSession({ targetText: lessons[0] });
  const { snapshot, generation, compositionDraft } = useTypingFeedback(session);
  const stats = useTypingStats(session);
  const { input, focus } = useTypingInput(session, generation);
  const guide = getTypingGuide(snapshot);
  const nextKey = nextGuideKey(snapshot, "Pa'O");
  const current = useRef<HTMLSpanElement>(null);
  const typedLine = useRef<HTMLDivElement>(null);
  const complete = snapshot.status === 'completed';
  useLayoutEffect(() => {
    const active = current.current;
    const passage = active?.parentElement;
    if (active && passage) {
      const left = active.getBoundingClientRect().left - passage.getBoundingClientRect().left;
      if (left < 0 || left + active.offsetWidth > passage.clientWidth) passage.scrollLeft += left - passage.clientWidth / 2;
    }
    if (typedLine.current) typedLine.current.scrollLeft = typedLine.current.scrollWidth;
  }, [snapshot.typedUnits, compositionDraft]);
  const changeLesson = (index: number) => {
    setLesson(index);
    setStarted(false);
    session.restart({ targetText: lessons[index] });
  };
  const start = () => {
    session.restart({ targetText: lessons[lesson] });
    setStarted(true);
  };
  return <div className="simple-tutor practice-page">
    <header className="tutor-header"><Brand /><div className="header-actions"><TutorThemeToggle /><Link className="header-link" to="/"><ArrowLeft size={16} /> Back to home</Link></div></header>
    <main className="classic-practice" aria-label="Typing practice">
      <div className="practice-heading"><div><p className="home-eyebrow">A LITTLE BETTER, ONE KEY AT A TIME</p><h1>Find your rhythm.</h1></div><span className="practice-badge"><span /> Pa’O keyboard</span></div>
      <section className="practice-card">
      <div className="practice-card-top"><div className="lesson-title"><span>LESSON {String(lesson + 1).padStart(2, '0')} / 08</span><h2>{lessonNames[lesson]}</h2></div>
      <div className="lesson-toolbar">
        <button onClick={() => changeLesson(lesson - 1)} disabled={lesson === 0} aria-label="Previous lesson"><ChevronLeft size={18} /></button>
        <select aria-label="Select lesson" value={lesson} onChange={event => changeLesson(Number(event.target.value))}>
          {lessons.map((_, i) => <option value={i} key={i}>Lesson {i + 1}</option>)}
        </select>
        <button onClick={() => changeLesson(lesson + 1)} disabled={lesson === lessons.length - 1} aria-label="Next lesson"><ChevronRight size={18} /></button>
        <button className="tutor-start" onClick={start}>{started ? <RotateCcw size={15} /> : <Play size={15} />}{started ? 'Restart' : 'Start lesson'}</button>
      </div>
      </div>
      <div className="lesson-progress" role="progressbar" aria-label="Lesson progress" aria-valuenow={Math.round(snapshot.progress * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${snapshot.progress * 100}%` }} /></div>
      <div className="passage-label"><span>TEXT TO TYPE</span><span>{Math.round(snapshot.progress * 100)}% complete</span></div>
      <div className="classic-passage" aria-label="Lesson text" lang="blk">
        {snapshot.target.units.map((unit, i) => <span key={i} ref={i === guide?.position ? current : undefined}
          className={snapshot.typedUnits[i]?.correct ? 'typed-correct' : i === guide?.position ? 'current-unit' : ''}>{unit}</span>)}
      </div>
      <div className={`classic-input-shell${focused ? " is-focused" : ""}`} onClick={() => { if (started && !complete) focus(); }}>
        <div className="classic-typed-line" ref={typedLine} aria-hidden="true" lang="blk">
          {snapshot.typedUnits.map((unit, i) => <span className={unit.correct ? '' : 'typed-error'} key={i}>{unit.text}</span>)}
          {!snapshot.typedUnits.length && !compositionDraft && <span className="input-placeholder">{started ? "Type here. Follow the highlighted key…" : "Ready when you are. Start your lesson above."}</span>}
          {compositionDraft}<span className={started && !complete ? 'typing-caret' : ''} />
        </div>
        <textarea ref={input} aria-label="Type the lesson here" disabled={!started || complete}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off"
          onKeyDownCapture={event => {
            if (event.nativeEvent.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey) return;
            // Latin keyboards use the displayed layout; native Myanmar input uses the IME adapter.
            const legend = paoKeyLegends[event.code];
            if (legend && event.key.length === 1 && /^[\x20-\x7e]$/.test(event.key)) {
              event.preventDefault();
              session.insertText(event.shiftKey ? legend.shifted : legend.unshifted);
            }
          }} />
      </div>

      <div className="classic-bottom">
        <div className="classic-metrics">
          <div><span>TYPING SPEED</span><strong>{Math.round(stats.metrics.correctWpm).toString().padStart(3, '0')} <b>WPM</b></strong></div>
          <div><span>ERROR RATE</span><strong>{Math.round(stats.counts.totalInsertionAttempts ? 100 - stats.metrics.attemptAccuracy : 0).toString().padStart(2, '0')} <b>%</b></strong></div>
        </div>
        <p className="classic-status" role="status">{complete ? 'Nicely done. You’ve completed this lesson.' : !started ? 'Focus on accuracy. Speed will follow.' : guide?.mistake ? 'Press Backspace to correct the highlighted mistake.' : focused ? 'Keep going. One key at a time.' : 'Click the input area to continue.'}</p>
      </div>
      {complete && <div className="completion-actions"><span><Check size={18} /> {lesson === lessons.length - 1 ? 'All eight lessons explored. Keep practicing at your own pace.' : 'Ready for the next step?'}</span>{lesson < lessons.length - 1 && <button className="tutor-start" onClick={() => changeLesson(lesson + 1)}>Next lesson <ArrowRight size={16} /></button>}</div>}
      </section>
      <section className="keyboard-panel" aria-label="Keyboard guide"><div className="keyboard-panel-heading"><span><KeyboardIcon size={17} /> YOUR KEYBOARD GUIDE</span><span className="key-legend"><i /> Next key{nextKey ? ` · ${nextKey.shift ? 'Shift + ' : ''}${nextKey.label}` : ''}</span></div>
      <div className="keyboard-scroll" tabIndex={0} aria-label="Pa’O keyboard, scroll horizontally on small screens"><Keyboard active={nextKey?.code ?? ''} shift={nextKey?.shift} /></div>
      <p className="keyboard-note">Use your keyboard to type. The blue key shows what comes next.<span>English keyboards work too — letters map to Pa’O automatically.</span></p></section>
    </main>
    <footer className="tutor-footer"><span>Small steps. Steady progress.</span><span>PA’O TYPING TUTOR</span></footer>
  </div>;
}
