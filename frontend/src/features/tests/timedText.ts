import type { SessionSnapshot, TypingEngineConfig } from "../../engine/typing";
import { createSourceSessionConfig, prepareTextSource, type PreparedTextSource } from "../typing/textSources";

export const DURATIONS = [15, 30, 60, 300] as const;
export const WORD_LIMITS = [10, 25, 50, 100] as const;
export type TestSelection = { mode: "timed"; duration: number; difficulty: Difficulty } | { mode: "word-count"; wordLimit: number; difficulty: Difficulty };

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

const TEXTS: Record<Difficulty, string> = {
  Easy: "The best way to build a new skill is to practice a little every day. Start with a comfortable pace, keep your hands relaxed, and focus on each word. Small steps become steady progress when you show up regularly. Take your time, find a rhythm, and let accuracy lead the way. A calm and consistent approach helps every learner improve. Keep going, one careful sentence at a time.",
  Medium: "Good typing is less about rushing and more about finding a reliable rhythm. Keep your eyes on the text, let your fingers return to the home row, and correct mistakes as you notice them. A few focused minutes each day can make writing feel more natural. Set a goal that challenges you without adding pressure, then look back at your progress after each session.",
  Hard: "Reliable communication depends on precision, context, and thoughtful revision. A well-structured paragraph guides readers through complex ideas without sacrificing clarity; each deliberate sentence connects evidence to a meaningful conclusion. During focused practice, maintain an even cadence, observe punctuation carefully, and recover from occasional errors without losing concentration. Progress is measurable, but durable skill comes from consistency, patience, and attention to detail.",
};


// Selection and deterministic extension stay in the feature. Cache immutable sources
// so rerenders do not repeat segmentation or allocate another prepared corpus.
const sources = new Map<string, PreparedTextSource>();
function testSource(difficulty: Difficulty, wordLimit?: number) {
  const key = `${difficulty}:${wordLimit ?? "timed"}`;
  const cached = sources.get(key);
  if (cached) return cached;
  const base = `${TEXTS[difficulty]} `;
  let prepared = prepareTextSource({ type: "corpus", id: `test-${difficulty.toLowerCase()}`, version: "1",
    language: "en", difficulty, title: `${difficulty} test corpus`, text: base });
  if (wordLimit !== undefined && wordLimit > prepared.preparedText.words.length) {
    prepared = prepareTextSource({ ...prepared.source, text: base.repeat(Math.ceil(wordLimit / prepared.preparedText.words.length)) });
  }
  sources.set(key, prepared);
  return prepared;
}

export function prepareTimedTest(difficulty: Difficulty, durationSeconds: number): TypingEngineConfig {
  return createSourceSessionConfig(testSource(difficulty), { mode: "timed", durationMs: durationSeconds * 1000, textPolicy: "repeat-corpus" });
}

export function prepareWordTest(difficulty: Difficulty, wordLimit: number): TypingEngineConfig {
  return createSourceSessionConfig(testSource(difficulty, wordLimit), { mode: "word-count", wordLimit });
}

export function prepareTest(selection: TestSelection): TypingEngineConfig {
  return selection.mode === "timed" ? prepareTimedTest(selection.difficulty, selection.duration)
    : prepareWordTest(selection.difficulty, selection.wordLimit);
}

/** Stable global positions; finite sessions never expose beyond the required end. */
export function timedPassageWindow(snapshot: SessionSnapshot) {
  const start = Math.floor(snapshot.currentPosition / 120) * 120;
  const length = snapshot.mode === "timed" ? 240 : Math.max(0, Math.min(240, snapshot.targetUnitCount - start));
  return Array.from({ length }, (_, offset) => {
    const position = start + offset;
    return { position, text: snapshot.target.units[position % snapshot.target.units.length] };
  });
}
