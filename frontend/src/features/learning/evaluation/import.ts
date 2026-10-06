import { prepareTypingText } from "../../../engine/typing";
import {
  emptyProfile,
  applyLearningEvidence,
  serializeProfile,
  parseProfile,
} from "../index";
import { validAttribution, weaknessIdentity } from "../transfer";
import { freezeProfileValue } from "../aggregation";
import { EVALUATION } from "./constants";
import { replayHistory } from "./runner";
import type { AnonymousHistory, AnonymousSession } from "./types";
function keys(o: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (
    !o ||
    typeof o !== "object" ||
    Array.isArray(o) ||
    Object.keys(o).some((k) => !allowed.includes(k))
  )
    throw Error("Unexpected anonymized schema field");
  return o as Record<string, unknown>;
}
const validGrapheme = (v: unknown) =>
  typeof v === "string" &&
  v.length > 0 &&
  v.length <= 32 &&
  v === v.normalize("NFC") &&
  prepareTypingText(v).expectedUnits.length === 1 &&
  !Array.from(v).some((c) => {
    const cp = c.codePointAt(0)!;
    return cp >= 0xd800 && cp <= 0xdfff;
  });
const opaque = (v: unknown) =>
  typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
/** Offline import only. Reject unknown fields rather than allowing hidden private payloads. */
export function validateAnonymousHistory(input: unknown): AnonymousHistory {
  if (
    new TextEncoder().encode(JSON.stringify(input)).length >
    EVALUATION.maxImportBytes
  )
    throw Error("History exceeds import bound");
  const o = keys(input, ["version", "anonymousLearnerId", "sessions"]);
  if (
    o.version !== 1 ||
    !opaque(o.anonymousLearnerId) ||
    !Array.isArray(o.sessions) ||
    o.sessions.length > EVALUATION.maxImportSessions
  )
    throw Error("Invalid anonymous history");
  const sessions = o.sessions
    .map((value) => {
      const s = keys(value, ["summary", "aggregates", "attribution"]);
      const summary = keys(s.summary, [
        "sessionId",
        "sourceIdentity",
        "mode",
        "completionReason",
        "recordedAt",
        "activeElapsedMs",
        "rawWpm",
        "correctWpm",
        "attemptAccuracy",
        "characterAccuracy",
        "totalAttempts",
        "incorrectAttempts",
        "correctedErrors",
        "remainingErrors",
        "backspaces",
      ]);
      if (!opaque(summary.sessionId)) throw Error("Opaque session ID required");
      if (summary.sourceIdentity !== null) {
        const source = keys(summary.sourceIdentity, ["type", "id", "version"]);
        if (
          !opaque(source.id) ||
          typeof source.version !== "string" ||
          !/^[A-Za-z0-9_.-]{1,64}(?:\/[A-Za-z0-9_.-]{1,63})?$/.test(
            source.version,
          )
        )
          throw Error("Opaque source identity required");
      }
      const a = keys(s.aggregates, [
        "graphemes",
        "substitutions",
        "bigrams",
        "tokens",
      ]);
      for (const category of ["graphemes", "bigrams", "tokens"]) {
        if (!Array.isArray(a[category])) throw Error("Invalid aggregates");
        for (const item of a[category] as unknown[]) {
          const row = keys(item, [
            "target",
            "opportunities",
            "errorOccurrences",
            "incorrectAttempts",
            "correctedErrors",
            "remainingErrors",
          ]);
          if (!Array.isArray(row.target)) throw Error("Invalid target");
          const kind =
            category === "tokens"
              ? "token"
              : category === "bigrams"
                ? "bigram"
                : "grapheme";
          if (kind === "token") {
            const normalized = weaknessIdentity(kind, row.target as string[]);
            if (JSON.stringify(normalized.items) !== JSON.stringify(row.target))
              throw Error("Targets must be canonical NFC");
          } else if (
            row.target.length !== (kind === "bigram" ? 2 : 1) ||
            !row.target.every(validGrapheme)
          )
            throw Error("Invalid aggregate grapheme");
        }
      }
      if (!Array.isArray(a.substitutions)) throw Error("Invalid substitutions");
      for (const item of a.substitutions) {
        const row = keys(item, [
          "expected",
          "actual",
          "count",
          "corrected",
          "remaining",
        ]);
        if (
          !validGrapheme(row.expected) ||
          !validGrapheme(row.actual) ||
          row.expected === row.actual
        )
          throw Error("Noncanonical substitution");
      }
      const source = summary.sourceIdentity as { type: string } | null;
      if (!source || !["lesson", "corpus", "adaptive"].includes(source.type)) {
        if ((a.tokens as unknown[]).length || (a.bigrams as unknown[]).length)
          throw Error("Private sources cannot contain token/bigram aggregates");
      }
      // Reuse production storage validation for every counter, bound and source/mode pair.
      const candidate = {
        summary,
        aggregates: a,
        mistakes: [],
        exposure: "observed-position-lower-bound",
      } as unknown as import("../types").LearningEvidence;
      const checked = parseProfile(
        serializeProfile(applyLearningEvidence(emptyProfile(), candidate)),
      ).recent[0];
      if (s.attribution) {
        const attribution = keys(s.attribution, [
          "sourceId",
          "sourceVersion",
          "focusType",
          "focusItems",
          "composition",
          "assessmentCheckOrder",
        ]);
        if (attribution.composition)
          keys(attribution.composition, ["level", "ordinal", "purpose"]);
        if (
          !validAttribution(
            checked,
            attribution as unknown as import("../transfer").AdaptiveAttribution,
          )
        )
          throw Error("Invalid adaptive attribution");
      }
      return {
        summary: { ...checked, aggregates: undefined, recordedAt: 0 },
        aggregates: checked.aggregates,
        ...(s.attribution ? { attribution: s.attribution } : {}),
      } as unknown as AnonymousSession;
    })
    .map((s) => {
      const { aggregates: _, ...summary } =
        s.summary as AnonymousSession["summary"] & { aggregates?: unknown };
      return { ...s, summary };
    });
  return freezeProfileValue({
    version: 1 as const,
    anonymousLearnerId: o.anonymousLearnerId as string,
    sessions,
  });
}
export function evaluateLearningHistory(input: unknown) {
  return replayHistory(validateAnonymousHistory(input));
}
