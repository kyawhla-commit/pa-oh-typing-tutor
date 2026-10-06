import type { AdaptivePracticeSpec } from "../types";
import { validateSpec } from "../exercises/validate";
import { COMPOSITION } from "./constants";
import type { ExercisePurpose,VariantState } from "./types";
export const variantKey=(spec:AdaptivePracticeSpec,purpose:ExercisePurpose)=>JSON.stringify([purpose,spec.focusType,...spec.focusItems.map(s=>s.normalize("NFC"))]);
export function validVariantKey(key:string):boolean {
  try {
    const [purpose,focusType,...focusItems]=JSON.parse(key);
    if(!["training","controlled-transfer-assessment"].includes(purpose))return false;
    const checked=validateSpec({recommendationId:"variant",focusType,focusItems,desiredLength:{unit:"graphemes",value:120},difficulty:"steady",mode:"fixed-text",completionPolicy:"require-correct-target"});
    return checked.ok && variantKey(checked.spec,purpose)===key;
  }catch{return false;}
}
export function nextVariant(variants:readonly VariantState[],key:string):number {
  return variants.find(v=>v.key===key)?.nextOrdinal??0;
}
export function advanceVariant(variants:readonly VariantState[],key:string,ordinal:number):readonly VariantState[] {
  if(!validVariantKey(key) || ordinal!==nextVariant(variants,key) || ordinal>=COMPOSITION.maxOrdinal)throw Error("Invalid variant reservation.");
  return [...variants.filter(v=>v.key!==key),{key,nextOrdinal:ordinal+1}].slice(-COMPOSITION.maxVariants);
}
