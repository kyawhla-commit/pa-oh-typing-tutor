import type { LearningService } from "../learning/service";
import type { TypingSession } from "../typing/useTypingSession";
import { stableHash } from "../learning/exercises/identity";
import { sourceReference } from "../learning/planner/outcomes/identity";
import { weaknessKey } from "../learning/transfer/classify";
import { recommendationIdentity } from "../learning/transfer/classify";
import { recommendWithMastery } from "../learning/transfer";
import type { SessionSummary } from "../learning/types";
import type { Milestone } from "./types";
import { validateMilestone } from "./schema";
import { pilotEventId } from "./recorder";
export function completionMilestone(summary: SessionSummary): Milestone {
  const source = summary.sourceIdentity,
    check = source?.type === "adaptive" && source.id.startsWith("assessment-");
  return {
    eventId: pilotEventId(`completed:${summary.sessionId}`),
    eventType: check ? "mastery-check-completed" : "activity-completed",
    ...(source
      ? {
          sourceReference: sourceReference(source),
          sourceVersionReference: `version-${stableHash(source.version)}`,
        }
      : {}),
    metrics: {
      mode: summary.mode,
      correctWpm: summary.correctWpm,
      attemptAccuracy: summary.attemptAccuracy,
      attempts: summary.totalAttempts,
      errors: summary.incorrectAttempts,
      correctedErrors: summary.correctedErrors,
      completionReason: summary.completionReason,
    },
  };
}
/** Passive, read-only subscriptions to existing offer/outcome and run lifecycle channels.
 * No input/feedback subscription, evidence ingestion, scoring or learning writes. */
export function createPassivePilotObserver(
  service: LearningService,
  scope: string,
  sink: (event: Milestone) => void,
) {
  const seen = new Set<string>(),
    initial = service.getSnapshot(scope).profile.recent.map((s) => s.sessionId),
    accepted = new Set(initial);
  const emit = (event: Milestone) => {
    if (seen.has(event.eventId)) return;
    seen.add(event.eventId);
    if (seen.size > 1000) seen.delete(seen.values().next().value!);
    try {
      sink(validateMilestone(event));
    } catch {
      /* capture failures cannot interrupt learning subscribers */
    }
  };
  const poll = () => {
    const state = service.getOutcomeSnapshot(scope),
      current = state.current;
    if (current) {
      const snapshot = service.getSnapshot(scope),
        record = snapshot.mastery.records.find(
          (r) =>
            `weakness-${stableHash(weaknessKey(r.identity))}` ===
            current.weaknessId,
        );
      const recommendation = recommendWithMastery(
        snapshot.profile,
        snapshot.mastery,
      ).find(({ recommendation: r }) => {
        const id = recommendationIdentity(r);
        return (
          id && `weakness-${stableHash(weaknessKey(id))}` === current.weaknessId
        );
      })?.recommendation;
      const metadata = {
        actionType: current.activityType,
        ...(record ? { masteryState: record.state } : {}),
        ...(recommendation ? { recommendationType: recommendation.type } : {}),
        ...(current.sourceReference
          ? { sourceReference: current.sourceReference }
          : {}),
        ...(current.activityType === "normal-practice"
          ? {}
          : {
              progressionLevel:
                current.activityType === "targeted-practice"
                  ? (0 as const)
                  : (record?.practiceLevel ?? (1 as const)),
            }),
      };
      emit({
        eventId: pilotEventId(`shown:${current.attemptId}`),
        eventType: "recommendation-shown",
        ...metadata,
      });
      if (current.lifecycle === "started")
        emit({
          eventId: pilotEventId(`start:${current.attemptId}`),
          eventType:
            current.activityType === "controlled-assessment"
              ? "mastery-check-started"
              : "activity-started",
          ...metadata,
        });
    }
    for (const outcome of state.recent) {
      if (outcome.outcome !== "completed")
        emit({
          eventId: pilotEventId(`outcome:${outcome.attemptId}`),
          eventType:
            outcome.outcome === "skipped"
              ? "activity-skipped"
              : outcome.outcome === "cancelled"
                ? "activity-cancelled"
                : "activity-abandoned",
          actionType: outcome.activityType,
        });
    }
    for (const summary of service.getSnapshot(scope).profile.recent)
      if (!accepted.has(summary.sessionId)) {
        accepted.add(summary.sessionId);
        emit(completionMilestone(summary));
      }
    if (accepted.size > 512)
      for (const id of [...accepted].slice(0, accepted.size - 512))
        accepted.delete(id);
  };
  const unsubscribe = service.subscribe(scope, poll);
  poll();
  return {
    dispose: unsubscribe,
    observeSession: (session: TypingSession) => {
      const handle = () => {
        const run = session.run.getSnapshot();
        if (run.status === "ready" || run.status === "completed") return;
        const attempt = service.getOutcomeSnapshot(scope).current;
        if (attempt?.lifecycle === "started") return; // planned intent/outcome is observed at the authoritative service boundary
        const snapshot = session.feedback.getSnapshot().snapshot,
          check = snapshot.sourceIdentity?.id.startsWith("assessment-");
        if (run.status === "running")
          emit({
            eventId: pilotEventId(`run-start:${run.id}`),
            eventType: check ? "mastery-check-started" : "activity-started",
            ...(snapshot.sourceIdentity
              ? {
                  sourceReference: sourceReference(snapshot.sourceIdentity),
                  sourceVersionReference: `version-${stableHash(snapshot.sourceIdentity.version)}`,
                }
              : {}),
          });
        if (run.status === "aborted")
          emit({
            eventId: pilotEventId(`run-cancel:${run.id}`),
            eventType: "activity-cancelled",
          });
      };
      const off = session.run.subscribe(handle);
      handle();
      return off;
    },
  };
}
