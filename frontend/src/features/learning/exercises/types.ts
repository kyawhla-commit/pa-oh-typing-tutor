import type { CompositionInput } from "../progression/types";
import type { AdaptivePracticeSpec } from "../types";
import type { TargetText, TextSourceIdentity } from "../../../engine/typing";

export type SectionKind = "focus" | "context" | "mixed";
export type ContentStrategy = "curated" | "fallback-drill";
export interface ExerciseSection {
  readonly kind: SectionKind;
  readonly text: string;
  /** Exclusive offsets in final target graphemes, excluding section separators. */
  readonly start: number;
  readonly end: number;
  readonly composition: "controlled" | "contextual" | "fluent" | "drill";
}
export interface FocusCoverage {
  readonly items: readonly string[];
  readonly occurrences: number;
  readonly contexts: readonly string[];
  readonly sections: readonly number[];
}
export interface ExerciseCoverage {
  readonly totalGraphemes: number;
  readonly tokenCount: number;
  readonly distinctTokens: number;
  readonly focus: readonly FocusCoverage[];
  readonly sectionDensities: readonly number[];
  readonly mixedOrdinaryTokens: number;
  readonly maxTokenShare: number;
  readonly longestIdenticalTokenRun: number;
  readonly longestIsolatedFocusRun: number;
  readonly punctuationRatio: number;
}
export interface AdaptiveExercise {
  readonly id: string;
  readonly version: string;
  readonly recommendationId: string;
  readonly focusType: AdaptivePracticeSpec["focusType"];
  readonly focusItems: readonly string[];
  readonly text: string;
  readonly source: TextSourceIdentity & { readonly type: "adaptive" };
  readonly contentStrategy: ContentStrategy;
  readonly strategyReason: string | null;
  readonly coverage: ExerciseCoverage;
  readonly sections: readonly ExerciseSection[];
  readonly generatedFrom: {
    readonly spec: AdaptivePracticeSpec;
    readonly generatorVersion: string;
    readonly contentBankVersion: string;
    readonly composition?: CompositionInput;
  };
  readonly preparedText: TargetText;
}
export type GenerationFailureCode =
  | "invalid-spec"
  | "unsupported-focus"
  | "coverage-unsatisfied";
export type GenerationFailureReason =
  | "insufficient-content"
  | "coverage-conflict"
  | "density-conflict"
  | "context-diversity-conflict"
  | "repetition-conflict"
  | "length-conflict"
  | "unsupported-focus"
  | "assembly-exhausted";
export interface GenerationDiagnostic {
  readonly kind: GenerationFailureReason;
  readonly message: string;
}
export type GenerationResult =
  | { readonly ok: true; readonly exercise: AdaptiveExercise }
  | {
      readonly ok: false;
      readonly code: GenerationFailureCode;
      readonly reason: string;
      readonly attempts: number;
      readonly diagnostics?: readonly GenerationDiagnostic[];
    };
export interface CoverageValidation {
  readonly valid: boolean;
  readonly issues: readonly string[];
  readonly coverage: ExerciseCoverage;
}
