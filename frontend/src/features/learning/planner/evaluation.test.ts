import { describe, it, expect } from "vitest";
import { evaluatePlanner, plannerBenchmark } from "../evaluation/planner";
import { emptyProfile } from "../profile";
import { emptyMastery } from "../transfer/progression";
import { context, option } from "./scenarioFixtures";
describe("planner evaluation extension", () => {
  it("reports all ten goldens plus consumed policy outputs without invalid plans", () => {
    const result = evaluatePlanner([
      {
        id: "empty",
        finalProfile: emptyProfile(),
        finalMastery: emptyMastery(),
        history: { version: 1, anonymousLearnerId: "empty", sessions: [] },
      },
    ]);
    expect(result.report).toMatchObject({
      plansGenerated: 11,
      policyOutputContexts: 1,
      invalidPlans: 0,
      deterministic: true,
      nonDeterministic: 0,
      duplicateActivitiesAvoided: 2,
      unavailableActionsAvoided: 1,
    });
    expect(result.report.goldens.every((g) => g.passed)).toBe(true);
  });
  it("benchmarks 1,000 compact decisions and reports bounded memory separately", () => {
    const result = plannerBenchmark([context([option()]), context([])]);
    expect(result.decisions).toBe(1000);
    expect(result.averageMs).toBeGreaterThan(0);
    expect(result.maxPlanBytes).toBeLessThan(4096);
    expect(result.maxSerializedWorkingSetBytes).toBeLessThan(8192);
    expect(result.checksum).toBeGreaterThan(0);
  });
});
