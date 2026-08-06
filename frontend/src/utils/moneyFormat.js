/** Formato de dinero según config de la app (decimales + redondeo). */

export const MONEY_STORAGE_DECIMALS = 6;
export const MONEY_INPUT_MAX_DECIMALS = 5;

const toNum = (v) => {
  const n = Number(v);
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
  return Math.ceil(n * f - Number.EPSILON) / f;
}

/** Guarda / envía al API con hasta 6 decimales. */
export function toStorageMoney(value) {
  return roundMoney(value, MONEY_STORAGE_DECIMALS, "nearest");
}

/**
 * @param {number|string} value
 * @param {{ decimals?: number, roundingMode?: string, currency?: string }} [opts]
 */
export function formatMoney(value, opts = {}) {
  const decimals = normalizeMoneyDisplayDecimals(opts.decimals, 2);
  const mode = normalizeMoneyRoundingMode(opts.roundingMode, "up");
  const rounded = roundMoney(value, decimals, mode);
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: opts.currency || "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rounded);
}

export function formatMoneyFromApp(value, activeApp) {
  return formatMoney(value, {
    decimals: activeApp?.moneyDisplayDecimals,
    roundingMode: activeApp?.moneyRoundingMode,
  });
}
