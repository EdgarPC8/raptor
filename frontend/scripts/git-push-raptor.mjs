/**
 * Sube el código compartido de Raptor (frontend).
 * El gestor (Next) se sube con: npm run git-push-gestor
 *
 * Uso (desde raptor/frontend):
 *   npm run git-push-raptor -- "ajuste de UI compartida"
 */
import { commitAndPush, parseNote, raptorRoot } from "./git-push-lib.mjs";

const note = parseNote(process.argv.slice(2));
const tag = "git-push-raptor";

console.log(`[${tag}] Nota: ${note}`);
commitAndPush(raptorRoot, "raptor", `feat(raptor): ${note}`, tag);
console.log(`[${tag}] Listo.`);
