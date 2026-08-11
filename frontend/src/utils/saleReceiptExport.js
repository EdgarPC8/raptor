import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { getTicketPdfPageSize, isTicketFormat } from "./receiptFormats.js";

/** Ancho de captura A4 ≈ 210 mm a 96 dpi (layout completo, no el del diálogo estrecho). */
export const A4_CAPTURE_WIDTH_PX = 794;

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
 * @param {HTMLElement} element
 * @param {{ targetWidth?: number }} [options] — si se pasa, fuerza el ancho del clon (p. ej. A4).
 */
export async function captureReceiptElement(element, options = {}) {
  if (!element) throw new Error("No hay vista previa para exportar.");

  const naturalW = Math.ceil(element.scrollWidth || element.offsetWidth || 0);
  const naturalH = Math.ceil(element.scrollHeight || element.offsetHeight || 0);
  if (!naturalW || !naturalH) throw new Error("No hay vista previa para exportar.");

  const width = Math.ceil(options.targetWidth || naturalW);

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
    "min-width:0",
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
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const captureH = Math.ceil(clone.scrollHeight || naturalH);
    const captureW = Math.ceil(Math.max(clone.scrollWidth || 0, width));

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

function captureOptionsForFormat(format) {
  if (isTicketFormat(format)) return {};
  return { targetWidth: A4_CAPTURE_WIDTH_PX };
}

/** Añade el canvas al PDF respetando proporción; en A4 pagina si hace falta. */
function addCanvasToPdf(pdf, canvas, { margin, maxW, maxH, paginate }) {
  const imgW = maxW;
  const fullH = (canvas.height * imgW) / canvas.width;

  if (!paginate || fullH <= maxH + 0.05) {
    // Una sola página: nunca deformar. Si no cabe (ticket), reducir ambos lados.
    let w = imgW;
    let h = fullH;
    if (h > maxH) {
      const scale = maxH / h;
      w *= scale;
      h = maxH;
    }
    const x = margin + (maxW - w) / 2;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, margin, w, h);
    return;
  }

  // A4 multipágina: rebanar el canvas en franjas de altura maxH (mm).
  const pxPerMm = canvas.width / imgW;
  const pageHeightPx = maxH * pxPerMm;
  let yPx = 0;
  let page = 0;
  while (yPx < canvas.height - 0.5) {
    if (page > 0) pdf.addPage();
    const sliceH = Math.min(pageHeightPx, canvas.height - yPx);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.max(1, Math.ceil(sliceH));
    const ctx = sliceCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      yPx,
      canvas.width,
      sliceH,
      0,
      0,
      canvas.width,
      sliceH,
    );
    const sliceHmm = sliceH / pxPerMm;
    pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, imgW, sliceHmm);
    yPx += sliceH;
    page += 1;
    if (page > 40) break;
  }
}

export async function downloadReceiptAsPng(element, filename = "comprobante.png", format = "a4") {
  const canvas = await captureReceiptElement(element, captureOptionsForFormat(format));
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No se pudo generar la imagen.");
  triggerDownload(blob, filename);
}

/** Copia la vista previa del comprobante como PNG al portapapeles. */
export async function copyReceiptAsPng(element, format = "a4") {
  if (!navigator.clipboard || typeof window.ClipboardItem === "undefined") {
    throw new Error("Tu navegador no permite copiar imágenes al portapapeles.");
  }
  const canvas = await captureReceiptElement(element, captureOptionsForFormat(format));
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No se pudo generar la imagen.");
  await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
}

export async function downloadReceiptAsPdf(element, format = "a4", filename = "comprobante.pdf") {
  const isTicket = isTicketFormat(format);
  const canvas = await captureReceiptElement(element, captureOptionsForFormat(format));
  const ticketSize = getTicketPdfPageSize(format);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: isTicket ? ticketSize : "a4",
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = isTicket ? 2 : 6;
  const maxW = pageWidth - margin * 2;
  const maxH = pageHeight - margin * 2;

  addCanvasToPdf(pdf, canvas, {
    margin,
    maxW,
    maxH,
    paginate: !isTicket,
  });
  pdf.save(filename);
}
