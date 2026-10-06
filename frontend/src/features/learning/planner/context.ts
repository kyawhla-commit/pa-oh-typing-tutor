import type { RecentOutcome } from "./outcomes/types";
import { freezeProfileValue } from "../aggregation";
import { selectionWithMastery } from "../transfer/recommendations";
import { recommendationIdentity, weaknessKey } from "../transfer/classify";
import { learningActionWithVariants } from "../progression/actions";
import { canGenerateExercise } from "../exercises/capability";
import { practiceSpec } from "../recommendations";
import { COMPOSITION } from "../progression/constants";
import { nextVariant, variantKey } from "../progression/variants";
import type { LearnerTypingProfile } from "../types";
import type { MasteryProfile } from "../transfer/types";
import type { PlannerContext, PlannerHistory, PlannerOption } from "./types";
import { normalOption } from "./constraints";
/** Adapter consumes existing visibility, stage and exact capability outputs. It
 * drops witnesses' passages and never reserves an exercise or updates evidence. */
export function createPlannerContext(
  learnerScope: string,
  profile: LearnerTypingProfile,
  mastery: MasteryProfile,
  history: PlannerHistory,
  recentOutcomes: readonly RecentOutcome[] = [],
): PlannerContext {
  const options: PlannerOption[] = [],
    selected = selectionWithMastery(profile, mastery).visible;
  let unavailableActions = 0;
  selected.forEach(({ recommendation }, policyOrder) => {
    const weakness = recommendationIdentity(recommendation);
    const record = weakness
      ? (mastery.records.find(
          (r) => weaknessKey(r.identity) === weaknessKey(weakness),
        ) ?? null)
      : null;
    const action = learningActionWithVariants(
      record,
      recommendation,
      mastery,
      learnerScope,
    );
    if (action.type === "none") return;
    if (action.type === "normal-practice") {
      if (action.unavailable) unavailableActions++;
      options.push({
        ...normalOption(policyOrder),
        id: recommendation.id,
        recommendationId: recommendation.id,
      });
      return;
    }
    const spec = practiceSpec(recommendation),
      purpose =
        action.type === "controlled-assessment"
          ? ("controlled-transfer-assessment" as const)
          : ("training" as const);
    const ordinal = nextVariant(
      mastery.variants ?? [],
      variantKey(spec, purpose),
    );
    const result = canGenerateExercise(spec, {
      learnerKey: learnerScope,
      composition: { level: action.progressionLevel, ordinal, purpose },
    });
    if (!result.ok) {
      unavailableActions++;
      return;
    }
    options.push({
      id: recommendation.id,
      recommendationId: recommendation.id,
      policyOrder,
      actionType: action.type,
      weakness,
      masteryState: record?.state ?? null,
      executable: true,
      target: {
        type: "adaptive",
        sourceId: result.exercise.source.id,
        sourceVersion: result.exercise.source.version,
        level: action.progressionLevel,
        ordinal,
        purpose,
        graphemes: result.exercise.coverage.totalGraphemes,
      },
    });
  });
  if (!options.some((o) => o.actionType === "normal-practice" && !o.weakness))
    options.push(normalOption());
  return freezeProfileValue({
    learnerScope,
    evidenceVersion: {
      profile: profile.version,
      mastery: mastery.version,
      sessions: profile.sessionCount,
      masteryOrder: mastery.order,
      generator: COMPOSITION.generatorVersion,
      bank: COMPOSITION.contentVersion,
    },
    options,
    visibleNeedKeys: selected.flatMap(({ recommendation }) => {
      const identity = recommendationIdentity(recommendation);
      return identity ? [weaknessKey(identity)] : [];
    }),
    ...(recentOutcomes.length ? { recentOutcomes } : {}),
    recentActions: history.recent.map((r) => r.activityKey),
    unavailableActions,
  });
}
