/**
 * Columnas configurables de tablas en factura / nota de venta (A4 y tickets).
 * Anchos en % sobre columnas visibles; el orden define la secuencia en el comprobante.
 */
import { isTicketFormat, normalizePrintFormat } from "./receiptFormats.js";

/** Catálogo de columnas posibles. */
export const RECEIPT_COLUMN_META = {
  code: {
    id: "code",
    label: "Código",
    headerFactura: "Codigo",
    headerNota: "Código",
    align: "left",
    required: false,
    breakWords: true,
  },
  description: {
    id: "description",
    label: "Descripción / Producto",
    headerFactura: "Descripción",
    headerNota: "Producto",
    align: "left",
    required: true,
    breakWords: true,
  },
  qty: {
    id: "qty",
    label: "Cantidad",
    headerFactura: "Cant",
    headerNota: "Cant",
    align: "right",
    required: false,
  },
  unitPrice: {
    id: "unitPrice",
    label: "Precio unitario",
    headerFactura: "Precio Unitario",
    headerNota: "P.U.",
    headerTicketFactura: "P.V.P",
    align: "right",
    required: false,
  },
  discount: {
    id: "discount",
    label: "Descuento",
    headerFactura: "Descto",
    headerNota: "Descto",
    align: "right",
    required: false,
  },
  subtotal: {
    id: "subtotal",
    label: "Subtotal",
    headerFactura: "Subtotal",
    headerNota: "Subtotal",
    align: "right",
    required: true,
    docTypes: ["factura"],
  },
  total: {
    id: "total",
    label: "Total línea",
    headerFactura: "Total",
    headerNota: "Total",
    align: "right",
    required: true,
    docTypes: ["nota_venta"],
  },
};

const FACTURA_A4_DEFAULT = [
  { id: "code", visible: true, widthPct: 18 },
  { id: "description", visible: true, widthPct: 34 },
  { id: "qty", visible: true, widthPct: 8 },
  { id: "unitPrice", visible: true, widthPct: 15 },
  { id: "discount", visible: true, widthPct: 8 },
  { id: "subtotal", visible: true, widthPct: 17 },
];

const FACTURA_TICKET_DEFAULT = [
  { id: "qty", visible: true, widthPct: 12 },
  { id: "description", visible: true, widthPct: 40 },
  { id: "unitPrice", visible: true, widthPct: 18 },
  { id: "discount", visible: true, widthPct: 12 },
  { id: "subtotal", visible: true, widthPct: 18 },
];

const NOTA_A4_DEFAULT = [
  { id: "code", visible: false, widthPct: 14 },
  { id: "description", visible: true, widthPct: 46 },
  { id: "qty", visible: true, widthPct: 12 },
  { id: "unitPrice", visible: true, widthPct: 14 },
  { id: "discount", visible: false, widthPct: 10 },
  { id: "total", visible: true, widthPct: 14 },
];

const NOTA_TICKET_DEFAULT = [
  { id: "description", visible: true, widthPct: 40 },
  { id: "qty", visible: true, widthPct: 12 },
  { id: "unitPrice", visible: true, widthPct: 24 },
  { id: "total", visible: true, widthPct: 24 },
];

/** Layouts guardados en receiptDetailSettings.tableLayouts */
export const RECEIPT_TABLE_LAYOUT_KEYS = [
  "factura_a4",
  "factura_ticket80",
  "factura_ticket55",
  "nota_a4",
  "nota_ticket80",
  "nota_ticket55",
];

export const DEFAULT_RECEIPT_TABLE_LAYOUTS = {
  factura_a4: FACTURA_A4_DEFAULT,
  factura_ticket80: FACTURA_TICKET_DEFAULT.map((c) => ({ ...c })),
  factura_ticket55: [
    { id: "qty", visible: true, widthPct: 14 },
    { id: "description", visible: true, widthPct: 38 },
    { id: "unitPrice", visible: true, widthPct: 18 },
    { id: "discount", visible: true, widthPct: 12 },
    { id: "subtotal", visible: true, widthPct: 18 },
  ],
  nota_a4: NOTA_A4_DEFAULT,
  nota_ticket80: NOTA_TICKET_DEFAULT.map((c) => ({ ...c })),
  nota_ticket55: [
    { id: "description", visible: true, widthPct: 38 },
    { id: "qty", visible: true, widthPct: 14 },
    { id: "unitPrice", visible: true, widthPct: 24 },
    { id: "total", visible: true, widthPct: 24 },
  ],
};

