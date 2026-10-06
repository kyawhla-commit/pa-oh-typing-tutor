import { createTypingEngine, type SessionResult } from "../../engine/typing";
import { extractLearningEvidence } from "./evidence";
import { applyLearningEvidence,emptyProfile } from "./profile";
import type { LearningEvidence,LearnerTypingProfile } from "./types";
export function completed(text: string, wrong: readonly number[] = [], actual = "X", mode: "fixed-text" | "timed" | "word-count" = "fixed-text", custom = false): SessionResult {
  const common = { targetText: text,sourceIdentity: { type: custom ? "custom" as const : "corpus" as const,id: "fixture",version: "1" } };
  const engine = createTypingEngine(mode === "timed" ? { ...common,mode,durationMs: 2000,textPolicy: "repeat-corpus" }
    : mode === "word-count" ? { ...common,mode,wordLimit: 1 } : { ...common,mode,completionPolicy: "target-covered" });
  const target = engine.getSnapshot().target.units; const length = mode === "word-count" ? engine.getSnapshot().targetUnitCount : target.length;
  engine.dispatch({ type: "INSERT_TEXT",text: wrong.includes(0) ? actual : target[0],atMs: 0 });
  engine.dispatch({ type: "INSERT_TEXT",text: target.slice(1,length).map((u,i)=>wrong.includes(i+1) ? actual : u).join(""),atMs: mode === "timed" ? 1999 : 2000 });
  if(mode === "timed") engine.dispatch({ type: "TICK",atMs: 2000 });
  return engine.getResult()!;
}
export function evidence(text: string,wrong: readonly number[] = [],id="s1",actual="X"): LearningEvidence {
  return extractLearningEvidence(completed(text,wrong,actual),id,1000)!;
}
export function profileOf(...records: LearningEvidence[]): LearnerTypingProfile { return records.reduce(applyLearningEvidence,emptyProfile()); }
