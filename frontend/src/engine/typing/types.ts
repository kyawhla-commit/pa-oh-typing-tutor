export const SCORING_VERSION = "typing-grapheme-v4" as const;

export type SessionStatus = "ready" | "running" | "paused" | "completed" | "aborted";

export type CompletionPolicy = "require-correct-target" | "target-covered";

export type TypingMode = "fixed-text" | "timed" | "word-count";

export type TypingEngineConfig = (
  | { readonly targetText: string; readonly preparedText?: never }
  | { readonly preparedText: TargetText; readonly targetText?: never }
) & { readonly sourceIdentity?: TextSourceIdentity } & TypingModeConfig;

export type TypingModeConfig = (
  | { readonly mode?: "fixed-text"; readonly completionPolicy?: CompletionPolicy; readonly durationMs?: never; readonly wordLimit?: never; readonly textPolicy?: never }
  | {
      readonly mode: "timed";
      readonly durationMs: number;
      /** Explicit feature/domain boundary: targetText is a cyclic prepared corpus. */
      readonly textPolicy: "repeat-corpus";
      readonly completionPolicy?: never;
      readonly wordLimit?: never;
    }
  | { readonly mode: "word-count"; readonly wordLimit: number; readonly durationMs?: never; readonly completionPolicy?: never; readonly textPolicy?: never }
);

/** Compact attribution only; title, difficulty and quote author stay in features. */
export interface TextSourceIdentity {
  readonly type: "lesson" | "corpus" | "quote" | "custom" | "adaptive";
  readonly id: string;
  readonly version: string;
}

export interface WordToken {
  readonly text: string;
  readonly start: number;
  /** Exclusive grapheme end, including attached punctuation. */
  readonly end: number;
}

export interface WordProgress {
  readonly targetWordCount: number;
  readonly consumedWords: number;
  readonly remainingWords: number;
  readonly progress: number;
}

/** Caller-supplied milliseconds on one nonnegative, nondecreasing clock. */
export type TypingEvent =
  | { readonly type: "INSERT_TEXT"; readonly text: string; readonly atMs: number }
  | { readonly type: "DELETE_BACKWARD"; readonly atMs: number }
  | { readonly type: "TICK"; readonly atMs: number }
  | { readonly type: "PAUSE"; readonly atMs: number }
  | { readonly type: "RESUME"; readonly atMs: number }
  | { readonly type: "ABORT"; readonly atMs: number };

export interface TargetText {
  /** Original text, with whitespace and line endings preserved. */
  readonly text: string;
  readonly units: readonly string[];
  readonly segmentation: "Intl.Segmenter/grapheme";
  readonly comparison: "NFC/case-sensitive";
  readonly expectedUnits: readonly string[];
  readonly words: readonly WordToken[];
  readonly wordTokenization: "whitespace-grapheme-runs-v1";
}

export interface TypedUnit {
  readonly text: string;
  readonly correct: boolean;
}

export interface AttemptCounts {
  readonly totalInsertionAttempts: number;
  readonly correctInsertionAttempts: number;
  readonly incorrectInsertionAttempts: number;
  readonly correctedErrors: number;
  readonly uncorrectedErrors: number;
  /** Accepted delete commands, including commands on an empty buffer. */
  readonly backspaces: number;
  readonly currentCorrectUnits: number;
  readonly currentTypedUnits: number;
}

export interface TypingMetrics {
  readonly rawWpm: number;
  readonly correctWpm: number;
  readonly attemptAccuracy: number;
  readonly characterAccuracy: number;
}

export interface SessionSnapshot {
  readonly status: SessionStatus;
  readonly mode: TypingMode;
  readonly completionPolicy: CompletionPolicy | null;
  readonly textPolicy: "finite-target" | "repeat-corpus";
  readonly durationMs: number | null;
  readonly remainingMs: number | null;
  readonly wordLimit: number | null;
  readonly wordProgress: WordProgress | null;
  readonly sourceIdentity: TextSourceIdentity | null;
  /** Finite required coverage, or one cycle's size for timed sessions. */
  readonly targetUnitCount: number;
  readonly target: TargetText;
  readonly typedUnits: readonly TypedUnit[];
  readonly currentPosition: number;
  /** Fixed: coverage. Timed: active duration. Words: consumed source word ratio. */
  readonly progress: number;
  readonly startedAtMs: number | null;
  readonly completedAtMs: number | null;
  readonly abortedAtMs: number | null;
  readonly pausedAtMs: number | null;
  readonly activeElapsedMs: number;
  readonly counts: AttemptCounts;
  readonly metrics: TypingMetrics;
  readonly scoringVersion: typeof SCORING_VERSION;
}

export interface MistakeRecord {
  readonly attempt: number;
  readonly position: number;
  readonly text: string;
  readonly atMs: number;
  readonly correctedAtMs: number | null;
}

export interface SessionResult extends SessionSnapshot {
  readonly status: "completed";
  readonly completionReason: "correct-target" | "target-covered" | "time-expired" | "word-limit-reached";
  readonly startedAtMs: number;
  readonly completedAtMs: number;
  readonly mistakes: readonly MistakeRecord[];
}

export interface DispatchOutcome {
  /** Whether this command was handled; not an assertion that time/state changed. */
  readonly accepted: boolean;
  /** New or revised graphemes scored by this command. */
  readonly insertedAttempts: number;
  readonly acceptedText: string;
  /** Unconsumed input, including overflow or input while paused/terminal. */
  readonly rejectedText: string;
}
