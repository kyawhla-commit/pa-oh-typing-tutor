import type { SessionResult } from "../../engine/typing";
import { extractLearningEvidence } from "./evidence";
import { applyLearningEvidence } from "./profile";
import { loadProfile, saveProfile, type ProfileStorage } from "./storage";
import {
  advanceMastery,
  loadMastery,
  saveMastery,
  type MasteryProfile,
  type AdaptiveAttribution,
} from "./transfer";
import { selectAdaptivePractice } from "./exercises/selection";
import { practiceSpec } from "./recommendations";
import { learningActionWithVariants, actionText } from "./progression/actions";
import {
  advanceVariant,
  nextVariant,
  variantKey,
} from "./progression/variants";
import { recommendationIdentity, weaknessKey } from "./transfer/classify";
import { freezeProfileValue } from "./aggregation";
import type { PracticeRecommendation } from "./types";
import type { LearnerTypingProfile, SessionSummary } from "./types";
import { classifyEvidence } from "./transfer/classify";
import {
  activityReference,
  completionReference,
  sourceReference,
  outcomeScope,
  transitionOutcome,
  loadOutcomeState,
  saveOutcomeState,
  type PlannerOutcomeState,
  type ActivityAttempt,
  type OutcomeEvent,
} from "./planner/outcomes";
import {
  createPlannerContext,
  planLearningSession,
  loadPlannerHistory,
  savePlannerHistory,
  advancePlannerHistory,
  type PlannerHistory,
  type LearningSessionPlan,
} from "./planner";
import { secondaryAllowed } from "./planner/diversity";
import { selectionWithMastery } from "./transfer/recommendations";
import type { AdaptiveSelection } from "./exercises/selection";
export type PlannedStartResult =
  | { readonly ok: true; readonly selection: AdaptiveSelection | null }
  | {
      readonly ok: false;
      readonly code: "stale-plan";
      readonly reason: string;
    };

