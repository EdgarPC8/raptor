import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Tooltip,
  Chip,
  Stack,
  TablePagination,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ReportGmailerrorredIcon from "@mui/icons-material/ReportGmailerrorred";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import TableRowsIcon from "@mui/icons-material/TableRows";
import { money } from "../collections/helpers.js";
import { patchProductStockRequest } from "../../../../api/inventoryControlRequest.js";
import { useAuth } from "../../../../context/AuthContext.jsx";
import { useAppSettings } from "../../../../context/AppSettingsContext.jsx";
import ChartBlockHeader from "../../../../components/Charts/ChartBlockHeader";
import StockGauge, { StockGaugeSkeleton, classifyStockLevel } from "./StockGauge.jsx";
import { dashboardTwinPanelSx, DASHBOARD_TWIN_PANEL_BODY_HEIGHT } from "./dashboardTwinPanelLayout.js";

const STOCK_VIEWS = {
  out: {
    id: "out",
    label: "Agotados",
    icon: Inventory2Icon,
    color: "error",
    chipSx: undefined,
    empty: "No hay productos agotados.",
    listKey: "agotados",
  },
  critical: {
    id: "critical",
    label: "≤ mínimo",
    icon: ErrorOutlineIcon,
    color: "error",
    chipSx: undefined,
    empty: "No hay productos en o bajo el mínimo.",
    listKey: "critico",
  },
  low: {
    id: "low",
    label: "Bajo",
    icon: ReportGmailerrorredIcon,
    color: "warning",
    chipSx: { bgcolor: "#ed6c02", color: "#fff", "& .MuiChip-label": { color: "#fff" } },
    empty: "No hay productos en zona naranja (mín. → 1.5×mín.).",
    listKey: "bajo",
  },
  caution: {
    id: "caution",
    label: "Precaución",
    icon: WarningAmberIcon,
    color: "warning",
    chipSx: { bgcolor: "#f9a825", color: "rgba(0,0,0,0.87)" },
    empty: "No hay productos en zona amarilla (1.5×mín. → 2×mín.).",
    listKey: "precaucion",
  },
};

const PRODUCT_TYPE_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "raw", label: "Insumos" },
  { value: "intermediate", label: "Intermedios" },
  { value: "final", label: "Finales" },
];

const TYPE_LABEL = {
  raw: "Insumo",
  intermediate: "Intermedio",
  final: "Final",
};

const GAUGE_SLOT_COUNT = 8;

function classifyProduct(p) {
  const level = classifyStockLevel(p.stock, p.minStock);
  if (Number(p.stock ?? 0) <= 0) return "out";
  if (level === "critical") return "critical";
  if (level === "orange") return "low";
  if (level === "yellow") return "caution";
  return null;
}

function sortProducts(list, view) {
  const arr = [...(list || [])];
  if (view === "out") {
    return arr.sort((a, b) => String(a.name).localeCompare(String(b.name), "es"));
  }
  return arr.sort((a, b) => a.stock - b.stock || a.minStock - b.minStock);
}

function listForView(productsStock, viewId) {
  const meta = STOCK_VIEWS[viewId];
  if (!meta) return [];
  if (viewId === "critical") {
    return productsStock?.critico ?? productsStock?.porAgotarse ?? [];
  }
  return productsStock?.[meta.listKey] ?? [];
}

function mergeUpdatedProduct(productsStock, updated) {
  const removeFrom = (arr) => (arr || []).filter((p) => p.id !== updated.id);
  let agotados = removeFrom(productsStock.agotados);
  let critico = removeFrom(productsStock.critico ?? productsStock.porAgotarse);
  let bajo = removeFrom(productsStock.bajo);
  let precaucion = removeFrom(productsStock.precaucion);
  const bucket = classifyProduct(updated);

  if (bucket === "out") agotados = sortProducts([...agotados, updated], "out");
  if (bucket === "critical") critico = sortProducts([...critico, updated], "critical");
  if (bucket === "low") bajo = sortProducts([...bajo, updated], "low");
  if (bucket === "caution") precaucion = sortProducts([...precaucion, updated], "caution");

  return {
    agotados,
    critico,
    porAgotarse: critico,
    bajo,
    precaucion,
  };
}

