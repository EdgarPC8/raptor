import { existsSync, readFileSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const frontendRoot = resolve(__dirname, "..");

/** @param {string} filePath */
export function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

/** Carga .env, .env.local, .env.[mode], .env.[mode].local (mismo orden que Vite). */
export function loadEnvForMode(mode) {
  const files = [
    ".env",
    ".env.local",
    `.env.${mode}`,
    `.env.${mode}.local`,
  ];
  let merged = {};
  for (const file of files) {
    merged = { ...merged, ...loadEnvFile(join(frontendRoot, file)) };
  }
  return merged;
}

/**
 * Carpeta de despliegue: por defecto ../../{mode} respecto a frontend/
 * (hermana del repo raptor/, ej. projects/eddeli).
 * Override opcional: VITE_DEPLOY_DIR (absoluta o relativa a frontend/).
 */
export function resolveDeployDir(mode, env = {}) {
  const custom = String(env.VITE_DEPLOY_DIR || "").trim();
  if (custom) {
    return custom.startsWith("/") ? custom : resolve(frontendRoot, custom);
  }
  return resolve(frontendRoot, "..", "..", mode);
}

export function shouldSkipDeploy(mode, env = {}) {
  if (mode === "raptor") return true;
  return env.VITE_SKIP_DEPLOY === "true";
}
