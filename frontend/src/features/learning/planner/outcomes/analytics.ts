import type { PlanPurpose, PlannerOption } from "../types";
import type { WeaknessKind } from "../../transfer/types";
/** Future consented study proposal only. No collector, SDK, export or transport. */
export interface FuturePlannerOutcomeEvent {
  readonly pseudonymousStudyId?: string;
  readonly sequence: number;
  readonly offeredActionType: PlannerOption["actionType"];
  readonly weaknessCategory?: WeaknessKind;
  readonly outcome: "started" | "completed" | "skipped" | "cancelled";
  readonly hadAlternative: boolean;
  readonly planPurpose: PlanPurpose;
}
