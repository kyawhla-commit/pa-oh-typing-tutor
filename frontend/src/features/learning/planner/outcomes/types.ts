import type { PlanPurpose, PlannerOption } from "../types";
import type { WeaknessKind } from "../../transfer/types";
export type PlannedActivityLifecycle =
  | "offered"
  | "started"
  | "completed"
  | "cancelled"
  | "skipped"
  | "abandoned";
export type TerminalOutcome = Exclude<
  PlannedActivityLifecycle,
  "offered" | "started"
>;
export interface ActivityReference {
  readonly planId: string;
  readonly planVersion: 1;
  /** Opaque hash of the existing canonical action/weakness/purpose key. */
  readonly activityKey: string;
  readonly learnerScope: string;
  readonly activityType: PlannerOption["actionType"];
  readonly weaknessId: string | null;
  readonly weaknessCategory: WeaknessKind | null;
  readonly purpose: PlanPurpose;
  readonly slot: "primary" | "secondary";
  readonly sourceReference: string | null;
}
export interface ActivityAttempt extends ActivityReference {
  readonly attemptId: string;
  readonly sequence: number;
  readonly lifecycle: "offered" | "started";
  readonly runId: string | null;
}
export interface PlannerActivityOutcome extends ActivityReference {
  readonly attemptId: string;
  readonly sequence: number;
  readonly outcome: TerminalOutcome;
  readonly completionReference: string | null;
}
export interface PlannerOutcomeState {
  readonly version: 1;
  readonly learnerScope: string;
  readonly sequence: number;
  readonly current: ActivityAttempt | null;
  readonly recent: readonly PlannerActivityOutcome[];
}
export interface RecentOutcome {
  readonly activityKey: string;
  readonly outcome: TerminalOutcome;
  readonly sequence: number;
}
export type OutcomeEvent =
  | { readonly type: "offer"; readonly activity: ActivityReference }
  | { readonly type: "start"; readonly attemptId: string }
  | {
      readonly type: "bind-run";
      readonly attemptId: string;
      readonly runId: string;
    }
  | { readonly type: "supersede"; readonly attemptId: string }
  | {
      readonly type: TerminalOutcome;
      readonly attemptId: string;
      readonly completionReference?: string;
    };
export interface OutcomeTransition {
  readonly state: PlannerOutcomeState;
  readonly changed: boolean;
  readonly code:
    | "accepted"
    | "duplicate"
    | "invalid-transition"
    | "inactive-attempt";
}
