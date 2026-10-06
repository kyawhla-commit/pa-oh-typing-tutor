import { describe, it, expect } from "vitest";
import { PLANNER_GOLDENS } from "./scenarioFixtures";
import { planLearningSession } from "./planner";
import { createPlannerContext } from "./context";
import { emptyPlannerHistory } from "./history";
import { profileOf, evidence } from "../testFixtures";
import { emptyProfile } from "../profile";
import { emptyMastery } from "../transfer/progression";
import { record } from "../transfer/testFixtures";
import { eligibleRecord } from "../progression/testFixtures";
import { selectionWithMastery } from "../transfer/recommendations";
import { recommendationIdentity, weaknessKey } from "../transfer/classify";
describe("planner golden scenarios", () => {
  it.each(PLANNER_GOLDENS)("$id", (g) => {
    const plan = planLearningSession(g.input);
    expect(plan.purpose).toBe(g.purpose);
    expect(plan.primaryAction.id).toBe(g.primaryId);
    expect(plan.estimatedActivities).toBe(g.activities);
    expect(plan.audit.repetitionAvoided).toBe(g.repetition ?? false);
  });
});
describe("existing policy/capability adapter", () => {
  const identity = { kind: "grapheme" as const, items: ["r"] };
  it("uses actual regression and check actions without scoring or reserving", () => {
    const profile = profileOf(
      evidence("r".repeat(40), [0, 1, 2, 3], "a"),
      evidence("r".repeat(40), [0, 1, 2, 3], "b"),
    );
    const regressed = record(identity, [], [], {
      state: "REGRESSED",
      lastSeen: 2,
    });
    const mastery = { ...emptyMastery(2), records: [regressed] };
    const before = JSON.stringify([profile, mastery]);
    const plan = planLearningSession(
      createPlannerContext("a", profile, mastery, emptyPlannerHistory(2)),
    );
    expect(plan.purpose).toBe("regression-recovery");
    expect(JSON.stringify([profile, mastery])).toBe(before);
    const readyProfile = { ...profile, sessionCount: 8 },
      ready = { ...emptyMastery(8), records: [eligibleRecord()] };
    expect(
      planLearningSession(
        createPlannerContext("a", readyProfile, ready, emptyPlannerHistory(8)),
      ).purpose,
    ).toBe("transfer-check");
  });
  it("falls back for an unsupported Unicode assessment while training remains available", () => {
    const id = { kind: "grapheme" as const, items: ["ပ"] };
    const profile = { ...emptyProfile(), sessionCount: 8 },
      mastery = { ...emptyMastery(8), records: [eligibleRecord(id)] };
    const c = createPlannerContext(
      "a",
      profile,
      mastery,
      emptyPlannerHistory(8),
    );
    expect(planLearningSession(c).purpose).toBe("general-practice");
    expect(c.unavailableActions).toBe(1);
    const training = {
      ...mastery,
      records: [
        {
          ...eligibleRecord(id),
          state: "ACTIVE" as const,
          practiceLevel: 0 as const,
        },
      ],
    };
    expect(
      planLearningSession(
        createPlannerContext("a", profile, training, emptyPlannerHistory(8)),
      ).purpose,
    ).toBe("targeted-improvement");
  });
  it("preserves broad accuracy precedence over a hidden regression", () => {
    const profile = profileOf(
      ...Array.from({ length: 3 }, (_, i) =>
        evidence(
          "abcdefghijklmnop".repeat(3),
          Array.from({ length: 24 }, (_, n) => n),
          `broad-${i}`,
        ),
      ),
    );
    const mastery = {
      ...emptyMastery(3),
      records: [record(identity, [], [], { state: "REGRESSED", lastSeen: 3 })],
    };
    const selected = selectionWithMastery(profile, mastery).visible;
    expect(selected).toHaveLength(1);
    expect(selected[0].recommendation.type).toBe("ACCURACY_FOCUS");
    const plan = planLearningSession(
      createPlannerContext("a", profile, mastery, emptyPlannerHistory(3)),
    );
    expect(plan.primaryAction.weakness?.kind).toBe("accuracy");
    expect(plan.purpose).toBe("targeted-improvement");
  });
  it("uses current policy level only and never revives a mastered weakness", () => {
    const profile = { ...emptyProfile(), sessionCount: 8 };
    const mastery = {
      ...emptyMastery(8),
      records: [
        {
          ...eligibleRecord(),
          state: "IMPROVING" as const,
          practiceLevel: 1 as const,
        },
      ],
    };
    const c = createPlannerContext(
      "a",
      profile,
      mastery,
      emptyPlannerHistory(8),
    );
    expect(
      c.options.filter(
        (o) => o.weakness && weaknessKey(o.weakness) === weaknessKey(identity),
      ),
    ).toHaveLength(1);
    expect(planLearningSession(c).purpose).toBe("contextual-practice");
    const mastered = {
      ...mastery,
      records: [{ ...eligibleRecord(), state: "PROVISIONAL_MASTERY" as const }],
    };
    expect(
      createPlannerContext(
        "a",
        profile,
        mastered,
        emptyPlannerHistory(8),
      ).options.every(
        (o) => !o.weakness || weaknessKey(o.weakness) !== weaknessKey(identity),
      ),
    ).toBe(true);
  });
  it("keeps the strongest visible recommendation for unrelated needs", () => {
    const profile = profileOf(
      evidence(
        "r".repeat(40) + "p".repeat(40),
        [0, 1, 2, 3, 4, 5, 40, 41, 42],
        "one",
      ),
      evidence(
        "r".repeat(40) + "p".repeat(40),
        [0, 1, 2, 3, 4, 5, 40, 41, 42],
        "two",
      ),
    );
    const mastery = emptyMastery(2),
      selected = selectionWithMastery(profile, mastery).visible;
    const plan = planLearningSession(
      createPlannerContext("a", profile, mastery, emptyPlannerHistory(2)),
    );
    expect(plan.primaryAction.weakness).toEqual(
      recommendationIdentity(selected[0].recommendation),
    );
    expect(plan.optionalSecondaryAction).toBeNull();
  });
});
