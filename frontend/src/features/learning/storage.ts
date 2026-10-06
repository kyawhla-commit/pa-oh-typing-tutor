import { LEARNING } from "./constants";
import { compareUnicode, freezeProfileValue, targetKey } from "./aggregation";
import { emptyProfile } from "./profile";
import type { Aggregates, ExposureStat, LearnerTypingProfile, RecentSession, SessionSummary, SubstitutionStat } from "./types";
import type { TextSourceIdentity } from "../../engine/typing";

export interface ProfileStorage { getItem(key: string): string | null; setItem(key: string,value: string): void; }
const prefix = "typing-learning-profile:v1:";
export function profileStorageKey(scope: string): string {
  if(!scope || scope.length>LEARNING.maxScopeUnits) throw new RangeError("A bounded learner scope is required.");
  return `${prefix}${encodeURIComponent(scope)}`;
}
const object = (v: unknown): Record<string,unknown> => {
  if(!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Invalid object.");
  return v as Record<string,unknown>;
};
const number = (v: unknown,integer = false): number => {
  if(typeof v !== "number" || !Number.isFinite(v) || v<0 || (integer && !Number.isSafeInteger(v))) throw new Error("Invalid number.");
  return v;
};
const count = (v: unknown) => number(v,true);
const string = (v: unknown,max: number): string => {
  if(typeof v !== "string" || !v.length || v.length>max) throw new Error("Invalid string."); return v;
};
function list<T>(v: unknown,max: number,read: (v: unknown)=>T): T[] {
  if(!Array.isArray(v) || v.length>max) throw new Error("Invalid list."); return v.map(read);
}
function identity(v: unknown): TextSourceIdentity | null {
  if(v===null) return null; const o = object(v);
  if(!["lesson","corpus","quote","custom","adaptive"].includes(o.type as string)) throw new Error("Invalid source type.");
  return { type: o.type as TextSourceIdentity["type"], id: string(o.id,LEARNING.maxIdentityUnits), version: string(o.version,LEARNING.maxIdentityUnits) };
}
function exposure(v: unknown,units: number,maxText: number): ExposureStat {
  const o = object(v); const target = list(o.target,units,v=>string(v,maxText));
  if(target.length !== units) throw new Error("Invalid target.");
  const row = { target, opportunities: count(o.opportunities), errorOccurrences: count(o.errorOccurrences), incorrectAttempts: count(o.incorrectAttempts), correctedErrors: count(o.correctedErrors), remainingErrors: count(o.remainingErrors) };
  if(!row.opportunities || row.errorOccurrences>row.opportunities || row.errorOccurrences>row.incorrectAttempts || row.correctedErrors+row.remainingErrors!==row.incorrectAttempts) throw new Error("Invalid exposure counters.");
  return row;
}
function unique<T>(rows: T[],key: (row: T)=>string): T[] {
  if(new Set(rows.map(key)).size!==rows.length) throw new Error("Duplicate keys.");
  return rows.sort((a,b)=>compareUnicode(key(a),key(b)));
}
function aggregates(v: unknown): Aggregates {
  const o = object(v);
  const substitutions = list<SubstitutionStat>(o.substitutions,LEARNING.substitutions,v=> {
    const s=object(v); const row={ expected: string(s.expected,LEARNING.maxGraphemeUnits), actual: string(s.actual,LEARNING.maxGraphemeUnits), count: count(s.count), corrected: count(s.corrected), remaining: count(s.remaining) };
    if(!row.count || row.corrected+row.remaining!==row.count) throw new Error("Invalid substitution."); return row;
  });
  return { graphemes: unique(list(o.graphemes,LEARNING.graphemes,v=>exposure(v,1,LEARNING.maxGraphemeUnits)),s=>targetKey(s.target)),
    substitutions: unique(substitutions,s=>targetKey([s.expected,s.actual])),
    bigrams: unique(list(o.bigrams,LEARNING.bigrams,v=>exposure(v,2,LEARNING.maxGraphemeUnits)),s=>targetKey(s.target)),
    tokens: unique(list(o.tokens,LEARNING.tokens,v=>exposure(v,1,LEARNING.maxTokenUnits)),s=>targetKey(s.target)) };
}
function summary(o: Record<string,unknown>): SessionSummary {
  if(!["fixed-text","timed","word-count"].includes(o.mode as string)) throw new Error("Invalid mode.");
  const validReason = o.mode === "timed" ? o.completionReason === "time-expired" : o.mode === "word-count" ? o.completionReason === "word-limit-reached" : ["correct-target","target-covered"].includes(o.completionReason as string);
  if(!validReason) throw new Error("Invalid reason.");
  const row: SessionSummary = { sessionId: string(o.sessionId,LEARNING.maxIdentityUnits), sourceIdentity: identity(o.sourceIdentity), mode: o.mode as SessionSummary["mode"], completionReason: o.completionReason as SessionSummary["completionReason"],
    recordedAt: number(o.recordedAt), activeElapsedMs: number(o.activeElapsedMs), rawWpm: number(o.rawWpm), correctWpm: number(o.correctWpm),
    attemptAccuracy: number(o.attemptAccuracy), characterAccuracy: number(o.characterAccuracy), totalAttempts: count(o.totalAttempts), incorrectAttempts: count(o.incorrectAttempts),
    correctedErrors: count(o.correctedErrors), remainingErrors: count(o.remainingErrors), backspaces: count(o.backspaces) };
  if(!row.totalAttempts || row.incorrectAttempts>row.totalAttempts || row.correctedErrors+row.remainingErrors!==row.incorrectAttempts || row.attemptAccuracy>100 || row.characterAccuracy>100) throw new Error("Invalid summary.");
  return row;
}
/** Whitelist/rebuild rather than retaining unknown fields or arbitrary source text. */
function readProfile(value: unknown): LearnerTypingProfile {
  const o = object(value); if(o.version!==LEARNING.version) throw new Error("Unknown profile version.");
  const recent = list<RecentSession>(o.recent,LEARNING.recentSessions,v=> { const s=object(v); return { ...summary(s),aggregates: aggregates(s.aggregates) }; });
  const processedSessionIds = list(o.processedSessionIds,LEARNING.dedupeSessions,v=>string(v,LEARNING.maxIdentityUnits));
  if(new Set(processedSessionIds).size!==processedSessionIds.length || new Set(recent.map(s=>s.sessionId)).size!==recent.length || recent.some(s=>!processedSessionIds.includes(s.sessionId))) throw new Error("Invalid session identities.");
  const p = { version: LEARNING.version, sessionCount: count(o.sessionCount), totalAttempts: count(o.totalAttempts), incorrectAttempts: count(o.incorrectAttempts),
    correctedErrors: count(o.correctedErrors), remainingErrors: count(o.remainingErrors), backspaces: count(o.backspaces), lifetime: aggregates(o.lifetime), recent, processedSessionIds };
  if(p.sessionCount<recent.length || p.sessionCount<processedSessionIds.length || p.incorrectAttempts>p.totalAttempts || p.correctedErrors+p.remainingErrors!==p.incorrectAttempts
    || recent.reduce((n,s)=>n+s.totalAttempts,0)>p.totalAttempts) throw new Error("Invalid profile counters.");
  return freezeProfileValue(p);
}
export function serializeProfile(profile: LearnerTypingProfile): string {
  const text = JSON.stringify(readProfile(profile));
  if(new TextEncoder().encode(text).byteLength>LEARNING.maxProfileBytes) throw new RangeError("Profile exceeds bounded storage size.");
  return text;
}
export function parseProfile(text: string | null): LearnerTypingProfile {
  if(!text || text.length>LEARNING.maxProfileBytes) return emptyProfile();
  try {
    if(new TextEncoder().encode(text).byteLength>LEARNING.maxProfileBytes) return emptyProfile();
    return readProfile(JSON.parse(text));
  } catch { return emptyProfile(); }
}
export function loadProfile(storage: ProfileStorage,scope: string): LearnerTypingProfile {
  try { return parseProfile(storage.getItem(profileStorageKey(scope))); } catch { return emptyProfile(); }
}
export function saveProfile(storage: ProfileStorage,scope: string,profile: LearnerTypingProfile): boolean {
  try { storage.setItem(profileStorageKey(scope),serializeProfile(profile)); return true; } catch { return false; }
}
