import type { WeaknessIdentity } from "../transfer/types";
import type {
  Scenario,
  ScenarioStep,
  OrdinaryStep,
  AdaptiveStep,
  ErrorModel,
} from "./types";
export const TARGETS: readonly WeaknessIdentity[] = [
  { kind: "grapheme", items: ["r"] },
  { kind: "substitution", items: ["r", "t"] },
  { kind: "bigram", items: ["t", "h"] },
  { kind: "token", items: ["through"] },
];
export const TEXT = {
  accurate:
    "we look up and see a blue sky. a cool wind moves by. books lie beside a pen. keep a calm pace.",
  r: "red birds rest near the river. the river runs near home. read each line before you begin. write one clear line then take a rest. rare red birds carry ripe fruit.",
  v: "we visit a vivid valley. vivid views give every visitor a lovely view. seven visitors leave vivid views beside five vines. vivid views give every visitor a lovely view.",
  th: "thin things that they think. this thin thread is there. they think that this is the third thing. thin things that they think. this thin thread is there. time to take tiny steps. time to take tiny steps. time to take tiny steps. time to take tiny steps. high hills have happy homes. high hills have happy homes. high hills have happy homes.",
  token:
    "go through the gate. read through the notes. look through the window. walk through the garden. think through the next step.",
  broad:
    "we look up and see a blue sky. books lie beside a pen. a cool wind moves by. we can walk a long way. take time to stay steady. we check each small choice.",
};
export const ordinary = (
  label: string,
  text = TEXT.accurate,
  errors: readonly ErrorModel[] = [],
  options: Partial<OrdinaryStep> = {},
): OrdinaryStep => ({
  kind: "ordinary",
  label,
  text,
  errors,
  wpm: 45,
  ...options,
});
export const drill = (
  id: WeaknessIdentity,
  outcome: AdaptiveStep["outcome"] = "success",
  purpose: AdaptiveStep["purpose"] = "training",
): AdaptiveStep => ({
  kind: "adaptive",
  label: `${purpose} ${outcome}`,
  identity: id,
  outcome,
  purpose,
  wpm: 45,
});
export const targetText = (id: WeaknessIdentity) =>
  id.kind === "token"
    ? TEXT.token
    : id.kind === "bigram"
      ? TEXT.th
      : id.items[0] === "v"
        ? TEXT.v
        : TEXT.r;
export const seed = (id: WeaknessIdentity): OrdinaryStep =>
  ordinary(`establish ${id.kind}`, targetText(id), [
    {
      identity: id,
      occurrences: id.kind === "token" ? 3 : id.kind === "bigram" ? 6 : 7,
    },
  ]);
export const training = (id: WeaknessIdentity) =>
  Array.from({ length: 3 }, () => drill(id));
export const transfer = (id: WeaknessIdentity) =>
  Array.from({ length: id.kind === "token" ? 2 : 3 }, (_, i) =>
    ordinary(`ordinary transfer ${i + 1}`, targetText(id)),
  );
export const waiting = () =>
  Array.from({ length: 5 }, (_, i) => ordinary(`sparse ordinary ${i + 1}`));
export const regression = (id: WeaknessIdentity) =>
  Array.from({ length: 2 }, (_, i) =>
    ordinary(`meaningful ordinary regression ${i + 1}`, targetText(id), [
      {
        identity: id,
        occurrences: id.kind === "token" ? 3 : id.kind === "bigram" ? 6 : 7,
      },
    ]),
  );
const make = (
  id: string,
  group: Scenario["group"],
  description: string,
  steps: readonly ScenarioStep[],
  target?: WeaknessIdentity,
): Scenario => ({ id, version: 1, group, description, steps, target });
const r = TARGETS[0],
  sub = TARGETS[1],
  bg = TARGETS[2],
  tok = TARGETS[3],
  v: WeaknessIdentity = { kind: "grapheme", items: ["v"] };
