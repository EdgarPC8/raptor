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

/** Misma zona visual (libre / paca / lote). */
export function sameItemZone(a, b) {
  if (!a || !b) return false;
  return (a.packKey || null) === (b.packKey || null) && (a.lotKey || null) === (b.lotKey || null);
}

export function itemMatchesZone(it, zone) {
  if (!zone) return false;
  if (zone.type === "free") return !it.packKey;
  if (zone.type === "pack") {
    return it.packKey === zone.packKey && !it.lotKey;
  }
  if (zone.type === "lot") return it.lotKey === zone.lotKey;
  if (zone.type === "packAll") return it.packKey === zone.packKey;
  return false;
}

/** Sube/baja un ítem dentro de su zona (mismo packKey/lotKey). */
export function reorderItemInZone(items, lineId, direction) {
  const current = items.find((it) => it.lineId === lineId);
  if (!current) return items;
  const match = (it) => sameItemZone(it, current);
  const zoneItems = items.filter(match);
  const idx = zoneItems.findIndex((it) => it.lineId === lineId);
  const j = idx + direction;
  if (idx < 0 || j < 0 || j >= zoneItems.length) return items;
  const reordered = [...zoneItems];
  [reordered[idx], reordered[j]] = [reordered[j], reordered[idx]];
  let k = 0;
  return items.map((it) => (match(it) ? reordered[k++] : it));
}

/**
 * Mueve un ítem a otra zona y lo inserta antes de `beforeLineId` (o al final de la zona).
 * `assign`: { packKey, lotKey } | null para libre.
 */
export function moveItemToZone(items, lineId, assign, beforeLineId = null) {
  const moved = items.find((it) => it.lineId === lineId);
  if (!moved) return items;
  const nextAssign = assign
    ? {
        packKey: assign.packKey ?? null,
        lotKey: assign.lotKey ?? null,
      }
    : { packKey: null, lotKey: null };
  const updated = { ...moved, ...nextAssign };
  let without = items.filter((it) => it.lineId !== lineId);

  if (beforeLineId && beforeLineId !== lineId) {
    const insertAt = without.findIndex((it) => it.lineId === beforeLineId);
    if (insertAt >= 0) {
      without = [
        ...without.slice(0, insertAt),
        updated,
        ...without.slice(insertAt),
      ];
      return without;
    }
  }

  // Insertar al final del grupo de destino (después del último de esa zona).
  let lastIdx = -1;
  without.forEach((it, i) => {
    if (sameItemZone(it, updated)) lastIdx = i;
  });
  if (lastIdx >= 0) {
    without = [
      ...without.slice(0, lastIdx + 1),
      updated,
      ...without.slice(lastIdx + 1),
    ];
    return without;
  }
  return [...without, updated];
}
