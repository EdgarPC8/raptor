import { editorImageUrl } from "./editorImageUpload.js";

export const FULL_CROP = { x: 0, y: 0, w: 1, h: 1 };

export function clampCropNorm(crop = FULL_CROP) {
  const x = Math.max(0, Math.min(1, Number(crop.x) || 0));
  const y = Math.max(0, Math.min(1, Number(crop.y) || 0));
  const w = Math.max(0.02, Math.min(1 - x, Number(crop.w) ?? 1));
  const h = Math.max(0.02, Math.min(1 - y, Number(crop.h) ?? 1));
  return { x, y, w, h };
}

export function hasCrop(cropNorm) {
  if (!cropNorm) return false;
  const c = clampCropNorm(cropNorm);
  return c.x > 0.001 || c.y > 0.001 || c.w < 0.999 || c.h < 0.999;
}

/** Rectángulo normalizado entre dos puntos (marquee). */
export function cropNormFromPoints(a, b) {
  const x1 = Math.max(0, Math.min(1, Math.min(a.x, b.x)));
  const y1 = Math.max(0, Math.min(1, Math.min(a.y, b.y)));
  const x2 = Math.max(0, Math.min(1, Math.max(a.x, b.x)));
  const y2 = Math.max(0, Math.min(1, Math.max(a.y, b.y)));
  return clampCropNorm({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
}

/** Rectángulo en coords de documento (píxeles) entre dos puntos. */
export function docRectFromPoints(a, b, maxW, maxH) {
  const x1 = Math.max(0, Math.min(a.x, b.x));
  const y1 = Math.max(0, Math.min(a.y, b.y));
  const x2 = Math.min(maxW, Math.max(a.x, b.x));
  const y2 = Math.min(maxH, Math.max(a.y, b.y));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function layerNaturalSize(layer, natural) {
  return {
    w: Math.max(1, Number(natural?.w || layer?.w) || 1),
    h: Math.max(1, Number(natural?.h || layer?.h) || 1),
  };
}

/** Convierte un clic dentro de la caja de capa a coords normalizadas de imagen (0–1). */
export function pointerEventToCropNorm(e, layer, scale, natural = null, fit = "contain") {
  const rect = e.currentTarget.getBoundingClientRect();
  return pointerClientToCropNorm(
    e.clientX,
    e.clientY,
    rect,
    layer,
    scale,
    natural,
    fit
  );
}

export function pointerClientToCropNorm(
  clientX,
  clientY,
  elementRect,
  layer,
  scale,
  natural = null,
  fit = "contain"
) {
  const { w: nw, h: nh } = layerNaturalSize(layer, natural);
  const localX = (clientX - elementRect.left) * scale;
  const localY = (clientY - elementRect.top) * scale;
  const draw = getImageDrawRect(nw, nh, layer.w, layer.h, fit);
  return {
    x: (localX - draw.x) / draw.w,
    y: (localY - draw.y) / draw.h,
  };
}

/** Rectángulo donde se dibuja la imagen dentro de la caja de capa (coords doc). */
export function getImageDrawRect(nw, nh, boxW, boxH, fit = "contain") {
  const iw = Math.max(1, Number(nw) || 1);
  const ih = Math.max(1, Number(nh) || 1);
  const bw = Math.max(1, Number(boxW) || 1);
  const bh = Math.max(1, Number(boxH) || 1);

  if (fit === "fill") {
    return { x: 0, y: 0, w: bw, h: bh, scaleX: bw / iw, scaleY: bh / ih, fullSource: true };
  }

  const scale =
    fit === "contain" ? Math.min(bw / iw, bh / ih) : Math.max(bw / iw, bh / ih);
  const sw = iw * scale;
  const sh = ih * scale;

  return {
    x: (bw - sw) / 2,
    y: (bh - sh) / 2,
    w: sw,
    h: sh,
    scaleX: scale,
    scaleY: scale,
    fullSource: fit === "contain",
  };
}

export function cropNormToSourcePixels(cropNorm, nw, nh) {
  const c = clampCropNorm(cropNorm);
  const iw = Math.max(1, Math.round(Number(nw) || 1));
  const ih = Math.max(1, Math.round(Number(nh) || 1));
  const sx = Math.round(c.x * iw);
  const sy = Math.round(c.y * ih);
  const sw = Math.max(1, Math.round(c.w * iw));
  const sh = Math.max(1, Math.round(c.h * ih));
  return {
    sx: Math.min(sx, iw - 1),
    sy: Math.min(sy, ih - 1),
    sw: Math.min(sw, iw - sx),
    sh: Math.min(sh, ih - sy),
  };
}

export function splitCropHorizontal(cropNorm) {
  const c = clampCropNorm(cropNorm);
  const half = c.w / 2;
  return [
    { x: c.x, y: c.y, w: half, h: c.h },
    { x: c.x + half, y: c.y, w: half, h: c.h },
  ];
}

export function splitCropVertical(cropNorm) {
  const c = clampCropNorm(cropNorm);
  const half = c.h / 2;
  return [
    { x: c.x, y: c.y, w: c.w, h: half },
    { x: c.x, y: c.y + half, w: c.w, h: half },
  ];
}

export function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

/** Bounds de capa en coordenadas de documento (incluye offset del grupo). */
export function layerDocBounds(layer, group = null) {
  return {
    x: (group?.x || 0) + (layer.x || 0),
    y: (group?.y || 0) + (layer.y || 0),
    w: layer.w || 0,
    h: layer.h || 0,
  };
}

/** cropNorm (0–1 sobre imagen dibujada) → rect en coords de documento. */
export function cropNormToDocRect(cn, layer, group, naturalW, naturalH, fit = "contain") {
  const bounds = layerDocBounds(layer, group);
  const draw = getImageDrawRect(naturalW, naturalH, bounds.w, bounds.h, fit);
  const c = clampCropNorm(cn);
  return {
    x: bounds.x + draw.x + c.x * draw.w,
    y: bounds.y + draw.y + c.y * draw.h,
    w: c.w * draw.w,
    h: c.h * draw.h,
  };
}

/** Intersección entre selección de documento y caja de capa (coords doc). */
export function docRectIntersectLayer(docSel, layer, group = null) {
  if (!docSel || !layer) return null;
  const lx = (group?.x || 0) + (layer.x || 0);
  const ly = (group?.y || 0) + (layer.y || 0);
  const lw = layer.w || 0;
  const lh = layer.h || 0;

  const x1 = Math.max(docSel.x, lx);
  const y1 = Math.max(docSel.y, ly);
  const x2 = Math.min(docSel.x + docSel.w, lx + lw);
  const y2 = Math.min(docSel.y + docSel.h, ly + lh);

  if (x2 - x1 < 1 || y2 - y1 < 1) return null;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Convierte un rect en coords de documento a cropNorm sobre la imagen de la capa. */
export function docRectToCropNorm(docRect, layer, group, naturalW, naturalH, fit = "contain") {
  const lx = (group?.x || 0) + (layer.x || 0);
  const ly = (group?.y || 0) + (layer.y || 0);
  const draw = getImageDrawRect(naturalW, naturalH, layer.w || 1, layer.h || 1, fit);

  return clampCropNorm({
    x: (docRect.x - lx - draw.x) / draw.w,
    y: (docRect.y - ly - draw.y) / draw.h,
    w: docRect.w / draw.w,
    h: docRect.h / draw.h,
  });
}

/** Posición/tamaño en coords de capa del rectángulo de selección (cropNorm). */
export function cropSelectionToLayerRect(layer, cropNorm, naturalW, naturalH) {
  const fit = layer.props?.fit || "contain";
  const draw = getImageDrawRect(naturalW, naturalH, layer.w || 1, layer.h || 1, fit);
  const cn = clampCropNorm(cropNorm);
  return {
    x: Math.round((layer.x || 0) + draw.x + cn.x * draw.w),
    y: Math.round((layer.y || 0) + draw.y + cn.y * draw.h),
    w: Math.max(40, Math.round(cn.w * draw.w)),
    h: Math.max(40, Math.round(cn.h * draw.h)),
  };
}

/**
 * Photoshop / Photopea "Layer via Copy" (Ctrl+J):
 * Renderiza la capa como se ve y extrae el rect de selección del documento.
 */
export async function bakeLayerRegionFromDocSel(layer, group, docSel, mime = "image/png") {
  const src = layer?.props?.src;
  if (!src || !docSel || docSel.w < 1 || docSel.h < 1) return null;

  const bounds = layerDocBounds(layer, group);
  const url =
    src.startsWith("http") || src.startsWith("data:") || src.startsWith("blob:")
      ? src
      : editorImageUrl(src);
  const im = await loadImageElement(url);

  const cw = Math.max(1, Math.round(docSel.w));
  const ch = Math.max(1, Math.round(docSel.h));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");

  const fit = layer.props?.fit || "contain";
  const drawX = bounds.x - docSel.x;
  const drawY = bounds.y - docSel.y;
  drawImageWithCrop(ctx, im, drawX, drawY, bounds.w, bounds.h, fit, 0, layer.props?.cropNorm);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("No se pudo extraer la selección")),
      mime,
      mime === "image/jpeg" ? 0.92 : 1
    );
  });
}

