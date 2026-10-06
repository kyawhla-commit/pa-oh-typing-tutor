import { describe, expect, it } from "vitest";
import { createTypingEngine } from "../../engine/typing";
import { createSourceSessionConfig, prepareTextSource, textContentVersion, type TypingTextSource } from "./textSources";

const source = (type: TypingTextSource["type"], text = "hello world"): TypingTextSource => ({ type, id: "sample", version: "1", text, title: "Title", language: "en" });
describe("shared text sources", () => {
  it.each(["lesson", "corpus", "quote", "custom"] as const)("prepares %s once and runs a normal fixed session", type => {
    const prepared = prepareTextSource(source(type)); const config = createSourceSessionConfig(prepared);
    const e = createTypingEngine(config); expect(e.getSnapshot().target).toBe(prepared.preparedText);
    e.dispatch({ type: "INSERT_TEXT", text: "hello world", atMs: 0 });
    expect(e.getResult()).toMatchObject({ mode: "fixed-text", completionReason: "correct-target", sourceIdentity: { type, id: "sample", version: "1" } });
    expect(e.getResult()).not.toHaveProperty("title");
  });
  it.each(["", " \n\t\r", null, undefined])("rejects empty custom text %s", text => expect(() => prepareTextSource({ ...source("custom"), text: text as string })).toThrow(/non-whitespace/));
  it("allows short custom text and multiline Unicode without arbitrary limits", () => {
    for (const text of ["a", "é👩‍💻\nပအိုဝ်ႏ", "line\r\nnext\rfinal"]) {
      const p = prepareTextSource(source("custom", text)); expect(p.preparedText.text).toBe(text);
      const e = createTypingEngine(createSourceSessionConfig(p)); e.dispatch({ type: "INSERT_TEXT", text, atMs: 0 }); expect(e.getResult()?.counts.uncorrectedErrors).toBe(0);
    }
  });
  it("normalizes line endings only when the source explicitly asks", () => {
    const p = prepareTextSource({ ...source("custom", "one\r\ntwo\rthree"), lineEndings: "lf" });
    expect(p.preparedText.text).toBe("one\ntwo\nthree"); expect(p.preparedText.words.map(w => w.text)).toEqual(["one", "two", "three"]);
  });
  it("keeps quote attribution in the feature source, separate from scoring", () => {
    const p = prepareTextSource({ ...source("quote", "Keep going."), type: "quote", author: "Fixture author", attribution: "Local deterministic fixture" });
    expect(p.source).toHaveProperty("author", "Fixture author"); const e = createTypingEngine(createSourceSessionConfig(p));
    expect(e.getSnapshot().sourceIdentity).toEqual({ type: "quote", id: "sample", version: "1" }); expect(e.getSnapshot()).not.toHaveProperty("author");
  });
  it("freezes source identity and text through source mutation and engine reset", () => {
    const raw = { ...source("corpus") }; const p = prepareTextSource(raw); raw.id = "changed"; raw.text = "changed";
    const e = createTypingEngine(createSourceSessionConfig(p)); e.reset();
    expect(e.getSnapshot()).toMatchObject({ sourceIdentity: { id: "sample", version: "1" }, target: { text: "hello world" } });
    for (const x of [p, p.source, p.identity, p.preparedText]) expect(Object.isFrozen(x)).toBe(true);
    expect(prepareTextSource(source("corpus")).identity).toEqual(p.identity);
  });
  it("provides stable compact content revisions for mutable lesson catalogs", () => {
    expect(textContentVersion("é\ntext")).toBe(textContentVersion("é\ntext")); expect(textContentVersion("é\ntext")).not.toBe(textContentVersion("é\nnext"));
    expect(textContentVersion("hello")).toMatch(/^text-[a-f0-9]{16}$/);
  });
  it.each([{ id: "" }, { version: " " }, { type: "unknown" }, { lineEndings: "unknown" }])("validates source metadata %j", invalid => {
    expect(() => prepareTextSource({ ...source("custom"), ...invalid } as TypingTextSource)).toThrow();
  });
});
