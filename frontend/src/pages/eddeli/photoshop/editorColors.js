/** Utilidades de color para el editor (swatches, gotero, capas). */

export function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(Number(n) || 0)));
}

export function rgbaToHex(r, g, b, a = 255) {
  const rr = clampByte(r).toString(16).padStart(2, "0");
  const gg = clampByte(g).toString(16).padStart(2, "0");
  const bb = clampByte(b).toString(16).padStart(2, "0");
  if (a >= 255) return `#${rr}${gg}${bb}`.toUpperCase();
  const aa = clampByte(a).toString(16).padStart(2, "0");
  return `#${rr}${gg}${bb}${aa}`.toUpperCase();
}

export function rgbaToCss(r, g, b, a = 255) {
  if (a >= 255) return rgbaToHex(r, g, b);
  return `rgba(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)}, ${(clampByte(a) / 255).toFixed(3)})`;
}

export function parseColor(input) {
  if (input == null) return "#000000";
  const s = String(input).trim();
  if (!s) return "#000000";

  if (s.startsWith("#")) {
    const h = s.slice(1);
    if (h.length === 3) {
      return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
    }
    if (h.length === 6) return `#${h}`.toUpperCase();
    if (h.length === 8) {
      const a = parseInt(h.slice(6, 8), 16);
      if (a < 255) {
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return rgbaToCss(r, g, b, a);
      }
      return `#${h.slice(0, 6)}`.toUpperCase();
    }
    return s;
  }

  const rgb = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgb) {
    const r = clampByte(rgb[1]);
    const g = clampByte(rgb[2]);
    const b = clampByte(rgb[3]);
    const a = rgb[4] != null ? clampByte(Number(rgb[4]) * (Number(rgb[4]) <= 1 ? 255 : 1)) : 255;
    return rgbaToCss(r, g, b, a);
  }

  return s;
}

/** Normaliza a valor usable en CSS (hex o rgba). */
export function normalizeColor(input) {
  return parseColor(input);
}

/** Para `<input type="color">` — solo acepta #RRGGBB. */
export function colorToPickerValue(input) {
  const c = parseColor(input);
  if (c.startsWith("#") && c.length >= 7) return c.slice(0, 7);
  if (c.startsWith("rgba")) {
    const m = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (m) return rgbaToHex(m[1], m[2], m[3]);
  }
  return "#000000";
}

export const DEFAULT_FOREGROUND = "#000000";
export const DEFAULT_BACKGROUND = "#FFFFFF";

/** Color principal de una capa (forma → fill, texto → color). */
export function getLayerColor(layer) {
  if (!layer) return null;
  if (layer.type === "shape") return layer.props?.fill ?? null;
  if (layer.type === "text") return layer.props?.color ?? null;
  return null;
}

/** Aplica color a capa forma o texto. */
export function layerColorPropPatch(layerType, color) {
  if (layerType === "shape") return { fill: color };
  if (layerType === "text") return { color };
  return null;
}

export function canLayerTakeColor(layer) {
  return layer && (layer.type === "shape" || layer.type === "text") && !layer.locked;
}
