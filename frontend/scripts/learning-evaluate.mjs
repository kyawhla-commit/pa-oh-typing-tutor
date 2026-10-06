import { mkdir, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadEvaluation } from "./learning-policy-loader.mjs";
const started = performance.now(),
  out = fileURLToPath(new URL("../.learning-evaluation/", import.meta.url));
const module = await loadEvaluation();
try {
  const api = module.api,
    results = [];
  for (const s of api.SCENARIOS) results.push(api.simulateScenario(s));
  const report = api.scenarioReport(results);
  console.log(
    `Scenarios: ${report.scenarios}; engine sessions: ${report.syntheticSessions}; goldens: ${report.goldens.filter((g) => g.passed).length}/${report.goldens.length}`,
  );
  const planner = api.evaluatePlanner(results),
    plannerPerformance = api.plannerBenchmark(planner.contexts);
  console.log(
    `Planner: ${planner.report.plansGenerated} plans, ${planner.report.invalidPlans} invalid, ${planner.report.nonDeterministic} determinism differences; ${plannerPerformance.decisions} decisions averaging ${plannerPerformance.averageMs.toFixed(4)} ms.`,
  );
  const plannerOutcomes = await api.evaluatePlannerOutcomes(),
    outcomePerformance = api.outcomeBenchmark(planner.contexts);
  console.log(
    `Outcomes: ${plannerOutcomes.outcomesSimulated}; false evidence=${plannerOutcomes.falseLearningEvidenceIngestions}; false rollback=${plannerOutcomes.falseAssessmentRollbacks}; invariant violations=${plannerOutcomes.violations.length}`,
  );
  const pilotIsolation = api.evaluatePilotIsolation(results),
    pilotPerformance = api.pilotBenchmark();
  console.log(
    `Pilot isolation: ${pilotIsolation.historiesCompared} histories, ${pilotIsolation.differences.length} differences; human participants=0.`,
  );
  const histories = api.sensitivityHistories(),
    baseline = api.sensitivityReplay(histories),
    sensitivity = [];
  for (const parameter of api.SENSITIVITY_PARAMETERS) {
    const neighbors = [];
    for (const value of parameter.neighbors) {
      const isolated = await loadEvaluation({
        [parameter.module]: { [parameter.path]: value },
      });
      try {
        const replay = isolated.api.sensitivityReplay(histories),
          differences = [];
        for (let i = 0; i < baseline.length; i++) {
          for (let j = 0; j < baseline[i].trace.length; j++)
            if (
              JSON.stringify(baseline[i].trace[j]) !==
              JSON.stringify(replay[i].trace[j])
            )
              differences.push({
                scenario: baseline[i].id,
                session: j + 1,
                baseline: baseline[i].trace[j],
                neighbor: replay[i].trace[j],
              });
        }
        neighbors.push({
          value,
          affectedScenarios: [...new Set(differences.map((d) => d.scenario))],
          differences,
        });
      } finally {
        await isolated.close();
      }
    }
    const affected = neighbors.some((n) => n.affectedScenarios.length);
    sensitivity.push({
      ...parameter,
      neighbors,
      recommendation:
        parameter.path === "checkSuccesses"
          ? "keep current; higher neighbor incompatible with training window"
          : affected
            ? "candidate for real-user calibration"
            : "keep current; no observed difference in these histories",
    });
    console.log(
      `Sensitivity ${parameter.module}.${parameter.path}: ${neighbors.map((n) => `${n.value}→${n.affectedScenarios.length}`).join(", ")}`,
    );
  }
  console.log("Generating full 32-ordinal content matrix…");
  const matrix = api.evaluateGenerator();
  console.log("Checking repaired ordinal cycles in two additional scopes…");
  const stress = api.generationStress(),
    selectionPerformance = api.selectionBenchmark(results);
  await mkdir(out, { recursive: true });
  const complete = {
    ...report,
    planner: planner.report,
    plannerOutcomes,
    pilotIsolation,
    sensitivity: {
      fixedHistories: histories.length,
      configurations: 27,
      parameters: sensitivity,
    },
    generator: matrix.data,
    robustness: api.robustnessComparison(results),
    generationStress: stress.data,
  };
  const artifacts = {
    "evaluation-report.json": JSON.stringify(complete, null, 2) + "\n",
    "evaluation-report.md":
      api.renderReport(report, matrix.data, sensitivity) +
      api.renderPlannerReport(planner.report) +
      `\n# Slice 12 planner outcomes\n\n${plannerOutcomes.engineeringScenarios} engineering scenarios; ${plannerOutcomes.outcomesSimulated} outcomes; ${plannerOutcomes.invariantChecks} checks; false evidence ${plannerOutcomes.falseLearningEvidenceIngestions}; false rollback ${plannerOutcomes.falseAssessmentRollbacks}; violations ${plannerOutcomes.violations.length}. Human participants: 0.\n` +
      `\n# Slice 13 passive pilot isolation\n\n${pilotIsolation.historiesCompared} identical histories compared with capture off/on; ${pilotIsolation.differences.length} differences in recommendations, mastery, progression, planner actions or complete replays. ${pilotIsolation.milestonesCaptured} compact milestones. Human participants: 0; engineering rehearsals only.\n`,
    "content-samples.md":
      "# Representative generated content\n\nStructural samples only; manual observations are in the evaluation README. Unicode fallback is a neutral drill, with no Pa’O linguistic-quality claim.\n\n" +
      matrix.data.samples
        .map(
          (s) =>
            `## ${s.key} · ordinal ${s.ordinal}\n\nStrategy: ${s.strategy}; focus: ${JSON.stringify(s.focus)}\n\n\`\`\`text\n${s.text}\n\`\`\`\n`,
        )
        .join("\n"),
  };
  for (const [name, text] of Object.entries(artifacts))
    await writeFile(out + name, text);
  const bytes = Object.fromEntries(
    await Promise.all(
      Object.keys(artifacts).map(async (name) => [
        name,
        (await stat(out + name)).size,
      ]),
    ),
  );
  await writeFile(
    out + "performance.json",
    JSON.stringify(
      {
        runtimeMs: performance.now() - started,
        scenarioCount: report.scenarios,
        syntheticEngineSessions: report.syntheticSessions,
        sensitivityHistoryEngineSessions: histories.reduce(
          (n, h) => n + h.sessions.length,
          0,
        ),
        sensitivityReplayedSessions:
          27 * histories.reduce((n, h) => n + h.sessions.length, 0),
        scenarioExerciseAttempts: report.exerciseAttempts,
        generatorMatrixAttempts: matrix.data.attempted,
        outputBytes: bytes,
        generationTimings: matrix.timings,
        generationStressMs: stress.runtimeMs,
        selectionPerformance,
        plannerPerformance,
        outcomePerformance,
        pilotPerformance,
      },
      null,
      2,
    ) + "\n",
  );
  const violations = report.invariants.flatMap((i) => i.violations),
    untested = report.invariants.filter((i) => !i.checks),
    failedGoldens = report.goldens.filter((g) => !g.passed);
  console.log(
    `Invariants: ${report.invariants.length - untested.length}/${report.invariants.length} exercised, ${violations.length} violations. Generator: ${matrix.data.successful}/${matrix.data.attempted}, unsupported=${matrix.data.unsupported}, supported failures=${matrix.data.supportedFailures}. Stress: ${stress.data.successful}/${stress.data.attempted}. Reports: ${out}`,
  );
  if (
    pilotIsolation.differences.length ||
    plannerOutcomes.violations.length ||
    plannerOutcomes.falseLearningEvidenceIngestions ||
    plannerOutcomes.falseAssessmentRollbacks ||
    plannerOutcomes.invalidPlans ||
    planner.report.invalidPlans ||
    planner.report.nonDeterministic ||
    planner.report.goldens.some((g) => !g.passed) ||
    violations.length ||
    untested.length ||
    failedGoldens.length ||
    matrix.data.supportedFailures ||
    stress.data.failed ||
    stress.data.witnessMismatches
  ) {
    console.error({
      pilotIsolation: pilotIsolation.differences,
      plannerOutcomes: plannerOutcomes.violations,
      planner: planner.report.invalid,
      plannerGoldens: planner.report.goldens.filter((g) => !g.passed),
      violations,
      untested,
      failedGoldens,
      supportedGenerationFailures: matrix.data.supportedFailures,
      stressFailures: stress.data.failed,
      witnessMismatches: stress.data.witnessMismatches,
    });
    process.exitCode = 1;
  }
} finally {
  await module.close();
}
