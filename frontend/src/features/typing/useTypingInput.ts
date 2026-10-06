import { useCallback, useLayoutEffect, useRef } from "react";
import { attachTypingInput } from "./inputAdapter";
import type { TypingSession } from "./useTypingSession";

/** Shared native adapter lifetime; only an intentional Start/Restart requests focus. */
export function useTypingInput(session: TypingSession, generation: number, focusOnMount = false) {
  const input = useRef<HTMLTextAreaElement>(null);
  const adapter = useRef<ReturnType<typeof attachTypingInput> | null>(null);
  useLayoutEffect(() => {
    const attached = attachTypingInput(input.current!, session);
    adapter.current = attached;
    return () => { attached.dispose(); adapter.current = null; };
  }, [session]);
  useLayoutEffect(() => {
    adapter.current?.reset();
    if (generation > 0 || focusOnMount) adapter.current?.focus();
  }, [generation, focusOnMount]);
  const focus = useCallback(() => adapter.current?.focus(), []);
  return { input, focus };
}
