/**
 * Documento lista de productos a pedir al proveedor.
 * Copiar / PNG / PDF (mismos formatos A4 · 80 mm · 55 mm).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import ImageIcon from "@mui/icons-material/Image";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import PrintFormatToggle from "../../../../components/saleReceipt/PrintFormatToggle.jsx";
import PrintThermalHint from "../../../../components/saleReceipt/PrintThermalHint.jsx";
import {
  copyReceiptAsPng,
  downloadReceiptAsPdf,
  downloadReceiptAsPng,
} from "../../../../utils/saleReceiptExport.js";
import { printHtmlDocument } from "../../../../utils/printHtmlDocument.js";
import {
  getReceiptLayout,
  normalizePrintFormat,
} from "../../../../utils/receiptFormats.js";
import { useAppSettings } from "../../../../context/AppSettingsContext.jsx";

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function qtyLabel(n) {
  const q = Number(n);
  if (!Number.isFinite(q)) return "—";
  return Number.isInteger(q) ? String(q) : String(Number(q.toFixed(3)));
}

function buildListHtml({ supplierName, businessName, dateLabel, lines, notes, format }) {
  const layout = getReceiptLayout(format);
  const isTicket = layout.isTicket;
  const p = layout.print;
  const titleFs = isTicket ? p.title : 18;
  const metaFs = isTicket ? p.meta : 13;
  const cellFs = isTicket ? p.num : 13;
  const pad = isTicket ? "2px 1px" : "4px 6px";
  const rows = lines
    .map(
      (line, idx) => `
      <tr>
        <td style="padding:${pad};text-align:center;font-weight:700;font-size:${cellFs}px;vertical-align:top;width:28px">${idx + 1}</td>
        <td style="padding:${pad};font-weight:700;font-size:${cellFs}px;vertical-align:top;word-break:break-word">${escapeHtml(line.name)}</td>
        <td style="padding:${pad};text-align:center;font-weight:800;font-size:${cellFs}px;vertical-align:top;white-space:nowrap">${escapeHtml(qtyLabel(line.quantity))}${line.unitLabel ? ` <span style="font-weight:600">${escapeHtml(line.unitLabel)}</span>` : ""}</td>
      </tr>`,
    )
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#000;width:100%">
      <div style="font-weight:900;font-size:${titleFs}px;text-align:center;margin-bottom:4px">LISTA DE PEDIDO</div>
      ${businessName ? `<div style="text-align:center;font-weight:700;font-size:${metaFs}px;margin-bottom:2px">${escapeHtml(businessName)}</div>` : ""}
      <div style="font-size:${metaFs}px;font-weight:600;margin:6px 0 2px"><strong>Proveedor:</strong> ${escapeHtml(supplierName || "—")}</div>
      ${dateLabel ? `<div style="font-size:${metaFs}px;font-weight:600;margin-bottom:6px"><strong>Fecha:</strong> ${escapeHtml(dateLabel)}</div>` : ""}
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;border-top:1.5px solid #000;border-bottom:1.5px solid #000">
        <thead>
          <tr>
            <th style="padding:${pad};text-align:center;font-size:${cellFs}px;border-bottom:1px solid #000;width:28px">#</th>
            <th style="padding:${pad};text-align:left;font-size:${cellFs}px;border-bottom:1px solid #000">Producto</th>
            <th style="padding:${pad};text-align:center;font-size:${cellFs}px;border-bottom:1px solid #000;width:${isTicket ? "28%" : "22%"}">Cant.</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="3" style="padding:8px;text-align:center">Sin productos</td></tr>`}</tbody>
      </table>
      <div style="margin-top:8px;font-weight:800;font-size:${metaFs}px">Total ítems: ${lines.length}</div>
      ${
        notes
          ? `<div style="margin-top:8px;font-size:${metaFs}px;font-weight:600"><strong>Notas:</strong> ${escapeHtml(notes)}</div>`
          : ""
      }
      <div style="margin-top:10px;font-size:${isTicket ? 10 : 11}px;color:#333">Documento de solicitud · cantidades a pedir</div>
    </div>
  `;
}

function ShoppingListPreview({ supplierName, businessName, dateLabel, lines, notes, format }) {
  const layout = getReceiptLayout(format);
  const isTicket = layout.isTicket;

  return (
    <Box
      sx={{
        color: "#000",
        fontFamily: "Arial, Helvetica, sans-serif",
        width: "100%",
        p: isTicket ? 0.75 : 2,
      }}
    >
      <Typography
        sx={{
          fontWeight: 900,
          fontSize: isTicket ? 14 : 18,
          textAlign: "center",
          mb: 0.5,
        }}
      >
        LISTA DE PEDIDO
      </Typography>
      {businessName ? (
        <Typography sx={{ textAlign: "center", fontWeight: 700, fontSize: isTicket ? 11 : 13, mb: 0.5 }}>
          {businessName}
        </Typography>
      ) : null}
      <Typography sx={{ fontWeight: 600, fontSize: isTicket ? 11 : 13, mb: 0.25 }}>
        <strong>Proveedor:</strong> {supplierName || "—"}
      </Typography>
      {dateLabel ? (
        <Typography sx={{ fontWeight: 600, fontSize: isTicket ? 11 : 13, mb: 1 }}>
          <strong>Fecha:</strong> {dateLabel}
        </Typography>
      ) : null}
      <Box
        component="table"
        sx={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          borderTop: "1.5px solid #000",
          borderBottom: "1.5px solid #000",
          "& th, & td": {
            fontSize: isTicket ? 11 : 13,
            py: isTicket ? 0.25 : 0.5,
            px: isTicket ? 0.25 : 0.75,
            verticalAlign: "top",
          },
          "& th": {
            borderBottom: "1px solid #000",
            fontWeight: 800,
            textAlign: "left",
          },
        }}
      >
        <thead>
          <tr>
            <th style={{ width: 28, textAlign: "center" }}>#</th>
            <th>Producto</th>
            <th style={{ width: isTicket ? "28%" : "22%", textAlign: "center" }}>Cant.</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ textAlign: "center", padding: 8 }}>
                Sin productos
              </td>
            </tr>
          ) : (
            lines.map((line, idx) => (
              <tr key={line.lineId || `${line.productId}-${idx}`}>
                <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                <td style={{ fontWeight: 700, wordBreak: "break-word" }}>{line.name || "—"}</td>
                <td style={{ textAlign: "center", fontWeight: 800, whiteSpace: "nowrap" }}>
                  {qtyLabel(line.quantity)}
                  {line.unitLabel ? (
                    <Box component="span" sx={{ fontWeight: 600, ml: 0.35 }}>
                      {line.unitLabel}
                    </Box>
                  ) : null}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Box>
      <Typography sx={{ mt: 1, fontWeight: 800, fontSize: isTicket ? 11 : 13 }}>
        Total ítems: {lines.length}
      </Typography>
      {notes ? (
        <Typography sx={{ mt: 1, fontWeight: 600, fontSize: isTicket ? 11 : 13 }}>
          <strong>Notas:</strong> {notes}
        </Typography>
      ) : null}
      <Typography sx={{ mt: 1.25, fontSize: isTicket ? 10 : 11, color: "#333" }}>
        Documento de solicitud · cantidades a pedir
      </Typography>
    </Box>
  );
}

export default function SupplierOrderShoppingListDialog({
  open,
  onClose,
  items = [],
  supplierName = "",
  dateLabel = "",
  notes = "",
  orderId = null,
}) {
  const { activeApp } = useAppSettings();
  const settingsFormat = normalizePrintFormat(
    activeApp?.receiptDetailSettings?.defaultPrintFormat,
  );
  const [format, setFormat] = useState(settingsFormat);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    if (open) {
      setFormat(settingsFormat);
      setCopied(false);
    }
  }, [open, settingsFormat]);

  const lines = useMemo(
    () =>
      (items || [])
        .filter((it) => it && (it.name || it.productId))
        .map((it) => ({
          lineId: it.lineId,
          productId: it.productId,
          name: it.name || it.ERP_inventory_product?.name || "Producto",
          quantity: it.quantity,
          unitLabel: it.unitLabel || getUnitFromProduct(it) || "",
        })),
    [items],
  );

  const layout = getReceiptLayout(format);
  const previewWidth = layout.isTicket ? layout.previewWidth : layout.maxWidth;
  const businessName = activeApp?.alias || activeApp?.name || "";
  const baseFilename = orderId
    ? `lista-pedido-proveedor-${orderId}`
    : `lista-pedido-proveedor`;

  const handlePrint = () => {
    const html = buildListHtml({
      supplierName,
      businessName,
      dateLabel,
      lines,
      notes,
      format,
    });
    printHtmlDocument(html, { format });
  };

  const handleCopy = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      await copyReceiptAsPng(previewRef.current, format);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } finally {
      setExporting(false);
    }
  };

  const handlePng = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      await downloadReceiptAsPng(previewRef.current, `${baseFilename}.png`, format);
    } finally {
      setExporting(false);
    }
  };

  const handlePdf = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      await downloadReceiptAsPdf(previewRef.current, format, `${baseFilename}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          pt: 1.25,
        }}
      >
        <DialogTitle sx={{ p: 0, fontWeight: 700, fontSize: "1.05rem" }}>
          Lista de pedido al proveedor
        </DialogTitle>
        <IconButton aria-label="Cerrar" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Formato
            </Typography>
            <PrintFormatToggle value={format} onChange={setFormat} />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Solo productos y cantidades (para decirle al proveedor qué necesitás). Podés
            copiar, bajar PNG/PDF o imprimir.
          </Typography>
          <PrintThermalHint format={format} />
          <Box
            sx={{
              overflow: "auto",
              maxHeight: "55vh",
              bgcolor: "grey.100",
              p: 2,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Box
              ref={previewRef}
              sx={{
                width: previewWidth,
                maxWidth: "100%",
                minWidth: layout.isTicket ? undefined : 480,
                bgcolor: "#fff",
                flexShrink: 0,
              }}
            >
              <ShoppingListPreview
                supplierName={supplierName}
                businessName={businessName}
                dateLabel={dateLabel}
                lines={lines}
                notes={notes}
                format={format}
              />
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose}>Cerrar</Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          color={copied ? "success" : "primary"}
          startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
          onClick={() => void handleCopy()}
          disabled={!lines.length || exporting}
        >
          {copied ? "¡Copiado!" : "Copiar"}
        </Button>
        <Button
          variant="outlined"
          startIcon={<ImageIcon />}
          onClick={() => void handlePng()}
          disabled={!lines.length || exporting}
        >
          PNG
        </Button>
        <Button
          variant="outlined"
          startIcon={<PictureAsPdfIcon />}
          onClick={() => void handlePdf()}
          disabled={!lines.length || exporting}
        >
          PDF
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          disabled={!lines.length || exporting}
        >
          Imprimir
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function getUnitFromProduct(it) {
  const p = it?.ERP_inventory_product;
  if (!p) return "";
  return (
    p.ERP_inventory_unit?.abbreviation ||
    p.ERP_inventory_unit?.name ||
    p.unitLabel ||
    ""
  );
}
