/** Conversión px ↔ % respecto al canvas del documento. */

export function pxToPct(value, total) {
  if (!total) return 0;
  return Math.round((Number(value) / total) * 10000) / 100;
}

export function pctToPx(value, total) {
  return Math.round((Number(value) / 100) * total);
}

export function clampPx(value, min = 0, max = Infinity) {
  const n = Math.round(Number(value) || 0);
  return Math.max(min, Math.min(max, n));
}