/** Capa con hueco transparente donde cae la selección (cortar). */
export async function bakeLayerWithDocSelHole(layer, group, docSel, mime = "image/png") {
  const src = layer?.props?.src;
  if (!src) return null;

  const bounds = layerDocBounds(layer, group);
  const url =
    src.startsWith("http") || src.startsWith("data:") || src.startsWith("blob:")
      ? src
      : editorImageUrl(src);
  const im = await loadImageElement(url);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bounds.w));
  canvas.height = Math.max(1, Math.round(bounds.h));
  const ctx = canvas.getContext("2d");

  const fit = layer.props?.fit || "contain";
  drawImageWithCrop(ctx, im, 0, 0, bounds.w, bounds.h, fit, 0, layer.props?.cropNorm);

  const hx1 = Math.max(docSel.x, bounds.x) - bounds.x;
  const hy1 = Math.max(docSel.y, bounds.y) - bounds.y;
  const hx2 = Math.min(docSel.x + docSel.w, bounds.x + bounds.w) - bounds.x;
  const hy2 = Math.min(docSel.y + docSel.h, bounds.y + bounds.h) - bounds.y;
  if (hx2 > hx1 && hy2 > hy1) {
    ctx.clearRect(hx1, hy1, hx2 - hx1, hy2 - hy1);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo cortar la capa"))),
      mime,
      mime === "image/jpeg" ? 0.92 : 1
    );
  });
}

