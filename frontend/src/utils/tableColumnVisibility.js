/**
 * Visibilidad de columnas en tablas del frontend.
 *
 * PERSISTENCIA (acordarse):
 * - Las 5 tablas “anchas” (comprobantes POS, ventas, compras, locales, préstamos)
 *   se guardan en BD → app_settings.tableColumnVisibility (JSON).
 * - Cualquier otra tabla TablePro que use este helper solo persiste en
 *   localStorage del navegador (clave raptor.tableCols.<tableKey>); no va a la BD.
 *
 * Forma del JSON en BD:
 *   { "comprobantesPos": { "hidden": ["iceLabel", "environmentLabel"] }, ... }
 * Columnas omitidas o ausentes = visibles. Las marcadas required no se pueden ocultar.
 */
export const TABLE_COLUMN_STORAGE = {
  /** Estas keys van a app_settings.tableColumnVisibility */
  DB_KEYS: new Set([
    "comprobantesPos",
    "ventas",
    "compras",
    "locales",
    "prestamos",
  ]),
  LOCAL_PREFIX: "raptor.tableCols.",
};

/** Catálogo de columnas configurables (solo las 5 de BD). */
export const DB_TABLE_COLUMN_CATALOG = [
  {
    key: "comprobantesPos",
    label: "Comprobantes POS",
    hint: "Operación → Comprobantes POS",
    columns: [
      { id: "expand", label: "Expandir productos", required: true },
      { id: "keyIcon", label: "Clave SRI", required: false },
      { id: "emissionDateLabel", label: "Fecha", required: true },
      { id: "estabPtoEmi", label: "Estab", required: false },
      { id: "sequentialLabel", label: "Núm.", required: true },
      { id: "customerLabel", label: "Cliente", required: true },
      { id: "environmentLabel", label: "Ambiente", required: false },
      { id: "sellerLabel", label: "Vendedor", required: false },
      { id: "subtotalLabel", label: "Subtotal", required: false },
      { id: "iceLabel", label: "ICE", required: false },
      { id: "ivaLabel", label: "IVA", required: false },
      { id: "totalLabel", label: "Total", required: true },
      { id: "sriStatusLabel", label: "Estado SRI", required: false },
      { id: "paymentMethodLabel", label: "Forma pago", required: false },
      { id: "paymentStateLabel", label: "Pago", required: false },
      { id: "actions", label: "Acciones", required: true },
    ],
  },
  {
    key: "ventas",
    label: "Ventas",
    hint: "Ventas y compras → Ventas",
    columns: [
      { id: "emissionDate", label: "Fecha", required: true },
      { id: "estabPtoEmi", label: "Estab", required: false },
      { id: "numero", label: "Número", required: true },
      { id: "sellerLabel", label: "Vendedor", required: false },
      { id: "customerLabel", label: "Cliente", required: true },
      { id: "subtotalLabel", label: "Subtotal", required: false },
      { id: "discountLabel", label: "Desc.", required: false },
      { id: "ivaLabel", label: "IVA", required: false },
      { id: "totalLabel", label: "Total", required: true },
      { id: "cashLabel", label: "Efectivo", required: false },
      { id: "checkBankLabel", label: "Chq/Bco", required: false },
      { id: "cardLabel", label: "Tarjeta", required: false },
      { id: "otherLabel", label: "Otros", required: false },
      { id: "retentionLabel", label: "Ret.", required: false },
      { id: "actions", label: "Acciones", required: true },
    ],
  },
  {
    key: "compras",
    label: "Compras",
    hint: "Ventas y compras → Compras",
    columns: [
      { id: "emissionDate", label: "Fecha", required: true },
      { id: "estabPtoEmi", label: "Estab", required: false },
      { id: "numero", label: "Nº factura", required: true },
      { id: "supplierLabel", label: "Proveedor", required: true },
      { id: "subtotalLabel", label: "Subtotal", required: false },
      { id: "discountLabel", label: "Desc.", required: false },
      { id: "ivaLabel", label: "IVA", required: false },
      { id: "totalLabel", label: "Total", required: true },
      { id: "cashLabel", label: "Efectivo", required: false },
      { id: "checkBankLabel", label: "Chq/Bco", required: false },
      { id: "cardLabel", label: "Tarjeta", required: false },
      { id: "otherLabel", label: "Otros", required: false },
      { id: "retentionLabel", label: "Ret.", required: false },
      { id: "actions", label: "Acciones", required: true },
    ],
  },
  {
    key: "locales",
    label: "Locales",
    hint: "Inventario / Locales (gestión)",
    columns: [
      { id: "image", label: "Imagen", required: false },
      { id: "name", label: "Nombre", required: true },
      { id: "locationKind", label: "Tipo", required: false },
      { id: "emission", label: "Emisión", required: false },
      { id: "sriStatus", label: "Estado SRI", required: false },
      { id: "city", label: "Ciudad", required: false },
      { id: "province", label: "Provincia", required: false },
      { id: "position", label: "Posición", required: false },
      { id: "isActive", label: "Activo", required: false },
      { id: "isVisible", label: "Visible", required: false },
      { id: "actions", label: "Acciones", required: true },
    ],
  },
  {
    key: "prestamos",
    label: "Préstamos / deudas",
    hint: "Finanzas → Préstamos",
    columns: [
      { id: "openDate", label: "Fecha", required: true },
      { id: "direction", label: "Tipo", required: true },
      { id: "partyName", label: "Persona", required: true },
      { id: "partyType", label: "Rol", required: false },
      { id: "concept", label: "Concepto", required: false },
      { id: "plazos", label: "Plazos", required: false },
      { id: "total", label: "Monto", required: true },
      { id: "paid", label: "Abonado", required: false },
      { id: "remaining", label: "Saldo", required: true },
      { id: "status", label: "Estado", required: false },
      { id: "actions", label: "Acciones", required: true },
    ],
  },
];

