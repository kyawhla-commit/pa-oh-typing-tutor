import { freezeProfileValue } from "../learning/aggregation";
import {
  STUDY_VERSION,
  TASKS,
  CONFUSION_TAGS,
  FIXTURES,
  isParticipantId,
} from "./tasks";
import {
  EVENT_TYPES,
  type Milestone,
  type PilotConsent,
  type PilotData,
  type PilotEvent,
  type PilotMetrics,
  type PilotObservation,
} from "./types";
export const PILOT_LIMITS = Object.freeze({
  events: 500,
  observations: 100,
  bytes: 262144,
  note: 500,
});
const fail = () => {
  throw Error(
    "Invalid or private pilot data. Use structured study fields and remove identifying details.",
  );
};
export function fields(
  v: unknown,
  allowed: readonly string[],
): Record<string, unknown> {
  if (
    !v ||
    typeof v !== "object" ||
    Array.isArray(v) ||
    Object.keys(v).some((k) => !allowed.includes(k))
  )
    return fail();
  return v as Record<string, unknown>;
}
const choice = <const T extends string>(
  v: unknown,
  options: readonly T[],
): T => (typeof v === "string" && options.includes(v as T) ? (v as T) : fail());
const integer = (v: unknown, max = Number.MAX_SAFE_INTEGER) =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= max
    ? v
    : fail();
