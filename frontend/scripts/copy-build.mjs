/**
 * Copia frontend/dist/ al destino de despliegue.
 *
 * Desde raptor/frontend:
 *   npm run build          → solo dist/
 *   npm run build-raptor   → dist-raptor/ (aquí mismo, sin copiar)
 *   npm run build-eddeli   → dist/ + copia a AppsWeb/eddeli/
 *   npm run build-store    → dist/ + copia a AppsWeb/store/
 *
 * Rutas (desde scripts/ = frontend/scripts):
 *   ../../.. = AppsWeb
 *   ../../../eddeli | ../../../store
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "../dist");
const mode = String(process.argv[2] || process.env.VITE_COPY_MODE || "eddeli")
  .trim()
  .toLowerCase();

const appsWebRoot = resolve(__dirname, "../../..");
const deployByMode = {
  eddeli: join(appsWebRoot, "eddeli"),
  store: join(appsWebRoot, "store"),
};

const deployDir = deployByMode[mode];
if (!deployDir) {
  console.error(
    `Modo desconocido: "${mode}". Usá: node scripts/copy-build.mjs eddeli|store`,
  );
  process.exit(1);
}

if (!existsSync(distDir)) {
  console.error("No existe frontend/dist. Ejecuta vite build primero.");
  process.exit(1);
}

if (!existsSync(deployDir)) {
  mkdirSync(deployDir, { recursive: true });
}

const assetsTarget = join(deployDir, "assets");
if (existsSync(assetsTarget)) {
  rmSync(assetsTarget, { recursive: true, force: true });
}

for (const entry of readdirSync(distDir)) {
  const src = join(distDir, entry);
  const dest = join(deployDir, entry);
  cpSync(src, dest, { recursive: true, force: true });
}

console.log(`Build (${mode}) copiado a`, deployDir);
