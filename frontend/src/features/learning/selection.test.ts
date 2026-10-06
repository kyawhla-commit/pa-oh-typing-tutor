import { describe, it, expect } from "vitest";
import {
  selectVisible,
  overlapSignature,
  visibleWeaknessId,
} from "./selection";
import type { PracticeRecommendation, RecommendationType } from "./types";
import { selectionWithMastery } from "./transfer/recommendations";
import { emptyMastery } from "./transfer/progression";
import { profileOf, evidence } from "./testFixtures";
import { record } from "./transfer/testFixtures";
const candidate = (
  type: RecommendationType,
  targets: readonly string[],
  priority: number,
  state?: "REGRESSED" | "TRANSFER_CHECK",
) => {
  const stat = {
    target: type === "SUBSTITUTION_CONFUSION" ? [targets[0]] : targets,
    opportunities: 40,
    errorOccurrences: 10,
    incorrectAttempts: 10,
    correctedErrors: 0,
    remainingErrors: 10,
  };
  const recommendation: PracticeRecommendation = {
    id: JSON.stringify([type, ...targets]),
    type,
    targets,
    priority,
    evidenceStrength: "medium",
    reasonCode: "repeated-errors",
    evidence: {
      window: "recent",
      lifetime: stat,
      recent: stat,
      substitution:
        type === "SUBSTITUTION_CONFUSION"
          ? { lifetimeCount: 8, recentCount: 8 }
          : null,
      sessions: 3,
      attempts: 200,
      accuracy: [95, 95, 95],
      speed: [40, 40, 40],
      distinctErrorGraphemes: 2,
    },
  };
  return { recommendation, state };
};
const keys = (a: ReturnType<typeof selectVisible>) =>
  a.visible.map((x) => visibleWeaknessId(x.recommendation));
const r = candidate("WEAK_GRAPHEME", ["r"], 900),
  dir = candidate("SUBSTITUTION_CONFUSION", ["r", "t"], 910),
  pair = candidate("WEAK_BIGRAM", ["t", "r"], 1000),
  p = candidate("WEAK_GRAPHEME", ["p"], 700);
