/**
 * Sube el gestor (AppsWeb/gestor-proyectos-negocios) a Git.
 *
 * Uso (desde raptor/frontend):
 *   npm run git-push-gestor -- "ajuste de sincronización"
 *
 * Equivale a, desde el repo del gestor:
 *   npm run git:push -- "mensaje"
 */
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";
import { frontendRoot } from "./load-env.mjs";
import { parseNote } from "./git-push-lib.mjs";

const note = parseNote(process.argv.slice(2));
const tag = "git-push-gestor";
const gestorRoot = resolve(frontendRoot, "..", "..", "gestor-proyectos-negocios");
const script = resolve(gestorRoot, "scripts", "git-push.sh");

if (!existsSync(script)) {
  throw new Error(`No encontré el gestor en ${gestorRoot}`);
}

console.log(`[${tag}] Nota: ${note}`);
console.log(`[${tag}] Repo: ${gestorRoot}`);
execSync(`bash ${JSON.stringify(script)} ${JSON.stringify(note)}`, {
  cwd: gestorRoot,
  stdio: "inherit",
  shell: true,
});
console.log(`[${tag}] En el servidor: cd gestor && npm run deploy`);
