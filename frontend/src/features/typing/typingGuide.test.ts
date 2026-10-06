import { describe, expect, it } from "vitest";
import { createTypingEngine } from "../../engine/typing";
import { getTypingGuide, hasMyanmarText, inputPreview, keysForText, nextGuideKey } from "./typingGuide";

describe("Myanmar teaching hints", () => {
  it("uses the checked PaOh direct outputs, including the corrected Shift+R and minus", () => {
    expect(keysForText("နို့ ၎-ꩻ", "Pa'O")?.map(({ code, shift }) => [code, shift])).toEqual([
      ["KeyE", false], ["KeyD", false], ["KeyK", false], ["KeyH", false],
      ["Space", false], ["KeyR", true], ["Minus", false], ["Comma", false],
    ]);
    expect(keysForText("ီ\n", "Pa'O")).toMatchObject([
      { code: "KeyD", label: "D", shift: true }, { code: "Enter", shift: false },
    ]);
  });
  it("never guesses keys for unknown layouts, unsupported output or Tab navigation", () => {
    expect(keysForText("န", "QWERTY")).toBeNull();
    expect(keysForText("န", "Myanmar3")).toBeNull();
    expect(keysForText("န😀", "Pa'O")).toBeNull();
    expect(keysForText("−", "Pa'O")).toBeNull();
    expect(keysForText("\t", "Pa'O")).toBeNull();
    expect(keysForText("\r\n", "Pa'O")).toBeNull();
  });
  it("decorates standalone marks and whitespace only in previews", () => {
    expect(inputPreview("ိ")).toBe("◌ိ");
    expect(inputPreview("နို့")).toBe("နို့");
    expect(inputPreview(" ")).toBe("Space ␣");
    expect(inputPreview("\r\n")).toBe("Enter ↵");
    expect(hasMyanmarText("နို့ꩻ")).toBe(true);
    expect(hasMyanmarText("abc")).toBe(false);
  });
  it("guides split base and mark commits within the previous grapheme without changing scoring", () => {
    const engine = createTypingEngine({ targetText: "နို့ ကာ" });
    engine.dispatch({ type: "INSERT_TEXT", text: "န", atMs: 0 });
    const snapshot = engine.getSnapshot();
    expect(getTypingGuide(snapshot)).toMatchObject({ position: 0, expected: "နို့", remaining: "ို့", partial: true, mistake: false, context: "နို့" });
    expect(nextGuideKey(snapshot, "Pa'O")).toMatchObject({ code: "KeyD", shift: false });
    // Hints cannot rewrite the engine's existing revision-attempt history.
    expect(snapshot.counts.incorrectInsertionAttempts).toBe(1);
    expect(engine.getSnapshot()).toBe(snapshot);
    engine.dispatch({ type: "INSERT_TEXT", text: "ို့", atMs: 1 });
    expect(getTypingGuide(engine.getSnapshot())).toMatchObject({ position: 1, expected: " ", partial: false });
    expect(nextGuideKey(engine.getSnapshot(), "Pa'O")?.code).toBe("Space");
    expect(engine.getSnapshot().typedUnits[0].correct).toBe(true);
  });
  it("explains a wrong group and returns to the target after deletion", () => {
    const engine = createTypingEngine({ targetText: "နို့ ကာ" });
    engine.dispatch({ type: "INSERT_TEXT", text: "မ", atMs: 0 });
    expect(getTypingGuide(engine.getSnapshot())).toMatchObject({ position: 0, expected: "နို့", actual: "မ", mistake: true, partial: false });
    expect(nextGuideKey(engine.getSnapshot(), "Pa'O")?.code).toBe("Backspace");
    engine.dispatch({ type: "DELETE_BACKWARD", atMs: 1 });
    expect(nextGuideKey(engine.getSnapshot(), "Pa'O")?.code).toBe("KeyE");
  });
  it("bounds unspaced context, respects restart, and hides hints after completion", () => {
    const engine = createTypingEngine({ targetText: "က".repeat(30) });
    engine.dispatch({ type: "INSERT_TEXT", text: "က".repeat(15), atMs: 0 });
    expect(getTypingGuide(engine.getSnapshot())?.context).toBe(`…${"က".repeat(11)}…`);
    engine.reset({ targetText: "န" });
    expect(nextGuideKey(engine.getSnapshot(), "Pa'O")?.code).toBe("KeyE");
    engine.dispatch({ type: "INSERT_TEXT", text: "န", atMs: 1 });
    expect(getTypingGuide(engine.getSnapshot())).toBeNull();
    expect(nextGuideKey(engine.getSnapshot(), "Pa'O")).toBeNull();
  });
});

describe("Latin teaching hints", () => {
  it("maps US QWERTY letters, shifted symbols, Space and Enter", () => {
    expect(keysForText("aA1!{}: \n", "QWERTY")?.map(({ code, shift }) => [code, shift])).toEqual([
      ["KeyA", false], ["KeyA", true], ["Digit1", false], ["Digit1", true],
      ["BracketLeft", true], ["BracketRight", true], ["Semicolon", true],
      ["Space", false], ["Enter", false],
    ]);
    for (const text of ["é", "😀", "\t", "\r\n"]) expect(keysForText(text, "QWERTY")).toBeNull();
    expect(keysForText("a", "Pa'O")).toBeNull();
    expect(keysForText("a", "Dvorak")).toBeNull();
    expect(keysForText("a", "constructor")).toBeNull();
  });
  it("guides Latin input, correction and completion without changing the scored source", () => {
    const engine = createTypingEngine({ targetText: "aA!" });
    const original = engine.getSnapshot();
    expect(nextGuideKey(original, "QWERTY")).toMatchObject({ code: "KeyA", shift: false });
    expect(engine.getSnapshot()).toBe(original);
    engine.dispatch({ type: "INSERT_TEXT", text: "x", atMs: 0 });
    expect(nextGuideKey(engine.getSnapshot(), "QWERTY")?.code).toBe("Backspace");
    engine.dispatch({ type: "DELETE_BACKWARD", atMs: 1 });
    engine.dispatch({ type: "INSERT_TEXT", text: "a", atMs: 2 });
    expect(nextGuideKey(engine.getSnapshot(), "QWERTY")).toMatchObject({ code: "KeyA", shift: true });
    engine.dispatch({ type: "INSERT_TEXT", text: "A!", atMs: 3 });
    expect(nextGuideKey(engine.getSnapshot(), "QWERTY")).toBeNull();
    expect(engine.getSnapshot().target.text).toBe("aA!");
    expect(engine.getSnapshot().counts.incorrectInsertionAttempts).toBe(1);
  });
});
