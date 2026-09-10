/**
 * Formato del detalle de productos en factura / nota de venta.
 */
import { normalizePrintFormat } from "./receiptFormats.js";
import {
  DEFAULT_RECEIPT_TABLE_LAYOUTS,
  normalizeReceiptTableLayouts,
} from "./receiptTableColumns.js";

export const PRODUCT_NAME_CASE_OPTIONS = [
  { value: "as_stored", label: "Como está en la base de datos" },
  { value: "upper", label: "MAYÚSCULAS" },
  { value: "lower", label: "minúsculas" },
  { value: "title", label: "Tipo Título (Primera Mayúscula)" },
];

export const DEFAULT_RECEIPT_DETAIL_SETTINGS = {
  productNameCase: "as_stored",
  showLineNumber: false,
  showBarcode: false,
  showUnit: false,
  maxNameLength: 0,
  trimSpaces: true,
  collapseSpaces: true,
  applyToFactura: true,
  applyToNotaVenta: true,
  defaultPrintFormat: "a4",
  tableLayouts: normalizeReceiptTableLayouts(DEFAULT_RECEIPT_TABLE_LAYOUTS),
};

export function normalizeReceiptDetailSettings(raw) {
  let src = raw;
  if (typeof raw === "string") {
    try {
      src = JSON.parse(raw);
    } catch {
      src = {};
    }
  }
  if (!src || typeof src !== "object") src = {};
  const caseVal = String(src.productNameCase || "as_stored");
  const allowed = new Set(PRODUCT_NAME_CASE_OPTIONS.map((o) => o.value));
  const maxLen = Number(src.maxNameLength);
  return {
    productNameCase: allowed.has(caseVal) ? caseVal : "as_stored",
    showLineNumber: src.showLineNumber === true || src.showLineNumber === "true",
    showBarcode: src.showBarcode === true || src.showBarcode === "true",
    showUnit: src.showUnit === true || src.showUnit === "true",
    maxNameLength:
      Number.isFinite(maxLen) && maxLen > 0 ? Math.min(200, Math.round(maxLen)) : 0,
    trimSpaces: src.trimSpaces !== false && src.trimSpaces !== "false",
    collapseSpaces: src.collapseSpaces !== false && src.collapseSpaces !== "false",
    applyToFactura: src.applyToFactura !== false && src.applyToFactura !== "false",
    applyToNotaVenta:
      src.applyToNotaVenta !== false && src.applyToNotaVenta !== "false",
    defaultPrintFormat: normalizePrintFormat(src.defaultPrintFormat, "a4"),
    tableLayouts: normalizeReceiptTableLayouts(src.tableLayouts),
  };
}

function toTitleCase(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/(^|[\s/(\-_])(\S)/g, (_, a, b) => a + b.toUpperCase());
}

export function formatReceiptProductName(name, settingsInput) {
  const settings = normalizeReceiptDetailSettings(settingsInput);
  let text = String(name ?? "");
  if (settings.collapseSpaces) text = text.replace(/\s+/g, " ");
  if (settings.trimSpaces) text = text.trim();

  switch (settings.productNameCase) {
    case "upper":
      text = text.toLocaleUpperCase("es");
      break;
    case "lower":
      text = text.toLocaleLowerCase("es");
      break;
    case "title":
      text = toTitleCase(text);
      break;
    default:
      break;
  }

  if (settings.maxNameLength > 0 && text.length > settings.maxNameLength) {
    text = `${text.slice(0, Math.max(1, settings.maxNameLength - 1))}…`;
  }
  return text;
}

/** ¿Aplicar formato según tipo de documento del comprobante? */
export function shouldApplyReceiptDetailSettings(documentType, settingsInput) {
  const settings = normalizeReceiptDetailSettings(settingsInput);
  const doc = String(documentType || "").toLowerCase();
  if (doc === "factura") return settings.applyToFactura;
  if (doc === "nota_venta" || doc === "documento" || doc === "consumidor_final") {
    return settings.applyToNotaVenta;
  }
  // Por defecto aplicar a nota si no es factura
  return settings.applyToNotaVenta;
}

/**
 * Texto de descripción de línea para el comprobante.
 * @param {object} item { name, barcode, code, unitLabel, unit }
 * @param {object} settings
 * @param {number} index 0-based
 * @param {string} [documentType]
 */
export function formatReceiptItemDescription(
  item,
  settingsInput,
  index = 0,
  documentType = "nota_venta",
) {
  const settings = normalizeReceiptDetailSettings(settingsInput);
  if (!shouldApplyReceiptDetailSettings(documentType, settings)) {
    return String(item?.name ?? "").trim() || "—";
  }

  const parts = [];
  if (settings.showLineNumber) parts.push(`${index + 1}.`);

  let name = formatReceiptProductName(item?.name, settings);
  const code = String(item?.barcode || item?.code || "").trim();
  if (settings.showBarcode && code) {
    name = name ? `${name} [${code}]` : `[${code}]`;
  }
  const unit = String(item?.unitLabel || item?.unit || "").trim();
  if (settings.showUnit && unit) {
    name = name ? `${name} (${unit})` : `(${unit})`;
  }
  parts.push(name || "—");
  return parts.join(" ");
}

/** Productos de ejemplo para la plantilla de prueba (incluye códigos largos). */
export const RECEIPT_PREVIEW_SAMPLE_ITEMS = [
  {
    name: "Atun Real Aceite 170g",
    quantity: 2,
    price: 1.35,
    lineTotal: 2.7,
    barcode: "090388000792",
    code: "090388000792",
    unitLabel: "un",
    discount: 0,
    subtotal: 2.7,
  },
  {
    name: "Yogurt Paraíso Fresa 1L",
    quantity: 1,
    price: 1.85,
    lineTotal: 1.85,
    barcode: "786210443241",
    code: "786210443241",
    unitLabel: "bot",
    discount: 0,
    subtotal: 1.85,
  },
  {
    name: "Galletas de sal Ducales 315Gr",
    quantity: 3,
    price: 2.1,
    lineTotal: 6.3,
    barcode: "786123450001",
    code: "786123450001",
    unitLabel: "paq",
    discount: 0.3,
    subtotal: 6.0,
  },
  {
    name: "Lava 900g",
    quantity: 1,
    price: 3.45,
    lineTotal: 3.45,
    barcode: "7861036713202",
    code: "7861036713202",
    unitLabel: "un",
    discount: 0,
    subtotal: 3.45,
  },
  {
    name: "Sal vaquera",
    quantity: 2,
    price: 0.55,
    lineTotal: 1.1,
    barcode: "612",
    code: "612",
    unitLabel: "un",
    discount: 0,
    subtotal: 1.1,
  },
];