const broadErrors: ErrorModel[] = ["e", "o", "a", "i", "s", "l"].map(
  (item) => ({ identity: { kind: "grapheme", items: [item] }, occurrences: 3 }),
);
const broad = () =>
  ordinary("distributed low accuracy", TEXT.broad, broadErrors);
export const PERSONAS: readonly Scenario[] = [
  make(
    "new-accurate",
    "persona",
    "Low pace, high accuracy, no localized weakness",
    Array.from({ length: 5 }, (_, i) =>
      ordinary(`accurate ${i}`, TEXT.accurate, [], { wpm: 20 }),
    ),
  ),
  make(
    "clear-grapheme",
    "persona",
    "Repeated meaningful r errors, otherwise accurate",
    [seed(r), ...training(r)],
    r,
  ),
  make(
    "directional-confusion",
    "persona",
    "Expected r typed t; no reverse confusion",
    [seed(sub), ...training(sub), ...transfer(sub)],
    sub,
  ),
  make(
    "weak-bigram",
    "persona",
    "th errors diluted across otherwise accurate t/h opportunities",
    [seed(bg), ...training(bg)],
    bg,
  ),
  make(
    "rare-token",
    "persona",
    "through training with sparse ordinary exposure and repeated controlled checks",
    [
      seed(tok),
      ...training(tok),
      ...waiting(),
      ...Array.from({ length: 3 }, () =>
        drill(tok, "success", "controlled-transfer-assessment"),
      ),
    ],
    tok,
  ),
  make("broad-accuracy", "persona", "Repeated errors across six graphemes", [
    broad(),
    broad(),
    broad(),
  ]),
  make(
    "improving-natural",
    "persona",
    "Training and ordinary performance improve",
    [seed(r), ...training(r), ...transfer(r)],
    r,
  ),
  make(
    "regression",
    "persona",
    "One minor error tolerated; repeated ordinary failure reactivates",
    [
      seed(r),
      ...training(r),
      ...transfer(r),
      ordinary("isolated minor mistake", TEXT.r, [
        { identity: r, occurrences: 1 },
      ]),
      ...regression(r),
    ],
    r,
  ),
  make(
    "drill-only",
    "persona",
    "Many perfect drills without any ordinary transfer",
    [
      seed(r),
      ...training(r),
      ...Array.from({ length: 7 }, () => ({ ...drill(r), restart: true })),
    ],
    r,
  ),
  make(
    "sparse-exposure",
    "persona",
    "Ordinary waiting has no meaningful r exposure",
    [seed(r), ...training(r), ...waiting()],
    r,
  ),
  make(
    "noisy-beginner",
    "persona",
    "Small inconsistent samples remain undiagnosed",
    [
      ordinary("tiny sample", "red sky", [{ identity: r, occurrences: 1 }]),
      ordinary("different tiny sample", "vivid view", [
        { identity: v, occurrences: 1 },
      ]),
    ],
    r,
  ),
  make(
    "one-bad-session",
    "persona",
    "Strong learner with one poor ordinary session",
    [seed(r), ...training(r), ...transfer(r), regression(r)[0]],
    r,
  ),
];
const competition = (id: string, models: readonly ErrorModel[], text: string) =>
  make(
    id,
    "competition",
    "Competing categories; production scores and gates determine rank",
    [ordinary("competition evidence", text, models)],
  );
