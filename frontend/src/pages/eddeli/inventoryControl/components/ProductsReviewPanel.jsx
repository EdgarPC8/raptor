/**
 * Pestaña Revisión del catálogo: sin barcode, ventas, duplicados, incompletos.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import RefreshIcon from "@mui/icons-material/Refresh";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import { ChartSkeleton } from "../../../../components/ContentSkeleton.jsx";
import { getProductSalesSummaryRequest, updateProduct } from "../../../../api/inventoryControlRequest";
import { formatProductCategoryName } from "../../../../utils/categoryUtils.js";
import {
  REVIEW_FILTERS,
  SALES_PERIOD_OPTIONS,
  buildProductReview,
} from "../../../../utils/productReviewUtils.js";
import toast from "react-hot-toast";

const money = (v) =>
  new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const qtyFmt = (v) =>
  new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(Number(v || 0));

function typeLabel(type) {
  if (type === "raw") return "Materia prima";
  if (type === "intermediate") return "Intermedio";
  return "Final";
}

function SummaryCards({ counts, onSelect }) {
  const cards = [
    { id: "no_barcode", label: "Sin código de barras", value: counts.noBarcode, color: "warning" },
    {
      id: "no_barcode_sold",
      label: "Sin barcode y se venden",
      value: counts.noBarcodeSold,
      color: "error",
    },
    {
      id: "no_barcode_unsold",
      label: "Sin barcode y sin ventas",
      value: counts.noBarcodeUnsold,
      color: "default",
    },
    {
      id: "similar_names",
      label: "Grupos con nombres parecidos",
      value: counts.similarGroups,
      color: "info",
    },
    {
      id: "incomplete",
      label: "Incompletos / poco útiles",
      value: counts.incomplete,
      color: "secondary",
    },
  ];

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
      {cards.map((c) => (
        <Chip
          key={c.id}
          clickable
          color={c.color === "default" ? undefined : c.color}
          variant={c.color === "default" ? "outlined" : "filled"}
          label={`${c.label}: ${c.value}`}
          onClick={() => onSelect(c.id)}
        />
      ))}
      <Chip
        variant="outlined"
        label={`En revisión: ${counts.total} productos`}
        icon={<FactCheckIcon />}
      />
    </Stack>
  );
}

function ProductActions({ product, onEdit, onDelete, onDeactivate, busyId, dense = false }) {
  const busy = busyId === product.id;
  const btnSx = dense
    ? { p: 0.25, "& .MuiSvgIcon-root": { fontSize: "1rem" } }
    : undefined;
  return (
    <Stack
      direction="row"
      spacing={0}
      justifyContent="flex-end"
      sx={{ flexShrink: 0, minWidth: 0 }}
    >
      <Tooltip title="Editar">
        <span>
          <IconButton
            size="small"
            disabled={busy}
            onClick={() => onEdit(product)}
            sx={btnSx}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      {product.isActive !== false ? (
        <Tooltip title="Desactivar (sugerido si no sirve)">
          <span>
            <IconButton
              size="small"
              disabled={busy}
              onClick={() => onDeactivate(product)}
              sx={btnSx}
            >
              <VisibilityOffIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ) : null}
      <Tooltip title="Eliminar">
        <span>
          <IconButton
            size="small"
            color="error"
            disabled={busy}
            onClick={() => onDelete(product)}
            sx={btnSx}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

function ProductsIssueTable({
  rows,
  onEdit,
  onDelete,
  onDeactivate,
  busyId,
  emptyText,
}) {
  if (!rows?.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
        {emptyText || "Nada en este filtro."}
      </Typography>
    );
  }

  return (
    <TableContainer sx={{ maxHeight: "calc(100vh - 380px)" }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Producto</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Categoría</TableCell>
            <TableCell>Barcode</TableCell>
            <TableCell align="right">Stock</TableCell>
            <TableCell align="right">P. venta</TableCell>
            <TableCell align="right">Vendidos</TableCell>
            <TableCell align="right">Ingreso</TableCell>
            <TableCell align="right">Sugerencia</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((p) => {
            const suggestion = !p.barcode && p.soldQty > 0
              ? "Poner código de barras"
              : !p.barcode && !(p.soldQty > 0)
                ? "Desactivar o eliminar"
                : p._incomplete
                  ? "Completar ficha o limpiar"
                  : "Revisar";
            return (
              <TableRow key={p.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600} noWrap title={p.name}>
                    {p.name}
                  </Typography>
                  {p.isActive === false ? (
                    <Chip size="small" label="Inactivo" sx={{ mt: 0.25 }} />
                  ) : null}
                </TableCell>
                <TableCell>{typeLabel(p.type)}</TableCell>
                <TableCell>{formatProductCategoryName(p)}</TableCell>
                <TableCell>{p.barcode || "—"}</TableCell>
                <TableCell align="right">{qtyFmt(p.stock)}</TableCell>
                <TableCell align="right">{money(p.price)}</TableCell>
                <TableCell align="right">{qtyFmt(p.soldQty)}</TableCell>
                <TableCell align="right">{money(p.revenue)}</TableCell>
                <TableCell align="right">
                  <Typography variant="caption" color="text.secondary">
                    {suggestion}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <ProductActions
                    product={p}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDeactivate={onDeactivate}
                    busyId={busyId}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const SIMILAR_COLS = 5;
const SIMILAR_ROWS = 3;
const SIMILAR_PAGE_SIZE = SIMILAR_COLS * SIMILAR_ROWS; // 15
const SIMILAR_CARD_MAX_H = 168;

function SimilarGroupCard({ group, onEdit, onDelete, onDeactivate, busyId }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 0.75,
        borderRadius: 1.5,
        height: SIMILAR_CARD_MAX_H,
        maxHeight: SIMILAR_CARD_MAX_H,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 0.4,
        overflow: "hidden",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        noWrap
        sx={{ flexShrink: 0, fontWeight: 600 }}
        title={`Similitud ${(group.score * 100).toFixed(0)}% · ${group.products.length} productos`}
      >
        {(group.score * 100).toFixed(0)}% · {group.products.length} prod.
      </Typography>

      <Stack
        spacing={0.4}
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {group.products.map((p) => (
          <Box
            key={p.id}
            sx={{
              borderRadius: 1,
              px: 0.5,
              py: 0.35,
              bgcolor: "action.hover",
              minWidth: 0,
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              title={p.name}
              sx={{ fontSize: "0.72rem", lineHeight: 1.2, minWidth: 0 }}
            >
              {p.name}
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={0.25}
              sx={{ minWidth: 0, mt: 0.15 }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ flex: 1, minWidth: 0, fontSize: "0.65rem" }}
                title={`${typeLabel(p.type)} · ${p.barcode || "sin barcode"} · vendidos ${qtyFmt(p.soldQty)}`}
              >
                {p.barcode || "sin BC"} · v:{qtyFmt(p.soldQty)}
              </Typography>
              <ProductActions
                product={p}
                onEdit={onEdit}
                onDelete={onDelete}
                onDeactivate={onDeactivate}
                busyId={busyId}
                dense
              />
            </Stack>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

function SimilarGroupsPanel({ groups, onEdit, onDelete, onDeactivate, busyId }) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [groups]);

  if (!groups.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
        No se detectaron nombres muy parecidos.
      </Typography>
    );
  }

  const pageCount = Math.max(1, Math.ceil(groups.length / SIMILAR_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = groups.slice(
    safePage * SIMILAR_PAGE_SIZE,
    safePage * SIMILAR_PAGE_SIZE + SIMILAR_PAGE_SIZE,
  );

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden" }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        {groups.length} grupos · {SIMILAR_COLS}×{SIMILAR_ROWS} por página
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: 1,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
            lg: `repeat(${SIMILAR_COLS}, minmax(0, 1fr))`,
          },
          alignItems: "stretch",
        }}
      >
        {slice.map((g) => (
          <Box key={g.key} sx={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
            <SimilarGroupCard
              group={g}
              onEdit={onEdit}
              onDelete={onDelete}
              onDeactivate={onDeactivate}
              busyId={busyId}
            />
          </Box>
        ))}
      </Box>
      <TablePagination
        component="div"
        count={groups.length}
        page={safePage}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={SIMILAR_PAGE_SIZE}
        rowsPerPageOptions={[SIMILAR_PAGE_SIZE]}
        labelRowsPerPage="Por página"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        sx={{
          mt: 0.5,
          borderTop: 1,
          borderColor: "divider",
          width: "100%",
          overflow: "hidden",
          ".MuiTablePagination-toolbar": { flexWrap: "wrap", pl: 0, pr: 0 },
        }}
      />
    </Box>
  );
}

export default function ProductsReviewPanel({
  products = [],
  loadingProducts = false,
  onEdit,
  onDeleteRequest,
  onReload,
}) {
  const [filter, setFilter] = useState("summary");
  const [days, setDays] = useState(365);
  const [typeFilter, setTypeFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [salesByProductId, setSalesByProductId] = useState({});
  const [loadingSales, setLoadingSales] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadSales = async (periodDays = days) => {
    setLoadingSales(true);
    try {
      const { data } = await getProductSalesSummaryRequest({ days: periodDays });
      setSalesByProductId(data?.byProductId || {});
    } catch (e) {
      console.error("ProductsReviewPanel sales:", e);
      setSalesByProductId({});
      toast.error("No se pudo cargar el resumen de ventas");
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => {
    loadSales(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const review = useMemo(
    () =>
      buildProductReview({
        products,
        salesByProductId,
        typeFilter,
        activeOnly,
      }),
    [products, salesByProductId, typeFilter, activeOnly],
  );

  const handleDeactivate = async (product) => {
    setBusyId(product.id);
    try {
      const fd = new FormData();
      fd.append("isActive", "false");
      await toast.promise(updateProduct(product.id, fd), {
        loading: "Desactivando…",
        success: "Producto desactivado",
        error: "No se pudo desactivar",
      });
      await onReload?.();
    } finally {
      setBusyId(null);
    }
  };

  const loading = loadingProducts || loadingSales;

  let body = null;
  if (loading) {
    body = <ChartSkeleton height={280} />;
  } else if (filter === "summary") {
    body = (
      <Alert severity="info" sx={{ mt: 0.5 }}>
        Tocá un chip para ver el detalle. Prioridad: productos <strong>sin código que sí se
        venden</strong> (poner barcode) y <strong>nombres parecidos</strong> (limpiar
        duplicados). Los sin barcode y sin ventas son candidatos a desactivar o eliminar.
      </Alert>
    );
  } else if (filter === "similar_names") {
    body = (
      <SimilarGroupsPanel
        groups={review.similarGroups}
        onEdit={onEdit}
        onDelete={onDeleteRequest}
        onDeactivate={handleDeactivate}
        busyId={busyId}
      />
    );
  } else {
    const map = {
      no_barcode: review.noBarcode,
      no_barcode_sold: review.noBarcodeSold,
      no_barcode_unsold: review.noBarcodeUnsold,
      incomplete: review.incomplete,
    };
    body = (
      <ProductsIssueTable
        rows={map[filter] || []}
        onEdit={onEdit}
        onDelete={onDeleteRequest}
        onDeactivate={handleDeactivate}
        busyId={busyId}
      />
    );
  }

  return (
    <Paper data-tour="productos-review" sx={{ p: 2, borderRadius: 2 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
        useFlexGap
        flexWrap="wrap"
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Revisión del catálogo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Detectá productos sin código, posibles duplicados e incompletos según ventas.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Ventas</InputLabel>
            <Select
              label="Ventas"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {SALES_PERIOD_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              label="Tipo"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="final">Final</MenuItem>
              <MenuItem value="intermediate">Intermedio</MenuItem>
              <MenuItem value="raw">Materia prima</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
              />
            }
            label="Solo activos"
          />
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => {
              loadSales(days);
              onReload?.();
            }}
          >
            Actualizar
          </Button>
        </Stack>
      </Stack>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={filter}
        onChange={(_, v) => v && setFilter(v)}
        sx={{ mb: 1.5, flexWrap: "wrap" }}
      >
        {REVIEW_FILTERS.map((f) => (
          <ToggleButton key={f.id} value={f.id} sx={{ textTransform: "none", px: 1.25 }}>
            {f.label}
            {f.id !== "summary" ? (
              <Chip
                size="small"
                label={
                  f.id === "no_barcode"
                    ? review.counts.noBarcode
                    : f.id === "no_barcode_sold"
                      ? review.counts.noBarcodeSold
                      : f.id === "no_barcode_unsold"
                        ? review.counts.noBarcodeUnsold
                        : f.id === "similar_names"
                          ? review.counts.similarGroups
                          : review.counts.incomplete
                }
                sx={{ ml: 0.75, height: 20 }}
              />
            ) : null}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {!loading ? <SummaryCards counts={review.counts} onSelect={setFilter} /> : null}
      {body}
    </Paper>
  );
}
