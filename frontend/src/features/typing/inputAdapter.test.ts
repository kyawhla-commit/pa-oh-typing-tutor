import { describe, expect, it } from "vitest";
import { createTypingEngine } from "../../engine/typing";
import { attachTypingInput } from "./inputAdapter";

class Input extends EventTarget {
  value = "";
  selectionStart = 0;
  selectionEnd = 0;
  focused = false;
  setSelectionRange(start: number, end: number) { this.selectionStart = start; this.selectionEnd = end; }
  focus() { if (!this.focused) { this.focused = true; this.dispatchEvent(new Event("focus")); } }
}
function setup(targetText = "Hello, world!\n😀é", durationMs?: number) {
  const input = new Input();
  const engine = createTypingEngine(durationMs === undefined ? { targetText } : { mode: "timed", targetText, durationMs, textPolicy: "repeat-corpus" });
  let time = 0;
  const adapter = attachTypingInput(input as unknown as HTMLTextAreaElement, {
    insertText: (text) => engine.dispatch({ type: "INSERT_TEXT", text, atMs: time++ }),
    deleteBackward: () => engine.dispatch({ type: "DELETE_BACKWARD", atMs: time++ }),
  });
  const send = (type: string, properties: Record<string, unknown> = {}, cancelable = true) => {
    const event = new Event(type, { cancelable });
    for (const [key, value] of Object.entries(properties)) Object.defineProperty(event, key, { value });
    input.dispatchEvent(event);
    return event;
  };
  const before = (inputType: string, data: string | null = null, cancelable = true) => send("beforeinput", { inputType, data }, cancelable);
  return { input, engine, adapter, send, before, setTime: (next: number) => { time = next; } };
}

