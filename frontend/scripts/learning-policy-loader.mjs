import { createServer } from "vite";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const allowed = {
  LEARNING: [
    "grapheme.opportunities",
    "grapheme.rate",
    "substitution.recentCount",
    "bigram.rate",
    "token.rate",
    "poorAccuracy",
  ],
  TRANSFER: [
    "trainingRate",
    "checkSuccesses",
    "transferMinimum.grapheme",
    "requiredSessions.grapheme",
    "regressionRate",
  ],
  ASSESSMENT: ["waitingSessions", "sessions.grapheme"],
};
export async function loadEvaluation(overrides = {}) {
  for (const [name, values] of Object.entries(overrides))
    for (const [path, value] of Object.entries(values)) {
      if (
        !allowed[name]?.includes(path) ||
        !Number.isFinite(value) ||
        value <= 0
      )
        throw Error("Invalid evaluation-only override");
    }
  const plugin = {
    name: "offline-learning-policy-overrides",
    enforce: "pre",
    transform(source, id) {
      const name = id.endsWith("/learning/constants.ts")
        ? "LEARNING"
        : id.endsWith("/transfer/constants.ts")
          ? "TRANSFER"
          : id.endsWith("/progression/constants.ts")
            ? "ASSESSMENT"
            : null;
      if (!name || !overrides[name]) return null;
      const pattern = `export const ${name} =`;
      if (!source.includes(pattern))
        throw Error("Override declaration not found");
      let code = source.replace(pattern, `const BASE_${name} =`);
      code += `\nconst patched=structuredClone(BASE_${name});\n`;
      for (const [path, value] of Object.entries(overrides[name]))
        code += `patched${path
          .split(".")
          .map((p) => `[${JSON.stringify(p)}]`)
          .join("")}=${value};\n`;
      code += `export const ${name}=Object.freeze(patched);\n`;
      return code;
    },
  };
  const server = await createServer({
    root,
    cacheDir: "node_modules/.vite-learning-evaluation",
    optimizeDeps: { noDiscovery: true, include: [] },
    configFile: false,
    plugins: [plugin],
    server: { middlewareMode: true, watch: null, hmr: false, ws: false },
    appType: "custom",
    logLevel: "error",
  });
  try {
    return {
      api: await server.ssrLoadModule(
        "/src/features/learning/evaluation/index.ts",
      ),
      close: () => server.close(),
    };
  } catch (error) {
    await server.close();
    throw error;
  }
}
