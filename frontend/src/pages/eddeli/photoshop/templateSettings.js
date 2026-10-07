export const TEMPLATE_KINDS = ["producto", "manual", "mixto"];
export const BACKGROUND_MODES = ["image", "color", "none"];

/** Tamaños de lienzo por formato lógico (clave guardada en BD). */
export const CUSTOM_FORMAT_KEY = "custom";

export const TEMPLATE_FORMATS = {
  "16:9": { width: 1920, height: 1080, label: "16:9 (1920×1080) - Horizontal" },
  "9:16": { width: 1080, height: 1920, label: "9:16 (1080×1920) - Vertical/Stories" },
  "1:1": { width: 1080, height: 1080, label: "1:1 (1080×1080) - Cuadrado" },
  A4: { width: 2480, height: 3508, label: "A4 (2480×3508) - Impresión" },
  [CUSTOM_FORMAT_KEY]: {
    width: null,
    height: null,
    label: "Personalizado (ancho × alto en px)",
  },
};

export const DEFAULT_CUSTOM_CANVAS = { width: 496, height: 701 };

export function resolveCanvasSize(format, custom = {}) {
  const key = String(format || "").trim();
  if (key === CUSTOM_FORMAT_KEY) {
    const w = Number(custom.width ?? custom.customWidth);
    const h = Number(custom.height ?? custom.customHeight);
    if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
      return { width: Math.round(w), height: Math.round(h) };
    }
    return { ...DEFAULT_CUSTOM_CANVAS };
  }
  return getCanvasSizeByFormat(key);
}

export function getCanvasSizeByFormat(format) {
  const entry = TEMPLATE_FORMATS[format];
  if (entry?.width && entry?.height) return { width: entry.width, height: entry.height };
  return { width: 1920, height: 1080 };
}

export function getFormatLabel(format, row = {}) {
  if (String(format) === CUSTOM_FORMAT_KEY) {
    const w = row.canvasWidth ?? row.canvas?.width;
    const h = row.canvasHeight ?? row.canvas?.height;
    if (w && h) return `Personalizado (${w}×${h})`;
    return TEMPLATE_FORMATS[CUSTOM_FORMAT_KEY].label;
  }
  return TEMPLATE_FORMATS[format]?.label || format || "—";
}

export function isCustomFormat(format) {
  return String(format) === CUSTOM_FORMAT_KEY;
}

export const DEFAULT_TEMPLATE_SETTINGS = {
  templateKind: "manual",
  requiresProduct: false,
  backgroundMode: "none",
};

export const TEMPLATE_KIND_LABELS = {
  producto: "Producto (catálogo)",
  manual: "Manual (sin catálogo)",
  mixto: "Mixto (producto + fijo)",
};

export const BACKGROUND_MODE_LABELS = {
  image: "Imagen de fondo",
  color: "Color / forma",
  none: "Sin fondo especial",
};

const layerHasBind = (layer) => !!(layer?.bind?.textFrom || layer?.bind?.srcFrom);

export function normalizeTemplateSettings(raw = {}, ctx = {}) {
  const layers = Array.isArray(ctx.layers) ? ctx.layers : [];
  const backgroundSrc = ctx.backgroundSrc;

  let templateKind = TEMPLATE_KINDS.includes(raw.templateKind) ? raw.templateKind : null;
  if (!templateKind) {
    const boundCount = layers.filter(layerHasBind).length;
    if (boundCount === 0) templateKind = "manual";
    else if (boundCount >= layers.length && layers.length > 0) templateKind = "producto";
    else templateKind = "mixto";
  }

  let backgroundMode = BACKGROUND_MODES.includes(raw.backgroundMode) ? raw.backgroundMode : null;
  if (!backgroundMode) {
    if (backgroundSrc) backgroundMode = "image";
    else if (layers.some((l) => l.type === "shape" && l.props?.fill)) backgroundMode = "color";
    else backgroundMode = "none";
  }

  let requiresProduct;
  if (typeof raw.requiresProduct === "boolean") {
    requiresProduct = raw.requiresProduct;
  } else if (templateKind === "manual") {
    requiresProduct = false;
  } else if (templateKind === "producto") {
    requiresProduct = true;
  } else {
    requiresProduct = layers.some(layerHasBind);
  }

  const folders = Array.isArray(raw.folders)
    ? raw.folders
        .filter((f) => f && f.id)
        .map((f) => ({
          id: String(f.id),
          name: String(f.name || f.id),
          parentId: f.parentId ? String(f.parentId) : null,
          ...(f.collapsed ? { collapsed: true } : {}),
        }))
    : undefined;

  return {
    templateKind,
    requiresProduct,
    backgroundMode,
    ...(folders ? { folders } : {}),
  };
}

export function parseSettingsJson(raw) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? raw : {};
}

export function settingsFromRow(row = {}) {
  const settingsJson = parseSettingsJson(
    row.settingsJson || row.template?.settingsJson || row.meta || {}
  );
  const layers = row.layers || row.resolved?.layers || [];
  const normalized = normalizeTemplateSettings(
    {
      ...settingsJson,
      templateKind: row.templateKind ?? settingsJson.templateKind ?? row.meta?.templateKind,
      requiresProduct: row.requiresProduct ?? settingsJson.requiresProduct ?? row.meta?.requiresProduct,
      backgroundMode: row.backgroundMode ?? settingsJson.backgroundMode ?? row.meta?.backgroundMode,
      folders: settingsJson.folders ?? row.meta?.folders ?? row.folders,
    },
    {
      layers,
      backgroundSrc: row.backgroundSrc ?? row.resolved?.backgroundSrc,
    }
  );
  return normalized;
}

export function templateRequiresProduct(docOrSettings) {
  if (!docOrSettings) return false;
  if (typeof docOrSettings.requiresProduct === "boolean") return docOrSettings.requiresProduct;
  const meta = docOrSettings.meta || docOrSettings;
  return normalizeTemplateSettings(meta, {
    layers: docOrSettings.layers || [],
    backgroundSrc: docOrSettings.backgroundSrc,
  }).requiresProduct;
}

export function settingsToMeta(settings = {}) {
  const normalized = normalizeTemplateSettings(settings);
  const out = {
    templateKind: normalized.templateKind,
    requiresProduct: normalized.requiresProduct,
    backgroundMode: normalized.backgroundMode,
  };
  if (Array.isArray(normalized.folders)) out.folders = normalized.folders;
  return out;
}

export const TEXT_BIND_PRESETS = [
  { label: "ID producto", value: "product.id" },
  { label: "Nombre producto", value: "product.name" },
  { label: "Nombre catálogo", value: "product.displayName" },
  { label: "Precio", value: "computed.priceText" },
  { label: "Descripción", value: "desc" },
];

export const IMAGE_BIND_PRESETS = [
  { label: "Imagen catálogo", value: "imageUrl" },
  { label: "Imagen principal", value: "product.primaryImageUrl" },
  { label: "Código de barras (imagen)", value: "computed.barcodeImageUrl" },
];

export function getLayerBindMode(layer) {
  if (!layer || layer.type === "shape") return "fixed";
  const key = layer.type === "text" ? layer.bind?.textFrom : layer.bind?.srcFrom;
  return key ? "product" : "fixed";
}
