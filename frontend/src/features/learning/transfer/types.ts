import type { CompositionInput,ProgressionLevel,VariantState } from "../progression/types";
import type { AdaptivePracticeSpec } from "../types";
export type WeaknessKind = Exclude<AdaptivePracticeSpec["focusType"],"general">;
export interface WeaknessIdentity { readonly kind: WeaknessKind; readonly items: readonly string[] }
export type EvidenceContext = "ordinary-practice" | "timed-test" | "word-test" | "adaptive-targeted" | "adaptive-general" | "controlled-transfer-assessment" | "unknown";
/** Trusted feature-owned selection metadata. Never text, label, or recommendation instance ID. */
export interface AdaptiveAttribution {
  readonly sourceId: string; readonly sourceVersion: string;
  readonly focusType: AdaptivePracticeSpec["focusType"]; readonly focusItems: readonly string[];
  readonly composition?:CompositionInput; readonly assessmentCheckOrder?:number;
}
export type MasteryState = "INSUFFICIENT_EVIDENCE" | "ACTIVE" | "IMPROVING" | "TRANSFER_CHECK" | "PROVISIONAL_MASTERY" | "REGRESSED";
export type NextAction = "CONTINUE_TARGETED_PRACTICE" | "INCREASE_VARIETY" | "WAIT_FOR_TRANSFER_EVIDENCE" | "REDUCE_PRIORITY" | "REACTIVATE_WEAKNESS" | "GENERAL_PRACTICE";
export interface Observation {
  readonly order: number; readonly context: EvidenceContext;
  readonly attempts?:number; readonly ordinal?:number;
  readonly opportunities: number; readonly errors: number;
  readonly accuracy: number; readonly correctWpm: number; readonly activeMs: number;
}
export interface MasteryRecord {
  readonly identity: WeaknessIdentity; readonly state: MasteryState;
  readonly epoch: number; readonly stateSince: number; readonly lastSeen: number;
  readonly baselineWpm: number | null;
  readonly training: readonly Observation[]; readonly transfer: readonly Observation[];
  readonly practiceLevel?:ProgressionLevel;
  readonly checkOrder?:number|null; readonly waiting?:readonly Observation[]; readonly naturalSinceCheck?:number;
  readonly assessments?:readonly Observation[]; readonly assessmentFailure?:"mild"|"severe"|null; readonly masteryVia?:"natural"|"controlled"|null;
}
export interface MasteryProfile {
  readonly version: 1|2; readonly order: number;
  readonly variants?:readonly VariantState[];
  readonly records: readonly MasteryRecord[];
  readonly ordinary: readonly Observation[];
  readonly processedSessionIds: readonly string[];
}
export interface EvidenceDigest { readonly sessions: number; readonly opportunities: number; readonly errors: number; readonly rate: number; readonly successes: number }
export interface MasteryDecision {
  readonly state: MasteryState; readonly reason: "need-baseline" | "training-needed" | "training-improving" | "await-ordinary-transfer" | "ordinary-transfer-strong" | "ordinary-regression";
  readonly level: 0 | 1 | 2; readonly nextAction: NextAction;
  readonly training: EvidenceDigest; readonly transfer: EvidenceDigest;
}
