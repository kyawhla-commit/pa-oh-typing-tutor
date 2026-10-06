import { compareUnicode, freezeProfileValue } from "../aggregation";
import type { LearnerTypingProfile } from "../types";
import type { ProfileStorage } from "../storage";
import { classifyEvidence, isTransferContext, weaknessIdentity, weaknessKey } from "./classify";
import { TRANSFER as T } from "./constants";
import { COMPOSITION,ASSESSMENT } from "../progression/constants";
import { validVariantKey } from "../progression/variants";
import { emptyMastery } from "./progression";
import type { MasteryProfile, MasteryRecord, MasteryState, Observation, WeaknessKind } from "./types";
export function masteryStorageKey(scope: string) {
  if(!scope || scope.length>512) throw new Error("Invalid scope.");
  return `typing-learning-mastery:v2:${encodeURIComponent(scope)}`;
}
export function initializeMastery(profile: LearnerTypingProfile): MasteryProfile {
  // Old profiles can supply a personal ordinary speed baseline, never invented training/transfer.
  const ordinary=profile.recent.map((s,i)=>({order:profile.sessionCount-profile.recent.length+i+1,context:classifyEvidence(s),opportunities:s.totalAttempts,errors:s.incorrectAttempts,accuracy:s.attemptAccuracy,correctWpm:s.correctWpm,activeMs:s.activeElapsedMs}))
    .filter(o=>isTransferContext(o.context) && o.opportunities>=T.sessionMinimum.accuracy && o.activeMs>=T.minActiveMs).slice(-T.speedBaselineSessions);
  return freezeProfileValue({...emptyMastery(profile.sessionCount),ordinary});
}
const object=(v:unknown):Record<string,unknown>=>{if(!v || typeof v!=="object" || Array.isArray(v))throw Error("Invalid object.");return v as Record<string,unknown>;};
const count=(v:unknown)=>{if(typeof v!=="number" || !Number.isSafeInteger(v) || v<0)throw Error("Invalid count.");return v;};
const number=(v:unknown)=>{if(typeof v!=="number" || !Number.isFinite(v) || v<0)throw Error("Invalid number.");return v;};
const text=(v:unknown,max:number)=>{if(typeof v!=="string" || !v.length || v.length>max)throw Error("Invalid string.");return v;};
function list<TValue>(v:unknown,max:number,read:(v:unknown)=>TValue):TValue[]{if(!Array.isArray(v) || v.length>max)throw Error("Invalid list.");return v.map(read);}
function read(value:unknown):MasteryProfile {
  const root=object(value);if(root.version!==1 && root.version!==2)throw Error("Unknown mastery version.");const legacy=root.version===1;const order=count(root.order);
  function observation(value:unknown):Observation {
    const o=object(value);const context=text(o.context,32) as Observation["context"];
    if(!["ordinary-practice","timed-test","word-test","adaptive-targeted",...(!legacy ? ["controlled-transfer-assessment"] : [])].includes(context))throw Error("Invalid observation context.");
    const r={order:count(o.order),context,opportunities:count(o.opportunities),errors:count(o.errors),accuracy:number(o.accuracy),correctWpm:number(o.correctWpm),activeMs:number(o.activeMs),...(!legacy && o.attempts!==undefined ? {attempts:count(o.attempts)} : {}),...(!legacy && o.ordinal!==undefined ? {ordinal:count(o.ordinal)} : {})};
    if(!r.order || r.order>order || r.accuracy>100 || (r.ordinal!==undefined && r.ordinal>COMPOSITION.maxOrdinal))throw Error("Invalid observation.");return r;
  }
  function observations(v:unknown,max:number,training:boolean|"assessment"):Observation[]{
    const rows=list(v,max,observation);
    if(rows.some((o,i)=> (training==="assessment" ? o.context!=="controlled-transfer-assessment" || o.ordinal===undefined || o.attempts===undefined : training ? o.context!=="adaptive-targeted" : !isTransferContext(o.context)) || (i>0 && o.order<=rows[i-1].order)))throw Error("Invalid observation ordering.");return rows;
  }
  const records=list<MasteryRecord>(root.records,T.records,v=>{
    const r=object(v),i=object(r.identity);
    const identity=weaknessIdentity(text(i.kind,32) as WeaknessKind,list(i.items,2,v=>text(v,32)));
    const state=text(r.state,32) as MasteryState;
    if(!["INSUFFICIENT_EVIDENCE","ACTIVE","IMPROVING","TRANSFER_CHECK","PROVISIONAL_MASTERY","REGRESSED"].includes(state))throw Error("Invalid state.");
    const epoch=count(r.epoch),stateSince=count(r.stateSince),lastSeen=count(r.lastSeen);
    if(epoch>stateSince || stateSince>order || lastSeen>order || lastSeen<epoch)throw Error("Invalid record ordering.");
    const baselineWpm=r.baselineWpm===null ? null : number(r.baselineWpm);
    if(baselineWpm!==null && (baselineWpm<=0 || identity.kind!=="speed"))throw Error("Invalid baseline.");
    const training=observations(r.training,T.trainingWindow,true),transfer=observations(r.transfer,T.transferWindow,false);
    if([...training,...transfer].some(o=>o.order>lastSeen || o.order<=epoch) || new Set([...training,...transfer].map(o=>o.order)).size!==training.length+transfer.length)throw Error("Invalid record evidence.");
    const practiceLevel=legacy ? state==="IMPROVING" ? 1 : state==="TRANSFER_CHECK" || state==="PROVISIONAL_MASTERY" ? 2 : 0 : count(r.practiceLevel??0);
    if(practiceLevel>2)throw Error("Invalid composition level.");
    const checkOrder=legacy ? state==="TRANSFER_CHECK" ? stateSince : null : r.checkOrder===null || r.checkOrder===undefined ? null : count(r.checkOrder);
    if(checkOrder!==null && (checkOrder>order || checkOrder<epoch))throw Error("Invalid transfer-check order.");
    const waiting=legacy ? [] : observations(r.waiting??[],ASSESSMENT.waitingSessions,false);
    const assessments=legacy ? [] : observations(r.assessments??[],ASSESSMENT.window,"assessment");
    const naturalSinceCheck=legacy ? 0 : count(r.naturalSinceCheck??0);
    if(naturalSinceCheck>T.transferMinimum[identity.kind] || [...waiting,...assessments].some(o=>checkOrder===null || o.order<=checkOrder || o.order>lastSeen) || new Set(assessments.map(o=>o.ordinal)).size!==assessments.length)throw Error("Invalid assessment history.");
    const masteryVia=legacy ? state==="PROVISIONAL_MASTERY" ? "natural" : null : r.masteryVia??null;
    const assessmentFailure=legacy ? null : r.assessmentFailure??null;
    if(![null,"natural","controlled"].includes(masteryVia as null) || ![null,"mild","severe"].includes(assessmentFailure as null))throw Error("Invalid path/failure.");
    return {identity,state,epoch,stateSince,lastSeen,baselineWpm,training,transfer,practiceLevel:practiceLevel as 0|1|2,checkOrder,waiting,assessments,naturalSinceCheck,masteryVia:masteryVia as MasteryRecord["masteryVia"],assessmentFailure:assessmentFailure as MasteryRecord["assessmentFailure"]};
  });
  if(new Set(records.map(r=>weaknessKey(r.identity))).size!==records.length)throw Error("Duplicate weakness.");
  const ordinary=observations(root.ordinary,T.speedBaselineSessions,false);
  const processedSessionIds=list(root.processedSessionIds,T.dedupe,v=>text(v,128));
  if(new Set(processedSessionIds).size!==processedSessionIds.length || processedSessionIds.length>order)throw Error("Duplicate session.");
  const variants=legacy ? [] : list(root.variants??[],COMPOSITION.maxVariants,v=>{const row=object(v),key=text(row.key,256),nextOrdinal=count(row.nextOrdinal);if(!validVariantKey(key) || nextOrdinal>COMPOSITION.maxOrdinal)throw Error("Invalid variant cursor.");return {key,nextOrdinal};});
  if(new Set(variants.map(v=>v.key)).size!==variants.length)throw Error("Duplicate variant cursor.");
  return freezeProfileValue({version:2 as const,order,variants,records:records.sort((a,b)=>compareUnicode(weaknessKey(a.identity),weaknessKey(b.identity))),ordinary,processedSessionIds});
}
export function serializeMastery(profile:MasteryProfile):string {
  const result=JSON.stringify(read(profile));if(new TextEncoder().encode(result).byteLength>T.maxBytes)throw Error("Oversized mastery.");return result;
}
export function parseMastery(text:string|null):MasteryProfile|null {
  if(!text || text.length>T.maxBytes)return null;
  try {if(new TextEncoder().encode(text).byteLength>T.maxBytes)return null;return read(JSON.parse(text));}catch{return null;}
}
export function loadMastery(storage:ProfileStorage,scope:string,profile:LearnerTypingProfile):MasteryProfile {
  try {
    for(const key of [masteryStorageKey(scope),masteryStorageKey(scope).replace(":v2:",":v1:")]){
      const m=parseMastery(storage.getItem(key));
      if(m?.order===profile.sessionCount && m.processedSessionIds.every((id,i)=>id===profile.processedSessionIds[profile.processedSessionIds.length-m.processedSessionIds.length+i]))return m;
    }
  }catch{/* blocked storage */}
  // Mismatched two-key writes fail conservatively, without suppressing current weaknesses.
  return initializeMastery(profile);
}
export function saveMastery(storage:ProfileStorage,scope:string,profile:MasteryProfile):boolean {
  try {storage.setItem(masteryStorageKey(scope),serializeMastery(profile));return true;}catch{return false;}
}
