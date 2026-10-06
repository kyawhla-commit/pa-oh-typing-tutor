import { recommendationIdentity, weaknessIdentity } from "../transfer/classify";
import type {
  MasteryRecord,
  MasteryProfile,
  WeaknessIdentity,
} from "../transfer/types";
import type { PracticeRecommendation } from "../types";
import { assessmentEligible } from "./assessment";
import type { LearningAction, ProgressionLevel } from "./types";
import type { GenerationOptions } from "../exercises/capability";
import { canGenerateExercise } from "../exercises/capability";
import { practiceSpec } from "../recommendations";
import { LEARNING } from "../constants";
import { nextVariant, variantKey } from "./variants";
/** Stage intent is separate from availability. Hidden audit rows can describe
 * the learning stage without generating exercises that are not being offered. */
export function learningIntent(
  record: MasteryRecord | null,
  recommendation?: PracticeRecommendation,
): LearningAction {
  const weakness =
    record?.identity ??
    (recommendation ? recommendationIdentity(recommendation) : null);
  if (!weakness) return { type: "normal-practice" };
  try {
    weaknessIdentity(weakness.kind, weakness.items);
  } catch {
    return { type: "normal-practice" };
  }
  if (!record)
    return { type: "targeted-practice", weakness, progressionLevel: 0 };
  if (record.state === "PROVISIONAL_MASTERY") return { type: "none" };
  if (record.state === "INSUFFICIENT_EVIDENCE")
    return { type: "normal-practice", weakness };
  if (record.state === "TRANSFER_CHECK")
    return assessmentEligible(record)
      ? { type: "controlled-assessment", weakness, progressionLevel: 2 }
      : { type: "normal-practice", weakness };
  const level =
    record.state === "REGRESSED"
      ? 0
      : (record.practiceLevel ?? (record.state === "IMPROVING" ? 1 : 0));
  return level === 0
    ? { type: "targeted-practice", weakness, progressionLevel: 0 }
    : { type: "contextual-practice", weakness, progressionLevel: level };
}
/** Only an exact verified witness turns an intent into an offered focused action. */
export function learningAction(
  record: MasteryRecord | null,
  recommendation?: PracticeRecommendation,
  context?: Omit<GenerationOptions, "composition"> & { ordinal?: number },
): LearningAction {
  const action = learningIntent(record, recommendation);
  if (!("progressionLevel" in action)) return action;
  const weakness = action.weakness;
  const spec = recommendation
    ? practiceSpec(recommendation)
    : {
        recommendationId: JSON.stringify([weakness.kind, ...weakness.items]),
        focusType: weakness.kind,
        focusItems: weakness.items,
        desiredLength: {
          unit: "graphemes" as const,
          value: LEARNING.exerciseGraphemes,
        },
        difficulty:
          weakness.kind === "speed"
            ? ("gradual-speed" as const)
            : ("steady" as const),
        mode: "fixed-text" as const,
        completionPolicy: "require-correct-target" as const,
      };
  const capability = canGenerateExercise(spec, {
    learnerKey: context?.learnerKey ?? "capability",
    bank: context?.bank,
    generatorVersion: context?.generatorVersion,
    composition: {
      level: action.progressionLevel,
      ordinal: context?.ordinal ?? 0,
      purpose:
        action.type === "controlled-assessment"
          ? "controlled-transfer-assessment"
          : "training",
    },
  });
  return capability.ok
    ? action
    : { type: "normal-practice", weakness, unavailable: "content-unavailable" };
}
export function nextCompositionLevel(
  level: ProgressionLevel,
  success: boolean,
  isSevere: boolean,
): ProgressionLevel {
  return (
    isSevere ? 0 : success ? Math.min(2, level + 1) : Math.max(0, level - 1)
  ) as ProgressionLevel;
}
/** Same scope/cursor contract is used when displaying and starting an action. */
export function learningActionWithVariants(
  record: MasteryRecord | null,
  recommendation: PracticeRecommendation,
  mastery: MasteryProfile,
  learnerKey: string,
): LearningAction {
  const purpose =
    record?.state === "TRANSFER_CHECK" && assessmentEligible(record)
      ? "controlled-transfer-assessment"
      : "training";
  return learningAction(record, recommendation, {
    learnerKey,
    ordinal: nextVariant(
      mastery.variants ?? [],
      variantKey(practiceSpec(recommendation), purpose),
    ),
  });
}
export function actionText(
  action: LearningAction,
  record: MasteryRecord | null,
) {
  if (action.type === "normal-practice" && action.unavailable)
    return {
      button: "Practice normally",
      message:
        "Practice normally so we can watch this skill in regular typing. Suitable focused content is not available yet.",
    };
  if (action.type === "controlled-assessment")
    return {
      button: "Take mastery check",
      message:
        "This skill hasn’t appeared often enough in normal typing. A mastery check is available.",
    };
  if (action.type === "normal-practice")
    return {
      button: "Practice normally",
      message:
        record?.state === "TRANSFER_CHECK"
          ? "Your drills are strong. Practice normally so we can check whether it transfers."
          : "Complete regular typing sessions to gather evidence.",
    };
  if (action.type === "contextual-practice")
    return {
      button: "Practice with more context",
      message:
        record?.assessmentFailure === "mild"
          ? "This check showed the skill needs more practice. Try it in context."
          : action.progressionLevel === 2
            ? "This practice uses the skill in broader mixed typing."
            : "This practice uses the skill in more varied contexts.",
    };
  if (action.type === "none")
    return {
      button: null,
      message:
        record?.masteryVia === "controlled"
          ? "Repeated mastery checks show this skill is holding up. We’ll keep watching regular typing."
          : "Currently strong. We’ll keep watching regular typing.",
    };
  return {
    button:
      record?.state === "REGRESSED" ? "Practice this again" : "Practice this",
    message:
      record?.state === "REGRESSED"
        ? "This difficulty appeared again in regular typing. Targeted practice can help."
        : record?.assessmentFailure === "severe"
          ? "This check showed the skill needs focused practice again."
          : "Build reliable control of this focus.",
  };
}
