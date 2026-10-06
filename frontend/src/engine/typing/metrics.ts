import type { AttemptCounts, TypingMetrics } from "./types";

function wpm(units: number, activeElapsedMs: number): number {
  if (activeElapsedMs <= 0 || units === 0) return 0;
  // Algebraically (units / 5) / (activeElapsedMs / 60_000), without underflowing minutes.
  const value = units * 12_000 / activeElapsedMs;
  // Preserve finite results even for synthetic subnormal durations.
  return Number.isFinite(value) ? value : Number.MAX_VALUE;
}

export function calculateMetrics(counts: AttemptCounts, activeElapsedMs: number): TypingMetrics {
  return Object.freeze({
    rawWpm: wpm(counts.totalInsertionAttempts, activeElapsedMs),
    correctWpm: wpm(counts.currentCorrectUnits, activeElapsedMs),
    attemptAccuracy: counts.totalInsertionAttempts === 0
      ? 100 : counts.correctInsertionAttempts / counts.totalInsertionAttempts * 100,
    characterAccuracy: counts.currentTypedUnits === 0
      ? 100 : counts.currentCorrectUnits / counts.currentTypedUnits * 100,
  });
}
