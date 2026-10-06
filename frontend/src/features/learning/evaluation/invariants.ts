import { PROGRESSION_CONTENT } from "../progression/content";
import { createLearningService } from "../service";
import {
  extractLearningEvidence,
  emptyProfile,
  practiceSpec,
  recommendPractice,
} from "../index";
import {
  emptyMastery,
  weaknessKey,
  weaknessIdentity,
  recommendationIdentity,
} from "../transfer";
import { generateAdaptiveExercise } from "../exercises";
import { syntheticSession } from "./behavior";
import { ordinary, seed, TARGETS } from "./scenarios";
import { ingest, traceState } from "./runner";
import type { InvariantResult } from "./types";
/** Boundary assertions that need independent scopes or metadata, rather than one history. */
export function boundaryInvariants(): InvariantResult[] {
  const rows: InvariantResult[] = [];
  const assert = (id: string, ok: boolean) =>
    rows.push({
      id,
      checks: 1,
      violations: ok ? [] : [`Boundary invariant failed: ${id}`],
    });
  const disk = new Map<string, string>(),
    storage = {
      getItem: (k: string) => disk.get(k) ?? null,
      setItem: (k: string, v: string) => {
        disk.set(k, v);
      },
    },
    service = createLearningService(storage, (job) => job());
  const result = syntheticSession(seed(TARGETS[0]));
  service.complete("anonymous-A", "boundary-1", result, 0);
  assert(
    "scope-isolation",
    service.getSnapshot("anonymous-A").profile.sessionCount === 1 &&
      service.getSnapshot("anonymous-B").profile.sessionCount === 0 &&
      service.getSnapshot("anonymous-B").mastery.records.length === 0,
  );
  const reloaded = createLearningService(storage, (job) => job());
  assert(
    "save-independent",
    reloaded.getSnapshot("anonymous-A").profile.sessionCount === 1,
  );
  service.complete("anonymous-A", "boundary-1", result, 0);
  assert(
    "deterministic-replay",
    service.getSnapshot("anonymous-A").profile.sessionCount === 1,
  );
  service.complete(
    "anonymous-A",
    "aborted",
    syntheticSession(ordinary("abort", undefined, [], { abort: true })),
    0,
  );
  assert(
    "aborts-excluded",
    service.getSnapshot("anonymous-A").profile.sessionCount === 1,
  );
  const directional = extractLearningEvidence(
    syntheticSession(seed(TARGETS[1])),
    "directional",
    0,
  )!;
  assert(
    "directional-confusion",
    directional.aggregates.substitutions.some(
      (s) => s.expected === "r" && s.actual === "t",
    ) &&
      !directional.aggregates.substitutions.some(
        (s) => s.expected === "t" && s.actual === "r",
      ),
  );
  const malformed = {
    recommendationId: "unsupported-unicode",
    focusType: "grapheme",
    focusItems: ["\ud800"],
    desiredLength: { unit: "graphemes", value: 120 },
    difficulty: "steady",
    mode: "fixed-text",
    completionPolicy: "require-correct-target",
  };
  const unsupported = generateAdaptiveExercise(malformed, {
    learnerKey: "anonymous-unicode",
  });
  assert(
    "unicode-identity",
    weaknessKey(weaknessIdentity("grapheme", ["e\u0301"])) ===
      weaknessKey(weaknessIdentity("grapheme", ["é"])) &&
      weaknessIdentity("token", ["ပအိုဝ်ႏ"]).items[0] === "ပအိုဝ်ႏ" &&
      !unsupported.ok &&
      malformed.focusItems[0] === "\ud800",
  );
  const first = ingest(
    emptyProfile(),
    emptyMastery(),
    extractLearningEvidence(result, "seed", 0)!,
  );
  const rec = recommendPractice(first.profile).find(
      (r) => recommendationIdentity(r)?.kind === "grapheme",
    )!,
    spec = practiceSpec(rec);
  let a = first,
    b = first;
  const ids = [];
  for (const [ordinal, version] of [
    [0, "evaluation-old"],
    [31, "evaluation-new"],
  ] as const) {
    const g = generateAdaptiveExercise(spec, {
      learnerKey: "metadata",
      generatorVersion: version,
      bank: {
        ...PROGRESSION_CONTENT,
        version:
          ordinal === 0 ? "evaluation-content-old" : "evaluation-content-new",
      },
      composition: { level: 0, ordinal, purpose: "training" },
    });
    if (!g.ok) throw Error("Invariant exercise failed");
    ids.push(g.exercise.id);
    const e = g.exercise,
      attribution = {
        sourceId: e.source.id,
        sourceVersion: e.source.version,
        focusType: e.focusType,
        focusItems: e.focusItems,
        composition: e.generatedFrom.composition,
      };
    const evidence = extractLearningEvidence(
      syntheticSession(ordinary("generated", e.text), e.source),
      "generated",
      0,
    )!;
    if (ordinal === 0)
      a = ingest(first.profile, first.mastery, evidence, attribution);
    else b = ingest(first.profile, first.mastery, evidence, attribution);
  }
  const identities = (p: typeof first) =>
    p.mastery.records.map((r) => weaknessKey(r.identity));
  assert(
    "ordinal-identity",
    ids[0] !== ids[1] &&
      JSON.stringify(identities(a)) === JSON.stringify(identities(b)),
  );
  assert(
    "version-identity",
    JSON.stringify(identities(a)) === JSON.stringify(identities(b)) &&
      a.mastery.records.find((r) => r.identity.kind === "grapheme")?.training
        .length === 1 &&
      b.mastery.records.find((r) => r.identity.kind === "grapheme")?.training
        .length === 1,
  );
  assert(
    "no-auto-launch",
    (service.getSnapshot("anonymous-A").mastery.variants?.length ?? 0) === 0,
  );
  // Two fresh replays include identical actions, not just matching counters.
  const again = ingest(
    emptyProfile(),
    emptyMastery(),
    extractLearningEvidence(result, "seed", 0)!,
  );
  assert(
    "deterministic-replay",
    JSON.stringify(traceState(first.profile, first.mastery)) ===
      JSON.stringify(traceState(again.profile, again.mastery)),
  );
  return rows;
}
