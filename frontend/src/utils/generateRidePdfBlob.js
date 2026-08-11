/**
 * Genera el mismo PDF RIDE que el botón Descargar (html2canvas + jsPDF),
 * montando la vista fuera de pantalla.
 */
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import SaleReceiptContent from "../components/saleReceipt/SaleReceiptContent.jsx";
import { receiptElementToPdfBlob } from "./saleReceiptExport.js";

const captureTheme = createTheme({
  typography: { fontFamily: "Arial, Helvetica, sans-serif" },
});

function waitMs(ms) {
  return new Promise((r) => window.setTimeout(r, ms));
}

/**
 * @param {object} receipt - comprobante ya enriquecido con fiscal (enrichReceiptWithFiscal)
 * @param {string} [format]
 * @returns {Promise<Blob>}
 */
export async function generateRidePdfBlob(receipt, format = "a4") {
  if (!receipt) throw new Error("Sin comprobante para PDF RIDE");

  const host = document.createElement("div");
  host.setAttribute("data-ride-pdf-host", "1");
  host.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    "z-index:-1",
    "width:820px",
    "background:#fff",
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    await new Promise((resolve) => {
      root.render(
        createElement(
          ThemeProvider,
          { theme: captureTheme },
          createElement(
            "div",
            {
              ref: (el) => {
                if (el) resolve(el);
              },
            },
            createElement(SaleReceiptContent, { receipt, format, showNotes: false }),
          ),
        ),
      );
    });

    // Esperar paint de filas / barcode / logo
    await waitMs(450);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const target = host.querySelector("[data-ride-root]") || host.firstElementChild;
    if (!target) throw new Error("No se pudo renderizar el RIDE");
    return await receiptElementToPdfBlob(target, format);
  } finally {
    try {
      root.unmount();
    } catch {
      /* ok */
    }
    host.remove();
  }
}
