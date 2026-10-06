import { describe, expect, it } from "vitest";
import { applyLearningEvidence, emptyProfile } from "../profile";
import { advanceMastery, emptyMastery } from "./progression";
import { evaluateMastery } from "./mastery";
import { recommendWithMastery } from "./recommendations";
import { classifyEvidence, weaknessKey } from "./classify";
import { attribution, r, session } from "./testFixtures";
import type { AdaptiveAttribution } from "./types";
import { loop } from "./testLoop";
import { initializeMastery } from "./storage";
describe("deterministic completion progression", () => {
  it("full loop establishes, trains, validates, suppresses and reactivates", () => {
    const x = loop();
    x.ingest(session("seed", undefined, [0, 1, 2, 3]));
    expect(x.target().state).toBe("ACTIVE");
    x.ingest(session("d1", undefined, [], { adaptive: true }), attribution());
    expect(x.target().state).toBe("ACTIVE");
    x.ingest(session("d2", undefined, [], { adaptive: true }), attribution());
    expect(x.target().state).toBe("IMPROVING");
    x.ingest(session("d3", undefined, [], { adaptive: true }), attribution());
    expect(x.target().state).toBe("TRANSFER_CHECK");
    expect(
      recommendWithMastery(x.profile, x.mastery).find(
        (x) => x.recommendation.type === "WEAK_GRAPHEME",
      )?.decision?.nextAction,
    ).toBe("WAIT_FOR_TRANSFER_EVIDENCE");
    for (const mode of ["fixed-text", "timed", "word-count"] as const)
      x.ingest(session(mode, undefined, [], { mode }));
    expect(x.target().state).toBe("PROVISIONAL_MASTERY");
    expect(x.target().transfer.map((o) => o.context)).toEqual([
      "ordinary-practice",
      "timed-test",
      "word-test",
    ]);
    expect(
      recommendWithMastery(x.profile, x.mastery).some(
        (x) => x.recommendation.type === "WEAK_GRAPHEME",
      ),
    ).toBe(false);
    const lifetime = x.profile.lifetime.graphemes.find(
      (s) => s.target[0] === "r",
    )!;
    expect(lifetime.errorOccurrences).toBe(4);
    x.ingest(session("one-off", undefined, [0]));
    expect(x.target().state).toBe("PROVISIONAL_MASTERY");
    x.ingest(session("bad1", undefined, [0, 1, 2, 3]));
    expect(x.target().state).toBe("PROVISIONAL_MASTERY");
    x.ingest(session("bad2", undefined, [0, 1, 2, 3]));
    expect(x.target().state).toBe("REGRESSED");
    expect(
      recommendWithMastery(x.profile, x.mastery).find(
        (x) =>
          x.decision?.state === "REGRESSED" &&
          x.recommendation.targets[0] === "r",
      )?.decision?.state,
    ).toBe("REGRESSED");
    expect(x.target().epoch).toBe(x.profile.sessionCount);
    x.ingest(session("fresh1"));
    expect(x.target().state).toBe("REGRESSED");
    x.ingest(session("fresh2"));
    expect(x.target().state).toBe("REGRESSED");
    x.ingest(session("fresh3"));
    expect(x.target().state).toBe("PROVISIONAL_MASTERY");
  });
  it("drills alone never master even when they remove the Slice 5 mixed recent signal", () => {
    const x = loop();
    x.ingest(session("seed", undefined, [0, 1, 2, 3]));
    for (let i = 0; i < 20; i++)
      x.ingest(
        session(`d${i}`, undefined, [], { adaptive: true }),
        attribution(),
      );
    expect(x.target().state).toBe("TRANSFER_CHECK");
    expect(x.target().transfer).toHaveLength(0);
    expect(x.profile.sessionCount).toBe(21);
    expect(x.profile.totalAttempts).toBe(420);
  });
  it("unrelated/general/missing adaptive metadata cannot train or transfer", () => {
    const x = loop();
    x.ingest(session("seed", undefined, [0, 1, 2, 3]));
    x.ingest(
      session("unrelated", undefined, [], { adaptive: true }),
      attribution("grapheme", ["t"]),
    );
    x.ingest(
      session("general", undefined, [], { adaptive: true }),
      attribution("general", []),
    );
    x.ingest(session("unknown", undefined, [], { adaptive: true }));
    expect(x.target()).toMatchObject({
      state: "ACTIVE",
      training: [],
      transfer: [],
    });
    expect(x.profile.sessionCount).toBe(4);
  });
  it("uses ingestion order despite reversed/equal wall timestamps and dedupes replays", () => {
    const x = loop();
    const seed = session("seed", undefined, [0, 1, 2, 3]);
    x.ingest({ ...seed, summary: { ...seed.summary, recordedAt: 999999 } });
    x.ingest(session("d1", undefined, [], { adaptive: true }), attribution());
    x.ingest(session("d2", undefined, [], { adaptive: true }), attribution());
    const previous = x.mastery;
    x.ingest(session("d2", undefined, [], { adaptive: true }), attribution());
    expect(x.mastery).toBe(previous);
    expect(x.target().training.map((o) => o.order)).toEqual([2, 3]);
  });
  it("captures old profile's ordinary baseline but invents no old adaptive transfer", () => {
    let profile = emptyProfile();
    for (let i = 0; i < 3; i++)
      profile = applyLearningEvidence(
        profile,
        session(`o${i}`, "r".repeat(40), [], { wpm: 20 }),
      );
    profile = applyLearningEvidence(
      profile,
      session("d", "r".repeat(40), [], { adaptive: true, wpm: 100 }),
    );
    const current = initializeMastery(profile);
    expect(current.records).toHaveLength(0);
    expect(current.ordinary.map((o) => o.correctWpm)).toEqual([20, 20, 20]);
    const e = session("next", "r".repeat(40), [], { wpm: 21 }),
      after = applyLearningEvidence(profile, e),
      next = advanceMastery(current, profile, after, e);
    const speed = next.records.find((r) => r.identity.kind === "speed")!;
    expect(speed.baselineWpm).toBe(20);
    expect(speed.transfer).toHaveLength(1);
  });
  it("unknown ordinary sources do not contribute", () => {
    const x = loop();
    x.ingest(session("seed", undefined, [0, 1, 2, 3]));
    const e = session("missing");
    x.ingest({ ...e, summary: { ...e.summary, sourceIdentity: null } });
    expect(classifyEvidence({ ...e.summary, sourceIdentity: null })).toBe(
      "unknown",
    );
    expect(x.target().transfer).toHaveLength(0);
  });
  it("broad accuracy completes the ordinary recovery and regression loop", () => {
    const x = loop(),
      text = "abcde".repeat(12),
      wrong = Array.from({ length: 12 }, (_, i) => i);
    const accuracy = () =>
      x.mastery.records.find((r) => r.identity.kind === "accuracy")!;
    for (let i = 0; i < 3; i++) x.ingest(session(`bad-${i}`, text, wrong));
    expect(accuracy().state).toBe("ACTIVE");
    for (let i = 0; i < 3; i++)
      x.ingest(
        session(`drill-${i}`, text, [], { adaptive: true }),
        attribution("accuracy", []),
      );
    expect(accuracy().state).toBe("TRANSFER_CHECK");
    for (let i = 0; i < 3; i++) x.ingest(session(`ordinary-${i}`, text));
    expect(accuracy().state).toBe("PROVISIONAL_MASTERY");
    expect(
      recommendWithMastery(x.profile, x.mastery).some(
        (r) => r.recommendation.type === "ACCURACY_FOCUS",
      ),
    ).toBe(false);
    for (let i = 0; i < 2; i++) x.ingest(session(`relapse-${i}`, text, wrong));
    expect(accuracy().state).toBe("REGRESSED");
    expect(
      recommendWithMastery(x.profile, x.mastery)[0].recommendation.type,
    ).toBe("ACCURACY_FOCUS");
  });
  it("speed establishes its own prior ordinary baseline before assessing later gains", () => {
    const x = loop(),
      text = "abcde".repeat(12);
    const speed = () =>
      x.mastery.records.find((r) => r.identity.kind === "speed")!;
    for (let i = 0; i < 3; i++)
      x.ingest(session(`baseline-${i}`, text, [], { wpm: 20 }));
    expect(speed().baselineWpm).toBe(20);
    expect(speed().transfer).toHaveLength(0);
    for (let i = 0; i < 3; i++)
      x.ingest(session(`gain-${i}`, text, [], { wpm: 21 }));
    expect(speed().state).toBe("PROVISIONAL_MASTERY");
    for (let i = 0; i < 3; i++)
      x.ingest(session(`loss-${i}`, text, [], { wpm: 17 }));
    expect(speed().state).toBe("REGRESSED");
    expect(speed().baselineWpm).toBe(20);
  });
  it("corrected target errors still fail focused training", () => {
    const x = loop();
    x.ingest(session("seed", undefined, [0, 1, 2, 3]));
    for (let i = 0; i < 3; i++)
      x.ingest(
        session(`corrected-${i}`, undefined, [0, 1, 2, 3], {
          adaptive: true,
          corrected: true,
        }),
        attribution(),
      );
    expect(x.target().state).toBe("ACTIVE");
    expect(x.target().training.every((o) => o.errors === 4)).toBe(true);
  });
  it("decisions remain pure and histories immutable", () => {
    const x = loop();
    x.ingest(session("seed", undefined, [0, 1, 2, 3]));
    const before = JSON.stringify(x.mastery);
    const first = evaluateMastery(x.target());
    expect(evaluateMastery(x.target())).toEqual(first);
    expect(JSON.stringify(x.mastery)).toBe(before);
    expect(Object.isFrozen(x.target().identity.items)).toBe(true);
  });
});