describe("browser committed-text adapter", () => {
  it("does not retrigger selection indefinitely when setSelectionRange emits select", () => {
    class SelectingInput extends Input {
      selectionUpdates = 0;
      setSelectionRange(start: number, end: number) {
        super.setSelectionRange(start, end);
        this.selectionUpdates++;
        this.dispatchEvent(new Event("select"));
      }
    }
    const input = new SelectingInput();
    const adapter = attachTypingInput(input as unknown as HTMLTextAreaElement, {
      insertText: () => {}, deleteBackward: () => {},
    });
    expect(input.selectionUpdates).toBe(0);
    input.value = "draft";
    input.selectionStart = 0; input.selectionEnd = 2;
    input.dispatchEvent(new Event("select"));
    expect(input.selectionUpdates).toBe(1);
    expect(input.selectionStart).toBe(5);
    input.dispatchEvent(new Event("select"));
    expect(input.selectionUpdates).toBe(1);
    adapter.dispose();
  });
  it("uses a keyboard hint for missing inputType without scoring keydown or its echo twice", () => {
    const { send, input, engine } = setup("abc");
    send("keydown", { key: "a" });
    expect(engine.getSnapshot().currentPosition).toBe(0);
    expect(send("beforeinput", { inputType: "", data: "a" }).defaultPrevented).toBe(true);
    send("input", { inputType: "", data: "a" });
    expect(engine.getSnapshot().counts.totalInsertionAttempts).toBe(1);
    send("keydown", { key: "b" });
    input.value = "b";
    send("input", { inputType: "", data: null });
    expect(engine.getSnapshot().currentPosition).toBe(2);
  });
  it.each(["insertText", ""])("waits for native text when cancelable beforeinput has no data (%s)", type => {
    const { send, input, engine } = setup("a!");
    send("keydown", { key: "a" });
    expect(send("beforeinput", { inputType: type, data: null }).defaultPrevented).toBe(false);
    expect(engine.getSnapshot().currentPosition).toBe(0);
    input.value = "a";
    input.setSelectionRange(1, 1);
    send("input", { inputType: type, data: null });
    expect(engine.getSnapshot().typedUnits).toEqual([{ text: "a", correct: true }]);
    expect(input.value).toBe("");
  });
  it("does not reinterpret unsupported edits, shortcuts, or unpaired unknown input as typing", () => {
    const { send, input, engine } = setup("abc");
    input.value = "a";
    send("input", { inputType: "", data: "a" });
    send("keydown", { key: "v", ctrlKey: true });
    send("beforeinput", { inputType: "", data: "a" });
    send("keydown", { key: "a" });
    send("beforeinput", { inputType: "insertFromPaste", data: "a" });
    send("input", { inputType: "", data: "a" });
    expect(engine.getSnapshot().currentPosition).toBe(0);
  });
  it("invalidates a pending keyboard hint on paste, blur, and pointer interaction", () => {
    const { send, input, engine } = setup("abc");
    for (const interruption of ["paste", "blur", "pointerdown"]) {
      send("keydown", { key: "a" });
      send(interruption);
      input.value = "a";
      send("input", { inputType: "", data: "a" });
    }
    expect(engine.getSnapshot().currentPosition).toBe(0);
  });
  it("handles Enter with missing inputType as a single committed newline", () => {
    const { send, engine } = setup("\n!");
    send("keydown", { key: "Enter" });
    send("beforeinput", { inputType: "", data: null });
    send("input", { inputType: "", data: null });
    expect(engine.getSnapshot().typedUnits).toEqual([{ text: "\n", correct: true }]);
    expect(engine.getSnapshot().counts.totalInsertionAttempts).toBe(1);
  });
  it("preserves cancelled composition semantics with a native draft in the textarea", () => {
    const { send, input, engine } = setup("က!");
    send("compositionstart");
    input.value = "က";
    send("input", { inputType: "insertCompositionText", data: "က", isComposing: true });
    send("compositionend", { data: "" });
    send("input", { inputType: "", data: "က" });
    expect(engine.getSnapshot().counts.totalInsertionAttempts).toBe(0);
    expect(input.value).toBe("");
  });
  it.each(["H", " ", ",", "hello", "😀", "e\u0301"])("translates committed %s without character keydown scoring", (text) => {
    const { engine, send, before } = setup(text + "!");
    send("keydown", { key: text });
    expect(engine.getSnapshot().counts.totalInsertionAttempts).toBe(0);
    expect(before("insertText", text).defaultPrevented).toBe(true);
    expect(engine.getSnapshot().typedUnits.map((unit) => unit.text).join("")).toBe(text);
    expect(engine.getSnapshot().counts.incorrectInsertionAttempts).toBe(0);
  });
  it.each(["insertLineBreak", "insertParagraph"])("translates %s into a newline", (type) => {
    const { engine, before, send } = setup("\n!");
    send("keydown", { key: "Enter" });
    before(type);
    expect(engine.getSnapshot().typedUnits).toEqual([{ text: "\n", correct: true }]);
  });
  it("suppresses an input echo after cancelable beforeinput", () => {
    const { before, send, engine } = setup("aa");
    before("insertText", "a");
    send("input", { inputType: "insertText", data: "a" });
    before("insertText", "a");
    expect(engine.getResult()?.counts.totalInsertionAttempts).toBe(2);
  });
  it("uses input as fallback after noncancelable beforeinput", () => {
    const { before, send, engine, input } = setup("a!");
    before("insertText", "a", false);
    expect(engine.getSnapshot().currentPosition).toBe(0);
    input.value = "a";
    send("input", { inputType: "insertText", data: null });
    expect(engine.getSnapshot().currentPosition).toBe(1);
    expect(input.value).toBe("");
  });
  it("handles backward delete with and without a command keydown", () => {
    const { before, send, engine } = setup("abc");
    before("insertText", "ab");
    expect(send("keydown", { key: "Backspace" }).defaultPrevented).toBe(true);
    before("deleteContentBackward");
    send("input", { inputType: "deleteContentBackward", data: null });
    expect(engine.getSnapshot().counts.backspaces).toBe(1);
    before("deleteContentBackward");
    expect(engine.getSnapshot().currentPosition).toBe(0);
    expect(engine.getSnapshot().counts.backspaces).toBe(2);
  });
  it("scores composition once, ignoring updates and intermediate input", () => {
    const { send, before, input, engine } = setup("日本!");
    send("compositionstart");
    send("compositionupdate", { data: "に" });
    before("insertCompositionText", "に");
    input.value = "に";
    send("input", { inputType: "insertCompositionText", data: "に", isComposing: true });
    send("compositionupdate", { data: "日本" });
    // Some browsers report final input before compositionend.
    send("input", { inputType: "insertText", data: "日本", isComposing: false });
    expect(engine.getSnapshot().counts.totalInsertionAttempts).toBe(0);
    send("compositionend", { data: "日本" });
    before("insertFromComposition", "日本");
    send("input", { inputType: "insertFromComposition", data: "日本" });
    expect(engine.getSnapshot().counts).toMatchObject({ totalInsertionAttempts: 2, incorrectInsertionAttempts: 0 });
    expect(input.value).toBe("");
  });
  it("suppresses composition echoes without data, including noncancelable final input", () => {
    const { send, before, input, engine } = setup("aa!");
    send("compositionstart"); send("compositionend", { data: "a" });
    before("insertText", null, false); input.value = "a";
    send("input", { inputType: "insertText", data: null });
    send("compositionstart"); send("compositionend", { data: "a" });
    input.value = "a"; send("input", { inputType: "insertFromComposition", data: null });
    expect(engine.getSnapshot().counts.totalInsertionAttempts).toBe(2);
  });
  it("does not suppress a new identical composition or ordinary insertion", () => {
    const { send, before, engine } = setup("aaa!");
    send("compositionstart"); send("compositionend", { data: "a" });
    before("insertText", "a"); // final echo (cancelled, so no input event)
    before("insertText", "a"); // next mobile committed insertion
    send("compositionstart"); send("compositionend", { data: "a" });
    expect(engine.getSnapshot().counts.totalInsertionAttempts).toBe(3);
  });
  it("leaves draft selection to the IME and rejects unsupported edits during composition", () => {
    const { send, before, input, engine } = setup();
    send("compositionstart"); input.value = "draft"; input.setSelectionRange(0, 3); send("select");
    expect(input.selectionStart).toBe(0); expect(input.selectionEnd).toBe(3);
    before("insertFromPaste", "BAD", false);
    send("input", { inputType: "insertFromPaste", data: "BAD", isComposing: true });
    send("compositionend", { data: "BAD" });
    expect(engine.getSnapshot().status).toBe("ready");
  });
  it("ignores cancelled composition", () => {
    const { send, engine } = setup();
    send("compositionstart"); send("compositionupdate", { data: "abc" }); send("compositionend", { data: "" });
    expect(engine.getSnapshot().status).toBe("ready");
  });
  it.each(["paste", "drop", "cut"])("prevents %s", (type) => {
    const { send, engine } = setup();
    expect(send(type).defaultPrevented).toBe(true);
    expect(engine.getSnapshot().counts.totalInsertionAttempts).toBe(0);
  });
  it.each(["insertFromPaste", "insertFromDrop", "insertReplacementText", "deleteContentForward", "deleteWordBackward", "historyUndo", "historyRedo"])("rejects %s including noncancelable input fallback", (inputType) => {
    const { send, before, input, engine } = setup();
    before("insertText", "H");
    const snapshot = engine.getSnapshot();
    before(inputType, "BAD", false);
    input.value = "BAD";
    send("input", { inputType, data: "BAD" });
    expect(engine.getSnapshot()).toBe(snapshot);
    expect(input.value).toBe("");
  });
  it("rejects unsupported selection replacement and anchors cursor movement", () => {
    const { input, before, send, engine } = setup();
    input.value = "draft"; input.setSelectionRange(0, 3);
    expect(before("insertText", "BAD").defaultPrevented).toBe(true);
    send("input", { inputType: "insertText", data: "BAD" });
    expect(engine.getSnapshot().currentPosition).toBe(0);
    expect(send("keydown", { key: "ArrowLeft" }).defaultPrevented).toBe(true);
    input.value = "draft"; input.setSelectionRange(0, 1); send("select");
    expect(input.selectionStart).toBe(5); expect(input.selectionEnd).toBe(5);
  });
  it("keeps completed input immutable and supports wrong-final correction", () => {
    const { before, send, engine } = setup("hello");
    before("insertText", "hellp"); expect(engine.getResult()).toBeNull();
    send("keydown", { key: "Backspace" }); before("insertText", "o");
    const result = engine.getResult();
    expect(result?.counts.incorrectInsertionAttempts).toBe(1);
    before("insertText", "x"); send("keydown", { key: "Backspace" });
    expect(engine.getResult()).toBe(result);
  });
  it("blur/refocus cancels draft without pausing or duplicating listeners", () => {
    const { before, send, adapter, engine } = setup("abc");
    before("insertText", "a"); send("compositionstart"); send("blur");
    send("compositionend", { data: "BAD" });
    send("focus"); send("blur"); send("focus"); before("insertText", "b");
    expect(engine.getSnapshot()).toMatchObject({ status: "running", currentPosition: 2 });
    expect(engine.getSnapshot().counts.totalInsertionAttempts).toBe(2);
    adapter.dispose(); before("insertText", "c");
    expect(engine.getSnapshot().currentPosition).toBe(2);
  });
  it("reset clears pending composition, scratch text, and restores local focus", () => {
    const { input, send, adapter, before, engine } = setup("abc");
    send("compositionstart"); input.value = "draft"; engine.reset(); adapter.reset(); adapter.focus();
    send("compositionend", { data: "draft" }); before("insertText", "a");
    expect(input.focused).toBe(true); expect(input.value).toBe("");
    expect(engine.getSnapshot().counts.totalInsertionAttempts).toBe(1);
  });
});


