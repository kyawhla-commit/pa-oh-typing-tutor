import {
  StrictMode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createRoot } from "react-dom/client";
import {
  createPilotRecorder,
  pilotEventId,
  type PilotRecorder,
} from "../../../src/features/pilot/recorder";
import {
  installPilotFixture,
  resetStudyLearning,
} from "../../../src/features/pilot/fixtures";
import {
  TASKS,
  CONFUSION_TAGS,
  FIXTURES,
  type TaskId,
  type FixtureId,
  isParticipantId,
} from "../../../src/features/pilot/tasks";
import type { PilotObservation } from "../../../src/features/pilot/types";
import "../../../src/index.css";
const browserRecorder = createPilotRecorder(
  localStorage,
  () => performance.now(),
  true,
);
const button =
  "rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50";
const input =
  "w-full rounded-md border border-slate-400 bg-white p-2 text-sm text-slate-900";
export function Facilitator({
  recorder = browserRecorder,
}: {
  recorder?: PilotRecorder;
}) {
  const view = useSyncExternalStore(
    recorder.subscribe,
    recorder.getSnapshot,
    recorder.getSnapshot,
  );
  const [pid, setPid] = useState("P01"),
    [participation, setParticipation] = useState(false),
    [notes, setNotes] = useState(false),
    [audio, setAudio] = useState(false),
    [video, setVideo] = useState(false),
    [screen, setScreen] = useState(false),
    [rehearsal, setRehearsal] = useState(true);
  const [taskId, setTaskId] = useState<TaskId>("T01"),
    [fixture, setFixture] = useState<FixtureId>("no-weakness"),
    [epoch, setEpoch] = useState<string | null>(null),
    [status, setStatus] = useState(
      "No capture until a consented pseudonym and task are active.",
    );
  const [outcome, setOutcome] =
      useState<PilotObservation["outcome"]>("success"),
    [wrongClicks, setWrongClicks] = useState("0"),
    [help, setHelp] = useState(false),
    [explanation, setExplanation] =
      useState<PilotObservation["explanationAccuracy"]>("not-asked"),
    [tags, setTags] = useState<string[]>([]),
    [note, setNote] = useState(""),
    [reviewed, setReviewed] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const active = view.data?.participantId;
  const safely = (job: () => void) => {
    try {
      job();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Study operation failed.",
      );
    }
  };
  useEffect(() => {
    const handle = (message: MessageEvent) => {
      if (
        message.origin !== location.origin ||
        message.source !== frame.current?.contentWindow
      )
        return;
      const value = message.data;
      if (
        !value ||
        Object.keys(value).sort().join(",") !==
          "channel,epoch,event,participantId,taskId" ||
        value.channel !== "typing-pilot:v1" ||
        value.epoch !== epoch ||
        value.participantId !== active ||
        value.taskId !== view.taskId
      )
        return;
      safely(() => {
        recorder.record(value.event);
      });
    };
    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, [epoch, active, view.taskId]);
  const load = (selected: FixtureId) => {
    if (!active || !view.taskId)
      throw Error("Start a participant and task first.");
    const next = crypto.randomUUID();
    installPilotFixture(localStorage, active, next, selected, true);
    setEpoch(next);
    setFixture(selected);
    recorder.record({
      eventId: pilotEventId(`fixture:${next}`),
      eventType: "fixture-loaded",
      fixture: selected,
    });
    setStatus(
      `Synthetic ${selected} starting state loaded. Observation data retained.`,
    );
  };
  const clearDraft = () => {
    setNote("");
    setTags([]);
    setWrongClicks("0");
    setHelp(false);
    setOutcome("success");
    setExplanation("not-asked");
    setReviewed(false);
  };
  const start = () =>
    safely(() => {
      if (
        recorder.startParticipant(
          pid,
          { participation, notes, audio, video, screen },
          rehearsal ? "engineering-rehearsal" : "consented-pilot",
        )
      ) {
        setEpoch(null);
        clearDraft();
        setStatus(`Active pseudonym ${pid}. Choose and start a task.`);
      } else
        setStatus(
          recorder.getSnapshot().error ??
            "Use P01–P99 and confirm participation consent.",
        );
    });
  const beginTask = () =>
    safely(() => {
      if (!recorder.startTask(taskId))
        throw Error("Capture requires an active consented participant.");
      const selected = TASKS.find((t) => t.id === taskId)!.fixture;
      const next = crypto.randomUUID();
      installPilotFixture(localStorage, active!, next, selected, true);
      setEpoch(next);
      setFixture(selected);
      recorder.record({
        eventId: pilotEventId(`fixture:${next}`),
        eventType: "fixture-loaded",
        fixture: selected,
      });
      setStatus(
        `${taskId} active. Read the neutral prompt; synthetic starting history is labelled.`,
      );
    });
  const saveNote = () =>
    safely(() => {
      if (note && !reviewed)
        throw Error(
          "Review the note for identifying details and passage text first.",
        );
      if (
        recorder.note({
          outcome,
          wrongClicks: Number(wrongClicks),
          helpNeeded: help,
          explanationAccuracy: explanation,
          confusionTags: tags as PilotObservation["confusionTags"],
          note,
        })
      ) {
        setStatus(
          "Manual observation recorded. No confusion was inferred automatically.",
        );
        setNote("");
        setReviewed(false);
      } else
        throw Error(
          recorder.getSnapshot().error ??
            "Start a task before recording an observation.",
        );
    });
  const exportData = () =>
    safely(() => {
      const text = recorder.export(),
        url = URL.createObjectURL(
          new Blob([text], { type: "application/json" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = `typing-pilot-v1-${active}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(`Local JSON exported for ${active}. No upload occurred.`);
    });
  const clear = () =>
    safely(() => {
      const id = active ?? pid;
      if (!isParticipantId(id)) throw Error("Use P01–P99.");
      setEpoch(null);
      resetStudyLearning(localStorage, id);
      if (!recorder.clear(id))
        throw Error("Stored observations could not be cleared.");
      clearDraft();
      setStatus(
        `Cleared ${id} study observations and owned learning keys only.`,
      );
    });
  const task = TASKS.find((t) => t.id === taskId)!;
  return (
    <main className="mx-auto max-w-7xl p-4 text-slate-900">
      <h1 className="text-xl font-semibold">Local pilot facilitator</h1>
      <p className="my-2 text-sm">
        Development/study only. No recruitment, upload or recording. Engineering
        rehearsal is the default; this workspace does not establish that a human
        pilot occurred.
      </p>
      <details className="mb-4 rounded-lg border border-slate-300 p-3">
        <summary>Read the consent script</summary>
        <p className="mt-2 text-sm">
          This is an optional product usability test, not an academic or medical
          assessment. We will observe typing performance and how you use
          recommendations, which may be based on typing mistakes. You may stop
          at any time. We use observations to improve the product. Please use
          the provided practice text and do not share private text, names,
          accounts or credentials. Nothing is secretly recorded. Brief free
          notes or direct quotes need separate permission. Any audio, video or
          screen recording also needs separate explicit consent; this tool
          records none of those.
        </p>
      </details>
      <section
        aria-label="Facilitator controls"
        className="rounded-lg border border-slate-300 bg-slate-50 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Participant pseudonym
            <input
              className={input}
              value={pid}
              onChange={(e) => setPid(e.target.value)}
              placeholder="P01"
              maxLength={3}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rehearsal}
              onChange={(e) => setRehearsal(e.target.checked)}
            />
            Engineering rehearsal — no real participant
          </label>
        </div>
        <div className="my-3 flex flex-wrap gap-4">
          {[
            [
              participation,
              setParticipation,
              "Participant gave voluntary participation consent",
            ],
            [
              notes,
              setNotes,
              "Separate permission for free notes/direct quotes",
            ],
            [audio, setAudio, "Separate audio recording permission"],
            [video, setVideo, "Separate video recording permission"],
            [screen, setScreen, "Separate screen recording permission"],
          ].map(([checked, setter, label]) => (
            <label
              key={String(label)}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={checked as boolean}
                onChange={(e) =>
                  (setter as (v: boolean) => void)(e.target.checked)
                }
              />
              {label as string}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={button}
            onClick={start}
            disabled={!isParticipantId(pid) || !participation}
          >
            Start participant
          </button>
          <button
            type="button"
            className={button}
            disabled={!active}
            onClick={() => {
              setEpoch(null);
              recorder.stop();
              setStatus(
                "Capture stopped. Exported/stored observations were not deleted.",
              );
            }}
          >
            Stop capture
          </button>
          <button
            type="button"
            className={button}
            disabled={!active}
            onClick={exportData}
          >
            Export local JSON
          </button>
          <button
            type="button"
            className={button}
            disabled={!active && !isParticipantId(pid)}
            onClick={clear}
          >
            Clear participant study data
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            Task
            <select
              className={input}
              aria-label="Task"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value as TaskId)}
            >
              {TASKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id} · {t.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Synthetic fixture
            <select
              className={input}
              aria-label="Synthetic fixture"
              value={fixture}
              onChange={(e) => setFixture(e.target.value as FixtureId)}
            >
              {FIXTURES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="my-2 text-sm">
          <strong>Neutral prompt:</strong> {task.prompt}
        </p>
        <p className="mb-3 text-sm">
          <strong>Predefined criterion:</strong> {task.criterion}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={button}
            disabled={!active}
            onClick={beginTask}
          >
            Start task with its fixture
          </button>
          <button
            type="button"
            className={button}
            disabled={!active || !view.taskId}
            onClick={() => safely(() => load(fixture))}
          >
            Load selected synthetic fixture
          </button>
          <button
            type="button"
            className={button}
            disabled={!active}
            onClick={() =>
              safely(() => {
                setEpoch(null);
                resetStudyLearning(localStorage, active!);
                setStatus(
                  "Owned study learning state reset. Observation data retained. Load a task fixture to continue.",
                );
              })
            }
          >
            Reset study learning only
          </button>
        </div>
        <p role="status" className="mt-3 text-sm">
          {view.error ?? status}
        </p>
        <output aria-label="Study capture counts" className="text-sm">
          Participant: {active ?? "none"}; active task: {view.taskId ?? "none"};
          events: {view.data?.events.length ?? 0}; observations:{" "}
          {view.data?.observations.length ?? 0}
        </output>
        <details className="mt-4">
          <summary>Record a manual task observation</summary>
          <p className="my-2 text-sm">
            Usability task outcome, independent of learning mastery. Do not
            enter names, emails, credentials or typing passages.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              Task outcome
              <select
                className={input}
                aria-label="Task outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as typeof outcome)}
              >
                {["success", "success-with-help", "failed", "abandoned"].map(
                  (x) => (
                    <option key={x}>{x}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Wrong clicks
              <input
                className={input}
                type="number"
                min="0"
                max="100"
                value={wrongClicks}
                onChange={(e) => setWrongClicks(e.target.value)}
              />
            </label>
            <label>
              Explanation accuracy
              <select
                className={input}
                aria-label="Explanation accuracy"
                value={explanation}
                onChange={(e) =>
                  setExplanation(e.target.value as typeof explanation)
                }
              >
                {["accurate", "partial", "unclear", "not-asked"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={help}
                onChange={(e) => setHelp(e.target.checked)}
              />
              Facilitator help needed
            </label>
          </div>
          <fieldset className="my-3">
            <legend>Manually observed confusion tags</legend>
            <div className="flex flex-wrap gap-3">
              {CONFUSION_TAGS.map((tag) => (
                <label key={tag} className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tags.includes(tag)}
                    onChange={(e) =>
                      setTags(
                        e.target.checked
                          ? [...tags, tag]
                          : tags.filter((t) => t !== tag),
                      )
                    }
                  />
                  {tag}
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            Optional qualitative note
            <textarea
              aria-label="Optional qualitative note"
              className={input}
              maxLength={500}
              value={note}
              disabled={!view.data?.consent.notes}
              onChange={(e) => {
                setNote(e.target.value);
                setReviewed(false);
              }}
            />
          </label>
          <label className="my-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            I reviewed the note: no identifiers, credentials or typing passages
          </label>
          <button
            type="button"
            className={button}
            onClick={saveNote}
            disabled={!active || !view.taskId}
          >
            Record observation
          </button>
        </details>
      </section>
      {active && epoch && view.taskId ? (
        <section aria-label="Participant workspace" className="mt-5">
          <h2 className="mb-2 font-semibold">Participant view · {active}</h2>
          <iframe
            ref={frame}
            key={epoch}
            title="Study participant view"
            className="h-[900px] w-full rounded-lg border border-slate-300"
            src={`./participant.html?participant=${active}&epoch=${epoch}&task=${view.taskId}`}
          />
        </section>
      ) : (
        <p className="my-6">
          Participant view opens after consent and explicit task start.
        </p>
      )}
    </main>
  );
}
export function mountPilot() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Facilitator />
    </StrictMode>,
  );
}
