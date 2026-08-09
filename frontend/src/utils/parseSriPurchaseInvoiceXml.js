/**
 * Parsea XML de factura electrónica SRI (compra) para importar líneas a pedido proveedor.
 * Acepta factura suelta o envoltorio <autorizacion><comprobante><![CDATA[...]]>.
 */

const IVA_PCT_BY_CODIGO = {
  0: 0,
  2: 12,
  3: 14,
  4: 15,
  5: 5,
  6: 0,
  7: 0,
  8: 0,
  10: 13,
};

function textOf(el, tag) {
  if (!el) return "";
  const node = el.getElementsByTagName(tag)?.[0];
  return String(node?.textContent || "").trim();
}

function firstByLocalName(root, localName) {
  if (!root) return null;
  if (root.localName === localName || root.nodeName === localName) return root;
  const all = root.getElementsByTagName("*");
  for (let i = 0; i < all.length; i += 1) {
    const n = all[i];
    if (n.localName === localName || n.nodeName === localName) return n;
  }
  return null;
}

function allByLocalName(root, localName) {
  if (!root) return [];
  const out = [];
  const all = root.getElementsByTagName("*");
  for (let i = 0; i < all.length; i += 1) {
    const n = all[i];
    if (n.localName === localName || n.nodeName === localName) out.push(n);
  }
  return out;
}

/** Extrae el XML de factura desde texto (puede venir firmado o en autorizacion). */
export function extractFacturaXmlString(rawText) {
  const raw = String(rawText || "").trim();
  if (!raw) throw new Error("El archivo XML está vacío.");

  // CDATA dentro de autorizacion/comprobante
  const cdataMatch = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
  if (cdataMatch?.[1] && /<(factura|notaCredito|liquidacionCompra)\b/i.test(cdataMatch[1])) {
    return cdataMatch[1].trim();
  }

  // Escaped comprobante content
  const comprobanteMatch = raw.match(/<comprobante[^>]*>([\s\S]*?)<\/comprobante>/i);
  if (comprobanteMatch?.[1]) {
    let inner = comprobanteMatch[1].trim();
    if (inner.includes("&lt;")) {
      const ta = document.createElement("textarea");
      ta.innerHTML = inner;
      inner = ta.value;
    }
    if (/<(factura|notaCredito|liquidacionCompra)\b/i.test(inner)) return inner.trim();
  }

  if (/<(factura|notaCredito|liquidacionCompra)\b/i.test(raw)) return raw;
  throw new Error("No se encontró una factura electrónica SRI en el XML.");
}

