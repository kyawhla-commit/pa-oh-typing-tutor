export { createTypingEngine, TypingEngine } from "./TypingEngine";
export { SCORING_VERSION } from "./types";
export type {
  AttemptCounts, CompletionPolicy, DispatchOutcome, MistakeRecord, SessionResult, SessionSnapshot,
  SessionStatus, TargetText, TypedUnit, TypingEngineConfig, TypingEvent, TypingMode, TypingMetrics,
} from "./types";

export { prepareTypingText } from "./text";
export type { TextSourceIdentity, WordToken, WordProgress, TypingModeConfig } from "./types";
