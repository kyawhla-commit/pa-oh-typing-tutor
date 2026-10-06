// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { Facilitator } from "../../../tests/browser/pilot/facilitator";
import { createPilotRecorder, pilotDataKey } from "./recorder";
import { profileStorageKey } from "../learning/storage";
import { scopeRegistryKey, studyScope } from "./fixtures";
let root: Root,
  host: HTMLDivElement,
  recorder: ReturnType<typeof createPilotRecorder>;
const button = (text: string) =>
  Array.from(host.querySelectorAll("button")).find(
    (b) => b.textContent === text,
  )!;
const field = (text: string) =>
  Array.from(host.querySelectorAll("label"))
    .find((l) => l.textContent?.startsWith(text))!
    .querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input,select,textarea",
    )!;
function change(text: string, value: string) {
  act(() => {
    const el = field(text),
      proto =
        el instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : el instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(
      new Event(el instanceof HTMLSelectElement ? "change" : "input", {
        bubbles: true,
      }),
    );
  });
}
function click(text: string) {
  act(() => button(text).click());
}
function check(text: string) {
  act(() => (field(text) as HTMLInputElement).click());
}
function start() {
  check("Participant gave");
  click("Start participant");
  click("Start task with its fixture");
}
beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  recorder = createPilotRecorder(localStorage, () => 0, true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root.render(
      <StrictMode>
        <Facilitator recorder={recorder} />
      </StrictMode>,
    ),
  );
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});
describe("facilitator controls", () => {
  it("requires a valid pseudonym and independent participation consent; does not open a frame early", () => {
    expect(button("Start participant").disabled).toBe(true);
    check("Separate audio");
    expect(button("Start participant").disabled).toBe(true);
    check("Participant gave");
    change("Participant pseudonym", "bad");
    expect(button("Start participant").disabled).toBe(true);
    change("Participant pseudonym", "P01");
    click("Start participant");
    expect(recorder.getSnapshot().data?.consent).toEqual({
      participation: true,
      notes: false,
      audio: true,
      video: false,
      screen: false,
    });
    expect(host.querySelector("iframe")).toBeNull();
  });
  it("explicit task start loads an owned synthetic scope while observations remain separate", () => {
    start();
    expect(host.querySelector("iframe")?.src).toContain("participant=P01");
    expect(recorder.getSnapshot().data?.events.map((x) => x.eventType)).toEqual(
      ["task-started", "fixture-loaded"],
    );
    expect(localStorage.getItem(scopeRegistryKey("P01"))).not.toBeNull();
  });
  it("structured observations work without free-note consent and never infer confusion", () => {
    start();
    expect(
      (field("Optional qualitative") as HTMLTextAreaElement).disabled,
    ).toBe(true);
    click("Record observation");
    expect(recorder.getSnapshot().data?.observations[0]).toMatchObject({
      outcome: "success",
      helpNeeded: false,
      confusionTags: [],
      note: "",
    });
  });
  it("free notes require review and identifying text is rejected after review", () => {
    check("Separate permission for free");
    start();
    change("Optional qualitative", "A neutral observed wording issue");
    click("Record observation");
    expect(recorder.getSnapshot().data?.observations).toHaveLength(0);
    check("I reviewed");
    click("Record observation");
    expect(recorder.getSnapshot().data?.observations).toHaveLength(1);
    change("Optional qualitative", "person@example.com");
    check("I reviewed");
    click("Record observation");
    expect(recorder.getSnapshot().data?.observations).toHaveLength(1);
    expect(host.textContent).toContain("Invalid or private pilot data");
  });
  it("switching participants clears the entire unsubmitted observation draft", () => {
    check("Separate permission for free");
    start();
    change("Optional qualitative", "Draft for previous participant");
    check("wording");
    change("Wrong clicks", "2");
    change("Participant pseudonym", "P02");
    click("Start participant");
    expect(field("Optional qualitative").value).toBe("");
    expect(field("Wrong clicks").value).toBe("0");
    expect((field("wording") as HTMLInputElement).checked).toBe(false);
    expect(recorder.getSnapshot().data?.participantId).toBe("P02");
  });
  it("learning-only reset retains observations; participant clear preserves unrelated data", () => {
    start();
    click("Record observation");
    const registry = JSON.parse(localStorage.getItem(scopeRegistryKey("P01"))!),
      scope = studyScope("P01", registry.epoch);
    localStorage.setItem("ordinary-account", "KEEP");
    localStorage.setItem(pilotDataKey("P02"), "OTHER");
    click("Reset study learning only");
    expect(localStorage.getItem(profileStorageKey(scope))).toBeNull();
    expect(recorder.getSnapshot().data?.observations).toHaveLength(1);
    expect(host.querySelector("iframe")).toBeNull();
    click("Clear participant study data");
    expect(localStorage.getItem(pilotDataKey("P01"))).toBeNull();
    expect(localStorage.getItem(pilotDataKey("P02"))).toBe("OTHER");
    expect(localStorage.getItem("ordinary-account")).toBe("KEEP");
  });
  it("can explicitly clear corrupt selected participant data without an active capture", () => {
    localStorage.setItem(pilotDataKey("P01"), "bad json");
    check("Participant gave");
    click("Start participant");
    expect(recorder.getSnapshot().data).toBeNull();
    expect(host.textContent).toContain("Stored study data is invalid");
    click("Clear participant study data");
    expect(localStorage.getItem(pilotDataKey("P01"))).toBeNull();
    click("Start participant");
    expect(recorder.getSnapshot().data?.participantId).toBe("P01");
  });
  it("stop capture removes participant workspace and retains the locally saved capture", () => {
    start();
    click("Stop capture");
    expect(recorder.getSnapshot().data).toBeNull();
    expect(host.querySelector("iframe")).toBeNull();
    expect(localStorage.getItem(pilotDataKey("P01"))).not.toBeNull();
    expect(button("Export local JSON").disabled).toBe(true);
  });
});
