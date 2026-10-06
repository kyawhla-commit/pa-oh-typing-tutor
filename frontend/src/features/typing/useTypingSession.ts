import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { createTypingEngine, type SessionSnapshot, type TypingEngineConfig } from "../../engine/typing";

function channel<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => value,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    publish: (next: T) => {
      if (next === value) return;
      value = next;
      for (const listener of listeners) listener();
    },
  };
}

export interface TypingFeedback {
  readonly snapshot: SessionSnapshot;
  readonly generation: number;
  readonly pressedKey: string;
  readonly errorKey: string;
}

/** Feature-owned subscriptions; the domain engine stays synchronous and DOM-independent. */
export function createTypingSession(config: TypingEngineConfig, now = () => performance.now()) {
  const engine = createTypingEngine(config);
  const feedback = channel<TypingFeedback>({ snapshot: engine.getSnapshot(), generation: 0, pressedKey: "", errorKey: "" });
  const stats = channel(engine.getSnapshot());
  const result = channel(engine.getResult());
  // Feature-owned identity survives controller remount/effect replay. It is never
  // part of core timing/scoring and changes only on intentional restart.
  const run = channel({ id: crypto.randomUUID() as string, result: engine.getResult(), status: engine.getSnapshot().status });
  const publishResult = () => {
    const completed = engine.getResult();
    result.publish(completed);
    const status = engine.getSnapshot().status;
    if(run.getSnapshot().result !== completed || run.getSnapshot().status !== status) run.publish({ ...run.getSnapshot(), result: completed, status });
  };
  const publishInput = (key: string) => {
    const snapshot = engine.getSnapshot();
    const last = snapshot.typedUnits[snapshot.typedUnits.length - 1];
    feedback.publish({ ...feedback.getSnapshot(), snapshot, pressedKey: key, errorKey: key !== "Backspace" && last && !last.correct ? key : "" });
    // Metrics refresh at 4 Hz, with immediate initial/final values.
    if (stats.getSnapshot().status !== snapshot.status) stats.publish(snapshot);
    publishResult();
  };
  const publishLifecycle = () => {
    const snapshot = engine.getSnapshot();
    if (feedback.getSnapshot().snapshot.status !== snapshot.status) {
      feedback.publish({ ...feedback.getSnapshot(), snapshot, pressedKey: "", errorKey: "" });
    }
    if (stats.getSnapshot().status !== snapshot.status) stats.publish(snapshot);
    publishResult();
  };
  const lifecycle = (type: "PAUSE" | "RESUME" | "ABORT") => {
    const outcome = engine.dispatch({ type, atMs: now() });
    publishLifecycle();
    return outcome;
  };
  return {
    feedback, stats, result, run,
    insertText: (text: string) => {
      const outcome = engine.dispatch({ type: "INSERT_TEXT", text, atMs: now() });
      if (outcome.accepted) publishInput(engine.getSnapshot().typedUnits[engine.getSnapshot().typedUnits.length - 1]?.text ?? text);
      publishLifecycle();
      return outcome;
    },
    deleteBackward: () => {
      const outcome = engine.dispatch({ type: "DELETE_BACKWARD", atMs: now() });
      if (outcome.accepted) publishInput("Backspace");
      publishLifecycle();
      return outcome;
    },
    tick: () => {
      if (engine.getSnapshot().status !== "running") return;
      engine.dispatch({ type: "TICK", atMs: now() });
      stats.publish(engine.getSnapshot());
      publishLifecycle();
    },
    pause: () => lifecycle("PAUSE"),
    resume: () => lifecycle("RESUME"),
    abort: () => lifecycle("ABORT"),
    clearHighlight: () => {
      const current = feedback.getSnapshot();
      if (current.pressedKey || current.errorKey) feedback.publish({ ...current, pressedKey: "", errorKey: "" });
    },
    restart: (next?: TypingEngineConfig) => {
      engine.reset(next);
      feedback.publish({ snapshot: engine.getSnapshot(), generation: feedback.getSnapshot().generation + 1, pressedKey: "", errorKey: "" });
      stats.publish(engine.getSnapshot());
      result.publish(null);
      run.publish({ id: crypto.randomUUID(), result: null, status: engine.getSnapshot().status });
    },
  };
}

export type TypingSession = ReturnType<typeof createTypingSession>;
export const TypingSessionObserverContext = createContext<((session: TypingSession) => (() => void)) | null>(null);

export function useTypingSession(config: TypingEngineConfig): TypingSession {
  // Props/catalog updates cannot replace an in-flight target. Only restart adopts it.
  const [session] = useState(() => createTypingSession(config));
  // Optional feature observer sees lifecycle milestones only; engine/scoring stay unchanged.
  const observe = useContext(TypingSessionObserverContext);
  useEffect(() => observe?.(session), [observe, session]);
  useEffect(() => {
    const interval = window.setInterval(session.tick, 250);
    let highlight: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = session.feedback.subscribe(() => {
      clearTimeout(highlight);
      if (session.feedback.getSnapshot().pressedKey) highlight = setTimeout(session.clearHighlight, 140);
    });
    return () => { window.clearInterval(interval); clearTimeout(highlight); unsubscribe(); };
  }, [session]);
  return session;
}

export function useTypingFeedback(session: TypingSession) {
  return useSyncExternalStore(session.feedback.subscribe, session.feedback.getSnapshot, session.feedback.getSnapshot);
}
export function useTypingStats(session: TypingSession) {
  return useSyncExternalStore(session.stats.subscribe, session.stats.getSnapshot, session.stats.getSnapshot);
}
export function useTypingResult(session: TypingSession) {
  return useSyncExternalStore(session.result.subscribe, session.result.getSnapshot, session.result.getSnapshot);
}
