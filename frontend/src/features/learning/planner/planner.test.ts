import { describe, it, expect } from "vitest";
import { planLearningSession } from "./planner";
import { context, option } from "./scenarioFixtures";
import { normalOption, PLANNER } from "./constraints";
import { activityKey } from "./diversity";
import type { PlannerContext, PlannerOption } from "./types";
describe("bounded deterministic sequencing", () => {
  it("is deeply immutable and leaves input unchanged across 100 decisions", () => {
    const input = context([option()]),
      before = JSON.stringify(input),
      plan = planLearningSession(input);
    for (let i = 0; i < 100; i++)
      expect(planLearningSession(input)).toEqual(plan);
    expect(JSON.stringify(input)).toBe(before);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.primaryAction.target)).toBe(true);
    expect(Object.isFrozen(plan.primaryAction.weakness?.items)).toBe(true);
  });
  it("retains existing ranking across targeted and contextual actions", () => {
    const contextual = option("p", {
      policyOrder: 0,
      actionType: "contextual-practice",
      target: {
        ...option().target,
        type: "adaptive",
        sourceId: "context",
        sourceVersion: "v",
        purpose: "training",
        level: 1,
        ordinal: 0,
        graphemes: 220,
      },
    });
    expect(
      planLearningSession(
        context([option("r", { policyOrder: 1 }), contextual]),
      ).primaryAction.id,
    ).toBe("p");
  });
  it("uses a stable ID tie break independent of input permutation", () => {
    expect(planLearningSession(context([option("p"), option("r")]))).toEqual(
      planLearningSession(context([option("r"), option("p")])),
    );
  });
  it("cannot use general practice for variety while regression remains valid", () => {
    const r = option("r", { masteryState: "REGRESSED" });
    expect(
      planLearningSession(
        context([normalOption(), r], Array(3).fill(activityKey(r))),
      ).primaryAction.id,
    ).toBe("r");
  });
  it("requires three consecutive matching completions", () => {
    const r = option(),
      p = option("p", { policyOrder: 1 });
    for (const recent of [
      [activityKey(r), activityKey(r)],
      [activityKey(r), "other-session", activityKey(r)],
    ])
      expect(
        planLearningSession(context([r, p], recent)).primaryAction.id,
      ).toBe("r");
    expect(
      planLearningSession(context([r, p], Array(3).fill(activityKey(r))))
        .primaryAction.id,
    ).toBe("p");
  });
  it("does not invent another progression level", () => {
    const r = option();
    const plan = planLearningSession(
      context([r], Array(3).fill(activityKey(r))),
    );
    expect(plan.primaryAction.target).toEqual(r.target);
    expect(plan.audit.repetitionAvoided).toBe(false);
  });
  it("offers only short focused primary plus a distinct ordinary purpose", () => {
    expect(
      planLearningSession(context([option()])).optionalSecondaryAction?.purpose,
    ).toBe("general-practice");
    for (const graphemes of [180, 181, 220, 300]) {
      const r = option(),
        target = r.target;
      if (target.type !== "adaptive") throw Error();
      const plan = planLearningSession(
        context([option("r", { target: { ...target, graphemes } })]),
      );
      expect(plan.estimatedActivities).toBe(graphemes <= 180 ? 2 : 1);
    }
  });
  it("does not sequence another focused activity even for an overlapping cluster", () => {
    const p = option("pair", {
      weakness: { kind: "bigram", items: ["t", "r"] },
      policyOrder: 1,
    });
    const plan = planLearningSession(context([option(), p]));
    expect(plan.optionalSecondaryAction).toBeNull();
    expect(plan.estimatedActivities).toBe(1);
  });
  it("filters malformed capabilities and wrong stages before selection", () => {
    for (const patch of [
      { executable: false },
      { masteryState: "INSUFFICIENT_EVIDENCE" },
      { masteryState: "TRANSFER_CHECK" },
      { actionType: "contextual-practice" },
      { recommendationId: null },
    ] as Partial<PlannerOption>[]) {
      expect(planLearningSession(context([option("r", patch)])).purpose).toBe(
        "general-practice",
      );
    }
  });
  it("counts omitted unavailable, duplicate and mastered actions", () => {
    const input = {
      ...context([
        option(),
        option("copy", { weakness: option().weakness }),
        option("p", { executable: false }),
        option("q", { masteryState: "PROVISIONAL_MASTERY" }),
      ]),
      unavailableActions: 1,
    };
    expect(planLearningSession(input).audit).toMatchObject({
      unavailableActionsAvoided: 2,
      duplicateActivitiesAvoided: 1,
      masteredActionsAvoided: 1,
    });
  });
  it("whitelists input fields so raw content cannot enter a plan", () => {
    const privateText = "PRIVATE PASSAGE AND BUFFER";
    const input = {
      ...context([
        {
          ...option(),
          text: privateText,
          target: { ...option().target, text: privateText },
        } as unknown as PlannerOption,
      ]),
      history: [privateText],
      evidenceVersion: { ...context([]).evidenceVersion, text: privateText },
    };
    expect(JSON.stringify(planLearningSession(input))).not.toContain(
      privateText,
    );
  });
  it("rejects excessive context sizes and invalid evidence versions", () => {
    for (const patch of [
      { options: Array(PLANNER.maxOptions + 1).fill(option()) },
      { recentActions: Array(4).fill("x") },
      { learnerScope: "" },
      { evidenceVersion: { ...context([]).evidenceVersion, masteryOrder: 9 } },
    ])
      expect(() =>
        planLearningSession({ ...context([]), ...patch } as PlannerContext),
      ).toThrow();
  });
  it("scope changes plan identity without influencing other learner plans", () => {
    const a = context([option()]),
      b = { ...a, learnerScope: "fixture:b" };
    expect(planLearningSession(a).id).not.toBe(planLearningSession(b).id);
    expect(planLearningSession(a).learnerScope).toBe("fixture:a");
    const longScope = { ...a, learnerScope: "u".repeat(512) };
    expect(planLearningSession(longScope).learnerScope).toBe(
      longScope.learnerScope,
    );
    expect(() =>
      planLearningSession({ ...longScope, learnerScope: "u".repeat(513) }),
    ).toThrow();
  });
});
