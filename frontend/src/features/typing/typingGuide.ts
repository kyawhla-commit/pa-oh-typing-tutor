import { paoKeyLegends, qwertyKeyLegends, type KeyHint } from "../../components/keyboardLayouts";
import type { SessionSnapshot } from "../../engine/typing";

export const hasMyanmarText = (text: string) => /\p{Script=Myanmar}/u.test(text);

/** Teaching decoration only; never pass these previews to the engine. */
export function inputPreview(text: string): string {
  if (text === " ") return "Space ␣";
  if (text === "\n" || text === "\r\n") return "Enter ↵";
  if (text === "\t") return "Tab ⇥";
  if (text === "\r") return "Return ␍";
  return /^\p{M}/u.test(text) ? `◌${text}` : text;
}

function keyLabel(code: string) {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return ({ Backquote: "`", Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]", Backslash: "\\", Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/" } as Record<string, string>)[code] ?? code;
}

const outputsFor = (legendsByCode: typeof paoKeyLegends): KeyHint[] => Object.entries(legendsByCode).flatMap(([code, legends]) => [
  { code, label: keyLabel(code), shift: false, text: legends.unshifted },
  { code, label: keyLabel(code), shift: true, text: legends.shifted },
]).sort((a, b) => b.text.length - a.text.length);
const directOutputs = { "Pa'O": outputsFor(paoKeyLegends), QWERTY: outputsFor(qwertyKeyLegends) };

/** Direct outputs of the displayed PaOh/US QWERTY layouts; never guess an IME sequence. */
export function keysForText(text: string, layout: string): readonly KeyHint[] | null {
  if (layout !== "Pa'O" && layout !== "QWERTY") return null;
  const outputs = directOutputs[layout];
  const keys: KeyHint[] = [];
  let remaining = text.normalize("NFC");
  while (remaining) {
    // The adapter emits LF for Enter, never raw CR/CRLF.
    const special = remaining[0];
    const code = special === " " ? "Space" : special === "\n" ? "Enter" : null;
    const key = code ? { code, label: code, shift: false, text: special }
      : outputs.find((candidate) => remaining.startsWith(candidate.text));
    // Tab navigates focus in the native adapter, so it must not be taught as a typing key.
    if (!key) return null;
    keys.push(key);
    remaining = remaining.slice(key.text.length);
  }
  return keys;
}

export function getTypingGuide(snapshot: SessionSnapshot) {
  if (snapshot.status === "completed" || snapshot.status === "aborted") return null;
  let position = snapshot.currentPosition;
  const last = snapshot.typedUnits[position - 1];
  const previousExpected = snapshot.target.expectedUnits[position - 1];
  const normalizedLast = last?.text.normalize("NFC") ?? "";
  const partial = !!last && !last.correct && !!normalizedLast
    && previousExpected?.startsWith(normalizedLast);
  const mistake = !!last && !last.correct && !partial;
  if (partial || mistake) position--;
  const expected = snapshot.target.units[position];
  if (expected === undefined) return null;
  const remaining = partial ? snapshot.target.expectedUnits[position].slice(normalizedLast.length) : expected;
  const word = snapshot.target.words.find((candidate) => candidate.start <= position && position < candidate.end);
  // Use source context, not a guessed Burmese/Pa'O syllable boundary. Bound long unspaced runs.
  const start = word ? Math.max(word.start, position - 5) : Math.max(0, position - 3);
  const end = word ? Math.min(word.end, position + 6) : Math.min(snapshot.target.units.length, position + 4);
  const context = `${word && start > word.start ? "…" : ""}${snapshot.target.units.slice(start, end).join("")}${word && end < word.end ? "…" : ""}`;
  return { position, expected, remaining, partial, mistake, actual: last?.text ?? "", context };
}

export function nextGuideKey(snapshot: SessionSnapshot, layout: string): KeyHint | null {
  const guide = getTypingGuide(snapshot);
  if (!guide) return null;
  if (guide.mistake) return { code: "Backspace", label: "Backspace", shift: false, text: "" };
  return keysForText(guide.remaining, layout)?.[0] ?? null;
}
