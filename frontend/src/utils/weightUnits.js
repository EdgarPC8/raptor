/**
 * Medidas de insumos genéricos.
 * - Peso: se guarda en gramos (en UI/receta: g, kg, lb).
 * - Volumen: se guarda en mililitros (en UI/receta: ml, L).
 */

export const WEIGHT_INPUT_UNITS = [
  { value: "g", label: "Gramos (g)", factor: 1 },
  { value: "kg", label: "Kilos (kg)", factor: 1000 },
  { value: "lb", label: "Libras (lb)", factor: 453.592 },
];

export const VOLUME_INPUT_UNITS = [
  { value: "ml", label: "Mililitros (ml)", factor: 1 },
  { value: "l", label: "Litros (L)", factor: 1000 },
];

export function unitAbbr(unitOrProduct) {
  if (!unitOrProduct) return "";
  if (typeof unitOrProduct === "string") return unitOrProduct.trim().toLowerCase();
  return String(
    unitOrProduct.abbreviation ||
      unitOrProduct.unitAbbrev ||
      unitOrProduct.InventoryUnit?.abbreviation ||
      unitOrProduct.unit?.abbreviation ||
      "",
  )
    .trim()
    .toLowerCase();
}

export function isWeightBaseUnit(unitOrProduct) {
  const a = unitAbbr(unitOrProduct);
  return a === "g" || a === "gr" || a === "kg" || a === "lb" || a === "libra";
}

export function isVolumeBaseUnit(unitOrProduct) {
  const a = unitAbbr(unitOrProduct);
  return a === "ml" || a === "l" || a === "lt" || a === "litro" || a === "litros";
}

/** Unidades permitidas como almacenamiento del insumo genérico. */
export function isGenericStorageUnit(unitOrProduct) {
  const a = unitAbbr(unitOrProduct);
  return a === "g" || a === "gr" || a === "ml" || a === "l" || a === "lt";
}

export function measureKind(unitOrProduct) {
  if (isVolumeBaseUnit(unitOrProduct)) return "volume";
  if (isWeightBaseUnit(unitOrProduct)) return "weight";
  return "other";
}

export function weightUnitFactor(unit) {
  const u = String(unit || "g").trim().toLowerCase();
  if (u === "kg") return 1000;
  if (u === "lb" || u === "libra") return 453.592;
  return 1; // g / gr
}

export function volumeUnitFactor(unit) {
  const u = String(unit || "ml").trim().toLowerCase();
  if (u === "l" || u === "lt" || u === "litro" || u === "litros") return 1000;
  return 1; // ml
}

/** Factor del producto genérico hacia su base de almacenamiento (g o ml). */
export function storageBaseFactor(unitOrProduct) {
  const a = unitAbbr(unitOrProduct);
  if (a === "kg") return 1000;
  if (a === "lb" || a === "libra") return 453.592;
  if (a === "l" || a === "lt" || a === "litro" || a === "litros") return 1000;
  return 1; // g / gr / ml
}

export function storageBaseLabel(unitOrProduct) {
  const kind = measureKind(unitOrProduct);
  if (kind === "volume") {
    const a = unitAbbr(unitOrProduct);
    if (a === "l" || a === "lt") return "L";
    return "ml";
  }
  return "g";
}

export function inputUnitsForProduct(unitOrProduct) {
  return measureKind(unitOrProduct) === "volume" ? VOLUME_INPUT_UNITS : WEIGHT_INPUT_UNITS;
}

export function defaultInputUnit(unitOrProduct) {
  const a = unitAbbr(unitOrProduct);
  if (measureKind(unitOrProduct) === "volume") {
    if (a === "l" || a === "lt") return "l";
    return "ml";
  }
  return "g";
}

/** Convierte cantidad de unidad de entrada → base de almacenamiento del producto. */
export function toStorageAmount(amount, fromInputUnit, productUnit) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return NaN;
  const kind = measureKind(productUnit);
  if (kind === "volume") {
    const inMl = n * volumeUnitFactor(fromInputUnit);
    const base = storageBaseFactor(productUnit); // ml por 1 unidad de stock
    return inMl / base;
  }
  const inG = n * weightUnitFactor(fromInputUnit);
  const base = storageBaseFactor(productUnit);
  return inG / base;
}

/** Convierte cantidad en base de almacenamiento → unidad de entrada. */
export function fromStorageAmount(storageQty, toInputUnit, productUnit) {
  const n = Number(storageQty);
  if (!Number.isFinite(n)) return NaN;
  const kind = measureKind(productUnit);
  if (kind === "volume") {
    const inMl = n * storageBaseFactor(productUnit);
    return inMl / volumeUnitFactor(toInputUnit);
  }
  const inG = n * storageBaseFactor(productUnit);
  return inG / weightUnitFactor(toInputUnit);
}

