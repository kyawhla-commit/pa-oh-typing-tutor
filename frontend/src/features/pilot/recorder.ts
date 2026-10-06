import { freezeProfileValue } from "../learning/aggregation";
import { stableHash } from "../learning/exercises/identity";
import type { ProfileStorage } from "../learning/storage";
import { isParticipantId, STUDY_VERSION, TASKS, type TaskId } from "./tasks";
import {
  PILOT_LIMITS,
  validateConsent,
  validateMilestone,
  validateObservation,
  validatePilotData,
  serializePilotExport,
} from "./schema";
import type {
  PilotConsent,
  PilotData,
  PilotObservation,
  Milestone,
} from "./types";
export const pilotDataKey = (id: string) => {
  if (!isParticipantId(id)) throw Error("Use P01–P99.");
  return `typing-pilot:v1:participant:${id}`;
};
export const pilotEventId = (key: string) => `pilot-event-${stableHash(key)}`;
export function createPilotRecorder(
  storage: ProfileStorage,
  now: () => number = () => performance.now(),
  enabled = false,
) {
  const cached = new Map<string, PilotData>(),
    listeners = new Set<() => void>();
  let view = freezeProfileValue({
      data: null as PilotData | null,
      taskId: null as TaskId | null,
      persisted: true,
      error: null as string | null,
    }),
    origin = now(),
    offset = 0;
  const publish = (next: typeof view) => {
    view = freezeProfileValue(next);
    for (const l of listeners) l();
  };
  const write = (data: PilotData) => {
    const safe = validatePilotData(data);
    cached.set(safe.participantId, safe);
    let persisted = true;
    try {
      storage.setItem(pilotDataKey(safe.participantId), JSON.stringify(safe));
    } catch {
      persisted = false;
    }
    publish({
      ...view,
      data: safe,
      persisted,
      error: persisted
        ? null
        : "Study data is visit-local. Export before closing this page.",
    });
  };
  const recorder = {
    getSnapshot: () => view,
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    startParticipant: (
      id: string,
      consent: PilotConsent,
      captureKind: PilotData["captureKind"] = "engineering-rehearsal",
    ) => {
      if (!enabled || !isParticipantId(id) || !consent.participation)
        return false;
      const safeConsent = validateConsent(consent);
      let data = cached.get(id);
      let corrupt = false;
      if (!data)
        try {
          const text = storage.getItem(pilotDataKey(id));
          if (text) {
            data = validatePilotData(JSON.parse(text));
            if (data.participantId !== id) throw Error();
          }
        } catch {
          corrupt = true;
        }
      if (corrupt) {
        publish({
          ...view,
          error:
            "Stored study data is invalid. Clear this participant explicitly before capture.",
        });
        return false;
      }
      if (
        data &&
        (JSON.stringify(data.consent) !== JSON.stringify(safeConsent) ||
          data.captureKind !== captureKind)
      ) {
        publish({
          ...view,
          error:
            "Existing consent differs. Export/review and clear this participant before a new consent session.",
        });
        return false;
      }
      origin = now();
      offset = data?.events.at(-1)?.relativeTimeMs ?? 0;
      publish({ ...view, taskId: null, error: null });
      write(
        data ?? {
          studyVersion: STUDY_VERSION,
          captureKind,
          participantId: id,
          consent: safeConsent,
          events: [],
          observations: [],
        },
      );
      return true;
    },
    stop: () => publish({ ...view, taskId: null, data: null, error: null }),
    startTask: (taskId: TaskId) => {
      if (!enabled || !view.data || !TASKS.some((t) => t.id === taskId))
        return false;
      publish({ ...view, taskId });
      return recorder.record({
        eventId: pilotEventId(`task:${taskId}:${view.data!.events.length + 1}`),
        eventType: "task-started",
      });
    },
    record: (input: unknown) => {
      if (!enabled || !view.data || !view.taskId) return false;
      const event = validateMilestone(input),
        eventId = pilotEventId(`${view.taskId}:${event.eventId}`),
        data = view.data;
      if (data.events.some((e) => e.eventId === eventId)) return false;
      if (data.events.length >= PILOT_LIMITS.events) {
        publish({
          ...view,
          error:
            "Event limit reached. Export and clear explicitly; capture is paused.",
        });
        return false;
      }
      const elapsed = now() - origin,
        relativeTimeMs = Math.max(
          data.events.at(-1)?.relativeTimeMs ?? 0,
          offset +
            Math.floor(Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0),
        );
      write({
        ...data,
        events: [
          ...data.events,
          {
            ...event,
            eventId,
            participantId: data.participantId,
            taskId: view.taskId,
            sequence: data.events.length + 1,
            relativeTimeMs,
          },
        ],
      });
      return true;
    },
    note: (
      input: Omit<PilotObservation, "participantId" | "sequence" | "taskId">,
    ) => {
      if (!enabled || !view.data || !view.taskId) return false;
      const data = view.data;
      if (
        data.observations.length >= PILOT_LIMITS.observations ||
        data.events.length >= PILOT_LIMITS.events
      ) {
        publish({
          ...view,
          error:
            "Capture limit reached. Export and clear explicitly before recording more observations.",
        });
        return false;
      }
      const observation = validateObservation({
        ...input,
        participantId: data.participantId,
        taskId: view.taskId,
        sequence: data.observations.length + 1,
      });
      if (observation.note && !data.consent.notes)
        throw Error(
          "Separate permission for free notes/direct quotes is required.",
        );
      write({ ...data, observations: [...data.observations, observation] });
      recorder.record({
        eventId: pilotEventId(`note:${observation.sequence}`),
        eventType: "facilitator-note",
      });
      return true;
    },
    export: () => {
      if (!enabled || !view.data)
        throw Error("Start a consented participant first.");
      return serializePilotExport(view.data);
    },
    clear: (id: string) => {
      if (!enabled || !isParticipantId(id)) return false;
      try {
        const removable = storage as ProfileStorage & {
          removeItem?: (k: string) => void;
        };
        if (removable.removeItem) removable.removeItem(pilotDataKey(id));
        else storage.setItem(pilotDataKey(id), "");
      } catch {
        publish({
          ...view,
          error:
            "Could not clear stored study data; close this visit only after exporting.",
        });
        return false;
      }
      cached.delete(id);
      if (view.data?.participantId === id) recorder.stop();
      return true;
    },
  };
  return recorder;
}
export type PilotRecorder = ReturnType<typeof createPilotRecorder>;
