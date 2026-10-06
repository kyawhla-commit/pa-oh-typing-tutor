import { compareUnicode, freezeProfileValue } from "../aggregation";
import { rankPracticeCandidates } from "../policy";
import {
  selectVisible,
  visibleWeaknessId,
  errorSessionProvenance,
} from "../selection";
import { LEARNING } from "../constants";
import type { LearnerTypingProfile, LearningEvidence } from "../types";
import {
  classifyEvidence,
  isTransferContext,
  recommendationIdentity,
  wasTargeted,
  wasAssessed,
  weaknessKey,
} from "./classify";
import { TRANSFER as T } from "./constants";
import { observeWeakness } from "./evidence";
import {
  assessmentEligible,
  assessmentSuccess,
  controlledMastery,
} from "../progression/assessment";
import { nextCompositionLevel } from "../progression/actions";
import { ASSESSMENT } from "../progression/constants";
import { evaluateMastery, trainingSuccess, severe } from "./mastery";
import type {
  AdaptiveAttribution,
  MasteryProfile,
  MasteryRecord,
  Observation,
} from "./types";
export const emptyMastery = (order = 0): MasteryProfile =>
  freezeProfileValue({
    version: 2 as const,
    order,
    variants: [],
    records: [],
    ordinary: [],
    processedSessionIds: [],
  });
