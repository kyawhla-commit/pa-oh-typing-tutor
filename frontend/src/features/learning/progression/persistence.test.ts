import { describe, expect, it } from "vitest";
import { createLearningService } from "../service";
import { applyLearningEvidence, emptyProfile } from "../profile";
import { extractLearningEvidence } from "../evidence";
import { recommendPractice } from "../policy";
import { completed } from "../testFixtures";
import { profileStorageKey, serializeProfile } from "../storage";
import { emptyMastery } from "../transfer/progression";
import {
  loadMastery,
  masteryStorageKey,
  parseMastery,
  serializeMastery,
} from "../transfer/storage";
import {
  eligibleRecord,
  finishExercise,
  sourceAttribution,
} from "./testFixtures";
import { variantKey } from "./variants";
import { spec } from "../exercises/testFixtures";
const setup = () => {
  const profile = applyLearningEvidence(
    emptyProfile(),
    extractLearningEvidence(
      completed("r".repeat(24), [0, 1, 2, 3]),
      "seed",
      0,
    )!,
  );
  const values = new Map([
    [profileStorageKey("user:A"), serializeProfile(profile)],
  ]);
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
  return {
    profile,
    values,
    storage,
    service: createLearningService(storage, (j) => j()),
    rec: recommendPractice(profile).find((r) => r.type === "WEAK_GRAPHEME")!,
  };
};
describe("Slice 8 local persistence", () => {
  it("deliberate starts reserve once; reload and sequential service instances observe the next cursor", () => {
    const x = setup();
    const a = x.service.startAdaptive("user:A", x.rec);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.selection.exercise.generatedFrom.composition?.ordinal).toBe(0);
    const next = createLearningService(x.storage, (j) => j()).startAdaptive(
      "user:A",
      x.rec,
    );
    expect(next.ok).toBe(true);
    if (next.ok)
      expect(next.selection.exercise.generatedFrom.composition?.ordinal).toBe(
        1,
      );
    const b = x.service.startAdaptive("user:A", x.rec);
    expect(b.ok).toBe(true);
    if (b.ok)
      expect(b.selection.exercise.generatedFrom.composition?.ordinal).toBe(2);
    expect(x.service.getSnapshot("user:A").profile.sessionCount).toBe(1);
    expect(
      JSON.stringify(x.service.getSnapshot("user:A").mastery),
    ).not.toContain(a.selection.exercise.text);
    expect(x.service.getSnapshot("user:B").mastery.variants).toHaveLength(0);
  });
  it("generation failure consumes no variant", () => {
    const x = setup();
    const invalid = { ...x.rec, targets: ["x".repeat(100)] };
    expect(x.service.startAdaptive("user:A", invalid).ok).toBe(false);
    expect(x.service.getSnapshot("user:A").mastery.variants).toHaveLength(0);
  });
  it("completion dedupe preserves cursor and frozen attribution", () => {
    const x = setup(),
      r = x.service.startAdaptive("user:A", x.rec);
    if (!r.ok) throw Error(r.reason);
    const a = sourceAttribution(r.selection.exercise),
      result = finishExercise(r.selection.exercise);
    x.service.complete("user:A", "run", result, 1, a);
    x.service.complete("user:A", "run", result, 100, a);
    const m = x.service.getSnapshot("user:A").mastery;
    expect(m.variants?.[0].nextOrdinal).toBe(1);
    expect(
      m.records.find((r) => r.identity.kind === "grapheme")?.training,
    ).toHaveLength(1);
    expect(
      loadMastery(x.storage, "user:A", x.service.getSnapshot("user:A").profile),
    ).toEqual(m);
  });
  it("v1 migration preserves established mastery and supplies no invented controlled evidence", () => {
    const r = eligibleRecord();
    const legacy = {
      ...emptyMastery(8),
      version: 1,
      records: [
        {
          ...r,
          state: "PROVISIONAL_MASTERY",
          practiceLevel: undefined,
          waiting: undefined,
          assessments: undefined,
          checkOrder: undefined,
          naturalSinceCheck: undefined,
          masteryVia: undefined,
        },
      ],
      variants: undefined,
    };
    const m = parseMastery(JSON.stringify(legacy))!;
    expect(m.version).toBe(2);
    expect(m.records[0]).toMatchObject({
      state: "PROVISIONAL_MASTERY",
      practiceLevel: 2,
      masteryVia: "natural",
      waiting: [],
      assessments: [],
      naturalSinceCheck: 0,
    });
    expect(m.variants).toEqual([]);
  });
  it("v1 key loads while companion v2 writes do not overwrite the old key", () => {
    const x = setup(),
      legacy = JSON.stringify({ ...emptyMastery(1), version: 1 });
    const old = masteryStorageKey("user:A").replace(":v2:", ":v1:");
    x.values.set(old, legacy);
    expect(loadMastery(x.storage, "user:A", x.profile).version).toBe(2);
    x.service.startAdaptive("user:A", x.rec);
    expect(x.values.get(old)).toBe(legacy);
    expect(x.values.has(masteryStorageKey("user:A"))).toBe(true);
  });
  it("bounded waiting, checks, variant state and whitelist round-trip", () => {
    const m = {
      ...emptyMastery(8),
      records: [eligibleRecord()],
      variants: [{ key: variantKey(spec(), "training"), nextOrdinal: 30 }],
    };
    const serialized = serializeMastery({
      ...m,
      rawText: "PRIVATE",
    } as typeof m);
    expect(parseMastery(serialized)).toEqual(m);
    expect(serialized).not.toContain("PRIVATE");
  });
  it.each([
    "level",
    "cursor",
    "duplicate-cursor",
    "waiting",
    "check-order",
    "natural-counter",
    "ordinal",
    "context",
    "failure",
  ])("rejects malformed %s", (kind) => {
    const v = JSON.parse(
      serializeMastery({
        ...emptyMastery(8),
        records: [eligibleRecord()],
        variants: [{ key: variantKey(spec(), "training"), nextOrdinal: 1 }],
      }),
    );
    const r = v.records[0];
    if (kind === "level") r.practiceLevel = 3;
    if (kind === "cursor") v.variants[0].nextOrdinal = -1;
    if (kind === "duplicate-cursor") v.variants.push(v.variants[0]);
    if (kind === "waiting") r.waiting.push(r.waiting[0]);
    if (kind === "check-order") r.checkOrder = 9;
    if (kind === "natural-counter") r.naturalSinceCheck = 41;
    if (kind === "ordinal")
      r.assessments = [
        {
          ...r.waiting[0],
          context: "controlled-transfer-assessment",
          ordinal: 1e9 + 1,
        },
      ];
    if (kind === "context") r.assessments = [{ ...r.waiting[0], ordinal: 0 }];
    if (kind === "failure") r.assessmentFailure = "fatal";
    expect(parseMastery(JSON.stringify(v))).toBeNull();
  });
  it("blocked storage retains visit-local ordinals", () => {
    const x = setup();
    const s = createLearningService(
      {
        getItem: x.storage.getItem,
        setItem: () => {
          throw Error("blocked");
        },
      },
      (j) => j(),
    );
    for (let ordinal = 0; ordinal < 3; ordinal++) {
      const r = s.startAdaptive("user:A", x.rec);
      expect(r.ok).toBe(true);
      if (r.ok)
        expect(r.selection.exercise.generatedFrom.composition?.ordinal).toBe(
          ordinal,
        );
    }
    expect(s.getSnapshot("user:A").persisted).toBe(false);
  });
  it("preflight rejects impossible low-density coverage before reserving a cursor", () => {
    const x = setup();
    const rec = {
      ...x.rec,
      type: "DIFFICULT_WORD" as const,
      targets: ["abcdefghijklmnopqrstuvw"],
    };
    const r = x.service.startAdaptive("user:A", rec);
    expect(r).toMatchObject({ ok: false, code: "invalid-spec" });
    expect(r.ok ? 0 : r.attempts).toBeLessThanOrEqual(16);
    expect(x.service.getSnapshot("user:A").mastery.variants).toHaveLength(0);
  });
});
