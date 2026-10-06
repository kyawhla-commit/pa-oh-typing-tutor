import {
  createTypingEngine,
  prepareTypingText,
  type SessionResult,
  type TextSourceIdentity,
} from "../../../engine/typing";
import type { WeaknessIdentity } from "../transfer/types";
import type { ErrorModel, OrdinaryStep } from "./types";
/** Occurrence positions come from the production domain's prepared graphemes/tokens. */
export function occurrencePositions(
  text: string,
  id: WeaknessIdentity,
): number[] {
  const p = prepareTypingText(text);
  if (id.kind === "token")
    return p.words
      .filter((w) => w.text.normalize("NFC") === id.items[0])
      .map((w) => w.start);
  const items = id.kind === "substitution" ? [id.items[0]] : id.items;
  return p.expectedUnits.flatMap((_, i) =>
    items.every((u, j) => p.expectedUnits[i + j] === u) ? [i] : [],
  );
}
export function errorPositions(
  text: string,
  models: readonly ErrorModel[],
): Map<number, { actual: string; corrected: boolean }> {
  const result = new Map<number, { actual: string; corrected: boolean }>(),
    prepared = prepareTypingText(text);
  for (const model of models) {
    const positions = occurrencePositions(text, model.identity);
    if (model.occurrences > positions.length)
      throw Error("Requested errors exceed observed occurrences.");
    // Evenly distributed occurrences avoid an artificial cluster of errors at the opening.
    for (let i = 0; i < model.occurrences; i++) {
      const occurrence =
        positions[Math.floor((i * positions.length) / model.occurrences)];
      let offset = model.offset ?? 0;
      if (model.identity.kind === "token" && model.offset === undefined)
        offset =
          i %
          Math.min(3, prepareTypingText(model.identity.items[0]).units.length);
      const position = occurrence + offset,
        expected = prepared.expectedUnits[position];
      let actual =
        model.actual ??
        (model.identity.kind === "substitution"
          ? model.identity.items[1]
          : ["X", "Y", "Z"][i % 3]);
      if (actual.normalize("NFC") === expected) actual = "?";
      result.set(position, { actual, corrected: model.corrected ?? false });
    }
  }
  return result;
}
/** Uses actual engine results, without DOM input or handwritten metrics/ledgers. */
export function syntheticSession(
  step: OrdinaryStep,
  source?: TextSourceIdentity,
): SessionResult | null {
  const text = step.text.trimEnd(),
    prepared = prepareTypingText(text),
    errors = errorPositions(text, step.errors ?? []);
  const corrected = [...errors.values()].filter((v) => v.corrected).length,
    remaining = errors.size - corrected;
  const duration = Math.max(
    1000,
    Math.ceil(((prepared.units.length - remaining) * 12000) / (step.wpm ?? 45)),
  );
  const mode = step.mode ?? "fixed-text",
    identity = source ?? {
      type: step.source ?? "corpus",
      id: "anonymous-corpus",
      version: "evaluation-v1",
    };
  const common = { preparedText: prepared, sourceIdentity: identity };
  const engine = createTypingEngine(
    mode === "timed"
      ? { ...common, mode, durationMs: duration, textPolicy: "repeat-corpus" }
      : mode === "word-count"
        ? { ...common, mode, wordLimit: prepared.words.length }
        : {
            ...common,
            mode,
            completionPolicy:
              identity.type === "adaptive" || (corrected > 0 && remaining === 0)
                ? "require-correct-target"
                : "target-covered",
          },
  );
  const typed = prepared.units;
  let position = 0,
    at = 0;
  if (step.abort) {
    engine.dispatch({ type: "INSERT_TEXT", text: typed[0], atMs: 0 });
    engine.dispatch({ type: "ABORT", atMs: 1 });
    return engine.getResult();
  }
  const time = (p: number) => Math.floor((p / typed.length) * (duration - 20));
  while (position < typed.length) {
    const mistake = errors.get(position);
    if (mistake) {
      at =
        position === typed.length - 1
          ? duration - (mode === "timed" ? 1 : 0) - (mistake.corrected ? 2 : 0)
          : Math.max(at, time(position));
      engine.dispatch({ type: "INSERT_TEXT", text: mistake.actual, atMs: at });
      if (mistake.corrected) {
        engine.dispatch({ type: "DELETE_BACKWARD", atMs: ++at });
        engine.dispatch({
          type: "INSERT_TEXT",
          text: typed[position],
          atMs: ++at,
        });
      }
      position++;
    } else {
      const start = position;
      while (position < typed.length && !errors.has(position)) {
        position++;
        if (start === 0) break;
      }
      at = Math.max(at, time(start));
      const final = position === typed.length;
      engine.dispatch({
        type: "INSERT_TEXT",
        text: typed.slice(start, position).join(""),
        atMs: final ? duration - (mode === "timed" ? 1 : 0) : at,
      });
    }
  }
  if (mode === "timed") engine.dispatch({ type: "TICK", atMs: duration });
  // Ensure the timing target also applies when the final occurrence itself was erroneous.
  const result = engine.getResult();
  if (!result || result.status !== "completed")
    throw Error("Synthetic behavior did not complete the production engine.");
  return result;
}
