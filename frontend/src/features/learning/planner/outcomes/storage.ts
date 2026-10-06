import { freezeProfileValue } from "../../aggregation";
import type { ProfileStorage } from "../../storage";
import { readActivityReference } from "./validation";
import { outcomeScope } from "./identity";
import { emptyOutcomeState, OUTCOMES } from "./lifecycle";
import type {
  ActivityAttempt,
  PlannerActivityOutcome,
  PlannerOutcomeState,
  TerminalOutcome,
} from "./types";
export const outcomeStorageKey = (scope: string) =>
  `typing-learning-outcomes:v1:${outcomeScope(scope)}`;
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw Error();
  return v as Record<string, unknown>;
};
const sequence = (v: unknown) => {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) throw Error();
  return v;
};
const opaque = (v: unknown, prefix: string) => {
  if (typeof v !== "string" || !new RegExp(`^${prefix}-[a-f0-9]{16}$`).test(v))
    throw Error();
  return v;
};
function attempt(value: unknown, scope: string) {
  const o = object(value),
    ref = readActivityReference(o, scope),
    n = sequence(o.sequence);
  if (!n || o.attemptId !== `attempt-${scope.slice(14)}-${n}`) throw Error();
  return { ...ref, attemptId: o.attemptId as string, sequence: n };
}
export function parseOutcomeState(
  text: string | null,
  scope: string,
): PlannerOutcomeState {
  const learnerScope = outcomeScope(scope);
  try {
    if (!text || new TextEncoder().encode(text).length > OUTCOMES.maxBytes)
      return emptyOutcomeState(learnerScope);
    const o = object(JSON.parse(text));
    if (
      o.version !== 1 ||
      o.learnerScope !== learnerScope ||
      !Array.isArray(o.recent) ||
      o.recent.length > OUTCOMES.maxRecent
    )
      throw Error();
    const n = sequence(o.sequence);
    const recent = o.recent.map((value: unknown): PlannerActivityOutcome => {
      const row = object(value),
        ref = attempt(row, learnerScope);
      if (
        !["completed", "cancelled", "skipped", "abandoned"].includes(
          row.outcome as string,
        ) ||
        (row.outcome !== "completed" && row.completionReference !== null)
      )
        throw Error();
      return {
        ...ref,
        outcome: row.outcome as TerminalOutcome,
        completionReference:
          row.outcome === "completed"
            ? opaque(row.completionReference, "completion")
            : null,
      };
    });
    let current: ActivityAttempt | null = null;
    if (o.current !== null) {
      const row = object(o.current),
        ref = attempt(row, learnerScope);
      if (
        !["offered", "started"].includes(row.lifecycle as string) ||
        (row.runId !== null &&
          (typeof row.runId !== "string" ||
            !/^[a-zA-Z0-9:_-]{1,128}$/.test(row.runId))) ||
        (row.lifecycle === "offered" && row.runId !== null)
      )
        throw Error();
      current = {
        ...ref,
        lifecycle: row.lifecycle as ActivityAttempt["lifecycle"],
        runId: row.runId as string | null,
      };
    }
    if (
      recent.some(
        (row, i) =>
          row.sequence > n || (i > 0 && recent[i - 1].sequence >= row.sequence),
      ) ||
      (current &&
        (current.sequence !== n ||
          (recent.at(-1)?.sequence ?? 0) >= current.sequence))
    )
      throw Error();
    return freezeProfileValue({
      version: 1 as const,
      learnerScope,
      sequence: n,
      current,
      recent,
    });
  } catch {
    return emptyOutcomeState(learnerScope);
  }
}
export function loadOutcomeState(storage: ProfileStorage, scope: string) {
  try {
    return parseOutcomeState(storage.getItem(outcomeStorageKey(scope)), scope);
  } catch {
    return emptyOutcomeState(outcomeScope(scope));
  }
}
export function serializeOutcomeState(state: PlannerOutcomeState) {
  const text = JSON.stringify(state);
  if (new TextEncoder().encode(text).length > OUTCOMES.maxBytes)
    throw Error("Outcome state exceeds its byte cap.");
  return text;
}
export function saveOutcomeState(
  storage: ProfileStorage,
  scope: string,
  state: PlannerOutcomeState,
) {
  try {
    storage.setItem(outcomeStorageKey(scope), serializeOutcomeState(state));
    return true;
  } catch {
    return false;
  }
}