export async function bakeCropFromSrc(src, cropNorm, mime = "image/png") {
  const url = src.startsWith("http") || src.startsWith("data:") || src.startsWith("blob:")
    ? src
    : editorImageUrl(src);
  const im = await loadImageElement(url);
  const { sx, sy, sw, sh } = cropNormToSourcePixels(
    cropNorm,
    im.naturalWidth || im.width,
    im.naturalHeight || im.height
  );

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen recortada"))),
      mime,
      mime === "image/jpeg" ? 0.92 : 1
    );
  });
}

/** Imagen fuente con hueco transparente en cropNorm (para cortar selección). */
export async function bakeImageWithHole(src, cropNorm, mime = "image/png") {
  const url = src.startsWith("http") || src.startsWith("data:") || src.startsWith("blob:")
    ? src
    : editorImageUrl(src);
  const im = await loadImageElement(url);
  const iw = im.naturalWidth || im.width;
  const ih = im.naturalHeight || im.height;

  const canvas = document.createElement("canvas");
  canvas.width = iw;
  canvas.height = ih;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(im, 0, 0);

  const { sx, sy, sw, sh } = cropNormToSourcePixels(cropNorm, iw, ih);
  ctx.clearRect(sx, sy, sw, sh);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo cortar la imagen"))),
      mime,
      mime === "image/jpeg" ? 0.92 : 1
    );
  });
}

/** Dibuja imagen en canvas respetando fit y cropNorm (coords 0–1 sobre imagen fuente). */
export function drawImageWithCrop(ctx, im, x, y, w, h, fit = "cover", radius = 0, cropNorm = null) {
  const roundRectPath = (ctx2, rx, ry, rw, rh, r) => {
    const rr = Math.min(r, rw / 2, rh / 2);
    ctx2.beginPath();
    ctx2.moveTo(rx + rr, ry);
    ctx2.arcTo(rx + rw, ry, rx + rw, ry + rh, rr);
    ctx2.arcTo(rx + rw, ry + rh, rx, ry + rh, rr);
    ctx2.arcTo(rx, ry + rh, rx, ry, rr);
    ctx2.arcTo(rx, ry, rx + rw, ry, rr);
    ctx2.closePath();
  };

  if (radius > 0) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, radius);
    ctx.clip();
  }

  const cn = cropNorm && hasCrop(cropNorm) ? clampCropNorm(cropNorm) : null;
  const iw = im.width;
  const ih = im.height;

  let sx = 0;
  let sy = 0;
  let sw = iw;
  let sh = ih;

  if (cn) {
    ({ sx, sy, sw, sh } = cropNormToSourcePixels(cn, iw, ih));
  }

  if (fit === "fill") {
    ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h);
  } else {
    const scale =
      fit === "contain" ? Math.min(w / sw, h / sh) : Math.max(w / sw, h / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;
    ctx.drawImage(im, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  if (radius > 0) ctx.restore();
}
