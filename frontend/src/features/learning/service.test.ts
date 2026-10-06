import { describe, expect, it, vi } from "vitest";
import { createLearningService } from "./service";
import { completed } from "./testFixtures";
describe("deferred completion service", () => {
  it("retains bounded evidence and dedupe in memory when storage is blocked", () => {
    const jobs: (() => void)[] = [];
    const service = createLearningService(
      {
        getItem: () => {
          throw Error("blocked");
        },
        setItem: () => {
          throw Error("blocked");
        },
      },
      (job) => jobs.push(job),
    );
    const result = completed("abc", [0]);
    service.complete("user:a", "s", result, 0);
    expect(service.getSnapshot("user:a").profile.sessionCount).toBe(0);
    jobs.shift()!();
    expect(service.getSnapshot("user:a")).toMatchObject({
      persisted: false,
      profile: { sessionCount: 1 },
    });
    service.complete("user:a", "s", result, 1);
    jobs.shift()!();
    expect(service.getSnapshot("user:a").profile.sessionCount).toBe(1);
  });
  it("re-reads sequential external writes and refreshes cached duplicate results", () => {
    const values = new Map<string, string>();
    const writes = vi.fn((key: string, value: string) =>
      values.set(key, value),
    );
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: writes,
    };
    const jobs: (() => void)[] = [];
    const a = createLearningService(storage, (job) => jobs.push(job)),
      b = createLearningService(storage, (job) => jobs.push(job));
    const result = completed("abc");
    a.complete("user:a", "s1", result, 0);
    jobs.shift()!();
    expect(a.getSnapshot("user:a").profile.sessionCount).toBe(1);
    b.complete("user:a", "s2", result, 1);
    jobs.shift()!();
    expect(b.getSnapshot("user:a").profile.sessionCount).toBe(2);
    a.complete("user:a", "s2", result, 2);
    jobs.shift()!();
    expect(a.getSnapshot("user:a").profile.sessionCount).toBe(2);
    expect(writes).toHaveBeenCalledTimes(6);
  });
  it("invalid completed evidence is ignored after scheduling", () => {
    const jobs: (() => void)[] = [];
    const writes = vi.fn();
    const service = createLearningService(
      { getItem: () => null, setItem: writes },
      (job) => jobs.push(job),
    );
    const result = completed("abc", [0]);
    service.complete(
      "user:a",
      "bad",
      { ...result, mistakes: [{ ...result.mistakes[0], attempt: 0 }] },
      0,
    );
    expect(() => jobs.shift()!()).not.toThrow();
    expect(service.getSnapshot("user:a").profile.sessionCount).toBe(0);
    expect(writes).not.toHaveBeenCalled();
  });
});