export function receiptTableLayoutKey(documentType, format) {
  const isFactura = String(documentType || "").toLowerCase() === "factura";
  const fmt = normalizePrintFormat(format, "a4");
  const paper =
    fmt === "ticket55" ? "ticket55" : fmt === "ticket80" ? "ticket80" : "a4";
  return `${isFactura ? "factura" : "nota"}_${paper}`;
}

function allowedIdsForDoc(documentType) {
  const isFactura = String(documentType || "").toLowerCase() === "factura";
  return Object.values(RECEIPT_COLUMN_META)
    .filter((m) => {
      if (!m.docTypes) return true;
      return m.docTypes.includes(isFactura ? "factura" : "nota_venta");
    })
    .map((m) => m.id);
}

function defaultColsForKey(layoutKey) {
  const base = DEFAULT_RECEIPT_TABLE_LAYOUTS[layoutKey];
  return (base || DEFAULT_RECEIPT_TABLE_LAYOUTS.factura_a4).map((c) => ({
    ...c,
  }));
}

function redistributeWidths(cols) {
  const visible = cols.filter((c) => c.visible);
  if (!visible.length) return cols;
  const sum = visible.reduce((a, c) => a + Number(c.widthPct || 0), 0);
  if (sum <= 0) {
    const even = Math.floor(100 / visible.length);
    let rest = 100 - even * visible.length;
    return cols.map((c) => {
      if (!c.visible) return c;
      const extra = rest > 0 ? 1 : 0;
      if (rest > 0) rest -= 1;
      return { ...c, widthPct: even + extra };
    });
  }
  if (Math.abs(sum - 100) < 0.6) {
    return cols.map((c) =>
      c.visible
        ? { ...c, widthPct: Math.max(4, Math.round(Number(c.widthPct) || 4)) }
        : c,
    );
  }
  const scale = 100 / sum;
  let rounded = cols.map((c) =>
    c.visible
      ? {
          ...c,
          widthPct: Math.max(4, Math.round((Number(c.widthPct) || 4) * scale)),
        }
      : c,
  );
  const vis = rounded.filter((c) => c.visible);
  let s = vis.reduce((a, c) => a + c.widthPct, 0);
  const delta = 100 - s;
  if (delta !== 0 && vis.length) {
    const lastId = vis[vis.length - 1].id;
    rounded = rounded.map((c) =>
      c.id === lastId && c.visible
        ? { ...c, widthPct: Math.max(4, c.widthPct + delta) }
        : c,
    );
  }
  return rounded;
}

/** Normaliza un layout (orden, visibilidad, anchos). */
export function normalizeReceiptTableColumns(rawCols, layoutKey) {
  const defaults = defaultColsForKey(layoutKey);
  const docType = layoutKey.startsWith("factura") ? "factura" : "nota_venta";
  const allowed = new Set(allowedIdsForDoc(docType));
  const byId = new Map();
  if (Array.isArray(rawCols)) {
    rawCols.forEach((c, idx) => {
      const id = String(c?.id || "");
      if (!allowed.has(id) || byId.has(id)) return;
      const meta = RECEIPT_COLUMN_META[id];
      if (!meta) return;
      const w = Number(c.widthPct);
      byId.set(id, {
        id,
        visible:
          meta.required ||
          c.visible === true ||
          c.visible === "true" ||
          (c.visible !== false &&
            c.visible !== "false" &&
            defaults.find((d) => d.id === id)?.visible === true),
        widthPct:
          Number.isFinite(w) && w > 0 ? Math.min(80, Math.max(4, Math.round(w))) : undefined,
        _order: idx,
      });
    });
  }
  const ordered = [];
  const seen = new Set();
  // Primero el orden del raw (si existe), luego defaults faltantes
  if (Array.isArray(rawCols)) {
    for (const c of rawCols) {
      const id = String(c?.id || "");
      if (!byId.has(id) || seen.has(id)) continue;
      seen.add(id);
      const def = defaults.find((d) => d.id === id);
      const cur = byId.get(id);
      ordered.push({
        id,
        visible: RECEIPT_COLUMN_META[id].required ? true : Boolean(cur.visible),
        widthPct: cur.widthPct ?? def?.widthPct ?? 12,
      });
    }
  }
  for (const def of defaults) {
    if (seen.has(def.id)) continue;
    seen.add(def.id);
    const cur = byId.get(def.id);
    ordered.push({
      id: def.id,
      visible: RECEIPT_COLUMN_META[def.id].required
        ? true
        : cur
          ? Boolean(cur.visible)
          : def.visible,
      widthPct: cur?.widthPct ?? def.widthPct,
    });
  }
  // Asegurar columnas required visibles
  const ensured = ordered.map((c) =>
    RECEIPT_COLUMN_META[c.id]?.required ? { ...c, visible: true } : c,
  );
  // Al menos description + subtotal/total visibles
  if (!ensured.some((c) => c.visible && c.id === "description")) {
    const d = ensured.find((c) => c.id === "description");
    if (d) d.visible = true;
  }
  return redistributeWidths(ensured);
}

