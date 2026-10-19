import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
  return <Link className="tutor-brand" to="/" aria-label="Pa’O Typing Tutor home">PA’O<span>TYPING TUTOR</span></Link>;
}
function Keyboard({ active = 'KeyR', shift = false }: { active?: string; shift?: boolean }) {
  return <div className="classic-keyboard" aria-label="Pa’O keyboard. The orange key is the next key to type.">
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
    <header className="tutor-header"><Brand /></header>
    <main className="tutor-home">
      <p className="home-eyebrow">PA’O LANGUAGE · TYPING PRACTICE</p>
      <h1>A little practice.<br /><span>A better rhythm.</span></h1>
      <p className="home-description">Learn the Pa’O keyboard, one lesson at a time.</p>
      <Link to="/practice" className="tutor-start home-start">START TYPING <span aria-hidden="true">→</span></Link>
      <div className="home-keyboard" aria-hidden="true"><Keyboard /></div>
    </main>
    <footer className="tutor-footer">PA’O TYPING TUTOR</footer>
  </div>;
}
export function SimplePractice() {
  const [lesson, setLesson] = useState(0);
  const [started, setStarted] = useState(false);
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
    current.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
    <header className="tutor-header"><Brand /></header>
    <Link className="tutor-close" to="/" aria-label="Close practice and return home">×</Link>
    <main className="classic-practice" aria-label="Typing practice">
      <div className="lesson-toolbar">
        <button onClick={() => changeLesson(lesson - 1)} disabled={lesson === 0} aria-label="Previous lesson">≪</button>
        <select aria-label="Select lesson" value={lesson} onChange={event => changeLesson(Number(event.target.value))}>
          {lessons.map((_, i) => <option value={i} key={i}>Lesson {i + 1}</option>)}
        </select>
        <button onClick={() => changeLesson(lesson + 1)} disabled={lesson === lessons.length - 1} aria-label="Next lesson">≫</button>
        <button className="tutor-start" onClick={start}>{started ? 'RESTART' : 'START'}</button>
      </div>
      <div className="classic-passage" aria-label="Lesson text" lang="blk">
        {snapshot.target.units.map((unit, i) => <span key={i} ref={i === guide?.position ? current : undefined}
          className={snapshot.typedUnits[i]?.correct ? 'typed-correct' : i === guide?.position ? 'current-unit' : ''}>{unit}</span>)}
      </div>
      <div className="classic-input-shell" onClick={() => { if (started && !complete) focus(); }}>
        <div className="classic-typed-line" ref={typedLine} aria-hidden="true" lang="blk">
          {snapshot.typedUnits.map((unit, i) => <span className={unit.correct ? '' : 'typed-error'} key={i}>{unit.text}</span>)}
          {compositionDraft}<span className={started && !complete ? 'typing-caret' : ''} />
        </div>
        <textarea ref={input} aria-label="Type the lesson here" disabled={!started || complete}
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
      <div className="keyboard-scroll"><Keyboard active={nextKey?.code ?? ''} shift={nextKey?.shift} /></div>
      <div className="classic-bottom">
        <div className="classic-metrics">
          <div><span>YOUR TYPING SPEED</span><strong>{Math.round(stats.metrics.correctWpm).toString().padStart(3, '0')} <b>WPM</b></strong></div>
          <div><span>ERROR</span><strong>{Math.round(stats.counts.totalInsertionAttempts ? 100 - stats.metrics.attemptAccuracy : 0).toString().padStart(2, '0')} <b>%</b></strong></div>
        </div>
        <p className="classic-status" role="status">{complete ? 'Lesson complete. Choose the next lesson or restart.' : !started ? 'Press START to begin.' : guide?.mistake ? 'Press Backspace to correct the highlighted mistake.' : ''}</p>
      </div>
    </main>
  </div>;
}
