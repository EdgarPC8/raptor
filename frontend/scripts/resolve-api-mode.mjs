/**
 * Misma lógica que deployEnv.js (VITE_API_MODE + fallback dev/build).
 * Usado en vite.config.js y build-app.mjs para logs de arranque.
 */

function cleanOrigin(origin) {
  return String(origin || "https://aplicaciones.marianosamaniego.edu.ec").replace(
    /\/$/,
    "",
  );
}

function cleanPrefix(prefix, fallback = "eddeliapi") {
  return String(prefix || fallback).replace(/^\/+|\/+$/g, "");
}

/** @param {Record<string, string>} env @param {{ isDev?: boolean }} opts */
export function resolveApiMode(env, { isDev = true } = {}) {
  const shellOnly =
    env.VITE_SHELL_ONLY === "true" || env.VITE_API_MODE === "none";
  if (shellOnly) {
    return { apiMode: "none", shellOnly: true, explicit: env.VITE_API_MODE === "none" };
  }
  const explicit = String(env.VITE_API_MODE || "").trim();
  const apiMode = explicit || (isDev ? "local" : "production");
  return { apiMode, shellOnly: false, explicit: Boolean(explicit) };
}

/** @param {Record<string, string>} env @param {string} apiMode */
export function describeApiTarget(env, apiMode) {
  const prefix = cleanPrefix(env.VITE_API_PREFIX);
  const origin = cleanOrigin(env.VITE_API_ORIGIN);
  const host = env.VITE_API_HOST || "127.0.0.1";
  const port = env.VITE_API_PORT || "3001";

  if (apiMode === "none") return "(sin backend)";
  if (apiMode === "production") return `${origin}/${prefix}`;
  if (apiMode === "server") return `http://${host}:${port}/${prefix}`;
  return `/${prefix} → ${host}:${port}`;
}

/** @param {{ isDev: boolean, apiMode: string, shellOnly: boolean, explicit: boolean }} ctx */
export function formatApiModeLabel({ isDev, apiMode, shellOnly, explicit }) {
  const phase = isDev ? "dev" : "build";
  if (shellOnly) return `${phase}/shell (sin backend)`;
  const source = explicit ? "env" : "auto";
  return `${phase}/${apiMode} (${source})`;
}
