import { editorImageUrl } from "./editorImageUpload.js";
import { getImageDrawRect, layerDocBounds } from "./imageCrop.js";

function parseViewBox(svgEl) {
  const vb = (svgEl.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb.every((n) => Number.isFinite(n))) {
    return { minX: vb[0], minY: vb[1], width: vb[2], height: vb[3] };
  }
  const w = parseFloat(svgEl.getAttribute("width")) || 2048;
  const h = parseFloat(svgEl.getAttribute("height")) || 1365;
  return { minX: 0, minY: 0, width: w, height: h };
}

/**
 * Une markup SVG sin tocar coordenadas de paths.
 * El viewBox resultante cubre todos los viewBoxes de origen.
 */
export function combineSvgDocuments(svgTexts = []) {
  const parser = new DOMParser();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let widthAttr = "";
  let heightAttr = "";
  const defsChunks = [];
  const bodyChunks = [];
  const seenDefIds = new Set();
  let any = false;

  for (const text of svgTexts) {
    if (!text || typeof text !== "string") continue;
    const doc = parser.parseFromString(text, "image/svg+xml");
    const svg = doc.documentElement;
    if (!svg || svg.tagName.toLowerCase() !== "svg") continue;
    any = true;

    const vb = parseViewBox(svg);
    minX = Math.min(minX, vb.minX);
    minY = Math.min(minY, vb.minY);
    maxX = Math.max(maxX, vb.minX + vb.width);
    maxY = Math.max(maxY, vb.minY + vb.height);

    if (svg.getAttribute("width")) widthAttr = svg.getAttribute("width");
    if (svg.getAttribute("height")) heightAttr = svg.getAttribute("height");

    for (const child of Array.from(svg.children)) {
      const tag = child.tagName.toLowerCase();
      if (tag === "defs") {
        for (const defChild of Array.from(child.children)) {
          const id = defChild.getAttribute("id");
          if (id && seenDefIds.has(id)) continue;
          if (id) seenDefIds.add(id);
          defsChunks.push(defChild.outerHTML);
        }
      } else {
        bodyChunks.push(child.outerHTML);
      }
    }
  }

  if (!any) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" version="1.1" viewBox="0 0 1 1"></svg>`;
  }

  const vbW = Math.max(1, maxX - minX);
  const vbH = Math.max(1, maxY - minY);
  const viewBox = `${minX} ${minY} ${vbW} ${vbH}`;
  const width = widthAttr || String(Math.round(vbW));
  const height = heightAttr || String(Math.round(vbH));
  const defs =
    defsChunks.length > 0 ? `<defs>${defsChunks.join("")}</defs>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" version="1.1" viewBox="${viewBox}">${defs}${bodyChunks.join("")}</svg>`;
}

/**
 * Fusiona capas SVG:
 * - No reescribe coordenadas del código SVG (ya van en el viewBox).
 * - Solo calcula el marco de capa (x,y,w,h) como unión de las capas.
 * @returns {{ svg: string, layerPatch: { x, y, w, h, groupId } | null }}
 */
export function combineSvgLayersAtPositions(layers = [], svgTexts = [], groups = []) {
  const groupById = new Map((groups || []).map((g) => [g.id, g]));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const layer of layers) {
    if (!layer) continue;
    const group = groupById.get(layer.groupId) || null;
    const bounds = layerDocBounds(layer, group);
    if (bounds.w < 1 || bounds.h < 1) continue;
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.w);
    maxY = Math.max(maxY, bounds.y + bounds.h);
  }

  const svg = combineSvgDocuments(svgTexts);

  if (!Number.isFinite(minX)) {
    return { svg, layerPatch: null };
  }

  const keep = layers[layers.length - 1];
  const keepGroup = keep ? groupById.get(keep.groupId) : null;
  const gx = keepGroup?.x || 0;
  const gy = keepGroup?.y || 0;

  return {
    svg,
    layerPatch: {
      x: Math.round(minX - gx),
      y: Math.round(minY - gy),
      w: Math.max(1, Math.round(maxX - minX)),
      h: Math.max(1, Math.round(maxY - minY)),
      groupId: keep?.groupId || keepGroup?.id,
    },
  };
}

