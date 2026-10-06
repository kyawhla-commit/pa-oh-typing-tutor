import { prepareTypingText } from "../../../engine/typing";
import type { AdaptivePracticeSpec } from "../types";
import type { ContentBank, ContentChunk } from "../exercises/content";
import { ordered } from "../exercises/identity";
import {
  focusCounts,
  analyzeCoverage,
  focusGroups,
} from "../exercises/coverage";
import { assemble, type Assembly } from "../exercises/assembly";
import type { ContentStrategy } from "../exercises/types";
import { COMPOSITION as C } from "./constants";
import { compositionMinimums, compositionPolicy } from "./composition";
import type { CompositionInput } from "./types";
const chunk = (text: string): ContentChunk => ({
  text,
  prepared: prepareTypingText(text),
});
/** Bounded assembly using the same bank, domain preparation, coverage and seeded ordering. */
export function generateCompositionCandidate(
  spec: AdaptivePracticeSpec,
  bank: ContentBank,
  seed: string,
  strategy: ContentStrategy,
  input: CompositionInput,
): Assembly | null {
  const policy = compositionPolicy(input),
    mins = compositionMinimums(spec, input),
    targeted = mins.length > 0,
    assessment = input.purpose === "controlled-transfer-assessment";
  const words = ordered(bank.words, `${seed}:words`),
    phrases = ordered(bank.phrases, `${seed}:phrases`),
    used = new Set<string>();
  const parts: string[][] = [[], [], []];
  const countsCache = new Map<ContentChunk, number[]>();
  const counts = (c: ContentChunk) => {
    let result = countsCache.get(c);
    if (!result) {
      result = focusCounts(c.prepared, spec);
      countsCache.set(c, result);
    }
    return result;
  };
  const groups = focusGroups(spec);
  const atoms = groups.map((items) => items.join(""));
  const isolate = atoms.some(
    (atom) =>
      focusCounts(prepareTypingText(` ${atom}`), {
        ...spec,
        focusItems: spec.focusType === "bigram" ? spec.focusItems : [atom],
      })[0] !== 1,
  );
  const separator = isolate ? "\n" : " ";
  const markers = ["·", "/", "—", ":", "|", ";", "+", "=", "~", "_"];
  const frames = [
    ["read", "now"],
    ["see", "here"],
    ["use", "today"],
    ["find", "next"],
    ["check", "again"],
    ["write", "slowly"],
    ["read", "with care"],
    ["check", "each day"],
    ["see", "on the page"],
    ["use", "in this line"],
  ];
  const neutral = atoms.flatMap((atom) =>
    markers.map((marker) =>
      chunk(
        spec.focusType === "token"
          ? `read${separator}${atom}${separator}${marker}`
          : `${atom}${marker}`,
      ),
    ),
  );
  const neutralPhrases = atoms.flatMap((atom) =>
    frames.map(([before, after], i) =>
      chunk(
        `${before}${separator}${spec.focusType === "token" ? atom : atom + markers[i]}${separator}${after}`,
      ),
    ),
  );
  const current = () =>
    assemble(
      parts.map((p) => p.join(separator)),
      "\n",
      strategy,
    );
  const length = (p: readonly string[]) =>
    p.length ? prepareTypingText(p.join(separator)).units.length : 0;
  const sectionGoal = (s: number) =>
    Math.floor(policy.length * policy.shares[s]);
  const broad =
    spec.focusType === "accuracy"
      ? bank.accuracy
      : spec.focusType === "speed"
        ? bank.speed
        : bank.general;
  if (assessment) {
    const warm = ordered(
      [...phrases, ...words].filter(
        (c) =>
          counts(c).every((n) => n === 0) &&
          c.prepared.units.length <= sectionGoal(0),
      ),
      `${seed}:warm`,
    ).sort(
      (a, b) =>
        Number(b.prepared.words.length > 1) -
        Number(a.prepared.words.length > 1),
    )[0];
    if (!warm) return null;
    parts[0].push(warm.text);
    used.add(warm.text);
  }
  for (let s = 0; s < 3; s++) {
    const seen = mins.map(() => 0);
    if (targeted && !(assessment && s === 0)) {
      const pool =
        strategy === "fallback-drill"
          ? s === 0 && !assessment && spec.focusType !== "token"
            ? neutral
            : [...neutralPhrases, ...neutral]
          : spec.focusType === "token" ||
              (s === 1 && input.level > 0) ||
              assessment
            ? phrases
            : s === 2
              ? phrases
              : words;
      for (
        let step = 0;
        step < C.maxChunks && seen.some((n, i) => n < mins[i][s]);
        step++
      ) {
        let best: ContentChunk | undefined,
          bestScore = -Infinity;
        for (const c of pool) {
          if (used.has(c.text)) continue;
          const cs = counts(c),
            useful = cs.reduce(
              (n, v, i) => n + Math.min(v, Math.max(0, mins[i][s] - seen[i])),
              0,
            );
          if (!useful) continue;
          const excess = cs.reduce(
            (n, v, i) => n + Math.max(0, v - Math.max(0, mins[i][s] - seen[i])),
            0,
          );
          const score = useful * 100 - c.prepared.units.length - excess * 50;
          if (score > bestScore) {
            best = c;
            bestScore = score;
          }
        }
        if (!best) return null;
        parts[s].push(best.text);
        used.add(best.text);
        counts(best).forEach((n, i) => (seen[i] += n));
      }
      if (seen.some((n, i) => n < mins[i][s])) return null;
    }
    if (!targeted) {
      const pool =
        s === 0 && input.level === 0
          ? bank.familiarWords.filter(
              (c) =>
                c.prepared.units.length <= (spec.focusType === "speed" ? 4 : 5),
            )
          : broad;
      const existingText = parts.flat().join(" "),
        existingWords = existingText
          ? prepareTypingText(existingText).words
          : [];
      const repeated = (c: ContentChunk) =>
        c.prepared.words.reduce(
          (n, w) => n + existingWords.filter((v) => v.text === w.text).length,
          0,
        ) / c.prepared.words.length;
      for (const c of ordered(pool, `${seed}:broad:${s}`).sort(
        (a, b) => repeated(a) - repeated(b),
      )) {
        if (used.has(c.text)) continue;
        if (parts[s].length && length([...parts[s], c.text]) > sectionGoal(s))
          continue;
        parts[s].push(c.text);
        used.add(c.text);
        if (length(parts[s]) >= sectionGoal(s) - 5) break;
      }
    }
  }
  // Add distinct lexical contexts before ordinary padding; fallback never claims linguistic variety.
  if (targeted && strategy === "curated")
    for (let step = 0; step < C.maxChunks; step++) {
      const a = current(),
        cov = analyzeCoverage(a.text, spec, a.sections),
        required =
          spec.focusType === "token" ? policy.tokenContexts : policy.contexts;
      const missing = cov.focus.findIndex((r) => r.contexts.length < required);
      if (missing < 0) break;
      const candidates =
        spec.focusType === "token" || input.level > 0
          ? phrases
          : [...words, ...phrases];
      const best = candidates
        .filter((c) => !used.has(c.text) && counts(c)[missing] > 0)
        .sort((a, b) => a.prepared.units.length - b.prepared.units.length)[0];
      if (!best) return null;
      parts[1].push(best.text);
      used.add(best.text);
    }
  // Fill warm-up/context to explicit shares, retaining Slice 6 minimum section density.
  const freeWords = words.filter((c) => counts(c).every((n) => n === 0));
  const freePhrases = phrases.filter((c) => counts(c).every((n) => n === 0));
  for (let s = 0; s < 2; s++)
    for (
      let step = 0;
      step < C.maxChunks && length(parts[s]) < sectionGoal(s) - 2;
      step++
    ) {
      // A short coherent assessment warm-up is preferable to appending an
      // unrelated word just to consume its nominal share. Mixed filler fits
      // the unchanged final length/share contract independently.
      if (
        assessment &&
        s === 0 &&
        prepareTypingText(parts[s][0]).words.length > 1
      )
        break;
      const pool = input.level === 0 || s === 0 ? freeWords : freePhrases;
      const remaining =
        sectionGoal(s) - length(parts[s]) - (parts[s].length ? 1 : 0);
      const choices = pool.filter(
        (c) => !used.has(c.text) && c.prepared.units.length <= remaining,
      );
      const phrase = choices.find((c) => c.prepared.words.length > 1);
      const best =
        phrase ??
        choices.sort(
          (a, b) => b.prepared.units.length - a.prepared.units.length,
        )[0];
      if (!best) break;
      parts[s].push(best.text);
      used.add(best.text);
    }
  const padding = ordered(freePhrases, `${seed}:mixed`);
  for (let step = 0; step < C.maxChunks; step++) {
    const assembly = current(),
      total = assembly.text,
      size = prepareTypingText(total).units.length;
    const cov = analyzeCoverage(total, spec, assembly.sections);
    const densityRepair =
      targeted &&
      !assessment &&
      (cov.sectionDensities[2] > cov.sectionDensities[0] ||
        cov.sectionDensities[2] > cov.sectionDensities[1]);
    if (
      size >= Math.floor(policy.length * 0.97) &&
      parts[2].length &&
      !densityRepair
    )
      break;
    // Use existing tolerance headroom when a short fallback's mixed section
    // still has greater density than context. Do not truncate target contexts.
    const remaining =
      (densityRepair
        ? Math.floor(policy.length * C.tolerance.max)
        : policy.length) -
      size -
      (parts[2].length ? 1 : 0);
    const frequencies = new Map<string, number>();
    for (const w of prepareTypingText(total).words)
      frequencies.set(w.text, (frequencies.get(w.text) ?? 0) + 1);
    const novelty = (c: ContentChunk) =>
      c.prepared.words.reduce((n, w) => n + (frequencies.get(w.text) ?? 0), 0) /
      c.prepared.words.length;
    // Average novelty concealed repeated articles in otherwise varied clauses.
    // Minimize the hardest repetition constraint before average reuse; seeded
    // pool order still breaks ties and the independent verifier is unchanged.
    const peak = (c: ContentChunk) => {
      const next = new Map(frequencies);
      for (const w of c.prepared.words)
        next.set(w.text, (next.get(w.text) ?? 0) + 1);
      return Math.max(0, ...next.values());
    };
    const best = padding
      .filter((c) => !used.has(c.text) && c.prepared.units.length <= remaining)
      .sort((a, b) => peak(a) - peak(b) || novelty(a) - novelty(b))[0];
    if (!best) break;
    parts[2].push(best.text);
    used.add(best.text);
  }
  if (parts.some((p) => !p.length)) return null;
  if (
    strategy === "curated" &&
    input.level > 0 &&
    spec.focusType !== "speed" &&
    !atoms.some((a) => a.includes("."))
  ) {
    // Separate connected phrases without changing an exact target token at a sentence end.
    let dots =
      input.level === 1
        ? 2
        : Math.floor(prepareTypingText(current().text).units.length * 0.02);
    for (const section of [1, 2])
      parts[section] = parts[section].map((text) => {
        const prepared = prepareTypingText(text),
          last = prepared.words.at(-1)?.text.normalize("NFC");
        if (
          dots > 0 &&
          prepared.words.length > 1 &&
          !(spec.focusType === "token" && spec.focusItems.includes(last ?? ""))
        ) {
          dots--;
          return text + ".";
        }
        return text;
      });
  }
  return current();
}
