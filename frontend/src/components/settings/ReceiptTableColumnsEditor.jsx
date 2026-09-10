/**
 * Editor de columnas del comprobante: orden, visibilidad, anchos + preview de prueba.
 */
import { useMemo, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Slider,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import PrintFormatToggle from "../saleReceipt/PrintFormatToggle.jsx";
import SaleReceiptContent from "../saleReceipt/SaleReceiptContent.jsx";
import {
  DEFAULT_RECEIPT_DETAIL_SETTINGS,
  normalizeReceiptDetailSettings,
  RECEIPT_PREVIEW_SAMPLE_ITEMS,
} from "../../utils/receiptDetailFormat.js";
import { getReceiptLayout, normalizePrintFormat } from "../../utils/receiptFormats.js";
import {
  DEFAULT_RECEIPT_TABLE_LAYOUTS,
  normalizeReceiptTableColumns,
  patchReceiptTableLayout,
  RECEIPT_COLUMN_META,
  receiptTableLayoutKey,
} from "../../utils/receiptTableColumns.js";

function buildPreviewReceipt({ documentType, businessName }) {
  const items = RECEIPT_PREVIEW_SAMPLE_ITEMS.map((it) => ({
    ...it,
    code: it.code || it.barcode || "",
    discount: it.discount ?? 0,
    subtotal: it.subtotal ?? it.lineTotal,
    iva: 0,
    taxRate: documentType === "factura" ? 15 : 0,
  }));
  const subtotal = items.reduce(
    (a, it) => a + Number(it.subtotal ?? it.lineTotal ?? 0),
    0,
  );
  const iva = documentType === "factura" ? Number((subtotal * 0.15).toFixed(2)) : 0;
  const isFactura = documentType === "factura";
  return {
    id: isFactura ? "001-001-000000123" : "NV-DEMO-001",
    documentType,
    documentTypeLabel: isFactura ? "Factura" : "Nota de venta",
    documentTitle: isFactura ? "FACTURA" : "NOTA DE VENTA",
    businessName: businessName || "Mi negocio",
    businessDescription: "Comprobante de prueba — configuración",
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
          environmentLabel: "PRUEBAS",
          authorizationNumber: "1234567890",
          accessKey: "1234567890123456789012345678901234567890123456789",
          matrixAddress: "Av. Ejemplo 123",
          accountingRequired: false,
          fromSettingsPreview: true,
        }
      : undefined,
  };
}

