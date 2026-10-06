import {
  applyLearningEvidence,
  emptyProfile,
  extractLearningEvidence,
  practiceSpec,
  recommendationText,
  recommendPractice,
  serializeProfile,
} from "../index";
import {
  advanceMastery,
  emptyMastery,
  recommendWithMastery,
  recommendationIdentity,
  weaknessKey,
  classifyEvidence,
  evaluateMastery,
  serializeMastery,
  trainingSuccess,
} from "../transfer";
import { LEARNING } from "../constants";
import { ASSESSMENT } from "../progression/constants";
import {
  assessmentEligible,
  controlledMastery,
} from "../progression/assessment";
import { learningAction, learningIntent } from "../progression/actions";
import { learningActionWithVariants } from "../progression/actions";
import { selectionWithMastery } from "../transfer/recommendations";
import { canGenerateExercise } from "../exercises/capability";
import { validateComposition } from "../progression/composition";
import { rankPracticeCandidates } from "../policy";
import {
  advanceVariant,
  nextVariant,
  variantKey,
} from "../progression/variants";
import type { AdaptiveExercise } from "../exercises";
import { generateAdaptiveExercise } from "../exercises";
import { occurrencePositions, syntheticSession } from "./behavior";
import { INVARIANT_IDS } from "./constants";
import type { AdaptiveAttribution, MasteryProfile } from "../transfer/types";
import type {
  LearningEvidence,
  LearnerTypingProfile,
  PracticeRecommendation,
} from "../types";
import type {
  AnonymousHistory,
  ExerciseTrace,
  InvariantResult,
  Scenario,
  ScenarioResult,
  TraceStep,
} from "./types";

