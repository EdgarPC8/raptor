/**
 * Utilidades para la pestaña Revisión de productos (barcode, ventas, duplicados, incompletos).
 */

export const REVIEW_FILTERS = [
  { id: "summary", label: "Resumen" },
  { id: "no_barcode", label: "Sin código de barras" },
  { id: "no_barcode_sold", label: "Sin barcode y se venden" },
  { id: "no_barcode_unsold", label: "Sin barcode y sin ventas" },
  { id: "similar_names", label: "Nombres parecidos" },
  { id: "incomplete", label: "Incompletos / poco útiles" },
];

export const SALES_PERIOD_OPTIONS = [
  { value: 30, label: "30 días" },
  { value: 90, label: "90 días" },
  { value: 365, label: "1 año" },
  { value: 0, label: "Todo el historial" },
];

export function hasBarcode(product) {
  return Boolean(String(product?.barcode || "").trim());
}

export function hasSku(product) {
  return Boolean(String(product?.sku || "").trim());
}

export function normalizeProductName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cur =
        a[i - 1] === b[j - 1]
          ? row[j - 1]
          : 1 + Math.min(row[j - 1], prev, row[j]);
      row[j - 1] = prev;
      prev = cur;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

function nameSimilarity(a, b) {
  const na = normalizeProductName(a);
  const nb = normalizeProductName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = Math.min(na.length, nb.length);
    const longer = Math.max(na.length, nb.length);
    return shorter / longer;
  }
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return maxLen ? 1 - dist / maxLen : 0;
}

/**
 * Agrupa productos con nombres muy parecidos (posible duplicado).
 * @returns {Array<{ key: string, score: number, products: object[] }>}
 */
export function findSimilarNameGroups(products, { minScore = 0.82 } = {}) {
  const list = (products || []).filter((p) => p?.name);
  const used = new Set();
  const groups = [];

  for (let i = 0; i < list.length; i += 1) {
    const a = list[i];
    if (used.has(a.id)) continue;
    const peers = [];
    for (let j = i + 1; j < list.length; j += 1) {
      const b = list[j];
      if (used.has(b.id)) continue;
      // No mezclar genérico con su presentación (mismo genericProductId chain)
      if (
        a.genericProductId &&
        Number(a.genericProductId) === Number(b.id)
      ) {
        continue;
      }
      if (
        b.genericProductId &&
        Number(b.genericProductId) === Number(a.id)
      ) {
        continue;
      }
      const score = nameSimilarity(a.name, b.name);
      if (score >= minScore) peers.push({ product: b, score });
    }
    if (!peers.length) continue;
    const best = Math.max(...peers.map((p) => p.score));
    const groupProducts = [a, ...peers.map((p) => p.product)];
    groupProducts.forEach((p) => used.add(p.id));
    groups.push({
      key: `sim-${a.id}`,
      score: best,
      products: groupProducts,
    });
  }

  groups.sort((x, y) => y.score - x.score || y.products.length - x.products.length);
  return groups;
}

export function isIncompleteProduct(product) {
  const noBarcode = !hasBarcode(product);
  const noSku = !hasSku(product);
  const noImage = !String(product?.primaryImageUrl || "").trim();
  const price = Number(product?.price ?? 0);
  const stock = Number(product?.stock ?? 0);
  const inactive = product?.isActive === false;
  const noPrice = !(price > 0);
  // Incompleto “poco útil”: varios huecos o inactivo sin stock
  const gaps = [noBarcode, noSku, noImage, noPrice].filter(Boolean).length;
  if (inactive && stock <= 0) return true;
  if (gaps >= 3) return true;
  if (noBarcode && noPrice && stock <= 0) return true;
  return false;
}

/**
 * Enriquece productos con ventas y arma buckets de revisión.
 */
export function buildProductReview({
  products = [],
  salesByProductId = {},
  typeFilter = "",
  activeOnly = false,
} = {}) {
  let list = Array.isArray(products) ? [...products] : [];
  if (typeFilter) list = list.filter((p) => p.type === typeFilter);
  if (activeOnly) list = list.filter((p) => p.isActive !== false);

  const enriched = list.map((p) => {
    const sales = salesByProductId[p.id] || salesByProductId[String(p.id)] || {};
    const soldQty = Number(sales.soldQty || 0);
    const revenue = Number(sales.revenue || 0);
    return {
      ...p,
      soldQty,
      revenue,
      _noBarcode: !hasBarcode(p),
      _incomplete: isIncompleteProduct(p),
    };
  });

  const noBarcode = enriched.filter((p) => p._noBarcode);
  const noBarcodeSold = noBarcode.filter((p) => p.soldQty > 0);
  const noBarcodeUnsold = noBarcode.filter((p) => !(p.soldQty > 0));
  const incomplete = enriched.filter((p) => p._incomplete);
  const similarGroups = findSimilarNameGroups(enriched);
  const similarProductIds = new Set(
    similarGroups.flatMap((g) => g.products.map((p) => p.id)),
  );

  const counts = {
    total: enriched.length,
    noBarcode: noBarcode.length,
    noBarcodeSold: noBarcodeSold.length,
    noBarcodeUnsold: noBarcodeUnsold.length,
    similarGroups: similarGroups.length,
    similarProducts: similarProductIds.size,
    incomplete: incomplete.length,
  };

  return {
    enriched,
    noBarcode,
    noBarcodeSold,
    noBarcodeUnsold,
    incomplete,
    similarGroups,
    counts,
  };
}
