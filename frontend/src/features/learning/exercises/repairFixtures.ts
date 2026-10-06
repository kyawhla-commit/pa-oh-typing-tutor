/** Frozen observations reproduced before Slice 10 edits. No policy is copied. */
export const SLICE9_GENERATION_BASELINE = Object.freeze({
  attempted: 1568,
  successful: 1463,
  failed: 105,
  failureRate: 105 / 1568,
  failures: [
    {
      focus: "e-to-i",
      level: 1,
      purpose: "training",
      ordinals: Array.from({ length: 32 }, (_, i) => i),
      cause: "No e/i-free phrases for ordinary mixed length/density.",
    },
    {
      focus: "e-to-i",
      level: 2,
      purpose: "training",
      ordinals: Array.from({ length: 32 }, (_, i) => i),
      cause:
        "No e/i-free phrases; mixed length/density/ordinary exposure conflict.",
    },
    {
      focus: "e-to-i",
      level: 2,
      purpose: "controlled-transfer-assessment",
      ordinals: Array.from({ length: 32 }, (_, i) => i),
      cause: "No e/i-free phrases for low-density controlled context.",
    },
    {
      focus: "a",
      level: 2,
      purpose: "controlled-transfer-assessment",
      ordinals: [13, 14, 15, 18, 19, 23, 24, 29, 30],
      cause: "Repeated article the exceeds 12% identical-token share.",
    },
  ],
});