function filterByType(list, productType) {
  if (productType === "all") return list;
  return (list || []).filter((p) => p.type === productType);
}

function stockChipColor(view) {
  if (view === "out" || view === "critical") return "error";
  if (view === "low" || view === "caution") return "warning";
  return "default";
}

function stockChipSx(view) {
  if (view === "low") return { bgcolor: "#ed6c02", color: "#fff" };
  if (view === "caution") return { bgcolor: "#f9a825", color: "rgba(0,0,0,0.87)" };
  return undefined;
}

const compactToggleSx = {
  textTransform: "none",
  px: 0.45,
  py: 0.25,
  fontSize: "0.62rem",
  lineHeight: 1.15,
  minWidth: 0,
  "& .MuiSvgIcon-root": { fontSize: "0.8rem", mr: 0.25 },
  "& .MuiChip-root": { height: 15, fontSize: "0.58rem", ml: 0.3, "& .MuiChip-label": { px: 0.4 } },
};

function StockAlertsFilterBar({
  view,
  productType,
  productsStock,
  typeCounts,
  onViewChange,
  onProductTypeChange,
  sx,
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.75}
      flexWrap="wrap"
      useFlexGap
      sx={sx}
    >
      <ToggleButtonGroup
        exclusive
        size="small"
        value={view}
        sx={{ flexWrap: "nowrap" }}
        onChange={(_, v) => {
          if (v) onViewChange(v);
        }}
      >
        {Object.values(STOCK_VIEWS).map((v) => (
          <ToggleButton key={v.id} value={v.id} sx={compactToggleSx}>
            <v.icon sx={{ fontSize: "0.85rem", mr: 0.35 }} />
            {v.label}
            <Chip
              size="small"
              label={listForView(productsStock, v.id).length}
              color={v.color}
              sx={v.chipSx}
            />
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={productType}
        sx={{ flexWrap: "nowrap" }}
        onChange={(_, v) => {
          if (v) onProductTypeChange(v);
        }}
      >
        {PRODUCT_TYPE_FILTERS.map((opt) => (
          <ToggleButton key={opt.value} value={opt.value} sx={compactToggleSx}>
            {opt.label}
            <Chip size="small" label={typeCounts[opt.value] ?? 0} />
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}

function StockAlertsTable({
  rows,
  view,
  isProgrammer,
  editingId,
  draft,
  saving,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDraftChange,
  emptyMessage,
  multiStockEnabled = true,
}) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Producto</TableCell>
          <TableCell>Tipo</TableCell>
          <TableCell align="right">Precio</TableCell>
          <TableCell align="right">{multiStockEnabled ? "Stock (suma)" : "Stock"}</TableCell>
          <TableCell align="right">Mín.</TableCell>
          {isProgrammer && <TableCell align="right">Acciones</TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const isEditing = editingId === row.id;
          return (
            <TableRow key={row.id} hover>
              <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  variant="outlined"
                  label={TYPE_LABEL[row.type] || row.type || "—"}
                  color={
                    row.type === "final"
                      ? "success"
                      : row.type === "intermediate"
                        ? "warning"
                        : "default"
                  }
                />
              </TableCell>
              <TableCell align="right">{money(row.price)}</TableCell>
              <TableCell align="right">
                {isEditing && !multiStockEnabled ? (
                  <TextField
                    size="small"
                    type="number"
                    value={draft.stock}
                    onChange={(e) => onDraftChange({ ...draft, stock: e.target.value })}
                    inputProps={{ min: 0, step: "any" }}
                    sx={{ width: 88 }}
                  />
                ) : (
                  <Chip
                    size="small"
                    color={stockChipColor(view)}
                    label={row.stock}
                    sx={stockChipSx(view)}
                  />
                )}
              </TableCell>
              <TableCell align="right">
                {isEditing ? (
                  <TextField
                    size="small"
                    type="number"
                    value={draft.minStock}
                    onChange={(e) => onDraftChange({ ...draft, minStock: e.target.value })}
                    inputProps={{ min: 0, step: "any" }}
                    sx={{ width: 88 }}
                  />
                ) : (
                  row.minStock
                )}
              </TableCell>
              {isProgrammer && (
                <TableCell align="right">
                  {isEditing ? (
                    <>
                      <Tooltip title="Guardar">
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={saving}
                            onClick={() => onSaveEdit(row)}
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Cancelar">
                        <IconButton size="small" onClick={onCancelEdit} disabled={saving}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <Tooltip title={multiStockEnabled ? "Editar stock mínimo" : "Editar stock (sin movimiento; queda en logs)"}>
                      <IconButton size="small" onClick={() => onStartEdit(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              )}
            </TableRow>
          );
        })}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={isProgrammer ? 6 : 5} align="center" sx={{ py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {emptyMessage}
              </Typography>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export default function DashboardStockPanel({ productsStock, onStockUpdated }) {
  const theme = useTheme();
  const { user, toast } = useAuth();
  const { activeApp } = useAppSettings();
  const multiStockEnabled = activeApp?.multiStockEnabled !== false;
  const isProgrammer = user?.loginRol === "Programador";
  const [view, setView] = useState("critical");
  const [productType, setProductType] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ stock: "", minStock: "" });
  const [saving, setSaving] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const currentMeta = STOCK_VIEWS[view] || STOCK_VIEWS.critical;
  const baseRows = useMemo(() => {
    return sortProducts(listForView(productsStock, view), view);
  }, [productsStock, view]);

  const rows = useMemo(
    () => filterByType(baseRows, productType),
    [baseRows, productType]
  );

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, page, rowsPerPage]);

  const gaugeSlots = useMemo(() => {
    const items = rows.slice(0, GAUGE_SLOT_COUNT);
    return Array.from({ length: GAUGE_SLOT_COUNT }, (_, i) => items[i] ?? null);
  }, [rows]);

  const typeCounts = useMemo(() => {
    const counts = { all: baseRows.length, raw: 0, intermediate: 0, final: 0 };
    for (const p of baseRows) {
      if (p.type && counts[p.type] != null) counts[p.type] += 1;
    }
    return counts;
  }, [baseRows]);

  const startEdit = (row) => {
    setEditingId(row.id);
    setDraft({
      stock: String(row.stock ?? 0),
      minStock: String(row.minStock ?? 0),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({ stock: "", minStock: "" });
  };

  const saveEdit = async (row) => {
    try {
      setSaving(true);
      const payload = multiStockEnabled
        ? { minStock: Number(draft.minStock) }
        : {
            stock: Number(draft.stock),
            minStock: Number(draft.minStock),
          };
      const res = await toast({
        promise: patchProductStockRequest(row.id, payload),
        successMessage: multiStockEnabled ? "Stock mínimo actualizado" : "Stock actualizado",
      });
      const updated = res?.data?.product ?? {
        ...row,
        ...(multiStockEnabled ? {} : { stock: Number(draft.stock) }),
        minStock: Number(draft.minStock),
      };
      onStockUpdated?.(mergeUpdatedProduct(productsStock, updated));
      cancelEdit();
    } catch {
      // toast ya muestra el error
    } finally {
      setSaving(false);
    }
  };

  const onViewChange = (v) => {
    setView(v);
    setPage(0);
    cancelEdit();
  };

  const onProductTypeChange = (v) => {
    setProductType(v);
    setPage(0);
    cancelEdit();
  };

  const hasAnyAlerts =
    (productsStock?.agotados?.length ?? 0) +
      (productsStock?.critico?.length ?? productsStock?.porAgotarse?.length ?? 0) +
      (productsStock?.bajo?.length ?? 0) +
      (productsStock?.precaucion?.length ?? 0) >
    0;

  return (
    <Paper variant="panel" sx={{ p: { xs: 1.25, sm: 1.5 }, borderRadius: 2, minWidth: 0, width: "100%", display: "flex", flexDirection: "column", ...dashboardTwinPanelSx }}>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1, flexShrink: 0 }}
      >
        <ChartBlockHeader
          title="Alertas de inventario"
          sx={{ mb: 0, flex: 1 }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<TableRowsIcon />}
          onClick={() => setDetailOpen(true)}
          disabled={!hasAnyAlerts}
          sx={{ flexShrink: 0 }}
        >
          Ver detalle
        </Button>
      </Stack>

      <StockAlertsFilterBar
        view={view}
        productType={productType}
        productsStock={productsStock}
        typeCounts={typeCounts}
        onViewChange={onViewChange}
        onProductTypeChange={onProductTypeChange}
        sx={{ mb: 1, flexShrink: 0 }}
      />

      {rows.length === 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75, textAlign: "center", flexShrink: 0 }}>
          {currentMeta.empty}
          {productType !== "all" ? ` (filtro: ${PRODUCT_TYPE_FILTERS.find((f) => f.value === productType)?.label})` : ""}
        </Typography>
      )}

      <Box
        sx={{
          height: DASHBOARD_TWIN_PANEL_BODY_HEIGHT,
          minHeight: DASHBOARD_TWIN_PANEL_BODY_HEIGHT,
          maxHeight: DASHBOARD_TWIN_PANEL_BODY_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Grid container spacing={1}>
          {gaugeSlots.map((product, index) => (
            <Grid item xs={3} key={product?.id ?? `gauge-slot-${index}`} sx={{ display: "flex" }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 0.5,
                  borderRadius: 1.5,
                  flex: 1,
                  width: "100%",
                  minHeight: 100,
                  maxHeight: 100,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: product ? "background.paper" : "action.hover",
                  borderStyle: product ? "solid" : "dashed",
                  opacity: product ? 1 : 0.7,
                }}
              >
                {product ? (
                  <StockGauge product={product} compact />
                ) : (
                  <StockGaugeSkeleton compact />
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {rows.length > GAUGE_SLOT_COUNT && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "center", flexShrink: 0 }}>
          Mostrando {GAUGE_SLOT_COUNT} de {rows.length} productos. Abre el detalle para ver todos.
        </Typography>
      )}

      <Dialog
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          cancelEdit();
        }}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          Detalle de alertas de inventario
          <IconButton
            aria-label="Cerrar"
            onClick={() => {
              setDetailOpen(false);
              cancelEdit();
            }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <StockAlertsFilterBar
            view={view}
            productType={productType}
            productsStock={productsStock}
            typeCounts={typeCounts}
            onViewChange={onViewChange}
            onProductTypeChange={onProductTypeChange}
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {currentMeta.label} · {rows.length} productos
            {productType !== "all"
              ? ` · ${PRODUCT_TYPE_FILTERS.find((f) => f.value === productType)?.label}`
              : ""}
          </Typography>
          <Box sx={{ overflowX: "auto" }}>
            <StockAlertsTable
              rows={paginated}
              view={view}
              isProgrammer={isProgrammer}
              editingId={editingId}
              draft={draft}
              saving={saving}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
              onSaveEdit={saveEdit}
              onDraftChange={setDraft}
              emptyMessage={currentMeta.empty}
              multiStockEnabled={multiStockEnabled}
            />
          </Box>
          <TablePagination
            component="div"
            count={rows.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="Filas"
            rowsPerPageOptions={[5, 10, 25]}
          />
          {isProgrammer && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Puedes ajustar stock aquí sin crear movimientos; el cambio queda registrado.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button
            onClick={() => {
              setDetailOpen(false);
              cancelEdit();
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
