import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import {
  describeApiTarget,
  formatApiModeLabel,
  resolveApiMode,
} from "./scripts/resolve-api-mode.mjs";

const muiDedupe = [
  "react",
  "react-dom",
  "@emotion/react",
  "@emotion/styled",
  "@mui/material",
  "@mui/system",
  "@mui/styled-engine",
];

function normalizeBase(path) {
  const raw = String(path || "/").trim();
  if (!raw.startsWith("/")) return `/${raw.endsWith("/") ? raw : `${raw}/`}`;
  return raw.endsWith("/") ? raw : `${raw}/`;
}

export default defineConfig(({ mode, command }) => {
  const isDev = command === "serve";
  const env = loadEnv(mode, process.cwd(), "");
  const { apiMode, shellOnly, explicit } = resolveApiMode(env, { isDev });
  const base = normalizeBase(env.VITE_BASE_PATH || (shellOnly ? "/raptor/" : "/eddeli/"));
  const apiPrefix = String(env.VITE_API_PREFIX || "eddeliapi").replace(
    /^\/+|\/+$/g,
    "",
  );
  const apiPort = env.VITE_API_PORT || "3001";
  const apiTarget = `http://127.0.0.1:${apiPort}`;
  const defaultPort = mode === "store" ? 5174 : mode === "raptor" ? 5175 : 5173;
  const devPort = Number(env.VITE_DEV_PORT || defaultPort);
  const appName = env.VITE_APP_NAME || mode;
  const apiLabel = formatApiModeLabel({ isDev, apiMode, shellOnly, explicit });
  const apiTargetLabel = describeApiTarget(env, apiMode);

  console.log(
    `[vite] ${isDev ? "serve" : "build"} · mode=${mode} · app=${appName} · API=${apiLabel} · ${apiTargetLabel} · base=${base}${isDev ? ` :${devPort}` : ""}`,
  );

  return {
    plugins: [react()],
    base,
    resolve: {
      dedupe: muiDedupe,
    },
    optimizeDeps: {
      include: [
        "@emotion/react",
        "@emotion/react/jsx-runtime",
        "@emotion/styled",
        "@mui/material",
        "@mui/material/styles",
        "@mui/system",
        "@mui/styled-engine",
        "@mui/x-charts",
        "@mui/x-data-grid",
      ],
    },
    server: {
      host: true,
      port: devPort,
      strictPort: false,
      proxy: shellOnly
        ? undefined
        : {
            [`/${apiPrefix}`]: {
              target: apiTarget,
              changeOrigin: true,
              ws: true,
            },
            "/socket.io": {
              target: apiTarget,
              changeOrigin: true,
              ws: true,
            },
          },
    },
    preview: {
      host: true,
      port: devPort,
      strictPort: false,
    },
    build: {
      outDir: mode === "raptor" ? "dist-raptor" : "dist",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("@mui") || id.includes("@emotion")) return "mui";
            if (
              id.includes("jspdf") ||
              id.includes("html2canvas") ||
              id.includes("purify")
            )
              return "pdf";
            if (
              id.includes("lightweight-charts") ||
              id.includes("@mui/x-charts")
            )
              return "charts";
            if (id.includes("socket.io")) return "realtime";
            if (id.includes("date-fns")) return "date";
            return "vendor";
          },
        },
      },
    },
  };
});
