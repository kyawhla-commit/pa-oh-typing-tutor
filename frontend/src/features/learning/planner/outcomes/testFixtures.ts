import { createLearningService } from "../../service";
import { evidence, profileOf } from "../../testFixtures";
import { saveProfile } from "../../storage";
import { saveMastery } from "../../transfer/storage";
import { emptyMastery } from "../../transfer/progression";
import {
  eligibleRecord,
  finishExercise,
  sourceAttribution,
} from "../../progression/testFixtures";
import { createTypingEngine } from "../../../../engine/typing";
export function outcomeFixture(
  kind: "targeted" | "contextual" | "check" | "normal" = "targeted",
  scope = "a",
) {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
  if (kind !== "normal") {
    const rows = [
      evidence("r".repeat(40), [0, 1, 2, 3], "seed1", "t"),
      evidence("r".repeat(40), [0, 1, 2, 3], "seed2", "t"),
    ];
    if (kind === "check" || kind === "contextual")
      for (let i = 3; i <= 8; i++)
        rows.push(evidence("a".repeat(60), [], `seed${i}`));
    const profile = profileOf(...rows),
      base = emptyMastery(profile.sessionCount);
    saveProfile(storage, scope, profile);
    saveMastery(
      storage,
      scope,
      kind === "targeted"
        ? base
        : {
            ...base,
            records: [
              kind === "check"
                ? eligibleRecord()
                : {
                    ...eligibleRecord(),
                    state: "IMPROVING",
                    practiceLevel: 1,
                    checkOrder: null,
                    waiting: [],
                    naturalSinceCheck: 0,
                  },
            ],
          },
    );
  }
  const service = createLearningService(storage, (job) => job());
  const plan = service.planSession(scope);
  const start = () => {
    const selected = service.startPlanned(scope, plan);
    if (!selected.ok) throw Error("Invalid fixture start");
    const attempt = service.getOutcomeSnapshot(scope).current!;
    const engine = selected.selection
      ? createTypingEngine({
          preparedText: selected.selection.exercise.preparedText,
          sourceIdentity: selected.selection.exercise.source,
          completionPolicy: "require-correct-target",
        })
      : createTypingEngine({
          targetText: "abc",
          sourceIdentity: { type: "corpus", id: "ordinary", version: "1" },
        });
    service.bindPlannedRun(scope, attempt.attemptId, "run1");
    return { selected, attempt, engine };
  };
  const complete = (wrong: readonly number[] = []) => {
    const run = start();
    if (!run.selected.selection) throw Error();
    const e = run.selected.selection.exercise;
    service.complete(
      scope,
      "run1",
      finishExercise(e, wrong),
      0,
      sourceAttribution(e, run.selected.selection.assessmentCheckOrder),
    );
    return run;
  };
  return { values, storage, service, scope, plan, start, complete };
}