export const COMPETITION: readonly Scenario[] = [
  competition(
    "two-graphemes",
    [
      { identity: r, occurrences: 7 },
      { identity: v, occurrences: 7 },
    ],
    TEXT.r + " " + TEXT.v,
  ),
  competition(
    "grapheme-substitution",
    [{ identity: sub, occurrences: 7 }],
    TEXT.r,
  ),
  competition(
    "grapheme-bigram",
    [
      { identity: r, occurrences: 7 },
      { identity: bg, occurrences: 6 },
    ],
    TEXT.r + " " + TEXT.th,
  ),
  competition(
    "substitution-bigram",
    [
      { identity: sub, occurrences: 7 },
      { identity: bg, occurrences: 6 },
    ],
    TEXT.r + " " + TEXT.th,
  ),
  competition(
    "token-grapheme",
    [
      { identity: tok, occurrences: 3 },
      { identity: r, occurrences: 7 },
    ],
    TEXT.token + " " + TEXT.r,
  ),
  make(
    "broad-localized",
    "competition",
    "Broad accuracy override remains sole recommendation",
    [
      broad(),
      broad(),
      broad(),
      ordinary("broad plus r", TEXT.broad + " " + TEXT.r, [
        ...broadErrors,
        { identity: r, occurrences: 7 },
      ]),
    ],
  ),
  make(
    "mastered-active",
    "competition",
    "Mastered r suppressed while active v surfaces",
    [seed(r), ...training(r), ...transfer(r), seed(v)],
    v,
  ),
  make(
    "regressed-new",
    "competition",
    "Regressed r and newly weak v compete",
    [seed(r), ...training(r), ...transfer(r), ...regression(r), seed(v)],
    v,
  ),
  competition(
    "three-valid",
    [
      { identity: r, occurrences: 7 },
      { identity: v, occurrences: 7 },
      { identity: tok, occurrences: 3 },
    ],
    TEXT.r + " " + TEXT.v + " " + TEXT.token,
  ),
  competition(
    "four-plus",
    [
      { identity: sub, occurrences: 7 },
      { identity: v, occurrences: 7 },
      { identity: bg, occurrences: 6 },
      { identity: tok, occurrences: 3 },
    ],
    TEXT.r + " " + TEXT.v + " " + TEXT.th + " " + TEXT.token,
  ),
];
export const PROGRESSION: readonly Scenario[] = TARGETS.flatMap((id) => [
  make(
    `${id.kind}-consistent-success`,
    "progression",
    "Successful drills progress through all levels",
    [seed(id), ...training(id)],
    id,
  ),
  make(
    `${id.kind}-consistent-failure`,
    "progression",
    "Repeated severe training errors cannot progress",
    [seed(id), ...Array.from({ length: 4 }, () => drill(id, "severe"))],
    id,
  ),
  make(
    `${id.kind}-mild-recovery`,
    "progression",
    "Success, corrected mild failure, then recovery",
    [seed(id), drill(id), drill(id, "mild"), ...training(id)],
    id,
  ),
  make(
    `${id.kind}-severe-rollback`,
    "progression",
    "Success followed by severe failure",
    [seed(id), drill(id), drill(id, "severe")],
    id,
  ),
  make(
    `${id.kind}-poor-transfer`,
    "progression",
    "Strong drills fail to transfer",
    [seed(id), ...training(id), ...regression(id)],
    id,
  ),
  make(
    `${id.kind}-natural-mastery`,
    "progression",
    "Training followed by strong natural transfer",
    [seed(id), ...training(id), ...transfer(id)],
    id,
  ),
  make(
    `${id.kind}-retrain`,
    "progression",
    "Natural mastery, regression and retraining",
    [
      seed(id),
      ...training(id),
      ...transfer(id),
      ...regression(id),
      ...training(id),
    ],
    id,
  ),
]);
export const ASSESSMENTS: readonly Scenario[] = TARGETS.flatMap((id) => [
  make(
    `${id.kind}-controlled-mastery`,
    "assessment",
    "Waiting, repeated check success, then natural regression",
    [
      seed(id),
      ...training(id),
      ...waiting(),
      ...Array.from(
        { length: id.kind === "token" ? 3 : id.kind === "bigram" ? 5 : 4 },
        () => drill(id, "success", "controlled-transfer-assessment"),
      ),
      ...regression(id),
    ],
    id,
  ),
  make(
    `${id.kind}-check-failure`,
    "assessment",
    "Corrected target error denies mastery",
    [
      seed(id),
      ...training(id),
      ...waiting(),
      drill(id, "mild", "controlled-transfer-assessment"),
    ],
    id,
  ),
  make(
    `${id.kind}-check-severe`,
    "assessment",
    "Severe check errors return concentrated practice",
    [
      seed(id),
      ...training(id),
      ...waiting(),
      drill(id, "severe", "controlled-transfer-assessment"),
    ],
    id,
  ),
  make(
    `${id.kind}-natural-priority`,
    "assessment",
    "Natural mastery skips controlled checks",
    [seed(id), ...training(id), ...transfer(id), ...waiting()],
    id,
  ),
]);
export const STARVATION: readonly Scenario[] = [
  make(
    "large-lifetime-new-severe",
    "starvation",
    "Large r history followed by a newly severe v target",
    [
      ...Array.from({ length: 12 }, () => seed(r)),
      ordinary("new severe v", TEXT.v, [{ identity: v, occurrences: 14 }]),
      ...Array.from({ length: 8 }, () =>
        ordinary("old target absent", TEXT.v, [
          { identity: v, occurrences: 14 },
        ]),
      ),
    ],
    v,
  ),
  make(
    "large-lifetime-mastered",
    "starvation",
    "Mastery suppresses a large old lifetime weakness",
    [
      ...Array.from({ length: 12 }, () => seed(r)),
      ...training(r),
      ...transfer(r),
      ...transfer(r),
      seed(v),
      ...Array.from({ length: 4 }, () => seed(v)),
    ],
    v,
  ),
  make(
    "large-lifetime-other-category",
    "starvation",
    "Large r history competes with token and regression",
    [
      ...Array.from({ length: 12 }, () => seed(r)),
      ...training(r),
      ...transfer(r),
      ...transfer(r),
      seed(tok),
      ...regression(r),
    ],
    tok,
  ),
];
export const BOUNDARIES: readonly Scenario[] = [
  make(
    "modes-save-abort",
    "boundary",
    "Fixed, timed, words, manual Save, duplicate ID and abort boundaries",
    [
      ordinary("fixed"),
      ordinary("timed", TEXT.accurate, [], { mode: "timed" }),
      ordinary("words", TEXT.accurate, [], {
        mode: "word-count",
        manualSave: true,
      }),
      ordinary("duplicate prior ID", TEXT.accurate, [], { repeatId: true }),
      ordinary("abort", TEXT.accurate, [], { abort: true }),
    ],
  ),
  make(
    "custom-privacy",
    "boundary",
    "Private custom token/bigram content is excluded",
    [
      ordinary(
        "private custom",
        "PRIVATE_CUSTOM_SENTINEL red river",
        [{ identity: r, occurrences: 1 }],
        { source: "custom" },
      ),
    ],
  ),
  make(
    "unicode-grapheme",
    "boundary",
    "NFC accented target identity and honest fallback",
    [
      ordinary(
        "accented weakness",
        "école été élève café élan déjà été école café élan déjà été école café élan déjà été école café élan déjà été",
        [{ identity: { kind: "grapheme", items: ["é"] }, occurrences: 7 }],
      ),
      drill({ kind: "grapheme", items: ["é"] }),
    ],
    { kind: "grapheme", items: ["é"] },
  ),
  make(
    "myanmar-token",
    "boundary",
    "Myanmar token fallback has no linguistic-content claim",
    [
      ordinary("Myanmar weakness", Array(6).fill("ပအိုဝ်ႏ").join(" "), [
        { identity: { kind: "token", items: ["ပအိုဝ်ႏ"] }, occurrences: 3 },
      ]),
      drill({ kind: "token", items: ["ပအိုဝ်ႏ"] }),
    ],
    { kind: "token", items: ["ပအိုဝ်ႏ"] },
  ),
];
export const ROBUSTNESS: readonly Scenario[] = [
  make(
    "large-overlap-profile",
    "overlap",
    "Many actual engine-derived token/pair/key candidates with high overall accuracy",
    [
      ordinary(
        "many localized word errors",
        `${Array(5).fill("river bright garden quiet yellow window through bring cloud fresh green light friend brown road stone train soft clear small write warm north south dream story grass short shine stand speed chair space check smile boat field room world paper table plant sheep peach shore coast creek").join(" ")} ${TEXT.accurate.repeat(15)}`,
        "river bright garden quiet yellow window through bring cloud fresh green light friend brown road stone train soft clear small write warm north south dream story grass short shine stand speed chair space check smile boat field room world paper table plant sheep peach shore coast creek"
          .split(" ")
          .map((item) => ({
            identity: { kind: "token" as const, items: [item] },
            occurrences: 3,
          })),
      ),
    ],
  ),
  make(
    "repaired-e-to-i",
    "executability",
    "Directional e→i training and controlled checks execute with curated material",
    [
      ordinary("establish e→i", Array(12).fill("we see a bird").join(". "), [
        {
          identity: { kind: "substitution", items: ["e", "i"] },
          occurrences: 12,
        },
      ]),
      ...training({ kind: "substitution", items: ["e", "i"] }),
      ...Array.from({ length: 5 }, (_, i) =>
        ordinary(
          `sparse e→i ${i}`,
          "soft clouds pass. warm sun glows. dogs run across soft grass. small boats bob on choppy surf.",
        ),
      ),
      ...Array.from({ length: 4 }, () =>
        drill(
          { kind: "substitution", items: ["e", "i"] },
          "success",
          "controlled-transfer-assessment",
        ),
      ),
    ],
    { kind: "substitution", items: ["e", "i"] },
  ),
  make(
    "repaired-controlled-a",
    "executability",
    "Controlled a retains target-free warm-up and repetition guarantees",
    [
      ordinary(
        "establish a",
        Array(12).fill("a calm path along a lake").join(". "),
        [{ identity: { kind: "grapheme", items: ["a"] }, occurrences: 30 }],
      ),
      ...training({ kind: "grapheme", items: ["a"] }),
      ...Array.from({ length: 5 }, (_, i) =>
        ordinary(
          `sparse a ${i}`,
          "birds sing softly. moonlight fills this room. cool winds ripple over ponds.",
        ),
      ),
      ...Array.from({ length: 4 }, () =>
        drill(
          { kind: "grapheme", items: ["a"] },
          "success",
          "controlled-transfer-assessment",
        ),
      ),
    ],
    { kind: "grapheme", items: ["a"] },
  ),
  make(
    "unsupported-myanmar-check",
    "executability",
    "Fallback training remains valid; unavailable controlled action becomes ordinary Practice",
    [
      ordinary("Myanmar seed", Array(6).fill("ပအိုဝ်ႏ").join(" "), [
        { identity: { kind: "token", items: ["ပအိုဝ်ႏ"] }, occurrences: 3 },
      ]),
      ...training({ kind: "token", items: ["ပအိုဝ်ႏ"] }),
      ...waiting(),
      drill(
        { kind: "token", items: ["ပအိုဝ်ႏ"] },
        "success",
        "controlled-transfer-assessment",
      ),
    ],
    { kind: "token", items: ["ပအိုဝ်ႏ"] },
  ),
  ...STARVATION.map((s) => ({
    ...s,
    id: `visible-${s.id}`,
    group: "overlap" as const,
    description: `Slice 10 visibility acceptance: ${s.description}`,
  })),
];
export const SCENARIOS: readonly Scenario[] = [
  ...PERSONAS,
  ...COMPETITION,
  ...PROGRESSION,
  ...ASSESSMENTS,
  ...STARVATION,
  ...BOUNDARIES,
  ...ROBUSTNESS,
];
