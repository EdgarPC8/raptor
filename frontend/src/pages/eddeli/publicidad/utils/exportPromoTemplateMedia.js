/**
 * Renderiza una plantilla de diseño promocional (con previewData/productos)
 * a PNG y la sube a publicidad para usarla como pieza de campaña.
 *
 * En TV se reproduce como imagen a pantalla completa (contentType=template).
 */
import { getEditorTemplateResolved } from "../../../../api/editorRequest.js";
import { getAllProducts } from "../../../../api/inventoryControlRequest.js";
import { uploadPublicidadImage, normalizeMediaItem } from "../../../../api/publicidadRequest.js";
import { CONTENT_TYPES } from "../constants.js";
import { renderDocToCanvas } from "../../photoshop/docCanvasRender.js";
import { resolveTemplate } from "../../photoshop/bind/resolveTemplate.js";
import { parseSettingsJson } from "../../photoshop/templateSettings.js";
import { buildSlotSelectionPatch } from "../../photoshop/productSlots.js";

function dataUrlToFile(dataUrl, filename) {
  const [header, b64] = String(dataUrl).split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] || "image/png";
  const bin = atob(b64 || "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function productIdFromSlot(slot) {
  return slot?.product?.id ?? slot?.id ?? null;
}

/** Rehidrata slots con datos frescos del inventario (precio/imagen) antes de rasterizar. */
async function hydratePreviewData(previewData) {
  const base = previewData && typeof previewData === "object" ? { ...previewData } : {};
  const slots = Array.isArray(base.slots) ? [...base.slots] : [];
  const ids = new Set();
  for (const slot of slots) {
    const id = productIdFromSlot(slot);
    if (id != null) ids.add(String(id));
  }
  const rootId = productIdFromSlot(base);
  if (rootId != null) ids.add(String(rootId));
  if (!ids.size) return base;

  try {
    const { data } = await getAllProducts({ all: "true" });
    const raw = Array.isArray(data)
      ? data
      : Array.isArray(data?.products)
        ? data.products
        : Array.isArray(data?.rows)
          ? data.rows
          : [];
    const byId = new Map(raw.map((p) => [String(p.id), p]));

    let next = { ...base };
    const nextSlots = slots.map((slot, idx) => {
      const id = productIdFromSlot(slot);
      if (id == null) return slot;
      const product = byId.get(String(id));
      if (!product) return slot;
      const catalogLike = {
        id: product.id,
        displayName: product.name || "",
        title: product.name || "",
        displayPrice:
          product.price != null && Number.isFinite(Number(product.price))
            ? `$${Number(product.price).toFixed(2)}`
            : "",
        imageUrl: product.primaryImageUrl || "",
        product,
      };
      const patch = buildSlotSelectionPatch(next, idx, catalogLike);
      if (patch?.slots?.[idx]) {
        next = { ...next, slots: patch.slots };
        return patch.slots[idx];
      }
      return slot;
    });
    next.slots = nextSlots;

    // Sync raíz con slot 0
    if (nextSlots[0]) {
      const { slots: _s, ...rest } = next;
      next = { ...rest, ...nextSlots[0], slots: nextSlots };
    }
    return next;
  } catch (err) {
    console.warn("[exportPromoTemplate] no se pudieron rehidratar productos:", err);
    return base;
  }
}

/**
 * @param {number|string} templateId
 * @returns {Promise<{id, type, title, subtitle, mediaPath, previewUrl, durationHint, templateId}>}
 */
export async function exportPromoTemplateAsPublicidadItem(templateId) {
  const res = await getEditorTemplateResolved(templateId);
  const row = res?.data ?? res;
  const resolved = row?.resolved || row;
  const template = row?.template || {};
  const settings = parseSettingsJson(template.settingsJson || resolved?.meta || {});

  const doc = {
    canvas: resolved?.canvas || {
      width: template.canvasWidth || 1920,
      height: template.canvasHeight || 1080,
    },
    groups: resolved?.groups || [],
    layers: resolved?.layers || [],
    folders: resolved?.folders || resolved?.meta?.folders || settings.folders || [],
    meta: resolved?.meta || {},
  };

  const rawData =
    (resolved?.data && typeof resolved.data === "object" ? resolved.data : null) ||
    settings.previewData ||
    resolved?.meta?.previewData ||
    {};

  const data = await hydratePreviewData(rawData);
  const resolvedDoc = resolveTemplate(doc, data);
  const { dataUrl } = await renderDocToCanvas(resolvedDoc, data, {
    mime: "image/png",
    background: "#ffffff",
  });

  const name =
    template.name ||
    resolved?.meta?.name ||
    `plantilla_${templateId}`;
  const safe = String(name)
    .replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]+/gi, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60) || `plantilla_${templateId}`;

  const file = dataUrlToFile(dataUrl, `${safe}.png`);
  const uploaded = await uploadPublicidadImage(file, { name: safe, replace: true });
  const imageItem = uploaded?.data || uploaded;

  return normalizeMediaItem({
    id: String(templateId),
    type: CONTENT_TYPES.TEMPLATE,
    title: name,
    subtitle: "Plantilla de diseño (con productos)",
    mediaPath: imageItem.mediaPath,
    durationHint: 12,
    templateId: Number(templateId),
  });
}