const number = (v: unknown, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max
    ? v
    : fail();
const bool = (v: unknown) => (typeof v === "boolean" ? v : fail());
const participant = (v: unknown) => (isParticipantId(v) ? v : fail());
const hash = (v: unknown, prefix: string) =>
  typeof v === "string" && new RegExp(`^${prefix}-[a-f0-9]{16}$`).test(v)
    ? v
    : fail();
const task = (v: unknown) =>
  choice(
    v,
    TASKS.map((t) => t.id),
  );
export function validateConsent(v: unknown): PilotConsent {
  const o = fields(v, ["participation", "notes", "audio", "video", "screen"]);
  return freezeProfileValue({
    participation: bool(o.participation),
    notes: bool(o.notes),
    audio: bool(o.audio),
    video: bool(o.video),
    screen: bool(o.screen),
  });
}
function metrics(v: unknown): PilotMetrics {
  const o = fields(v, [
      "mode",
      "correctWpm",
      "attemptAccuracy",
      "attempts",
      "errors",
      "correctedErrors",
      "completionReason",
    ]),
    attempts = integer(o.attempts),
    errors = integer(o.errors),
    correctedErrors = integer(o.correctedErrors);
  if (errors > attempts || correctedErrors > errors) return fail();
  return {
    mode: choice(o.mode, ["fixed-text", "timed", "word-count"]),
    correctWpm: number(o.correctWpm, 1e6),
    attemptAccuracy: number(o.attemptAccuracy, 100),
    attempts,
    errors,
    correctedErrors,
    completionReason: choice(o.completionReason, [
      "correct-target",
      "target-covered",
      "time-expired",
      "word-limit-reached",
    ]),
  };
}
const milestoneFields = [
  "eventId",
  "eventType",
  "actionType",
  "recommendationType",
  "progressionLevel",
  "masteryState",
  "sourceReference",
  "sourceVersionReference",
  "metrics",
  "route",
  "fixture",
];
export function validateMilestone(v: unknown): Milestone {
  const o = fields(v, milestoneFields),
    result: Milestone = {
      eventId: hash(o.eventId, "pilot-event"),
      eventType: choice(o.eventType, EVENT_TYPES),
      ...(o.actionType !== undefined
        ? {
            actionType: choice(o.actionType, [
              "targeted-practice",
              "contextual-practice",
              "controlled-assessment",
              "normal-practice",
              "none",
            ]),
          }
        : {}),
      ...(o.recommendationType !== undefined
        ? {
            recommendationType: choice(o.recommendationType, [
              "WEAK_GRAPHEME",
              "SUBSTITUTION_CONFUSION",
              "WEAK_BIGRAM",
              "DIFFICULT_WORD",
              "ACCURACY_FOCUS",
              "SPEED_BUILDING",
              "GENERAL_PRACTICE",
            ]),
          }
        : {}),
      ...(o.progressionLevel !== undefined
        ? { progressionLevel: integer(o.progressionLevel, 2) as 0 | 1 | 2 }
        : {}),
      ...(o.masteryState !== undefined
        ? {
            masteryState: choice(o.masteryState, [
              "INSUFFICIENT_EVIDENCE",
              "ACTIVE",
              "IMPROVING",
              "TRANSFER_CHECK",
              "PROVISIONAL_MASTERY",
              "REGRESSED",
            ]),
          }
        : {}),
      ...(o.sourceReference !== undefined
        ? { sourceReference: hash(o.sourceReference, "source") }
        : {}),
      ...(o.sourceVersionReference !== undefined
        ? { sourceVersionReference: hash(o.sourceVersionReference, "version") }
        : {}),
      ...(o.metrics !== undefined ? { metrics: metrics(o.metrics) } : {}),
      ...(o.route !== undefined
        ? { route: choice(o.route, ["practice", "test"]) }
        : {}),
      ...(o.fixture !== undefined
        ? { fixture: choice(o.fixture, FIXTURES) }
        : {}),
    };
  if (
    result.metrics &&
    !["activity-completed", "mastery-check-completed"].includes(
      result.eventType,
    )
  )
    return fail();
  return freezeProfileValue(result);
}
export function validateEvent(v: unknown): PilotEvent {
  const o = fields(v, [
      ...milestoneFields,
      "participantId",
      "sequence",
      "taskId",
      "relativeTimeMs",
    ]),
    { participantId, sequence, taskId, relativeTimeMs, ...rest } = o;
  const seq = integer(sequence);
  if (!seq) return fail();
  return freezeProfileValue({
    ...validateMilestone(rest),
    participantId: participant(participantId),
    sequence: seq,
    taskId: task(taskId),
    relativeTimeMs: integer(relativeTimeMs),
  });
}
/** Manual note scanner blocks obvious identifiers/secrets. It cannot identify every name or private passage; facilitator review is required. */
export function validateNote(v: unknown) {
  if (
    typeof v !== "string" ||
    v.length > PILOT_LIMITS.note ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v) ||
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b(?:\d{1,3}\.){3}\d{1,3}\b|https?:\/\/|\b(?:password|passwd|credentials?|auth.?token|api.?key|bearer|secret)\b\s*[:= ]\s*\S+/i.test(
      v,
    )
  )
    return fail();
  return v;
}
export function validateObservation(v: unknown): PilotObservation {
  const o = fields(v, [
    "participantId",
    "sequence",
    "taskId",
    "outcome",
    "confusionTags",
    "wrongClicks",
    "helpNeeded",
    "explanationAccuracy",
    "note",
  ]);
  if (
    !Array.isArray(o.confusionTags) ||
    o.confusionTags.length > CONFUSION_TAGS.length
  )
    return fail();
  const tags = o.confusionTags.map((t) => choice(t, CONFUSION_TAGS));
  if (new Set(tags).size !== tags.length) return fail();
  const outcome = choice(o.outcome, [
      "success",
      "success-with-help",
      "failed",
      "abandoned",
    ]),
    helpNeeded = bool(o.helpNeeded),
    seq = integer(o.sequence);
  if (
    !seq ||
    (outcome === "success" && helpNeeded) ||
    (outcome === "success-with-help" && !helpNeeded)
  )
    return fail();
  return freezeProfileValue({
    participantId: participant(o.participantId),
    sequence: seq,
    taskId: task(o.taskId),
    outcome,
    confusionTags: tags,
    wrongClicks: integer(o.wrongClicks, 100),
    helpNeeded,
    explanationAccuracy: choice(o.explanationAccuracy, [
      "accurate",
      "partial",
      "unclear",
      "not-asked",
    ]),
    note: validateNote(o.note),
  });
}
export function validatePilotData(v: unknown): PilotData {
  if (new TextEncoder().encode(JSON.stringify(v)).length > PILOT_LIMITS.bytes)
    return fail();
  const o = fields(v, [
    "studyVersion",
    "captureKind",
    "participantId",
    "consent",
    "events",
    "observations",
  ]);
  if (
    o.studyVersion !== STUDY_VERSION ||
    !Array.isArray(o.events) ||
    o.events.length > PILOT_LIMITS.events ||
    !Array.isArray(o.observations) ||
    o.observations.length > PILOT_LIMITS.observations
  )
    return fail();
  const participantId = participant(o.participantId),
    consent = validateConsent(o.consent),
    events = o.events.map(validateEvent),
    observations = o.observations.map(validateObservation);
  if (
    !consent.participation ||
    (!consent.notes && observations.some((x) => x.note.length)) ||
    [...events, ...observations].some(
      (x) => x.participantId !== participantId,
    ) ||
    events.some(
      (x, i) =>
        x.sequence !== i + 1 ||
        (i > 0 && x.relativeTimeMs < events[i - 1].relativeTimeMs),
    ) ||
    new Set(events.map((x) => x.eventId)).size !== events.length ||
    observations.some((x, i) => x.sequence !== i + 1)
  )
    return fail();
  return freezeProfileValue({
    studyVersion: STUDY_VERSION,
    captureKind: choice(o.captureKind, [
      "engineering-rehearsal",
      "consented-pilot",
    ]),
    participantId,
    consent,
    events,
    observations,
  });
}
export function serializePilotExport(data: PilotData) {
  const validated = validatePilotData(data);
  return (
    JSON.stringify(
      {
        studyVersion: STUDY_VERSION,
        captureKind: validated.captureKind,
        participantId: validated.participantId,
        consent: validated.consent,
        tasks: TASKS,
        observations: validated.observations,
        events: validated.events,
      },
      null,
      2,
    ) + "\n"
  );
}