export async function fetchSvgText(relativeOrUrl) {
  const url = editorImageUrl(relativeOrUrl) || relativeOrUrl;
  if (!url) throw new Error("SVG sin ruta");
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`No se pudo leer SVG (${res.status})`);
  return res.text();
}

/** Slug seguro para key de grupo (persistente en BD). */
export function slugGroupKey(name, fallback = "Grupo") {
  const raw = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 72);
  return raw || fallback;
}

/** Doc selection → coords en espacio viewBox del SVG. */
export function docSelToSvgViewBox(layer, group, docSel, viewBox) {
  const bounds = layerDocBounds(layer, group);
  const fit = layer.props?.fit || "contain";
  const draw = getImageDrawRect(
    viewBox.width,
    viewBox.height,
    bounds.w,
    bounds.h,
    fit
  );
  const contentX = bounds.x + draw.x;
  const contentY = bounds.y + draw.y;
  const sx = ((docSel.x - contentX) / draw.w) * viewBox.width + viewBox.minX;
  const sy = ((docSel.y - contentY) / draw.h) * viewBox.height + viewBox.minY;
  const sw = (docSel.w / draw.w) * viewBox.width;
  const sh = (docSel.h / draw.h) * viewBox.height;
  return { x: sx, y: sy, w: sw, h: sh, shape: docSel.shape || "rect" };
}

function collectSvgInner(svgEl) {
  const defs = [];
  const body = [];
  for (const child of Array.from(svgEl.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag === "defs") defs.push(child.innerHTML);
    else body.push(child.outerHTML);
  }
  return { defsHtml: defs.join(""), bodyHtml: body.join("") };
}

/** Prefija ids existentes para que un corte nuevo no choque con sel_clip/hole_mask viejos. */
function uniqueifySvgDomIds(svgEl, prefix) {
  if (!svgEl || !prefix) return;
  const nodes = Array.from(svgEl.querySelectorAll("[id]"));
  const remap = new Map(); // old -> new (first occurrence)
  const used = new Set();
  for (const el of nodes) {
    const old = el.getAttribute("id");
    if (!old) continue;
    let neu = remap.get(old);
    if (!neu) {
      neu = `${prefix}${old}`.replace(/[^a-zA-Z0-9_-]/g, "_");
      let n = 2;
      while (used.has(neu)) {
        neu = `${prefix}${old}_${n}`.replace(/[^a-zA-Z0-9_-]/g, "_");
        n += 1;
      }
      remap.set(old, neu);
      used.add(neu);
      el.setAttribute("id", neu);
    } else {
      // id duplicado: dar uno único al elemento; refs url(#old) siguen al primero
      let extra = `${neu}_x${used.size}`;
      while (used.has(extra)) extra = `${neu}_x${used.size}_${Math.random().toString(36).slice(2, 5)}`;
      used.add(extra);
      el.setAttribute("id", extra);
    }
  }
  if (!remap.size) return;

  const rewrite = (value) => {
    let next = String(value || "");
    for (const [old, neu] of remap) {
      next = next.split(`url(#${old})`).join(`url(#${neu})`);
      next = next.split(`url('#${old}')`).join(`url('#${neu}')`);
      next = next.split(`url("#${old}")`).join(`url("#${neu}")`);
    }
    for (const [old, neu] of remap) {
      if (next === `#${old}`) next = `#${neu}`;
    }
    return next;
  };

  for (const el of Array.from(svgEl.querySelectorAll("*"))) {
    for (const attr of Array.from(el.attributes)) {
      if (!attr?.value || !attr.value.includes("#")) continue;
      const next = rewrite(attr.value);
      if (next !== attr.value) el.setAttribute(attr.name, next);
    }
  }
}

