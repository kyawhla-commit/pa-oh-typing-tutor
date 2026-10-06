import type { SessionResult } from "../../engine/typing";

export const LESSON_PASS_ACCURACY = 95;

/** Lesson qualification uses the original attempt score, before display rounding. */
export function qualifiesLesson(result: SessionResult): boolean {
  return result.status === "completed" && result.mode === "fixed-text"
    && result.progress === 1 && result.metrics.attemptAccuracy >= LESSON_PASS_ACCURACY;
}
