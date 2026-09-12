const GRAM_FACTORS = {
  gr: 1,
  g: 1,
  kg: 1000,
  lb: 453.592,
  libra: 453.592,
  q: 45_360,
  qq: 45_360,
  quintal: 45_360,
  arroba: 11_339.8,
  arb: 11_339.8,
  l: 1000,
  ml: 1,
};

export const WEIGHT_UNIT_ABBREVS = ["gr", "g", "kg", "lb", "libra"];

export function isWeightUnitAbbr(abbr) {
  return WEIGHT_UNIT_ABBREVS.includes(String(abbr || "").trim().toLowerCase());
}

export const MOVEMENT_TYPES = [
  {
    value: "entrada",
    label: "Entrada",
    hint: "Compras, devoluciones u otras entradas",
    color: "success",
  },
  {
    value: "salida",
    label: "Salida",
    hint: "Ventas, consumo, merma",
    color: "error",
  },
  {
    value: "ajuste",
    label: "Ajuste",
    hint: "Inventario físico (nuevo stock)",
    color: "info",
  },
  {
    value: "produccion",
    label: "Producción",
    hint: "Fabricar según receta",
    color: "secondary",
  },
  {
    value: "apertura",
    label: "Abrir presentación",
    hint: "Quintal (final) → insumo genérico",
    color: "warning",
  },
];

export const REASON_OPTIONS = {
  entrada: [
    { value: "ENTRADA_COMPRA", label: "Compra" },
    { value: "ENTRADA_DEVOLUCION", label: "Devolución" },
    { value: "ENTRADA_OTRA", label: "Otra entrada" },
  ],
  salida: [
    { value: "SALIDA_VENTA", label: "Venta" },
    { value: "SALIDA_CONSUMO", label: "Consumo / uso interno" },
    { value: "SALIDA_MERMA", label: "Merma / daño" },
    { value: "SALIDA_OTRA", label: "Otra salida" },
  ],
};

export function getUnitAbbr(product) {
  return (
    product?.unit?.abbreviation ||
    product?.InventoryUnit?.abbreviation ||
    product?.ERP_inventory_unit?.abbreviation ||
    ""
  );
}

function resolveGramFactor(unitAbbr, unitObj) {
  const factor = Number(unitObj?.factor);
  if (Number.isFinite(factor) && factor > 0) return factor;
  const abbr = String(unitAbbr || "").trim().toLowerCase();
  if (GRAM_FACTORS[abbr] != null) return GRAM_FACTORS[abbr];
  return 1;
}

function isCountUnit(abbr) {
  const a = String(abbr || "").trim().toLowerCase();
  return ["un", "u", "und", "unidad", "unit", "units", "pc", "pcs"].includes(a);
}

/** Estima gramos por 1 unidad de presentación (vista previa). */
export function estimateGramsPerPack(product) {
  if (!product) return 0;
  const abbr = getUnitAbbr(product);
  const unit = product.unit || product.InventoryUnit || product.ERP_inventory_unit;
  if (isCountUnit(abbr)) {
    const sw = Number(product.standardWeightGrams ?? 0);
    return sw > 0 ? sw : 0;
  }
  return resolveGramFactor(abbr, unit);
}

export function gramsToGenericDisplay(genericProduct, grams) {
  if (!genericProduct || !grams) return null;
  const abbr = getUnitAbbr(genericProduct);
  const unit = genericProduct.unit || genericProduct.InventoryUnit;
  if (isCountUnit(abbr)) {
    const sw = Number(genericProduct.standardWeightGrams ?? 0) || 1;
    return { value: grams / sw, label: abbr || "un" };
  }
  const factor = resolveGramFactor(abbr, unit);
  return { value: grams / factor, label: abbr || "g" };
}

/** Cantidad sugerida del destino al abrir 1 empaque (según factores). */
export function suggestUnitsPerPack(presentation, target) {
  if (!presentation || !target) return null;
  const fromGrams = estimateGramsPerPack(presentation);
  if (!(fromGrams > 0)) return null;
  const abbr = getUnitAbbr(target);
  const unit = target.unit || target.InventoryUnit || target.ERP_inventory_unit;
  if (isCountUnit(abbr)) {
    const sw = Number(target.standardWeightGrams ?? 0) || 1;
    return Number((fromGrams / sw).toFixed(4));
  }
  const factor = resolveGramFactor(abbr, unit);
  if (!(factor > 0)) return null;
  return Number((fromGrams / factor).toFixed(4));
}

export function isPresentationProduct(p) {
  // Empaque de compra (quintal, arroba…) enlazado a un genérico; puede ser tipo final (nuevo) o raw (legado).
  return Boolean(p?.genericProductId) && !p?.isGenericIngredient;
}

export function isGenericIngredientProduct(p) {
  return Boolean(p?.isGenericIngredient) && !p?.genericProductId;
}

export function isPresentationOrNormalRaw(p) {
  if (!p || p.type !== "raw") return false;
  return !isGenericIngredientProduct(p);
}

