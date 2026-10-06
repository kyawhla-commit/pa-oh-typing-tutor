import { createTypingEngine } from "../../engine/typing";
import { extractLearningEvidence } from "../learning/evidence";
import { emptyProfile } from "../learning/profile";
import { emptyMastery } from "../learning/transfer/progression";
import { evidence, profileOf } from "../learning/testFixtures";
import { eligibleRecord } from "../learning/progression/testFixtures";
import {
  saveProfile,
  profileStorageKey,
  type ProfileStorage,
} from "../learning/storage";
import { saveMastery, masteryStorageKey } from "../learning/transfer/storage";
import { plannerHistoryKey } from "../learning/planner/history";
import { outcomeStorageKey } from "../learning/planner/outcomes/storage";
import { FIXTURES, isParticipantId, type FixtureId } from "./tasks";
import { freezeProfileValue } from "../learning/aggregation";
const epochPattern = /^[a-f0-9-]{36}$/;
export const studyScope = (participantId: string, epoch: string) => {
  if (!isParticipantId(participantId) || !epochPattern.test(epoch))
    throw Error("Invalid study scope.");
  return `user:study-v1:${participantId}:${epoch}`;
};
export const scopeRegistryKey = (id: string) => {
  if (!isParticipantId(id)) throw Error("Invalid participant.");
  return `typing-pilot:v1:scope:${id}`;
};
export function buildPilotFixture(id: FixtureId) {
  if (!FIXTURES.includes(id)) throw Error("Unknown synthetic fixture.");
  if (id === "no-weakness")
    return freezeProfileValue({
      profile: emptyProfile(),
      mastery: emptyMastery(),
    });
  const text =
    "red birds rest near the river. the river runs near home. read each line before you begin. write one clear line then take a rest. rare red birds carry ripe fruit.";
  const weak = (id: string) => {
    const engine = createTypingEngine({
      targetText: text,
      completionPolicy: "target-covered",
      sourceIdentity: { type: "corpus", id: "synthetic-seed", version: "1" },
    });
    let errors = 0;
    const target = engine
      .getSnapshot()
      .target.units.map((unit) =>
        unit === "r" && errors < 7
          ? ["X", "Y", "Z", "W", "V", "U", "Q"][errors++]
          : unit,
      );
    engine.dispatch({ type: "INSERT_TEXT", text: target[0], atMs: 0 });
    engine.dispatch({
      type: "INSERT_TEXT",
      text: target.slice(1).join(""),
      atMs: 2000,
    });
    return extractLearningEvidence(engine.getResult(), id, 0)!;
  };
  const rows = [weak("synthetic-1"), weak("synthetic-2")];
  for (let n = 3; n <= 8; n++)
    rows.push(evidence("a".repeat(60), [], `synthetic-${n}`));
  const profile = profileOf(...rows),
    base = emptyMastery(profile.sessionCount),
    eligible = eligibleRecord();
  const record =
    id === "assessment-eligible"
      ? eligible
      : id === "transfer-check"
        ? { ...eligible, waiting: [], lastSeen: 8 }
        : id === "regressed"
          ? {
              ...eligible,
              state: "REGRESSED" as const,
              practiceLevel: 0 as const,
              checkOrder: null,
              waiting: [],
              training: [],
              stateSince: 8,
            }
          : id === "active"
            ? {
                ...eligible,
                state: "ACTIVE" as const,
                practiceLevel: 0 as const,
                checkOrder: null,
                waiting: [],
                training: [],
              }
            : {
                ...eligible,
                state: "IMPROVING" as const,
                practiceLevel: id === "mixed" ? (2 as const) : (1 as const),
                checkOrder: null,
                waiting: [],
                training: eligible.training.slice(0, id === "mixed" ? 2 : 1),
              };
  return freezeProfileValue({
    profile,
    mastery: { ...base, records: [record] },
  });
}
/** Exact owned keys only. No localStorage.clear(), account reset or guest-key access. */
export function resetStudyLearning(
  storage: ProfileStorage & { removeItem: (k: string) => void },
  participantId: string,
) {
  const raw = storage.getItem(scopeRegistryKey(participantId));
  if (!raw) return;
  const v = JSON.parse(raw);
  if (
    !v ||
    Object.keys(v).sort().join(",") !== "epoch,participantId" ||
    v.participantId !== participantId
  )
    throw Error("Invalid study registry; refusing to reset unrelated data.");
  const scope = studyScope(participantId, v.epoch);
  for (const key of [
    profileStorageKey(scope),
    masteryStorageKey(scope),
    plannerHistoryKey(scope),
    outcomeStorageKey(scope),
  ])
    storage.removeItem(key);
  storage.removeItem(scopeRegistryKey(participantId));
}
export function installPilotFixture(
  storage: ProfileStorage & { removeItem: (k: string) => void },
  participantId: string,
  epoch: string,
  id: FixtureId,
  enabled: boolean,
) {
  if (!enabled) throw Error("Study mode is disabled.");
  const scope = studyScope(participantId, epoch),
    fixture = buildPilotFixture(id);
  resetStudyLearning(storage, participantId);
  // Register ownership before writes, so partial failures remain explicitly clearable.
  storage.setItem(
    scopeRegistryKey(participantId),
    JSON.stringify({ participantId, epoch }),
  );
  if (
    !saveProfile(storage, scope, fixture.profile) ||
    !saveMastery(storage, scope, fixture.mastery)
  )
    throw Error(
      "Study fixture could not be persisted. No participant activity was started.",
    );
  return scope;
}
