import { INVARIANT_IDS } from "./constants";
import { evaluateGoldens } from "./goldens";
import { boundaryInvariants } from "./invariants";
import type { ScenarioResult, InvariantResult } from "./types";
import { SLICE9_GENERATION_BASELINE } from "../exercises/repairFixtures";
export function summarizeInvariants(
  results: readonly ScenarioResult[],
  extra: readonly InvariantResult[] = boundaryInvariants(),
) {
  return INVARIANT_IDS.map((id) => {
    const rows = [...results.flatMap((r) => r.invariants), ...extra].filter(
      (i) => i.id === id,
    );
    return {
      id,
      checks: rows.reduce((n, i) => n + i.checks, 0),
      violations: rows.flatMap((i) => i.violations),
    };
  });
}
export function scenarioReport(results: readonly ScenarioResult[]) {
  return {
    version: 2,
    evidenceKind: "synthetic-engine-results",
    realLearnerDataset: false,
    scenarios: results.length,
    syntheticSessions: results.reduce((n, r) => n + r.engineSessions, 0),
    ingestedSessions: results.reduce(
      (n, r) => n + r.finalProfile.sessionCount,
      0,
    ),
    exerciseAttempts: results.reduce((n, r) => n + r.exercises, 0),
    goldens: evaluateGoldens(results),
    invariants: summarizeInvariants(results),
    results: results.map(({ finalProfile: _, finalMastery: __, ...r }) => r),
  };
}
export function renderReport(
  report: ReturnType<typeof scenarioReport>,
  matrix: {
    attempted: number;
    successful: number;
    failed: number;
    failures: Record<string, number>;
    unsupported?: number;
    supportedAttempts?: number;
    supportedFailures?: number;
    diagnosticReasons?: Record<string, number>;
    diversity: readonly {
      key: string;
      uniqueTargets: number;
      repeatedTargets: number;
      repeatedOpenings: number;
    }[];
  },
  sensitivity: readonly {
    module: string;
    path: string;
    current: number;
    neighbors: readonly {
      value: number;
      affectedScenarios: readonly string[];
      differences: readonly unknown[];
    }[];
    riskLower: string;
    riskHigher: string;
    recommendation: string;
  }[],
) {
  const failed = report.invariants.flatMap((i) => i.violations),
    untested = report.invariants.filter((i) => !i.checks);
  const lines = [
    "# Offline learning evaluation",
    "",
    `Synthetic scenarios: ${report.scenarios}; engine sessions: ${report.syntheticSessions}; ingested unique sessions: ${report.ingestedSessions}; scenario exercise attempts: ${report.exerciseAttempts}.`,
    `Golden scenarios: ${report.goldens.filter((g) => g.passed).length}/${report.goldens.length}. Invariants exercised: ${report.invariants.filter((i) => i.checks).length}/${report.invariants.length}; violations: ${failed.length}; untested: ${untested.map((i) => i.id).join(", ") || "none"}.`,
    "",
    "These are deterministic engineering examples, not measured learner effectiveness. No actual anonymized learner dataset was available. Timing is in performance.json and is excluded from deterministic reports.",
    "",
    "## Scenario outcomes",
    "",
  ];
  for (const r of report.results) {
    const m = r.metrics;
    lines.push(
      `- **${r.id}** (${r.group}): detection=${m.detectionStep ?? "none"} (${m.detectionOpportunities ?? 0} opportunities); stages=${JSON.stringify(m.stageFirstSteps)}; mastery=${m.masteryStep ?? "none"}; top changes=${m.topChanges}; mastery-state changes=${m.activeMasteryFlips}; offers=${m.assessmentOfferSteps}; waiting before first offer=${m.ordinaryWaitingBeforeFirstOffer ?? "none"}; actionable hidden steps=${m.targetHiddenActionableSteps}; regression steps=${m.regressionSteps.join(",") || "none"}.`,
    );
  }
  lines.push(
    "",
    "## Interpretation",
    "",
    "- Clear grapheme, directional confusion, bigram and token weaknesses surface when their category gate is met. Small noisy samples remain general practice. Broad accuracy becomes a sole override after repeated qualifying sessions.",
    "- Successful training moves composition 0→1→2, then waits for ordinary evidence. Natural mastery needs sufficient target exposure across independent sessions. Later failed checks reset the appropriate training epoch.",
    "- All sparse histories must spend five qualifying ordinary sessions waiting before a controlled offer. Checks do not launch automatically; one success does not master a target. Ordinary regression remains possible after controlled mastery.",
    "- Slice 10 preserves diagnosis/raw scores, then selects at most three distinct intents. Eligible overlap remains supporting evidence. Formal regression receives one reserved slot (except the sole broad-accuracy override), transfer checks receive one slot, and recent severe grapheme anchors are represented directly or by a strongly supported direction. Complete audits retain original scores, signatures, suppression reasons and final actions.",
    "- The frozen Slice 9 baseline is retained in robustness.baseline; robustness.after contains the same three histories under Slice 10. A finite scenario set cannot prove absence of starvation for every history, and more than three independent needs still require prioritization.",
    "- Counts of target-hidden steps only include already tracked actionable records. A never-admitted target is reflected by detection=none and the recommendation trace; it must not be interpreted as zero starvation.",
    "- Policy mastery-state changes include intended mastery→regression transitions. They are not a single quality score. Isolated-error invariants and one-bad-session goldens check conservative reactivation.",
    "",
    "## Threshold sensitivity",
    "",
  );
  for (const s of sensitivity)
    lines.push(
      `- **${s.module}.${s.path}** current=${s.current}; neighbors=${s.neighbors.map((n) => `${n.value}: ${n.affectedScenarios.length} histories changed [${n.affectedScenarios.join(", ")}]`).join("; ")}. Lower risk: ${s.riskLower}. Higher risk: ${s.riskHigher}. Decision: ${s.recommendation}.`,
    );
  lines.push(
    "",
    "Sensitivity replays the same engine-extracted evidence through isolated copies of the production policy. It does not predict how a human would change behavior after different recommendations. No defaults were modified. Raising required counts above bounded observation windows is invalid policy configuration.",
    "",
    "## Generator engineering matrix",
    "",
    `Slice 9 baseline: attempts=${SLICE9_GENERATION_BASELINE.attempted}; success=${SLICE9_GENERATION_BASELINE.successful}; failures=${SLICE9_GENERATION_BASELINE.failed}; failure rate=6.6964%. These findings remain unchanged.`,
    `Slice 10: attempts=${matrix.attempted}; generated=${matrix.successful}; not generated=${matrix.failed}; unsupported=${matrix.unsupported ?? 0}; supported attempts=${matrix.supportedAttempts ?? matrix.attempted}; supported failures=${matrix.supportedFailures ?? matrix.failed}; reasons=${JSON.stringify(matrix.failures)}; diagnostic reasons=${JSON.stringify(matrix.diagnosticReasons ?? {})}.`,
    "Unsupported controlled checks lack curated target contexts. Unicode and unbanked-token fallback still support training, with an ordinary-Practice action while natural evidence is insufficient. A verified preflight witness is required before a focused action is offered. Coverage, density, repetition and length limits are preserved; controlled fallback is explicitly rejected.",
    "",
  );
  for (const d of matrix.diversity)
    lines.push(
      `- ${d.key}: unique targets=${d.uniqueTargets}; repeated targets=${d.repeatedTargets}; repeated openings=${d.repeatedOpenings}.`,
    );
  lines.push(
    "",
    "Coverage/structural flags are engineering signals, not linguistic quality ratings. Detailed rows include exposure, density, contexts, punctuation and repetition. Representative original generated passages are in content-samples.md; see evaluation/README.md for manual review and privacy boundaries.",
    "",
    "## Readiness",
    "",
    "Slice 10 addresses tested coverage/visibility blockers. Planner readiness still depends on green stress checks, manual content review and explicit treatment of unavailable checks. Finite bank reuse and synthetic-only calibration remain limits. No planner or telemetry is implemented; see SLICE10.md for the final GO/HOLD decision.",
  );
  return lines.join("\n") + "\n";
}