function baseline(ordinary: readonly Observation[]): number | null {
  const recent = ordinary.slice(-T.speedBaselineSessions);
  return recent.length === T.speedBaselineSessions &&
    recent.every((o) => o.accuracy >= T.strongAccuracy && o.correctWpm > 0)
    ? recent.reduce((n, o) => n + o.correctWpm, 0) / recent.length
    : null;
}
function track(
  records: MasteryRecord[],
  profile: LearnerTypingProfile,
  order: number,
  ordinary: readonly Observation[],
) {
  const provenance = errorSessionProvenance(profile);
  const raw = rankPracticeCandidates(profile);
  const candidates = raw
    .map((recommendation) => ({
      recommendation,
      state: records.find(
        (r) => weaknessKey(r.identity) === visibleWeaknessId(recommendation),
      )?.state,
      errorSessions: provenance.get(visibleWeaknessId(recommendation)) ?? [],
    }))
    .filter((c) => c.state !== "PROVISIONAL_MASTERY");
  // Preserve legacy record admission as well as newly visible needs. Card
  // consolidation must never discard training/transfer tracking.
  const admitted = [
    ...raw.slice(0, LEARNING.recommendations),
    ...selectVisible(candidates).visible.map((c) => c.recommendation),
  ];
  for (const rec of admitted) {
    const identity = recommendationIdentity(rec);
    if (
      !identity ||
      records.some((r) => weaknessKey(r.identity) === weaknessKey(identity))
    )
      continue;
    records.push({
      identity,
      state:
        identity.kind === "speed" && baseline(ordinary) === null
          ? "INSUFFICIENT_EVIDENCE"
          : "ACTIVE",
      epoch: order,
      stateSince: order,
      lastSeen: order,
      practiceLevel: 0,
      checkOrder: null,
      waiting: [],
      naturalSinceCheck: 0,
      assessments: [],
      masteryVia: null,
      assessmentFailure: null,
      baselineWpm: identity.kind === "speed" ? baseline(ordinary) : null,
      training: [],
      transfer: [],
    });
  }
}
/** Only completed-boundary evidence enters; base Slice 5 evidence remains unweighted. */
export function advanceMastery(
  current: MasteryProfile,
  before: LearnerTypingProfile,
  after: LearnerTypingProfile,
  evidence: LearningEvidence,
  attribution?: AdaptiveAttribution,
): MasteryProfile {
  if (
    current.processedSessionIds.includes(evidence.summary.sessionId) ||
    after.sessionCount === before.sessionCount
  )
    return current;
  const order = after.sessionCount,
    context = classifyEvidence(evidence.summary, attribution);
  const records = [...current.records];
  track(records, before, current.order, current.ordinary);
  let ordinary = current.ordinary;
  const broadObservation = observeWeakness(
    evidence,
    { kind: "accuracy", items: [] },
    order,
    context,
  );
  if (
    isTransferContext(context) &&
    broadObservation.opportunities >= T.sessionMinimum.accuracy &&
    broadObservation.activeMs >= T.minActiveMs
  )
    ordinary = [...ordinary, broadObservation].slice(-T.speedBaselineSessions);
  const next = records.map((record) => {
    const observation = {
      ...observeWeakness(evidence, record.identity, order, context),
      ...(attribution?.composition
        ? { ordinal: attribution.composition.ordinal }
        : {}),
    };
    const training = wasTargeted(evidence.summary, record.identity, attribution)
      ? [...record.training, observation].slice(-T.trainingWindow)
      : record.training;
    const transfer =
      isTransferContext(context) &&
      observation.opportunities >= T.sessionMinimum[record.identity.kind]
        ? [...record.transfer, observation].slice(-T.transferWindow)
        : record.transfer;
    // Capture baseline before counting this session as speed transfer.
    const baselineWpm =
      record.identity.kind === "speed" && record.baselineWpm === null
        ? baseline(current.ordinary)
        : record.baselineWpm;
    const ordinaryWaiting =
      record.state === "TRANSFER_CHECK" &&
      isTransferContext(context) &&
      evidence.summary.totalAttempts >= ASSESSMENT.ordinaryAttempts &&
      evidence.summary.activeElapsedMs >= ASSESSMENT.ordinaryMs;
    const waiting = ordinaryWaiting
      ? [...(record.waiting ?? []), observation].slice(
          -ASSESSMENT.waitingSessions,
        )
      : (record.waiting ?? []);
    const naturalSinceCheck = ordinaryWaiting
      ? Math.min(
          T.transferMinimum[record.identity.kind],
          (record.naturalSinceCheck ?? 0) + observation.opportunities,
        )
      : (record.naturalSinceCheck ?? 0);
    const practiceLevel =
      training !== record.training
        ? nextCompositionLevel(
            attribution?.composition?.level ?? record.practiceLevel ?? 0,
            trainingSuccess(record, observation),
            severe(record, observation),
          )
        : (record.practiceLevel ??
          (record.state === "IMPROVING"
            ? 1
            : record.state === "TRANSFER_CHECK"
              ? 2
              : 0));
    let updated = {
      ...record,
      baselineWpm,
      training,
      transfer,
      waiting,
      naturalSinceCheck,
      practiceLevel,
      checkOrder:
        record.checkOrder ??
        (record.state === "TRANSFER_CHECK" ? record.stateSince : null),
      assessments: record.assessments ?? [],
      masteryVia:
        record.masteryVia ??
        (record.state === "PROVISIONAL_MASTERY" ? ("natural" as const) : null),
      assessmentFailure: record.assessmentFailure ?? null,
      lastSeen:
        training !== record.training ||
        transfer !== record.transfer ||
        ordinaryWaiting
          ? order
          : record.lastSeen,
    };
    if (
      wasAssessed(evidence.summary, record.identity, attribution) &&
      assessmentEligible(record) &&
      attribution?.assessmentCheckOrder === updated.checkOrder
    ) {
      if (!updated.assessments.some((o) => o.ordinal === observation.ordinal)) {
        updated = {
          ...updated,
          assessments: [...updated.assessments, observation].slice(
            -ASSESSMENT.window,
          ),
          lastSeen: order,
        };
        if (!assessmentSuccess(updated, observation)) {
          const failure: "mild" | "severe" =
            severe(updated, observation) ||
            observation.accuracy < T.poorAccuracy
              ? "severe"
              : "mild";
          return {
            ...updated,
            state: "ACTIVE" as const,
            stateSince: order,
            epoch: order,
            practiceLevel: failure === "severe" ? (0 as const) : (1 as const),
            training: [],
            transfer: [],
            waiting: [],
            assessments: [],
            naturalSinceCheck: 0,
            checkOrder: null,
            masteryVia: null,
            assessmentFailure: failure,
          };
        }
        if (controlledMastery(updated))
          return {
            ...updated,
            state: "PROVISIONAL_MASTERY" as const,
            stateSince: order,
            masteryVia: "controlled" as const,
          };
      }
    }
    const decision = evaluateMastery(updated);
    if (decision.state === record.state)
      return decision.state === "PROVISIONAL_MASTERY" &&
        evaluateMastery({ ...updated, state: "ACTIVE" }).state ===
          "PROVISIONAL_MASTERY"
        ? { ...updated, masteryVia: "natural" as const }
        : updated;
    return {
      ...updated,
      state: decision.state,
      stateSince: order,
      ...(decision.state === "REGRESSED"
        ? {
            epoch: order,
            training: [],
            transfer: [],
            practiceLevel: 0 as const,
            waiting: [],
            assessments: [],
            checkOrder: null,
            naturalSinceCheck: 0,
            masteryVia: null,
            assessmentFailure: null,
          }
        : {}),
      ...(decision.state === "TRANSFER_CHECK"
        ? {
            checkOrder: order,
            waiting: [],
            naturalSinceCheck: 0,
            assessments: [],
            assessmentFailure: null,
          }
        : {}),
      ...(decision.state === "PROVISIONAL_MASTERY"
        ? { masteryVia: "natural" as const }
        : {}),
    };
  });
  track(next, after, order, ordinary);
  // Prefer current actionable records; ties use last observation then scalar identity.
  next.sort(
    (a, b) =>
      Number(a.state === "PROVISIONAL_MASTERY") -
        Number(b.state === "PROVISIONAL_MASTERY") ||
      b.lastSeen - a.lastSeen ||
      compareUnicode(weaknessKey(a.identity), weaknessKey(b.identity)),
  );
  return freezeProfileValue({
    version: 2 as const,
    order,
    variants: current.variants ?? [],
    ordinary,
    records: next
      .slice(0, T.records)
      .sort((a, b) =>
        compareUnicode(weaknessKey(a.identity), weaknessKey(b.identity)),
      ),
    processedSessionIds: [
      ...current.processedSessionIds,
      evidence.summary.sessionId,
    ].slice(-T.dedupe),
  });
}