function parseDdMmYyyy(s) {
  const m = String(s || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function num(v) {
  const n = Number(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

function ivaRateFromImpuesto(detalleEl) {
  const impuestos = firstByLocalName(detalleEl, "impuestos");
  const impuesto = impuestos ? firstByLocalName(impuestos, "impuesto") : firstByLocalName(detalleEl, "impuesto");
  if (!impuesto) return 0;
  const tarifa = num(textOf(impuesto, "tarifa"));
  if (tarifa > 0) return tarifa;
  const codigoPct = String(textOf(impuesto, "codigoPorcentaje") || "").trim();
  if (codigoPct in IVA_PCT_BY_CODIGO) return IVA_PCT_BY_CODIGO[codigoPct];
  return 0;
}

/**
 * @returns {{
 *   docType: string,
 *   supplierRuc: string,
 *   supplierName: string,
 *   tradeName: string,
 *   invoiceNumber: string,
 *   accessKey: string,
 *   emissionDate: string,
 *   subtotal: number,
 *   total: number,
 *   lines: Array<{
 *     key: string,
 *     code: string,
 *     auxCode: string,
 *     description: string,
 *     quantity: number,
 *     unitPrice: number,
 *     discount: number,
 *     lineBase: number,
 *     taxRate: number,
 *   }>
 * }}
 */
export function parseSriPurchaseInvoiceXml(rawText) {
  const facturaXml = extractFacturaXmlString(rawText);
  const doc = new DOMParser().parseFromString(facturaXml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("XML inválido o mal formado.");
  }

  const root =
    firstByLocalName(doc, "factura") ||
    firstByLocalName(doc, "notaCredito") ||
    firstByLocalName(doc, "liquidacionCompra");
  if (!root) throw new Error("El XML no es una factura/nota de crédito SRI reconocible.");

  const infoTrib = firstByLocalName(root, "infoTributaria") || root;
  const infoFactura =
    firstByLocalName(root, "infoFactura") ||
    firstByLocalName(root, "infoNotaCredito") ||
    firstByLocalName(root, "infoLiquidacionCompra");

  const estab = textOf(infoTrib, "estab") || "001";
  const ptoEmi = textOf(infoTrib, "ptoEmi") || "001";
  const secuencial = textOf(infoTrib, "secuencial") || "";
  const invoiceNumber = secuencial
    ? `${estab.padStart(3, "0")}-${ptoEmi.padStart(3, "0")}-${String(secuencial).padStart(9, "0")}`
    : "";

  const detallesRoot = firstByLocalName(root, "detalles");
  const detalleNodes = detallesRoot
    ? Array.from(detallesRoot.children || []).filter(
        (n) => n.localName === "detalle" || n.nodeName === "detalle",
      )
    : allByLocalName(root, "detalle").filter(
        (n) => textOf(n, "descripcion") || textOf(n, "codigoPrincipal"),
      );

  const lines = detalleNodes.map((n, idx) => {
    const quantity = num(textOf(n, "cantidad"));
    const unitPrice = num(textOf(n, "precioUnitario"));
    const discount = num(textOf(n, "descuento"));
    const lineBase = num(textOf(n, "precioTotalSinImpuesto")) || Math.max(0, quantity * unitPrice - discount);
    const taxRate = ivaRateFromImpuesto(n);
    return {
      key: `xml_${idx}_${textOf(n, "codigoPrincipal") || idx}`,
      code: textOf(n, "codigoPrincipal"),
      auxCode: textOf(n, "codigoAuxiliar"),
      description: textOf(n, "descripcion") || `Ítem ${idx + 1}`,
      quantity,
      unitPrice,
      discount,
      lineBase,
      taxRate,
    };
  });

  if (!lines.length) {
    throw new Error("La factura no tiene detalles (productos) legibles.");
  }

  return {
    docType: root.localName || root.nodeName || "factura",
    supplierRuc: textOf(infoTrib, "ruc"),
    supplierName: textOf(infoTrib, "razonSocial"),
    tradeName: textOf(infoTrib, "nombreComercial"),
    invoiceNumber,
    accessKey: textOf(infoTrib, "claveAcceso"),
    emissionDate: parseDdMmYyyy(textOf(infoFactura, "fechaEmision")),
    subtotal: num(textOf(infoFactura, "totalSinImpuestos")),
    total: num(textOf(infoFactura, "importeTotal")),
    lines,
  };
}

/** Empareja un ítem XML con un producto del catálogo.
 * @param {object[]} products
 * @param {object} line
 * @param {Map<string, number>|Record<string, number>|null} [supplierCodeMap] codeLower → productId
 */
export function matchProductForXmlLine(products, line, supplierCodeMap = null) {
  const list = Array.isArray(products) ? products : [];
  const map =
    supplierCodeMap instanceof Map
      ? supplierCodeMap
      : supplierCodeMap && typeof supplierCodeMap === "object"
        ? new Map(
            Object.entries(supplierCodeMap).map(([k, v]) => [
              String(k).toLowerCase(),
              Number(v),
            ]),
          )
        : null;

  if (map && map.size) {
    for (const code of [line?.code, line?.auxCode]) {
      const key = String(code || "")
        .trim()
        .toLowerCase();
      if (!key) continue;
      const pid = map.get(key);
      if (pid) {
        const hit = list.find((p) => Number(p.id) === Number(pid));
        if (hit) return hit;
      }
    }
  }

  const codes = [line?.code, line?.auxCode]
    .map((c) => String(c || "").trim())
    .filter(Boolean);

  for (const code of codes) {
    const byDigits = findProductByLooseCode(list, code);
    if (byDigits) return byDigits;
  }

  const desc = String(line?.description || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!desc) return null;

  const exact = list.find(
    (p) => String(p.name || "").trim().toLowerCase().replace(/\s+/g, " ") === desc,
  );
  if (exact) return exact;

  if (desc.length >= 8) {
    const partial = list.find((p) => {
      const n = String(p.name || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
      return n && (n.includes(desc) || desc.includes(n));
    });
    if (partial) return partial;
  }
  return null;
}

/** Convierte lista API { supplierCode, productId } → Map. */
export function buildSupplierCodeMap(codes = []) {
  const map = new Map();
  for (const row of codes || []) {
    const key = String(row.supplierCode || "")
      .trim()
      .toLowerCase();
    const pid = Number(row.productId);
    if (key && pid) map.set(key, pid);
  }
  return map;
}

function findProductByLooseCode(products, rawCode) {
  const raw = String(rawCode || "").trim();
  if (!raw) return null;
  const low = raw.toLowerCase();
  const digits = raw.replace(/\D/g, "");

  const bySku = products.find((p) => String(p.sku || "").trim().toLowerCase() === low);
  if (bySku) return bySku;

  const byBarcodeExact = products.find(
    (p) => String(p.barcode || "").trim().toLowerCase() === low,
  );
  if (byBarcodeExact) return byBarcodeExact;

  if (digits) {
    const byBarcodeDigits = products.find(
      (p) => String(p.barcode || "").replace(/\D/g, "") === digits,
    );
    if (byBarcodeDigits) return byBarcodeDigits;
    const bySkuDigits = products.find(
      (p) => String(p.sku || "").replace(/\D/g, "") === digits && digits.length >= 3,
    );
    if (bySkuDigits) return bySkuDigits;
  }
  return null;
}

export function findSupplierByRuc(suppliers, ruc) {
  const want = String(ruc || "").replace(/\D/g, "");
  if (!want || want.length < 10) return null;
  return (
    (suppliers || []).find((s) => {
      const candidates = [s.ruc, s.cedula, s.document, s.taxId, s.identificacion];
      return candidates.some((c) => {
        const raw = String(c || "").replace(/\D/g, "");
        return raw && raw === want;
      });
    }) || null
  );
}

/** Match proveedor por RUC (si existe en ficha) o por razón social. */
export function findSupplierForXmlInvoice(suppliers, { ruc, supplierName } = {}) {
  const byRuc = findSupplierByRuc(suppliers, ruc);
  if (byRuc) return byRuc;
  const want = String(supplierName || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (want.length < 4) return null;
  return (
    (suppliers || []).find(
      (s) =>
        String(s.name || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ") === want,
    ) || null
  );
}
