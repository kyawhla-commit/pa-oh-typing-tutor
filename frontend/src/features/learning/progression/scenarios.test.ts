import { describe, expect, it } from "vitest";
import { generateAdaptiveExercise } from "../exercises/generator";
import { spec } from "../exercises/testFixtures";
import { completed } from "../testFixtures";
import { learningAction } from "./actions";
import { assessmentEligible } from "./assessment";
import {
  finishExercise,
  pipeline,
  sourceAttribution,
  targetPositions,
} from "./testFixtures";
import { ASSESSMENT as A } from "./constants";
import type { WeaknessIdentity } from "../transfer/types";
import type { ProgressionLevel } from "./types";
const cases: WeaknessIdentity[] = [
  { kind: "grapheme", items: ["r"] },
  { kind: "substitution", items: ["r", "t"] },
  { kind: "bigram", items: ["t", "h"] },
  { kind: "token", items: ["through"] },
];
function trainingScenario(
  identity: WeaknessIdentity = { kind: "grapheme", items: ["r"] },
) {
  const x = pipeline(identity);
  const seed =
    identity.kind === "token"
      ? completed("through ".repeat(6).trim(), [0, 8, 16])
      : identity.kind === "bigram"
        ? completed("th ".repeat(24).trim(), [0, 3, 6, 9, 12])
        : completed(
            identity.items[0].repeat(24),
            [0, 1, 2, 3],
            identity.kind === "substitution" ? identity.items[1] : "X",
          );
  x.ingest(seed, "seed");
  expect(x.target()).toBeDefined();
  for (let level = 0; level < 3; level++) {
    expect(learningAction(x.target())).toMatchObject({
      progressionLevel: level,
    });
    const result = generateAdaptiveExercise(
      spec(identity.kind, identity.items),
      {
        learnerKey: "scenario",
        composition: {
          level: level as ProgressionLevel,
          ordinal: level,
          purpose: "training",
        },
      },
    );
    if (!result.ok) throw Error(result.reason);
    x.ingest(
      finishExercise(result.exercise),
      `drill-${level}`,
      sourceAttribution(result.exercise),
    );
  }
  expect(x.target().state).toBe("TRANSFER_CHECK");
  expect(assessmentEligible(x.target())).toBe(false);
  return x;
}
function wait(x: ReturnType<typeof pipeline>) {
  for (let i = 0; i < 5; i++)
    x.ingest(completed("a".repeat(50)), `ordinary-${i}`);
  expect(assessmentEligible(x.target())).toBe(true);
}
function assessment(x: ReturnType<typeof pipeline>, ordinal: number) {
  const identity = x.target().identity;
  const result = generateAdaptiveExercise(spec(identity.kind, identity.items), {
    learnerKey: "scenario",
    composition: {
      level: 2,
      ordinal,
      purpose: "controlled-transfer-assessment",
    },
  });
  if (!result.ok) throw Error(result.reason);
  return result.exercise;
}
describe("complete Slice 8 paths", () => {
  it("A: level 0 → 1 → 2 → unchanged natural transfer → provisional mastery", () => {
    const x = trainingScenario();
    for (let i = 0; i < 3; i++)
      x.ingest(completed("r".repeat(20)), `natural-${i}`);
    expect(x.target()).toMatchObject({
      state: "PROVISIONAL_MASTERY",
      masteryVia: "natural",
      assessments: [],
    });
    expect(learningAction(x.target())).toEqual({ type: "none" });
  });
  it.each(cases)(
    "B: sparse $kind → waiting → repeated checks → controlled mastery",
    (identity) => {
      const x = trainingScenario(identity);
      wait(x);
      expect(learningAction(x.target()).type).toBe("controlled-assessment");
      const required = A.sessions[identity.kind as keyof typeof A.sessions];
      for (let i = 0; i < required; i++) {
        const e = assessment(x, i),
          checkOrder = x.target().checkOrder!;
        x.ingest(
          finishExercise(e),
          `assessment-${i}`,
          sourceAttribution(e, checkOrder),
        );
        expect(x.target().state).toBe(
          i === required - 1 ? "PROVISIONAL_MASTERY" : "TRANSFER_CHECK",
        );
      }
      expect(x.target().masteryVia).toBe("controlled");
      expect(x.target().transfer).toHaveLength(0);
      expect(x.target().assessments).toHaveLength(required);
      const regular =
        identity.kind === "token"
          ? completed("through ".repeat(6).trim(), [0, 8, 16])
          : identity.kind === "bigram"
            ? completed("th ".repeat(24).trim(), [0, 3, 6, 9, 12])
            : completed(
                identity.items[0].repeat(24),
                [0, 1, 2, 3, 4],
                identity.kind === "substitution" ? identity.items[1] : "X",
              );
      x.ingest(regular, "regression-1");
      expect(x.target().state).toBe("PROVISIONAL_MASTERY");
      x.ingest(regular, "regression-2");
      expect(x.target().state).toBe("REGRESSED");
      expect(learningAction(x.target())).toMatchObject({
        type: "targeted-practice",
        progressionLevel: 0,
      });
    },
  );
  it("C: mild corrected focus failure denies mastery and rolls level 2 back to 1", () => {
    const x = trainingScenario();
    wait(x);
    const e = assessment(x, 0),
      index = targetPositions(e)[0];
    x.ingest(
      finishExercise(e, [index]),
      "failed-check",
      sourceAttribution(e, x.target().checkOrder!),
    );
    expect(x.target()).toMatchObject({
      state: "ACTIVE",
      practiceLevel: 1,
      assessmentFailure: "mild",
      assessments: [],
      training: [],
    });
    expect(learningAction(x.target())).toMatchObject({
      type: "contextual-practice",
      progressionLevel: 1,
    });
  });
  it("severe assessment rolls back to concentrated level zero", () => {
    const x = trainingScenario();
    wait(x);
    const e = assessment(x, 0);
    x.ingest(
      finishExercise(
        e,
        targetPositions(e).slice(
          0,
          Math.ceil(e.coverage.focus[0].occurrences * 0.2),
        ),
      ),
      "severe-check",
      sourceAttribution(e, x.target().checkOrder!),
    );
    expect(x.target()).toMatchObject({
      state: "ACTIVE",
      practiceLevel: 0,
      assessmentFailure: "severe",
    });
    expect(learningAction(x.target()).type).toBe("targeted-practice");
  });
  it("assessment before eligibility, wrong check epoch and missing metadata cannot fabricate history", () => {
    const x = trainingScenario();
    let e = assessment(x, 0);
    x.ingest(
      finishExercise(e),
      "too-soon",
      sourceAttribution(e, x.target().checkOrder!),
    );
    expect(x.target().assessments).toHaveLength(0);
    wait(x);
    e = assessment(x, 1);
    x.ingest(finishExercise(e), "wrong-epoch", sourceAttribution(e, 0));
    x.ingest(finishExercise(e), "missing");
    expect(x.target().assessments).toHaveLength(0);
    expect(x.target().state).toBe("TRANSFER_CHECK");
  });
  it("repeated completed run of the same check ordinal cannot count as distinct assessment", () => {
    const x = trainingScenario();
    wait(x);
    const e = assessment(x, 0),
      a = sourceAttribution(e, x.target().checkOrder!);
    for (let i = 0; i < 4; i++) x.ingest(finishExercise(e), `repeat-${i}`, a);
    expect(x.target().assessments).toHaveLength(1);
    expect(x.target().state).toBe("TRANSFER_CHECK");
  });
  it("natural mastery takes priority before any check is offered", () => {
    const x = trainingScenario();
    for (let i = 0; i < 5; i++)
      x.ingest(completed("r".repeat(50)), `ordinary-${i}`);
    expect(x.target().state).toBe("PROVISIONAL_MASTERY");
    expect(assessmentEligible(x.target())).toBe(false);
  });
  it("substitution checks remain directional", () => {
    const x = trainingScenario(cases[1]);
    wait(x);
    const e = assessment(x, 0),
      wrong = targetPositions(e)[0];
    x.ingest(
      finishExercise(e, [wrong], "t"),
      "directional-failure",
      sourceAttribution(e, x.target().checkOrder!),
    );
    expect(x.target().assessmentFailure).toBe("mild");
    expect(x.target().identity.items).toEqual(["r", "t"]);
  });
});