/** Etiqueta de cantidad según genérico (peso) vs producto/presentación (unidad de compra). */
export function getMovementQuantityLabel(product, { isAjuste = false } = {}) {
  if (!product) return isAjuste ? "Nuevo stock" : "Cantidad";

  const abbr = getUnitAbbr(product);
  const a = String(abbr || "").trim().toLowerCase();

  let unitLabel;
  if (isGenericIngredientProduct(product)) {
    if (isCountUnit(abbr) && Number(product?.standardWeightGrams) > 0) {
      unitLabel = "g";
    } else if (["g", "gr", "gram", "grams"].includes(a)) {
      unitLabel = "g";
    } else if (["kg", "kilo", "kilos"].includes(a)) {
      unitLabel = "kg";
    } else if (["l", "ml"].includes(a)) {
      unitLabel = abbr;
    } else {
      unitLabel = abbr || "g";
    }
  } else {
    unitLabel = abbr || "unidad";
  }

  return isAjuste ? `Nuevo stock (${unitLabel})` : `Cantidad (${unitLabel})`;
}

export function getMovementQuantityHelper(product) {
  if (!product) return undefined;
  if (isGenericIngredientProduct(product)) {
    const abbr = getUnitAbbr(product);
    const a = String(abbr || "").trim().toLowerCase();
    if (["g", "gr", "kg", "kilo", "kilos"].includes(a) || isCountUnit(abbr)) {
      return "Insumo genérico: ingresa la cantidad en gramos o en la unidad de peso del producto.";
    }
    return `Insumo genérico: cantidad en ${abbr || "unidad del producto"}.`;
  }
  return `Producto o presentación: cantidad en ${getUnitAbbr(product) || "unidades"} (quintal, unidad, etc.).`;
}

export function showPriceField(type, reason) {
  if (type === "entrada" && reason === "ENTRADA_COMPRA") return true;
  if (type === "salida") return true;
  return false;
}

export function isPriceRequired(type, reason) {
  return type === "entrada" && reason === "ENTRADA_COMPRA";
}

/** Precio opcional en salida (referencia de valor); obligatorio solo en compra. */
export function isPriceOptional(type) {
  return type === "salida";
}

/** Precio de catálogo según el tipo de movimiento (referencia / autocompletado). */
export function getMovementCatalogPrice(product, type, reason) {
  if (!product) return 0;
  if (type === "salida") {
    const dist = Number(product.distributorPrice ?? 0);
    if (dist > 0) return dist;
    return Number(product.price ?? 0);
  }
  if (type === "entrada" && reason === "ENTRADA_COMPRA") {
    const sup = Number(product.supplierPrice ?? 0);
    // Solo precio proveedor: no usar precio de venta (fuga que inflaba compras).
    return sup > 0 ? sup : 0;
  }
  return 0;
}

export function getMovementCatalogPriceLabel(type, reason) {
  if (type === "salida") return "distribuidor";
  if (type === "entrada" && reason === "ENTRADA_COMPRA") return "proveedor";
  return "catálogo";
}

/** Tope de línea de compra (debe alinearse con backend purchasePriceGuards). */
export const MAX_PURCHASE_LINE_TOTAL = 2500;
export const MAX_UNIT_VS_REF_RATIO = 40;

/**
 * Valida total de compra antes de guardar (mismo criterio que el backend).
 * @returns {string|null} error message
 */
export function validatePurchaseLineTotal({ quantity, total, product, reason, products = [] }) {
  if (reason !== "ENTRADA_COMPRA") return null;

  if (isGenericIngredientProduct(product)) {
    const hasPack = (products || []).some(
      (p) =>
        Number(p?.genericProductId) === Number(product.id) &&
        Number(p?.unitsPerPack) > 0 &&
        p?.isActive !== false,
    );
    if (hasPack) {
      return `«${product.name}» es genérico de receta. Comprá la presentación (cubeta/paca) y abrila.`;
    }
  }

  if (total == null || total === "") return null;
  const qty = Number(quantity);
  const amount = Number(total);
  if (!Number.isFinite(amount) || amount < 0) return "El monto de compra no es válido";
  if (!Number.isFinite(qty) || !(qty > 0)) return "La cantidad de compra no es válida";
  if (amount > MAX_PURCHASE_LINE_TOTAL) {
    return `Total $${amount.toFixed(2)} supera el tope $${MAX_PURCHASE_LINE_TOTAL}. Revisá modo Total vs Unitario × cant.`;
  }
  const unit = amount / qty;
  const ref =
    Number(product?.supplierPrice) > 0
      ? Number(product.supplierPrice)
      : Number(product?.price) > 0
        ? Number(product.price)
        : 0;
  if (ref > 0 && unit > ref * MAX_UNIT_VS_REF_RATIO) {
    return `Costo unitario ~$${unit.toFixed(4)} es demasiado alto vs referencia $${ref.toFixed(4)}. Revisá cantidad/modo de precio.`;
  }
  return null;
}
