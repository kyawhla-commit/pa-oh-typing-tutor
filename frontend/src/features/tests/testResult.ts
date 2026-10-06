import type { SessionResult } from "../../engine/typing";

export function testResultSummary(snapshot: SessionResult, difficulty: string) {
  const label = snapshot.mode === "word-count" ? `${snapshot.wordLimit} words · ${difficulty}`
    : `${snapshot.durationMs === 300_000 ? "5 min" : `${snapshot.durationMs! / 1000} sec`} · ${difficulty}`;
  return {
    mode: "test" as const, label,
    wpm: Math.round(snapshot.metrics.correctWpm), accuracy: Math.round(snapshot.metrics.attemptAccuracy),
    characters: snapshot.counts.currentTypedUnits, errors: snapshot.counts.incorrectInsertionAttempts,
    // Existing Supabase duration_seconds is integer. WPM already used exact ms.
    durationSeconds: Math.round(snapshot.activeElapsedMs / 1000),
  };
}