export default function ReceiptTableColumnsEditor({
  settings,
  onChange,
  businessName = "Mi negocio",
}) {
  const cfg = useMemo(
    () => normalizeReceiptDetailSettings(settings || DEFAULT_RECEIPT_DETAIL_SETTINGS),
    [settings],
  );
  const [docType, setDocType] = useState("factura");
  const [format, setFormat] = useState(() =>
    normalizePrintFormat(cfg.defaultPrintFormat),
  );

  const layoutKey = receiptTableLayoutKey(docType, format);
  const cols = useMemo(
    () =>
      normalizeReceiptTableColumns(cfg.tableLayouts?.[layoutKey], layoutKey),
    [cfg.tableLayouts, layoutKey],
  );

  const visibleSum = cols
    .filter((c) => c.visible)
    .reduce((a, c) => a + Number(c.widthPct || 0), 0);

  const previewReceipt = useMemo(
    () => buildPreviewReceipt({ documentType: docType, businessName }),
    [docType, businessName],
  );
  const layout = getReceiptLayout(format);
  const previewWidth =
    docType === "factura" && !layout.isTicket
      ? Math.min(layout.maxWidth || 794, 720)
      : layout.isTicket
        ? layout.previewWidth
        : "100%";

  const commitCols = (nextCols) => {
    const nextLayouts = patchReceiptTableLayout(cfg.tableLayouts, layoutKey, nextCols);
    onChange({
      ...cfg,
      tableLayouts: nextLayouts,
    });
  };

  const moveCol = (index, dir) => {
    const next = [...cols];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    commitCols(next);
  };

  const toggleVisible = (id, visible) => {
    commitCols(
      cols.map((c) =>
        c.id === id
          ? {
              ...c,
              visible: RECEIPT_COLUMN_META[id]?.required ? true : visible,
            }
          : c,
      ),
    );
  };

  const setWidth = (id, widthPct) => {
    commitCols(
      cols.map((c) => (c.id === id ? { ...c, widthPct: Math.round(widthPct) } : c)),
    );
  };

  const resetLayout = () => {
    commitCols(DEFAULT_RECEIPT_TABLE_LAYOUTS[layoutKey].map((c) => ({ ...c })));
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={docType}
          onChange={(_, v) => v && setDocType(v)}
        >
          <ToggleButton value="factura" sx={{ textTransform: "none", px: 1.5 }}>
            Factura
          </ToggleButton>
          <ToggleButton value="nota_venta" sx={{ textTransform: "none", px: 1.5 }}>
            Nota de venta
          </ToggleButton>
        </ToggleButtonGroup>
        <PrintFormatToggle value={format} onChange={setFormat} />
      </Stack>

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Configurás <strong>{layoutKey.replace(/_/g, " · ")}</strong>: qué columnas van, en qué
        orden y el ancho (%). La vista de abajo usa productos de prueba (códigos largos incluidos).
        Guardá la configuración del sistema para aplicarlo en caja e impresión.
      </Typography>

      <Stack spacing={1} sx={{ mb: 1.5 }}>
        {cols.map((col, idx) => {
          const meta = RECEIPT_COLUMN_META[col.id];
          return (
            <Box
              key={col.id}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "auto 1fr auto auto" },
                gap: 1,
                alignItems: "center",
                p: 1,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                opacity: col.visible ? 1 : 0.55,
              }}
            >
              <Stack direction="row" spacing={0.25} alignItems="center">
                <IconButton
                  size="small"
                  onClick={() => moveCol(idx, -1)}
                  disabled={idx === 0}
                  aria-label="Subir"
                >
                  <ArrowUpwardIcon fontSize="inherit" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => moveCol(idx, 1)}
                  disabled={idx === cols.length - 1}
                  aria-label="Bajar"
                >
                  <ArrowDownwardIcon fontSize="inherit" />
                </IconButton>
                <Switch
                  size="small"
                  checked={Boolean(col.visible)}
                  disabled={Boolean(meta?.required)}
                  onChange={(e) => toggleVisible(col.id, e.target.checked)}
                />
              </Stack>
              <Box>
                <Typography variant="body2" fontWeight={700}>
                  {meta?.label || col.id}
                  {meta?.required ? " · obligatoria" : ""}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {col.visible ? `Ancho ${col.widthPct}%` : "Oculta en este formato"}
                </Typography>
              </Box>
              <Box sx={{ minWidth: { sm: 160 }, px: { sm: 1 } }}>
                <Slider
                  size="small"
                  min={4}
                  max={60}
                  step={1}
                  disabled={!col.visible}
                  value={col.widthPct}
                  onChange={(_, v) => setWidth(col.id, v)}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `${v}%`}
                />
              </Box>
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{ textAlign: "right", minWidth: 40 }}
              >
                {col.visible ? `${col.widthPct}%` : "—"}
              </Typography>
            </Box>
          );
        })}
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
      >
        <Typography
          variant="caption"
          color={Math.abs(visibleSum - 100) > 1 ? "warning.main" : "text.secondary"}
          fontWeight={700}
        >
          Anchos visibles: {visibleSum}% (se ajustan solos al guardar/normalizar)
        </Typography>
        <Button
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={resetLayout}
          sx={{ textTransform: "none" }}
        >
          Restablecer este formato
        </Button>
      </Stack>

      <Box
        sx={{
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 1.5,
          p: 1.5,
          bgcolor: "action.hover",
          overflow: "auto",
        }}
      >
        <Typography variant="caption" fontWeight={800} display="block" sx={{ mb: 1 }}>
          Vista previa · comprobante de prueba
        </Typography>
        <Box
          sx={{
            mx: "auto",
            width: previewWidth,
            maxWidth: "100%",
            bgcolor: "#fff",
            boxShadow: 1,
          }}
        >
          <SaleReceiptContent
            receipt={previewReceipt}
            format={format}
            detailSettings={cfg}
            showNotes={false}
          />
        </Box>
      </Box>
    </Box>
  );
}
