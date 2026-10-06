import type { AdaptivePracticeSpec } from "../types";
/** FNV-1a/64: deterministic attribution/selection, not a security primitive. */
export function stableHash(text:string):string {
  let value=14695981039346656037n;
  for(const byte of new TextEncoder().encode(text)) value=BigInt.asUintN(64,(value^BigInt(byte))*1099511628211n);
  return value.toString(16).padStart(16,"0");
}
export function canonicalSpec(spec:AdaptivePracticeSpec):string {
  return JSON.stringify([spec.recommendationId,spec.focusType,[...spec.focusItems],spec.desiredLength.unit,spec.desiredLength.value,spec.difficulty,spec.mode,spec.completionPolicy]);
}
export function selectionSeed(spec:AdaptivePracticeSpec,learnerKey:string,generatorVersion:string,contentVersion:string):string {
  return stableHash(JSON.stringify([canonicalSpec(spec),learnerKey,generatorVersion,contentVersion]));
}
/** Hash text as well as versions/spec so a material content change changes identity. */
export function exerciseIdentity(seed:string,text:string,generatorVersion:string,contentVersion:string) {
  return {type:"adaptive" as const,id:`adaptive-${stableHash(JSON.stringify([seed,text]))}`,version:`${generatorVersion}/${contentVersion}`};
}
export function ordered<T>(items:readonly T[],seed:string):T[] {
  const result=[...items];let state=Number.parseInt(stableHash(seed).slice(0,8),16)||1;
  // Seeded Fisher–Yates with xorshift32. No runtime entropy or time dependency.
  for(let i=result.length-1;i>0;i--) {
    state^=state<<13;state^=state>>>17;state^=state<<5;
    const j=(state>>>0)%(i+1);[result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}
