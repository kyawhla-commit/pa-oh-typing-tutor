import { applyLearningEvidence,emptyProfile } from "../profile";
import { advanceMastery,emptyMastery } from "./progression";
import { weaknessKey } from "./classify";
import { r,session } from "./testFixtures";
import type { AdaptiveAttribution } from "./types";
export function loop(){
  let profile=emptyProfile(),mastery=emptyMastery();
  const ingest=(e:ReturnType<typeof session>,a?:AdaptiveAttribution)=>{const before=profile;profile=applyLearningEvidence(profile,e);mastery=advanceMastery(mastery,before,profile,e,a);};
  const target=()=>mastery.records.find(x=>weaknessKey(x.identity)===weaknessKey(r))!;
  return {ingest,target,get profile(){return profile;},get mastery(){return mastery;}};
}