export function normalizeReceiptTableLayouts(raw) {
  let src = raw;
  if (typeof raw === "string") {
    try {
      src = JSON.parse(raw);
    } catch {
      src = {};
    }
  }
  if (!src || typeof src !== "object") src = {};
  const out = {};
  for (const key of RECEIPT_TABLE_LAYOUT_KEYS) {
    out[key] = normalizeReceiptTableColumns(src[key], key);
  }
  return out;
}

/**
 * Columnas visibles listas para render (con label, align, width%).
 */
export function resolveReceiptTableColumns(settingsOrLayouts, documentType, format) {
  const layouts =
    settingsOrLayouts?.tableLayouts != null
      ? normalizeReceiptTableLayouts(settingsOrLayouts.tableLayouts)
      : normalizeReceiptTableLayouts(settingsOrLayouts);
  const key = receiptTableLayoutKey(documentType, format);
  const cols = layouts[key] || defaultColsForKey(key);
  const isFactura = String(documentType || "").toLowerCase() === "factura";
  const ticket = isTicketFormat(format);
  return cols
    .filter((c) => c.visible)
    .map((c) => {
      const meta = RECEIPT_COLUMN_META[c.id];
      let header = isFactura ? meta.headerFactura : meta.headerNota;
      if (isFactura && ticket && meta.headerTicketFactura) {
        header = meta.headerTicketFactura;
      }
      return {
        id: c.id,
        header,
        label: meta.label,
        align: meta.align || "left",
        widthPct: c.widthPct,
        width: `${c.widthPct}%`,
        breakWords: Boolean(meta.breakWords),
        required: Boolean(meta.required),
      };
    });
}

/** Actualiza un layout completo (editor) y re-normaliza. */
export function patchReceiptTableLayout(layouts, layoutKey, nextCols) {
  const all = normalizeReceiptTableLayouts(layouts);
  all[layoutKey] = normalizeReceiptTableColumns(nextCols, layoutKey);
  return all;
}

/**
 * Valor de celda para una columna (texto ya formateado).
 * formatters: { money, unitPrice, qty, description(item, index) }
 */
export function formatReceiptQuantity(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return String(n ?? "");
  // Enteros sin decimales (evita 2.00 de formato dinero).
  if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
  // Solo si realmente es fraccional (peso, etc.), sin ceros de más.
  return String(parseFloat(v.toFixed(3)));
}

export function receiptColumnCellValue(colId, item, index, formatters = {}) {
  const money = formatters.money || ((n) => String(n ?? "0"));
  const unitPrice = formatters.unitPrice || money;
  const qty = formatters.qty || formatReceiptQuantity;
  const description =
    formatters.description || ((it) => String(it?.name ?? "—"));
  switch (colId) {
    case "code":
      return String(item?.code || item?.barcode || item?.productId || index + 1);
    case "description":
      return description(item, index);
    case "qty":
      return qty(item?.quantity);
    case "unitPrice":
      return unitPrice(item?.price);
    case "discount":
      return money(item?.discount || 0);
    case "subtotal":
      return money(item?.subtotal ?? item?.lineTotal);
    case "total":
      return money(item?.lineTotal ?? item?.subtotal);
    default:
      return "";
  }
}
