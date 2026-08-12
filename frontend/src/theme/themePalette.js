/**
 * Paleta de marca del sistema (claro / oscuro / neón).
 * Default = colores actuales de Raptor en getTheme.js.
 * Caché local para arranque sin pedir a la API cada vez.
 */
import { APP_ID } from "../config/appInfo.js";

export const THEME_PALETTE_VERSION = 1;

export const THEME_PALETTE_CACHE_KEY = `${APP_ID}-theme-palette`;

/** Colores actuales del sistema (fallback en código). */
export const DEFAULT_THEME_PALETTE = Object.freeze({
  v: THEME_PALETTE_VERSION,
  name: "Raptor",
  light: Object.freeze({
    primary: "#1A7A9A",
    primaryLight: "#3D9BB8",
    primaryDark: "#0F5A74",
    secondary: "#14B8A6",
    secondaryLight: "#5EEAD4",
    secondaryDark: "#0F766E",
    backgroundDefault: "#F0F9FB",
    backgroundPaper: "rgba(255,255,255,0.9)",
    textPrimary: "#0F2A36",
    textSecondary: "#3D6574",
  }),
  dark: Object.freeze({
    primary: "#2A8FB0",
    primaryLight: "#3D9BB8",
    primaryDark: "#156B88",
    secondary: "#2DD4BF",
    secondaryLight: "#5EEAD4",
    secondaryDark: "#14B8A6",
    backgroundDefault: "#0B1C24",
    backgroundPaper: "#102A36",
    textPrimary: "#E8F4F8",
    textSecondary: "rgba(232,244,248,0.72)",
  }),
  neon: Object.freeze({
    primary: "#22D3EE",
    primaryLight: "#67E8F9",
    primaryDark: "#0891B2",
    secondary: "#2DD4BF",
    secondaryLight: "#5EEAD4",
    secondaryDark: "#0D9488",
    backgroundDefault: "#030B12",
    backgroundPaper: "#071820",
    textPrimary: "#ECFEFF",
    textSecondary: "rgba(236,254,255,0.78)",
  }),
});

const MODE_KEYS = ["light", "dark", "neon"];
const COLOR_KEYS = [
  "primary",
  "primaryLight",
  "primaryDark",
  "secondary",
  "secondaryLight",
  "secondaryDark",
  "backgroundDefault",
  "backgroundPaper",
  "textPrimary",
  "textSecondary",
];

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RGBA_RE =
  /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|0?\.\d+|1(?:\.0)?)\s*)?\)$/i;

