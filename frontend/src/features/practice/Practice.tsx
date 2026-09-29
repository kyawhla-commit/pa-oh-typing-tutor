import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TypingBox, { createTypingState, processKeyPress, type TypingState } from "../../components/TypingBox";
import VirtualKeyboard from "../../components/VirtualKeyboard";
import { useLearningData } from "../../data/LearningContext";
import { lessonContent } from "../lessons/lessonContent";

const modes = ["Words", "Sentences", "Paragraph", "Code"] as const;
type PracticeMode = (typeof modes)[number];

const practiceTexts: Record<PracticeMode, string> = {
  Words: "the quick brown fox jumps over the lazy dog and runs into the forest",
  Sentences: "The quick brown fox jumps over the lazy dog. A journey of a thousand miles begins with a single step.",
  Paragraph: "Typing is a fundamental skill in the digital age. Regular practice helps improve speed and accuracy over time. Focus on rhythm and precision rather than just raw speed.",
  Code: 'const greet = (name) => { return `Hello, ${name}!`; }; console.log(greet("world"));',
};

export default function Practice() {
  const [mode, setMode] = useState<PracticeMode>("Words");
  const [searchParams] = useSearchParams();
  const lessonId = Number(searchParams.get("lesson")) || null;
  const text = lessonId ? lessonContent[lessonId] || practiceTexts.Words : practiceTexts[mode];
  const [session, setSession] = useState<TypingState>(() => createTypingState(text));
  const [elapsed, setElapsed] = useState(0);
  const [pressedKey, setPressedKey] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const savedRef = useRef(false);
  const { addResult, completeLesson } = useLearningData();

  useEffect(() => {
    setSession(createTypingState(text));
    setElapsed(0);
    savedRef.current = false;
  }, [text]);

  useEffect(() => {
    if (!session.startTime || session.isComplete) return;
    const interval = window.setInterval(() => setElapsed(Date.now() - session.startTime!), 250);
    return () => window.clearInterval(interval);
  }, [session.startTime, session.isComplete]);

  useEffect(() => {
    if (!session.isComplete || savedRef.current) return;
    const durationSeconds = Math.max(1, Math.round(((session.endTime || Date.now()) - (session.startTime || Date.now())) / 1000));
    addResult({
      mode: "practice",
      wpm: session.wpm,
      accuracy: session.accuracy,
      characters: session.typed.length,
      errors: session.errors,
      durationSeconds,
    });
    if (lessonId) completeLesson(lessonId);
    savedRef.current = true;
  }, [session, lessonId, addResult, completeLesson]);

  const handleType = (key: string) => {
    if (key !== "Backspace") {
      const expected = session.text[session.typed.length];
      setPressedKey(key);
      setErrorKey(key === expected ? "" : key);
      window.setTimeout(() => { setPressedKey(""); setErrorKey(""); }, 140);
    }
    setSession((current) => processKeyPress(current, key));
  };

  const reset = () => {
    setSession(createTypingState(text));
    setElapsed(0);
    savedRef.current = false;
  };

  const elapsedNow = session.isComplete && session.endTime && session.startTime
    ? session.endTime - session.startTime
    : session.startTime ? Math.max(elapsed, Date.now() - session.startTime) : 0;
  const minutes = Math.floor(elapsedNow / 60000);
  const seconds = Math.floor((elapsedNow % 60000) / 1000);
  const time = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const progress = Math.round((session.typed.length / text.length) * 100);

  return (
    <div className="max-w-4xl p-6 lg:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-[#0F172A]">{lessonId ? `Lesson ${lessonId} practice` : "Practice"}</h1><p className="text-sm text-[#64748B]">{lessonId ? "Finish this typing exercise to save your result and complete the lesson." : "Focus, type, improve. Results are added to your shared progress."}</p></div>
        {!lessonId && <div className="flex flex-wrap items-center gap-1 rounded-xl border border-[#E2E8F0] bg-white p-1">{modes.map((item) => <button key={item} onClick={() => setMode(item)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${mode === item ? "bg-[#2563EB] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>{item}</button>)}</div>}
      </header>

      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_150px]">
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between"><span className="text-xs font-medium uppercase tracking-wide text-[#64748B]">Type the text below</span><span className="font-mono text-lg font-bold text-[#0F172A]">{time}</span></div>
          <TypingBox state={session} onType={handleType} onBackspace={() => handleType("Backspace")} pressedKey={pressedKey} errorKey={errorKey} fontSize="md" />
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#64748B]"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#E2E8F0]"><div className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${progress}%` }} /></div>{session.typed.length}/{text.length} chars{savedRef.current && <span className="font-semibold text-[#16A34A]">· Session saved</span>}</div>
            <button onClick={reset} className="text-xs font-medium text-[#64748B] transition-colors hover:text-[#2563EB]">Reset</button>
          </div>
        </section>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {[
            { label: "WPM", value: session.wpm, color: "text-[#2563EB]" },
            { label: "Accuracy", value: `${session.accuracy}%`, color: "text-[#16A34A]" },
            { label: "Errors", value: session.errors, color: session.errors ? "text-[#DC2626]" : "text-[#94A3B8]" },
            { label: "Chars", value: session.typed.length, color: "text-[#64748B]" },
          ].map(({ label, value, color }) => <div key={label} className="rounded-xl border border-[#E2E8F0] bg-white p-3 text-center sm:p-4"><div className={`text-xl font-bold sm:text-2xl ${color}`}>{value}</div><div className="mt-0.5 text-xs text-[#94A3B8]">{label}</div></div>)}
        </section>
      </div>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5"><h2 className="mb-3 text-xs font-medium text-[#64748B]">Virtual keyboard</h2><VirtualKeyboard pressedKey={pressedKey} errorKey={errorKey} /></section>
    </div>
  );
}
