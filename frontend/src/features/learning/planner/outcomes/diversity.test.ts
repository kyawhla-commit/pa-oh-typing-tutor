import { describe, it, expect } from "vitest";
import { planLearningSession } from "../planner";
import { context, option, PLANNER_GOLDENS } from "../scenarioFixtures";
import { normalOption } from "../constraints";
import { outcomeActivityKey } from "./identity";
import type { PlannerOption } from "../types";
const recent = (
  o: PlannerOption,
  outcome: "skipped" | "cancelled" | "abandoned" | "completed" = "skipped",
) => [{ activityKey: outcomeActivityKey(o), outcome, sequence: 1 }];
describe("bounded local outcome diversity", () => {
  it.each(["targeted-practice", "contextual-practice"] as const)(
    "rotates a skipped %s to a comparable authorized action",
    (actionType) => {
      const target = option().target;
      const patch =
        actionType === "contextual-practice" && target.type === "adaptive"
          ? { target: { ...target, level: 1 as const, graphemes: 220 } }
          : {};
      const a = option("r", { actionType, ...patch }),
        b = option("p", { actionType, policyOrder: 1, ...patch }),
        c = context([a, b]);
      expect(
        planLearningSession({ ...c, recentOutcomes: recent(a) }).primaryAction
          .id,
      ).toBe("p");
    },
  );
  it.each(["skipped", "cancelled"] as const)(
    "%s check may use ordinary practice but eligibility returns after the next skip",
    (outcome) => {
      const check = PLANNER_GOLDENS[1].input.options[1],
        normal = normalOption(),
        c = context([check, normal]);
      const first = planLearningSession({
        ...c,
        recentOutcomes: recent(check, outcome),
      });
      expect(first.primaryAction.actionType).toBe("normal-practice");
      expect(
        planLearningSession({
          ...c,
          recentOutcomes: [
            ...recent(check, outcome),
            { ...recent(normal)[0], sequence: 2 },
          ],
        }).primaryAction.actionType,
      ).toBe("controlled-assessment");
    },
  );
  it("repeated skipping rotates and returns to the strongest need without permanent exclusion", () => {
    const a = option(),
      b = option("p", { policyOrder: 1 }),
      c = context([a, b]);
    let history: ReturnType<typeof recent> = [];
    const ids = [];
    for (let i = 1; i <= 14; i++) {
      const plan = planLearningSession({ ...c, recentOutcomes: history });
      ids.push(plan.primaryAction.id);
      history = [
        ...history,
        {
          activityKey: outcomeActivityKey(plan.primaryAction),
          outcome: "skipped" as const,
          sequence: i,
        },
      ].slice(-5);
    }
    expect(ids).toEqual(
      Array.from({ length: 14 }, (_, i) => (i % 2 ? "p" : "r")),
    );
  });
  it.each([
    option(),
    normalOption(),
    option("r", { masteryState: "REGRESSED" }),
  ])("no comparable alternative preserves valid priority", (a) => {
    const c = context([a, normalOption()]);
    expect(
      planLearningSession({ ...c, recentOutcomes: recent(a) }).primaryAction
        .activityKey,
    ).toBe(planLearningSession(c).primaryAction.activityKey);
  });
  it("never downgrades formal regression to an active need", () => {
    const a = option("r", { masteryState: "REGRESSED" }),
      b = option("p");
    expect(
      planLearningSession({ ...context([a, b]), recentOutcomes: recent(a) })
        .purpose,
    ).toBe("regression-recovery");
  });
  it.each(["abandoned", "completed"] as const)(
    "%s is not an avoidance preference",
    (outcome) => {
      const a = option(),
        b = option("p", { policyOrder: 1 });
      expect(
        planLearningSession({
          ...context([a, b]),
          recentOutcomes: recent(a, outcome),
        }).primaryAction.id,
      ).toBe("r");
    },
  );
  it("uses only latest outcome, and identical outcomes produce identical plans", () => {
    const a = option(),
      b = option("p", { policyOrder: 1 }),
      c = {
        ...context([a, b]),
        recentOutcomes: [...recent(a), { ...recent(b)[0], sequence: 2 }],
      };
    expect(planLearningSession(c).primaryAction.id).toBe("r");
    expect(planLearningSession(c)).toEqual(planLearningSession(c));
  });
  it.each(PLANNER_GOLDENS)("preserves empty-outcome golden $id", (g) => {
    expect(planLearningSession({ ...g.input, recentOutcomes: [] })).toEqual(
      planLearningSession(g.input),
    );
  });
});
