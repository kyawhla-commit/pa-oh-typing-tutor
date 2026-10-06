import { describe, it, expect } from "vitest";
import {
  buildPilotFixture,
  installPilotFixture,
  resetStudyLearning,
  scopeRegistryKey,
  studyScope,
} from "./fixtures";
import { FIXTURES as IDS } from "./tasks";
import { createLearningService } from "../learning/service";
import { profileStorageKey } from "../learning/storage";
import { parseMastery, serializeMastery } from "../learning/transfer/storage";
const epoch = "00000000-0000-4000-8000-000000000001";
function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
}
describe("synthetic study profiles and scoped reset", () => {
  it.each(IDS)(
    "%s is deterministic, serializable, isolated and executable",
    (id) => {
      const f = buildPilotFixture(id);
      expect(buildPilotFixture(id)).toEqual(f);
      expect(parseMastery(serializeMastery(f.mastery))).toEqual(f.mastery);
      const store = storage(),
        scope = installPilotFixture(store, "P01", epoch, id, true),
        service = createLearningService(store, (j) => j());
      expect(service.getSnapshot(scope).mastery).toEqual(f.mastery);
      expect(service.planSession(scope).primaryAction.executable).toBe(true);
      expect(JSON.stringify(f)).not.toContain("@");
    },
  );
  it.each([
    ["active", "targeted-improvement", 0],
    ["improving", "contextual-practice", 1],
    ["mixed", "contextual-practice", 2],
    ["assessment-eligible", "transfer-check", 2],
    ["regressed", "regression-recovery", 0],
  ] as const)("%s offers intended purpose/level", (id, purpose, level) => {
    const store = storage(),
      scope = installPilotFixture(store, "P01", epoch, id, true),
      plan = createLearningService(store, (j) => j()).planSession(scope);
    expect(plan.purpose).toBe(purpose);
    expect(plan.primaryAction.target.type).toBe("adaptive");
    if (plan.primaryAction.target.type === "adaptive")
      expect(plan.primaryAction.target.level).toBe(level);
  });
  it("the optional-secondary task fixture supplies a genuine optional executable action", () => {
    const store = storage(),
      scope = installPilotFixture(store, "P01", epoch, "active", true),
      plan = createLearningService(store, (j) => j()).planSession(scope);
    expect(plan.optionalSecondaryAction?.executable).toBe(true);
  });
  it("transfer-check fixture waits without inventing assessment eligibility", () => {
    const store = storage(),
      scope = installPilotFixture(store, "P01", epoch, "transfer-check", true),
      s = createLearningService(store, (j) => j());
    expect(s.getSnapshot(scope).mastery.records[0].state).toBe(
      "TRANSFER_CHECK",
    );
    expect(s.planSession(scope).primaryAction.actionType).not.toBe(
      "controlled-assessment",
    );
  });
  it("reset touches only registered study keys and leaves observations/accounts/other participants intact", () => {
    const store = storage(),
      a = installPilotFixture(store, "P01", epoch, "active", true),
      b = installPilotFixture(store, "P02", epoch, "mixed", true);
    store.setItem("typing-tutor.unified-data.v2", "ACCOUNT");
    store.setItem("typing-pilot:v1:participant:P01", "OBSERVATIONS");
    resetStudyLearning(store, "P01");
    expect(store.getItem(profileStorageKey(a))).toBeNull();
    expect(store.getItem(profileStorageKey(b))).not.toBeNull();
    expect(store.getItem("typing-tutor.unified-data.v2")).toBe("ACCOUNT");
    expect(store.getItem("typing-pilot:v1:participant:P01")).toBe(
      "OBSERVATIONS",
    );
  });
  it("rejects a tampered registry rather than touching unrelated keys", () => {
    const store = storage();
    store.setItem(
      scopeRegistryKey("P01"),
      JSON.stringify({ participantId: "P02", epoch }),
    );
    expect(() => resetStudyLearning(store, "P01")).toThrow();
    expect(() => studyScope("person@example.com", epoch)).toThrow();
  });
  it("mode-off cannot install fixtures or modify existing learning", () => {
    const store = storage();
    expect(() =>
      installPilotFixture(store, "P01", epoch, "active", false),
    ).toThrow();
    expect(store.values.size).toBe(0);
  });
});