describe("adapter with timed engine", () => {
  it("does not start the allowance during IME previews and scores final commit once", () => {
    const { send, before, engine, setTime } = setup("é ", 1000);
    send("compositionstart"); send("input", { inputType: "insertCompositionText", data: "e", isComposing: true });
    setTime(5000); expect(engine.getSnapshot().status).toBe("ready");
    send("compositionend", { data: "é" }); before("insertFromComposition", "é");
    expect(engine.getSnapshot()).toMatchObject({ startedAtMs: 5000, counts: { totalInsertionAttempts: 1 } });
  });
  it("rejects composition committed at the deadline and keeps prior attempts", () => {
    const { before, send, engine, setTime } = setup("aé ", 1000);
    before("insertText", "a"); send("compositionstart");
    send("input", { inputType: "insertCompositionText", data: "é", isComposing: true });
    setTime(1000); send("compositionend", { data: "é" });
    expect(engine.getResult()).toMatchObject({ completionReason: "time-expired", activeElapsedMs: 1000, counts: { totalInsertionAttempts: 1 } });
  });
  it("late Backspace finalizes without deleting, even when no TICK ran", () => {
    const { before, send, engine, setTime } = setup("ab ", 1000);
    before("insertText", "a"); setTime(1001); send("keydown", { key: "Backspace" });
    expect(engine.getResult()).toMatchObject({ counts: { currentTypedUnits: 1, backspaces: 0 }, completedAtMs: 1000 });
  });
});
