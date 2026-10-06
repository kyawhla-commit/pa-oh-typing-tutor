import { describe, expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { generateAdaptiveExercise } from "../exercises/generator";
import { spec } from "../exercises/testFixtures";
import { focusDensity, validateComposition } from "./composition";
import { serializeMastery } from "../transfer/storage";
import { emptyMastery } from "../transfer/progression";
import { eligibleRecord } from "./testFixtures";
import { COMPOSITION } from "./constants";
const categories = [
  spec("grapheme", ["r"]),
  spec("substitution", ["r", "t"]),
  spec("bigram", ["t", "h"]),
  spec("token", ["through"]),
  spec("accuracy", []),
  spec("speed", []),
  spec("general", []),
  spec("grapheme", ["é"]),
  spec("token", ["ပအိုဝ်ႏ"]),
];
describe("deterministic composition batch", () => {
  it("validates 264 exercises across categories, levels, ordinals and assessments", () => {
    const started = performance.now(),
      failures: string[] = [],
      examples: string[] = [];
    let total = 0,
      unsupported = 0;
    for (const s of categories)
      for (const purpose of [
        "training",
        "controlled-transfer-assessment",
      ] as const) {
        if (purpose !== "training" && !s.focusItems.length) continue;
        for (const level of purpose === "training"
          ? ([0, 1, 2] as const)
          : ([2] as const))
          for (let ordinal = 0; ordinal < 8; ordinal++) {
            total++;
            const result = generateAdaptiveExercise(s, {
              learnerKey: "slice8-benchmark",
              composition: { level, ordinal, purpose },
            });
            if (!result.ok) {
              if (
                purpose === "controlled-transfer-assessment" &&
                ["é", "ပအိုဝ်ႏ"].includes(s.focusItems[0])
              ) {
                expect(result.code).toBe("unsupported-focus");
                unsupported++;
                continue;
              }
              failures.push(
                `${s.focusType} ${s.focusItems} L${level} ${ordinal} ${purpose}: ${result.reason}`,
              );
              continue;
            }
            const e = result.exercise;
            expect(
              validateComposition(
                e.text,
                e.generatedFrom.spec,
                e.sections,
                e.contentStrategy,
                e.generatedFrom.composition!,
              ).valid,
            ).toBe(true);
            if (ordinal === 0 && categories.indexOf(s) < 4)
              examples.push(
                `## ${s.focusType}: ${s.focusItems.join(" → ")} — ${purpose === "training" ? `Level ${level}` : "controlled assessment"}\n\n${e.contentStrategy}; ${e.coverage.totalGraphemes} graphemes; focus density ${(focusDensity(e.text, s) * 100).toFixed(1)}%; mixed ${((e.sections[2].text.length / e.text.length) * 100).toFixed(1)}%; occurrences ${e.coverage.focus.map((r) => r.occurrences).join(" / ")}.\n\n\`\`\`text\n${e.text}\n\`\`\`\n`,
              );
          }
      }
    const elapsed = performance.now() - started;
    const companion = serializeMastery({
      ...emptyMastery(8),
      records: [eligibleRecord()],
      variants: Array.from({ length: COMPOSITION.maxVariants }, (_, i) => ({
        key: JSON.stringify(["training", "token", `word${i}`]),
        nextOrdinal: 32,
      })),
    });
    const stats = {
      total,
      failures: failures.length,
      unsupported,
      totalMs: Math.round(elapsed),
      averageMs: Number((elapsed / total).toFixed(2)),
      companionBytes: new TextEncoder().encode(companion).length,
    };
    console.info("Slice 8 benchmark", stats);
    expect(failures, failures.join("\n")).toEqual([]);
    expect(total).toBe(264);
    expect(unsupported).toBe(16);
    if (process.env.SLICE8_WRITE_REPORT === "1") {
      writeFileSync(
        "src/features/learning/progression/BENCHMARK.json",
        JSON.stringify(stats, null, 2) + "\n",
      );
      writeFileSync(
        "src/features/learning/progression/EXAMPLES.md",
        `# Slice 8 deterministic content samples\n\nScope slice8-benchmark; ordinal 0; generator ${COMPOSITION.generatorVersion}; bank ${COMPOSITION.contentVersion}. The three lines are focus, context, mixed. These are curated phrase practice, not a narrative or verified Pa’O language content.\n\n${examples.join("\n")}`,
      );
    }
  }, 30000);
});
