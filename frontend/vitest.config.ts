import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/features/auth/**/*.test.{ts,tsx}",
      "src/engine/typing/**/*.test.ts",
      "src/features/typing/**/*.test.{ts,tsx}",
      "src/features/practice/**/*.test.{ts,tsx}",
      "src/features/tests/**/*.test.{ts,tsx}",
      "src/features/learning/**/*.test.{ts,tsx}",
      "src/features/pilot/**/*.test.{ts,tsx}",
    ],
  },
});
