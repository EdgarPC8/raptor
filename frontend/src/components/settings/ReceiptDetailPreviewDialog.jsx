/**
 * Modal de vista previa: plantilla de prueba del detalle de factura / nota de venta.
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
  RECEIPT_PREVIEW_SAMPLE_ITEMS,
} from "../../utils/receiptDetailFormat.js";
import { getReceiptLayout, normalizePrintFormat } from "../../utils/receiptFormats.js";
import { printSaleReceipt } from "../../utils/saleReceiptUtils.js";
import {
  downloadReceiptAsPng,
  downloadReceiptAsPdf,
} from "../../utils/saleReceiptExport.js";

function buildPreviewReceipt({ documentType, businessName }) {
  const items = RECEIPT_PREVIEW_SAMPLE_ITEMS.map((it) => ({
    ...it,
    code: it.barcode || "",
    discount: 0,
    subtotal: it.lineTotal,
    iva: 0,
    taxRate: documentType === "factura" ? 15 : 0,
  }));
  const subtotal = items.reduce((a, it) => a + Number(it.lineTotal || 0), 0);
  const iva = documentType === "factura" ? Number((subtotal * 0.15).toFixed(2)) : 0;
  const isFactura = documentType === "factura";
  return {
    id: isFactura ? "001-001-000000123" : "NV-DEMO-001",
    documentType,
    documentTypeLabel: isFactura ? "Factura" : "Nota de venta",
    documentTitle: isFactura ? "FACTURA" : "NOTA DE VENTA",
    businessName: businessName || "Mi negocio",
    businessDescription: "Plantilla de prueba — configuración del sistema",
    date: new Date().toLocaleString("es-EC"),
    customerName: isFactura ? "Cliente Demo S.A." : "Consumidor Final",
    customerCedula: isFactura ? "1790000000001" : "",
    customerAddress: "Av. Ejemplo 123",
    customerEmail: "demo@correo.com",
    items,
    subtotal,
    iva,
    total: Number((subtotal + iva).toFixed(2)),
    paymentMethod: "Efectivo",
    fiscal: isFactura
      ? {
          legalName: businessName || "Mi negocio",
          tradeName: "Plantilla de prueba",
          ruc: "1790000000001",
          invoiceNumber: "001-001-000000123",
          environmentLabel: "Pruebas",
          authorizationNumber: "1234567890",
          accessKey: "1234567890123456789012345678901234567890123456789",
          matrixAddress: "Av. Ejemplo 123",
          accountingRequired: false,
          fromSettingsPreview: true,
        }
      : undefined,
  };
}

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
  const previewRef = useRef(null);

  useEffect(() => {
    if (open) {
      setFormat(normalizePrintFormat(cfg.defaultPrintFormat));
    }
  }, [open, cfg.defaultPrintFormat]);

  const receipt = useMemo(
    () =>
      buildPreviewReceipt({
        documentType: docType,
        businessName,
      }),
    [docType, businessName],
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
          Plantilla de prueba — detalle del comprobante
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
            Productos de prueba con mayúsculas/minúsculas mezcladas para ver el efecto de la
            configuración. No es un comprobante real. El formato elegido queda como
            predeterminado al guardar Configuración.
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
