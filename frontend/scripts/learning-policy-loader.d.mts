export function loadEvaluation(
  overrides?: Record<string, Record<string, number>>,
): Promise<{
  api: typeof import("../src/features/learning/evaluation/index");
  close: () => Promise<void>;
}>;