export function toGrams(amount, fromUnit = "g") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return NaN;
  return n * weightUnitFactor(fromUnit);
}

export function fromGrams(grams, toUnit = "g") {
  const n = Number(grams);
  if (!Number.isFinite(n)) return NaN;
  const f = weightUnitFactor(toUnit);
  return f > 0 ? n / f : n;
}

export function formatGramsWithAlt(grams, { decimals = 2 } = {}) {
  const g = Number(grams);
  if (!Number.isFinite(g)) return "—";
  const kg = fromGrams(g, "kg");
  const lb = fromGrams(g, "lb");
  const gTxt = Number.isInteger(g) ? String(g) : g.toFixed(decimals);
  return `${gTxt} g  (≈ ${kg.toFixed(decimals)} kg · ${lb.toFixed(decimals)} lb)`;
}

export function formatStockWithAlt(qty, unitOrProduct, { decimals = 2 } = {}) {
  const n = Number(qty);
  if (!Number.isFinite(n)) return "—";
  const kind = measureKind(unitOrProduct);
  const abbr = unitAbbr(unitOrProduct) || (kind === "volume" ? "ml" : "g");
  if (kind === "volume") {
    const ml = n * storageBaseFactor(unitOrProduct);
    const liters = ml / 1000;
    return `${Number.isInteger(n) ? n : n.toFixed(decimals)} ${abbr}  (≈ ${liters.toFixed(decimals)} L)`;
  }
  if (kind === "weight") {
    const g = n * storageBaseFactor(unitOrProduct);
    return formatGramsWithAlt(g, { decimals });
  }
  return `${n} ${abbr}`;
}

/**
 * Intenta leer "900ml", "1L", "500g" del nombre / presentación.
 * Devuelve { amount, unit } en unidades literales del texto.
 */
export function parseMeasureFromText(text) {
  const s = String(text || "");
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*(ml|mL|ML|g|gr|kg|lb|l|L|lt|litro|litros)\b/i);
  if (!m) return null;
  const amount = Number(String(m[1]).replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  let unit = m[2].toLowerCase();
  if (unit === "gr") unit = "g";
  if (unit === "lt" || unit === "litro" || unit === "litros") unit = "l";
  return { amount, unit };
}

/**
 * Sugiere unitsPerPack: cuánto del destino entrega 1 empaque.
 * 1) Parse del nombre/presentación (Funda 900ml → 900 ml).
 * 2) Si no, ratio de factores de unidad empaque→destino.
 */
export function suggestLinkAmount(presentation, target) {
  if (!presentation || !target) return null;

  const parsed = parseMeasureFromText(
    `${presentation.name || ""} ${presentation.purchasePresentation || ""}`,
  );
  if (parsed) {
    // Convertir lo parseado a la unidad de stock del destino.
    if (measureKind(target) === "volume" && (parsed.unit === "ml" || parsed.unit === "l")) {
      const ml = parsed.amount * volumeUnitFactor(parsed.unit);
      return Number((ml / storageBaseFactor(target)).toFixed(4));
    }
    if (measureKind(target) === "weight" && ["g", "kg", "lb"].includes(parsed.unit)) {
      const g = parsed.amount * weightUnitFactor(parsed.unit);
      return Number((g / storageBaseFactor(target)).toFixed(4));
    }
  }

  // Fallback: factores de unidad (quintal→gramos, etc.)
  const fromUnit = presentation.InventoryUnit || presentation.unit || {
    abbreviation: presentation.unitAbbrev,
    factor: presentation.unitFactor,
  };
  const toUnit = target.InventoryUnit || target.unit || {
    abbreviation: target.unitAbbrev,
    factor: target.unitFactor,
  };
  const fromFactor = Number(fromUnit?.factor);
  const toFactor = Number(toUnit?.factor);
  if (Number.isFinite(fromFactor) && fromFactor > 0 && Number.isFinite(toFactor) && toFactor > 0) {
    // Solo si ambos son peso o ambos volumen (misma familia de medida).
    const sameFamily =
      (isWeightBaseUnit(fromUnit) && isWeightBaseUnit(toUnit)) ||
      (isVolumeBaseUnit(fromUnit) && isVolumeBaseUnit(toUnit));
    if (sameFamily) {
      return Number((fromFactor / toFactor).toFixed(4));
    }
  }
  return null;
}
