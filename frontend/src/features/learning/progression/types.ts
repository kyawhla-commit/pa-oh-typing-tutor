import type { WeaknessIdentity } from "../transfer/types";
export type ProgressionLevel = 0 | 1 | 2;
export type ExercisePurpose = "training" | "controlled-transfer-assessment";
export interface CompositionInput {
  readonly level: ProgressionLevel;
  readonly ordinal: number;
  readonly purpose: ExercisePurpose;
}
export type LearningAction =
  | {
      readonly type: "targeted-practice";
      readonly weakness: WeaknessIdentity;
      readonly progressionLevel: 0;
    }
  | {
      readonly type: "contextual-practice";
      readonly weakness: WeaknessIdentity;
      readonly progressionLevel: 1 | 2;
    }
  | {
      readonly type: "controlled-assessment";
      readonly weakness: WeaknessIdentity;
      readonly progressionLevel: 2;
    }
  | {
      readonly type: "normal-practice";
      readonly weakness?: WeaknessIdentity;
      readonly unavailable?: "content-unavailable";
    }
  | { readonly type: "none" };
export interface VariantState {
  readonly key: string;
  readonly nextOrdinal: number;
}
