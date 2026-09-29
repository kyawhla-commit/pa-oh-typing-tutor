import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const versionPages = ["typingtutor", "typingtutor2", "typingtutor3", "typingtutor4", "typingtutor5"];
const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        ...Object.fromEntries(versionPages.map((name) => [name, resolve(root, `versions/${name}/index.html`)])),
      },
    },
  },
});
