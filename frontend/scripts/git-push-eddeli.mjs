/**
 * Compila EdDeli (build producción + copia al repo eddeli) y sube a Git.
 *
 * Uso (desde raptor/frontend):
 *   npm run git-push-eddeli -- "v1.0.01"
 *   npm run git-push-apps -- "mensaje"   ← las tres apps
 */
import { parseNote, pushOneApp } from "./git-push-lib.mjs";

pushOneApp("eddeli", parseNote(process.argv.slice(2)));
