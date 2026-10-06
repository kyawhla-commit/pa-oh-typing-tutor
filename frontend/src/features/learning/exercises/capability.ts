import type { AdaptivePracticeSpec } from "../types";
import type { CompositionInput } from "../progression/types";
import type { ContentBank } from "./content";
import { PROGRESSION_CONTENT } from "../progression/content";
import { ENGLISH_CONTENT } from "./content";
import { generateAdaptiveExercise } from "./generator";
import type { GenerationResult } from "./types";
import { freezeProfileValue } from "../aggregation";
export const CAPABILITY_CACHE_LIMIT = 128;
export interface GenerationOptions {
  readonly learnerKey: string;
  readonly composition?: CompositionInput;
  readonly bank?: ContentBank;
  readonly generatorVersion?: string;
}
const cache = new WeakMap<ContentBank, Map<string, GenerationResult>>();
/** Pure preflight before offering an action. A verified witness proves this
 * exact bank, focus, scope, level, purpose and ordinal is executable. Bounded
 * cache avoids recomputing it on React renders and start; no session is made. */
export function canGenerateExercise(
  spec: AdaptivePracticeSpec,
  options: GenerationOptions,
): GenerationResult {
  const bank =
    options.bank ??
    (options.composition ? PROGRESSION_CONTENT : ENGLISH_CONTENT);
  const key = JSON.stringify([
    spec,
    options.learnerKey,
    options.composition,
    options.generatorVersion,
  ]);
  let entries = cache.get(bank);
  if (!entries) {
    entries = new Map();
    cache.set(bank, entries);
  }
  const previous = entries.get(key);
  if (previous) return previous;
  const result = freezeProfileValue(
    generateAdaptiveExercise(spec, { ...options, bank }),
  );
  if (entries.size >= CAPABILITY_CACHE_LIMIT)
    entries.delete(entries.keys().next().value!);
  entries.set(key, result);
  return result;
}
