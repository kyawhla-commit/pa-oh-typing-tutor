import { describe,expect,it } from "vitest";
import { analyzeCoverage } from "./coverage";
import { prepareTypingText } from "../../../engine/typing";
import { spec } from "./testFixtures";
describe("coverage on final domain-prepared target",()=> {
  it.each([["r r rr","r",4],["𝄞 𝄞x","𝄞",2],["e\u0301 éx","é",2],["👩‍💻 👩‍💻x","👩‍💻",2],["ပ ပx","ပ",2]])("counts exact grapheme opportunities in %s",(text,item,n)=> {
    const coverage=analyzeCoverage(text,spec("grapheme",[item]));expect(coverage.focus[0].occurrences).toBe(n);expect(coverage.totalGraphemes).toBe(prepareTypingText(text).units.length);
  });
  it("bigrams use grapheme adjacency and retain overlapping occurrences",()=> {
    expect(analyzeCoverage("th tht h",spec("bigram",["t","h"])).focus[0].occurrences).toBe(2);
    expect(analyzeCoverage("rrr",spec("bigram",["r","r"])).focus[0].occurrences).toBe(2);
    expect(analyzeCoverage("👩‍💻😀 👩‍💻 😀",spec("bigram",["👩‍💻","😀"])).focus[0].occurrences).toBe(1);
  });
  it("tokens follow whitespace boundaries with punctuation and real newlines",()=> {
    const c=analyzeCoverage("through\nthrough  through, through\tthrough",spec("token",["through"]));expect(c.focus[0].occurrences).toBe(4);expect(c.tokenCount).toBe(5);
    expect(analyzeCoverage("word, word word,",spec("token",["word,"])).focus[0].occurrences).toBe(2);
  });
  it("prototype-sensitive strings behave as ordinary token keys",()=> {
    const c=analyzeCoverage("__proto__ __proto__ constructor",spec("token",["__proto__"]));expect(c.focus[0].occurrences).toBe(2);expect(c.distinctTokens).toBe(2);expect(c.maxTokenShare).toBeCloseTo(2/3);
  });
  it("separates historical counting concepts from exercise occurrence coverage",()=> {
    const c=analyzeCoverage("red red red road",spec("grapheme",["r"]));expect(c.focus[0].occurrences).toBe(4);expect(c.focus[0].contexts).toEqual(["red","road"]);expect(c.longestIdenticalTokenRun).toBe(3);
  });
});
