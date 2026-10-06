import type { TargetText, WordToken } from "./types";

const preparedTargets = new WeakSet<TargetText>();

export function createGraphemeSegmenter(): Intl.Segmenter {
  if (typeof Intl.Segmenter !== "function") {
    throw new Error("TypingEngine requires Intl.Segmenter with grapheme support.");
  }
  // Grapheme boundaries follow the runtime's Unicode implementation, not word locale rules.
  return new Intl.Segmenter("und", { granularity: "grapheme" });
}

export function prepareTarget(text: string, segmenter: Intl.Segmenter): {
  target: TargetText;
  expectedUnits: readonly string[];
} {
  if (typeof text !== "string" || text.length === 0) {
    throw new RangeError("targetText must be a non-empty string.");
  }
  const units = Object.freeze(Array.from(segmenter.segment(text), (part) => part.segment));
  const words: WordToken[] = [];
  let start = -1;
  const finish = (end: number) => {
    if (start < 0) return;
    words.push(Object.freeze({ text: units.slice(start, end).join(""), start, end }));
    start = -1;
  };
  units.forEach((unit, position) => {
    // An English-oriented whitespace token policy, independent of correctness.
    // Punctuation/emoji stay attached; every non-whitespace run is one token.
    if (/^\s+$/u.test(unit)) finish(position);
    else if (start < 0) start = position;
  });
  finish(units.length);
  const expectedUnits = Object.freeze(units.map((unit) => unit.normalize("NFC")));
  const target: TargetText = Object.freeze({
    text, units, expectedUnits, words: Object.freeze(words),
    segmentation: "Intl.Segmenter/grapheme", comparison: "NFC/case-sensitive",
    wordTokenization: "whitespace-grapheme-runs-v1",
  });
  preparedTargets.add(target);
  return {
    target, expectedUnits,
  };
}

/** One preparation boundary, shared by feature sources and legacy raw config. */
export function prepareTypingText(text: string): TargetText {
  return prepareTarget(text, createGraphemeSegmenter()).target;
}

export function requirePreparedText(target: TargetText): TargetText {
  if (!preparedTargets.has(target)) throw new RangeError("preparedText must come from prepareTypingText.");
  return target;
}

/**
 * Appending may extend the last cluster (marks, ZWJ sequences, CRLF, regional
 * indicators). Re-segment that cluster with the commit, never the whole buffer
 * or target. The trailing cluster contains the grapheme boundary context.
 * Segmenter offsets are UTF-16 offsets used only to return an accepted input
 * prefix; positions, deletion, counters and scoring use grapheme units.
 */
export function segmentAppendedTail(
  segmenter: Intl.Segmenter,
  previousTail: string,
  insertedText: string,
): Intl.Segments {
  return segmenter.segment(previousTail + insertedText);
}
