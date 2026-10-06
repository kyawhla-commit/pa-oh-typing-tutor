import { generateAdaptiveExercise } from "../exercises";
import { prepareTypingText } from "../../../engine/typing";
import { COMPOSITION } from "../progression/constants";
import type { AdaptivePracticeSpec } from "../types";
import type { CompositionInput } from "../progression/types";
export const MATRIX_FOCI: readonly {
  name: string;
  type: AdaptivePracticeSpec["focusType"];
  items: readonly string[];
}[] = [
  { name: "r", type: "grapheme", items: ["r"] },
  { name: "a", type: "grapheme", items: ["a"] },
  { name: "r-to-t", type: "substitution", items: ["r", "t"] },
  { name: "e-to-i", type: "substitution", items: ["e", "i"] },
  { name: "th", type: "bigram", items: ["t", "h"] },
  { name: "in", type: "bigram", items: ["i", "n"] },
  { name: "through", type: "token", items: ["through"] },
  { name: "typing", type: "token", items: ["typing"] },
  { name: "accuracy", type: "accuracy", items: [] },
  { name: "speed", type: "speed", items: [] },
  { name: "general", type: "general", items: [] },
  { name: "accent", type: "grapheme", items: ["é"] },
  { name: "myanmar", type: "token", items: ["ပအိုဝ်ႏ"] },
];
export function matrixSpec(
  focus: (typeof MATRIX_FOCI)[number],
): AdaptivePracticeSpec {
  return {
    recommendationId: `matrix-${focus.name}`,
    focusType: focus.type,
    focusItems: focus.items,
    desiredLength: { unit: "graphemes", value: 120 },
    difficulty: focus.type === "speed" ? "gradual-speed" : "steady",
    mode: "fixed-text",
    completionPolicy: "require-correct-target",
  };
}
export function evaluateGenerator(ordinals = 32) {
  const rows: Record<string, unknown>[] = [],
    samples: {
      key: string;
      ordinal: number;
      text: string;
      strategy: string;
      focus: readonly string[];
    }[] = [],
    timings: { key: string; ordinal: number; milliseconds: number }[] = [];
  const groups = new Map<
    string,
    { texts: string[]; openings: string[]; phrases: string[]; tokens: string[] }
  >();
  const failures: Record<string, number> = {};
  const diagnosticReasons: Record<string, number> = {};
  let attempted = 0,
    successful = 0;
  for (const focus of MATRIX_FOCI) {
    const spec = matrixSpec(focus);
    const compositions: {
      level: 0 | 1 | 2;
      purpose: CompositionInput["purpose"];
    }[] = [0, 1, 2].map((level) => ({
      level: level as 0 | 1 | 2,
      purpose: "training",
    }));
    if (["grapheme", "substitution", "bigram", "token"].includes(focus.type))
      compositions.push({
        level: 2,
        purpose: "controlled-transfer-assessment",
      });
    for (const c of compositions) {
      const key = `${focus.name}/${c.purpose}/${c.level}`,
        group = {
          texts: [] as string[],
          openings: [] as string[],
          phrases: [] as string[],
          tokens: [] as string[],
        };
      groups.set(key, group);
      for (let ordinal = 0; ordinal < ordinals; ordinal++) {
        attempted++;
        const started = performance.now(),
          result = generateAdaptiveExercise(spec, {
            learnerKey: "anonymous-evaluation",
            composition: { ...c, ordinal },
          });
        timings.push({
          key,
          ordinal,
          milliseconds: performance.now() - started,
        });
        if (!result.ok) {
          failures[result.code] = (failures[result.code] ?? 0) + 1;
          for (const diagnostic of result.diagnostics ?? [])
            diagnosticReasons[diagnostic.kind] =
              (diagnosticReasons[diagnostic.kind] ?? 0) + 1;
          rows.push({
            key,
            focusType: focus.type,
            level: c.level,
            purpose: c.purpose,
            ordinal,
            ok: false,
            code: result.code,
            reason: result.reason,
            attempts: result.attempts,
            diagnostics: result.diagnostics ?? [],
          });
          continue;
        }
        successful++;
        const e = result.exercise,
          coverage = e.coverage,
          tokens = prepareTypingText(e.text).words.map((w) => w.text),
          phrases = e.text
            .split(/[.\n]/u)
            .map((s) => s.trim())
            .filter(Boolean);
        const flags: string[] = [];
        const density =
          coverage.focus.reduce(
            (n, f) =>
              n +
              f.occurrences *
                (spec.focusType === "token"
                  ? prepareTypingText(f.items[0]).units.length
                  : f.items.length),
            0,
          ) / coverage.totalGraphemes;
        const contract =
          c.purpose === "training"
            ? COMPOSITION.levels[c.level]
            : COMPOSITION.assessment;
        if (coverage.punctuationRatio > 0.15) flags.push("high-punctuation");
        if (density > contract.maxDensity) flags.push("high-focus-density");
        if (coverage.longestIsolatedFocusRun > 1)
          flags.push("isolated-drill-run");
        if (
          coverage.focus.some(
            (f) =>
              f.contexts.length <
              (spec.focusType === "token"
                ? contract.tokenContexts
                : contract.contexts),
          )
        )
          flags.push("low-context-diversity");
        if (new Set(phrases).size < phrases.length)
          flags.push("repeated-phrase");
        group.texts.push(e.text);
        group.openings.push(tokens.slice(0, 5).join(" "));
        group.tokens.push(...tokens);
        group.phrases.push(...phrases);
        rows.push({
          key,
          focusType: focus.type,
          level: c.level,
          purpose: c.purpose,
          ordinal,
          ok: true,
          id: e.id,
          strategy: e.contentStrategy,
          length: coverage.totalGraphemes,
          focus: coverage.focus,
          focusDensity: density,
          sectionDensities: coverage.sectionDensities,
          contexts: coverage.focus.map((f) => f.contexts.length),
          distinctTokens: coverage.distinctTokens,
          maxTokenShare: coverage.maxTokenShare,
          longestTokenRun: coverage.longestIdenticalTokenRun,
          isolatedRun: coverage.longestIsolatedFocusRun,
          punctuationRatio: coverage.punctuationRatio,
          flags,
        });
        if ([0, 7, 31].includes(ordinal))
          samples.push({
            key,
            ordinal,
            text: e.text,
            strategy: e.contentStrategy,
            focus: e.focusItems,
          });
      }
    }
  }
  const diversity = [...groups].map(([key, g]) => ({
    key,
    successful: g.texts.length,
    uniqueTargets: new Set(g.texts).size,
    repeatedTargets: g.texts.length - new Set(g.texts).size,
    uniqueOpenings: new Set(g.openings).size,
    repeatedOpenings: g.openings.length - new Set(g.openings).size,
    phraseOccurrences: g.phrases.length,
    uniquePhrases: new Set(g.phrases).size,
    phraseReuse: g.phrases.length - new Set(g.phrases).size,
    tokenOccurrences: g.tokens.length,
    uniqueTokens: new Set(g.tokens).size,
    tokenReuse: g.tokens.length - new Set(g.tokens).size,
  }));
  return {
    data: {
      attempted,
      successful,
      failed: attempted - successful,
      failureRate: (attempted - successful) / attempted,
      failures,
      unsupported: rows.filter((r) => r.code === "unsupported-focus").length,
      supportedAttempts:
        attempted - rows.filter((r) => r.code === "unsupported-focus").length,
      supportedFailures: rows.filter(
        (r) => !r.ok && r.code !== "unsupported-focus",
      ).length,
      diagnosticReasons,
      rows,
      diversity,
      samples,
    },
    timings,
  };
}
