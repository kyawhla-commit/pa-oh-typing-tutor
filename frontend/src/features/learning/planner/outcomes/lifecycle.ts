import { readActivityReference } from "./validation";
import { freezeProfileValue } from "../../aggregation";
import type {
  ActivityReference,
  OutcomeEvent,
  OutcomeTransition,
  PlannerOutcomeState,
  PlannerActivityOutcome,
} from "./types";
export const OUTCOMES = Object.freeze({
  version: 1 as const,
  maxRecent: 5,
  maxBytes: 4096,
});
export const emptyOutcomeState = (learnerScope: string): PlannerOutcomeState =>
  freezeProfileValue({
    version: 1 as const,
    learnerScope,
    sequence: 0,
    current: null,
    recent: [],
  });
/** A pure planner/UX reducer. It never touches evidence, metrics or mastery. */
export function transitionOutcome(
  state: PlannerOutcomeState,
  event: OutcomeEvent,
): OutcomeTransition {
  const result = (
    next: PlannerOutcomeState,
    code: OutcomeTransition["code"],
  ): OutcomeTransition => ({ state: next, changed: next !== state, code });
  if (event.type === "offer") {
    let activity: ActivityReference;
    try {
      activity = readActivityReference(event.activity, state.learnerScope);
    } catch {
      return result(state, "invalid-transition");
    }
    if (
      event.activity.learnerScope !== state.learnerScope ||
      !Number.isSafeInteger(state.sequence + 1)
    )
      return result(state, "invalid-transition");
    if (state.current) {
      const {
        attemptId: _,
        sequence: __,
        lifecycle: ___,
        runId: ____,
        ...ref
      } = state.current;
      if (JSON.stringify(ref) === JSON.stringify(activity))
        return result(state, "duplicate");
      if (state.current.lifecycle === "started")
        return result(state, "invalid-transition");
    }
    const sequence = state.sequence + 1;
    return result(
      freezeProfileValue({
        ...state,
        sequence,
        current: {
          ...activity,
          attemptId: `attempt-${state.learnerScope.slice(14)}-${sequence}`,
          sequence,
          lifecycle: "offered" as const,
          runId: null,
        },
      }),
      "accepted",
    );
  }
  const current = state.current;
  if (!current || current.attemptId !== event.attemptId) {
    const previous = state.recent.find((o) => o.attemptId === event.attemptId);
    return result(
      state,
      previous && "outcome" in previous && previous.outcome === event.type
        ? "duplicate"
        : "inactive-attempt",
    );
  }
  if (event.type === "supersede")
    return current.lifecycle === "offered"
      ? result(freezeProfileValue({ ...state, current: null }), "accepted")
      : result(state, "invalid-transition");
  if (event.type === "start")
    return current.lifecycle === "started"
      ? result(state, "duplicate")
      : result(
          freezeProfileValue({
            ...state,
            current: { ...current, lifecycle: "started" as const },
          }),
          "accepted",
        );
  if (event.type === "bind-run") {
    if (
      current.lifecycle !== "started" ||
      !/^[a-zA-Z0-9:_-]{1,128}$/.test(event.runId)
    )
      return result(state, "invalid-transition");
    return current.runId === event.runId
      ? result(state, "duplicate")
      : result(
          freezeProfileValue({
            ...state,
            current: { ...current, runId: event.runId },
          }),
          "accepted",
        );
  }
  if (
    (event.type === "skipped" && current.lifecycle !== "offered") ||
    (event.type !== "skipped" && current.lifecycle !== "started") ||
    (event.type === "completed" &&
      !/^completion-[a-f0-9]{16}$/.test(event.completionReference ?? ""))
  )
    return result(state, "invalid-transition");
  const { lifecycle: _, runId: __, ...ref } = current;
  const outcome: PlannerActivityOutcome = {
    ...ref,
    outcome: event.type,
    completionReference:
      event.type === "completed" ? event.completionReference! : null,
  };
  return result(
    freezeProfileValue({
      ...state,
      current: null,
      recent: [...state.recent, outcome].slice(-OUTCOMES.maxRecent),
    }),
    "accepted",
  );
}
export function planDisposition(
  planId: string,
  hasSecondary: boolean,
  state: PlannerOutcomeState,
) {
  const recent = state.recent.filter((o) => o.planId === planId),
    primary = recent.find((o) => o.slot === "primary"),
    secondary = recent.find((o) => o.slot === "secondary");
  if (primary?.outcome === "completed")
    return !hasSecondary || secondary
      ? ("completed" as const)
      : ("primary-completed" as const);
  if (primary?.outcome === "skipped") return "declined" as const;
  if (primary?.outcome === "cancelled") return "cancelled" as const;
  if (primary?.outcome === "abandoned") return "abandoned" as const;
  return state.current?.planId === planId
    ? ("open" as const)
    : ("superseded" as const);
}
