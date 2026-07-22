/**
 * Build genérico por modo: vite build --mode <app> [+ copy-build si aplica].
 *
 * El comando fija el perfil (no hace falta tocar .env a mano):
 *   build eddeli|store → suscripciones ON + API production
 *   build raptor       → shell (sin backend / sin suscripciones)
 *
 * Uso:
 *   node scripts/build-app.mjs eddeli
 *   npm run build:app -- scheduly
 */
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import {
  frontendRoot,
  loadEnvForMode,
  resolveDeployDir,
  shouldSkipDeploy,
} from "./load-env.mjs";
import {
  describeApiTarget,
  formatApiModeLabel,
  resolveApiMode,
} from "./resolve-api-mode.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2];

if (!mode) {
  console.error("Uso: npm run build:app -- <mode>   (ej. eddeli, store, scheduly)");
  process.exit(1);
}

const fileEnv = loadEnvForMode(mode);
const shellEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => key.startsWith("VITE_")),
);

/** Perfil automático según el comando de build. */
function commandBuildOverrides(appMode) {
  if (appMode === "raptor") {
    return {
      VITE_SUBSCRIPTIONS_ENABLED: "false",
      VITE_SHELL_ONLY: "true",
      VITE_API_MODE: "none",
    };
  }
  // Apps reales (eddeli, store, …): build = producción
  return {
    VITE_SUBSCRIPTIONS_ENABLED: "true",
    VITE_API_MODE: "production",
  };
}

const cmdOverrides = commandBuildOverrides(mode);
const env = { ...fileEnv, ...shellEnv, ...cmdOverrides };
const { apiMode, shellOnly } = resolveApiMode(env, { isDev: false });
const apiLabel = formatApiModeLabel({
  isDev: false,
  apiMode,
  shellOnly,
  explicit: true,
});
const apiTarget = describeApiTarget(env, apiMode);
const appName = env.VITE_APP_NAME || mode;
const subsLabel =
  env.VITE_SUBSCRIPTIONS_ENABLED === "true"
    ? "suscripciones=ON"
    : "suscripciones=OFF";

console.log(
  `[build-app] mode=${mode} · app=${appName} · ${subsLabel} · API=${apiLabel} · ${apiTarget}`,
);
console.log(`[build-app] Perfil del comando: ${JSON.stringify(cmdOverrides)}`);

execSync(`vite build --mode ${mode}`, {
  cwd: frontendRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    ...cmdOverrides,
  },
});

if (shouldSkipDeploy(mode, env)) {
  console.log(`[build-app] Sin copia de deploy para mode=${mode}.`);
} else {
  const deployDir = resolveDeployDir(mode, env);
  console.log(`[build-app] Copiando a ${deployDir}`);
  execSync(`node scripts/copy-build.mjs ${mode}`, {
    cwd: frontendRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      ...cmdOverrides,
    },
  });
}