export interface LearningSnapshot {
  readonly profile: LearnerTypingProfile;
  readonly persisted: boolean;
  readonly mastery: MasteryProfile;
}
/** Completed-boundary work is deferred; nothing in this service observes keys/input. */
export function createLearningService(
  storage: ProfileStorage,
  schedule: (job: () => void) => void = (job) => setTimeout(job, 0),
) {
  const stores = new Map<
    string,
    {
      snapshot: LearningSnapshot;
      listeners: Set<() => void>;
      history: PlannerHistory;
      activePlan: LearningSessionPlan | null;
      outcomes: PlannerOutcomeState;
      outcomesPersisted: boolean;
      lease: { attemptId: string; token: number } | null;
      mountSequence: number;
    }
  >();
  const pending = new Set<string>();
  const matchesCompletion = (
    attempt: ActivityAttempt,
    summary: SessionSummary,
  ) =>
    summary.mode === "fixed-text" &&
    (attempt.sourceReference
      ? summary.sourceIdentity?.type === "adaptive" &&
        sourceReference(summary.sourceIdentity) === attempt.sourceReference
      : classifyEvidence(summary) === "ordinary-practice");
  const store = (scope: string) => {
    let value = stores.get(scope);
    if (!value) {
      const profile = loadProfile(storage, scope);
      let outcomes = loadOutcomeState(storage, scope);
      // A new service cannot know whether another tab still owns a pending
      // activity. Reconcile only already-accepted completion; otherwise discard
      // its intention without inventing a user outcome or an abandonment cause.
      if (outcomes.current) {
        const current = outcomes.current,
          accepted =
            current.lifecycle === "started" && current.runId
              ? profile.recent.find(
                  (row) =>
                    row.sessionId === current.runId &&
                    matchesCompletion(current, row),
                )
              : null;
        outcomes = accepted
          ? transitionOutcome(outcomes, {
              type: "completed",
              attemptId: current.attemptId,
              completionReference: completionReference(accepted.sessionId),
            }).state
          : freezeProfileValue({ ...outcomes, current: null });
      }
      value = {
        snapshot: {
          profile,
          mastery: loadMastery(storage, scope, profile),
          persisted: true,
        },
        listeners: new Set(),
        history: loadPlannerHistory(storage, scope, profile.sessionCount),
        activePlan: null,
        outcomes,
        outcomesPersisted: true,
        lease: null,
        mountSequence: 0,
      };
      stores.set(scope, value);
    }
    return value;
  };
  const recordOutcome = (scope: string, event: OutcomeEvent, notify = true) => {
    const value = store(scope),
      transition = transitionOutcome(value.outcomes, event);
    if (transition.changed) {
      value.outcomes = transition.state;
      value.outcomesPersisted = saveOutcomeState(
        storage,
        scope,
        transition.state,
      );
      if (notify) for (const listener of value.listeners) listener();
    }
    return transition;
  };
  const refresh = (scope: string) => {
    const value = store(scope);
    if (
      value.outcomesPersisted &&
      value.outcomes.current?.lifecycle !== "started"
    ) {
      const disk = loadOutcomeState(storage, scope);
      if (
        disk.sequence > value.outcomes.sequence ||
        (disk.sequence === value.outcomes.sequence &&
          JSON.stringify(disk.recent) !== JSON.stringify(value.outcomes.recent))
      )
        value.outcomes = freezeProfileValue({ ...disk, current: null });
    }
    if (value.snapshot.persisted) {
      const disk = loadProfile(storage, scope);
      if (disk.sessionCount >= value.snapshot.profile.sessionCount) {
        if (disk.sessionCount > value.snapshot.profile.sessionCount)
          value.history = loadPlannerHistory(storage, scope, disk.sessionCount);
        value.snapshot = {
          profile: disk,
          mastery: loadMastery(storage, scope, disk),
          persisted: true,
        };
      }
    }
    return value;
  };
  const currentPlan = (scope: string) => {
    const value = store(scope);
    return planLearningSession(
      createPlannerContext(
        scope,
        value.snapshot.profile,
        value.snapshot.mastery,
        value.history,
        value.outcomes.recent.map(({ activityKey, outcome, sequence }) => ({
          activityKey,
          outcome,
          sequence,
        })),
      ),
    );
  };
  const service = {
    getOutcomeSnapshot: (scope: string) => store(scope).outcomes,
    offerPlanned: (
      scope: string,
      plan: LearningSessionPlan,
      slot: "primary" | "secondary" = "primary",
    ) => {
      const value = store(scope);
      const valid =
        plan.learnerScope === scope &&
        (slot === "primary"
          ? JSON.stringify(plan) === JSON.stringify(currentPlan(scope))
          : service.canContinuePlanned(scope, plan));
      if (!valid) return { ok: false as const, code: "stale-plan" as const };
      const transition = recordOutcome(scope, {
        type: "offer",
        activity: activityReference(plan, slot),
      });
      return transition.state.current &&
        transition.code !== "invalid-transition"
        ? { ok: true as const, attempt: transition.state.current }
        : { ok: false as const, code: "invalid-transition" as const };
    },
    skipPlanned: (scope: string, attemptId: string) =>
      recordOutcome(scope, { type: "skipped", attemptId }),
    cancelPlanned: (
      scope: string,
      attemptId: string,
      run: { id: string; status: string },
    ) => {
      const current = store(scope).outcomes.current;
      if (
        run.status !== "aborted" ||
        (current?.attemptId === attemptId &&
          current.runId !== null &&
          current.runId !== run.id)
      )
        return {
          state: store(scope).outcomes,
          changed: false,
          code: "invalid-transition" as const,
        };
      return recordOutcome(scope, { type: "cancelled", attemptId });
    },
    bindPlannedRun: (scope: string, attemptId: string, runId: string) => {
      const current = store(scope).outcomes.current;
      if (
        current?.runId &&
        current.runId !== runId &&
        pending.has(JSON.stringify([scope, current.runId]))
      )
        return {
          state: store(scope).outcomes,
          changed: false,
          code: "duplicate" as const,
        };
      return recordOutcome(scope, { type: "bind-run", attemptId, runId });
    },
    attachPlanned: (scope: string, attemptId: string) => {
      const value = store(scope),
        token = ++value.mountSequence;
      value.lease = { attemptId, token };
      return token;
    },
    releasePlanned: (
      scope: string,
      attemptId: string,
      token: number,
      hasResult: boolean,
      onAborted: () => void,
    ) => {
      queueMicrotask(() => {
        const value = store(scope);
        if (value.lease?.token !== token || value.lease.attemptId !== attemptId)
          return;
        value.lease = null;
        if (
          !hasResult &&
          !(
            value.outcomes.current?.runId &&
            pending.has(JSON.stringify([scope, value.outcomes.current.runId]))
          )
        ) {
          const transition = recordOutcome(scope, {
            type: "abandoned",
            attemptId,
          });
          if (transition.changed) onAborted();
        }
      });
    },
    getPlannerHistory: (scope: string) => store(scope).history,
    planSession: currentPlan,
    startPlanned: (
      scope: string,
      plan: LearningSessionPlan,
      slot: "primary" | "secondary" = "primary",
    ): PlannedStartResult => {
      const stale = (): PlannedStartResult => {
        const current = store(scope).outcomes.current;
        if (current?.planId === plan.id && current.lifecycle === "offered")
          recordOutcome(scope, {
            type: "supersede",
            attemptId: current.attemptId,
          });
        return {
          ok: false,
          code: "stale-plan",
          reason:
            "Your session focus has changed. Start the current session plan.",
        };
      };
      const markStarted = () => {
        const offered = service.offerPlanned(scope, plan, slot);
        return offered.ok
          ? recordOutcome(scope, {
              type: "start",
              attemptId: offered.attempt.attemptId,
            }).code !== "invalid-transition"
          : false;
      };
      const value = refresh(scope);
      if (
        plan.learnerScope !== scope ||
        value.outcomes.current?.lifecycle === "started"
      )
        return stale();
      if (slot === "secondary") {
        if (!service.canContinuePlanned(scope, plan)) return stale();
        if (!markStarted()) return stale();
        value.activePlan = null;
        return { ok: true, selection: null };
      }
      const fresh = currentPlan(scope);
      if (JSON.stringify(plan) !== JSON.stringify(fresh)) return stale();
      const primary = fresh.primaryAction;
      if (primary.actionType === "normal-practice") {
        if (!markStarted()) return stale();
        value.activePlan = null;
        return { ok: true, selection: null };
      }
      const recommendation = selectionWithMastery(
        value.snapshot.profile,
        value.snapshot.mastery,
      ).visible.find(
        (v) => v.recommendation.id === primary.recommendationId,
      )?.recommendation;
      if (!recommendation) return stale();
      const offered = service.offerPlanned(scope, fresh);
      if (!offered.ok) return stale();
      const result = service.startAdaptive(scope, recommendation);
      if (!result.ok) return stale();
      recordOutcome(scope, {
        type: "start",
        attemptId: offered.attempt.attemptId,
      });
      value.activePlan = fresh;
      return result;
    },
    canContinuePlanned: (scope: string, plan: LearningSessionPlan): boolean => {
      const value = store(scope);
      if (
        plan.learnerScope !== scope ||
        !value.activePlan ||
        JSON.stringify(value.activePlan) !== JSON.stringify(plan) ||
        !plan.optionalSecondaryAction
      )
        return false;
      if (
        !value.outcomes.recent.some(
          (o) =>
            o.planId === plan.id &&
            o.slot === "primary" &&
            o.outcome === "completed",
        ) ||
        value.outcomes.recent.some(
          (o) => o.planId === plan.id && o.slot === "secondary",
        )
      )
        return false;
      const last = value.history.recent.at(-1),
        primary = plan.primaryAction;
      if (
        value.history.order <= plan.createdFromEvidenceVersion.sessions ||
        last?.activityKey !== primary.activityKey ||
        primary.target.type !== "adaptive" ||
        last.sourceId !== primary.target.sourceId
      )
        return false;
      const context = createPlannerContext(
        scope,
        value.snapshot.profile,
        value.snapshot.mastery,
        value.history,
      );
      return secondaryAllowed(
        primary,
        context.options,
        context.visibleNeedKeys,
      );
    },
    getSnapshot: (scope: string) => store(scope).snapshot,
    subscribe: (scope: string, listener: () => void) => {
      const value = store(scope);
      value.listeners.add(listener);
      return () => {
        value.listeners.delete(listener);
      };
    },
    startAdaptive: (scope: string, recommendation: PracticeRecommendation) => {
      const value = refresh(scope);
      value.activePlan = null;
      const identity = recommendationIdentity(recommendation),
        mastery = value.snapshot.mastery;
      const record = identity
        ? (mastery.records.find(
            (r) => weaknessKey(r.identity) === weaknessKey(identity),
          ) ?? null)
        : null;
      const action = learningActionWithVariants(
        record,
        recommendation,
        mastery,
        scope,
      );
      // General adaptive content remains available without inventing a weakness.
      if (
        (action.type === "normal-practice" &&
          recommendation.type !== "GENERAL_PRACTICE") ||
        action.type === "none"
      )
        return {
          ok: false as const,
          code: "invalid-spec" as const,
          reason: "The current learning action calls for normal practice.",
          attempts: 0,
        };
      const purpose =
        action.type === "controlled-assessment"
          ? ("controlled-transfer-assessment" as const)
          : ("training" as const);
      const level = "progressionLevel" in action ? action.progressionLevel : 0;
      const key = variantKey(practiceSpec(recommendation), purpose),
        ordinal = nextVariant(mastery.variants ?? [], key);
      const result = selectAdaptivePractice(recommendation, scope, {
        composition: { level, ordinal, purpose },
        action,
        explanation: actionText(action, record).message,
        ...(purpose === "controlled-transfer-assessment"
          ? { assessmentCheckOrder: record?.checkOrder ?? record?.stateSince }
          : {}),
      });
      if (!result.ok) return result;
      try {
        const next = freezeProfileValue({
          ...mastery,
          version: 2 as const,
          variants: advanceVariant(mastery.variants ?? [], key, ordinal),
        });
        value.snapshot = {
          ...value.snapshot,
          mastery: next,
          persisted:
            saveMastery(storage, scope, next) && value.snapshot.persisted,
        };
        for (const listener of value.listeners) listener();
        return result;
      } catch {
        return {
          ok: false as const,
          code: "invalid-spec" as const,
          reason: "A bounded variant could not be reserved.",
          attempts: 0,
        };
      }
    },
    complete: (
      scope: string | null,
      sessionId: string,
      result: SessionResult | null,
      recordedAt: number,
      attribution?: AdaptiveAttribution,
    ) => {
      if (!scope || !result || result.status !== "completed") return;
      const key = JSON.stringify([scope, sessionId]);
      if (pending.has(key)) return;
      const capturedAttribution = attribution
        ? {
            ...attribution,
            focusItems: [...attribution.focusItems],
            ...(attribution.composition
              ? { composition: { ...attribution.composition } }
              : {}),
          }
        : undefined;
      pending.add(key);
      schedule(() => {
        try {
          const evidence = extractLearningEvidence(
            result,
            sessionId,
            recordedAt,
          );
          if (!evidence) return;
          const value = store(scope);
          // Re-read at the boundary so another service/tab's completed write is
          // normally observed. localStorage offers no cross-tab transaction.
          const disk = loadProfile(storage, scope);
          const base =
            value.snapshot.persisted &&
            disk.sessionCount > value.snapshot.profile.sessionCount
              ? disk
              : value.snapshot.profile;
          const profile = applyLearningEvidence(base, evidence);
          if (profile === base) {
            if (base !== value.snapshot.profile) {
              value.history = loadPlannerHistory(
                storage,
                scope,
                base.sessionCount,
              );
              value.snapshot = {
                profile: base,
                mastery: loadMastery(storage, scope, base),
                persisted: true,
              };
              for (const listener of value.listeners) listener();
            }
            return;
          }
          const previousMastery =
            base === value.snapshot.profile
              ? value.snapshot.mastery
              : loadMastery(storage, scope, base);
          const mastery = advanceMastery(
            previousMastery,
            base,
            profile,
            evidence,
            capturedAttribution,
          );
          const persisted =
            saveProfile(storage, scope, profile) &&
            saveMastery(storage, scope, mastery);
          const previousHistory =
            base === value.snapshot.profile
              ? value.history
              : loadPlannerHistory(storage, scope, base.sessionCount);
          value.history = advancePlannerHistory(
            previousHistory,
            evidence.summary,
            profile.sessionCount,
            capturedAttribution,
          );
          savePlannerHistory(storage, scope, value.history);
          value.snapshot = { profile, mastery, persisted };
          const attempt = value.outcomes.current;
          if (
            attempt?.lifecycle === "started" &&
            (attempt.runId === sessionId ||
              (attempt.runId === null && attempt.sourceReference !== null)) &&
            matchesCompletion(attempt, evidence.summary)
          )
            recordOutcome(
              scope,
              {
                type: "completed",
                attemptId: attempt.attemptId,
                completionReference: completionReference(sessionId),
              },
              false,
            );
          for (const listener of value.listeners) listener();
        } finally {
          pending.delete(key);
        }
      });
    },
  };
  return service;
}
export type LearningService = ReturnType<typeof createLearningService>;
let browserService: LearningService | undefined;
export function getLearningService(): LearningService {
  browserService ??= createLearningService({
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  });
  return browserService;
}
