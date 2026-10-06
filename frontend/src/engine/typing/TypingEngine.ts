import { calculateMetrics } from "./metrics";
import { createGraphemeSegmenter, prepareTarget, requirePreparedText, segmentAppendedTail } from "./text";
import { SCORING_VERSION } from "./types";
import type {
  AttemptCounts, CompletionPolicy, DispatchOutcome, MistakeRecord, SessionResult, SessionSnapshot,
  SessionStatus, TargetText, TypedUnit, TypingEngineConfig, TypingEvent, TypingMode, TextSourceIdentity, WordProgress,
} from "./types";

interface BufferUnit extends TypedUnit {
  readonly mistakeIndex: number | null;
}

type MutableMistake = { -readonly [K in keyof MistakeRecord]: MistakeRecord[K] };

function prepareConfig(config: TypingEngineConfig, segmenter: Intl.Segmenter) {
  const mode = config.mode ?? "fixed-text";
  if (!["fixed-text", "timed", "word-count"].includes(mode)) throw new RangeError("Unknown typing mode.");
  if ((mode !== "timed" && config.durationMs !== undefined)
    || (mode !== "word-count" && config.wordLimit !== undefined)
    || (mode !== "fixed-text" && config.completionPolicy !== undefined)
    || (mode !== "timed" && config.textPolicy !== undefined)) {
    throw new RangeError("Configuration contains fields for another mode.");
  }
  if (config.preparedText !== undefined && config.targetText !== undefined) {
    throw new RangeError("Supply preparedText or targetText, not both.");
  }
  const durationMs = config.mode === "timed" ? config.durationMs : null;
  if (config.mode === "timed" && (!Number.isFinite(config.durationMs) || config.durationMs <= 0)) {
    throw new RangeError("durationMs must be finite and greater than zero.");
  }
  if (config.mode === "timed" && config.textPolicy !== "repeat-corpus") {
    throw new RangeError("Timed sessions require explicit repeat-corpus textPolicy.");
  }
  const target = config.preparedText !== undefined
    ? requirePreparedText(config.preparedText) : prepareTarget(config.targetText!, segmenter).target;
  const wordLimit = config.mode === "word-count" ? config.wordLimit : null;
  if (config.mode === "word-count" && (!Number.isSafeInteger(config.wordLimit) || config.wordLimit <= 0)) {
    throw new RangeError("wordLimit must be a positive safe integer.");
  }
  if (wordLimit !== null && wordLimit > target.words.length) {
    throw new RangeError(`wordLimit ${wordLimit} exceeds prepared word count ${target.words.length}.`);
  }
  const sourceIdentity = config.sourceIdentity ? Object.freeze({
    type: config.sourceIdentity.type, id: config.sourceIdentity.id, version: config.sourceIdentity.version,
  }) : null;
  return {
    target, expectedUnits: target.expectedUnits, mode, durationMs, wordLimit, sourceIdentity,
    targetUnitCount: wordLimit === null ? target.units.length : target.words[wordLimit - 1].end,
    completionPolicy: mode === "fixed-text" ? config.completionPolicy ?? "require-correct-target" : null,
  };
}

/** Synchronous domain engine; clocks, text preparation and UI stay with callers. */
export class TypingEngine {
  #segmenter = createGraphemeSegmenter();
  #target: TargetText;
  #expectedUnits: readonly string[];
  #completionPolicy: CompletionPolicy | null;
  #mode: TypingMode;
  #durationMs: number | null;
  #wordLimit: number | null;
  #targetUnitCount: number;
  #sourceIdentity: TextSourceIdentity | null;
  #status: SessionStatus = "ready";
  #typed: BufferUnit[] = [];
  #mistakes: MutableMistake[] = [];
  #totalAttempts = 0;
  #correctAttempts = 0;
  #incorrectAttempts = 0;
  #correctedErrors = 0;
  #currentCorrect = 0;
  #backspaces = 0;
  #startedAtMs: number | null = null;
  #completedAtMs: number | null = null;
  #abortedAtMs: number | null = null;
  #pausedAtMs: number | null = null;
  #pausedDurationMs = 0;
  #activeElapsedMs = 0;
  #lastTimestampMs: number | null = null;
  #snapshot: SessionSnapshot | null = null;
  #result: SessionResult | null = null;

