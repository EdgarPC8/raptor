/**
 * Tras autorizar factura SRI: genera PDF RIDE (igual que Descargar) y lo envía por correo.
 */
import { applyReceiptDocumentType } from "./saleReceiptUtils.js";
import { enrichReceiptWithFiscal } from "./invoiceFiscalUtils.js";
import { generateRidePdfBlob } from "./generateRidePdfBlob.js";
import { sendSriInvoiceCustomerEmail } from "../api/sriInvoicesRequest.js";
import { fetchSriBillingSettings } from "../api/sriBillingRequest.js";

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

  let pdfBlob = null;
  try {
    const base =
      receipt ||
      ({
        id: invoice.orderId || invoice.id,
        documentType: "factura",
        customerName: invoice.customerName,
        customerCedula: invoice.customerIdent,
        customerEmail: invoice.customerEmail,
        items: [],
        subtotal: Number(invoice.subtotal) || 0,
        iva: Number(invoice.taxTotal) || 0,
        total: Number(invoice.total) || 0,
        paymentMethod: "efectivo",
        date: invoice.authorizedAt || invoice.createdAt,
      });
    const typed = applyReceiptDocumentType(base, "factura") || base;
    const enriched = enrichReceiptWithFiscal(typed, settings, invoice, {
      logoUrl: logoUrl || typed.logoUrl || "",
    });
    // Preferir ítems del receipt POS; si vienen vacíos, el RIDE igual muestra totales
    pdfBlob = await generateRidePdfBlob(enriched, "a4");
  } catch (e) {
    console.warn("PDF RIDE para correo:", e?.message || e);
  }

  return sendSriInvoiceCustomerEmail(invoice.id, pdfBlob);
}
