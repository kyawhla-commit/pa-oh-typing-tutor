import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode, command }) => {
  const desktop = mode === "desktop";
  // Demo account passwords are available only to the local dev server, never a build.
  const demoEnv = command === "serve" && mode !== "pilot" && !desktop
    ? loadEnv(mode, process.cwd(), "DEMO_")
    : {};
  const demoAccounts = (["user", "admin"] as const).map((role) => ({
    role,
    email: demoEnv[`DEMO_${role.toUpperCase()}_EMAIL`] || "",
    password: demoEnv[`DEMO_${role.toUpperCase()}_PASSWORD`] || "",
  })).filter((account) => account.email && account.password);

  return {
    base: desktop ? "./" : "/",
    envDir: desktop ? false : undefined,
    clearScreen: !desktop,
    define: { __DEMO_ACCOUNTS__: JSON.stringify(demoAccounts) },
    plugins: [
      ...(mode === "pilot" || desktop
        ? [
            {
              name: "local-font-styles",
              enforce: "pre" as const,
              transform(code: string, id: string) {
                if (id.split("?")[0].endsWith("/src/index.css")) {
                  // Desktop embeds its fonts for offline Pa’O rendering.
                  return code.replace(
                    /@import\s+url\(['"]https:\/\/fonts\.googleapis\.com\/[^'"]*['"]\);?/g,
                    desktop ? '@import "./desktop-fonts.css";' : "",
                  );
                }
              },
            },
          ]
        : []),
      react(),
      tailwindcss(),
    ],
  };
});
