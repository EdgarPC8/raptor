/**
 * Genera SVG Code 128B (suficiente para claves de acceso SRI de 49 dígitos).
 * Sin dependencias externas.
 */

const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "212113", "212311", "232111", "111213", "131113", "131311", "111133", "111331",
  "113131", "113113", "133111", "313111", "211331", "131131", "213113", "213311", "213131", "311123",
  "311321", "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224", "111422",
  "121124", "121421", "141122", "141221", "112214", "112412", "122114", "122411", "142112", "142211",
  "241211", "221114", "413111", "241112", "134111", "111242", "121142", "121241", "114212", "124112",
  "124211", "411212", "421112", "421211", "212141", "214121", "412121", "111143", "111341", "131141",
  "114113", "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412", "211214",
  "211232", "2331112",
];

const START_B = 104;
const STOP = 106;

function toCode128BValues(text) {
  const values = [START_B];
  let checksum = START_B;
  let pos = 1;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i) - 32;
    if (code < 0 || code > 95) continue;
    values.push(code);
    checksum += code * pos;
    pos += 1;
  }
  values.push(checksum % 103);
  values.push(STOP);
  return values;
}

/** Devuelve path `d` de barras Code128 (unidades relativas). */
export function buildCode128Bars(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const values = toCode128BValues(raw);
  let x = 0;
  const rects = [];
  values.forEach((v) => {
    const pattern = PATTERNS[v];
    if (!pattern) return;
    for (let i = 0; i < pattern.length; i += 1) {
      const w = Number(pattern[i]);
      if (i % 2 === 0) {
        rects.push({ x, w });
      }
      x += w;
    }
  });
  return { width: x, rects };
}

/** SVG listo para incrustar (preview / print). */
export function code128SvgMarkup(text, { height = 42, maxWidth = 280 } = {}) {
  const bars = buildCode128Bars(text);
  if (!bars) return "";
  const scale = maxWidth / bars.width;
  const barH = height;
  const parts = bars.rects
    .map((r) => `<rect x="${(r.x * scale).toFixed(2)}" y="0" width="${(r.w * scale).toFixed(2)}" height="${barH}" fill="#000"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${maxWidth}" height="${barH}" viewBox="0 0 ${maxWidth} ${barH}" preserveAspectRatio="none" aria-hidden="true">${parts}</svg>`;
}
