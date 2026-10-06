import type { ScenarioResult } from "./types";
import { weaknessKey } from "../transfer";
import { TARGETS } from "./scenarios";
const [r, sub, , tok] = TARGETS;
/** Small semantic contracts. No large internal snapshots. */
export const GOLDENS = [
  {
    id: "clear-grapheme",
    check: (s: ScenarioResult) =>
      s.trace[0].recommendations.some((x) => x.id === weaknessKey(r)) &&
      s.trace.at(-1)?.records.find((x) => x.key === weaknessKey(r))?.state ===
        "TRANSFER_CHECK",
  },
  {
    id: "directional-confusion",
    check: (s: ScenarioResult) =>
      s.trace[0].top === weaknessKey(sub) &&
      !s.trace.some((t) =>
        t.recommendations.some((x) => x.id === '["substitution","t","r"]'),
      ) &&
      s.metrics.masteryStep === 7,
  },
  {
    id: "broad-accuracy",
    check: (s: ScenarioResult) =>
      s.trace.at(-1)?.recommendations.length === 1 &&
      s.trace.at(-1)?.recommendations[0].type === "ACCURACY_FOCUS",
  },
  {
    id: "improving-natural",
    check: (s: ScenarioResult) =>
      s.metrics.stageFirstSteps.IMPROVING === 3 &&
      s.metrics.stageFirstSteps.TRANSFER_CHECK === 4 &&
      s.metrics.masteryStep === 7,
  },
  {
    id: "drill-only",
    check: (s: ScenarioResult) =>
      s.metrics.masteryStep === null &&
      s.trace.at(-1)?.records.find((x) => x.key === weaknessKey(r))?.state ===
        "TRANSFER_CHECK",
  },
  {
    id: "rare-token",
    check: (s: ScenarioResult) =>
      s.metrics.masteryStep === 12 &&
      s.trace.at(-1)?.records.find((x) => x.key === weaknessKey(tok))?.path ===
        "controlled",
  },
  {
    id: "grapheme-check-failure",
    check: (s: ScenarioResult) =>
      s.metrics.masteryStep === null &&
      s.trace.at(-1)?.records.find((x) => x.key === weaknessKey(r))?.failure ===
        "mild" &&
      s.trace.at(-1)?.records.find((x) => x.key === weaknessKey(r))?.level ===
        1,
  },
  {
    id: "regression",
    check: (s: ScenarioResult) =>
      s.trace[7].records.find((x) => x.key === weaknessKey(r))?.state ===
        "PROVISIONAL_MASTERY" &&
      s.trace.at(-1)?.records.find((x) => x.key === weaknessKey(r))?.state ===
        "REGRESSED",
  },
  {
    id: "four-plus",
    check: (s: ScenarioResult) =>
      s.trace[0].recommendations.length === 3 &&
      s.finalMastery.records.length >= 3,
  },
  {
    id: "noisy-beginner",
    check: (s: ScenarioResult) =>
      s.trace.every(
        (t) =>
          t.recommendations.length === 1 &&
          t.recommendations[0].type === "GENERAL_PRACTICE",
      ),
  },
];
export function evaluateGoldens(results: readonly ScenarioResult[]) {
  return GOLDENS.map((g) => ({
    id: g.id,
    passed:
      !!results.find((r) => r.id === g.id) &&
      g.check(results.find((r) => r.id === g.id)!),
  }));
}
