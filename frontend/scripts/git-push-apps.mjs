/**
 * Compila y sube EdDeli + Store + Tienda (y raptor una sola vez).
 *
 * Uso (desde raptor/frontend):
 *   npm run git-push-apps -- "formatos A4 80mm 55mm en comprobantes"
 *
 * Una sola app:
 *   npm run git-push-eddeli -- "mensaje"
 *   npm run git-push-store -- "mensaje"
 *   npm run git-push-tienda -- "mensaje"
 *
 * Gestor (repo aparte):
 *   npm run git-push-gestor -- "mensaje"
 */
import { parseNote, pushApps } from "./git-push-lib.mjs";

pushApps(["eddeli", "store", "tienda"], parseNote(process.argv.slice(2)));
