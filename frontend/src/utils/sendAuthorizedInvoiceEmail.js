/**
 * Tras autorizar factura SRI: genera PDF RIDE (igual que Descargar) y lo envía por correo.
 */
import { applyReceiptDocumentType } from "./saleReceiptUtils.js";
import { enrichReceiptWithFiscal } from "./invoiceFiscalUtils.js";
import { generateRidePdfBlob } from "./generateRidePdfBlob.js";
import {
  fetchSriInvoice,
  sendSriInvoiceCustomerEmail,
} from "../api/sriInvoicesRequest.js";
import { fetchSriBillingSettings } from "../api/sriBillingRequest.js";

/** Convierte ítems del payload SRI (caja/emisión) al formato del RIDE. */
export function mapSriPayloadItemsToReceiptItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((it, idx) => {
      if (!it || typeof it !== "object") return null;
      const qty = Number(it.qty ?? it.quantity ?? it.cantidad) || 0;
      if (!(qty > 0)) return null;
      const taxRate = Number(it.taxRate ?? it.tarifa ?? 0) || 0;
      const unitGross = Number(it.unitPrice ?? it.price ?? it.precioUnitario) || 0;
      const lineBase =
        it.lineBase != null
          ? Number(it.lineBase)
          : taxRate > 0
            ? Number(((qty * unitGross) / (1 + taxRate / 100)).toFixed(2))
            : Number((qty * unitGross).toFixed(2));
      const lineTotal =
        it.lineTax != null
          ? Number((lineBase + Number(it.lineTax)).toFixed(2))
          : Number((qty * unitGross).toFixed(2));
      const unitForRide =
        taxRate > 0 && lineBase > 0 ? lineBase / qty : unitGross;
      return {
        name: String(it.description || it.descripcion || it.name || it.productName || "Producto").trim(),
        code: String(it.code || it.codigoPrincipal || it.productId || idx + 1).slice(0, 25),
        productId: it.productId || null,
        quantity: qty,
        price: unitForRide,
        discount: Number(it.discount || 0) || 0,
        taxRate,
        subtotal: lineBase,
        iva: Number(it.lineTax != null ? it.lineTax : lineTotal - lineBase) || 0,
        lineTotal,
      };
    })
    .filter(Boolean);
}

function receiptHasItems(receipt) {
  return Array.isArray(receipt?.items) && receipt.items.some((it) => Number(it?.quantity) > 0);
}

/**
 * @param {{
 *   invoice: object,
 *   receipt?: object|null,
 *   sriSettings?: object|null,
 *   logoUrl?: string,
 * }} opts
 */
export async function sendAuthorizedInvoiceEmailWithRidePdf({
  invoice,
  receipt = null,
  sriSettings = null,
  logoUrl = "",
}) {
  if (!invoice?.id) return { ok: false, skipped: true, reason: "Sin factura" };
  if (String(invoice.status || "").toLowerCase() !== "authorized") {
    return { ok: false, skipped: true, reason: "Aún no autorizada" };
  }

  let settings = sriSettings;
  if (!settings) {
    try {
      settings = await fetchSriBillingSettings();
    } catch {
      settings = null;
    }
  }
  if (!settings?.enableSendInvoiceEmail) {
    return { ok: false, skipped: true, reason: "Envío por correo desactivado" };
  }

  const to = String(invoice.customerEmail || receipt?.customerEmail || "").trim();
  if (!to.includes("@")) {
    return { ok: false, skipped: true, reason: "Sin correo de cliente" };
  }

  let inv = invoice;
  // Asegurar payloadJson con ítems (a veces la respuesta de emit viene incompleta)
  if (!Array.isArray(inv?.payloadJson?.items) || !inv.payloadJson.items.length) {
    try {
      const fresh = await fetchSriInvoice(inv.id);
      if (fresh) inv = { ...inv, ...fresh, payloadJson: fresh.payloadJson || inv.payloadJson };
    } catch {
      /* ok */
    }
  }

  let pdfBlob = null;
  try {
    const base =
      receipt && typeof receipt === "object"
        ? { ...receipt }
        : {
            id: inv.orderId || inv.id,
            documentType: "factura",
            customerName: inv.customerName,
            customerCedula: inv.customerIdent,
            customerEmail: inv.customerEmail,
            items: [],
            subtotal: Number(inv.subtotal) || 0,
            iva: Number(inv.taxTotal) || 0,
            total: Number(inv.total) || 0,
            paymentMethod: "efectivo",
            date: inv.authorizedAt || inv.createdAt,
          };

    if (!receiptHasItems(base)) {
      const fromPayload = mapSriPayloadItemsToReceiptItems(inv?.payloadJson?.items);
      if (fromPayload.length) {
        base.items = fromPayload;
        if (!(Number(base.subtotal) > 0) && Number(inv.subtotal) > 0) {
          base.subtotal = Number(inv.subtotal);
          base.iva = Number(inv.taxTotal) || 0;
          base.total = Number(inv.total) || 0;
        }
      }
    }

    const typed = applyReceiptDocumentType({ ...base, documentType: "factura" }, "factura") || base;
    const enriched = enrichReceiptWithFiscal(typed, settings, inv, {
      logoUrl: logoUrl || typed.logoUrl || "",
    });

    if (!receiptHasItems(enriched)) {
      console.warn("PDF RIDE correo: sin ítems en receipt ni payloadJson");
    }

    pdfBlob = await generateRidePdfBlob(enriched, "a4");
  } catch (e) {
    console.warn("PDF RIDE para correo:", e?.message || e);
  }

  return sendSriInvoiceCustomerEmail(inv.id, pdfBlob);
}