  constructor(config: TypingEngineConfig) {
    const prepared = prepareConfig(config, this.#segmenter);
    this.#completionPolicy = prepared.completionPolicy;
    this.#mode = prepared.mode;
    this.#durationMs = prepared.durationMs;
    this.#wordLimit = prepared.wordLimit;
    this.#targetUnitCount = prepared.targetUnitCount;
    this.#sourceIdentity = prepared.sourceIdentity;
    this.#target = prepared.target;
    this.#expectedUnits = prepared.expectedUnits;
  }

  dispatch(event: TypingEvent): DispatchOutcome {
    const input = event.type === "INSERT_TEXT" ? event.text : "";
    // Terminal events cannot change either state or the frozen result, including its clock.
    if (this.#status === "completed" || this.#status === "aborted") {
      return this.#outcome(false, 0, "", input);
    }
    if (!Number.isFinite(event.atMs) || event.atMs < 0
      || (this.#lastTimestampMs !== null && event.atMs < this.#lastTimestampMs)) {
      throw new RangeError("atMs must be finite, nonnegative and nondecreasing until reset.");
    }
    this.#lastTimestampMs = event.atMs;
    if (this.#advanceTime(event.atMs)) {
      // Expiration is authoritative even when the browser refresh callback is late.
      return this.#outcome(event.type === "TICK", 0, "", input);
    }

    switch (event.type) {
      case "INSERT_TEXT":
        if (this.#status === "paused" || event.text.length === 0) {
          return this.#outcome(false, 0, "", event.text);
        }
        if (this.#status === "ready") {
          this.#startedAtMs = event.atMs;
          this.#status = "running";
        }
        return this.#insert(event.text, event.atMs);
      case "DELETE_BACKWARD":
        if (this.#status === "paused") return this.#outcome(false);
        this.#backspaces += 1;
        this.#removeTail(event.atMs);
        this.#snapshot = null;
        return this.#outcome(true);
      case "TICK":
        return this.#outcome(this.#status !== "ready");
      case "PAUSE":
        if (this.#status !== "running") return this.#outcome(false);
        this.#pausedAtMs = event.atMs;
        this.#status = "paused";
        this.#snapshot = null;
        return this.#outcome(true);
      case "RESUME":
        if (this.#status !== "paused") return this.#outcome(false);
        this.#pausedDurationMs += event.atMs - this.#pausedAtMs!;
        this.#pausedAtMs = null;
        this.#status = "running";
        this.#snapshot = null;
        return this.#outcome(true);
      case "ABORT":
        if (this.#pausedAtMs !== null) {
          this.#pausedDurationMs += event.atMs - this.#pausedAtMs;
          this.#pausedAtMs = null;
        }
        this.#status = "aborted";
        this.#abortedAtMs = event.atMs;
        this.#snapshot = null;
        return this.#outcome(true);
    }
  }

  getSnapshot(): SessionSnapshot {
    if (this.#snapshot) return this.#snapshot;
    const wordProgress = this.#wordProgress();
    const counts: AttemptCounts = Object.freeze({
      totalInsertionAttempts: this.#totalAttempts,
      correctInsertionAttempts: this.#correctAttempts,
      incorrectInsertionAttempts: this.#incorrectAttempts,
      correctedErrors: this.#correctedErrors,
      uncorrectedErrors: this.#typed.length - this.#currentCorrect,
      backspaces: this.#backspaces,
      currentCorrectUnits: this.#currentCorrect,
      currentTypedUnits: this.#typed.length,
    });
    this.#snapshot = Object.freeze({
      status: this.#status,
      mode: this.#mode,
      completionPolicy: this.#completionPolicy,
      textPolicy: this.#mode === "timed" ? "repeat-corpus" : "finite-target",
      durationMs: this.#durationMs,
      remainingMs: this.#durationMs === null ? null : Math.max(0, this.#durationMs - this.#activeElapsedMs),
      wordLimit: this.#wordLimit, wordProgress, sourceIdentity: this.#sourceIdentity,
      targetUnitCount: this.#targetUnitCount,
      target: this.#target,
      typedUnits: Object.freeze(this.#typed.map(({ text, correct }) => Object.freeze({ text, correct }))),
      currentPosition: this.#typed.length,
      progress: wordProgress ? wordProgress.progress : this.#durationMs === null
        ? Math.min(1, Math.max(0, this.#typed.length / this.#targetUnitCount))
        : Math.min(1, Math.max(0, this.#activeElapsedMs / this.#durationMs)),
      startedAtMs: this.#startedAtMs,
      completedAtMs: this.#completedAtMs,
      abortedAtMs: this.#abortedAtMs,
      pausedAtMs: this.#pausedAtMs,
      activeElapsedMs: this.#activeElapsedMs,
      counts,
      metrics: calculateMetrics(counts, this.#activeElapsedMs),
      scoringVersion: SCORING_VERSION,
    });
    return this.#snapshot;
  }

  getResult(): SessionResult | null {
    return this.#result;
  }

  /** Starts a new ready session. Invalid replacement targets leave this session intact. */
  reset(config?: TypingEngineConfig): void {
    if (config) {
      const prepared = prepareConfig(config, this.#segmenter);
      this.#completionPolicy = prepared.completionPolicy;
      this.#mode = prepared.mode;
      this.#durationMs = prepared.durationMs;
      this.#wordLimit = prepared.wordLimit;
      this.#targetUnitCount = prepared.targetUnitCount;
      this.#sourceIdentity = prepared.sourceIdentity;
      this.#target = prepared.target;
      this.#expectedUnits = prepared.expectedUnits;
    }
    this.#status = "ready";
    this.#typed = [];
    this.#mistakes = [];
    this.#totalAttempts = 0;
    this.#correctAttempts = 0;
    this.#incorrectAttempts = 0;
    this.#correctedErrors = 0;
    this.#currentCorrect = 0;
    this.#backspaces = 0;
    this.#startedAtMs = null;
    this.#completedAtMs = null;
    this.#abortedAtMs = null;
    this.#pausedAtMs = null;
    this.#pausedDurationMs = 0;
    this.#activeElapsedMs = 0;
    this.#lastTimestampMs = null;
    this.#snapshot = null;
    this.#result = null;
  }

  #advanceTime(atMs: number): boolean {
    if (this.#status !== "running") return false;
    const deadline = this.#durationMs === null ? null : this.#startedAtMs! + this.#pausedDurationMs + this.#durationMs;
    if (deadline !== null && atMs >= deadline) {
      this.#activeElapsedMs = this.#durationMs!;
      this.#complete(deadline, "time-expired");
      return true;
    }
    const elapsed = Math.max(0, atMs - this.#startedAtMs! - this.#pausedDurationMs);
    const next = this.#durationMs === null ? elapsed : Math.min(this.#durationMs, elapsed);
    if (next !== this.#activeElapsedMs) {
      this.#activeElapsedMs = next;
      this.#snapshot = null;
    }
    return false;
  }

  #insert(text: string, atMs: number): DispatchOutcome {
    const previous = this.#typed[this.#typed.length - 1];
    const tail = previous?.text ?? "";
    let first = true;
    let acceptedCodeUnits = 0;
    let insertedAttempts = 0;
    for (const part of segmentAppendedTail(this.#segmenter, tail, text)) {
      if (first && previous) {
        first = false;
        if (part.segment === tail) continue;
        // A changed cluster is a new revision attempt. Do not rewrite historical accuracy.
        this.#removeTail(atMs);
      }
      first = false;
      const position = this.#typed.length;
      // A full wrong buffer can revise its tail, but cannot append another position.
      if (this.#mode !== "timed" && position >= this.#targetUnitCount) break;
      const expectedPosition = this.#mode === "timed" ? position % this.#expectedUnits.length : position;
      const correct = part.segment.normalize("NFC") === this.#expectedUnits[expectedPosition];
      this.#totalAttempts += 1;
      insertedAttempts += 1;
      let mistakeIndex: number | null = null;
      if (correct) {
        this.#correctAttempts += 1;
        this.#currentCorrect += 1;
      } else {
        this.#incorrectAttempts += 1;
        mistakeIndex = this.#mistakes.length;
        this.#mistakes.push({
          attempt: this.#totalAttempts, position, text: part.segment, atMs, correctedAtMs: null,
        });
      }
      this.#typed.push({ text: part.segment, correct, mistakeIndex });
      acceptedCodeUnits = part.index + part.segment.length - tail.length;
      if (this.#mode !== "timed" && this.#typed.length === this.#targetUnitCount) break;
    }
    this.#snapshot = null;
    if (this.#mode === "word-count" && this.#typed.length === this.#targetUnitCount) {
      this.#complete(atMs, "word-limit-reached");
    } else if (this.#mode === "fixed-text" && this.#typed.length === this.#targetUnitCount
      && (this.#completionPolicy === "target-covered" || this.#currentCorrect === this.#targetUnitCount)) {
      this.#complete(atMs, this.#completionPolicy === "target-covered" ? "target-covered" : "correct-target");
    }
    return this.#outcome(insertedAttempts > 0, insertedAttempts, text.slice(0, acceptedCodeUnits), text.slice(acceptedCodeUnits));
  }

  #wordProgress(): WordProgress | null {
    if (this.#wordLimit === null) return null;
    let low = 0, high = this.#wordLimit;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (this.#target.words[middle].end <= this.#typed.length) low = middle + 1;
      else high = middle;
    }
    return Object.freeze({ targetWordCount: this.#wordLimit, consumedWords: low,
      remainingWords: this.#wordLimit - low, progress: low / this.#wordLimit });
  }

  #complete(atMs: number, reason: SessionResult["completionReason"]): void {
    this.#status = "completed";
    this.#completedAtMs = atMs;
    this.#snapshot = null;
    this.#result = Object.freeze({
      ...this.getSnapshot(), status: "completed", completionReason: reason,
      startedAtMs: this.#startedAtMs!, completedAtMs: atMs,
      mistakes: Object.freeze(this.#mistakes.map((mistake) => Object.freeze({ ...mistake }))),
    });
  }

  #removeTail(atMs: number): void {
    const removed = this.#typed.pop();
    if (!removed) return;
    if (removed.correct) {
      this.#currentCorrect -= 1;
    } else {
      this.#correctedErrors += 1;
      this.#mistakes[removed.mistakeIndex!].correctedAtMs = atMs;
    }
  }

  #outcome(accepted: boolean, insertedAttempts = 0, acceptedText = "", rejectedText = ""): DispatchOutcome {
    return Object.freeze({ accepted, insertedAttempts, acceptedText, rejectedText });
  }
}

export function createTypingEngine(config: TypingEngineConfig): TypingEngine {
  return new TypingEngine(config);
}
