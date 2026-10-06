import { generateAdaptiveExercise } from "../exercises/generator";
import { canGenerateExercise } from "../exercises/capability";
import { MATRIX_FOCI, matrixSpec } from "./generator";
import { selectionWithMastery } from "../transfer/recommendations";
import { selectVisible } from "../selection";
import { emptyMastery } from "../transfer/progression";
import { rankPracticeCandidates } from "../policy";
import type { ScenarioResult } from "./types";
import baseline from "./slice9-baseline.json";
export function robustnessComparison(results: readonly ScenarioResult[]) {
  return {
    baseline,
    after: baseline.starvation.map((before) => {
      const result = results.find((x) => x.id === before.id)!;
      return {
        id: before.id,
        metrics: result.metrics,
        trace: result.trace.map((t) => ({
          step: t.step,
          label: t.label,
          recommendations: t.recommendations,
          selectionAudit: t.selectionAudit,
          records: t.records.map((x) => ({
            key: x.key,
            state: x.state,
            level: x.level,
            action: x.action,
            eligible: x.eligible,
          })),
        })),
      };
    }),
  };
}
export function generationStress() {
  const rows = [];
  const started = performance.now();
  for (const learnerKey of ["stress-scope-A", "stress-scope-B"])
    for (const [name, level, purpose] of [
      ["e-to-i", 1, "training"],
      ["e-to-i", 2, "training"],
      ["e-to-i", 2, "controlled-transfer-assessment"],
      ["a", 2, "controlled-transfer-assessment"],
    ] as const)
      for (let ordinal = 0; ordinal < 32; ordinal++) {
        const spec = matrixSpec(MATRIX_FOCI.find((x) => x.name === name)!),
          options = { learnerKey, composition: { level, ordinal, purpose } };
        const capability = canGenerateExercise(spec, options),
          result = generateAdaptiveExercise(spec, options);
        rows.push({
          learnerKey,
          name,
          level,
          purpose,
          ordinal,
          ok: result.ok,
          capabilityMatches:
            JSON.stringify(capability) === JSON.stringify(result),
          ...(!result.ok
            ? { code: result.code, diagnostics: result.diagnostics }
            : {}),
        });
      }
  return {
    data: {
      attempted: rows.length,
      successful: rows.filter((x) => x.ok).length,
      failed: rows.filter((x) => !x.ok).length,
      witnessMismatches: rows.filter((x) => !x.capabilityMatches).length,
      rows,
    },
    runtimeMs: performance.now() - started,
  };
}
export function selectionBenchmark(results: readonly ScenarioResult[]) {
  const profiles = results.filter(
    (x) => x.group === "starvation" || x.group === "overlap",
  );
  const started = performance.now();
  let candidateCount = 0;
  for (let i = 0; i < 100; i++)
    for (const r of profiles) {
      const result = selectionWithMastery(r.finalProfile, r.finalMastery);
      candidateCount += result.audit.length;
    }
  const actualHistoryMs = performance.now() - started;
  // Use the actual production eligible candidate lists at bounded profile sizes.
  const lists = results
      .map((r) =>
        rankPracticeCandidates(r.finalProfile).map((recommendation) => ({
          recommendation,
        })),
      )
      .sort((a, b) => b.length - a.length),
    large = lists[0] ?? [];
  const largeStarted = performance.now();
  for (let i = 0; i < 100; i++) selectVisible(large);
  return {
    runs: 100 * profiles.length,
    candidatesProcessed: candidateCount,
    actualHistoryMs,
    largestActualEligibleList: large.length,
    largeRuns: 100,
    largeListMs: performance.now() - largeStarted,
  };
}
