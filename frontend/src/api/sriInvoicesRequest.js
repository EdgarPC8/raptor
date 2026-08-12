/** API comprobantes electrónicos SRI (emisión / bandeja). */
import axios, { authHeaders, jwt } from "./axios.js";

export async function emitSriInvoice(payload) {
  const { data } = await axios.post("/sri/invoices/emit", payload, authHeaders());
  return data;
}

export async function fetchSriInvoices(limit = 50, documentType) {
  const { data } = await axios.get("/sri/invoices", {
    ...authHeaders(),
    params: { limit, ...(documentType ? { documentType } : {}) },
  });
  return data?.invoices || [];
}

export async function fetchSriInvoice(id) {
  const { data } = await axios.get(`/sri/invoices/${id}`, authHeaders());
  return data?.invoice || null;
}

export async function refreshSriInvoice(id) {
  const { data } = await axios.post(`/sri/invoices/${id}/refresh`, {}, authHeaders());
  return data;
}

/** Envía correo al cliente con PDF RIDE (opcional) + XML. */
export async function sendSriInvoiceCustomerEmail(invoiceId, pdfBlob) {
  const fd = new FormData();
  if (pdfBlob) {
    fd.append("pdf", pdfBlob, `factura-${invoiceId}.pdf`);
  }
  const { data } = await axios.post(`/sri/invoices/${invoiceId}/send-email`, fd, {
    headers: { Authorization: jwt(), "Content-Type": "multipart/form-data" },
  });
  return data;
}

/**
 * Consulta en el SRI una factura de compra por clave de acceso (49 dígitos / código de barras RIDE).
 * @returns {{ xml: string, accessKey: string, estado: string, ... }}
 */
export async function lookupSriPurchaseInvoiceByAccessKey(accessKey, environment) {
  const { data } = await axios.post(
    "/sri/purchase-invoices/lookup",
    {
      accessKey,
      ...(environment ? { environment } : {}),
    },
    authHeaders(),
  );
  return data;
}
