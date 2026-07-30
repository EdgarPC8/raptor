/** Etiquetas y helpers para tipo de local (propia / vitrina / bodega). */

export function normalizeLocationKind(kind) {
  const k = String(kind || "").toLowerCase().trim();
  if (k === "propia" || k === "bodega" || k === "vitrina") return k;
  return "vitrina";
}

export function locationKindLabel(kind, { publicFacing = false } = {}) {
  const k = normalizeLocationKind(kind);
  if (publicFacing) {
    if (k === "propia") return "Punto de venta";
    if (k === "bodega") return "Bodega";
    return "Vitrina";
  }
  if (k === "propia") return "Sucursal propia";
  if (k === "bodega") return "Bodega";
  return "Vitrina";
}

export function locationKindHint(kind, { publicFacing = false } = {}) {
  const k = normalizeLocationKind(kind);
  if (publicFacing) {
    if (k === "propia") return "Local propio donde se vende el producto.";
    if (k === "bodega") return "Almacén central de insumos y productos.";
    return "Punto de entrega o exhibición (vitrina de otro local).";
  }
  if (k === "propia") return "Tu panadería: aquí abres caja y usas códigos SRI.";
  if (k === "bodega") return "Almacén: stock sin turno de caja. Desde aquí distribuyes a sucursales.";
  return "Entregas producto para que vendan; no abre turno de caja ni lleva stock inventariable.";
}

export function locationKindChipColor(kind) {
  const k = normalizeLocationKind(kind);
  if (k === "propia") return "primary";
  if (k === "bodega") return "secondary";
  return "default";
}

export function storeHoldsInventory(kind) {
  const k = normalizeLocationKind(kind);
  return k === "propia" || k === "bodega";
}

/** Orden: bodega, propias, vitrinas; dentro por position. */
export function sortStoresByKind(stores = []) {
  const rank = { bodega: 0, propia: 1, vitrina: 2 };
  return [...stores].sort((a, b) => {
    const ka = normalizeLocationKind(a.locationKind);
    const kb = normalizeLocationKind(b.locationKind);
    if (ka !== kb) return (rank[ka] ?? 9) - (rank[kb] ?? 9);
    return Number(a.position || 0) - Number(b.position || 0);
  });
}
