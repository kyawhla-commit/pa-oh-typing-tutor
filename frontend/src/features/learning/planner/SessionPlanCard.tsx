import { useEffect, useMemo, useRef, useState } from "react";
import { useLearningProfile, useLearningScope } from "../useLearningProfile";
import { getLearningService } from "../service";
import { usePlannerOutcomes } from "./outcomes/usePlannerOutcomes";
import type { AdaptiveSelection } from "../exercises/selection";
import type { LearningSessionPlan, PlanPurpose } from "./types";
export const planTitle: Record<PlanPurpose, string> = {
  "regression-recovery": "Refresh a previous skill",
  "transfer-check": "Check your skill in mixed typing",
  "targeted-improvement": "Focused typing practice",
  "contextual-practice": "Build skill in broader context",
  "general-practice": "General typing practice",
};
export function SessionPlanCard({
  onStart,
}: {
  onStart: (
    plan: LearningSessionPlan,
    selection: AdaptiveSelection | null,
  ) => void;
}) {
  const scope = useLearningScope(),
    snapshot = useLearningProfile(scope),
    service = getLearningService();
  const outcomes = usePlannerOutcomes(scope, service),
    startButton = useRef<HTMLButtonElement>(null),
    focusNext = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  const plan = useMemo(
    () => (scope ? service.planSession(scope) : null),
    [scope, snapshot, service, outcomes.recent],
  );
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    if (scope && plan) {
      service.offerPlanned(scope, plan);
      if (focusNext.current) {
        startButton.current?.focus();
        focusNext.current = false;
      }
    }
  }, [scope, plan?.id, service]);
  useEffect(() => {
    setNotice(null);
    setFailure(null);
  }, [scope]);
  if (!scope || !plan) return null;
  const skip = () => {
    const offered = service.getOutcomeSnapshot(scope).current;
    if (offered?.lifecycle !== "offered" || offered.planId !== plan.id) return;
    const result = service.skipPlanned(scope, offered.attemptId);
    if (result.changed) {
      focusNext.current = true;
      const next = service.planSession(scope);
      setFailure(null);
      setNotice(
        next.primaryAction.activityKey !== plan.primaryAction.activityKey
          ? "Okay — another available activity is ready."
          : "This is still the current valid focus. You can start it when ready.",
      );
    }
  };
  const start = () => {
    const result = service.startPlanned(scope, plan);
    if (result.ok) {
      setFailure(null);
      onStart(plan, result.selection);
    } else setFailure(result.reason);
  };
  return (
    <section
      aria-label="Session focus"
      className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4"
    >
      <p className="text-xs font-medium text-blue-700">Session focus</p>
      <h2 className="mt-1 font-semibold text-slate-900">
        {planTitle[plan.purpose]}
      </h2>
      {plan.primaryAction.weakness?.items.length ? (
        <p className="mt-1 text-sm text-slate-700">
          Focus: {plan.primaryAction.weakness.items.join(" · ")}
        </p>
      ) : null}
      <p className="mt-1 text-sm text-slate-600">{plan.explanation}</p>
      {plan.optionalSecondaryAction && (
        <p className="mt-1 text-sm text-slate-500">
          Optional: general typing practice after this activity.
        </p>
      )}
      {failure && (
        <p role="alert" className="mt-2 text-sm text-amber-700">
          {failure}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-2 text-sm text-slate-600">
          {notice}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          ref={startButton}
          type="button"
          disabled={outcomes.current?.lifecycle === "started"}
          onClick={start}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50"
        >
          Start session
        </button>
        <button
          type="button"
          onClick={skip}
          disabled={
            outcomes.current?.lifecycle !== "offered" ||
            outcomes.current.planId !== plan.id
          }
          className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50"
        >
          Skip activity
        </button>
      </div>
    </section>
  );
}
