import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TypingBox, { createTypingState, processKeyPress, type TypingState } from "../../components/TypingBox";
import VirtualKeyboard from "../../components/VirtualKeyboard";
import { useLearningData } from "../../data/LearningContext";
import { getLessonCatalog } from "../lessons/lessonCatalog";

type PracticeMode = "words" | "sentences" | "paragraphs" | "code";

const modes: { key: PracticeMode; label: string; icon: string }[] = [
  { key: "words", label: "Words", icon: "🔤" },
  { key: "sentences", label: "Sentences", icon: "💬" },
  { key: "paragraphs", label: "Paragraph", icon: "📄" },
  { key: "code", label: "Code", icon: "💻" },
];

const practiceTexts: Record<PracticeMode, string[]> = {
  words: [
    "the quick brown fox jumps over the lazy dog and runs away into the forest",
    "programming is the art of telling another human what one wants the computer to do",
    "success is not final failure is not fatal it is the courage to continue that counts",
  ],
  sentences: [
    "The best way to predict the future is to create it. Every expert was once a beginner.",
    "Simplicity is the ultimate sophistication. Good design is obvious. Great design is transparent.",
    "Code is like humor. When you have to explain it, it is bad. Write clean self-documenting code.",
  ],
  paragraphs: [
    "In the beginning was the command line. Before the graphical user interface was democratized, people typed their instructions directly into machines. There was no mouse, no icons, no windows. Just text. The command line remains the most direct path to computational power, and those who master it gain a superpower.",
    "Touch typing is one of the most valuable skills a knowledge worker can develop. The ability to type without looking at your keyboard frees your mind to focus on what you're actually creating. Professional typists routinely exceed 80 words per minute, while the average person types around 40. The gap represents hours of productivity every single day.",
  ],
  code: [
    "function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconst result = fibonacci(10);\nconsole.log(result);",
    "const fetchUser = async (id) => {\n  const response = await fetch(`/api/users/${id}`);\n  if (!response.ok) throw new Error('Failed');\n  return response.json();\n};",
  ],
};

function pickText(mode: PracticeMode, current?: string) {
  const options = practiceTexts[mode];
  const alternatives = options.filter((text) => text !== current);
  const pool = alternatives.length ? alternatives : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function Practice() {
  const [searchParams] = useSearchParams();
  const lessonId = Number(searchParams.get("lesson")) || null;
  const [mode, setMode] = useState<PracticeMode>("words");
  const lessonText = lessonId ? getLessonCatalog().find((lesson) => lesson.id === lessonId && lesson.status === "Published")?.content : undefined;
  const [passage, setPassage] = useState(() => pickText("words"));
  const text = lessonText || passage;
  const [session, setSession] = useState<TypingState>(() => createTypingState(text));
  const [elapsed, setElapsed] = useState(0);
  const [pressedKey, setPressedKey] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(true);
  const savedRef = useRef(false);
  const { addResult, completeLesson, preferences } = useLearningData();

  useEffect(() => {
    setSession(createTypingState(text));
    setElapsed(0);
    savedRef.current = false;
  }, [text]);

  useEffect(() => {
    if (!session.startTime || session.isComplete) return;
    const interval = window.setInterval(() => setElapsed(Math.floor((Date.now() - session.startTime!) / 1000)), 250);
    return () => window.clearInterval(interval);
  }, [session.startTime, session.isComplete]);

  useEffect(() => {
    if (!session.isComplete || savedRef.current) return;
    const durationSeconds = Math.max(1, Math.round(((session.endTime || Date.now()) - (session.startTime || Date.now())) / 1000));
    addResult({
      mode: "practice",
      label: lessonId ? `Lesson ${lessonId}` : modes.find((item) => item.key === mode)?.label || "Practice",
      wpm: session.wpm,
      accuracy: session.accuracy,
      characters: session.typed.length,
      errors: session.errors,
      durationSeconds,
    });
    if (lessonId) completeLesson(lessonId);
    savedRef.current = true;
  }, [session, lessonId, mode, addResult, completeLesson]);

  const handleType = useCallback((key: string) => {
    if (key !== "Backspace") {
      setPressedKey(key);
      setErrorKey(key === session.text[session.typed.length] ? "" : key);
      window.setTimeout(() => { setPressedKey(""); setErrorKey(""); }, 140);
    }
    setSession((current) => processKeyPress(current, key));
  }, [session.text, session.typed.length]);

  const reset = useCallback((nextText = text) => {
    setSession(createTypingState(nextText));
    setElapsed(0);
    savedRef.current = false;
  }, [text]);

  const changeMode = (nextMode: PracticeMode) => {
    setMode(nextMode);
    const nextText = pickText(nextMode, mode === nextMode ? text : undefined);
    setPassage(nextText);
    reset(nextText);
  };

  const newText = () => {
    const nextText = pickText(mode, passage);
    setPassage(nextText);
    reset(nextText);
  };

  const elapsedSeconds = session.isComplete && session.endTime && session.startTime
    ? Math.floor((session.endTime - session.startTime) / 1000)
    : session.startTime ? Math.max(elapsed, Math.floor((Date.now() - session.startTime) / 1000)) : 0;

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <div className="mx-auto w-full max-w-4xl">
      <header className="mb-7 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{lessonId ? `Lesson ${lessonId} practice` : "Practice"}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{lessonId ? "Complete this exercise to save your result and finish the lesson" : "Open-ended typing without time pressure"}</p>
        </div>
        <button
          onClick={() => setShowKeyboard((visible) => !visible)}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700"
          aria-expanded={showKeyboard}
        >
          {showKeyboard ? "Hide" : "Show"} keyboard
        </button>
      </header>

      {!lessonId && (
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Practice text type">
          {modes.map(({ key, label, icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={mode === key}
              onClick={() => changeMode(key)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${mode === key ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
            >
              <span aria-hidden>{icon}</span>{label}
            </button>
          ))}
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "WPM", value: session.wpm, color: "text-blue-600" },
          { label: "Accuracy", value: `${session.accuracy}%`, color: "text-emerald-600" },
          { label: "Time", value: `${elapsedSeconds}s`, color: "text-slate-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center sm:px-5">
            <p className={`font-mono text-2xl font-semibold sm:text-3xl ${color}`}>{value}</p>
            <p className="mt-1 text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <TypingBox
        state={session}
        onType={handleType}
        onBackspace={() => handleType("Backspace")}
        pressedKey={pressedKey}
        errorKey={errorKey}
        fontSize="md"
      />

      {session.isComplete ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="mb-2 text-2xl" aria-hidden>🎉</p>
          <h2 className="mb-1 text-lg font-semibold text-emerald-800">Nice work!</h2>
          <p className="mb-4 text-sm text-emerald-700">{session.wpm} WPM · {session.accuracy}% accuracy · {session.errors} errors</p>
          <button onClick={newText} className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
            Next text →
          </button>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">Press any key to start · Backspace to correct</p>
          <button onClick={newText} className="text-sm text-slate-500 transition-colors hover:text-slate-700">↺ New text</button>
        </div>
      )}

      </div>

      {showKeyboard && (
        <div className="mx-auto mt-8 w-full max-w-[1100px]">
          <VirtualKeyboard pressedKey={pressedKey} errorKey={errorKey} layout={preferences.keyboardLayout} />
        </div>
      )}
    </div>
  );
}
