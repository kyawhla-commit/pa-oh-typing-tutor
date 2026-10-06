import type { RecentOutcome } from "./outcomes/types";
import type {
  LearningAction,
  ExercisePurpose,
  ProgressionLevel,
} from "../progression/types";
import type { MasteryState, WeaknessIdentity } from "../transfer/types";
export type PlanPurpose =
  | "regression-recovery"
  | "transfer-check"
  | "targeted-improvement"
  | "contextual-practice"
  | "general-practice";
/** Compact references only. Neither context nor plan carries an exercise passage. */
export interface PlannerOption {
  readonly id: string;
  readonly recommendationId: string | null;
  readonly policyOrder: number;
  readonly actionType: Exclude<LearningAction["type"], "none">;
  readonly weakness: WeaknessIdentity | null;
  readonly masteryState: MasteryState | null;
  readonly executable: boolean;
  readonly target:
    | {
        readonly type: "adaptive";
        readonly sourceId: string;
        readonly sourceVersion: string;
        readonly level: ProgressionLevel;
        readonly ordinal: number;
        readonly purpose: ExercisePurpose;
        readonly graphemes: number;
      }
    | { readonly type: "ordinary-practice" };
}
export interface PlannerHistory {
  readonly version: 1;
  readonly order: number;
  readonly recent: readonly {
    readonly sessionId: string;
    readonly activityKey: string;
    readonly sourceId: string | null;
  }[];
}
export interface PlannerContext {
  readonly learnerScope: string;
  readonly evidenceVersion: {
    readonly profile: 1;
    readonly mastery: 1 | 2;
    readonly sessions: number;
    readonly masteryOrder: number;
    readonly generator: string;
    readonly bank: string;
  };
  /** Already selected/ranked by policy and validated by the capability adapter. */
  readonly options: readonly PlannerOption[];
  readonly recentActions: readonly string[];
  readonly recentOutcomes?: readonly RecentOutcome[];
  readonly unavailableActions?: number;
  /** Visible policy needs, including those currently served by normal fallback. */
  readonly visibleNeedKeys?: readonly string[];
}
export interface PlannedActivity extends PlannerOption {
  readonly purpose: PlanPurpose;
  readonly activityKey: string;
  readonly explanation: string;
}
export interface LearningSessionPlan {
  readonly version: 1;
  readonly id: string;
  readonly learnerScope: string;
  readonly purpose: PlanPurpose;
  readonly primaryAction: PlannedActivity;
  readonly optionalSecondaryAction: PlannedActivity | null;
  readonly estimatedActivities: 1 | 2;
  readonly explanation: string;
  readonly createdFromEvidenceVersion: PlannerContext["evidenceVersion"];
  readonly audit: {
    readonly unavailableActionsAvoided: number;
    readonly duplicateActivitiesAvoided: number;
    readonly masteredActionsAvoided: number;
    readonly repetitionAvoided: boolean;
    readonly outcomeDiversion?: boolean;
  };
}
