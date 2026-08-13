/**
 * Compila Tienda (build producción + copia al repo tienda) y sube a Git.
 *
 * Uso (desde raptor/frontend):
 *   npm run git-push-tienda -- "v1.0.01"
 *   npm run git-push-apps -- "mensaje"   ← las tres apps
 */
import { parseNote, pushOneApp } from "./git-push-lib.mjs";

pushOneApp("tienda", parseNote(process.argv.slice(2)));
