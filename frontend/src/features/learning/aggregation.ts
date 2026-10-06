import { LEARNING } from "./constants";
import type { Aggregates, ExposureStat, SubstitutionStat } from "./types";

export const emptyAggregates = (): Aggregates => ({ graphemes: [], substitutions: [], bigrams: [], tokens: [] });
export const targetKey = (target: readonly string[]) => JSON.stringify(target);
/** Scalar-value comparison, independent of locale/collation. */
export function compareUnicode(a: string, b: string): number {
  const left = Array.from(a, c => c.codePointAt(0)!); const right = Array.from(b, c => c.codePointAt(0)!);
  for (let i = 0; i < Math.min(left.length,right.length); i++) if (left[i] !== right[i]) return left[i]-right[i];
  return left.length-right.length;
}
export function exposureRate(stat: ExposureStat): number { return stat.opportunities ? stat.errorOccurrences / stat.opportunities : 0; }
export function mergeExposure(groups: readonly (readonly ExposureStat[])[], limit: number): readonly ExposureStat[] {
  const map = new Map<string, ExposureStat>();
  for (const group of groups) for (const row of group) {
    const key = targetKey(row.target); const old = map.get(key);
    map.set(key, old ? { target: row.target, opportunities: old.opportunities+row.opportunities,
      errorOccurrences: old.errorOccurrences+row.errorOccurrences, incorrectAttempts: old.incorrectAttempts+row.incorrectAttempts,
      correctedErrors: old.correctedErrors+row.correctedErrors, remainingErrors: old.remainingErrors+row.remainingErrors } : { ...row, target: [...row.target] });
  }
  return [...map.values()].sort((a,b) => b.errorOccurrences-a.errorOccurrences || b.incorrectAttempts-a.incorrectAttempts
    || b.opportunities-a.opportunities || compareUnicode(targetKey(a.target),targetKey(b.target))).slice(0,limit)
    .sort((a,b)=>compareUnicode(targetKey(a.target),targetKey(b.target)));
}
export function mergeSubstitutions(groups: readonly (readonly SubstitutionStat[])[]): readonly SubstitutionStat[] {
  const map = new Map<string, SubstitutionStat>();
  for (const group of groups) for (const row of group) {
    const key = targetKey([row.expected,row.actual]); const old = map.get(key);
    map.set(key, old ? { ...row, count: old.count+row.count, corrected: old.corrected+row.corrected, remaining: old.remaining+row.remaining } : { ...row });
  }
  return [...map.values()].sort((a,b)=>b.count-a.count || b.remaining-a.remaining || compareUnicode(targetKey([a.expected,a.actual]),targetKey([b.expected,b.actual])))
    .slice(0,LEARNING.substitutions).sort((a,b)=>compareUnicode(targetKey([a.expected,a.actual]),targetKey([b.expected,b.actual])));
}
export function mergeAggregates(groups: readonly Aggregates[]): Aggregates {
  return { graphemes: mergeExposure(groups.map(g=>g.graphemes),LEARNING.graphemes),
    substitutions: mergeSubstitutions(groups.map(g=>g.substitutions)),
    bigrams: mergeExposure(groups.map(g=>g.bigrams),LEARNING.bigrams), tokens: mergeExposure(groups.map(g=>g.tokens),LEARNING.tokens) };
}
export function freezeProfileValue<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeProfileValue(child);
    Object.freeze(value);
  }
  return value;
}
