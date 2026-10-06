import { describe, expect, it } from "vitest";
import { recommendPractice } from "../policy";
import { profileOf, evidence } from "../testFixtures";
import { emptyMastery } from "./progression";
import { recommendationIdentity } from "./classify";
import { recommendWithMastery, progressionText } from "./recommendations";
import { evaluateMastery } from "./mastery";
import { observation as o, record, r } from "./testFixtures";
describe("minimal recommendation overlay", () => {
  const profile = profileOf(
    evidence("r".repeat(24), [0, 1, 2, 3], "seed", "t"),
  );
  it("without mastery preserves raw scores while consolidating related evidence", () => {
    const raw = recommendPractice(profile),
      visible = recommendWithMastery(profile, emptyMastery());
    expect(visible.map((x) => x.recommendation)).toEqual([raw[0]]);
    expect(visible[0].supportingEvidence).toEqual([raw[1]]);
  });
  it("suppresses only the mastered identity, preserving unrelated substitution", () => {
    const result = recommendWithMastery(profile, {
      ...emptyMastery(1),
      records: [record(r, [], [], { state: "PROVISIONAL_MASTERY" })],
    });
    expect(result.some((x) => x.recommendation.type === "WEAK_GRAPHEME")).toBe(
      false,
    );
    expect(
      result.some((x) => x.recommendation.type === "SUBSTITUTION_CONFUSION"),
    ).toBe(true);
  });
  it("active retains base score and transfer-check converts action without navigation", () => {
    const e = evidence("r".repeat(24), [0, 1, 2, 3], "seed", "t"),
      isolated = profileOf({
        ...e,
        aggregates: { ...e.aggregates, substitutions: [] },
      });
    const base = recommendPractice(isolated).find(
      (x) => x.type === "WEAK_GRAPHEME",
    )!;
    const active = recommendWithMastery(isolated, {
      ...emptyMastery(1),
      records: [record()],
    }).find((x) => x.recommendation.type === "WEAK_GRAPHEME")!;
    expect(active.recommendation).toEqual(base);
    expect(active.decision?.nextAction).toBe("CONTINUE_TARGETED_PRACTICE");
    const check = record(r, [o(1), o(2), o(3)], [], {
      state: "TRANSFER_CHECK",
      stateSince: 3,
    });
    expect(
      recommendWithMastery(profile, {
        ...emptyMastery(3),
        records: [check],
      }).find((x) => x.recommendation.type === "WEAK_GRAPHEME")?.decision
        ?.nextAction,
    ).toBe("WAIT_FOR_TRANSFER_EVIDENCE");
  });
  it("reactivates a regressed identity even when mixed recent evidence suppresses base eligibility", () => {
    const improved = profileOf(
      evidence("r".repeat(24), [0, 1, 2, 3], "seed", "t"),
      evidence("r".repeat(100), [], "clean"),
    );
    expect(
      recommendPractice(improved).some((x) => x.type === "WEAK_GRAPHEME"),
    ).toBe(false);
    expect(
      recommendWithMastery(improved, {
        ...emptyMastery(2),
        records: [record(r, [], [], { state: "REGRESSED" })],
      }).some(
        (x) =>
          x.recommendation.type === "WEAK_GRAPHEME" &&
          x.decision?.state === "REGRESSED",
      ),
    ).toBe(true);
  });
  it("keeps cap of three and scalar tie order with retained targets", () => {
    const records = ["a", "z", "r", "é", "b"].map((c) =>
      record({ kind: "grapheme", items: [c] }, [], [], { state: "REGRESSED" }),
    );
    const m = { ...emptyMastery(1), records };
    const a = recommendWithMastery(profile, m),
      b = recommendWithMastery(profile, {
        ...m,
        records: [...records].reverse(),
      });
    expect(a).toHaveLength(3);
    expect(a).toEqual(b);
  });
  it("suppressed broad focus falls back to general rather than resurrecting itself", () => {
    const strong = profileOf(
      ...[1, 2, 3].map((i) => evidence("abc ".repeat(15), [], `s${i}`)),
    );
    expect(recommendPractice(strong)[0].type).toBe("SPEED_BUILDING");
    const identity = recommendationIdentity(recommendPractice(strong)[0])!;
    expect(
      recommendWithMastery(strong, {
        ...emptyMastery(3),
        records: [
          record(identity, [], [], {
            state: "PROVISIONAL_MASTERY",
            baselineWpm: 40,
          }),
        ],
      })[0].recommendation.type,
    ).toBe("GENERAL_PRACTICE");
  });
  it("is pure and learner wording never claims permanent mastery", () => {
    const mastery = { ...emptyMastery(1), records: [record()] },
      before = JSON.stringify({ profile, mastery });
    recommendWithMastery(profile, mastery);
    expect(JSON.stringify({ profile, mastery })).toBe(before);
    for (const state of [
      "ACTIVE",
      "IMPROVING",
      "TRANSFER_CHECK",
      "REGRESSED",
      "PROVISIONAL_MASTERY",
      "INSUFFICIENT_EVIDENCE",
    ] as const)
      expect(
        JSON.stringify(
          progressionText(evaluateMastery(record(r, [], [], { state }))),
        ),
      ).not.toMatch(/permanent|Mastered|97|threshold/);
  });
});
