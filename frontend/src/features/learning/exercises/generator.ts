import { prepareTypingText } from "../../../engine/typing";
import type { AdaptivePracticeSpec } from "../types";
import { freezeProfileValue } from "../aggregation";
import {
  ENGLISH_CONTENT,
  type ContentBank,
  type ContentChunk,
} from "./content";
import { EXERCISE } from "./constants";
import { analyzeCoverage, focusCounts, focusGroups } from "./coverage";
import { exerciseIdentity, ordered, selectionSeed } from "./identity";
import { sectionMinimums, validateCoverage, validateSpec } from "./validate";
import { assemble, type Assembly } from "./assembly";
import { COMPOSITION } from "../progression/constants";
import { PROGRESSION_CONTENT } from "../progression/content";
import { generateCompositionCandidate } from "../progression/assembly";
import {
  compositionPolicy,
  validComposition,
  validateComposition,
} from "../progression/composition";
import type { CompositionInput } from "../progression/types";
import { stableHash } from "./identity";
import type { ContentStrategy, GenerationResult } from "./types";
import { generationDiagnostics } from "./diagnostics";

const chunk = (text: string): ContentChunk => ({
  text,
  prepared: prepareTypingText(text),
});
function curatedAvailable(
  spec: AdaptivePracticeSpec,
  bank: ContentBank,
): boolean {
  if (!spec.focusItems.length) return true;
  if (spec.focusType === "token")
    return spec.focusItems.every(
      (item) =>
        bank.phrases.filter((c) =>
          c.prepared.words.some((w) => w.text.normalize("NFC") === item),
        ).length >= EXERCISE.token.contexts,
    );
  if (spec.focusType === "bigram")
    return (
      (bank.wordsByBigram.get(JSON.stringify(spec.focusItems))?.length ?? 0) >=
      EXERCISE.bigram.contexts
    );
  return spec.focusItems.every(
    (item) =>
      (bank.wordsByGrapheme.get(item)?.length ?? 0) >=
      EXERCISE.grapheme.contexts,
  );
}
function generateCandidate(
  spec: AdaptivePracticeSpec,
  bank: ContentBank,
  seed: string,
  strategy: ContentStrategy,
  phrasesFirst: boolean,
): Assembly | null {
  const groups = focusGroups(spec);
  const targeted = groups.length > 0;
  const atoms = groups.map((items) => items.join(""));
  const separator =
    strategy === "fallback-drill" &&
    atoms.some(
      (atom) =>
        focusCounts(prepareTypingText(`${atom} ${atom}`), {
          ...spec,
          focusItems: spec.focusType === "bigram" ? spec.focusItems : [atom],
        })[0] !== 2,
    )
      ? "\n"
      : " ";
  const used = new Set<string>();
  const uses = new Map<string, number>();
  const parts: string[][] = [[], [], []];
  const minimums = sectionMinimums(spec);
  const broad =
    spec.focusType === "accuracy"
      ? bank.accuracy
      : spec.focusType === "speed"
        ? bank.speed
        : bank.general;
  const words = ordered(bank.words, `${seed}:words`),
    phrases = ordered(bank.phrases, `${seed}:phrases`);
  const drills = ordered(
    atoms.flatMap((atom) =>
      ["·", "/", "—"].map((marker) => chunk(`${atom} ${marker}`)),
    ),
    `${seed}:drills`,
  );
  const count = (c: ContentChunk) => focusCounts(c.prepared, spec);
  const caches = new Map<ContentChunk, number[]>();
  const counts = (c: ContentChunk) => {
    let v = caches.get(c);
    if (!v) {
      v = count(c);
      caches.set(c, v);
    }
    return v;
  };
  if (!targeted) {
    if (!broad.length || !words.length) return null;
    const familiar = spec.focusType === "general" ? words : bank.familiarWords;
    const gradual = spec.difficulty === "gradual-speed";
    parts[0] = ordered(
      familiar.filter(
        (w) =>
          w.prepared.units.length >= (gradual ? 2 : 3) &&
          w.prepared.units.length <= (gradual ? 4 : 5),
      ),
      `${seed}:easy`,
    )
      .slice(0, 4)
      .map((w) => w.text);
    const flow = ordered(broad, `${seed}:flow`).sort(
      (a, b) => a.prepared.units.length - b.prepared.units.length,
    );
    parts[1] = flow.slice(0, 2).map((c) => c.text);
    parts[2] = flow.slice(2, 3).map((c) => c.text);
    parts.flat().forEach((text) => used.add(text));
  } else {
    for (let s = 0; s < 3; s++) {
      const pool =
        strategy === "fallback-drill"
          ? drills
          : s === 0
            ? words
            : phrasesFirst
              ? phrases
              : [...phrases, ...words];
      const seen: number[] = groups.map(() => 0);
      let lastGroup = -1;
      for (
        let step = 0;
        step < EXERCISE.maxChunksPerSection &&
        seen.some((n, i) => n < minimums[i][s]);
        step++
      ) {
        let best: ContentChunk | undefined,
          bestScore = -Infinity;
        for (const c of pool) {
          if (strategy === "curated" && used.has(c.text)) continue;
          const exposure = counts(c);
          const useful = exposure.reduce(
            (sum, n, i) =>
              sum + Math.min(n, Math.max(0, minimums[i][s] - seen[i])),
            0,
          );
          if (!useful) continue;
          const excess = exposure.reduce(
            (sum, n, i) =>
              sum + Math.max(0, n - Math.max(0, minimums[i][s] - seen[i])),
            0,
          );
          const side = exposure.findIndex((n) => n > 0);
          const score =
            useful * 100 -
            c.prepared.units.length * 2 -
            excess * 30 +
            (s > 0 && c.prepared.words.length > 1 ? 12 : 0) -
            (strategy === "fallback-drill"
              ? (uses.get(c.text) ?? 0) * 10 +
                (groups.length > 1 && side === lastGroup ? 30 : 0)
              : 0);
          if (score > bestScore) {
            bestScore = score;
            best = c;
          }
        }
        if (!best) return null;
        parts[s].push(best.text);
        used.add(best.text);
        uses.set(best.text, (uses.get(best.text) ?? 0) + 1);
        lastGroup = counts(best).findIndex((n) => n > 0);
        counts(best).forEach((n, i) => (seen[i] += n));
      }
      if (seen.some((n, i) => n < minimums[i][s])) return null;
    }
  }
  if (parts.some((p) => !p.length)) return null;
  const layout = (list: readonly string[], section: number) => {
    if (strategy === "fallback-drill" || section === 0)
      return list.join(separator);
    const lines: string[] = [];
    let wordList: string[] = [];
    for (const text of list) {
      if (prepareTypingText(text).words.length === 1) wordList.push(text);
      else {
        if (wordList.length) {
          lines.push(wordList.join(" "));
          wordList = [];
        }
        lines.push(text);
      }
    }
    if (wordList.length) lines.push(wordList.join(" "));
    return lines.join("\n");
  };
  const current = () => assemble(parts.map(layout), "\n", strategy);
  // Diversity/expected-side repair is bounded and never relaxes the contract.
  if (targeted && strategy === "curated")
    for (let step = 0; step < EXERCISE.maxChunksPerSection; step++) {
      const a = current(),
        coverage = analyzeCoverage(a.text, spec, a.sections);
      const requiredContexts =
        spec.focusType === "token"
          ? EXERCISE.token.contexts
          : spec.focusType === "bigram"
            ? EXERCISE.bigram.contexts
            : EXERCISE.grapheme.contexts;
      const missing = coverage.focus.findIndex(
        (row) => row.contexts.length < requiredContexts,
      );
      const unbalanced =
        coverage.focus.length > 1 &&
        (Math.max(...coverage.focus.map((r) => r.occurrences)) /
          Math.min(...coverage.focus.map((r) => r.occurrences)) >
          EXERCISE.maxBalanceRatio ||
          (spec.focusType === "substitution" &&
            coverage.focus[0].occurrences < coverage.focus[1].occurrences));
      if (missing < 0 && !unbalanced) break;
      const target =
        missing >= 0
          ? missing
          : spec.focusType === "substitution"
            ? 0
            : coverage.focus.findIndex(
                (row) =>
                  row.occurrences ===
                  Math.min(...coverage.focus.map((r) => r.occurrences)),
              );
      const addition = words
        .filter((c) => !used.has(c.text) && counts(c)[target] > 0)
        .sort((a, b) => a.prepared.units.length - b.prepared.units.length)[0];
      if (!addition) return null;
      parts[1].push(addition.text);
      used.add(addition.text);
    }
  const padding = ordered(
    spec.focusType === "accuracy"
      ? bank.accuracy
      : spec.difficulty === "gradual-speed"
        ? bank.speed
        : [...broad, ...bank.accuracy, ...bank.speed],
    `${seed}:padding`,
  );
  for (let step = 0; step < EXERCISE.maxPaddingChunks; step++) {
    const a = current(),
      before = analyzeCoverage(a.text, spec, a.sections);
    const needsOrdinary =
      targeted && before.mixedOrdinaryTokens < EXERCISE.minMixedOrdinaryTokens;
    if (!needsOrdinary && before.totalGraphemes >= spec.desiredLength.value)
      break;
    let best: ContentChunk | undefined,
      bestScore = -Infinity;
    for (const c of padding) {
      if (used.has(c.text)) continue;
      const length = before.totalGraphemes + 1 + c.prepared.units.length;
      if (
        length > Math.floor(spec.desiredLength.value * EXERCISE.maxLengthRatio)
      )
        continue;
      const exposure = counts(c);
      const after = before.focus.map((r, i) => r.occurrences + exposure[i]);
      const balance =
        after.length > 1 ? Math.max(...after) / Math.min(...after) : 1;
      const expectedPenalty =
        spec.focusType === "substitution"
          ? Math.max(0, after[1] - after[0]) * 30
          : 0;
      const ordinary = c.prepared.words.filter(
        (w) =>
          !groups.some((items) =>
            spec.focusType === "token"
              ? w.text.normalize("NFC") === items[0]
              : items.some((u) =>
                  c.prepared.expectedUnits.slice(w.start, w.end).includes(u),
                ),
          ),
      ).length;
      const score =
        -Math.abs(spec.desiredLength.value - length) -
        Math.max(0, balance - EXERCISE.maxBalanceRatio) * 100 -
        expectedPenalty +
        (needsOrdinary ? Math.min(ordinary, 3) * 40 : 0) +
        (c.prepared.words.length > 1 ? 8 : 0) -
        exposure.reduce((a, b) => a + b, 0) * 3;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (!best) break;
    const nextLength = before.totalGraphemes + 1 + best.prepared.units.length;
    if (
      !needsOrdinary &&
      before.totalGraphemes >=
        Math.ceil(spec.desiredLength.value * EXERCISE.minLengthRatio) &&
      Math.abs(spec.desiredLength.value - nextLength) >=
        Math.abs(spec.desiredLength.value - before.totalGraphemes)
    )
      break;
    parts[2].push(best.text);
    used.add(best.text);
  }
  return current();
}
export function generateAdaptiveExercise(
  value: unknown,
  options: {
    learnerKey: string;
    generatorVersion?: string;
    bank?: ContentBank;
    composition?: CompositionInput;
  },
): GenerationResult {
  if (options.composition && !validComposition(options.composition))
    return {
      ok: false,
      code: "invalid-spec",
      reason: "Invalid bounded composition level, ordinal or purpose.",
      attempts: 0,
    };
  const composition = options.composition;
  const adjusted =
    composition && value && typeof value === "object"
      ? {
          ...value,
          desiredLength: {
            unit: "graphemes",
            value: compositionPolicy(composition).length,
          },
        }
      : value;
  const checked = validateSpec(adjusted);
  if (!checked.ok) return checked;
  const { spec } = checked;
  const bank =
      options.bank ?? (composition ? PROGRESSION_CONTENT : ENGLISH_CONTENT),
    version =
      options.generatorVersion ??
      (composition ? COMPOSITION.generatorVersion : EXERCISE.generatorVersion);
  if (
    typeof options.learnerKey !== "string" ||
    !options.learnerKey ||
    options.learnerKey.length > EXERCISE.maxIdentityUnits ||
    !version ||
    version.length > EXERCISE.maxVersionUnits ||
    !bank.version ||
    bank.version.length > EXERCISE.maxVersionUnits
  )
    return {
      ok: false,
      code: "invalid-spec",
      reason:
        "Bounded learner and generator/content version identities are required.",
      attempts: 0,
    };
  if (
    composition?.purpose === "controlled-transfer-assessment" &&
    !["grapheme", "substitution", "bigram", "token"].includes(spec.focusType)
  )
    return {
      ok: false,
      code: "unsupported-focus",
      reason: "Controlled assessment supports exact specific targets only.",
      attempts: 0,
    };
  const identitySpec = composition
    ? {
        ...spec,
        recommendationId: JSON.stringify([spec.focusType, ...spec.focusItems]),
      }
    : spec;
  const baseSeed = selectionSeed(
    identitySpec,
    options.learnerKey,
    version,
    bank.version,
  );
  const seed = composition
    ? stableHash(
        JSON.stringify([
          baseSeed,
          COMPOSITION.version,
          composition.level,
          composition.ordinal % COMPOSITION.cycle,
          composition.purpose,
        ]),
      )
    : baseSeed;
  let attempts = 0;
  let lastIssues: readonly string[] = [];
  const available = curatedAvailable(spec, bank);
  if (composition?.purpose === "controlled-transfer-assessment" && !available)
    return {
      ok: false,
      code: "unsupported-focus",
      reason:
        "This content bank lacks curated contexts for an independent controlled check. Continue ordinary practice.",
      attempts: 0,
      diagnostics: [
        {
          kind: "insufficient-content",
          message:
            "Controlled checks require curated target contexts; synthetic fallback drills only support training.",
        },
      ],
    };
  const strategies: ContentStrategy[] = spec.focusItems.length
    ? available
      ? ["curated", "fallback-drill"]
      : ["fallback-drill"]
    : ["curated"];
  for (const strategy of strategies)
    for (let n = 0; n < EXERCISE.attemptsPerStrategy; n++) {
      if (
        composition?.purpose === "controlled-transfer-assessment" &&
        strategy === "fallback-drill"
      )
        continue;
      attempts++;
      const candidate = composition
        ? generateCompositionCandidate(
            spec,
            bank,
            `${seed}:${strategy}:${n}`,
            strategy,
            composition,
          )
        : generateCandidate(
            spec,
            bank,
            `${seed}:${strategy}:${n}`,
            strategy,
            n < EXERCISE.attemptsPerStrategy / 2,
          );
      if (!candidate) continue;
      const validation = composition
        ? validateComposition(
            candidate.text,
            spec,
            candidate.sections,
            strategy,
            composition,
          )
        : validateCoverage(candidate.text, spec, candidate.sections, strategy);
      if (!validation.valid) {
        lastIssues = validation.issues;
        continue;
      }
      const identity = exerciseIdentity(
        composition
          ? stableHash(
              JSON.stringify([seed, composition.ordinal, composition.purpose]),
            )
          : seed,
        candidate.text,
        version,
        bank.version,
      );
      const source =
        composition?.purpose === "controlled-transfer-assessment"
          ? { ...identity, id: identity.id.replace("adaptive-", "assessment-") }
          : identity;
      return {
        ok: true,
        exercise: freezeProfileValue({
          id: source.id,
          version: source.version,
          recommendationId: spec.recommendationId,
          focusType: spec.focusType,
          focusItems: [...spec.focusItems],
          text: candidate.text,
          source,
          contentStrategy: strategy,
          strategyReason:
            strategy === "fallback-drill"
              ? available
                ? "Curated assembly could not satisfy all coverage limits; this is a target drill."
                : "Curated contexts are unavailable for this focus; this is a target drill, not a linguistic sentence."
              : null,
          coverage: validation.coverage,
          sections: candidate.sections,
          generatedFrom: {
            spec,
            generatorVersion: version,
            contentBankVersion: bank.version,
            ...(composition ? { composition: { ...composition } } : {}),
          },
          preparedText: prepareTypingText(candidate.text),
        }),
      };
    }
  return {
    ok: false,
    code: "coverage-unsatisfied",
    reason: `Unable to meet the exposure, length and diversity contract within bounded assembly attempts.${lastIssues.length ? ` ${lastIssues.join(" ")}` : ""}`,
    attempts,
    diagnostics: generationDiagnostics(lastIssues),
  };
}
