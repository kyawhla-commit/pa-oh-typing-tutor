import { simulateScenario, replayHistory } from "./runner";
import {
  TARGETS,
  ordinary,
  seed,
  training,
  transfer,
  waiting,
  drill,
  TEXT,
} from "./scenarios";
import type { Scenario, AnonymousHistory } from "./types";
import { LEARNING } from "../constants";
import { TRANSFER } from "../transfer/constants";
import { ASSESSMENT } from "../progression/constants";
const r = TARGETS[0],
  sub = TARGETS[1],
  bg = TARGETS[2],
  tok = TARGETS[3];
export const SENSITIVITY_PARAMETERS = [
  {
    module: "LEARNING",
    path: "grapheme.opportunities",
    current: LEARNING.grapheme.opportunities,
    neighbors: [15, 25],
    riskLower: "Earlier diagnosis from fewer positions",
    riskHigher: "Later detection of rare graphemes",
  },
  {
    module: "LEARNING",
    path: "grapheme.rate",
    current: LEARNING.grapheme.rate,
    neighbors: [0.12, 0.18],
    riskLower: "More weak-key diagnoses",
    riskHigher: "Miss moderate repeated errors",
  },
  {
    module: "LEARNING",
    path: "substitution.recentCount",
    current: LEARNING.substitution.recentCount,
    neighbors: [3, 5],
    riskLower: "Directional noise becomes actionable",
    riskHigher: "Later confusion detection",
  },
  {
    module: "LEARNING",
    path: "bigram.rate",
    current: LEARNING.bigram.rate,
    neighbors: [0.15, 0.25],
    riskLower: "More pair diagnoses",
    riskHigher: "Miss pair problems",
  },
  {
    module: "LEARNING",
    path: "token.rate",
    current: LEARNING.token.rate,
    neighbors: [0.25, 0.35],
    riskLower: "Sparse tokens diagnosed sooner",
    riskHigher: "Miss moderately difficult tokens",
  },
  {
    module: "TRANSFER",
    path: "trainingRate",
    current: TRANSFER.trainingRate,
    neighbors: [0.03, 0.07],
    riskLower: "Slower advancement with residual errors",
    riskHigher: "Advance despite residual errors",
  },
  {
    module: "TRANSFER",
    path: "checkSuccesses",
    current: TRANSFER.checkSuccesses,
    neighbors: [2, 4],
    riskLower: "Transfer check after less training",
    riskHigher:
      "Four successes cannot fit the three-observation training window",
  },
  {
    module: "TRANSFER",
    path: "transferMinimum.grapheme",
    current: TRANSFER.transferMinimum.grapheme,
    neighbors: [30, 50],
    riskLower: "Mastery from less exposure",
    riskHigher: "Longer ordinary validation",
  },
  {
    module: "TRANSFER",
    path: "requiredSessions.grapheme",
    current: TRANSFER.requiredSessions.grapheme,
    neighbors: [2, 4],
    riskLower: "Less independent-session confirmation",
    riskHigher: "Longer mastery latency",
  },
  {
    module: "ASSESSMENT",
    path: "waitingSessions",
    current: ASSESSMENT.waitingSessions,
    neighbors: [3, 7],
    riskLower: "Checks offered before ordinary exposure has time to arrive",
    riskHigher: "Longer wait for genuinely rare targets",
  },
  {
    module: "ASSESSMENT",
    path: "sessions.grapheme",
    current: ASSESSMENT.sessions.grapheme,
    neighbors: [3, 5],
    riskLower: "Less independent check confirmation",
    riskHigher:
      "More checks required; values above five cannot fit the assessment window",
  },
  {
    module: "TRANSFER",
    path: "regressionRate",
    current: TRANSFER.regressionRate,
    neighbors: [0.12, 0.18],
    riskLower: "More reactivation after minor lapses",
    riskHigher: "Repeated moderate failures may be tolerated",
  },
  {
    module: "LEARNING",
    path: "poorAccuracy",
    current: LEARNING.poorAccuracy,
    neighbors: [88, 92],
    riskLower: "Miss broadly poor accuracy",
    riskHigher: "More broad overrides of localized diagnoses",
  },
] as const;
const scenario = (id: string, steps: Scenario["steps"]): Scenario => ({
  id: `sensitivity-${id}`,
  version: 1,
  group: "sensitivity",
  description:
    "Boundary history replayed unchanged under neighboring production constants",
  target: r,
  steps,
});
export function sensitivityHistories(): readonly AnonymousHistory[] {
  const localized = (identity: typeof r, text: string, count: number) =>
    ordinary("threshold boundary", text, [{ identity, occurrences: count }]);
  const probes = [
    scenario("graph-opportunities", [localized(r, "r".repeat(20), 3)]),
    scenario("graph-rate", [localized(r, "r".repeat(20), 3)]),
    scenario("substitution-count", [localized(sub, "r".repeat(20), 4)]),
    scenario("bigram-rate", [localized(bg, Array(20).fill("th").join(" "), 4)]),
    scenario("token-rate", [
      localized(tok, Array(10).fill("through").join(" "), 3),
    ]),
    scenario("training-rate", [
      seed(r),
      drill(r),
      drill(r, "mild"),
      ...training(r),
    ]),
    scenario("successful-drills", [seed(r), ...training(r)]),
    scenario("transfer-opportunities", [
      seed(r),
      ...training(r),
      ...Array.from({ length: 3 }, () =>
        ordinary("14 ordinary positions", "r".repeat(14)),
      ),
    ]),
    scenario("transfer-sessions", [seed(r), ...training(r), ...transfer(r)]),
    scenario("ordinary-wait", [
      seed(r),
      ...training(r),
      ...waiting(),
      ...waiting().slice(0, 2),
    ]),
    scenario("controlled-count", [
      seed(r),
      ...training(r),
      ...waiting(),
      ...Array.from({ length: 4 }, () =>
        drill(r, "success", "controlled-transfer-assessment"),
      ),
    ]),
    scenario("regression-rate", [
      seed(r),
      ...training(r),
      ...transfer(r),
      ...Array.from({ length: 3 }, () => localized(r, "r".repeat(20), 3)),
    ]),
    scenario(
      "broad-accuracy",
      Array.from({ length: 3 }, () =>
        ordinary(
          "distributed boundary",
          TEXT.broad,
          ["e", "o", "a", "i", "s", "l"].map((item) => ({
            identity: { kind: "grapheme", items: [item] },
            occurrences: 3,
          })),
        ),
      ),
    ),
  ];
  return probes.map((s) => simulateScenario(s).history);
}
/** Fixed evidence counterfactual: never regenerate histories under altered policy. */
export function sensitivityReplay(histories: readonly AnonymousHistory[]) {
  return histories.map((h) => ({
    id: h.anonymousLearnerId,
    trace: replayHistory(h).trace.map((t) => ({
      top: t.top,
      recommendations: t.recommendations.map((r) => r.id),
      records: t.records.map((r) => ({
        key: r.key,
        state: r.state,
        level: r.level,
        action: r.action,
        eligible: r.eligible,
        path: r.path,
      })),
    })),
  }));
}
