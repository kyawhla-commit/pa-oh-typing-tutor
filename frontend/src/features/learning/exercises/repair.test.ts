import { describe, it, expect } from "vitest";
import { generateAdaptiveExercise } from "./generator";
import { canGenerateExercise, CAPABILITY_CACHE_LIMIT } from "./capability";
import { prepareContentBank } from "./content";
import { PROGRESSION_CONTENT } from "../progression/content";
import { COMPOSITION } from "../progression/constants";
import { validateComposition } from "../progression/composition";
import { SLICE9_GENERATION_BASELINE as baseline } from "./repairFixtures";
import { MATRIX_FOCI, matrixSpec } from "../evaluation/generator";
import { record, observation } from "../transfer/testFixtures";
import { learningAction } from "../progression/actions";
import type { CompositionInput } from "../progression/types";
import { EXERCISE } from "./constants";
import contracts from "./coverage-contracts.json";
const failures = baseline.failures.flatMap((f) =>
  f.ordinals.map((ordinal) => ({ ...f, ordinal })),
);
describe("reproduced Slice 9 generator dead ends", () => {
  it("every accepted coverage, density, section, repetition and bounded assembly value is unchanged", () => {
    const { generatorVersion: _, contentVersion: __, ...exercise } = EXERCISE;
    const {
      generatorVersion: ___,
      contentVersion: ____,
      ...composition
    } = COMPOSITION;
    expect({ exercise, composition }).toEqual(contracts);
  });
  it("retains the accepted 105-failure baseline and exact failing ordinals", () => {
    expect(failures).toHaveLength(105);
    expect(baseline).toMatchObject({
      attempted: 1568,
      successful: 1463,
      failed: 105,
    });
    expect(baseline.failureRate).toBe(105 / 1568);
  });
  for (const f of failures)
    it(`${f.focus}/${f.level}/${f.purpose}/${f.ordinal} is repaired without changing its contract`, () => {
      const spec = matrixSpec(MATRIX_FOCI.find((x) => x.name === f.focus)!);
      const input = {
        level: f.level,
        ordinal: f.ordinal,
        purpose: f.purpose,
      } as CompositionInput;
      const result = generateAdaptiveExercise(spec, {
        learnerKey: "anonymous-evaluation",
        composition: input,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) throw Error(result.reason);
      expect(
        validateComposition(
          result.exercise.text,
          result.exercise.generatedFrom.spec,
          result.exercise.sections,
          result.exercise.contentStrategy,
          input,
        ).issues,
      ).toEqual([]);
      if (input.purpose === "controlled-transfer-assessment") {
        expect(result.exercise.contentStrategy).toBe("curated");
        expect(result.exercise.coverage.sectionDensities[0]).toBe(0);
        expect(result.exercise.coverage.maxTokenShare).toBeLessThanOrEqual(
          COMPOSITION.assessment.identicalShare,
        );
      }
    });
});
describe("exact deterministic capability witnesses", () => {
  it("preflight matches generation for scope, purpose and ordinal and caches a bounded witness", () => {
    const spec = matrixSpec(MATRIX_FOCI[3]),
      options = {
        learnerKey: "capability-user",
        composition: {
          level: 2 as const,
          ordinal: 31,
          purpose: "training" as const,
        },
      };
    const a = canGenerateExercise(spec, options);
    expect(a).toEqual(generateAdaptiveExercise(spec, options));
    expect(canGenerateExercise(spec, options)).toBe(a);
    expect(CAPABILITY_CACHE_LIMIT).toBe(128);
  });
  it("content-bank and generator version changes rebuild witnesses without changing the weakness", () => {
    const spec = matrixSpec(MATRIX_FOCI[3]),
      options = {
        learnerKey: "version-user",
        composition: {
          level: 1 as const,
          ordinal: 7,
          purpose: "training" as const,
        },
      };
    const a = canGenerateExercise(spec, options),
      b = canGenerateExercise(spec, {
        ...options,
        bank: { ...PROGRESSION_CONTENT, version: "next-bank" },
      }),
      c = canGenerateExercise(spec, {
        ...options,
        generatorVersion: "next-generator",
      });
    expect(a.ok && b.ok && c.ok).toBe(true);
    if (a.ok && b.ok && c.ok) {
      expect(a.exercise.id).not.toBe(b.exercise.id);
      expect(a.exercise.id).not.toBe(c.exercise.id);
      expect(a.exercise.focusItems).toEqual(b.exercise.focusItems);
    }
  });
  for (const name of ["typing", "accent", "myanmar"])
    it(`${name} fallback is training only, with no unsupported controlled action`, () => {
      const spec = matrixSpec(MATRIX_FOCI.find((f) => f.name === name)!);
      const training = canGenerateExercise(spec, {
        learnerKey: "fallback",
        composition: { level: 2, ordinal: 7, purpose: "training" },
      });
      expect(training.ok).toBe(true);
      const checked = canGenerateExercise(spec, {
        learnerKey: "fallback",
        composition: {
          level: 2,
          ordinal: 7,
          purpose: "controlled-transfer-assessment",
        },
      });
      expect(checked).toMatchObject({
        ok: false,
        code: "unsupported-focus",
        attempts: 0,
        diagnostics: [{ kind: "insufficient-content" }],
      });
      const identity = {
        kind: spec.focusType as "token" | "grapheme",
        items: spec.focusItems,
      };
      const r = record(
        identity,
        [observation(1), observation(2), observation(3)],
        [],
        {
          state: "TRANSFER_CHECK",
          stateSince: 3,
          checkOrder: 3,
          waiting: Array.from({ length: 5 }, (_, i) =>
            observation(i + 4, 0, 0, "ordinary-practice"),
          ),
          naturalSinceCheck: 0,
        },
      );
      expect(learningAction(r)).toMatchObject({
        type: "normal-practice",
        unavailable: "content-unavailable",
      });
    });
  it("resource-poor banks fail with structured diagnostics before any start", () => {
    const bank = prepareContentBank("empty", [], {
        accuracy: [],
        speed: [],
        general: [],
      }),
      spec = matrixSpec(MATRIX_FOCI[3]);
    const controlled = canGenerateExercise(spec, {
      learnerKey: "empty",
      bank,
      composition: {
        level: 2,
        ordinal: 0,
        purpose: "controlled-transfer-assessment",
      },
    });
    expect(controlled).toMatchObject({
      ok: false,
      diagnostics: [{ kind: "insufficient-content" }],
    });
    const training = canGenerateExercise(spec, {
      learnerKey: "empty",
      bank,
      composition: { level: 1, ordinal: 0, purpose: "training" },
    });
    expect(training.ok).toBe(false);
    if (!training.ok)
      expect(
        training.diagnostics?.some((x) => x.kind === "assembly-exhausted"),
      ).toBe(true);
  });
  it("full ordinals remain deterministic and exercise identities differ after a content cycle", () => {
    const spec = matrixSpec(MATRIX_FOCI[3]);
    const make = (ordinal: number) =>
      canGenerateExercise(spec, {
        learnerKey: "cycle",
        composition: { level: 1, ordinal, purpose: "training" },
      });
    const a = make(7),
      b = make(39);
    expect(make(7)).toEqual(a);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.exercise.text).toBe(b.exercise.text);
      expect(a.exercise.id).not.toBe(b.exercise.id);
    }
  });
});
