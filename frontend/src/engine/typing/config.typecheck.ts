import type { TypingEngineConfig } from "./index";
// Compile-time contract checks; assertions are never run by the product.
const fixed: TypingEngineConfig = { mode: "fixed-text", targetText: "a" };
const timed: TypingEngineConfig = { mode: "timed", targetText: "a", durationMs: 100, textPolicy: "repeat-corpus" };
const words: TypingEngineConfig = { mode: "word-count", targetText: "a", wordLimit: 1 };
// @ts-expect-error timed sessions cannot configure wordLimit
const invalidTimed: TypingEngineConfig = { ...timed, wordLimit: 1 };
// @ts-expect-error word sessions cannot configure durationMs
const invalidWords: TypingEngineConfig = { ...words, durationMs: 1 };
// @ts-expect-error fixed sessions cannot configure wordLimit
const invalidFixed: TypingEngineConfig = { ...fixed, wordLimit: 1 };
// @ts-expect-error word sessions require wordLimit
const missingLimit: TypingEngineConfig = { mode: "word-count", targetText: "a" };
void [invalidTimed, invalidWords, invalidFixed, missingLimit];
