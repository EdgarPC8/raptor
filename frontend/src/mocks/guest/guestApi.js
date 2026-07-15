/**
 * Acceso a datos demo SOLO en modo invitado (`readGuestSession`).
 * Nunca como fallback si el backend real falla o tarda.
 */
import { readGuestSession } from "../../config/guestMode.js";
import guestData from "./guestData.js";

export function isGuestDataMode() {
  return readGuestSession() === true;
}

/** Respuesta estilo axios `{ data }` */
export function guestOk(data) {
  return Promise.resolve({ data, status: 200, statusText: "OK", headers: {}, config: {} });
}

/** Lee una clave de guestData y la envuelve como respuesta OK. */
export function guestFrom(key, params) {
  return guestOk(guestData.get(key, params));
}

/** Mutaciones bloqueadas en invitado. */
export function guestDenied(message = "Modo invitado: solo lectura (datos de demostración)") {
  const err = new Error(message);
  err.isGuestMode = true;
  err.response = { status: 403, data: { message } };
  return Promise.reject(err);
}

export { guestData };