export const recommendationKey = (r: PracticeRecommendation) => {
  const i = recommendationIdentity(r);
  return i ? weaknessKey(i) : r.type;
};
export function traceState(
  profile: LearnerTypingProfile,
  mastery: MasteryProfile,
) {
  const selection = selectionWithMastery(profile, mastery);
  const actionFor = (r: PracticeRecommendation) =>
    learningActionWithVariants(
      mastery.records.find(
        (x) => weaknessKey(x.identity) === recommendationKey(r),
      ) ?? null,
      r,
      mastery,
      "anonymous-evaluation",
    );
  const recommendations = selection.visible.map(({ recommendation: r }) => {
    const e = r.evidence,
      s = e.window === "lifetime" ? e.lifetime : e.recent;
    return {
      id: recommendationKey(r),
      type: r.type,
      targets: r.targets,
      priority: r.priority,
      explanation: recommendationText(r).reason,
      window: e.window,
      opportunities: s?.opportunities ?? e.attempts,
      errors: s?.errorOccurrences ?? 0,
      rate: s && s.opportunities ? s.errorOccurrences / s.opportunities : 0,
      directionalCount: e.substitution?.recentCount ?? null,
    };
  });
  const records = mastery.records.map((r) => {
    const d = evaluateMastery(r);
    const visible = selection.audit.find(
      (x) => x.visible && x.weaknessId === weaknessKey(r.identity),
    );
    const action = visible
      ? actionFor(visible.recommendation)
      : learningIntent(r);
    return {
      key: weaknessKey(r.identity),
      state: r.state,
      level: r.practiceLevel ?? 0,
      // Hidden rows describe intent, not an executable offer. Full audit actions
      // are null for hidden candidates; offered actions always use preflight.
      action: action.type,
      eligible:
        assessmentEligible(r) &&
        learningAction(r).type === "controlled-assessment",
      path: r.masteryVia,
      training: {
        sessions: d.training.sessions,
        successes: d.training.successes,
        opportunities: d.training.opportunities,
        errors: d.training.errors,
      },
      transfer: {
        sessions: d.transfer.sessions,
        opportunities: d.transfer.opportunities,
        errors: d.transfer.errors,
        rate: d.transfer.rate,
      },
      waiting: r.waiting?.length ?? 0,
      naturalSinceCheck: r.naturalSinceCheck ?? 0,
      assessments: r.assessments?.length ?? 0,
      assessmentOpportunities:
        r.assessments?.reduce((n, o) => n + o.opportunities, 0) ?? 0,
      failure: r.assessmentFailure,
    };
  });
  return {
    profile: {
      sessions: profile.sessionCount,
      attempts: profile.totalAttempts,
      errors: profile.incorrectAttempts,
      recentSessions: profile.recent.length,
    },
    recommendations,
    top: recommendations[0]?.id ?? null,
    records,
    selectionAudit: selection.audit.map((x) => ({
      weaknessId: x.weaknessId,
      rawPriority: x.recommendation.priority,
      type: x.recommendation.type,
      signature: x.signature,
      visible: x.visible,
      reason: x.reason,
      representedBy: x.representedBy,
      action: x.visible ? actionFor(x.recommendation).type : null,
    })),
  };
}
export function ingest(
  profile: LearnerTypingProfile,
  mastery: MasteryProfile,
  e: LearningEvidence,
  attribution?: AdaptiveAttribution,
) {
  const after = applyLearningEvidence(profile, e);
  return {
    profile: after,
    mastery: advanceMastery(mastery, profile, after, e, attribution),
  };
}
export function replayHistory(history: AnonymousHistory, observer?: (summary: import("../types").SessionSummary) => void) {
  let profile = emptyProfile(),
    mastery = emptyMastery();
  const trace = [];
  for (const s of history.sessions) {
    ({ profile, mastery } = ingest(
      profile,
      mastery,
      {
        summary: s.summary,
        aggregates: s.aggregates,
        mistakes: [],
        exposure: "observed-position-lower-bound",
      },
      s.attribution,
    ));
    observer?.(s.summary);
    trace.push(traceState(profile, mastery));
  }
  return { profile, mastery, trace };
}
export function simulateScenario(scenario: Scenario): ScenarioResult {
  let profile = emptyProfile(),
    mastery = emptyMastery(),
    engineSessions = 0,
    exercises = 0;
  const frozen = new Map<string, AdaptiveExercise>();
  const trace: TraceStep[] = [],
    sessions: AnonymousHistory["sessions"][number][] = [],
    remembered = new Map<string, PracticeRecommendation>();
  const tests = new Map<string, { checks: number; violations: string[] }>(
    INVARIANT_IDS.map((id) => [id, { checks: 0, violations: [] }]),
  );
  const check = (id: string, ok: boolean, message: string) => {
    const t = tests.get(id)!;
    t.checks++;
    if (!ok) t.violations.push(`${scenario.id}: ${message}`);
  };
  for (const [index, step] of scenario.steps.entries()) {
    const before = mastery,
      beforeProfile = profile;
    let result = null,
      attribution: AdaptiveAttribution | undefined,
      exercise: ExerciseTrace | null = null,
      failure: string | null = null;
    const available = recommendWithMastery(profile, mastery).map(
      (r) => r.recommendation,
    );
    for (const rec of available) remembered.set(recommendationKey(rec), rec);
    if (step.kind === "ordinary") {
      result = syntheticSession(step);
      engineSessions++;
    } else {
      const key = weaknessKey(step.identity),
        record =
          mastery.records.find((r) => weaknessKey(r.identity) === key) ?? null,
        action = learningAction(record),
        rec =
          available.find((r) => recommendationKey(r) === key) ??
          remembered.get(key);
      const purpose = step.purpose ?? "training",
        allowed =
          purpose === "training"
            ? ["targeted-practice", "contextual-practice"].includes(action.type)
            : action.type === "controlled-assessment";
      const reused = step.restart ? frozen.get(key) : undefined;
      if (
        (!allowed && !reused) ||
        !rec ||
        (!("progressionLevel" in action) && !reused)
      )
        failure = "action-unavailable";
      else {
        const spec = practiceSpec(rec),
          vkey = variantKey(spec, purpose),
          ordinal =
            reused?.generatedFrom.composition?.ordinal ??
            nextVariant(mastery.variants ?? [], vkey),
          composition = {
            level:
              reused?.generatedFrom.composition?.level ??
              ("progressionLevel" in action ? action.progressionLevel : 0),
            ordinal,
            purpose,
          };
        const generated = reused
          ? { ok: true as const, exercise: reused }
          : generateAdaptiveExercise(spec, {
              learnerKey: "anonymous-evaluation",
              composition,
            });
        if (!reused) exercises++;
        if (!generated.ok) failure = `${generated.code}: ${generated.reason}`;
        else {
          const e = generated.exercise;
          frozen.set(key, e);
          if (!reused)
            mastery = {
              ...mastery,
              variants: advanceVariant(mastery.variants ?? [], vkey, ordinal),
            };
          exercise = {
            ...(reused ? { reused: true } : {}),
            focusType: e.focusType,
            items: e.focusItems,
            level: composition.level,
            ordinal,
            purpose,
            length: e.coverage.totalGraphemes,
            density: Math.max(0, ...e.coverage.sectionDensities),
            strategy: e.contentStrategy,
            id: e.id,
          };
          attribution = {
            sourceId: e.source.id,
            sourceVersion: e.source.version,
            focusType: e.focusType,
            focusItems: e.focusItems,
            composition,
            ...(purpose === "controlled-transfer-assessment"
              ? { assessmentCheckOrder: record?.checkOrder ?? undefined }
              : {}),
          };
          const opportunities = occurrencePositions(
              e.text,
              step.identity,
            ).length,
            errors =
              step.outcome === "success"
                ? 0
                : step.outcome === "mild"
                  ? 1
                  : Math.ceil(
                      opportunities *
                        (step.identity.kind === "token" ? 0.5 : 0.25),
                    );
          result = syntheticSession(
            {
              kind: "ordinary",
              label: step.label,
              text: e.text,
              wpm: step.wpm,
              errors: [
                {
                  identity: step.identity,
                  occurrences: errors,
                  corrected: true,
                },
              ],
            },
            e.source,
          );
          engineSessions++;
        }
      }
    }
    const sessionId =
      step.kind === "ordinary" && step.repeatId
        ? (sessions.at(-1)?.summary.sessionId ?? `session-${index}`)
        : `session-${index}`;
    const evidence = extractLearningEvidence(result, sessionId, 0);
    if (evidence) {
      ({ profile, mastery } = ingest(profile, mastery, evidence, attribution));
      sessions.push({
        summary: evidence.summary,
        aggregates: evidence.aggregates,
        ...(attribution ? { attribution } : {}),
      });
    }
    const state = traceState(profile, mastery),
      context = evidence
        ? classifyEvidence(evidence.summary, attribution)
        : "no-ingestion";
    trace.push({
      step: index + 1,
      label: step.label,
      sessionSequence: profile.sessionCount,
      ingested: profile.sessionCount > beforeProfile.sessionCount,
      context,
      ...state,
      session: result
        ? {
            attempts: result.counts.totalInsertionAttempts,
            errors: result.counts.incorrectInsertionAttempts,
            corrected: result.counts.correctedErrors,
            remaining: result.counts.uncorrectedErrors,
            accuracy: result.metrics.attemptAccuracy,
            wpm: result.metrics.correctWpm,
            activeMs: result.activeElapsedMs,
          }
        : null,
      exercise,
      generationFailure: failure,
    });
    check(
      "recommendation-cap",
      state.recommendations.length <= 3,
      "more than three recommendations",
    );
    check(
      "deterministic-ranking",
      JSON.stringify(state.recommendations) ===
        JSON.stringify(traceState(profile, mastery).recommendations),
      "ranking changed on repeat",
    );
    check(
      "levels-bounded",
      state.records.every((r) => r.level >= 0 && r.level <= 2),
      "level outside 0–2",
    );
    check(
      "no-auto-launch",
      exercises ===
        trace.filter(
          (t) =>
            (t.exercise && !t.exercise.reused) ||
            (t.generationFailure &&
              t.generationFailure !== "action-unavailable"),
        ).length,
      "unexpected exercise launch",
    );
    const profileBytes = serializeProfile(profile),
      selected = selectionWithMastery(profile, mastery);
    check(
      "visible-eligible",
      state.recommendations.every(
        (r) =>
          selected.audit.some((x) => x.visible && x.weaknessId === r.id) ||
          r.type === "GENERAL_PRACTICE",
      ),
      "visible recommendation was not eligible",
    );
    check(
      "unique-visible-actions",
      new Set(state.recommendations.map((r) => r.id)).size ===
        state.recommendations.length,
      "duplicate weakness/action identity",
    );
    check(
      "selection-preserves-evidence",
      profileBytes === serializeProfile(profile),
      "selection modified evidence",
    );
    check(
      "selection-deterministic",
      JSON.stringify(selected) ===
        JSON.stringify(selectionWithMastery(profile, mastery)),
      "selection changed on repeat",
    );
    const regressions = selected.audit.filter((x) => x.state === "REGRESSED");
    if (
      regressions.length &&
      !selected.audit.some(
        (x) => x.visible && x.recommendation.type === "ACCURACY_FOCUS",
      )
    )
      check(
        "regression-visible",
        regressions.some((x) => x.visible),
        "qualified regression had no visible representative",
      );
    for (const item of selected.visible) {
      const rec = item.recommendation,
        record =
          mastery.records.find(
            (r) => weaknessKey(r.identity) === recommendationKey(rec),
          ) ?? null;
      const action = learningActionWithVariants(
        record,
        rec,
        mastery,
        "anonymous-evaluation",
      );
      if (record && assessmentEligible(record)) {
        const spec = practiceSpec(rec),
          purpose = "controlled-transfer-assessment" as const,
          ordinal = nextVariant(
            mastery.variants ?? [],
            variantKey(spec, purpose),
          );
        const capability = canGenerateExercise(spec, {
          learnerKey: "anonymous-evaluation",
          composition: { level: 2, ordinal, purpose },
        });
        check(
          "unsupported-check-not-offered",
          capability.ok
            ? action.type === "controlled-assessment" &&
                capability.exercise.contentStrategy === "curated"
            : action.type !== "controlled-assessment",
          "unsupported fallback check offered",
        );
      }
      if ("progressionLevel" in action) {
        const purpose =
            action.type === "controlled-assessment"
              ? "controlled-transfer-assessment"
              : "training",
          spec = practiceSpec(rec),
          ordinal = nextVariant(
            mastery.variants ?? [],
            variantKey(spec, purpose),
          ),
          composition = {
            level: action.progressionLevel,
            ordinal,
            purpose,
          } as const;
        const witness = canGenerateExercise(spec, {
          learnerKey: "anonymous-evaluation",
          composition,
        });
        check(
          "action-executable",
          witness.ok,
          "surfaced adaptive action had no generation witness",
        );
        if (witness.ok)
          check(
            "supported-generation-contract",
            validateComposition(
              witness.exercise.text,
              witness.exercise.generatedFrom.spec,
              witness.exercise.sections,
              witness.exercise.contentStrategy,
              composition,
            ).valid,
            "supported witness failed independent verification",
          );
      }
    }
    check(
      "bounded-storage",
      serializeProfile(profile).length <= 2 * 1024 * 1024 &&
        serializeMastery(mastery).length <= 256 * 1024,
      "storage bounds exceeded",
    );
    for (const r of mastery.records) {
      const prior = before.records.find(
        (p) => weaknessKey(p.identity) === weaknessKey(r.identity),
      );
      if (evidence?.summary.sourceIdentity?.type === "adaptive") {
        check(
          "adaptive-not-natural",
          JSON.stringify(r.transfer) === JSON.stringify(prior?.transfer ?? []),
          "adaptive grew transfer",
        );
        if (exercise?.level === 2)
          check(
            "level2-not-natural",
            JSON.stringify(r.transfer) ===
              JSON.stringify(prior?.transfer ?? []),
            "level 2 grew transfer",
          );
        if (exercise?.purpose === "controlled-transfer-assessment")
          check(
            "assessment-not-natural",
            JSON.stringify(r.transfer) ===
              JSON.stringify(prior?.transfer ?? []),
            "assessment grew transfer",
          );
      }
      if (r.state === "PROVISIONAL_MASTERY" && prior?.state !== r.state)
        check(
          "mastery-qualified",
          r.masteryVia === "controlled"
            ? controlledMastery({ ...r, state: "TRANSFER_CHECK" })
            : evaluateMastery({ ...r, state: "ACTIVE" }).state ===
                "PROVISIONAL_MASTERY",
          "unqualified mastery",
        );
      if (r.state === "REGRESSED" && prior?.state === "PROVISIONAL_MASTERY")
        check(
          "isolated-error-not-regression",
          r.stateSince - prior.stateSince >= 2,
          "single ordinary session caused regression",
        );
      if (assessmentEligible(r))
        check(
          "assessment-wait",
          (r.waiting?.length ?? 0) >= ASSESSMENT.waitingSessions,
          "premature assessment offer",
        );
      if (r.masteryVia === "controlled")
        check(
          "distinct-assessments",
          new Set(r.assessments?.map((o) => o.ordinal)).size ===
            (r.assessments?.length ?? 0) && (r.assessments?.length ?? 0) > 1,
          "duplicate/one-shot controlled mastery",
        );
    }
    if (step.kind === "ordinary" && step.abort)
      check(
        "aborts-excluded",
        !evidence && profile === beforeProfile,
        "abort was ingested",
      );
    if (step.kind === "ordinary" && step.source === "custom")
      check(
        "private-text-excluded",
        evidence?.aggregates.tokens.length === 0 &&
          evidence?.aggregates.bigrams.length === 0 &&
          !serializeProfile(profile).includes("PRIVATE_CUSTOM_SENTINEL"),
        "private text retained",
      );
    if (step.kind === "ordinary" && step.manualSave)
      check(
        "save-independent",
        profile.sessionCount === beforeProfile.sessionCount + 1,
        "completion depends on manual save",
      );
    for (const rec of rankPracticeCandidates(profile)) {
      const id = recommendationIdentity(rec);
      if (
        !id ||
        before.records.some((r) => weaknessKey(r.identity) === weaknessKey(id))
      )
        continue;
      const stat =
        rec.evidence.window === "lifetime"
          ? rec.evidence.lifetime
          : rec.evidence.recent;
      let qualified = false;
      if (id.kind === "accuracy" || id.kind === "speed")
        qualified = rec.evidence.sessions >= LEARNING.trendSessions;
      else if (stat) {
        if (id.kind === "substitution")
          qualified =
            stat.opportunities >= LEARNING.substitution.opportunities &&
            (rec.evidence.window === "recent"
              ? (rec.evidence.substitution?.recentCount ?? 0) >=
                LEARNING.substitution.recentCount
              : (rec.evidence.substitution?.lifetimeCount ?? 0) >=
                LEARNING.substitution.lifetimeCount);
        else {
          const threshold = LEARNING[id.kind];
          const lifetime = rec.evidence.window === "lifetime";
          qualified =
            stat.opportunities >=
              (lifetime
                ? threshold.lifetimeOpportunities
                : threshold.opportunities) &&
            stat.errorOccurrences >=
              (lifetime ? threshold.lifetimeErrors : threshold.errors) &&
            stat.errorOccurrences / stat.opportunities >= threshold.rate;
        }
      }
      check(
        "recommendation-evidence",
        qualified,
        "new diagnosis before category evidence gate",
      );
    }
  }
  const targetKey = scenario.target ? weaknessKey(scenario.target) : null,
    rows = trace.map((t) => ({
      t,
      r: t.records.find((r) => r.key === targetKey),
    }));
  const stages: Record<string, number> = {};
  for (const { t, r } of rows)
    if (r && stages[r.state] === undefined) stages[r.state] = t.step;
  const detection = rows.find(({ t }) =>
    t.recommendations.some((r) => r.id === targetKey),
  );
  let topChanges = 0,
    flips = 0;
  for (let i = 1; i < trace.length; i++) {
    if (trace[i].top !== trace[i - 1].top) topChanges++;
    const a = rows[i - 1].r?.state,
      b = rows[i].r?.state;
    if (a && b && a !== b && [a, b].some((s) => s === "PROVISIONAL_MASTERY"))
      flips++;
  }
  const firstOffer = rows.find(({ r }) => r?.eligible);
  const replay = replayHistory({
    version: 1,
    anonymousLearnerId: scenario.id,
    sessions,
  });
  check(
    "deterministic-replay",
    serializeProfile(profile) === serializeProfile(replay.profile) &&
      JSON.stringify(mastery.records) ===
        JSON.stringify(replay.mastery.records),
    "history replay differs",
  );
  const invariants: InvariantResult[] = [...tests].map(([id, t]) => ({
    id,
    ...t,
  }));
  return {
    id: scenario.id,
    version: 1,
    group: scenario.group,
    description: scenario.description,
    targetKey,
    trace,
    history: { version: 1, anonymousLearnerId: scenario.id, sessions },
    finalProfile: profile,
    finalMastery: mastery,
    engineSessions,
    exercises,
    invariants,
    metrics: {
      detectionStep: detection?.t.step ?? null,
      detectionOpportunities:
        detection?.t.recommendations.find((r) => r.id === targetKey)
          ?.opportunities ?? null,
      stageFirstSteps: stages,
      masteryStep: stages.PROVISIONAL_MASTERY ?? null,
      topChanges,
      activeMasteryFlips: flips,
      assessmentOfferSteps: rows.filter(({ r }) => r?.eligible).length,
      ordinaryWaitingBeforeFirstOffer: firstOffer?.r?.waiting ?? null,
      targetVisibleSteps: rows.filter(({ t }) =>
        t.recommendations.some((r) => r.id === targetKey),
      ).length,
      targetHiddenActionableSteps: rows.filter(
        ({ t, r }) =>
          r &&
          ["ACTIVE", "REGRESSED", "IMPROVING"].includes(r.state) &&
          !t.recommendations.some((r) => r.id === targetKey),
      ).length,
      targetSuppressedAfterMastery: rows
        .filter(({ r }) => r?.state === "PROVISIONAL_MASTERY")
        .every(({ t }) => !t.recommendations.some((r) => r.id === targetKey)),
      regressionSteps: rows
        .filter(
          ({ r, t }) =>
            r?.state === "REGRESSED" &&
            rows[t.step - 2]?.r?.state !== "REGRESSED",
        )
        .map(({ t }) => t.step),
    },
  };
}
