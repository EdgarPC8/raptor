/** Posición del toast del sistema. Por defecto, abajo a la derecha. */

export const TOAST_POSITIONS = [
  { value: "bottom-right", label: "Abajo derecha", anchor: { vertical: "bottom", horizontal: "right" } },
  { value: "top-right", label: "Arriba derecha", anchor: { vertical: "top", horizontal: "right" } },
  { value: "bottom-left", label: "Abajo izquierda", anchor: { vertical: "bottom", horizontal: "left" } },
  { value: "top-left", label: "Arriba izquierda", anchor: { vertical: "top", horizontal: "left" } },
  { value: "bottom-center", label: "Centro abajo", anchor: { vertical: "bottom", horizontal: "center" } },
  { value: "top-center", label: "Centro arriba", anchor: { vertical: "top", horizontal: "center" } },
];

const VALUES = new Set(TOAST_POSITIONS.map((p) => p.value));
const STORAGE_KEY = "raptor.toastPosition";

export function normalizeToastPosition(value) {
  const v = String(value || "").trim();
  return VALUES.has(v) ? v : "bottom-right";
}

export function toastAnchorOf(value) {
  const v = normalizeToastPosition(value);
  return TOAST_POSITIONS.find((p) => p.value === v).anchor;
}

export function readStoredToastPosition() {
  try {
    return normalizeToastPosition(localStorage.getItem(STORAGE_KEY));
  } catch {
    return "bottom-right";
  }
}

export function writeStoredToastPosition(value) {
  const v = normalizeToastPosition(value);
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* el navegador puede bloquear storage */
  }
  return v;
}
