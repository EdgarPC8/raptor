import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { getTicketPdfPageSize, isTicketFormat } from "./receiptFormats.js";

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Captura el comprobante entero (sin recortes ni desfase).
 * Clona fuera del Dialog de MUI: el transform del modal desalinea html2canvas.
 */
export async function captureReceiptElement(element) {
  if (!element) throw new Error("No hay vista previa para exportar.");

  const width = Math.ceil(element.scrollWidth || element.offsetWidth || 0);
  const height = Math.ceil(element.scrollHeight || element.offsetHeight || 0);
  if (!width || !height) throw new Error("No hay vista previa para exportar.");

  const host = document.createElement("div");
  host.setAttribute("data-receipt-capture-host", "1");
  host.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    "z-index:-1",
    "margin:0",
    "padding:0",
    "background:#ffffff",
    "overflow:visible",
    "pointer-events:none",
  ].join(";");

  const clone = element.cloneNode(true);
  clone.style.cssText = [
    "display:block",
    `width:${width}px`,
    "max-width:none",
    "max-height:none",
    "height:auto",
    "overflow:visible",
    "margin:0",
    "transform:none",
    "box-sizing:border-box",
    "background:#ffffff",
  ].join(";");

  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    // Dejar que el layout del clon se estabilice
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const captureH = Math.ceil(clone.scrollHeight || height);
    const captureW = Math.ceil(clone.scrollWidth || width);

    return await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      width: captureW,
      height: captureH,
      windowWidth: captureW,
      windowHeight: captureH,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
    });
  } finally {
    host.remove();
  }
}

export async function downloadReceiptAsPng(element, filename = "comprobante.png") {
  const canvas = await captureReceiptElement(element);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No se pudo generar la imagen.");
  triggerDownload(blob, filename);
}

/** Copia la vista previa del comprobante como PNG al portapapeles. */
export async function copyReceiptAsPng(element) {
  if (!navigator.clipboard || typeof window.ClipboardItem === "undefined") {
    throw new Error("Tu navegador no permite copiar imágenes al portapapeles.");
  }
  const canvas = await captureReceiptElement(element);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No se pudo generar la imagen.");
  await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
}

export async function downloadReceiptAsPdf(element, format = "a4", filename = "comprobante.pdf") {
  const canvas = await captureReceiptElement(element);
  const imgData = canvas.toDataURL("image/png");
  const isTicket = isTicketFormat(format);
  const ticketSize = getTicketPdfPageSize(format);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: isTicket ? ticketSize : "a4",
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = isTicket ? 2 : 8;
  const maxW = pageWidth - margin * 2;
  const imgH = (canvas.height * maxW) / canvas.width;
  let h = imgH;
  if (h > pageHeight - margin * 2) {
    h = pageHeight - margin * 2;
  }
  pdf.addImage(imgData, "PNG", margin, margin, maxW, h);
  pdf.save(filename);
}
