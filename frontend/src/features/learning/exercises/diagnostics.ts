import type { GenerationDiagnostic, GenerationFailureReason } from "./types";
/** Development diagnostics; learner-facing action text never renders these. */
export function generationDiagnostics(
  issues: readonly string[],
  exhausted = true,
): readonly GenerationDiagnostic[] {
  const classify = (issue: string): GenerationFailureReason =>
    /length|partition|sections/u.test(issue)
      ? "length-conflict"
      : /density|concentration|mixed share|ordinary/u.test(issue)
        ? "density-conflict"
        : /contexts|diversity/u.test(issue)
          ? "context-diversity-conflict"
          : /repetition|identical|dominates/u.test(issue)
            ? "repetition-conflict"
            : "coverage-conflict";
  return [
    ...issues.map((message) => ({ kind: classify(message), message })),
    ...(exhausted
      ? [
          {
            kind: "assembly-exhausted" as const,
            message: "Bounded deterministic assembly exhausted.",
          },
        ]
      : []),
  ];
}
