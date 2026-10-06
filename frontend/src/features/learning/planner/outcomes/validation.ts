import type { ActivityReference } from "./types";
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw Error();
  return v as Record<string, unknown>;
};
const opaque = (v: unknown, prefix: string) => {
  if (typeof v !== "string" || !new RegExp(`^${prefix}-[a-f0-9]{16}$`).test(v))
    throw Error();
  return v;
};
export function readActivityReference(
  value: unknown,
  scope: string,
): ActivityReference {
  const o = object(value),
    activityType = o.activityType;
  if (
    o.learnerScope !== scope ||
    o.planVersion !== 1 ||
    ![
      "targeted-practice",
      "contextual-practice",
      "controlled-assessment",
      "normal-practice",
    ].includes(activityType as string) ||
    ![
      "regression-recovery",
      "transfer-check",
      "targeted-improvement",
      "contextual-practice",
      "general-practice",
    ].includes(o.purpose as string) ||
    !["primary", "secondary"].includes(o.slot as string) ||
    (o.weaknessCategory !== null &&
      ![
        "grapheme",
        "substitution",
        "bigram",
        "token",
        "accuracy",
        "speed",
      ].includes(o.weaknessCategory as string))
  )
    throw Error();
  const ref = {
    planId: opaque(o.planId, "session-plan"),
    planVersion: 1 as const,
    activityKey: opaque(o.activityKey, "activity"),
    learnerScope: scope,
    activityType: activityType as ActivityReference["activityType"],
    weaknessId: o.weaknessId === null ? null : opaque(o.weaknessId, "weakness"),
    weaknessCategory:
      o.weaknessCategory as ActivityReference["weaknessCategory"],
    purpose: o.purpose as ActivityReference["purpose"],
    slot: o.slot as ActivityReference["slot"],
    sourceReference:
      o.sourceReference === null ? null : opaque(o.sourceReference, "source"),
  };
  if (
    (ref.weaknessId === null) !== (ref.weaknessCategory === null) ||
    (ref.activityType === "normal-practice"
      ? ref.purpose !== "general-practice" ||
        ref.sourceReference !== null ||
        ref.weaknessId !== null
      : ref.sourceReference === null || ref.weaknessId === null) ||
    (ref.slot === "secondary" && ref.activityType !== "normal-practice") ||
    (ref.activityType === "controlled-assessment" &&
      ref.purpose !== "transfer-check") ||
    (ref.activityType === "contextual-practice" &&
      ref.purpose !== "contextual-practice") ||
    (ref.activityType === "targeted-practice" &&
      !["targeted-improvement", "regression-recovery"].includes(ref.purpose))
  )
    throw Error();
  return ref;
}
