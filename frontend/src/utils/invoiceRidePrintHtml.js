/** HTML de impresión RIDE factura (espejo de InvoiceRideContent). */
import { code128SvgMarkup } from "./code128Barcode.js";
import {
  formatInvoiceMoney,
  formatInvoiceUnitPrice,
  sriPaymentFormLabel,
  dominantIvaRate,
} from "./invoiceFiscalUtils.js";
import { getReceiptLayout } from "./receiptFormats.js";

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function metaRow(label, value, boldValue = false) {
  return `<div style="margin:0 0 3px;line-height:1.3">
    <strong>${esc(label)}</strong>
    <span style="font-weight:${boldValue ? 800 : 600};word-break:break-all">${esc(value || "—")}</span>
  </div>`;
}

function totalsHtml(receipt, { isTicket, ivaRate }) {
  const discount = Number(receipt.discount || 0);
  const ice = Number(receipt.ice || 0);
  const tip = Number(receipt.tip || 0);
  const rows = [
    ["Total Sin Impuestos", formatInvoiceMoney(receipt.subtotal)],
    ["Descuento", formatInvoiceMoney(discount)],
    ["Valor ICE", formatInvoiceMoney(ice)],
    [ivaRate > 0 ? `Valor IVA ${ivaRate}%` : "Valor IVA", formatInvoiceMoney(receipt.iva)],
  ];
  if (!isTicket) rows.push(["Propina", formatInvoiceMoney(tip)]);
  rows.push(["Valor Total", formatInvoiceMoney(receipt.total)]);
  const body = rows
    .map(([label, value], i) => {
      const isTotal = label === "Valor Total";
      const top =
        i === rows.length - 1
          ? "border-top:1px solid #000;margin-top:4px;padding-top:4px;font-weight:900"
          : "font-weight:700";
      return `<div style="display:flex;justify-content:space-between;gap:8px;${top}">
        <span>${esc(label)}</span><span>${esc(value)}</span>
      </div>`;
    })
    .join("");
  const note = receipt.fiscal?.fromSettingsPreview
    ? `<div style="margin-top:6px;font-size:10px;font-weight:700;color:#444">Sin factura SRI vinculada: el Nº se asigna al emitir/autorizar.</div>`
    : "";
  return `${body}${note}`;
}

function paymentHtml(receipt, isTicket) {
  const pay = sriPaymentFormLabel(receipt.paymentMethod);
  return `<div style="font-size:0.9em">
    <div style="font-weight:800;margin-bottom:4px">Información Adicional</div>
    ${!isTicket ? `<div style="font-weight:600;margin-bottom:6px">Sucursal: Matriz</div>` : ""}
    <table style="width:100%;border-collapse:collapse;font-size:0.85em">
      <thead>
        <tr>
          <th style="border:1px solid #000;padding:3px 4px;text-align:left">Forma de Pago</th>
          <th style="border:1px solid #000;padding:3px 4px;text-align:left">Valor</th>
          <th style="border:1px solid #000;padding:3px 4px;text-align:left">Plazo</th>
          <th style="border:1px solid #000;padding:3px 4px;text-align:left">Tiempo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border:1px solid #000;padding:3px 4px;font-weight:600">${esc(pay)}</td>
          <td style="border:1px solid #000;padding:3px 4px;font-weight:700">${esc(formatInvoiceMoney(receipt.total))}</td>
          <td style="border:1px solid #000;padding:3px 4px"></td>
          <td style="border:1px solid #000;padding:3px 4px;font-weight:600">ninguno</td>
        </tr>
      </tbody>
    </table>
  </div>`;
}

