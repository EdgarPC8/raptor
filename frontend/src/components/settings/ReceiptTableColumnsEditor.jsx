/**
 * Editor de columnas del comprobante: config compacta a la izquierda, preview a la derecha.
 * El tamaño (A4 / 80 / 55) viene del formato predeterminado de Impresión (un solo selector).
 */
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  MenuItem,
  Slider,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaleReceiptContent from "../saleReceipt/SaleReceiptContent.jsx";
import {
  DEFAULT_RECEIPT_DETAIL_SETTINGS,
  normalizeReceiptDetailSettings,
  buildReceiptPreview,
  PRODUCT_NAME_CASE_OPTIONS,
} from "../../utils/receiptDetailFormat.js";
import { getReceiptLayout, normalizePrintFormat } from "../../utils/receiptFormats.js";
import {
  DEFAULT_RECEIPT_TABLE_LAYOUTS,
  normalizeReceiptTableColumns,
  patchReceiptTableLayout,
  RECEIPT_COLUMN_META,
  receiptTableLayoutKey,
} from "../../utils/receiptTableColumns.js";
import { fetchSriBillingSettings } from "../../api/sriBillingRequest.js";
import { hasSriPreviewData } from "../../utils/invoiceFiscalUtils.js";

const FORMAT_LABEL = {
  a4: "A4",
  ticket80: "80 mm",
  ticket55: "55 mm",
};

