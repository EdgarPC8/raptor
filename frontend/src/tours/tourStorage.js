/**
 * Persistencia de tours guiados (primera vez vs reabrir).
 * Clave: raptor.tour.<tourId>.done
 */

const PREFIX = "raptor.tour.";

export function tourDoneKey(tourId) {
  return `${PREFIX}${tourId}.done`;
}

export function hasCompletedTour(tourId) {
  try {
    return localStorage.getItem(tourDoneKey(tourId)) === "1";
  } catch {
    return false;
  }
}

export function markTourCompleted(tourId) {
  try {
    localStorage.setItem(tourDoneKey(tourId), "1");
  } catch {
    /* private mode / quota */
  }
}

export function resetTour(tourId) {
  try {
    localStorage.removeItem(tourDoneKey(tourId));
  } catch {
    /* ignore */
  }
}
