import type {
  SessionResult,
  TextSourceIdentity,
  TypingMode,
} from "../../../engine/typing";
import type { LearningEvidence, PracticeRecommendation } from "../types";
import type {
  AdaptiveAttribution,
  MasteryProfile,
  WeaknessIdentity,
  MasteryRecord,
} from "../transfer/types";
import type { LearnerTypingProfile } from "../types";
import type { LearningAction } from "../progression/types";
export interface ErrorModel {
  readonly identity: WeaknessIdentity;
  readonly occurrences: number;
  readonly corrected?: boolean;
  readonly actual?: string;
  readonly offset?: number;
}
export interface OrdinaryStep {
  readonly kind: "ordinary";
  readonly label: string;
  readonly text: string;
  readonly errors?: readonly ErrorModel[];
  readonly wpm?: number;
  readonly mode?: TypingMode;
  readonly source?: TextSourceIdentity["type"];
  readonly abort?: boolean;
  readonly repeatId?: boolean;
  readonly manualSave?: boolean;
}
export interface AdaptiveStep {
  readonly kind: "adaptive";
  readonly label: string;
  readonly identity: WeaknessIdentity;
  readonly outcome: "success" | "mild" | "severe";
  readonly wpm?: number;
  readonly restart?: boolean;
  readonly purpose?: "training" | "controlled-transfer-assessment";
}
export type ScenarioStep = OrdinaryStep | AdaptiveStep;
export interface Scenario {
  readonly id: string;
  readonly version: 1;
  readonly group:
    | "persona"
    | "competition"
    | "progression"
    | "assessment"
    | "starvation"
    | "boundary"
    | "overlap"
    | "executability"
    | "sensitivity";
  readonly description: string;
  readonly target?: WeaknessIdentity;
  readonly steps: readonly ScenarioStep[];
}
export interface AnonymousSession {
  readonly summary: LearningEvidence["summary"];
  readonly aggregates: LearningEvidence["aggregates"];
  readonly attribution?: AdaptiveAttribution;
}
export interface AnonymousHistory {
  readonly version: 1;
  readonly anonymousLearnerId: string;
  readonly sessions: readonly AnonymousSession[];
}
export interface RecommendationTrace {
  readonly id: string;
  readonly type: PracticeRecommendation["type"];
  readonly targets: readonly string[];
  readonly priority: number;
  readonly explanation: string;
  readonly window: string;
  readonly opportunities: number;
  readonly errors: number;
  readonly rate: number;
  readonly directionalCount: number | null;
}
export interface RecordTrace {
  readonly key: string;
  readonly state: MasteryRecord["state"];
  readonly level: number;
  readonly action: LearningAction["type"];
  readonly eligible: boolean;
  readonly path: MasteryRecord["masteryVia"];
  readonly training: {
    sessions: number;
    successes: number;
    opportunities: number;
    errors: number;
  };
  readonly transfer: {
    sessions: number;
    opportunities: number;
    errors: number;
    rate: number;
  };
  readonly waiting: number;
  readonly naturalSinceCheck: number;
  readonly assessments: number;
  readonly assessmentOpportunities: number;
  readonly failure: MasteryRecord["assessmentFailure"];
}
export interface ExerciseTrace {
  readonly reused?: boolean;
  readonly focusType: string;
  readonly items: readonly string[];
  readonly level: number;
  readonly ordinal: number;
  readonly purpose: string;
  readonly length: number;
  readonly density: number;
  readonly strategy: string;
  readonly id: string;
}
export interface TraceStep {
  readonly step: number;
  readonly label: string;
  readonly sessionSequence: number;
  readonly ingested: boolean;
  readonly context: string;
  readonly profile: {
    sessions: number;
    attempts: number;
    errors: number;
    recentSessions: number;
  };
  readonly recommendations: readonly RecommendationTrace[];
  readonly top: string | null;
  readonly records: readonly RecordTrace[];
  readonly session: {
    attempts: number;
    errors: number;
    corrected: number;
    remaining: number;
    accuracy: number;
    wpm: number;
    activeMs: number;
  } | null;
  readonly exercise: ExerciseTrace | null;
  readonly generationFailure: string | null;
  readonly selectionAudit?: readonly {
    readonly weaknessId: string;
    readonly rawPriority: number;
    readonly type: PracticeRecommendation["type"];
    readonly signature: import("../selection").OverlapSignature;
    readonly visible: boolean;
    readonly reason: string;
    readonly representedBy: string | null;
    readonly action: LearningAction["type"] | null;
  }[];
}
export interface InvariantResult {
  readonly id: string;
  readonly checks: number;
  readonly violations: readonly string[];
}
export interface EvaluationMetrics {
  readonly detectionStep: number | null;
  readonly detectionOpportunities: number | null;
  readonly stageFirstSteps: Readonly<Record<string, number>>;
  readonly masteryStep: number | null;
  readonly topChanges: number;
  readonly activeMasteryFlips: number;
  readonly assessmentOfferSteps: number;
  readonly ordinaryWaitingBeforeFirstOffer: number | null;
  readonly targetVisibleSteps: number;
  readonly targetHiddenActionableSteps: number;
  readonly targetSuppressedAfterMastery: boolean;
  readonly regressionSteps: readonly number[];
}
export interface ScenarioResult {
  readonly id: string;
  readonly version: 1;
  readonly group: Scenario["group"];
  readonly description: string;
  readonly targetKey: string | null;
  readonly trace: readonly TraceStep[];
  readonly metrics: EvaluationMetrics;
  readonly invariants: readonly InvariantResult[];
  readonly history: AnonymousHistory;
  readonly finalProfile: LearnerTypingProfile;
  readonly finalMastery: MasteryProfile;
  readonly engineSessions: number;
  readonly exercises: number;
}
export type EngineSession = SessionResult;
