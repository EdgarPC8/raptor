/**
 * Modal de vista previa: plantilla de prueba del detalle de factura / nota de venta.
 */
import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaleReceiptContent from "../saleReceipt/SaleReceiptContent.jsx";
import {
  DEFAULT_RECEIPT_DETAIL_SETTINGS,
  normalizeReceiptDetailSettings,
  RECEIPT_PREVIEW_SAMPLE_ITEMS,
} from "../../utils/receiptDetailFormat.js";

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
}) {
  const [docType, setDocType] = useState("nota_venta");
  const cfg = useMemo(
    () => normalizeReceiptDetailSettings(settings || DEFAULT_RECEIPT_DETAIL_SETTINGS),
    [settings],
  );
  const receipt = useMemo(
    () =>
      buildPreviewReceipt({
        documentType: docType,
        businessName,
      }),
    [docType, businessName],
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
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
          <TextField
            select
            size="small"
            label="Tipo de documento"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            sx={{ maxWidth: 280 }}
          >
            <MenuItem value="nota_venta">Nota de venta</MenuItem>
            <MenuItem value="factura">Factura</MenuItem>
          </TextField>
          <Typography variant="caption" color="text.secondary">
            Productos de prueba con mayúsculas/minúsculas mezcladas para ver el efecto de la
            configuración. No es un comprobante real.
          </Typography>
          <Box sx={{ bgcolor: "action.hover", p: 1, borderRadius: 1, overflow: "auto" }}>
            <SaleReceiptContent
              receipt={receipt}
              format="a4"
              showNotes={false}
              detailSettings={cfg}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button onClick={onClose} variant="contained">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