const DOC_LABEL = {
  factura: "Factura",
  nota_venta: "Nota",
};

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
  const [sriSettings, setSriSettings] = useState(null);

  const format = normalizePrintFormat(cfg.defaultPrintFormat);

  useEffect(() => {
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
  }, []);

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
    () =>
      buildReceiptPreview({
        documentType: docType,
        businessName,
        sriSettings,
      }),
    [docType, businessName, sriSettings],
  );
  const usingSri = hasSriPreviewData(sriSettings);
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

  const toggleSetting = (key, checked) => {
    onChange({
      ...cfg,
      [key]: checked,
    });
  };

  const patchSetting = (key, value) => {
    onChange({
      ...cfg,
      [key]: value,
    });
  };

  const switchSx = {
    m: 0,
    "& .MuiSwitch-switchBase": { p: 0.5 },
    "& .MuiSwitch-thumb": { width: 12, height: 12 },
    width: 34,
    height: 20,
  };

  const checkLabelSx = {
    m: 0,
    ml: 0,
    mr: 0,
    width: "100%",
    justifyContent: "space-between",
    gap: 0.5,
    "& .MuiFormControlLabel-label": {
      fontSize: "0.72rem",
      fontWeight: 600,
      lineHeight: 1.2,
    },
  };

  const isDefaultOn = (key) =>
    !(key === "showLineNumber" || key === "showBarcode" || key === "showUnit");

  const editingLabel = `${DOC_LABEL[docType] || docType} · ${FORMAT_LABEL[format] || format}`;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(200px, 1fr) minmax(0, 3fr)" },
        gap: 1.5,
        alignItems: "start",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={docType}
          onChange={(_, v) => v && setDocType(v)}
          sx={{
            mb: 0.75,
            "& .MuiToggleButton-root": {
              py: 0.25,
              px: 1,
              fontSize: "0.75rem",
              lineHeight: 1.2,
            },
          }}
        >
          <ToggleButton value="factura" sx={{ textTransform: "none" }}>
            Factura
          </ToggleButton>
          <ToggleButton value="nota_venta" sx={{ textTransform: "none" }}>
            Nota
          </ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="caption" fontWeight={800} display="block" sx={{ mb: 0.75 }}>
          {editingLabel}
          <Box component="span" sx={{ fontWeight: 500, color: "text.secondary" }}>
            {" "}
            · tamaño arriba en Impresión
          </Box>
        </Typography>

        <Stack spacing={0.5} sx={{ mb: 0.75 }}>
          {cols.map((col, idx) => {
            const meta = RECEIPT_COLUMN_META[col.id];
            return (
              <Box
                key={col.id}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.15,
                  px: 0.75,
                  py: 0.4,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 0.75,
                  opacity: col.visible ? 1 : 0.5,
                }}
              >
                <Stack direction="row" spacing={0.15} alignItems="center">
                  <IconButton
                    size="small"
                    onClick={() => moveCol(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Subir"
                    sx={{ p: 0.25 }}
                  >
                    <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => moveCol(idx, 1)}
                    disabled={idx === cols.length - 1}
                    aria-label="Bajar"
                    sx={{ p: 0.25 }}
                  >
                    <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <Switch
                    size="small"
                    checked={Boolean(col.visible)}
                    disabled={Boolean(meta?.required)}
                    onChange={(e) => toggleVisible(col.id, e.target.checked)}
                    sx={{
                      m: 0,
                      "& .MuiSwitch-switchBase": { p: 0.5 },
                      "& .MuiSwitch-thumb": { width: 12, height: 12 },
                      width: 34,
                      height: 20,
                    }}
                  />
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}
                    noWrap
                    title={meta?.label || col.id}
                  >
                    {meta?.label || col.id}
                    {meta?.required ? " *" : ""}
                  </Typography>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{ minWidth: 28, textAlign: "right", opacity: col.visible ? 1 : 0.4 }}
                  >
                    {col.visible ? `${col.widthPct}%` : "—"}
                  </Typography>
                </Stack>
                {col.visible ? (
                  <Slider
                    size="small"
                    min={4}
                    max={60}
                    step={1}
                    value={col.widthPct}
                    onChange={(_, v) => setWidth(col.id, v)}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `${v}%`}
                    sx={{
                      mx: 0.25,
                      py: 0,
                      height: 4,
                      "& .MuiSlider-thumb": { width: 12, height: 12 },
                    }}
                  />
                ) : null}
              </Box>
            );
          })}
        </Stack>

        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.25 }}
        >
          <Typography
            variant="caption"
            color={Math.abs(visibleSum - 100) > 1 ? "warning.main" : "text.secondary"}
            fontWeight={700}
            sx={{ fontSize: "0.7rem" }}
          >
            Σ {visibleSum}%
          </Typography>
          <Button
            size="small"
            startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
            onClick={resetLayout}
            sx={{ textTransform: "none", py: 0.25, px: 0.75, fontSize: "0.7rem", minHeight: 0 }}
          >
            Restablecer
          </Button>
        </Stack>

        <Typography
          variant="caption"
          fontWeight={800}
          display="block"
          sx={{ mb: 0.5, fontSize: "0.7rem", letterSpacing: 0.3 }}
        >
          Datos fiscales (RIDE)
        </Typography>
        <Stack spacing={0.25} data-tour="config-receipt-fiscal" sx={{ mb: 1 }}>
          {[
            ["showTaxRegime", "Régimen (RIMPE)"],
            ["showAccountingRequired", "Obligado contabilidad"],
            ["showSpecialTaxpayer", "Contrib. especial"],
          ].map(([key, label]) => (
            <FormControlLabel
              key={key}
              sx={checkLabelSx}
              labelPlacement="start"
              control={
                <Switch
                  size="small"
                  checked={cfg[key] !== false}
                  onChange={(e) => toggleSetting(key, e.target.checked)}
                  sx={switchSx}
                />
              }
              label={label}
            />
          ))}
        </Stack>

        <Typography
          variant="caption"
          fontWeight={800}
          display="block"
          sx={{ mb: 0.5, fontSize: "0.7rem", letterSpacing: 0.3 }}
          data-tour="config-receipt-detail"
        >
          Texto del detalle
        </Typography>
        <TextField
          select
          size="small"
          fullWidth
          label="Mayúsculas"
          value={cfg.productNameCase || "as_stored"}
          onChange={(e) => patchSetting("productNameCase", e.target.value)}
          sx={{ mb: 0.75, "& .MuiInputBase-root": { fontSize: "0.75rem" } }}
        >
          {PRODUCT_NAME_CASE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: "0.75rem" }}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          fullWidth
          type="number"
          label="Límite caracteres"
          value={cfg.maxNameLength ?? 0}
          onChange={(e) => patchSetting("maxNameLength", Number(e.target.value) || 0)}
          inputProps={{ min: 0, max: 200 }}
          helperText="0 = sin límite"
          FormHelperTextProps={{ sx: { fontSize: "0.65rem", m: 0 } }}
          sx={{ mb: 0.75, "& .MuiInputBase-root": { fontSize: "0.75rem" } }}
        />
        <Stack spacing={0.25}>
          {[
            ["showLineNumber", "Nº de línea"],
            ["showBarcode", "Código / barras"],
            ["showUnit", "Unidad"],
            ["trimSpaces", "Recortar espacios"],
            ["collapseSpaces", "Colapsar espacios"],
            ["applyToFactura", "Aplicar a factura"],
            ["applyToNotaVenta", "Aplicar a nota"],
          ].map(([key, label]) => {
            const checked = isDefaultOn(key) ? cfg[key] !== false : Boolean(cfg[key]);
            return (
              <FormControlLabel
                key={key}
                sx={checkLabelSx}
                labelPlacement="start"
                control={
                  <Switch
                    size="small"
                    checked={checked}
                    onChange={(e) => toggleSetting(key, e.target.checked)}
                    sx={switchSx}
                  />
                }
                label={label}
              />
            );
          })}
        </Stack>
      </Box>

      <Box
        sx={{
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 1.5,
          p: 1,
          bgcolor: "action.hover",
          overflow: "visible",
        }}
      >
        <Typography variant="caption" fontWeight={800} display="block" sx={{ mb: 0.75 }}>
          {docType === "factura" && usingSri
            ? `Vista previa · ${editingLabel} · SRI`
            : `Vista previa · ${editingLabel}`}
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
