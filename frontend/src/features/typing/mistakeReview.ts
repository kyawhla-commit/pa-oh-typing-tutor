import type { SessionResult } from "../../engine/typing";

export function visibleTypingText(text: string): string {
  return text.replace(/ /g, "␣").replace(/\t/g, "⇥").replace(/\r/g, "␍").replace(/\n/g, "↵\n");
}

export function describeTypingUnit(text: string): string {
  if (text === " ") return "␣ (Space)";
  if (text === "\n") return "↵ (Enter)";
  if (text === "\t") return "⇥ (Tab)";
  if (text === "\r\n") return "↵ (Enter, CRLF)";
  return visibleTypingText(text);
}

export function reviewMistakes(result: SessionResult) {
  const units = result.target.units;
  let line = 1, column = 1;
  const coordinates = units.map((unit) => {
    const position = { line, column };
    if (unit.includes("\n")) { line++; column = 1; } else column++;
    return position;
  });
  return result.mistakes.map((mistake) => ({
    ...mistake, ...coordinates[mistake.position % units.length],
    expected: units[mistake.position % units.length], actual: mistake.text,
  }));
}

/** Exact source words/lines; whitespace errors retain adjacent context. */
export function mistakePracticeText(result: SessionResult): string {
  const units = result.target.units;
  const multiline = units.some((unit) => unit.includes("\n"));
  const fragments = new Set<string>();
  for (const mistake of result.mistakes) {
    const position = mistake.position % units.length;
    let start = position, end = position + 1;
    if (multiline) {
      while (start > 0 && !units[start - 1].includes("\n")) start--;
      while (end < units.length && !units[end].includes("\n")) end++;
    } else {
      const word = result.target.words.find((token) => token.start <= position && position < token.end);
      if (word) { start = word.start; end = word.end; }
      else {
        const previous = result.target.words.filter((token) => token.end <= position).at(-1);
        const next = result.target.words.find((token) => token.start > position);
        start = previous?.start ?? position;
        end = next?.end ?? position + 1;
      }
    }
    fragments.add(units.slice(start, end).join(""));
  }
  return [...fragments].join(multiline ? "\n" : " ");
}
