import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getLearningService } from "../../service";
import type { TypingSession } from "../../../typing/useTypingSession";
import { emptyOutcomeState } from "./lifecycle";
import { outcomeScope } from "./identity";
const unavailable = emptyOutcomeState(outcomeScope("unavailable"));
export function usePlannerOutcomes(
  scope: string | null,
  service = getLearningService(),
) {
  const subscribe = useCallback(
    (listener: () => void) =>
      scope ? service.subscribe(scope, listener) : () => {},
    [scope, service],
  );
  const snapshot = useCallback(
    () => (scope ? service.getOutcomeSnapshot(scope) : unavailable),
    [scope, service],
  );
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
/** Observe run identity/lifecycle only, never input or scoring. Deferred release
 * distinguishes real unmount from StrictMode effect replay. No unload handler. */
export function usePlannedAttempt(
  session: TypingSession,
  scope: string | null,
  attemptId: string | null,
  service = getLearningService(),
) {
  useEffect(() => {
    if (!scope || !attemptId) return;
    const token = service.attachPlanned(scope, attemptId);
    const bind = () =>
      service.bindPlannedRun(scope, attemptId, session.run.getSnapshot().id);
    const unsubscribe = session.run.subscribe(bind);
    bind();
    return () => {
      unsubscribe();
      service.releasePlanned(
        scope,
        attemptId,
        token,
        !!session.run.getSnapshot().result,
        () => session.abort(),
      );
    };
  }, [scope, attemptId, session, service]);
}
