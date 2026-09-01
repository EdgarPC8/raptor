/**
 * Borrador de apertura de turno (monedas/billetes o total) en localStorage.
 * Se restaura al recargar; se borra al abrir el turno con éxito.
 */
import { cajaDraftAppNamespace } from "./cajaDraftStorage.js";
import {
  CASH_DENOMINATIONS,
  computeCashTotal,
  emptyCashCounts,
} from "./turnoCashUtils.js";

export { cajaDraftAppNamespace };

function uidOf(userId) {
  return userId != null && String(userId).trim() ? String(userId) : "anon";
}

function storageKey(ns, userId) {
  return `${ns}.openShiftDraft.v1.${uidOf(userId)}`;
}

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeCounts(counts) {
  const base = emptyCashCounts();
  if (!counts || typeof counts !== "object") return base;
  for (const d of CASH_DENOMINATIONS) {
    const raw = counts[d.key];
    base[d.key] =
      raw != null && String(raw).trim() !== "" ? String(raw).trim() : "";
  }
  return base;
}

/** @returns {boolean} */
export function hasOpenShiftDraftContent(draft) {
  if (!draft || typeof draft !== "object") return false;
  if (String(draft.openNotes ?? "").trim()) return true;
  if (String(draft.openAt ?? "").trim()) return true;
  const total = Number(String(draft.openCashTotal ?? "").trim().replace(",", "."));
  if (Number.isFinite(total) && total > 0) return true;
  return computeCashTotal(normalizeCounts(draft.openCounts)) > 0;
}

export function readOpenShiftDraft(ns, userId) {
  const data = readJson(storageKey(ns, userId));
  if (!data || typeof data !== "object") return null;
  return {
    openCounts: normalizeCounts(data.openCounts),
    openCashTotal: String(data.openCashTotal ?? ""),
    openNotes: String(data.openNotes ?? ""),
    openAt: String(data.openAt ?? ""),
  };
}

export function writeOpenShiftDraft(ns, userId, draft) {
  if (!hasOpenShiftDraftContent(draft)) {
    clearOpenShiftDraft(ns, userId);
    return false;
  }
  try {
    localStorage.setItem(
      storageKey(ns, userId),
      JSON.stringify({
        openCounts: normalizeCounts(draft.openCounts),
        openCashTotal: String(draft.openCashTotal ?? ""),
        openNotes: String(draft.openNotes ?? ""),
        openAt: String(draft.openAt ?? ""),
        savedAt: Date.now(),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearOpenShiftDraft(ns, userId) {
  try {
    localStorage.removeItem(storageKey(ns, userId));
  } catch {
    /* ignore */
  }
}
