// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import {
  TypingSessionObserverContext,
  useTypingSession,
  type TypingSession,
} from "../typing/useTypingSession";
import { createLearningService } from "../learning/service";
import { createPassivePilotObserver } from "./observer";
import type { Milestone } from "./types";
it("passive adapter has identical typing results off/on and no per-character milestone capture under StrictMode", () => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  function run(enabled: boolean) {
    const host = document.createElement("div"),
      root = createRoot(host),
      events: Milestone[] = [],
      store = { getItem: () => null, setItem: vi.fn() },
      service = createLearningService(store, (j) => j()),
      observer = createPassivePilotObserver(service, "guest", (e) =>
        events.push(e),
      );
    let session: TypingSession;
    function Component() {
      session = useTypingSession({
        targetText: "abc",
        completionPolicy: "target-covered",
      });
      return null;
    }
    act(() =>
      root.render(
        <StrictMode>
          <TypingSessionObserverContext.Provider
            value={enabled ? observer.observeSession : null}
          >
            <Component />
          </TypingSessionObserverContext.Provider>
        </StrictMode>,
      ),
    );
    const clock = vi.spyOn(performance, "now").mockReturnValue(0);
    act(() => session!.insertText("a"));
    clock.mockReturnValue(1000);
    act(() => session!.insertText("b"));
    expect(events).toHaveLength(enabled ? 1 : 0);
    clock.mockReturnValue(2000);
    act(() => session!.insertText("c"));
    const result = session!.result.getSnapshot();
    act(() => root.unmount());
    observer.dispose();
    clock.mockRestore();
    expect(store.setItem).not.toHaveBeenCalled();
    return { result, events };
  }
  const off = run(false),
    on = run(true);
  expect(on.result).toEqual(off.result);
  expect(on.events.map((e) => e.eventType)).toEqual(["activity-started"]);
});
