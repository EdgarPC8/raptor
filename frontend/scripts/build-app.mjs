/**
 * Build genérico por modo: vite build --mode <app> [+ copy-build si aplica].
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2];

if (!mode) {
  console.error("Uso: npm run build:app -- <mode>   (ej. eddeli, store, scheduly)");
  process.exit(1);
}

const env = loadEnvForMode(mode);

console.log(`[build-app] mode=${mode}`);

execSync(`vite build --mode ${mode}`, {
  cwd: frontendRoot,
  stdio: "inherit",
});

if (shouldSkipDeploy(mode, env)) {
  console.log(`[build-app] Sin copia de deploy para mode=${mode}.`);
} else {
  const deployDir = resolveDeployDir(mode, env);
  console.log(`[build-app] Copiando a ${deployDir}`);
  execSync(`node scripts/copy-build.mjs ${mode}`, {
    cwd: frontendRoot,
    stdio: "inherit",
  });
}
