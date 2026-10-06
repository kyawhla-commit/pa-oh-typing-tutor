import { it, expect } from "vitest";
import { loadEvaluation } from "../../../../scripts/learning-policy-loader.mjs";
import { SENSITIVITY_PARAMETERS } from "./sensitivity";
import { LEARNING } from "../constants";
it("lists thirteen intentional parameter neighbors rather than a grid search", () => {
  expect(SENSITIVITY_PARAMETERS).toHaveLength(13);
  expect(
    SENSITIVITY_PARAMETERS.every(
      (p) =>
        p.neighbors.length === 2 && !p.neighbors.includes(p.current as never),
    ),
  ).toBe(true);
});
it("isolates actual production constants, changes a boundary diagnosis and leaves defaults untouched", async () => {
  const baseline = await loadEvaluation(),
    lower = await loadEvaluation({ LEARNING: { "grapheme.rate": 0.12 } }),
    higher = await loadEvaluation({ LEARNING: { "grapheme.rate": 0.18 } });
  try {
    const text = "r".repeat(20),
      scenario = {
        id: "isolated",
        version: 1 as const,
        group: "sensitivity" as const,
        description: "Actual policy module replay",
        steps: [
          baseline.api.ordinary("boundary", text, [
            {
              identity: { kind: "grapheme" as const, items: ["r"] },
              occurrences: 3,
            },
          ]),
        ],
      };
    const b = baseline.api.simulateScenario(scenario),
      l = lower.api.replayHistory(b.history),
      h = higher.api.replayHistory(b.history);
    expect(
      b.trace[0].recommendations.some((r) => r.type === "WEAK_GRAPHEME"),
    ).toBe(true);
    expect(
      l.trace[0].recommendations.some((r) => r.type === "WEAK_GRAPHEME"),
    ).toBe(true);
    expect(
      h.trace[0].recommendations.some((r) => r.type === "WEAK_GRAPHEME"),
    ).toBe(false);
    expect(LEARNING.grapheme.rate).toBe(0.15);
  } finally {
    await baseline.close();
    await lower.close();
    await higher.close();
  }
}, 30000);
it("rejects unknown override paths and invalid values", async () => {
  await expect(loadEvaluation({ LEARNING: { unknown: 1 } })).rejects.toThrow(
    "Invalid evaluation-only override",
  );
  await expect(
    loadEvaluation({ TRANSFER: { trainingRate: NaN } }),
  ).rejects.toThrow();
});
