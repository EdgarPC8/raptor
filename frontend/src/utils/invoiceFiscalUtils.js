/** Datos fiscales / RIDE para impresión de facturas (estructura tipo SRI Ecuador). */

const to2 = (n) => Number(Number(n || 0).toFixed(2));

export function padSequential(n, digits = 9) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  return String(v).padStart(digits, "0");
}

export function formatInvoiceNumber(est, emi, sequential) {
  const e = String(est || "001").padStart(3, "0").slice(0, 3);
  const p = String(emi || "001").padStart(3, "0").slice(0, 3);
  return `${e}-${p}-${padSequential(sequential)}`;
}

export function formatInvoiceMoney(n, decimals = 2) {
  return to2(n).toFixed(decimals);
}

/** Precio unitario: hasta 4 decimales como en RIDE de muestra. */
export function formatInvoiceUnitPrice(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "0.00";
  const fixed4 = Number(v.toFixed(4));
  if (Math.round(fixed4 * 100) === fixed4 * 100) return fixed4.toFixed(2);
  return String(fixed4);
}

export function environmentLabel(env) {
  return String(env || "").toLowerCase() === "produccion" ? "PRODUCCIÓN" : "PRUEBAS";
}

/** Forma de pago según catálogo SRI (texto largo como en RIDE). */
export function sriPaymentFormLabel(method) {
  const m = String(method || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (m.includes("efectivo") || m === "01") return "SIN UTILIZACION DEL SISTEMA FINANCIERO";
  if (m.includes("tarjeta") || m === "16") return "TARJETA DE CREDITO";
  if (m.includes("transfer") || m.includes("deposito") || m === "20") {
    return "TRANSFERENCIA / DEPOSITO BANCARIO";
  }
  if (m.includes("credito")) return "OTROS CON UTILIZACION DEL SISTEMA FINANCIERO";
  return "OTROS CON UTILIZACION DEL SISTEMA FINANCIERO";
}

export function dominantIvaRate(items = []) {
  const rates = (items || [])
    .map((it) => Number(it.taxRate || 0))
    .filter((r) => r > 0);
  if (!rates.length) return 0;
  const freq = new Map();
  rates.forEach((r) => freq.set(r, (freq.get(r) || 0) + 1));
  let best = rates[0];
  let bestN = 0;
  freq.forEach((n, r) => {
    if (n > bestN) {
      bestN = n;
      best = r;
    }
  });
  return best;
}

/**
 * Une settings SRI + factura electrónica (si hay) al comprobante interno.
 * @param {object} receipt
 * @param {object|null} sriSettings
 * @param {object|null} sriInvoice
 * @param {{ logoUrl?: string }} [extra]
 */
export function enrichReceiptWithFiscal(receipt, sriSettings, sriInvoice = null, extra = {}) {
  if (!receipt) return null;
  const est =
    sriInvoice?.establishmentCode ||
    sriSettings?.establishmentCode ||
    "001";
  const emi =
    sriInvoice?.emissionPointCode ||
    sriSettings?.emissionPointCode ||
    "001";
  const sequential =
    sriInvoice?.sequential != null
      ? Number(sriInvoice.sequential)
      : sriSettings?.nextInvoiceSequential != null
        ? Number(sriSettings.nextInvoiceSequential)
        : null;
  const accessKey =
    sriInvoice?.accessKey || sriInvoice?.authorizationNumber || "";
  const authorizationNumber =
    sriInvoice?.authorizationNumber || sriInvoice?.accessKey || accessKey;
  const authorizedAt = sriInvoice?.authorizedAt || null;

  return {
    ...receipt,
    logoUrl: extra.logoUrl || receipt.logoUrl || "",
    fiscal: {
      ruc: sriSettings?.ruc || "",
      legalName: sriSettings?.legalName || receipt.businessName || "",
      tradeName: sriSettings?.tradeName || receipt.businessDescription || "",
      matrixAddress: sriSettings?.matrixAddress || "",
      establishmentAddress:
        sriSettings?.establishmentAddress || sriSettings?.matrixAddress || "",
      phone: sriSettings?.phone || "",
      email: sriSettings?.email || "",
      accountingRequired: Boolean(sriSettings?.accountingRequired),
      environment: sriSettings?.environment || sriInvoice?.environment || "pruebas",
      environmentLabel: environmentLabel(
        sriInvoice?.environment || sriSettings?.environment,
      ),
      establishmentCode: String(est).padStart(3, "0").slice(0, 3),
      emissionPointCode: String(emi).padStart(3, "0").slice(0, 3),
      sequential,
      invoiceNumber:
        sequential != null ? formatInvoiceNumber(est, emi, sequential) : "",
      accessKey,
      authorizationNumber,
      authorizedAt,
      emissionDate:
        (authorizedAt && String(authorizedAt).slice(0, 10)) ||
        (receipt.dateIso && String(receipt.dateIso).slice(0, 10)) ||
        "",
      status: sriInvoice?.status || null,
      fromSettingsPreview: !sriInvoice?.sequential && sequential != null,
    },
  };
}

export function isFacturaDocument(receipt) {
  return String(receipt?.documentType || "") === "factura";
}
