import { prepareTypingText } from "../../../engine/typing";
import type { AdaptivePracticeSpec } from "../types";
import {
  analyzeCoverage,
  focusCounts,
  focusGroups,
} from "../exercises/coverage";
import type {
  ExerciseSection,
  ContentStrategy,
  CoverageValidation,
} from "../exercises/types";
import { validateCoverage } from "../exercises/validate";
import { COMPOSITION as C } from "./constants";
import type { CompositionInput } from "./types";
export const compositionPolicy = (input: CompositionInput) =>
  input.purpose === "controlled-transfer-assessment"
    ? C.assessment
    : C.levels[input.level];
export function validComposition(value: CompositionInput): boolean {
  return (
    !!value &&
    [0, 1, 2].includes(value.level) &&
    Number.isSafeInteger(value.ordinal) &&
    value.ordinal >= 0 &&
    value.ordinal <= C.maxOrdinal &&
    ["training", "controlled-transfer-assessment"].includes(value.purpose) &&
    (value.purpose !== "controlled-transfer-assessment" || value.level === 2)
  );
}
export function compositionMinimums(
  spec: AdaptivePracticeSpec,
  input: CompositionInput,
): readonly (readonly number[])[] {
  const policy = compositionPolicy(input);
  return spec.focusType === "bigram"
    ? [policy.bigram]
    : spec.focusType === "substitution"
      ? [policy.grapheme, policy.counterpart]
      : spec.focusItems.map(() =>
          spec.focusType === "token" ? policy.token : policy.grapheme,
        );
}
export function focusDensity(text: string, spec: AdaptivePracticeSpec): number {
  const p = prepareTypingText(text),
    groups = focusGroups(spec),
    positions = new Set<number>();
  for (const items of groups) {
    if (spec.focusType === "token") {
      for (const word of p.words)
        if (word.text.normalize("NFC") === items[0])
          for (let i = word.start; i < word.end; i++) positions.add(i);
    } else
      for (let i = 0; i <= p.units.length - items.length; i++)
        if (items.every((u, j) => p.expectedUnits[i + j] === u))
          for (let j = 0; j < items.length; j++) positions.add(i + j);
  }
  return positions.size / p.units.length;
}
export function validateComposition(
  text: string,
  spec: AdaptivePracticeSpec,
  sections: readonly ExerciseSection[],
  strategy: ContentStrategy,
  input: CompositionInput,
): CoverageValidation {
  const assessment = input.purpose === "controlled-transfer-assessment",
    policy = compositionPolicy(input),
    coverage = analyzeCoverage(text, spec, sections),
    issues: string[] = [];
  if (!assessment)
    issues.push(...validateCoverage(text, spec, sections, strategy).issues);
  else {
    const target = prepareTypingText(text);
    if (strategy !== "curated")
      issues.push(
        "Controlled assessment requires curated contexts; fallback drills support training only.",
      );
    if (
      !["grapheme", "substitution", "bigram", "token"].includes(spec.focusType)
    )
      issues.push("Assessment requires an exact specific weakness.");
    if (
      sections.length !== 3 ||
      sections.map((s) => s.text).join("\n") !== text ||
      sections.some(
        (s, i) =>
          s.kind !== ["focus", "context", "mixed"][i] ||
          !s.text.length ||
          s.start !== (i ? sections[i - 1].end + 1 : 0) ||
          target.units.slice(s.start, s.end).join("") !== s.text,
      ) ||
      sections.at(-1)?.end !== target.units.length
    )
      issues.push(
        "Assessment sections must partition exact grapheme boundaries.",
      );
    if (
      coverage.focus.length > 1 &&
      (Math.max(...coverage.focus.map((r) => r.occurrences)) /
        Math.min(...coverage.focus.map((r) => r.occurrences)) >
        1.75 ||
        (spec.focusType === "substitution" &&
          coverage.focus[0].occurrences < coverage.focus[1].occurrences))
    )
      issues.push("Assessment focus must remain balanced and directional.");
  }
  if (
    coverage.totalGraphemes < Math.ceil(policy.length * C.tolerance.min) ||
    coverage.totalGraphemes > Math.floor(policy.length * C.tolerance.max)
  )
    issues.push("Composition length is outside its strict tolerance.");
  const mins = compositionMinimums(spec, input);
  coverage.focus.forEach((row, i) => {
    if (row.sections.some((n, s) => n < mins[i][s]))
      issues.push("Composition focus exposure is insufficient.");
    if (
      strategy === "curated" &&
      row.contexts.length <
        (spec.focusType === "token" ? policy.tokenContexts : policy.contexts)
    )
      issues.push("Composition needs more varied target contexts.");
  });
  const mixed = sections[2];
  const mixedShare = mixed
    ? prepareTypingText(mixed.text).units.length / coverage.totalGraphemes
    : 0;
  if (mixedShare < policy.mixedMin || mixedShare > policy.mixedMax)
    issues.push("Composition mixed share is outside its contract.");
  if (
    coverage.focus.length &&
    (focusDensity(text, spec) > policy.maxDensity ||
      coverage.mixedOrdinaryTokens < policy.ordinary)
  )
    issues.push(
      "Composition needs lower concentration and more ordinary surrounding content.",
    );
  if (
    coverage.maxTokenShare > policy.identicalShare ||
    coverage.longestIdenticalTokenRun > policy.identicalRun ||
    coverage.longestIsolatedFocusRun > 2
  )
    issues.push("Composition repetition exceeds its contract.");
  return { valid: issues.length === 0, issues, coverage };
}
export const hasFocus = (text: string, spec: AdaptivePracticeSpec) =>
  focusCounts(prepareTypingText(text), spec).some((n) => n > 0);
