/**
 * Layout oficial etiqueta unitaria EdDeli (496×701).
 * Proporciones basadas en el arte de marca: logo arriba, nombre centro, contacto abajo.
 */

export const ETIQUETA_CANVAS = { width: 496, height: 701 };

/** Recortes normalizados sobre imagen compuesta (logo ~55%, pie ~32%). */
export const ETIQUETA_CROP = {
  logo: { x: 0, y: 0, w: 1, h: 0.55 },
  footer: { x: 0, y: 0.68, w: 1, h: 0.32 },
};

/** Posición de capas en píxeles (coords relativas al grupo). */
export function getEtiquetaLayerLayout(cw = ETIQUETA_CANVAS.width, ch = ETIQUETA_CANVAS.height) {
  const sx = cw / ETIQUETA_CANVAS.width;
  const sy = ch / ETIQUETA_CANVAS.height;
  const s = Math.min(sx, sy);

  return {
    label_bg: { x: 0, y: 0, w: cw, h: ch },
    logo_brand: {
      x: Math.round(48 * sx),
      y: Math.round(10 * sy),
      w: Math.round(400 * sx),
      h: Math.round(175 * sy),
    },
    product_image: {
      x: Math.round(108 * sx),
      y: Math.round(195 * sy),
      w: Math.round(280 * s),
      h: Math.round(280 * s),
    },
    sep_line_l: {
      x: Math.round(20 * sx),
      y: Math.round(478 * sy),
      w: Math.round(100 * sx),
      h: Math.max(2, Math.round(3 * sy)),
    },
    sep_line_r: {
      x: Math.round(376 * sx),
      y: Math.round(478 * sy),
      w: Math.round(100 * sx),
      h: Math.max(2, Math.round(3 * sy)),
    },
    product_name: {
      x: Math.round(16 * sx),
      y: Math.round(485 * sy),
      w: Math.round(464 * sx),
      h: Math.round(48 * sy),
    },
    footer_contact: {
      x: Math.round(20 * sx),
      y: Math.round(540 * sy),
      w: Math.round(456 * sx),
      h: Math.round(155 * sy),
    },
  };
}

export const ETIQUETA_LAYER_IDS = [
  "label_bg",
  "logo_brand",
  "product_image",
  "sep_line_l",
  "sep_line_r",
  "product_name",
  "footer_contact",
];

/** IDs alternativos de plantillas antiguas → capa destino del layout nuevo. */
export const ETIQUETA_LAYER_ALIASES = {
  logo: ["logo_brand", "logo"],
  footer: ["footer_contact", "precio_redes", "zone_barcode"],
  name: ["product_name", "nombre_producto"],
  product: ["product_image"],
};
