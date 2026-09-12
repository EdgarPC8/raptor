/**
 * Modal de vista previa: plantilla del detalle de factura / nota de venta.
 * Si hay config SRI (RUC / razón social), usa esos datos; si no, mock de prueba.
 * Mismos formatos de impresión que el resto del sistema (A4 / 80 mm / 55 mm).
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import ImageIcon from "@mui/icons-material/Image";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SaleReceiptContent from "../saleReceipt/SaleReceiptContent.jsx";
import PrintFormatToggle from "../saleReceipt/PrintFormatToggle.jsx";
import PrintThermalHint from "../saleReceipt/PrintThermalHint.jsx";
import {
  DEFAULT_RECEIPT_DETAIL_SETTINGS,
  normalizeReceiptDetailSettings,
  buildReceiptPreview,
} from "../../utils/receiptDetailFormat.js";
import { getReceiptLayout, normalizePrintFormat } from "../../utils/receiptFormats.js";
import { printSaleReceipt } from "../../utils/saleReceiptUtils.js";
import {
  downloadReceiptAsPng,
  downloadReceiptAsPdf,
} from "../../utils/saleReceiptExport.js";
import { fetchSriBillingSettings } from "../../api/sriBillingRequest.js";
import { hasSriPreviewData } from "../../utils/invoiceFiscalUtils.js";

export default function ReceiptDetailPreviewDialog({
  open,
  onClose,
  settings,
  businessName = "Mi negocio",
  onFormatChange,
}) {
  const cfg = useMemo(
    () => normalizeReceiptDetailSettings(settings || DEFAULT_RECEIPT_DETAIL_SETTINGS),
    [settings],
  );
  const [docType, setDocType] = useState("nota_venta");
  const [format, setFormat] = useState(() =>
    normalizePrintFormat(cfg.defaultPrintFormat),
  );
  const [exporting, setExporting] = useState(false);
  const [sriSettings, setSriSettings] = useState(null);
  const previewRef = useRef(null);

  useEffect(() => {
    if (open) {
      setFormat(normalizePrintFormat(cfg.defaultPrintFormat));
    }
  }, [open, cfg.defaultPrintFormat]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    fetchSriBillingSettings()
      .then((data) => {
        if (!cancelled) setSriSettings(data || null);
      })
      .catch(() => {
        if (!cancelled) setSriSettings(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const usingSri = hasSriPreviewData(sriSettings);

  const receipt = useMemo(
    () =>
      buildReceiptPreview({
        documentType: docType,
        businessName,
        sriSettings,
      }),
    [docType, businessName, sriSettings],
  );

  const layout = getReceiptLayout(format);
  const isFactura = docType === "factura";
  const previewWidth =
    isFactura && !layout.isTicket
      ? 820
      : layout.isTicket
        ? layout.previewWidth
        : layout.maxWidth;

  const handleFormat = (next) => {
    const value = normalizePrintFormat(next);
    setFormat(value);
    onFormatChange?.(value);
  };

  const handlePrint = () => {
    if (!receipt) return;
    printSaleReceipt(receipt, format, { showNotes: false, detailSettings: cfg });
  };

  const handleDownloadPng = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      await downloadReceiptAsPng(
        previewRef.current,
        isFactura ? "plantilla-factura.png" : "plantilla-nota-venta.png",
        format,
      );
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      await downloadReceiptAsPdf(
        previewRef.current,
        format,
        isFactura ? "plantilla-factura.pdf" : "plantilla-nota-venta.pdf",
      );
    } finally {
      setExporting(false);
    }
  };

  const hintText = isFactura
    ? usingSri
      ? "Factura con tus datos SRI (RUC, régimen, ambiente). Autorización pendiente hasta emitir. Los productos son de ejemplo."
      : "Sin RUC/razón social en SRI: se muestra plantilla de prueba. Configura Facturación SRI para ver tus datos reales."
    : "Productos de prueba con mayúsculas/minúsculas mezcladas para ver el efecto de la configuración. El formato elegido queda como predeterminado al guardar Configuración.";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={isFactura && !layout.isTicket ? "lg" : "md"}
      scroll="paper"
    >
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
          {isFactura && usingSri
            ? "Vista previa — detalle del comprobante"
            : "Plantilla de prueba — detalle del comprobante"}
        </DialogTitle>
        <IconButton aria-label="Cerrar" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Tipo de documento
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={docType}
              onChange={(_, v) => v && setDocType(v)}
              size="small"
              sx={{ flexWrap: "wrap", gap: 0.5 }}
            >
              <ToggleButton value="nota_venta" sx={{ textTransform: "none" }}>
                Nota de venta
              </ToggleButton>
              <ToggleButton value="factura" sx={{ textTransform: "none" }}>
                Factura
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Formato de impresión
            </Typography>
            <PrintFormatToggle value={format} onChange={handleFormat} />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {hintText}
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
                minWidth: layout.isTicket ? undefined : 640,
                bgcolor: "#fff",
                flexShrink: 0,
              }}
            >
              <SaleReceiptContent
                receipt={receipt}
                format={format}
                showNotes={false}
                detailSettings={cfg}
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
          startIcon={<ImageIcon />}
          onClick={() => void handleDownloadPng()}
          disabled={exporting}
        >
          PNG
        </Button>
        <Button
          variant="outlined"
          startIcon={<PictureAsPdfIcon />}
          onClick={() => void handleDownloadPdf()}
          disabled={exporting}
        >
          PDF
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          disabled={exporting}
        >
          Imprimir
        </Button>
      </DialogActions>
    </Dialog>
  );
}
