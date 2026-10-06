import type { CompositionInput, LearningAction } from "../progression/types";
import type { AdaptivePracticeSpec, PracticeRecommendation } from "../types";
import { practiceSpec } from "../recommendations";
import { freezeProfileValue } from "../aggregation";
import { canGenerateExercise } from "./capability";
import type { AdaptiveExercise, GenerationResult } from "./types";
export interface AdaptiveSelection {
  readonly learnerScope: string;
  readonly recommendation: PracticeRecommendation;
  readonly spec: AdaptivePracticeSpec;
  readonly exercise: AdaptiveExercise;
  readonly action?: LearningAction;
  readonly explanation?: string;
  readonly assessmentCheckOrder?: number;
}
/** Start-click boundary: subsequent profile updates cannot replace this target. */
export function selectAdaptivePractice(
  recommendation: PracticeRecommendation,
  learnerScope: string,
  options?: {
    composition: CompositionInput;
    action: LearningAction;
    explanation: string;
    assessmentCheckOrder?: number;
  },
):
  | { ok: true; selection: AdaptiveSelection }
  | Extract<GenerationResult, { ok: false }> {
  const spec = practiceSpec(recommendation);
  const generated = canGenerateExercise(spec, {
    learnerKey: learnerScope,
    composition: options?.composition,
  });
  return generated.ok
    ? {
        ok: true,
        selection: freezeProfileValue({
          learnerScope,
          recommendation,
          spec: generated.exercise.generatedFrom.spec,
          exercise: generated.exercise,
          ...(options
            ? {
                action: options.action,
                explanation: options.explanation,
                assessmentCheckOrder: options.assessmentCheckOrder,
              }
            : {}),
        }),
      }
    : generated;
}
