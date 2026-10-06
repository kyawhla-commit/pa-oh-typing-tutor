import { prepareTypingText, type TargetText, type TextSourceIdentity, type TypingEngineConfig, type TypingModeConfig } from "../../engine/typing";

type SourceDetails = {
  readonly id: string;
  readonly version: string;
  readonly text: string;
  readonly title?: string;
  readonly language?: string;
  readonly difficulty?: string;
  /** Preserve existing lesson/test behavior by default; custom callers may request LF. */
  readonly lineEndings?: "preserve" | "lf";
};

export type TypingTextSource = SourceDetails & (
  | { readonly type: "lesson" | "corpus" | "custom" | "adaptive" }
  | { readonly type: "quote"; readonly author?: string; readonly attribution?: string }
);

export interface PreparedTextSource {
  readonly source: TypingTextSource;
  readonly identity: TextSourceIdentity;
  readonly preparedText: TargetText;
}

/** Validate metadata here; segment once with the domain's existing preparation. */
export function prepareTextSource(source: TypingTextSource): PreparedTextSource {
  if (!["lesson", "corpus", "quote", "custom", "adaptive"].includes(source.type)) throw new RangeError("Unknown text source type.");
  if (typeof source.id !== "string" || !source.id.trim() || typeof source.version !== "string" || !source.version.trim()) {
    throw new RangeError("Text sources require a nonempty id and version.");
  }
  if (typeof source.text !== "string" || source.text.length === 0 || ((source.type === "custom" || source.type === "quote") && !source.text.trim())) throw new RangeError("Source text must contain non-whitespace content.");
  if (source.lineEndings !== undefined && source.lineEndings !== "preserve" && source.lineEndings !== "lf") {
    throw new RangeError("Unknown line-ending policy.");
  }
  const text = source.lineEndings === "lf" ? source.text.replace(/\r\n?/g, "\n") : source.text;
  const frozenSource = Object.freeze({ ...source, text });
  return Object.freeze({ source: frozenSource,
    identity: Object.freeze({ type: source.type, id: source.id, version: source.version }),
    preparedText: prepareTypingText(text),
  });
}

/** Quote/custom sources use normal fixed sessions; no alternate scoring path. */
export function createSourceSessionConfig(prepared: PreparedTextSource, mode: TypingModeConfig = { mode: "fixed-text", completionPolicy: "require-correct-target" }): TypingEngineConfig {
  return Object.freeze({ ...mode, preparedText: prepared.preparedText, sourceIdentity: prepared.identity });
}

/** Compact deterministic revision for catalog content without a revision column.
 * FNV-1a is attribution, not an integrity/anti-cheat primitive. */
export function textContentVersion(text: string): string {
  let hash = 14695981039346656037n;
  for (let i = 0; i < text.length; i++) hash = BigInt.asUintN(64, (hash ^ BigInt(text.charCodeAt(i))) * 1099511628211n);
  return `text-${hash.toString(16).padStart(16, "0")}`;
}
