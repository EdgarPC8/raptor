/**
 * Copia frontend/dist/ al destino de despliegue según --mode.
 * Destino por defecto: ../../{mode} (hermana de raptor/, ej. projects/eddeli).
 * Genera .htaccess desde VITE_BASE_PATH del .env.[mode].
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  frontendRoot,
  loadEnvForMode,
  resolveDeployDir,
  shouldSkipDeploy,
} from "./load-env.mjs";
import { generateHtaccess } from "./generate-htaccess.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "../dist");
const mode = process.argv[2] || process.env.VITE_COPY_MODE || "eddeli";
const env = loadEnvForMode(mode);

if (shouldSkipDeploy(mode, env)) {
  console.log(`[copy-build] mode=${mode}: sin copia de deploy (shell / VITE_SKIP_DEPLOY).`);
  process.exit(0);
}

const deployDir = resolveDeployDir(mode, env);
const basePath = env.VITE_BASE_PATH || `/${mode}/`;

if (!existsSync(distDir)) {
  console.error("No existe frontend/dist. Ejecuta vite build primero.");
  process.exit(1);
}

if (!existsSync(deployDir)) {
  mkdirSync(deployDir, { recursive: true });
  console.log(`[copy-build] Carpeta creada:`, deployDir);
}

const assetsTarget = join(deployDir, "assets");
if (existsSync(assetsTarget)) {
  rmSync(assetsTarget, { recursive: true, force: true });
}

for (const entry of readdirSync(distDir)) {
  if (entry === ".htaccess") continue;
  const src = join(distDir, entry);
  const dest = join(deployDir, entry);
  cpSync(src, dest, { recursive: true, force: true });
}

const htaccess = generateHtaccess(basePath);
writeFileSync(join(deployDir, ".htaccess"), htaccess, "utf8");
writeFileSync(join(distDir, ".htaccess"), htaccess, "utf8");

console.log(`[copy-build] mode=${mode} base=${basePath}`);
console.log(`[copy-build] Build copiado a`, deployDir);
