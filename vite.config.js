import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let appVersion = "dev";
try {
  appVersion = readFileSync(path.join(__dirname, "VERSION"), "utf8").trim();
} catch {
  /* sin VERSION en el árbol */
}

const buildTimeIso = new Date().toISOString();

/** Versión en HTML (Ver código fuente) sin depender del JS; útil si el .js venía cacheado. */
function injectVersionMeta() {
  return {
    name: "inject-version-meta",
    transformIndexHtml(html) {
      const meta = `    <meta name="app-version" content="${appVersion}" />\n    <meta name="build-time" content="${buildTimeIso}" />\n`;
      return html.replace("<head>", `<head>\n${meta}`);
    },
  };
}

export default defineConfig({
  plugins: [react(), injectVersionMeta()],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  envPrefix: "VITE_",
});
