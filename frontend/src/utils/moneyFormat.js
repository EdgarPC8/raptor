/** Formato de dinero según config de la app (decimales + redondeo). */

export const MONEY_STORAGE_DECIMALS = 6;
/** Máx. decimales en inputs; alineado a BD (DECIMAL 14,6). */
export const MONEY_INPUT_MAX_DECIMALS = 6;

const toNum = (v) => {
  if (v === "" || v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim().replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export function normalizeMoneyDisplayDecimals(raw, fallback = 2) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(6, Math.trunc(n)));
}

export function normalizeMoneyRoundingMode(raw, fallback = "up") {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "up" || s === "down" || s === "nearest") return s;
  return fallback;
}

/**
 * @param {number|string} value
 * @param {number} decimals
 * @param {'up'|'down'|'nearest'} mode
 */
export function roundMoney(value, decimals = 2, mode = "up") {
  const n = toNum(value);
  const d = normalizeMoneyDisplayDecimals(decimals, 2);
  const f = 10 ** d;
  const m = normalizeMoneyRoundingMode(mode, "up");
  if (m === "down") return Math.floor(n * f + Number.EPSILON) / f;
  if (m === "nearest") return Math.round(n * f + Number.EPSILON) / f;
  return Math.ceil(n * f - Number.EPSILON) / f || 0;
}

/** Guarda / envía al API con hasta 6 decimales. */
export function toStorageMoney(value) {
  return roundMoney(value, MONEY_STORAGE_DECIMALS, "nearest");
}

/**
 * Valor limpio para <input type="number"> (sin basura de DECIMAL/"0.000860").
 * Usa hasta 6 decimales y quita ceros finales.
 */
export function toMoneyInputValue(value) {
  const n = toNum(value);
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "0";
  const fixed = n.toFixed(MONEY_STORAGE_DECIMALS);
  return fixed.replace(/\.?0+$/, "");
}

/**
 * @param {number|string} value
 * @param {{ decimals?: number, roundingMode?: string, currency?: string }} [opts]
 */
export function formatMoney(value, opts = {}) {
  const decimals = normalizeMoneyDisplayDecimals(opts.decimals, 2);
  const mode = normalizeMoneyRoundingMode(opts.roundingMode, "up");
  const rounded = roundMoney(value, decimals, mode);
  const safe = Object.is(rounded, -0) ? 0 : rounded;
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: opts.currency || "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safe);
}

export function formatMoneyFromApp(value, activeApp) {
  return formatMoney(value, {
    decimals: activeApp?.moneyDisplayDecimals,
    roundingMode: activeApp?.moneyRoundingMode,
  });
}
