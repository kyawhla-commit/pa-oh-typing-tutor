import type { TaskId, FixtureId, CONFUSION_TAGS } from "./tasks";
import type { RecommendationType, SessionSummary } from "../learning/types";
import type {
  LearningAction,
  ProgressionLevel,
} from "../learning/progression/types";
import type { MasteryState } from "../learning/transfer/types";
export const EVENT_TYPES = [
  "task-started",
  "recommendation-shown",
  "activity-started",
  "activity-skipped",
  "activity-cancelled",
  "activity-completed",
  "activity-abandoned",
  "mastery-check-started",
  "mastery-check-completed",
  "navigation",
  "facilitator-note",
  "fixture-loaded",
] as const;
export interface PilotMetrics {
  readonly mode: SessionSummary["mode"];
  readonly correctWpm: number;
  readonly attemptAccuracy: number;
  readonly attempts: number;
  readonly errors: number;
  readonly correctedErrors: number;
  readonly completionReason: SessionSummary["completionReason"];
}
export interface Milestone {
  readonly eventId: string;
  readonly eventType: (typeof EVENT_TYPES)[number];
  readonly actionType?: LearningAction["type"];
  readonly recommendationType?: RecommendationType;
  readonly progressionLevel?: ProgressionLevel;
  readonly masteryState?: MasteryState;
  readonly sourceReference?: string;
  readonly sourceVersionReference?: string;
  readonly metrics?: PilotMetrics;
  readonly route?: "practice" | "test";
  readonly fixture?: FixtureId;
}
export interface PilotEvent extends Milestone {
  readonly participantId: string;
  readonly sequence: number;
  readonly taskId: TaskId;
  readonly relativeTimeMs: number;
}
export interface PilotConsent {
  readonly participation: boolean;
  readonly notes: boolean;
  readonly audio: boolean;
  readonly video: boolean;
  readonly screen: boolean;
}
export interface PilotObservation {
  readonly participantId: string;
  readonly sequence: number;
  readonly taskId: TaskId;
  readonly outcome: "success" | "success-with-help" | "failed" | "abandoned";
  readonly confusionTags: readonly (typeof CONFUSION_TAGS)[number][];
  readonly wrongClicks: number;
  readonly helpNeeded: boolean;
  readonly explanationAccuracy:
    "accurate" | "partial" | "unclear" | "not-asked";
  readonly note: string;
}
export interface PilotData {
  readonly studyVersion: 1;
  readonly captureKind: "engineering-rehearsal" | "consented-pilot";
  readonly participantId: string;
  readonly consent: PilotConsent;
  readonly events: readonly PilotEvent[];
  readonly observations: readonly PilotObservation[];
}
