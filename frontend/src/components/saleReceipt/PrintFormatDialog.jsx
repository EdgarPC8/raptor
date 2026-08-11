import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ImageIcon from "@mui/icons-material/Image";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import SaleReceiptContent from "./SaleReceiptContent.jsx";
import {
  DOCUMENT_TYPE_OPTIONS,
  applyReceiptDocumentType,
  printSaleReceipt,
} from "../../utils/saleReceiptUtils.js";
import {
  copyReceiptAsPng,
  downloadReceiptAsPdf,
  downloadReceiptAsPng,
} from "../../utils/saleReceiptExport.js";
import { getReceiptLayout } from "../../utils/receiptFormats.js";
import { enrichReceiptWithFiscal } from "../../utils/invoiceFiscalUtils.js";
import { fetchSriBillingSettings } from "../../api/sriBillingRequest.js";
import { fetchSriInvoices } from "../../api/sriInvoicesRequest.js";
import { useAppSettings } from "../../context/AppSettingsContext.jsx";

/** Modal: formato de impresión, tipo de documento y vista previa. */
export default function PrintFormatDialog({
  open,
  onClose,
  receipt,
  initialFormat = "a4",
  sriInvoice: sriInvoiceProp = null,
}) {
  const { activeApp } = useAppSettings();
  const [format, setFormat] = useState(initialFormat);
  const [documentType, setDocumentType] = useState("documento");
  const [showNotes, setShowNotes] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sriSettings, setSriSettings] = useState(null);
  const [sriInvoice, setSriInvoice] = useState(sriInvoiceProp);
  const previewRef = useRef(null);
  const layout = getReceiptLayout(format);
  const previewWidth =
    documentType === "factura" && !layout.isTicket
      ? 820
      : layout.isTicket
        ? layout.previewWidth
        : layout.maxWidth;

  useEffect(() => {
    if (open) {
      setFormat(initialFormat);
      setDocumentType(receipt?.documentType || "documento");
      setShowNotes(true);
      setCopied(false);
      setSriInvoice(sriInvoiceProp || null);
    }
  }, [open, initialFormat, receipt?.documentType, sriInvoiceProp]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const settings = await fetchSriBillingSettings();
        if (!cancelled) setSriSettings(settings);
      } catch {
        if (!cancelled) setSriSettings(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !receipt?.id || sriInvoiceProp) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchSriInvoices(200, "01");
        const match = (list || []).find(
          (inv) =>
            inv.orderId != null && Number(inv.orderId) === Number(receipt.id),
        );
        if (!cancelled) setSriInvoice(match || null);
      } catch {
        if (!cancelled) setSriInvoice(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, receipt?.id, sriInvoiceProp]);

  const previewReceipt = useMemo(() => {
    const typed = applyReceiptDocumentType(receipt, documentType);
    if (!typed) return null;
    if (documentType !== "factura") return typed;
    return enrichReceiptWithFiscal(typed, sriSettings, sriInvoice, {
      logoUrl: typed.logoUrl || activeApp?.logoUrl || "",
    });
  }, [receipt, documentType, sriSettings, sriInvoice, activeApp?.logoUrl]);

  const baseFilename =
    documentType === "factura"
      ? `factura-${previewReceipt?.fiscal?.invoiceNumber || receipt?.id || "doc"}`
      : `comprobante-${receipt?.id || "pedido"}`;

  const handlePrint = () => {
    if (!previewReceipt) return;
    printSaleReceipt(previewReceipt, format, { showNotes });
  };

  const hasNotes = Boolean(previewReceipt?.notes);
  const isFactura = documentType === "factura";

  const handleDownloadPng = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      await downloadReceiptAsPng(previewRef.current, `${baseFilename}.png`, format);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyPng = async () => {
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

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      await downloadReceiptAsPdf(previewRef.current, format, `${baseFilename}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={isFactura ? "lg" : "md"}>
      <DialogTitle>{isFactura ? "Factura (RIDE)" : "Comprobante / factura"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Tipo de documento (solo para esta impresión o descarga)
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={documentType}
              onChange={(_, v) => v && setDocumentType(v)}
              size="small"
              sx={{ flexWrap: "wrap", gap: 0.5 }}
            >
              {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value} sx={{ textTransform: "none" }}>
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Formato
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={format}
              onChange={(_, v) => v && setFormat(v)}
              size="small"
              sx={{ flexWrap: "wrap", gap: 0.5 }}
            >
              <ToggleButton value="a4">
                <DescriptionIcon fontSize="small" sx={{ mr: 0.5 }} />
                A4
              </ToggleButton>
              <ToggleButton value="ticket80">
                <ReceiptLongIcon fontSize="small" sx={{ mr: 0.5 }} />
                Ticket 80 mm
              </ToggleButton>
              <ToggleButton value="ticket55">
                <ReceiptLongIcon fontSize="small" sx={{ mr: 0.5 }} />
                Ticket 55 mm
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {isFactura ? (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Estructura tipo factura electrónica (RIDE): A4 como hoja formal, 80/55 mm como ticket.
              {sriInvoice?.sequential
                ? ` Nº ${String(sriInvoice.establishmentCode || "").padStart(3, "0")}-${String(sriInvoice.emissionPointCode || "").padStart(3, "0")}-${String(sriInvoice.sequential).padStart(9, "0")} (factura SRI de esta venta).`
                : " Sin factura SRI vinculada a esta venta: el Nº queda vacío hasta emitir/autorizar."}
            </Alert>
          ) : (
            <FormControlLabel
              control={
                <Checkbox
                  checked={showNotes}
                  onChange={(e) => setShowNotes(e.target.checked)}
                  disabled={!hasNotes}
                />
              }
              label={
                hasNotes
                  ? "Mostrar descripción / notas del pedido"
                  : "Mostrar descripción / notas (este pedido no tiene)"
              }
            />
          )}

          <Typography variant="subtitle2" fontWeight={700}>
            Vista previa
          </Typography>
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
                minWidth: layout.isTicket ? undefined : 640,
                bgcolor: "#fff",
                flexShrink: 0,
              }}
            >
              <SaleReceiptContent
                receipt={previewReceipt}
                format={format}
                showNotes={!isFactura && showNotes}
              />
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose}>Cerrar</Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          color={copied ? "success" : "primary"}
          startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
          onClick={handleCopyPng}
          disabled={!previewReceipt || exporting}
        >
          {copied ? "¡Copiado!" : "Copiar"}
        </Button>
        <Button
          variant="outlined"
          startIcon={<ImageIcon />}
          onClick={handleDownloadPng}
          disabled={!previewReceipt || exporting}
        >
          PNG
        </Button>
        <Button
          variant="outlined"
          startIcon={<PictureAsPdfIcon />}
          onClick={handleDownloadPdf}
          disabled={!previewReceipt || exporting}
        >
          PDF
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          disabled={!previewReceipt || exporting}
        >
          Imprimir
        </Button>
      </DialogActions>
    </Dialog>
  );
}
