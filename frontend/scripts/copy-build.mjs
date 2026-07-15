/**
 * Copia frontend/dist/ al destino de despliegue según modo Vite.
 * - eddeli → AppsWeb/eddeli/  (Apache /eddeli/)
 * - store  → AppsWeb/store/   (Apache /store/)
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "../dist");
const mode = process.env.VITE_COPY_MODE || process.argv[2] || "eddeli";

const deployByMode = {
  eddeli: resolve(__dirname, "../../../eddeli"),
  store: resolve(__dirname, "../../../store"),
};

const deployDir = deployByMode[mode] || deployByMode.eddeli;

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
