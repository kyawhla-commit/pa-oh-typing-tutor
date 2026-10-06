import { validComposition } from "../progression/composition";
import type { SessionSummary, PracticeRecommendation } from "../types";
import { prepareTypingText } from "../../../engine/typing";
import type { AdaptiveAttribution, EvidenceContext, WeaknessIdentity, WeaknessKind } from "./types";
const kinds = ["grapheme","substitution","bigram","token","accuracy","speed"] as const;
export function weaknessIdentity(kind: WeaknessKind, items: readonly string[]): WeaknessIdentity {
  if(!kinds.includes(kind)) throw new Error("Unknown weakness kind.");
  const normalized = items.map(s=>s.normalize("NFC"));
  const length = kind === "substitution" || kind === "bigram" ? 2 : kind === "accuracy" || kind === "speed" ? 0 : 1;
  if(normalized.length!==length || normalized.some(s=>!s.length || s.length>32 || /^\s+$/u.test(s) || /[\u0000-\u001f\u007f]/u.test(s)
    || Array.from(s).some(c=>c.length===1 && c.charCodeAt(0)>=0xd800 && c.charCodeAt(0)<=0xdfff))) throw new Error("Invalid weakness items.");
  if(kind!=="token" && normalized.some(s=>prepareTypingText(s).expectedUnits.length!==1)) throw new Error("Expected grapheme items.");
  if(kind==="substitution" && normalized[0]===normalized[1]) throw new Error("Confusion must be directional and distinct.");
  if(kind==="token" && /\s/u.test(normalized[0])) throw new Error("Expected one bounded token.");
  return {kind,items:normalized};
}
export const weaknessKey = (identity: WeaknessIdentity) => JSON.stringify([identity.kind,...identity.items]);
export function recommendationIdentity(rec: PracticeRecommendation): WeaknessIdentity | null {
  const kind = { WEAK_GRAPHEME:"grapheme", SUBSTITUTION_CONFUSION:"substitution", WEAK_BIGRAM:"bigram", DIFFICULT_WORD:"token", ACCURACY_FOCUS:"accuracy", SPEED_BUILDING:"speed", GENERAL_PRACTICE:null } as const;
  try { return kind[rec.type] ? weaknessIdentity(kind[rec.type]!,rec.targets) : null; } catch { return null; }
}
export function validAttribution(summary: SessionSummary, attribution?: AdaptiveAttribution): boolean {
  const source=summary.sourceIdentity;
  if(source?.type!=="adaptive" || summary.mode!=="fixed-text" || !attribution || source.id!==attribution.sourceId || source.version!==attribution.sourceVersion) return false;
  try {
    if(attribution.composition && !validComposition(attribution.composition))return false;
    if(attribution.composition?.purpose==="controlled-transfer-assessment" && (!source.id.startsWith("assessment-") || !Number.isSafeInteger(attribution.assessmentCheckOrder)))return false;
    if(attribution.focusType==="general") return attribution.focusItems.length===0;
    if(attribution.focusType==="grapheme" || attribution.focusType==="token"){
      if(attribution.focusItems.length<1 || attribution.focusItems.length>2)return false;
      const keys=attribution.focusItems.map(item=>weaknessKey(weaknessIdentity(attribution.focusType as "grapheme"|"token",[item])));
      return new Set(keys).size===keys.length;
    }
    weaknessIdentity(attribution.focusType,attribution.focusItems);return true;
  } catch { return false; }
}
export function classifyEvidence(summary: SessionSummary, attribution?: AdaptiveAttribution): EvidenceContext {
  if(summary.sourceIdentity?.type==="adaptive") {
    if(!validAttribution(summary,attribution)) return "unknown";
    if(attribution!.composition?.purpose==="controlled-transfer-assessment")return "controlled-transfer-assessment";
    return attribution!.focusType==="general" ? "adaptive-general" : "adaptive-targeted";
  }
  if(!summary.sourceIdentity || typeof summary.sourceIdentity.id!=="string" || !summary.sourceIdentity.id.length || summary.sourceIdentity.id.length>128 || typeof summary.sourceIdentity.version!=="string" || !summary.sourceIdentity.version.length || summary.sourceIdentity.version.length>128 || !["lesson","corpus","quote","custom"].includes(summary.sourceIdentity.type)) return "unknown";
  return summary.mode==="timed" ? "timed-test" : summary.mode==="word-count" ? "word-test" : summary.mode==="fixed-text" ? "ordinary-practice" : "unknown";
}
function matchesFocus(summary: SessionSummary, identity: WeaknessIdentity, attribution?: AdaptiveAttribution): boolean {
  if(!validAttribution(summary,attribution) || attribution!.focusType==="general") return false;
  if(attribution!.focusType==="grapheme" || attribution!.focusType==="token")return attribution!.focusType===identity.kind && attribution!.focusItems.some(item=>weaknessKey(weaknessIdentity(identity.kind,[item]))===weaknessKey(identity));
  return weaknessKey(weaknessIdentity(attribution!.focusType,attribution!.focusItems))===weaknessKey(identity);
}
/** Conservative v1: ALL adaptive content excluded, even unrelated/general exercises. */
export const isTransferContext = (context: EvidenceContext) => ["ordinary-practice","timed-test","word-test"].includes(context);

export function wasTargeted(summary:SessionSummary,identity:WeaknessIdentity,attribution?:AdaptiveAttribution):boolean {
  return attribution?.composition?.purpose!=="controlled-transfer-assessment" && matchesFocus(summary,identity,attribution);
}
export function wasAssessed(summary:SessionSummary,identity:WeaknessIdentity,attribution?:AdaptiveAttribution):boolean {
  return attribution?.composition?.purpose==="controlled-transfer-assessment" && matchesFocus(summary,identity,attribution);
}