describe("explicit ranked-candidate visibility", () => {
  it("overlapping r cluster leaves unrelated p visible and retains supporting evidence", () => {
    const result = selectVisible([r, dir, pair, p]);
    expect(keys(result)).toEqual([
      '["substitution","r","t"]',
      '["grapheme","p"]',
    ]);
    expect(
      result.audit
        .filter((x) => x.reason === "related-evidence")
        .map((x) => x.weaknessId)
        .sort(),
    ).toEqual(['["bigram","t","r"]', '["grapheme","r"]']);
    expect(
      result.audit.find((x) => x.weaknessId === '["grapheme","p"]')
        ?.recommendation.priority,
    ).toBe(700);
  });
  it("strong repeated direction represents its generic key", () =>
    expect(keys(selectVisible([r, dir]))).toEqual([
      '["substitution","r","t"]',
    ]));
  it("bigram specificity survives without diagnosed weak constituent keys", () =>
    expect(keys(selectVisible([pair]))).toEqual(['["bigram","t","r"]']));
  it("qualified unrelated regression gets a reserved slot with unchanged low raw score", () => {
    const q = candidate("WEAK_GRAPHEME", ["q"], 10, "REGRESSED"),
      result = selectVisible([r, dir, pair, p, q]);
    expect(keys(result)[0]).toBe('["grapheme","q"]');
    expect(result.audit[0].recommendation.priority).toBe(1000);
    expect(
      result.audit.find((x) => x.weaknessId === '["grapheme","q"]')?.reason,
    ).toBe("regression-visibility");
    expect(result.visible.length).toBeLessThanOrEqual(3);
  });
  it("new recent severe key is not hidden by a stale token/pair cluster", () => {
    const old = candidate("DIFFICULT_WORD", ["carry"], 2000),
      v = candidate("WEAK_GRAPHEME", ["v"], 500);
    expect(keys(selectVisible([old, pair, r, dir, v]))).toContain(
      '["grapheme","v"]',
    );
  });
  it("three truly independent keys remain visible", () =>
    expect(
      selectVisible([r, p, candidate("WEAK_GRAPHEME", ["q"], 600)]).visible,
    ).toHaveLength(3));
  it("four independent keys select three deterministically by original ranking", () => {
    const rows = [
      r,
      p,
      candidate("WEAK_GRAPHEME", ["q"], 600),
      candidate("WEAK_GRAPHEME", ["z"], 500),
    ];
    expect(keys(selectVisible(rows))).toEqual([
      '["grapheme","r"]',
      '["grapheme","p"]',
      '["grapheme","q"]',
    ]);
    expect(selectVisible(rows)).toEqual(selectVisible([...rows].reverse()));
  });
  it("broad accuracy remains sole override even with regression and a strong direction", () => {
    const broad = candidate("ACCURACY_FOCUS", [], 2000);
    expect(
      selectVisible([
        broad,
        dir,
        candidate("WEAK_GRAPHEME", ["p"], 500, "REGRESSED"),
      ]).visible,
    ).toEqual([broad]);
  });
  it("provisional mastery suppresses its exact identity while preserving profile evidence", () => {
    const profile = profileOf(
        evidence("r".repeat(24), [0, 1, 2, 3], "seed", "t"),
      ),
      mastery = {
        ...emptyMastery(1),
        records: [record(undefined, [], [], { state: "PROVISIONAL_MASTERY" })],
      },
      before = JSON.stringify({ profile, mastery });
    const result = selectionWithMastery(profile, mastery);
    expect(
      result.visible.some((x) => x.recommendation.type === "WEAK_GRAPHEME"),
    ).toBe(false);
    expect(
      result.visible.some(
        (x) => x.recommendation.type === "SUBSTITUTION_CONFUSION",
      ),
    ).toBe(true);
    expect(JSON.stringify({ profile, mastery })).toBe(before);
  });
  it("transfer-check focus represents related practice without duplicate exact-identity actions", () => {
    const check = { ...r, state: "TRANSFER_CHECK" as const };
    const result = selectVisible([
      check,
      dir,
      {
        ...check,
        recommendation: { ...check.recommendation, id: "other-instance" },
      },
    ]);
    expect(keys(result)).toEqual(['["grapheme","r"]']);
    expect(result.audit.some((x) => x.reason === "transfer-visibility")).toBe(
      true,
    );
  });
  it("Unicode relationships use prepared NFC graphemes and exact pairs", () => {
    const rec = candidate("DIFFICULT_WORD", ["e\u0301lan"], 500).recommendation;
    const signature = overlapSignature(rec, new Set(["é"]));
    expect(signature.graphemes).toContain("é");
    expect(signature.anchors).toEqual(["é"]);
    expect(signature.bigrams).toContain('["é","l"]');
  });
  it("reverse substitution has a distinct expected training intent", () => {
    const result = selectVisible([
      dir,
      candidate("SUBSTITUTION_CONFUSION", ["t", "r"], 900),
    ]);
    expect(result.visible).toHaveLength(2);
    expect(result.audit[0].signature.graphemes).toEqual(["r", "t"]);
    expect(result.audit.map((x) => x.signature.anchors)).toEqual([
      ["r"],
      ["t"],
    ]);
  });
  it("selection is pure, capped, and audit retains all original evidence and raw scores", () => {
    const rows = [r, dir, pair, p],
      before = JSON.stringify(rows),
      a = selectVisible(rows);
    expect(JSON.stringify(rows)).toBe(before);
    expect(a).toEqual(selectVisible(rows));
    expect(a.visible.length).toBeLessThanOrEqual(3);
    expect(a.audit).toHaveLength(4);
    expect(
      a.audit.every((x) =>
        rows.some((c) => c.recommendation === x.recommendation),
      ),
    ).toBe(true);
  });
  it("unrelated tokens are not merged merely because English words share letters", () =>
    expect(
      selectVisible([
        candidate("DIFFICULT_WORD", ["river"], 900),
        candidate("DIFFICULT_WORD", ["silver"], 800),
      ]).visible,
    ).toHaveLength(2));
  it("a word and regressed letter with different error histories keep distinct actions", () => {
    const key = { ...r, state: "REGRESSED" as const, errorSessions: [5, 6, 7] },
      word = {
        ...candidate("DIFFICULT_WORD", ["through"], 600),
        errorSessions: [5],
      };
    expect(selectVisible([key, word]).visible).toHaveLength(2);
  });
  it("related evidence survives in product explanation metadata", () => {
    const profile = profileOf(
        evidence("r".repeat(24), [0, 1, 2, 3], "seed", "t"),
      ),
      result = selectionWithMastery(profile, emptyMastery());
    expect(
      result.visible[0].supportingEvidence?.some(
        (r) => r.type === "WEAK_GRAPHEME",
      ),
    ).toBe(true);
    expect(
      result.audit.some((x) => x.representedBy === '["substitution","r","t"]'),
    ).toBe(true);
  });
});
it("bounded profile-limit candidates avoid all-pairs overlap matching", () => {
  const rows = [
    ...Array.from({ length: 96 }, (_, i) =>
      candidate("WEAK_GRAPHEME", [String.fromCodePoint(0x400 + i)], 1400 - i),
    ),
    ...Array.from({ length: 64 }, (_, i) =>
      candidate(
        "SUBSTITUTION_CONFUSION",
        ["r", String.fromCodePoint(0x500 + i)],
        1200 - i,
      ),
    ),
    ...Array.from({ length: 96 }, (_, i) =>
      candidate(
        "WEAK_BIGRAM",
        [String.fromCodePoint(0x600 + i), "r"],
        1000 - i,
      ),
    ),
    ...Array.from({ length: 48 }, (_, i) =>
      candidate("DIFFICULT_WORD", [`word${i}`], 800 - i),
    ),
  ];
  rows.push(
    candidate("WEAK_GRAPHEME", ["r"], 100),
    candidate("WEAK_GRAPHEME", ["q"], 90, "REGRESSED"),
  );
  const start = performance.now();
  for (let i = 0; i < 20; i++) {
    const a = selectVisible(rows);
    expect(a.visible.length).toBeLessThanOrEqual(3);
    expect(keys(a)).toContain('["grapheme","q"]');
  }
  const elapsed = performance.now() - start;
  console.info("Slice10 selection stress", {
    candidates: rows.length,
    runs: 20,
    milliseconds: elapsed,
  });
  expect(elapsed).toBeLessThan(10000);
  expect(selectVisible(rows)).toEqual(selectVisible([...rows].reverse()));
}, 15000);
