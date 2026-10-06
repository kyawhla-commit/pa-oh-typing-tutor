import type { SessionResult, TextSourceIdentity, TypingMode } from "../../engine/typing";

export interface ExposureStat {
  readonly target: readonly string[];
  readonly opportunities: number;
  /** Distinct observed source occurrences with >=1 historical mistake. */
  readonly errorOccurrences: number;
  readonly incorrectAttempts: number;
  readonly correctedErrors: number;
  readonly remainingErrors: number;
}
export interface SubstitutionStat {
  readonly expected: string;
  readonly actual: string;
  readonly count: number;
  readonly corrected: number;
  readonly remaining: number;
}
export interface Aggregates {
  readonly graphemes: readonly ExposureStat[];
  readonly substitutions: readonly SubstitutionStat[];
  readonly bigrams: readonly ExposureStat[];
  readonly tokens: readonly ExposureStat[];
}
export interface SessionSummary {
  readonly sessionId: string;
  readonly sourceIdentity: TextSourceIdentity | null;
  readonly mode: TypingMode;
  readonly completionReason: SessionResult["completionReason"];
  /** Caller-owned wall timestamp for display; recent ordering is ingestion order. */
  readonly recordedAt: number;
  readonly activeElapsedMs: number;
  readonly rawWpm: number;
  readonly correctWpm: number;
  readonly attemptAccuracy: number;
  readonly characterAccuracy: number;
  readonly totalAttempts: number;
  readonly incorrectAttempts: number;
  readonly correctedErrors: number;
  readonly remainingErrors: number;
  readonly backspaces: number;
}
export interface MistakeEvidence {
  readonly expected: string;
  readonly actual: string;
  readonly position: number;
  readonly attempt: number;
  readonly atMs: number;
  readonly correctedAtMs: number | null;
}
export interface LearningEvidence {
  readonly summary: SessionSummary;
  readonly aggregates: Aggregates;
  /** Bounded transient examples; never included in persisted profile. */
  readonly mistakes: readonly MistakeEvidence[];
  readonly exposure: "observed-position-lower-bound";
}
export interface RecentSession extends SessionSummary { readonly aggregates: Aggregates }
export interface LearnerTypingProfile {
  readonly version: 1;
  readonly sessionCount: number;
  readonly totalAttempts: number;
  readonly incorrectAttempts: number;
  readonly correctedErrors: number;
  readonly remainingErrors: number;
  readonly backspaces: number;
  readonly lifetime: Aggregates;
  readonly recent: readonly RecentSession[];
  readonly processedSessionIds: readonly string[];
}
export type RecommendationType = "WEAK_GRAPHEME" | "SUBSTITUTION_CONFUSION" | "WEAK_BIGRAM" | "DIFFICULT_WORD" | "ACCURACY_FOCUS" | "SPEED_BUILDING" | "GENERAL_PRACTICE";
export interface RecommendationEvidence {
  readonly window: "recent" | "lifetime" | "sessions";
  readonly lifetime: ExposureStat | null;
  readonly recent: ExposureStat | null;
  readonly substitution: { readonly lifetimeCount: number; readonly recentCount: number } | null;
  readonly sessions: number;
  readonly attempts: number;
  readonly accuracy: readonly number[];
  readonly speed: readonly number[];
  readonly distinctErrorGraphemes: number;
}
export interface PracticeRecommendation {
  readonly id: string;
  readonly type: RecommendationType;
  readonly priority: number;
  readonly evidenceStrength: "low" | "medium" | "high";
  readonly reasonCode: "repeated-errors" | "repeated-confusion" | "broad-low-accuracy" | "consistent-accuracy" | "more-evidence-needed";
  readonly targets: readonly string[];
  readonly evidence: RecommendationEvidence;
}
export interface AdaptivePracticeSpec {
  readonly recommendationId: string;
  readonly focusType: "grapheme" | "substitution" | "bigram" | "token" | "accuracy" | "speed" | "general";
  readonly focusItems: readonly string[];
  readonly desiredLength: { readonly unit: "graphemes"; readonly value: number };
  readonly difficulty: "steady" | "gradual-speed";
  readonly mode: "fixed-text";
  readonly completionPolicy: "require-correct-target";
}