function bakeIdPrefix() {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}_`;
}

/**
 * Extrae la región seleccionada como un SVG nuevo (sigue siendo vector).
 */
export async function bakeSvgRegionFromDocSel(layer, group, docSel) {
  const src = layer?.props?.src;
  if (!src || !docSel || docSel.w < 1 || docSel.h < 1) return null;

  const text = await fetchSvgText(src);
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "image/svg+xml");
  const svg = xml.documentElement;
  if (!svg || svg.tagName.toLowerCase() !== "svg") return null;

  const prefix = bakeIdPrefix();
  uniqueifySvgDomIds(svg, prefix);

  const vb = parseViewBox(svg);
  const region = docSelToSvgViewBox(layer, group, docSel, vb);
  if (region.w < 0.5 || region.h < 0.5) return null;

  const { defsHtml, bodyHtml } = collectSvgInner(svg);
  if (!bodyHtml.trim()) return null;

  const clipId = `${prefix}sel_clip`;
  const clipShape =
    region.shape === "ellipse"
      ? `<ellipse cx="${region.x + region.w / 2}" cy="${region.y + region.h / 2}" rx="${region.w / 2}" ry="${region.h / 2}" />`
      : `<rect x="${region.x}" y="${region.y}" width="${region.w}" height="${region.h}" />`;

  const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(1, Math.round(region.w))}" height="${Math.max(1, Math.round(region.h))}" version="1.1" viewBox="${region.x} ${region.y} ${region.w} ${region.h}">
<defs>${defsHtml}<clipPath id="${clipId}">${clipShape}</clipPath></defs>
<g clip-path="url(#${clipId})">${bodyHtml}</g>
</svg>`;

  return new File(
    [out],
    `${String(layer.name || "sel").replace(/[^\w\-]+/g, "_").slice(0, 40)}_sel.svg`,
    { type: "image/svg+xml" }
  );
}

/**
 * SVG original con un hueco donde estaba la selección — sigue siendo SVG.
 */
export async function bakeSvgWithDocSelHole(layer, group, docSel) {
  const src = layer?.props?.src;
  if (!src || !docSel) return null;

  const text = await fetchSvgText(src);
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "image/svg+xml");
  const svg = xml.documentElement;
  if (!svg || svg.tagName.toLowerCase() !== "svg") return null;

  const prefix = bakeIdPrefix();
  uniqueifySvgDomIds(svg, prefix);

  const vb = parseViewBox(svg);
  const region = docSelToSvgViewBox(layer, group, docSel, vb);
  const { defsHtml, bodyHtml } = collectSvgInner(svg);

  const maskId = `${prefix}hole_mask`;
  const holeShape =
    region.shape === "ellipse"
      ? `<ellipse cx="${region.x + region.w / 2}" cy="${region.y + region.h / 2}" rx="${region.w / 2}" ry="${region.h / 2}" fill="black" />`
      : `<rect x="${region.x}" y="${region.y}" width="${region.w}" height="${region.h}" fill="black" />`;

  const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${svg.getAttribute("width") || Math.round(vb.width)}" height="${svg.getAttribute("height") || Math.round(vb.height)}" version="1.1" viewBox="${vb.minX} ${vb.minY} ${vb.width} ${vb.height}">
<defs>${defsHtml}
<mask id="${maskId}">
  <rect x="${vb.minX}" y="${vb.minY}" width="${vb.width}" height="${vb.height}" fill="white" />
  ${holeShape}
</mask>
</defs>
<g mask="url(#${maskId})">${bodyHtml}</g>
</svg>`;

  return new File(
    [out],
    `${String(layer.name || "svg").replace(/[^\w\-]+/g, "_").slice(0, 40)}_rest.svg`,
    { type: "image/svg+xml" }
  );
}
