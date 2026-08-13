/**
 * Compila Store (build producción + copia al repo store) y sube a Git.
 *
 * Uso (desde raptor/frontend):
 *   npm run git-push-store -- "v1.0.01"
 *   npm run git-push-apps -- "mensaje"   ← las tres apps
 */
import { parseNote, pushOneApp } from "./git-push-lib.mjs";

pushOneApp("store", parseNote(process.argv.slice(2)));
