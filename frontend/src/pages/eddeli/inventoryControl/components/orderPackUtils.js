/** Utilidades compartidas para pacas/lotes en pedidos (cliente y proveedor). */

export const newPackKey = (prefix) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const dateOnly = (v) => (v ? String(v).slice(0, 10) : "");

/**
 * Reconstruye packs/lots a partir de ítems guardados (edición).
 * @param {Array} rawItems
 * @param {{ priceField?: 'unitPrice' | 'price' }} [opts]
 */
export function hydratePacksAndLots(rawItems, opts = {}) {
  const priceField = opts.priceField || "unitPrice";
  const packs = [];
  const lots = [];
  const packByKey = new Map();
  const lotBySig = new Map();
  const packSigs = new Map();

  const effectivePackKey = (item) => {
    if (item.packKey) return String(item.packKey);
    const name = String(item.packName || "").trim();
    if (name) return `name_${name}`;
    return null;
  };

  for (const item of rawItems) {
    const packKey = effectivePackKey(item);
    if (!packKey) continue;
    const hasLot = Boolean(item.expiresAt || item.lotCode || item.manufacturedAt);
    const sig = hasLot
      ? `${item.lotCode || ""}|${dateOnly(item.expiresAt)}|${dateOnly(item.manufacturedAt)}`
      : null;
    if (!packByKey.has(packKey)) {
      const pack = {
        key: packKey,
        name: item.packName || "Paca",
        useLots: false,
        lotCode: "",
        expiresAt: "",
        manufacturedAt: "",
        totalPrice: "",
        expanded: true,
      };
      packByKey.set(packKey, pack);
      packs.push(pack);
      packSigs.set(packKey, new Set());
    }
    if (sig) packSigs.get(packKey).add(sig);
  }

  for (const [packKey, sigSet] of packSigs.entries()) {
    const pack = packByKey.get(packKey);
    const sigs = [...sigSet];
    if (sigs.length > 1) {
      pack.useLots = true;
    } else if (sigs.length === 1) {
      const [lotCode, expiresAt, manufacturedAt] = sigs[0].split("|");
      pack.useLots = false;
      pack.lotCode = lotCode || "";
      pack.expiresAt = expiresAt || "";
      pack.manufacturedAt = manufacturedAt || "";
    }
  }

  const items = rawItems.map((item) => {
    const lineId = item.id != null ? `db_${item.id}` : newPackKey("line");
    const packKey = effectivePackKey(item);
    const pack = packKey ? packByKey.get(packKey) : null;
    let lotKey = null;

    if (pack?.useLots && (item.expiresAt || item.lotCode || item.manufacturedAt)) {
      const sig = `${packKey}|${item.lotCode || ""}|${dateOnly(item.expiresAt)}|${dateOnly(item.manufacturedAt)}`;
      if (!lotBySig.has(sig)) {
        const lot = {
          key: newPackKey("lot"),
          packKey,
          code: item.lotCode || "",
          expiresAt: dateOnly(item.expiresAt),
          manufacturedAt: dateOnly(item.manufacturedAt),
        };
        lotBySig.set(sig, lot);
        lots.push(lot);
      }
      lotKey = lotBySig.get(sig).key;
    }

    const unitPrice =
      priceField === "price"
        ? item.distributorPrice != null
          ? item.distributorPrice
          : item.price != null
            ? item.price
            : 0
        : item.unitPrice;

    return {
      lineId,
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice,
      hasIva: Number(item.taxRate || 0) > 0,
      name: item.ERP_inventory_product?.name || item.name || "",
      unitLabel: item.unitLabel || "",
      packKey: packKey || null,
      lotKey,
      deliveredAt: item.deliveredAt || null,
      paidAt: item.paidAt || null,
    };
  });

  for (const pack of packs) {
    const sum = items
      .filter((it) => it.packKey === pack.key)
      .reduce((acc, it) => {
        const q = Number(it.quantity) || 0;
        const p = Number(it.unitPrice) || 0;
        return acc + q * p;
      }, 0);
    pack.totalPrice = sum > 0 ? String(Number(sum.toFixed(2))) : "";
  }

  return { items, packs, lots };
}

export function resolveItemLotFields(item, packs, lots) {
  const pack = item.packKey ? packs.find((p) => p.key === item.packKey) : null;
  const lot = item.lotKey ? lots.find((l) => l.key === item.lotKey) : null;
  if (lot) {
    return {
      packKey: pack?.key || lot.packKey || item.packKey || null,
      packName: pack?.name?.trim() || null,
      lotCode: lot?.code?.trim() || null,
      expiresAt: lot?.expiresAt || null,
      manufacturedAt: lot?.manufacturedAt || null,
    };
  }
  if (pack && !pack.useLots) {
    return {
      packKey: pack.key || item.packKey || null,
      packName: pack.name?.trim() || null,
      lotCode: String(pack.lotCode || "").trim() || null,
      expiresAt: pack.expiresAt || null,
      manufacturedAt: pack.manufacturedAt || null,
    };
  }
  return {
    packKey: pack?.key || item.packKey || null,
    packName: pack?.name?.trim() || null,
    lotCode: null,
    expiresAt: null,
    manufacturedAt: null,
  };
}
