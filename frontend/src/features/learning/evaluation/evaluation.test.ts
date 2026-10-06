import { beforeAll, describe, it, expect } from "vitest";
import {
  SCENARIOS,
  PERSONAS,
  PROGRESSION,
  ASSESSMENTS,
  COMPETITION,
  STARVATION,
  TARGETS,
  ordinary,
} from "./scenarios";
import { simulateScenario, replayHistory } from "./runner";
import { evaluateGoldens } from "./goldens";
import { scenarioReport, renderReport } from "./reports";
import { boundaryInvariants } from "./invariants";
import { validateAnonymousHistory, evaluateLearningHistory } from "./import";
import { evaluateGenerator } from "./generator";
import { extractLearningEvidence } from "../index";
import { weaknessKey } from "../transfer";
import { syntheticSession, occurrencePositions } from "./behavior";
import type { ScenarioResult } from "./types";
let results: ScenarioResult[] = [];
beforeAll(() => {
  results = SCENARIOS.map(simulateScenario);
}, 180000);
const result = (id: string) => results.find((r) => r.id === id)!;
const target = (id: string) =>
  result(id)
    .trace.at(-1)
    ?.records.find((r) => r.key === result(id).targetKey);

describe("versioned learner histories", () => {
  it("has twelve explicit behavioral personas and complete matrices", () => {
    expect(PERSONAS).toHaveLength(12);
    expect(PROGRESSION).toHaveLength(28);
    expect(ASSESSMENTS).toHaveLength(16);
    expect(COMPETITION).toHaveLength(10);
    expect(STARVATION).toHaveLength(3);
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
    expect(SCENARIOS.every((s) => s.version === 1)).toBe(true);
  });
  for (const s of SCENARIOS)
    it(`${s.id}: no system invariant violations`, () => {
      const r = result(s.id);
      expect(r.invariants.flatMap((i) => i.violations)).toEqual([]);
      expect(r.trace).toHaveLength(s.steps.length);
    });
  it("repeats a scenario with identical profiles, states, actions and content", () => {
    const first = result("rare-token"),
      again = simulateScenario(SCENARIOS.find((s) => s.id === "rare-token")!);
    expect(again).toEqual(first);
  }, 30000);
  it("replays all histories through real aggregation and mastery with identical final state", () => {
    for (const r of results) {
      const replay = replayHistory(r.history);
      expect(replay.profile).toEqual(r.finalProfile);
      expect(replay.mastery.records).toEqual(r.finalMastery.records);
    }
  }, 60000);
  it("preserves the original invariants and exercises all thirty, with none untested", () => {
    const report = scenarioReport(results);
    expect(report.invariants).toHaveLength(30);
    expect(
      report.invariants.every((i) => i.checks > 0 && i.violations.length === 0),
    ).toBe(true);
  });
  it("covers scope, version, ordinal, direction, reload, and save boundaries", () => {
    expect(
      boundaryInvariants().every(
        (i) => i.checks > 0 && i.violations.length === 0,
      ),
    ).toBe(true);
  });
  it("keeps ten meaningful golden policy contracts", () => {
    expect(evaluateGoldens(results)).toHaveLength(10);
    expect(evaluateGoldens(results).filter((g) => !g.passed)).toEqual([]);
  });
  it("processes repeated frozen drills without ordinary mastery", () => {
    const r = result("drill-only");
    expect(r.engineSessions).toBe(11);
    expect(r.exercises).toBe(3);
    expect(r.trace.filter((t) => t.exercise?.reused)).toHaveLength(7);
    expect(r.metrics.masteryStep).toBeNull();
    expect(target(r.id)?.transfer.sessions).toBe(0);
  });
  it("preserves broad override and maximum-three competition", () => {
    expect(
      result("broad-localized")
        .trace.at(-1)
        ?.recommendations.map((r) => r.type),
    ).toEqual(["ACCURACY_FOCUS"]);
    expect(result("four-plus").trace[0].recommendations).toHaveLength(3);
    expect(
      results
        .flatMap((r) => r.trace)
        .every((t) => t.recommendations.length <= 3),
    ).toBe(true);
  });
  it("surfaces the intended severe grapheme despite high lifetime competition", () => {
    const r = result("large-lifetime-new-severe");
    expect(r.metrics.detectionStep).toBe(13);
    expect(
      r.trace
        .at(-1)
        ?.recommendations.some((x) => x.targets.some((t) => t.includes("v"))),
    ).toBe(true);
    expect(
      r.trace.at(-1)?.recommendations.some((x) => x.id === '["grapheme","v"]'),
    ).toBe(true);
  });
  it("establishes old mastery before introducing new targets in post-mastery starvation histories", () => {
    for (const id of [
      "large-lifetime-mastered",
      "large-lifetime-other-category",
    ]) {
      expect(
        result(id).trace[20].records.find(
          (r) => r.key === weaknessKey(TARGETS[0]),
        )?.state,
      ).toBe("PROVISIONAL_MASTERY");
    }
  });
  it("new severe grapheme remains visible after old mastery and formal regression becomes visible", () => {
    const fresh = result("large-lifetime-mastered");
    expect(fresh.metrics.detectionStep).not.toBeNull();
    expect(
      fresh.trace
        .at(-1)
        ?.recommendations.some((r) => r.id === '["grapheme","v"]'),
    ).toBe(true);
    const regressed = result("large-lifetime-other-category").trace[23];
    expect(
      regressed.records.find((r) => r.key === '["grapheme","r"]')?.state,
    ).toBe("REGRESSED");
    expect(
      regressed.recommendations.some((r) => r.id === '["grapheme","r"]'),
    ).toBe(true);
    expect(
      regressed.recommendations.some((r) => r.id === '["token","through"]'),
    ).toBe(true);
  });
  it("repaired e→i and controlled a complete their real controlled mastery paths", () => {
    for (const id of ["repaired-e-to-i", "repaired-controlled-a"]) {
      expect(target(id)?.state).toBe("PROVISIONAL_MASTERY");
      expect(target(id)?.path).toBe("controlled");
      expect(result(id).trace.every((t) => !t.generationFailure)).toBe(true);
    }
  });
  it("unsupported Myanmar controlled action redirects to ordinary practice before generation", () => {
    const r = result("unsupported-myanmar-check");
    expect(target(r.id)?.state).toBe("TRANSFER_CHECK");
    expect(target(r.id)?.action).toBe("normal-practice");
    expect(r.trace.at(-1)?.generationFailure).toBe("action-unavailable");
    expect(
      r.trace.some(
        (t) => t.exercise?.purpose === "controlled-transfer-assessment",
      ),
    ).toBe(false);
  });
  it("selection audit retains raw priorities, overlap signatures and final visible actions", () => {
    const traces = result("large-lifetime-new-severe").trace;
    expect(
      traces.some((t) =>
        t.selectionAudit?.some(
          (a) => a.reason === "related-evidence" && a.representedBy,
        ),
      ),
    ).toBe(true);
    for (const t of traces)
      for (const r of t.recommendations) {
        const audit = t.selectionAudit?.find((x) => x.weaknessId === r.id);
        expect(audit?.visible).toBe(true);
        expect(audit?.rawPriority).toBe(r.priority);
        expect(audit?.action).not.toBeNull();
      }
  });
  for (const id of TARGETS)
    it(`${id.kind}: all seven progression outcomes`, () => {
      const prefix = id.kind;
      expect(target(`${prefix}-consistent-success`)?.state).toBe(
        "TRANSFER_CHECK",
      );
      expect(target(`${prefix}-consistent-failure`)?.level).toBe(0);
      expect(target(`${prefix}-mild-recovery`)?.state).toBe("TRANSFER_CHECK");
      expect(target(`${prefix}-severe-rollback`)?.level).toBe(0);
      expect(result(`${prefix}-poor-transfer`).metrics.masteryStep).toBeNull();
      expect(target(`${prefix}-natural-mastery`)?.path).toBe("natural");
      expect(target(`${prefix}-retrain`)?.state).toBe("TRANSFER_CHECK");
    });
  for (const id of TARGETS)
    it(`${id.kind}: waiting, independent checks, failure, natural priority and regression`, () => {
      const prefix = id.kind,
        r = result(`${prefix}-controlled-mastery`),
        first = r.trace.find(
          (t) => t.records.find((x) => x.key === r.targetKey)?.eligible,
        );
      expect(first?.records.find((x) => x.key === r.targetKey)?.waiting).toBe(
        5,
      );
      const checks = r.trace.filter(
        (t) => t.exercise?.purpose === "controlled-transfer-assessment",
      );
      expect(checks[0].records.find((x) => x.key === r.targetKey)?.state).toBe(
        "TRANSFER_CHECK",
      );
      expect(
        checks.at(-1)?.records.find((x) => x.key === r.targetKey)?.path,
      ).toBe("controlled");
      expect(target(r.id)?.state).toBe("REGRESSED");
      expect(target(`${prefix}-check-failure`)?.state).toBe("ACTIVE");
      expect(target(`${prefix}-check-severe`)?.level).toBe(0);
      expect(
        result(`${prefix}-natural-priority`).trace.some(
          (t) => t.records.find((x) => x.key === weaknessKey(id))?.eligible,
        ),
      ).toBe(false);
    });
  it("tolerates one bad session and one isolated minor mistake", () => {
    expect(target("one-bad-session")?.state).toBe("PROVISIONAL_MASTERY");
    expect(
      result("regression").trace[7].records.find(
        (r) => r.key === weaknessKey(TARGETS[0]),
      )?.state,
    ).toBe("PROVISIONAL_MASTERY");
  });
});
describe("production-engine behavior control", () => {
  for (const mode of ["fixed-text", "timed", "word-count"] as const)
    it(`generates completed ${mode} results at the requested pace`, () => {
      const r = syntheticSession(
        ordinary("timing", undefined, [], { mode, wpm: 20 }),
      )!;
      expect(r.status).toBe("completed");
      expect(r.metrics.correctWpm).toBeCloseTo(20, 1);
      expect(r.activeElapsedMs).toBeGreaterThan(1000);
    });
  it("controls corrected and uncorrected directional occurrences, including final position", () => {
    const identity = TARGETS[1],
      r = syntheticSession(
        ordinary(
          "errors",
          "rrrrr",
          [{ identity, occurrences: 5, corrected: true }],
          { wpm: 30 },
        ),
      )!;
    expect(r.counts.correctedErrors).toBe(5);
    expect(r.counts.uncorrectedErrors).toBe(0);
    expect(r.metrics.correctWpm).toBeCloseTo(30, 1);
    const u = syntheticSession(
      ordinary("remaining", "r".repeat(20), [{ identity, occurrences: 4 }]),
    )!;
    expect(u.counts.uncorrectedErrors).toBe(4);
    expect(
      extractLearningEvidence(u, "unit", 0)?.aggregates.substitutions.find(
        (s) => s.actual === "t",
      )?.count,
    ).toBe(4);
  });
  it("retains exact NFC and Myanmar token boundaries", () => {
    expect(
      occurrencePositions("e\u0301 é", { kind: "grapheme", items: ["é"] }),
    ).toHaveLength(2);
    expect(
      occurrencePositions("ပအိုဝ်ႏ ပအိုဝ်ႏ", {
        kind: "token",
        items: ["ပအိုဝ်ႏ"],
      }),
    ).toHaveLength(2);
  });
});
describe("offline anonymized input", () => {
  it("accepts engine-extracted compact evidence and evaluates it identically", () => {
    const h = result("rare-token").history,
      checked = validateAnonymousHistory(h);
    expect(checked.sessions).toHaveLength(h.sessions.length);
    expect(evaluateLearningHistory(h).mastery.records).toEqual(
      result("rare-token").finalMastery.records,
    );
  });
  for (const field of ["email", "rawText", "typedBuffer", "auth"])
    it(`rejects ${field} rather than silently accepting it`, () => {
      expect(() =>
        validateAnonymousHistory({
          ...result("clear-grapheme").history,
          [field]: "private",
        }),
      ).toThrow();
    });
  it("rejects invalid numbers, duplicate aggregates, noncanonical identities and hidden source fields", () => {
    const h = result("clear-grapheme").history;
    for (const mutate of [
      (x: any) => (x.sessions[0].summary.totalAttempts = -1),
      (x: any) =>
        x.sessions[0].aggregates.graphemes.push(
          x.sessions[0].aggregates.graphemes[0],
        ),
      (x: any) => (x.sessions[0].summary.sourceIdentity.email = "private"),
      (x: any) => (x.sessions[0].aggregates.graphemes[0].target = ["e\u0301"]),
    ]) {
      const input = structuredClone(h);
      mutate(input);
      expect(() => validateAnonymousHistory(input)).toThrow();
    }
  });
  it("rejects custom-source token and bigram aggregates and oversized imports", () => {
    const h: any = structuredClone(result("clear-grapheme").history);
    h.sessions[0].summary.sourceIdentity = {
      type: "custom",
      id: "opaque",
      version: "v1",
    };
    expect(() => validateAnonymousHistory(h)).toThrow();
    expect(() =>
      validateAnonymousHistory({
        version: 1,
        anonymousLearnerId: "anon",
        sessions: Array(5001).fill(null),
      }),
    ).toThrow();
    expect(() =>
      validateAnonymousHistory({
        version: 1,
        anonymousLearnerId: "someone@example.com",
        sessions: [],
      }),
    ).toThrow();
  });
  it("strips timestamps and keeps private-source profiles free of private tokens", () => {
    const h = result("custom-privacy").history;
    expect(evaluateLearningHistory(h).profile.lifetime.tokens).toEqual([]);
    expect(JSON.stringify(evaluateLearningHistory(h))).not.toContain(
      "PRIVATE_CUSTOM_SENTINEL",
    );
  });
});
it("produces deterministic JSON/Markdown without volatile timing data", () => {
  const a = scenarioReport(results),
    b = scenarioReport(results);
  expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  const matrix = {
    attempted: 0,
    successful: 0,
    failed: 0,
    failures: {},
    diversity: [],
  };
  expect(renderReport(a, matrix, [])).toBe(renderReport(b, matrix, []));
  expect(JSON.stringify(a)).not.toContain("runtimeMs");
});
it("generator matrix reports every combination and separates engineering timing", () => {
  const a = evaluateGenerator(1),
    b = evaluateGenerator(1);
  expect(a.data).toEqual(b.data);
  expect(a.data.attempted).toBe(49);
  expect(a.data.successful + a.data.failed).toBe(a.data.attempted);
  expect(a.timings).toHaveLength(a.data.attempted);
  expect(a.data.rows).toHaveLength(a.data.attempted);
  expect(
    a.data.samples.some(
      (s) => s.key.includes("myanmar") && s.strategy === "fallback-drill",
    ),
  ).toBe(true);
}, 30000);
