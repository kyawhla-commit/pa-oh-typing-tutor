import type { SessionResult } from "../../engine/typing";
import { LEARNING } from "./constants";
import { emptyAggregates, freezeProfileValue, mergeAggregates } from "./aggregation";
import type { ExposureStat, LearningEvidence, MistakeEvidence, SubstitutionStat } from "./types";

function useful(text: string) { return text.length <= LEARNING.maxGraphemeUnits; }
/** Completed engine results only. Caller supplies stable feature-session identity. */
export function extractLearningEvidence(result: SessionResult | null, sessionId: string, recordedAt: number): LearningEvidence | null {
  if (!result || result.status !== "completed" || !result.counts || !result.target || !Array.isArray(result.target.units) || !result.metrics || !sessionId || sessionId.length > LEARNING.maxIdentityUnits
    || !Number.isFinite(recordedAt) || recordedAt < 0 || !result.counts.totalInsertionAttempts
    || !Number.isFinite(result.activeElapsedMs) || result.activeElapsedMs < 0
    || !result.target.units.length || !result.target.units.every(u=>typeof u === "string" && u.length>0)
    || !Array.isArray(result.target.words) || !Array.isArray(result.mistakes)
    || !["fixed-text","timed","word-count"].includes(result.mode)
    || !Number.isSafeInteger(result.targetUnitCount) || result.targetUnitCount<=0 || result.targetUnitCount>result.target.units.length
    || !Object.values(result.metrics).every(v=>Number.isFinite(v) && v>=0)) return null;
  const c = result.counts;
  if(!Object.values(c).every(v=>Number.isSafeInteger(v) && v>=0)
    || c.totalInsertionAttempts !== c.correctInsertionAttempts+c.incorrectInsertionAttempts
    || c.incorrectInsertionAttempts !== c.correctedErrors+c.uncorrectedErrors
    || c.currentTypedUnits !== c.currentCorrectUnits+c.uncorrectedErrors
    || c.currentTypedUnits !== result.currentPosition || c.currentTypedUnits !== result.typedUnits?.length
    || result.mistakes.length !== c.incorrectInsertionAttempts
    || result.metrics.attemptAccuracy<0 || result.metrics.attemptAccuracy>100 || result.metrics.characterAccuracy<0 || result.metrics.characterAccuracy>100
    || !Number.isFinite(result.startedAtMs) || !Number.isFinite(result.completedAtMs) || result.startedAtMs<0 || result.completedAtMs<result.startedAtMs) return null;
  const modeReason = result.mode === "timed" ? result.completionReason === "time-expired"
    : result.mode === "word-count" ? result.completionReason === "word-limit-reached"
    : ["correct-target","target-covered"].includes(result.completionReason);
  if (!modeReason) return null;
  const expected = (position: number) => result.target.units[position % result.target.units.length].normalize("NFC");
  const byPosition = new Map<number, typeof result.mistakes[number][]>();
  let observedEnd = result.currentPosition;
  let previousAttempt = 0;
  for (const mistake of result.mistakes) {
    if (!mistake || !Number.isSafeInteger(mistake.position) || mistake.position < 0 || mistake.position>=c.totalInsertionAttempts
      || (result.mode !== "timed" && mistake.position >= result.targetUnitCount)
      || typeof mistake.text !== "string" || !mistake.text.length
      || !Number.isSafeInteger(mistake.attempt) || mistake.attempt<=previousAttempt || mistake.attempt>c.totalInsertionAttempts
      || !Number.isFinite(mistake.atMs) || mistake.atMs<result.startedAtMs || mistake.atMs>result.completedAtMs
      || (mistake.correctedAtMs!==null && (!Number.isFinite(mistake.correctedAtMs) || mistake.correctedAtMs<mistake.atMs || mistake.correctedAtMs>result.completedAtMs))) return null;
    previousAttempt = mistake.attempt;
    const list = byPosition.get(mistake.position) ?? []; list.push(mistake); byPosition.set(mistake.position,list);
    observedEnd = Math.max(observedEnd,mistake.position+1);
  }
  if(result.mistakes.filter(m=>m.correctedAtMs!==null).length!==c.correctedErrors) return null;
  for(const word of result.target.words) {
    if(!word || typeof word.text!=="string" || !word.text.length || !Number.isSafeInteger(word.start) || !Number.isSafeInteger(word.end)
      || word.start<0 || word.end<=word.start || word.end>result.target.units.length) return null;
  }
  const occurrence = (target: readonly string[], positions: readonly number[]): ExposureStat => {
    const mistakes = positions.flatMap(p=>byPosition.get(p) ?? []);
    return { target, opportunities: 1, errorOccurrences: mistakes.length ? 1 : 0, incorrectAttempts: mistakes.length,
      correctedErrors: mistakes.filter(m=>m.correctedAtMs !== null).length, remainingErrors: mistakes.filter(m=>m.correctedAtMs === null).length };
  };
  const graphemes: ExposureStat[] = [], bigrams: ExposureStat[] = [], tokens: ExposureStat[] = [];
  const substitutions: SubstitutionStat[] = []; const examples: MistakeEvidence[] = [];
  const privateSource = !result.sourceIdentity || !["lesson","corpus","adaptive"].includes(result.sourceIdentity.type);
  for (let p=0;p<observedEnd;p++) {
    const unit = expected(p);
    if (useful(unit)) graphemes.push(occurrence([unit],[p]));
    if (!privateSource && p+1<observedEnd && useful(unit) && useful(expected(p+1))) bigrams.push(occurrence([unit,expected(p+1)],[p,p+1]));
  }
  // Associate only completely observed source tokens. Timed corpus cycles retain
  // the prepared boundaries; features provide safe whitespace cycle separators.
  if (!privateSource) {
    const cycles = result.mode === "timed" ? Math.ceil(observedEnd/result.target.units.length) : 1;
    for(let cycle=0;cycle<cycles;cycle++) for(const word of result.target.words) {
      const start = cycle*result.target.units.length+word.start, end = cycle*result.target.units.length+word.end;
      if(end>observedEnd || (result.mode !== "timed" && end>result.targetUnitCount)) continue;
      if(word.text.length<=LEARNING.maxTokenUnits) tokens.push(occurrence([word.text.normalize("NFC")],Array.from({length:end-start},(_,i)=>start+i)));
    }
  }
  for (const m of result.mistakes) {
    const target = expected(m.position), actual = m.text.normalize("NFC");
    if (!useful(target) || !useful(actual)) continue;
    substitutions.push({ expected: target, actual, count: 1, corrected: m.correctedAtMs !== null ? 1 : 0, remaining: m.correctedAtMs === null ? 1 : 0 });
    if(examples.length<LEARNING.mistakeExamples) examples.push({ expected: target, actual, position: m.position, attempt: m.attempt, atMs: m.atMs, correctedAtMs: m.correctedAtMs });
  }
  const identity = result.sourceIdentity;
  const safeIdentity = identity && ["lesson","corpus","quote","custom","adaptive"].includes(identity.type)
    && [identity.id,identity.version].every(s=>typeof s === "string" && s.length>0 && s.length<=LEARNING.maxIdentityUnits)
    ? {type:identity.type,id:identity.id,version:identity.version} : null;
  const summary = { sessionId, sourceIdentity: safeIdentity, mode: result.mode, completionReason: result.completionReason,
    recordedAt, activeElapsedMs: result.activeElapsedMs, ...result.metrics, totalAttempts: result.counts.totalInsertionAttempts,
    incorrectAttempts: result.counts.incorrectInsertionAttempts, correctedErrors: result.counts.correctedErrors,
    remainingErrors: result.counts.uncorrectedErrors, backspaces: result.counts.backspaces };
  return freezeProfileValue({ summary, aggregates: mergeAggregates([{ ...emptyAggregates(), graphemes, bigrams, tokens, substitutions }]),
    mistakes: examples, exposure: "observed-position-lower-bound" });
}
