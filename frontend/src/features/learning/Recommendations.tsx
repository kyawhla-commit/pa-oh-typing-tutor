import { useMemo, useState } from "react";
import {
  recommendWithMastery,
  progressionText,
  evaluateMastery,
  weaknessKey,
  recommendationIdentity,
} from "./transfer";
import { recommendationText } from "./recommendations";
import { useLearningProfile, useLearningScope } from "./useLearningProfile";
import { type AdaptiveSelection } from "./exercises/selection";
import { getLearningService } from "./service";
import { learningActionWithVariants, actionText } from "./progression/actions";
export function LearningRecommendations({
  onStart,
  onNormal,
}: {
  onStart?: (selection: AdaptiveSelection) => void;
  onNormal?: () => void;
}) {
  const scope = useLearningScope();
  const { profile, mastery, persisted } = useLearningProfile(scope);
  const recommendations = useMemo(
    () => recommendWithMastery(profile, mastery),
    [profile, mastery],
  );
  const [failure, setFailure] = useState<string | null>(null);
  if (!scope) return null;
  return (
    <section
      className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
      aria-label="Recommended next practice"
    >
      <h2 className="text-sm font-semibold text-slate-900">
        Recommended next practice
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Based on {profile.sessionCount} completed sessions on this device.
        {!persisted &&
          " Learning evidence is available for this visit; local storage is unavailable."}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {recommendations.map(
          ({ recommendation, decision, supportingEvidence }) => {
            const text = recommendationText(recommendation);
            const progress = decision ? progressionText(decision) : null;
            const identity = recommendationIdentity(recommendation);
            const record = identity
              ? (mastery.records.find(
                  (r) => weaknessKey(r.identity) === weaknessKey(identity),
                ) ?? null)
              : null;
            const action = learningActionWithVariants(
              record,
              recommendation,
              mastery,
              scope,
            );
            const actionable = actionText(action, record);
            const normal =
              action.type === "normal-practice" &&
              recommendation.type !== "GENERAL_PRACTICE";
            return (
              <article
                key={recommendation.id}
                className="rounded-xl bg-slate-50 p-3"
              >
                <h3 className="text-sm font-medium text-slate-800">
                  {text.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {record ||
                  (action.type === "normal-practice" && action.unavailable)
                    ? actionable.message
                    : text.reason}
                </p>
                {!!supportingEvidence?.length && (
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Related evidence:{" "}
                    {supportingEvidence
                      .slice(0, 2)
                      .map((r) => recommendationText(r).title)
                      .join("; ")}
                    .
                  </p>
                )}
                {progress && (
                  <p className="mt-2 text-xs font-medium text-slate-700">
                    {progress.label}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-slate-500">
                  Evidence strength: {recommendation.evidenceStrength}
                </p>
                {onStart && action.type !== "none" && (
                  <button
                    className="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    onClick={() => {
                      if (normal) {
                        setFailure(null);
                        onNormal?.();
                        return;
                      }
                      const result = getLearningService().startAdaptive(
                        scope,
                        recommendation,
                      );
                      if (result.ok) {
                        setFailure(null);
                        onStart(result.selection);
                      } else
                        setFailure(
                          "This focus needs an exercise outside the current supported limits. Choose another recommendation.",
                        );
                    }}
                    aria-label={`${actionable.button}: ${text.title}`}
                  >
                    {actionable.button}
                  </button>
                )}
              </article>
            );
          },
        )}
      </div>
      {mastery.records
        .filter((r) => r.state === "PROVISIONAL_MASTERY")
        .slice(0, 3)
        .map((record) => {
          const text = progressionText(evaluateMastery(record));
          return (
            <p
              key={weaknessKey(record.identity)}
              className="mt-3 text-xs text-emerald-700"
            >
              {text.label}:{" "}
              {record.identity.items.join(" → ") ||
                (record.identity.kind === "speed"
                  ? "your pace"
                  : "your accuracy")}
              .{" "}
              {record.masteryVia === "controlled"
                ? actionText({ type: "none" }, record).message
                : text.message}
            </p>
          );
        })}
      {failure && (
        <p role="alert" className="mt-3 text-xs text-amber-700">
          {failure}
        </p>
      )}
    </section>
  );
}
