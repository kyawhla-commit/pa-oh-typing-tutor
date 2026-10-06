/** Proposed future schema ONLY. No emitter, persistence, SDK, or transport. */
export interface FutureLearningEvaluationEvent {
  readonly schemaVersion: 1;
  /** Random consented pseudonym, never derived from email/auth IDs. */
  readonly anonymousLearnerId: string;
  readonly sessionSequence: number;
  readonly sessionMode: "fixed-text" | "timed" | "word-count";
  readonly sourceType:
    | "lesson"
    | "corpus"
    | "quote"
    | "custom"
    | "adaptive"
    | "unknown";
  /** Approved public catalog/version reference only; omit arbitrary custom IDs. */
  readonly publicSourceRef?: string;
  readonly metrics: {
    readonly correctWpm: number;
    readonly attemptAccuracy: number;
    readonly attempts: number;
    readonly incorrectAttempts: number;
    readonly correctedErrors: number;
    readonly remainingErrors: number;
    readonly activeMsBucket: number;
  };
  readonly learning?: {
    readonly recommendationTypes: readonly string[];
    /** Public catalog keys or study-local opaque mappings; no free-text target values. */
    readonly weaknessRefs: readonly string[];
    readonly evidence: readonly {
      readonly weaknessRef: string;
      readonly opportunities: number;
      readonly errors: number;
      readonly distinctSessions: number;
    }[];
    readonly actionSelected: string | null;
    readonly progressionLevels: readonly (0 | 1 | 2)[];
    readonly masteryTransitions: readonly {
      readonly weaknessRef: string;
      readonly before: string;
      readonly after: string;
      readonly path: "natural" | "controlled" | null;
    }[];
  };
}
