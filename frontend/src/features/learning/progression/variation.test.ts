import { describe, expect, it } from "vitest";
import { generateAdaptiveExercise } from "../exercises/generator";
import { spec } from "../exercises/testFixtures";
import { PROGRESSION_CONTENT } from "./content";
import { COMPOSITION as C } from "./constants";
import { advanceVariant, nextVariant, variantKey } from "./variants";
const input = { level: 2 as const, ordinal: 7, purpose: "training" as const };
const run = (ordinal = 7, options = {}) =>
  generateAdaptiveExercise(spec(), {
    learnerKey: "learner-A",
    composition: { ...input, ordinal },
    ...options,
  });
const exercise = (ordinal = 7, options = {}) => {
  const r = run(ordinal, options);
  if (!r.ok) throw Error(r.reason);
  return r.exercise;
};
describe("bounded ordinal variation", () => {
  it("same inputs reproduce text and metadata without consulting time or randomness", () => {
    const a = exercise();
    expect(exercise()).toEqual(a);
    expect(Object.isFrozen(a.generatedFrom.composition)).toBe(true);
  });
  it("six consecutive ordinals vary meaningfully", () => {
    const texts = Array.from({ length: 6 }, (_, i) => exercise(i).text);
    expect(new Set(texts).size).toBe(6);
  });
  it("cycles text after 32 variants but full ordinal keeps exercise identity distinct", () => {
    const a = exercise(7),
      b = exercise(7 + C.cycle);
    expect(a.text).toBe(b.text);
    expect(a.id).not.toBe(b.id);
  });
  it("recommendation instance changes do not reset stable weakness content or identity", () => {
    const a = exercise();
    const r = generateAdaptiveExercise(
      { ...spec(), recommendationId: "different-profile-score" },
      { learnerKey: "learner-A", composition: input },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.exercise.text).toBe(a.text);
      expect(r.exercise.id).toBe(a.id);
    }
  });
  it("scope and generator/content versions participate in deterministic identity", () => {
    const a = exercise();
    for (const options of [
      { learnerKey: "learner-B" },
      { generatorVersion: "next-generator" },
      { bank: { ...PROGRESSION_CONTENT, version: "next-bank" } },
    ])
      expect(exercise(7, options).id).not.toBe(a.id);
  });
  it.each([-1, 1.5, C.maxOrdinal + 1, NaN, Infinity])(
    "invalid ordinal %s returns typed failure",
    (ordinal) =>
      expect(run(ordinal)).toMatchObject({
        ok: false,
        code: "invalid-spec",
        attempts: 0,
      }),
  );
  it("unsupported assessment and invalid levels fail safely", () => {
    expect(
      generateAdaptiveExercise(spec("speed", []), {
        learnerKey: "A",
        composition: { ...input, purpose: "controlled-transfer-assessment" },
      }),
    ).toMatchObject({ ok: false, code: "unsupported-focus" });
    expect(run(0, { composition: { ...input, level: 3 } })).toMatchObject({
      ok: false,
      code: "invalid-spec",
    });
  });
  it("variant history is bounded; purposes are independent; stale duplicate reservations fail", () => {
    let rows: ReturnType<typeof advanceVariant> = [];
    const key = variantKey(spec(), "training"),
      check = variantKey(spec(), "controlled-transfer-assessment");
    rows = advanceVariant(rows, key, 0);
    expect(nextVariant(rows, key)).toBe(1);
    expect(nextVariant(rows, check)).toBe(0);
    expect(() => advanceVariant(rows, key, 0)).toThrow();
    for (let i = 0; i < 100; i++) {
      const k = variantKey(spec("token", [`word${i}`]), "training");
      rows = advanceVariant(rows, k, 0);
    }
    expect(rows).toHaveLength(C.maxVariants);
    expect(() =>
      advanceVariant([{ key, nextOrdinal: C.maxOrdinal }], key, C.maxOrdinal),
    ).toThrow();
  });
  it("Unicode fallback supports training but cannot masquerade as a controlled check", () => {
    for (const item of ["e\u0301", "ပအိုဝ်ႏ"]) {
      const s = spec(item.includes("ပ") ? "token" : "grapheme", [item]);
      const training = generateAdaptiveExercise(s, {
        learnerKey: "A",
        composition: input,
      });
      expect(training.ok).toBe(true);
      if (training.ok) {
        expect(training.exercise.contentStrategy).toBe("fallback-drill");
        expect(training.exercise.text).toContain(item.normalize("NFC"));
      }
      expect(
        generateAdaptiveExercise(s, {
          learnerKey: "A",
          composition: { ...input, purpose: "controlled-transfer-assessment" },
        }),
      ).toMatchObject({
        ok: false,
        code: "unsupported-focus",
        attempts: 0,
        diagnostics: [{ kind: "insufficient-content" }],
      });
    }
  });
  it("extra private specification fields never enter generated metadata or text", () => {
    const secret = "PRIVATE_CUSTOM_PASSAGE_92817",
      r = generateAdaptiveExercise(
        { ...spec(), customText: secret, rawBuffer: secret },
        { learnerKey: "A", composition: input },
      );
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r)).not.toContain(secret);
  });
});
