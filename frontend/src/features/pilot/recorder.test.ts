import { describe, it, expect } from "vitest";
import { createPilotRecorder, pilotEventId, pilotDataKey } from "./recorder";
import {
  serializePilotExport,
  validateMilestone,
  validatePilotData,
  validateNote,
  PILOT_LIMITS,
} from "./schema";
import { pilotEnabled, TASKS } from "./tasks";
const consent = {
  participation: true,
  notes: true,
  audio: false,
  video: false,
  screen: false,
};
const event = {
  eventId: pilotEventId("one"),
  eventType: "activity-started" as const,
};
function fixture(enabled = true) {
  const values = new Map<string, string>();
  let clock = 100;
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
  const recorder = createPilotRecorder(storage, () => clock, enabled);
  return { recorder, values, storage, time: (n: number) => (clock = n) };
}
function start(f = fixture()) {
  expect(f.recorder.startParticipant("P01", consent)).toBe(true);
  expect(f.recorder.startTask("T01")).toBe(true);
  return f;
}
describe("consented local pilot capture", () => {
  it("blocks capture without participant, consent or active task", () => {
    const f = fixture();
    expect(f.recorder.record(event)).toBe(false);
    expect(
      f.recorder.startParticipant("P01", { ...consent, participation: false }),
    ).toBe(false);
    expect(f.recorder.startParticipant("P01", consent)).toBe(true);
    expect(f.recorder.record(event)).toBe(false);
    expect(f.recorder.getSnapshot().data!.events).toEqual([]);
  });
  it.each(["", "Alice", "P00", "P100", "p01", "P01@example.com", "password"])(
    "rejects pseudonym %s",
    (id) => {
      const f = fixture();
      expect(f.recorder.startParticipant(id, consent)).toBe(false);
      expect(f.values.size).toBe(0);
    },
  );
  it.each(["P01", "P08", "P99"])(
    "accepts pseudonym %s with study version and rehearsal provenance",
    (id) => {
      const f = fixture();
      expect(f.recorder.startParticipant(id, consent)).toBe(true);
      expect(f.recorder.getSnapshot().data?.studyVersion).toBe(1);
      expect(f.recorder.getSnapshot().data?.captureKind).toBe(
        "engineering-rehearsal",
      );
    },
  );
  it("orders events, dedupes before sequence/time changes, clamps backwards clock", () => {
    const f = start();
    f.time(110);
    expect(f.recorder.record(event)).toBe(true);
    const before = f.recorder.getSnapshot().data;
    f.time(200);
    expect(f.recorder.record(event)).toBe(false);
    expect(f.recorder.getSnapshot().data).toBe(before);
    f.time(90);
    f.recorder.record({ ...event, eventId: pilotEventId("two") });
    expect(
      f.recorder.getSnapshot().data!.events.map((e) => e.sequence),
    ).toEqual([1, 2, 3]);
    expect(
      f.recorder.getSnapshot().data!.events.map((e) => e.relativeTimeMs),
    ).toEqual([0, 10, 10]);
  });
  it("persists and resumes monotonic time with a new clock origin", () => {
    const f = start();
    f.time(150);
    f.recorder.record(event);
    const reload = createPilotRecorder(f.storage, () => 0, true);
    reload.startParticipant("P01", consent);
    reload.startTask("T02");
    expect(reload.getSnapshot().data!.events.at(-1)?.relativeTimeMs).toBe(50);
  });
  it("exports deterministic whitelisted tasks, events and observation data", () => {
    const f = start();
    f.recorder.record(event);
    const one = f.recorder.export();
    expect(f.recorder.export()).toBe(one);
    expect(JSON.parse(one).tasks).toEqual(TASKS);
    expect(JSON.parse(one).participantId).toBe("P01");
    expect(one).not.toContain("recordedAt");
  });
  it.each([
    "typedBuffer",
    "rawText",
    "passage",
    "email",
    "credentials",
    "authToken",
    "ip",
    "mistakes",
    "fullName",
  ])("rejects private/unknown event field %s", (field) => {
    expect(() => validateMilestone({ ...event, [field]: "SECRET" })).toThrow();
  });
  it("rejects nested raw input and credential fields in metrics", () => {
    expect(() =>
      validateMilestone({
        ...event,
        eventType: "activity-completed",
        metrics: {
          mode: "fixed-text",
          correctWpm: 40,
          attemptAccuracy: 100,
          attempts: 2,
          errors: 0,
          correctedErrors: 0,
          completionReason: "correct-target",
          typedText: "SECRET",
        },
      }),
    ).toThrow();
  });
  it.each([
    "email: person@example.com",
    "IP 127.0.0.1",
    "password: SECRET",
    "authToken=SECRET",
    "Bearer SECRET",
    "https://private.example",
  ])("rejects identifying note %s", (note) =>
    expect(() => validateNote(note)).toThrow(),
  );
  it("records manual observations and bounded tags without inferring confusion", () => {
    const f = start();
    expect(
      f.recorder.note({
        outcome: "success-with-help",
        confusionTags: ["skip-vs-cancel"],
        wrongClicks: 1,
        helpNeeded: true,
        explanationAccuracy: "partial",
        note: "Needed a neutral prompt to distinguish the controls.",
      }),
    ).toBe(true);
    expect(f.recorder.getSnapshot().data!.observations).toHaveLength(1);
    expect(f.recorder.getSnapshot().data!.events.at(-1)?.eventType).toBe(
      "facilitator-note",
    );
  });
  it("requires separate free-note permission", () => {
    const f = fixture();
    f.recorder.startParticipant("P01", { ...consent, notes: false });
    f.recorder.startTask("T01");
    expect(() =>
      f.recorder.note({
        outcome: "success",
        confusionTags: [],
        wrongClicks: 0,
        helpNeeded: false,
        explanationAccuracy: "not-asked",
        note: "Qualitative note",
      }),
    ).toThrow();
    expect(f.recorder.getSnapshot().data!.observations).toHaveLength(0);
  });
  it("keeps participant histories separate and clears exactly one data key", () => {
    const f = start();
    f.recorder.record(event);
    f.values.set("unrelated", "KEEP");
    f.recorder.startParticipant("P02", consent);
    f.recorder.startTask("T01");
    expect(f.recorder.getSnapshot().data!.events).toHaveLength(1);
    f.recorder.clear("P02");
    expect(f.recorder.getSnapshot().data).toBeNull();
    expect(f.values.get("unrelated")).toBe("KEEP");
    expect(f.values.has(pilotDataKey("P01"))).toBe(true);
  });
  it("blocks all mode-off capture and persistence regardless of query flags", () => {
    expect(pilotEnabled(false, "pilot")).toBe(false);
    expect(pilotEnabled(true, "development")).toBe(false);
    expect(pilotEnabled(true, "pilot")).toBe(true);
    const f = fixture(false);
    expect(f.recorder.startParticipant("P01", consent)).toBe(false);
    expect(f.recorder.startTask("T01")).toBe(false);
    expect(f.recorder.record(event)).toBe(false);
    expect(f.recorder.clear("P01")).toBe(false);
    expect(f.values.size).toBe(0);
  });
  it("refuses corrupt stored data rather than silently overwriting observations", () => {
    const f = fixture();
    f.values.set(pilotDataKey("P01"), "{corrupt");
    expect(f.recorder.startParticipant("P01", consent)).toBe(false);
    expect(f.values.get(pilotDataKey("P01"))).toBe("{corrupt");
    expect(f.recorder.clear("P01")).toBe(true);
    expect(f.recorder.startParticipant("P01", consent)).toBe(true);
  });
  it("retains visit-local capture when persistence throws", () => {
    const recorder = createPilotRecorder(
      {
        getItem: () => null,
        setItem: () => {
          throw Error();
        },
      },
      () => 0,
      true,
    );
    recorder.startParticipant("P01", consent);
    recorder.startTask("T01");
    expect(recorder.getSnapshot().persisted).toBe(false);
    expect(JSON.parse(recorder.export()).events).toHaveLength(1);
  });
  it("bounded event capture pauses without silently evicting study evidence", () => {
    const f = start();
    for (let n = 1; n < PILOT_LIMITS.events; n++)
      f.recorder.record({ ...event, eventId: pilotEventId(`e${n}`) });
    expect(
      f.recorder.record({ ...event, eventId: pilotEventId("overflow") }),
    ).toBe(false);
    expect(f.recorder.getSnapshot().data!.events).toHaveLength(500);
    expect(f.recorder.getSnapshot().error).toContain("limit");
  });
  it("validates root version, unknown/private fields, scope, sequence and timing on export", () => {
    const f = start(),
      data = f.recorder.getSnapshot().data!;
    for (const value of [
      { ...data, studyVersion: 99 },
      { ...data, email: "secret" },
      { ...data, participantId: "P02" },
      { ...data, events: data.events.map((e) => ({ ...e, sequence: 5 })) },
    ])
      expect(() => validatePilotData(value)).toThrow();
    expect(() =>
      serializePilotExport({
        ...data,
        events: [
          ...data.events,
          { ...data.events[0], sequence: 2, relativeTimeMs: -1 },
        ],
      }),
    ).toThrow();
  });
});

it("does not partially record an observation once milestone capture is full", () => {
  const f = start();
  for (let i = 1; i < PILOT_LIMITS.events; i++)
    f.recorder.record({ ...event, eventId: pilotEventId(`limit-${i}`) });
  expect(
    f.recorder.note({
      outcome: "success",
      confusionTags: [],
      wrongClicks: 0,
      helpNeeded: false,
      explanationAccuracy: "not-asked",
      note: "",
    }),
  ).toBe(false);
  expect(f.recorder.getSnapshot().data!.observations).toHaveLength(0);
  expect(f.recorder.getSnapshot().error).toContain("Capture limit reached");
});