export function isValidCssColor(value) {
  const s = String(value || "").trim();
  if (!s) return false;
  if (HEX_RE.test(s)) return true;
  if (RGBA_RE.test(s)) return true;
  return false;
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function clamp255(n) {
  return Math.min(255, Math.max(0, Math.round(n)));
}

export function hexToRgb(hex) {
  let h = String(hex || "").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (!Number.isFinite(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((v) => clamp255(v).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

function hue2rgb(p, q, t) {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

export function hslToRgb(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp01(s);
  const ll = clamp01(l);
  if (ss === 0) {
    const v = clamp255(ll * 255);
    return { r: v, g: v, b: v };
  }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const hk = hh / 360;
  return {
    r: clamp255(hue2rgb(p, q, hk + 1 / 3) * 255),
    g: clamp255(hue2rgb(p, q, hk) * 255),
    b: clamp255(hue2rgb(p, q, hk - 1 / 3) * 255),
  };
}

export function shiftHex(hex, { h = 0, s = 0, l = 0 } = {}) {
  const rgb = hexToRgb(hex);
  if (!rgb) return String(hex || "").toUpperCase();
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const next = hslToRgb(hsl.h + h, clamp01(hsl.s + s), clamp01(hsl.l + l));
  return rgbToHex(next.r, next.g, next.b);
}

export function contrastTextFor(hex, light = "#FFFFFF", dark = "#0F2A36") {
  const rgb = hexToRgb(hex);
  if (!rgb) return light;
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 150 ? dark : light;
}

function cloneMode(modeObj, fallback) {
  const src = modeObj && typeof modeObj === "object" ? modeObj : {};
  const out = {};
  for (const key of COLOR_KEYS) {
    const raw = src[key] != null ? String(src[key]).trim() : "";
    out[key] = isValidCssColor(raw) ? raw : fallback[key];
  }
  return out;
}

function deepCloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_THEME_PALETTE));
}

export function normalizeThemePalette(raw) {
  let src = raw;
  if (typeof raw === "string") {
    try {
      src = JSON.parse(raw);
    } catch {
      src = null;
    }
  }
  if (!src || typeof src !== "object") {
    return deepCloneDefault();
  }
  const name =
    String(src.name || DEFAULT_THEME_PALETTE.name).trim().slice(0, 80) || "Raptor";
  return {
    v: THEME_PALETTE_VERSION,
    name,
    light: cloneMode(src.light, DEFAULT_THEME_PALETTE.light),
    dark: cloneMode(src.dark, DEFAULT_THEME_PALETTE.dark),
    neon: cloneMode(src.neon, DEFAULT_THEME_PALETTE.neon),
  };
}

export function serializeThemePalette(raw) {
  return JSON.stringify(normalizeThemePalette(raw));
}

export function readThemePaletteCache() {
  try {
    const raw = localStorage.getItem(THEME_PALETTE_CACHE_KEY);
    if (!raw) return null;
    return normalizeThemePalette(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeThemePaletteCache(palette) {
  try {
    const normalized = normalizeThemePalette(palette);
    localStorage.setItem(THEME_PALETTE_CACHE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return normalizeThemePalette(palette);
  }
}

export function clearThemePaletteCache() {
  try {
    localStorage.removeItem(THEME_PALETTE_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function exportThemePalette(palette) {
  const normalized = normalizeThemePalette(palette);
  return {
    ...normalized,
    exportedAt: new Date().toISOString(),
    appId: APP_ID,
  };
}

export function importThemePalette(raw) {
  let src = raw;
  if (typeof raw === "string") {
    try {
      src = JSON.parse(raw);
    } catch {
      throw new Error("JSON de paleta inválido.");
    }
  }
  if (!src || typeof src !== "object") {
    throw new Error("El archivo no contiene una paleta válida.");
  }
  const hasMode = MODE_KEYS.some((k) => src[k] && typeof src[k] === "object");
  if (!hasMode && !src.primary) {
    throw new Error("Faltan colores light/dark en la paleta.");
  }
  if (!hasMode && src.primary) {
    return buildPaletteFromSeed(src.primary, src.name);
  }
  return normalizeThemePalette(src);
}

/** A partir de un color semilla, arma light/dark/neon que combinan. */
export function buildPaletteFromSeed(seedHex, name = "Personalizada") {
  const seed = String(seedHex || "").trim();
  const rgb = hexToRgb(seed);
  if (!rgb) return normalizeThemePalette(DEFAULT_THEME_PALETTE);

  const primary = rgbToHex(rgb.r, rgb.g, rgb.b);
  const secondary = shiftHex(primary, { h: 28, s: 0.05, l: 0.02 });
  const secondaryAlt = shiftHex(primary, { h: -32, s: 0.04, l: 0.04 });

  return normalizeThemePalette({
    v: THEME_PALETTE_VERSION,
    name,
    light: {
      primary,
      primaryLight: shiftHex(primary, { l: 0.14 }),
      primaryDark: shiftHex(primary, { l: -0.12 }),
      secondary,
      secondaryLight: shiftHex(secondary, { l: 0.16 }),
      secondaryDark: shiftHex(secondary, { l: -0.1 }),
      backgroundDefault: shiftHex(primary, { s: -0.35, l: 0.42 }),
      backgroundPaper: "rgba(255,255,255,0.92)",
      textPrimary: shiftHex(primary, { s: -0.25, l: -0.38 }),
      textSecondary: shiftHex(primary, { s: -0.3, l: -0.18 }),
    },
    dark: {
      primary: shiftHex(primary, { l: 0.08 }),
      primaryLight: shiftHex(primary, { l: 0.18 }),
      primaryDark: shiftHex(primary, { l: -0.08 }),
      secondary: shiftHex(secondary, { l: 0.1 }),
      secondaryLight: shiftHex(secondary, { l: 0.2 }),
      secondaryDark: secondary,
      backgroundDefault: shiftHex(primary, { s: -0.2, l: -0.42 }),
      backgroundPaper: shiftHex(primary, { s: -0.25, l: -0.36 }),
      textPrimary: "#E8F4F8",
      textSecondary: "rgba(232,244,248,0.72)",
    },
    neon: {
      primary: shiftHex(primary, { s: 0.2, l: 0.12 }),
      primaryLight: shiftHex(primary, { s: 0.15, l: 0.24 }),
      primaryDark: shiftHex(primary, { l: -0.05 }),
      secondary: shiftHex(secondaryAlt, { s: 0.15, l: 0.1 }),
      secondaryLight: shiftHex(secondaryAlt, { l: 0.2 }),
      secondaryDark: shiftHex(secondaryAlt, { l: -0.05 }),
      backgroundDefault: "#030B12",
      backgroundPaper: "#071820",
      textPrimary: "#ECFEFF",
      textSecondary: "rgba(236,254,255,0.78)",
    },
  });
}

/** Sugerencias de semillas que combinan con el color dado. */
export function suggestSeedColors(seedHex) {
  const base = hexToRgb(seedHex)
    ? String(seedHex).trim()
    : DEFAULT_THEME_PALETTE.light.primary;
  return [
    { label: "Actual", hex: base },
    { label: "Complementario", hex: shiftHex(base, { h: 180 }) },
    { label: "Análogo +", hex: shiftHex(base, { h: 30 }) },
    { label: "Análogo −", hex: shiftHex(base, { h: -30 }) },
    { label: "Triádico", hex: shiftHex(base, { h: 120 }) },
    { label: "Más cálido", hex: shiftHex(base, { h: 15, s: 0.08 }) },
    { label: "Más frío", hex: shiftHex(base, { h: -18, s: 0.06 }) },
    { label: "Raptor", hex: DEFAULT_THEME_PALETTE.light.primary },
  ];
}

export function getModeSlice(palette, mode = "light") {
  const p = normalizeThemePalette(palette);
  if (mode === "dark") return p.dark;
  if (mode === "neon") return p.neon;
  return p.light;
}

export function paletteEquals(a, b) {
  try {
    return (
      JSON.stringify(normalizeThemePalette(a)) ===
      JSON.stringify(normalizeThemePalette(b))
    );
  } catch {
    return false;
  }
}
