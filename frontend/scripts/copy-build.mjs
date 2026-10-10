/**
 * Copia frontend/dist/ al destino de despliegue según --mode.
 * Destino por defecto: ../../{mode} (hermana de raptor/, ej. projects/eddeli).
 * Override: VITE_DEPLOY_DIR en .env.[mode]. Genera .htaccess desde VITE_BASE_PATH.
 *
 * Desde raptor/frontend:
 *   npm run build-raptor   → dist-raptor/ (sin copiar)
 *   npm run build-eddeli   → dist/ + copia al destino de deploy
 *   npm run build-store    → dist/ + copia al destino de deploy
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "fs";
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
const mode = String(process.argv[2] || process.env.VITE_COPY_MODE || "eddeli")
  .trim()
  .toLowerCase();
const env = loadEnvForMode(mode);

/** Si rm falla por permisos (p. ej. dueño root), aparta la ruta para poder seguir. */
function removeOrPark(target) {
  if (!existsSync(target)) return;
  try {
    rmSync(target, { recursive: true, force: true });
    return;
  } catch (err) {
    if (err?.code !== "EACCES" && err?.code !== "EPERM") throw err;
  }
  const parked = `${target}.root-locked.${Date.now()}`;
  try {
    renameSync(target, parked);
    console.warn(
      `[copy-build] Sin permiso para borrar ${target}; apartado a ${parked}`,
    );
  } catch (err) {
    console.error(
      `[copy-build] No se pudo borrar ni apartar ${target} (${err?.code || err}).`,
    );
    console.error(
      "Ejecutá sin sudo el build, o: sudo chown -R \"$USER\" el destino de deploy.",
    );
    process.exit(1);
  }
}

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

removeOrPark(join(deployDir, "assets"));
removeOrPark(join(deployDir, "index.html"));

for (const entry of readdirSync(distDir)) {
  if (entry === ".htaccess") continue;
  const src = join(distDir, entry);
  const dest = join(deployDir, entry);
  if (entry !== "assets" && entry !== "index.html" && existsSync(dest)) {
    removeOrPark(dest);
  }
  cpSync(src, dest, { recursive: true, force: true });
}

const htaccess = generateHtaccess(basePath);
writeFileSync(join(deployDir, ".htaccess"), htaccess, "utf8");
writeFileSync(join(distDir, ".htaccess"), htaccess, "utf8");

console.log(`[copy-build] mode=${mode} base=${basePath}`);
console.log(`[copy-build] Build copiado a`, deployDir);