function customerHtml(receipt, emissionDate, isTicket) {
  return `<div style="border:1px solid #000;padding:${isTicket ? 6 : 8}px;margin-bottom:${isTicket ? 8 : 10}px;line-height:1.35">
    ${metaRow("Razón Social/ Nombres:", receipt.customerName)}
    ${
      isTicket
        ? `${metaRow("Identificación:", receipt.customerCedula)}
           ${metaRow("Dirección:", receipt.customerAddress)}
           ${metaRow("Teléfono:", receipt.customerPhone)}
           ${metaRow("Correo:", receipt.customerEmail)}`
        : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            ${metaRow("Identificación:", receipt.customerCedula)}
            ${metaRow("Fecha Emisión:", emissionDate)}
            ${metaRow("Dirección:", receipt.customerAddress)}
            ${metaRow("Guía de Remisión:", "")}
            ${metaRow("Teléfono:", receipt.customerPhone)}
            ${metaRow("Correo:", receipt.customerEmail)}
          </div>`
    }
  </div>`;
}

function issuerHtml(receipt, fiscal, isTicket) {
  const logo = receipt.logoUrl
    ? `<img src="${esc(receipt.logoUrl)}" alt="" style="max-width:${isTicket ? 120 : 160}px;max-height:${isTicket ? 70 : 90}px;object-fit:contain;margin:0 ${isTicket ? "auto" : 0} 6px;display:block" />`
    : "";
  return `<div style="text-align:${isTicket ? "center" : "left"}">
    ${logo}
    <div style="font-weight:900;font-size:${isTicket ? "0.95em" : "1.05em"};line-height:1.25">${esc(fiscal.legalName || receipt.businessName)}</div>
    ${
      fiscal.tradeName || receipt.businessDescription
        ? `<div style="font-weight:700;font-size:${isTicket ? "0.85em" : "0.95em"};margin-top:2px">${esc(fiscal.tradeName || receipt.businessDescription)}</div>`
        : ""
    }
    ${fiscal.matrixAddress ? `<div style="font-weight:600;font-size:0.82em;margin-top:4px"><strong>Matriz: </strong>${esc(fiscal.matrixAddress)}</div>` : ""}
    ${fiscal.establishmentAddress ? `<div style="font-weight:600;font-size:0.82em"><strong>Sucursal: </strong>${esc(fiscal.establishmentAddress)}</div>` : ""}
    <div style="font-weight:600;font-size:0.82em;margin-top:3px"><strong>Obligado a llevar Contabilidad: </strong>${fiscal.accountingRequired ? "SI" : "NO"}</div>
    ${fiscal.phone ? `<div style="font-weight:600;font-size:0.82em">${esc(fiscal.phone)}</div>` : ""}
    ${fiscal.email ? `<div style="font-weight:600;font-size:0.82em">${esc(fiscal.email)}</div>` : ""}
  </div>`;
}

export function buildInvoiceRidePrintHtml(receipt, format = "a4") {
  if (!receipt) return "";
  const layout = getReceiptLayout(format);
  const isTicket = layout.isTicket;
  const fiscal = receipt.fiscal || {};
  const items = receipt.items || [];
  const ivaRate = dominantIvaRate(items);
  const emissionDate =
    fiscal.emissionDate ||
    (receipt.date && String(receipt.date).match(/\d{4}-\d{2}-\d{2}/)?.[0]) ||
    "";
  const barcodeKey = fiscal.authorizationNumber || fiscal.accessKey || "";
  const barcodeSvg = barcodeKey
    ? code128SvgMarkup(barcodeKey, {
        height: isTicket ? 36 : 48,
        maxWidth: isTicket ? 240 : 300,
      })
    : "";

  const w = isTicket ? "100%" : "210mm";
  const fs = isTicket ? (layout.narrow ? "11px" : "12.5px") : "13px";
  const pad = isTicket ? "0" : "8px";

  const docMeta = isTicket
    ? `<div style="text-align:center">
        <div style="font-weight:900;font-size:1.15em;letter-spacing:0.5px;margin-bottom:6px">FACTURA</div>
        ${metaRow("Ruc:", fiscal.ruc, true)}
      </div>`
    : `<div>
        <div style="font-weight:900;font-size:1.35em;letter-spacing:0.5px;margin-bottom:8px;text-align:center">FACTURA</div>
        ${metaRow("RUC:", fiscal.ruc, true)}
        ${metaRow("No.", fiscal.invoiceNumber, true)}
        ${metaRow("Ambiente", fiscal.environmentLabel, true)}
        ${metaRow("Autorización", fiscal.authorizationNumber || "Pendiente de autorización SRI")}
        ${fiscal.authorizedAt ? metaRow("Fecha y Hora Autorización", fiscal.authorizedAt) : ""}
        ${barcodeSvg ? `<div style="margin-top:8px">${barcodeSvg}</div>` : ""}
      </div>`;

  const ticketAuth = `<div style="text-align:center;margin-top:6px">
    ${metaRow("Fecha Emisión:", emissionDate, true)}
    ${metaRow("No.", fiscal.invoiceNumber, true)}
    ${metaRow("Ambiente", fiscal.environmentLabel, true)}
    ${metaRow("Autorización", fiscal.authorizationNumber || "Pendiente SRI")}
    ${fiscal.authorizedAt ? metaRow("Fecha y Hora Autorización", fiscal.authorizedAt) : ""}
    ${fiscal.accessKey ? metaRow("Clave acceso", fiscal.accessKey) : ""}
  </div>`;

  const itemsHtml = isTicket
    ? `<div style="margin-bottom:8px">
        <div style="display:grid;grid-template-columns:0.7fr 2.2fr 0.9fr 0.7fr 0.9fr;gap:2px;border-bottom:1px solid #000;padding-bottom:3px;margin-bottom:3px;font-weight:800;font-size:0.85em">
          <span>Cant</span><span>Descripción</span><span style="text-align:right">P.V.P</span><span style="text-align:right">Descto</span><span style="text-align:right">Subtotal</span>
        </div>
        ${items
          .map(
            (it) => `<div style="display:grid;grid-template-columns:0.7fr 2.2fr 0.9fr 0.7fr 0.9fr;gap:2px;padding:3px 0;border-bottom:1px dotted #999;font-weight:600;font-size:0.9em;align-items:start">
              <span>${esc(formatInvoiceMoney(it.quantity))}</span>
              <span style="word-break:break-word">${esc(it.name)}</span>
              <span style="text-align:right">${esc(formatInvoiceUnitPrice(it.price))}</span>
              <span style="text-align:right">${esc(formatInvoiceMoney(it.discount || 0))}</span>
              <span style="text-align:right">${esc(formatInvoiceMoney(it.subtotal ?? it.lineTotal))}</span>
            </div>`,
          )
          .join("")}
      </div>`
    : `<table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:0.92em">
        <thead>
          <tr>
            ${["Codigo", "Descripción", "Cant", "Precio Unitario", "Descto", "Subtotal"]
              .map(
                (h, i) =>
                  `<th style="border:1px solid #000;padding:4px 5px;font-weight:800;text-align:${i >= 2 ? "right" : "left"};background:#f3f3f3">${h}</th>`,
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (it, idx) => `<tr>
                <td style="border:1px solid #000;padding:3px 5px;font-weight:600">${esc(it.code || it.productId || idx + 1)}</td>
                <td style="border:1px solid #000;padding:3px 5px;font-weight:600">${esc(it.name)}</td>
                <td style="border:1px solid #000;padding:3px 5px;text-align:right;font-weight:700">${esc(formatInvoiceMoney(it.quantity))}</td>
                <td style="border:1px solid #000;padding:3px 5px;text-align:right;font-weight:700">${esc(formatInvoiceUnitPrice(it.price))}</td>
                <td style="border:1px solid #000;padding:3px 5px;text-align:right;font-weight:700">${esc(formatInvoiceMoney(it.discount || 0))}</td>
                <td style="border:1px solid #000;padding:3px 5px;text-align:right;font-weight:700">${esc(formatInvoiceMoney(it.subtotal ?? it.lineTotal))}</td>
              </tr>`,
            )
            .join("")}
        </tbody>
      </table>`;

  if (isTicket) {
    return `<div style="width:${w};max-width:${w};margin:0 auto;padding:${pad};box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;font-size:${fs};color:#000;line-height:1.3">
      ${docMeta}
      <div style="margin:8px 0">${issuerHtml(receipt, fiscal, true)}</div>
      ${ticketAuth}
      <div style="border-top:1px solid #000;border-bottom:1px solid #000;padding:4px 0;margin:8px 0"></div>
      ${customerHtml(receipt, emissionDate, true)}
      ${itemsHtml}
      ${totalsHtml(receipt, { isTicket: true, ivaRate })}
      <div style="margin-top:10px">${paymentHtml(receipt, true)}</div>
    </div>`;
  }

  return `<div style="width:${w};max-width:${w};margin:0 auto;padding:${pad};box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;font-size:${fs};color:#000;line-height:1.3">
    <div style="display:grid;grid-template-columns:1.05fr 0.95fr;gap:10px;margin-bottom:10px">
      <div style="border:1px solid #000;padding:10px">${issuerHtml(receipt, fiscal, false)}</div>
      <div style="border:1px solid #000;padding:10px">${docMeta}</div>
    </div>
    ${customerHtml(receipt, emissionDate, false)}
    ${itemsHtml}
    <div style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:10px;align-items:start">
      <div style="border:1px solid #000;padding:8px">${paymentHtml(receipt, false)}</div>
      <div style="border:1px solid #000;padding:8px">${totalsHtml(receipt, { isTicket: false, ivaRate })}</div>
    </div>
  </div>`;
}