export const DEFAULT_TABLE_COLUMN_VISIBILITY = Object.fromEntries(
  DB_TABLE_COLUMN_CATALOG.map((t) => [t.key, { hidden: [] }]),
);

function parseMaybeJson(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

export function normalizeTableColumnVisibility(raw) {
  const parsed = parseMaybeJson(raw) || {};
  const out = { ...DEFAULT_TABLE_COLUMN_VISIBILITY };
  for (const table of DB_TABLE_COLUMN_CATALOG) {
    const entry = parsed[table.key];
    const allowed = new Set(table.columns.map((c) => c.id));
    const required = new Set(table.columns.filter((c) => c.required).map((c) => c.id));
    const hidden = Array.isArray(entry?.hidden)
      ? entry.hidden
          .map((id) => String(id))
          .filter((id) => allowed.has(id) && !required.has(id))
      : [];
    out[table.key] = { hidden: [...new Set(hidden)] };
  }
  return out;
}

export function serializeTableColumnVisibility(value) {
  return JSON.stringify(normalizeTableColumnVisibility(value));
}

export function isDbPersistedTableKey(tableKey) {
  return TABLE_COLUMN_STORAGE.DB_KEYS.has(String(tableKey || ""));
}

export function readLocalTableHidden(tableKey) {
  try {
    const raw = localStorage.getItem(TABLE_COLUMN_STORAGE.LOCAL_PREFIX + tableKey);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed?.hidden) ? parsed.hidden.map(String) : [];
  } catch {
    return [];
  }
}

export function writeLocalTableHidden(tableKey, hidden) {
  try {
    localStorage.setItem(
      TABLE_COLUMN_STORAGE.LOCAL_PREFIX + tableKey,
      JSON.stringify({ hidden: [...new Set((hidden || []).map(String))] }),
    );
  } catch {
    /* ignore quota */
  }
}

/**
 * Filtra columnas visibles. Si la col no está en el catálogo, se deja visible.
 * @param {Array<{id:string}>} columns
 * @param {string[]} hiddenIds
 * @param {Set<string>} [requiredIds]
 */
export function filterVisibleColumns(columns, hiddenIds, requiredIds) {
  const hidden = new Set((hiddenIds || []).map(String));
  const required = requiredIds || new Set();
  return (columns || []).filter((col) => {
    const id = String(col?.id ?? "");
    if (!id) return true;
    if (required.has(id) || col?.required || col?.hideable === false) return true;
    return !hidden.has(id);
  });
}

export function catalogRequiredIds(tableKey) {
  const table = DB_TABLE_COLUMN_CATALOG.find((t) => t.key === tableKey);
  return new Set((table?.columns || []).filter((c) => c.required).map((c) => c.id));
}
