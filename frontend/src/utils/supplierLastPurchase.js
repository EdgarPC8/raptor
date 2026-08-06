/**
 * Última compra de un producto desde pedidos a proveedor (constancia de recepción).
 */

function parseOrderDate(value) {
  if (!value) return 0;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof value === "number") return value;
  const s = String(value).trim();
  if (!s) return 0;
  // ISO / Date.parse
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return iso;
  // dd/MM/yyyy HH:mm:ss (formato API)
  const m = s.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (m) {
    const [, dd, mm, yyyy, hh = "0", mi = "0", ss = "0"] = m;
    const d = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(mi),
      Number(ss),
    );
    const t = d.getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

function orderSortKey(order) {
  const received = parseOrderDate(order?.receivedAt);
  if (received) return received;
  return parseOrderDate(order?.date) || Number(order?.id) || 0;
}

/**
 * @param {Array} orders - lista de pedidos a proveedor
 * @returns {Map<number, { unitPrice: number, dateLabel: string|null, supplierName: string|null, orderId: number|null, received: boolean }>}
 */
export function buildLastPurchaseByProductId(orders) {
  const map = new Map();
  const list = Array.isArray(orders) ? orders : [];

  // Ordenar más recientes primero
  const sorted = [...list].sort((a, b) => orderSortKey(b) - orderSortKey(a));

  for (const order of sorted) {
    const received = Boolean(order?.receivedAt);
    const lines = order?.ERP_supplier_order_items || order?.items || [];
    const supplierName =
      order?.ERP_supplier?.name ||
      order?.supplier?.name ||
      order?.supplierName ||
      null;
    const dateLabel = order?.receivedAt || order?.date || null;
    const orderId = order?.id != null ? Number(order.id) : null;

    for (const it of lines) {
      const pid = Number(it?.productId);
      if (!pid) continue;
      const unitPrice = Number(it?.unitPrice ?? it?.price);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) continue;

      const prev = map.get(pid);
      // Preferir compras recibidas sobre borradores/pendientes
      if (!prev) {
        map.set(pid, {
          unitPrice,
          dateLabel,
          supplierName,
          orderId,
          received,
        });
        continue;
      }
      if (!prev.received && received) {
        map.set(pid, {
          unitPrice,
          dateLabel,
          supplierName,
          orderId,
          received,
        });
      }
      // Ya hay una más reciente (lista ordenada) → no sobrescribir
    }
  }

  return map;
}

export function getLastPurchaseForProduct(map, productId) {
  if (!map || productId == null || productId === "") return null;
  return map.get(Number(productId)) || null;
}
