/**
 * Slots de producto: una plantilla puede tener N “cards”
 * (Producto 1, Producto 2, …) con datos distintos en Vista con productos.
 *
 * Persistencia: layer.props.productSlot (0-based) y opcionalmente folder.productSlot.
 */
import { getLayerFolderId } from "./layerFolders.js";
import { code128SvgMarkup } from "../../../utils/code128Barcode.js";

export const MAX_PRODUCT_SLOTS = 24;

export function normalizeSlotIndex(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(MAX_PRODUCT_SLOTS - 1, Math.floor(n));
}

export function layerHasProductBind(layer) {
  return !!(layer?.bind?.textFrom || layer?.bind?.srcFrom || layer?.fieldKey);
}

/** Slot efectivo de una capa (props → folder → 0 si tiene bind). */
export function getLayerProductSlot(layer, folders = []) {
  const fromProps = normalizeSlotIndex(layer?.props?.productSlot);
  if (fromProps != null) return fromProps;

  const fromBind = normalizeSlotIndex(layer?.bind?.productSlot);
  if (fromBind != null) return fromBind;

  const folderId = getLayerFolderId(layer);
  if (folderId) {
    const folder = (folders || []).find((f) => f.id === folderId);
    const fromFolder = normalizeSlotIndex(folder?.productSlot);
    if (fromFolder != null) return fromFolder;
  }

  return layerHasProductBind(layer) ? 0 : null;
}

/** Índices de slot usados en la plantilla (ordenados). */
export function collectUsedProductSlots(layers = [], folders = []) {
  const set = new Set();
  for (const layer of layers || []) {
    if (!layerHasProductBind(layer)) continue;
    const slot = getLayerProductSlot(layer, folders);
    if (slot != null) set.add(slot);
  }
  for (const folder of folders || []) {
    const slot = normalizeSlotIndex(folder?.productSlot);
    if (slot != null) set.add(slot);
  }
  return [...set].sort((a, b) => a - b);
}

export function nextFreeProductSlot(layers = [], folders = []) {
  const used = new Set(collectUsedProductSlots(layers, folders));
  for (let i = 0; i < MAX_PRODUCT_SLOTS; i += 1) {
    if (!used.has(i)) return i;
  }
  return Math.min(MAX_PRODUCT_SLOTS - 1, used.size);
}

/** Datos de un slot: slots[i] o, si i===0 y no hay slots, el doc.data plano (legacy). */
export function getSlotData(docData, slotIndex = 0) {
  const root = docData && typeof docData === "object" ? docData : {};
  const idx = normalizeSlotIndex(slotIndex) ?? 0;
  const slots = Array.isArray(root.slots) ? root.slots : null;

  if (slots && slots[idx] && typeof slots[idx] === "object") {
    return slots[idx];
  }

  if (idx === 0) {
    // Compat: plantillas de un solo producto siguen usando la raíz
    return root;
  }

  return {};
}

export function slotLabel(slotIndex) {
  const idx = normalizeSlotIndex(slotIndex) ?? 0;
  return `Producto ${idx + 1}`;
}

/** Patch de doc.data al elegir un ítem de catálogo para un slot. */
export function buildSlotSelectionPatch(docData, slotIndex, catalogItem) {
  if (!catalogItem) return null;

  const idx = normalizeSlotIndex(slotIndex) ?? 0;
  const product = catalogItem.product || {};
  const { product: _p, ...catalogFields } = catalogItem;

  const imageUrl =
    catalogFields.imageUrl ??
    product.primaryImageUrl ??
    (typeof catalogFields.data?.imageUrl === "string" ? catalogFields.data.imageUrl : "");

  // displayPrice del API puede venir ya formateado ("$0.50")
  let priceText = "";
  if (typeof catalogFields.displayPrice === "string" && catalogFields.displayPrice.trim()) {
    priceText = catalogFields.displayPrice.trim().startsWith("$")
      ? catalogFields.displayPrice.trim()
      : `$${catalogFields.displayPrice.trim()}`;
  } else {
    const price =
      catalogFields.priceOverride ??
      product.price ??
      catalogFields.price ??
      null;
    if (price != null && !Number.isNaN(Number(price))) {
      priceText = `$${Number(price).toFixed(2)}`;
    }
  }

  const barcodeRaw = String(product.barcode || product.sku || "").trim();
  const barcodeImageUrl = barcodeRaw
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        code128SvgMarkup(barcodeRaw, { height: 80, maxWidth: 420 })
      )}`
    : "";

  const entry = {
    ...catalogFields,
    product,
    imageUrl: imageUrl || undefined,
    computed: {
      ...(catalogFields.computed || {}),
      priceText,
      barcodeImageUrl,
    },
  };

  const prev = docData && typeof docData === "object" ? docData : {};
  const prevSlots = Array.isArray(prev.slots) ? [...prev.slots] : [];
  while (prevSlots.length <= idx) prevSlots.push(null);
  prevSlots[idx] = entry;

  const patch = { slots: prevSlots };

  // Mantener raíz sincronizada con slot 0 (plantillas legacy / un producto)
  if (idx === 0) {
    Object.assign(patch, entry);
  }

  return patch;
}

export function withLayerProductSlot(layer, slotIndex) {
  const idx = normalizeSlotIndex(slotIndex);
  const props = { ...(layer.props || {}) };
  if (idx == null) {
    delete props.productSlot;
    const bind = layer.bind ? { ...layer.bind } : null;
    if (bind) delete bind.productSlot;
    return {
      ...layer,
      props,
      bind: bind && (bind.textFrom || bind.srcFrom) ? bind : layer.bind,
    };
  }
  props.productSlot = idx;
  const bind = layer.bind ? { ...layer.bind, productSlot: idx } : { productSlot: idx };
  return { ...layer, props, bind };
}
