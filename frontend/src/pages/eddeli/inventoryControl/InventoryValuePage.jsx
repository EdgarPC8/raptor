import {
  Container,
  Typography,
  Stack,
  Box,
  Paper,
  TextField,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  alpha,
  useTheme,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import TuneIcon from "@mui/icons-material/Tune";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import NumbersOutlinedIcon from "@mui/icons-material/NumbersOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { useAppSettings } from "../../../context/AppSettingsContext.jsx";
import TablePro from "../../../components/Tables/TablePro";
import ProductForm from "./components/ProductForm.jsx";
import {
  getInventoryValueSummaryRequest,
  getStoresRequest,
  getCategories,
  getAllProductsAll,
} from "../../../api/inventoryControlRequest";
import { storeHoldsInventory, locationKindLabel } from "../../../utils/storeLocationKind.js";
import { buildCategoryFilterOptions, indexCategories, productMatchesCategoryFilter } from "../../../utils/categoryUtils.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { formatMoneyFromApp } from "../../../utils/moneyFormat.js";

const qtyFmt = (n) =>
  new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(Number(n || 0));

const TYPE_LABEL = {
  raw: "Materia prima",
  intermediate: "Intermedio",
  final: "Final",
};

function OptionSwitch({ checked, onChange, title, comment }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 1.5,
        py: 1.25,
      }}
    >
      <Box sx={{ minWidth: 0, pr: 1 }}>
        <Typography variant="body2" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {comment}
        </Typography>
      </Box>
      <Switch
        size="small"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        sx={{ flexShrink: 0, mt: 0.25 }}
      />
    </Box>
  );
}

/** Recalcula valor/ganancia según base: catálogo o última compra. */
function applyCostBasis(row, preferLastPurchase) {
  const catalog = Number(row.catalogCost || 0);
  const last = Number(row.lastPurchaseCost || 0);
  const qty = Number(row.quantity || 0);
  const unitSale = Number(row.unitSale || 0);

  let unitCost = 0;
  let costSource = "none";
  let costEstimated = false;

  if (preferLastPurchase && last > 0) {
    unitCost = last;
    costSource = catalog > 0 ? "last_purchase_override" : "last_purchase";
    costEstimated = true;
  } else if (catalog > 0) {
    unitCost = catalog;
    costSource = "catalog";
  } else if (last > 0) {
    unitCost = last;
    costSource = "last_purchase";
    costEstimated = true;
  }

  const hasCost = unitCost > 0;
  const isFinal = row.type === "final";
  const unitProfit = isFinal && hasCost ? unitSale - unitCost : null;
  const valueProfit = unitProfit != null ? unitProfit * qty : 0;
  const marginPercent =
    isFinal && hasCost && unitCost > 0
      ? Math.round((((unitSale - unitCost) / unitCost) * 100 + Number.EPSILON) * 100) / 100
      : null;

  return {
    ...row,
    unitCost,
    costSource,
    costEstimated,
    hasSupplierCost: hasCost,
    valueCost: qty * unitCost,
    unitProfit,
    valueProfit,
    marginPercent,
  };
}

function SummaryCard({ label, value, hint, color = "primary", icon: Icon }) {
  const theme = useTheme();
  const main = theme.palette[color]?.main || theme.palette.primary.main;

  return (
    <Paper
      variant="panel"
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 2,
        flex: "1 1 140px",
        minWidth: 140,
        boxSizing: "border-box",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, display: "block" }}
          >
            {label}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              mt: 0.25,
              color: main,
              lineHeight: 1.2,
              wordBreak: "break-word",
            }}
          >
            {value}
          </Typography>
          {hint ? (
            <Typography variant="caption" color="text.secondary" display="block">
              {hint}
            </Typography>
          ) : null}
        </Box>
        {Icon ? (
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              display: "grid",
              placeItems: "center",
              bgcolor: alpha(main, 0.12),
              color: main,
              flexShrink: 0,
            }}
          >
            <Icon fontSize="small" />
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}

function summarizeItems(items) {
  const list = Array.isArray(items) ? items : [];
  const valueCost = list.reduce((s, i) => s + Number(i.valueCost || 0), 0);
  const valueSale = list.reduce((s, i) => s + Number(i.valueSale || 0), 0);
  const quantity = list.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const profitOnFinals = list.reduce((s, i) => s + Number(i.valueProfit || 0), 0);
  return {
    productCount: list.length,
    quantity,
    valueCost,
    valueSale,
    margin: valueSale - valueCost,
    profitOnFinals,
    withCostCount: list.filter((i) => i.hasSupplierCost).length,
    missingCostCount: list.filter((i) => i.costSource === "none" || !i.hasSupplierCost).length,
    estimatedCostCount: list.filter(
      (i) => i.costEstimated || i.costSource === "last_purchase" || i.costSource === "last_purchase_override",
    ).length,
    costDiffersCount: list.filter((i) => i.costDiffers).length,
    lastPurchaseHigherCount: list.filter((i) => i.lastPurchaseHigher).length,
    finalsWithCostCount: list.filter((i) => i.type === "final" && i.hasSupplierCost).length,
  };
}

export default function InventoryValuePage() {
  const { activeApp } = useAppSettings();
  const { toast } = useAuth();
  const multiStockEnabled = Boolean(activeApp?.multiStockEnabled);
  const money = useCallback((n) => formatMoneyFromApp(n, activeApp), [activeApp]);

  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState("");
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loadingEditProduct, setLoadingEditProduct] = useState(false);

  const [categoryId, setCategoryId] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [onlyWithCost, setOnlyWithCost] = useState(false);
  const [onlyEstimatedCost, setOnlyEstimatedCost] = useState(false);
  const [onlyCostDiffers, setOnlyCostDiffers] = useState(false);
  const [onlyLastHigher, setOnlyLastHigher] = useState(false);
  const [useLastPurchaseCost, setUseLastPurchaseCost] = useState(false);
  const [onlyFinals, setOnlyFinals] = useState(false);
  const [onlyProfitable, setOnlyProfitable] = useState(false);

  const categoryOptions = useMemo(
    () => buildCategoryFilterOptions(categories),
    [categories],
  );

  const categoriesById = useMemo(() => indexCategories(categories), [categories]);

  const categoryLabelById = useMemo(() => {
    const map = new Map();
    for (const opt of categoryOptions) {
      if (String(opt.value).startsWith("parent:")) continue;
      map.set(String(opt.value), opt.label);
    }
    for (const c of categories) {
      if (!map.has(String(c.id))) map.set(String(c.id), c.name);
    }
    return map;
  }, [categoryOptions, categories]);

  const loadStores = useCallback(async () => {
    if (!multiStockEnabled) {
      setStores([]);
      return;
    }
    try {
      const { data } = await getStoresRequest({ isActive: true });
      const list = (Array.isArray(data) ? data : []).filter((s) =>
        storeHoldsInventory(s.locationKind),
      );
      setStores(list);
    } catch {
      setStores([]);
    }
  }, [multiStockEnabled]);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (multiStockEnabled && storeId) params.storeId = storeId;
      const { data } = await getInventoryValueSummaryRequest(params);
      setPayload(data);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo cargar el valor de inventario";
      setPayload(null);
      setError(msg);
      toast?.({ message: msg, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [multiStockEnabled, storeId, toast]);

  useEffect(() => {
    void loadStores();
    void loadCategories();
  }, [loadStores, loadCategories]);

  useEffect(() => {
    void load();
  }, [load]);

  const closeProductDialog = useCallback(() => {
    setProductDialogOpen(false);
    setEditingProduct(null);
  }, []);

  const openEditProduct = useCallback(
    async (row) => {
      const productId = Number(row?.productId ?? row?.id);
      if (!productId) return;
      setLoadingEditProduct(true);
      try {
        const { data } = await getAllProductsAll();
        const list = Array.isArray(data) ? data : data?.products || [];
        const full = list.find((p) => Number(p.id) === productId);
        if (!full) {
          toast?.({ message: "No se encontró el producto para editar", variant: "error" });
          return;
        }
        setEditingProduct(full);
        setProductDialogOpen(true);
      } catch (e) {
        console.error(e);
        toast?.({ message: "No se pudo cargar el producto", variant: "error" });
      } finally {
        setLoadingEditProduct(false);
      }
    },
    [toast],
  );

  const handleProductSaved = useCallback(async () => {
    closeProductDialog();
    await load();
  }, [closeProductDialog, load]);

  const filteredItems = useMemo(() => {
    let rows = Array.isArray(payload?.items) ? payload.items : [];
    rows = rows.map((r) => applyCostBasis(r, useLastPurchaseCost));
    if (categoryId) {
      rows = rows.filter((r) =>
        productMatchesCategoryFilter(r, categoryId, categoriesById),
      );
    }
    if (typeFilter) {
      rows = rows.filter((r) => r.type === typeFilter);
    }
    if (onlyWithCost) {
      rows = rows.filter((r) => r.hasSupplierCost);
    }
    if (onlyEstimatedCost) {
      rows = rows.filter(
        (r) =>
          Number(r.catalogCost || 0) <= 0 &&
          Number(r.lastPurchaseCost || 0) > 0,
      );
    }
    if (onlyCostDiffers) {
      rows = rows.filter((r) => r.costDiffers);
    }
    if (onlyLastHigher) {
      rows = rows.filter((r) => r.lastPurchaseHigher);
    }
    if (onlyFinals) {
      rows = rows.filter((r) => r.type === "final");
    }
    if (onlyProfitable) {
      rows = rows.filter((r) => Number(r.valueProfit || 0) > 0);
    }
    return rows;
  }, [
    payload?.items,
    categoryId,
    typeFilter,
    onlyWithCost,
    onlyEstimatedCost,
    onlyCostDiffers,
    onlyLastHigher,
    useLastPurchaseCost,
    onlyFinals,
    onlyProfitable,
    categoriesById,
  ]);

  const summary = useMemo(() => summarizeItems(filteredItems), [filteredItems]);

  /** Base valorada (sin filtros de listado) para paneles de análisis. */
  const valuedItems = useMemo(() => {
    const rows = Array.isArray(payload?.items) ? payload.items : [];
    return rows.map((r) => applyCostBasis(r, useLastPurchaseCost));
  }, [payload?.items, useLastPurchaseCost]);

  const outdatedCostCount = useMemo(
    () => valuedItems.filter((r) => r.costDiffers).length,
    [valuedItems],
  );

  const topMarginRanking = useMemo(
    () =>
      valuedItems
        .filter((r) => r.type === "final" && r.marginPercent != null && r.hasSupplierCost)
        .sort((a, b) => Number(b.marginPercent) - Number(a.marginPercent))
        .slice(0, 5),
    [valuedItems],
  );

  const highStockLowMargin = useMemo(() => {
    const finals = valuedItems.filter(
      (r) => r.type === "final" && r.hasSupplierCost && r.marginPercent != null,
    );
    if (finals.length < 2) return [];
    const qtys = finals.map((r) => Number(r.quantity || 0)).sort((a, b) => a - b);
    const medianQty = qtys[Math.floor(qtys.length / 2)] || 0;
    return finals
      .filter((r) => Number(r.quantity) >= medianQty && Number(r.marginPercent) < 25)
      .sort((a, b) => Number(a.marginPercent) - Number(b.marginPercent))
      .slice(0, 5);
  }, [valuedItems]);

  const capitalByCategory = useMemo(() => {
    const map = new Map();
    for (const r of valuedItems) {
      const key = r.categoryId != null ? String(r.categoryId) : "none";
      const label =
        key === "none"
          ? "Sin categoría"
          : categoryLabelById.get(key) || `Categoría ${key}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          label,
          productCount: 0,
          valueCost: 0,
          valueSale: 0,
        });
      }
      const row = map.get(key);
      row.productCount += 1;
      row.valueCost += Number(r.valueCost || 0);
      row.valueSale += Number(r.valueSale || 0);
    }
    return [...map.values()]
      .map((r) => ({
        ...r,
        valueCost: Math.round((r.valueCost + Number.EPSILON) * 100) / 100,
        valueSale: Math.round((r.valueSale + Number.EPSILON) * 100) / 100,
      }))
      .sort((a, b) => b.valueCost - a.valueCost)
      .slice(0, 6);
  }, [valuedItems, categoryLabelById]);

  const filtersActive =
    Boolean(categoryId) ||
    Boolean(typeFilter) ||
    onlyWithCost ||
    onlyEstimatedCost ||
    onlyCostDiffers ||
    onlyLastHigher ||
    useLastPurchaseCost ||
    onlyFinals ||
    onlyProfitable;

  const clearAllFilters = useCallback(() => {
    setCategoryId("");
    setTypeFilter("");
    setOnlyWithCost(false);
    setOnlyEstimatedCost(false);
    setOnlyCostDiffers(false);
    setOnlyLastHigher(false);
    setUseLastPurchaseCost(false);
    setOnlyFinals(false);
    setOnlyProfitable(false);
  }, []);

  const clearOptionSwitches = useCallback(() => {
    setOnlyWithCost(false);
    setOnlyEstimatedCost(false);
    setOnlyCostDiffers(false);
    setOnlyLastHigher(false);
    setUseLastPurchaseCost(false);
    setOnlyFinals(false);
    setOnlyProfitable(false);
  }, []);

  const activeOptionChips = useMemo(() => {
    const chips = [];
    if (useLastPurchaseCost) {
      chips.push({
        key: "useLast",
        label: "Valorando con últ. compra",
        onDelete: () => setUseLastPurchaseCost(false),
      });
    }
    if (onlyWithCost) {
      chips.push({
        key: "withCost",
        label: "Solo con costo",
        onDelete: () => setOnlyWithCost(false),
      });
    }
    if (onlyEstimatedCost) {
      chips.push({
        key: "estimated",
        label: "Sin costo de catálogo",
        onDelete: () => setOnlyEstimatedCost(false),
      });
    }
    if (onlyCostDiffers) {
      chips.push({
        key: "differs",
        label: "Catálogo ≠ últ. compra",
        onDelete: () => setOnlyCostDiffers(false),
      });
    }
    if (onlyLastHigher) {
      chips.push({
        key: "higher",
        label: "Últ. compra más cara",
        onDelete: () => setOnlyLastHigher(false),
      });
    }
    if (onlyFinals) {
      chips.push({
        key: "finals",
        label: "Solo finales",
        onDelete: () => setOnlyFinals(false),
      });
    }
    if (onlyProfitable) {
      chips.push({
        key: "profit",
        label: "Solo con ganancia",
        onDelete: () => setOnlyProfitable(false),
      });
    }
    return chips;
  }, [
    useLastPurchaseCost,
    onlyWithCost,
    onlyEstimatedCost,
    onlyCostDiffers,
    onlyLastHigher,
    onlyFinals,
    onlyProfitable,
  ]);

  const activeOptionsCount = activeOptionChips.length;

  const columns = useMemo(
    () => [
      {
        label: "Producto",
        id: "name",
        render: (row) => (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {[TYPE_LABEL[row.type] || row.type, row.sku].filter(Boolean).join(" · ")}
            </Typography>
          </Box>
        ),
      },
      {
        label: "Categoría",
        id: "categoryId",
        render: (row) =>
          row.categoryId
            ? categoryLabelById.get(String(row.categoryId)) || "—"
            : "Sin categoría",
        getSearchValue: (row) =>
          row.categoryId
            ? categoryLabelById.get(String(row.categoryId)) || ""
            : "sin categoría",
      },
      {
        label: "Cant.",
        id: "quantity",
        render: (row) => qtyFmt(row.quantity),
      },
      {
        label: "Costo u.",
        id: "unitCost",
        render: (row) => {
          if (!row.hasSupplierCost) {
            return (
              <Typography variant="caption" color="warning.main">
                Sin historial
              </Typography>
            );
          }
          const catalog = Number(row.catalogCost || 0);
          const last = Number(row.lastPurchaseCost || 0);
          const usingLast =
            row.costEstimated ||
            row.costSource === "last_purchase" ||
            row.costSource === "last_purchase_override";

          return (
            <Box>
              <Typography
                variant="body2"
                fontWeight={700}
                color={usingLast ? "secondary.main" : undefined}
              >
                {money(row.unitCost)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {usingLast ? "Usando últ. compra" : "Usando catálogo"}
              </Typography>
              {catalog > 0 && last > 0 ? (
                <Typography
                  variant="caption"
                  display="block"
                  color={row.lastPurchaseHigher ? "warning.main" : "text.secondary"}
                >
                  Prov. {money(catalog)} · Últ. {money(last)}
                  {row.lastPurchaseDate ? ` (${row.lastPurchaseDate})` : ""}
                  {row.costDelta != null
                    ? ` · Δ ${row.costDelta > 0 ? "+" : ""}${money(row.costDelta)}`
                    : ""}
                </Typography>
              ) : usingLast && row.lastPurchaseDate ? (
                <Typography variant="caption" color="text.secondary" display="block">
                  {row.lastPurchaseDate}
                  {row.lastPurchaseOrderId ? ` · #${row.lastPurchaseOrderId}` : ""}
                </Typography>
              ) : null}
            </Box>
          );
        },
        getSearchValue: (row) =>
          `costo ${row.unitCost} catalogo ${row.catalogCost || ""} ultima ${row.lastPurchaseCost || ""}`,
      },
      {
        label: "Venta u.",
        id: "unitSale",
        render: (row) => money(row.unitSale),
      },
      {
        label: "Ganancia u.",
        id: "unitProfit",
        render: (row) => {
          if (row.type !== "final") {
            return (
              <Typography variant="caption" color="text.secondary">
                —
              </Typography>
            );
          }
          if (!row.hasSupplierCost || row.unitProfit == null) {
            return (
              <Typography variant="caption" color="warning.main">
                Sin historial
              </Typography>
            );
          }
          const v = Number(row.unitProfit || 0);
          return (
            <Typography
              variant="body2"
              fontWeight={700}
              color={v >= 0 ? "success.main" : "error.main"}
            >
              {money(v)}
            </Typography>
          );
        },
      },
      {
        label: "Valor costo",
        id: "valueCost",
        render: (row) => money(row.valueCost),
      },
      {
        label: "Valor venta",
        id: "valueSale",
        render: (row) => money(row.valueSale),
      },
      {
        label: "Ganancia",
        id: "valueProfit",
        render: (row) => {
          if (row.type !== "final") {
            return (
              <Typography variant="caption" color="text.secondary">
                —
              </Typography>
            );
          }
          if (!row.hasSupplierCost) {
            return (
              <Typography variant="caption" color="warning.main">
                Sin historial
              </Typography>
            );
          }
          const v = Number(row.valueProfit || 0);
          return (
            <Box>
              <Typography
                variant="body2"
                fontWeight={700}
                color={v >= 0 ? "success.main" : "error.main"}
              >
                {money(v)}
                {row.marginPercent != null ? (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    ({qtyFmt(row.marginPercent)}%)
                  </Typography>
                ) : null}
              </Typography>
              {row.costEstimated || row.costSource === "last_purchase_override" ? (
                <Typography variant="caption" color="secondary.main">
                  Con últ. compra
                </Typography>
              ) : null}
            </Box>
          );
        },
      },
      {
        label: "",
        id: "actions",
        disableSort: true,
        render: (row) => (
          <Tooltip title="Editar producto">
            <span>
              <IconButton
                size="small"
                color="primary"
                disabled={loadingEditProduct}
                onClick={() => void openEditProduct(row)}
                aria-label="Editar producto"
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ),
      },
    ],
    [categoryLabelById, loadingEditProduct, openEditProduct, money],
  );

  const byStoreColumns = useMemo(
    () => [
      {
        label: "Local",
        id: "storeName",
        render: (row) => (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {row.storeName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {locationKindLabel(row.locationKind)}
            </Typography>
          </Box>
        ),
      },
      { label: "Productos", id: "productCount" },
      {
        label: "Cantidad",
        id: "quantity",
        render: (row) => qtyFmt(row.quantity),
      },
      {
        label: "Valor costo",
        id: "valueCost",
        render: (row) => money(row.valueCost),
      },
      {
        label: "Valor venta",
        id: "valueSale",
        render: (row) => money(row.valueSale),
      },
      {
        label: "Ganancia finales",
        id: "profitOnFinals",
        render: (row) => money(row.profitOnFinals || 0),
      },
    ],
    [money],
  );

  return (
    <Container>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <MonetizationOnOutlinedIcon color="primary" />
            <Typography variant="h5" fontWeight={700}>
              Valor de inventario
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {multiStockEnabled
              ? "Compará costo de catálogo vs última compra, filtrá subidas de precio y elegí con qué base valorar el inventario (por local o general)."
              : "Stock general: compará costo de catálogo vs última compra, filtrá subidas de precio y elegí con qué base valorar el inventario."}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {multiStockEnabled ? (
            <TextField
              select
              size="small"
              label="Local"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              sx={{ minWidth: 200 }}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="">Todos (general)</MenuItem>
              {stores.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name} · {locationKindLabel(s.locationKind)}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void load()}
            disabled={loading}
          >
            Actualizar
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => void load()}>
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      <Dialog
        open={showOptions}
        onClose={() => setShowOptions(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 0.5 }}>Opciones de valor y filtros</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Activá o desactivá cada opción. El comentario indica qué hace.
          </Typography>

          <Typography variant="overline" color="text.secondary">
            Base del costo
          </Typography>
          <OptionSwitch
            checked={useLastPurchaseCost}
            onChange={setUseLastPurchaseCost}
            title="Valorar con última compra"
            comment="Si el producto tiene historial de pedidos, el valor de inventario y la ganancia se calculan con el precio de la última compra en lugar del costo del catálogo (ficha). No cambia el producto: solo cómo se muestra aquí."
          />
          <Divider />

          <Typography variant="overline" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Comparar precios
          </Typography>
          <OptionSwitch
            checked={onlyCostDiffers}
            onChange={setOnlyCostDiffers}
            title="Catálogo ≠ última compra"
            comment="Muestra solo productos que tienen ambos precios y no coinciden. Sirve para detectar costos desactualizados en la ficha."
          />
          <Divider />
          <OptionSwitch
            checked={onlyLastHigher}
            onChange={setOnlyLastHigher}
            title="Última compra más cara"
            comment="Solo productos donde el proveedor cobró más en la última compra que el costo guardado en catálogo. Útil cuando el precio subió."
          />
          <Divider />

          <Typography variant="overline" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Filtrar listado
          </Typography>
          <OptionSwitch
            checked={onlyWithCost}
            onChange={setOnlyWithCost}
            title="Solo con costo"
            comment="Oculta productos sin costo de catálogo ni última compra. El resto sí entra al resumen."
          />
          <Divider />
          <OptionSwitch
            checked={onlyEstimatedCost}
            onChange={setOnlyEstimatedCost}
            title="Solo sin costo de catálogo"
            comment="Productos que no tienen precio proveedor en la ficha y se están valorando (o podrían valorarse) con la última compra. Conviene completar el costo en el producto."
          />
          <Divider />
          <OptionSwitch
            checked={onlyFinals}
            onChange={setOnlyFinals}
            title="Solo productos finales"
            comment="Deja solo productos de tipo final (los que se venden al consumidor). La ganancia potencial aplica a estos."
          />
          <Divider />
          <OptionSwitch
            checked={onlyProfitable}
            onChange={setOnlyProfitable}
            title="Solo con ganancia"
            comment="Solo finales cuya ganancia potencial es mayor a cero con el costo que estés usando ahora (catálogo o última compra)."
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.25 }}>
          <Button color="inherit" onClick={clearOptionSwitches}>
            Desactivar todo
          </Button>
          <Button variant="contained" onClick={() => setShowOptions(false)}>
            Listo
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ pb: 0.5 }}>Análisis de inventario</DialogTitle>
        <DialogContent dividers>
          {outdatedCostCount > 0 ? (
            <Alert
              severity="warning"
              sx={{ mb: 2 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    setOnlyCostDiffers(true);
                    setShowAnalysis(false);
                  }}
                >
                  Ver en tabla
                </Button>
              }
            >
              <strong>{outdatedCostCount}</strong> producto
              {outdatedCostCount === 1 ? "" : "s"} con costo de catálogo distinto a la última
              compra. Revisá o actualizá el precio proveedor.
            </Alert>
          ) : (
            <Alert severity="success" sx={{ mb: 2 }}>
              No hay diferencias entre costo de catálogo y última compra.
            </Alert>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gap: 1.5,
            }}
          >
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <EmojiEventsOutlinedIcon fontSize="small" color="success" />
                <Typography variant="subtitle2" fontWeight={700}>
                  Mayor margen %
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Top finales con costo
              </Typography>
              {topMarginRanking.length ? (
                <List dense disablePadding>
                  {topMarginRanking.map((r, i) => (
                    <ListItem key={r.productId ?? r.id} disableGutters sx={{ py: 0.25 }}>
                      <ListItemText
                        primary={`${i + 1}. ${r.name}`}
                        secondary={`${qtyFmt(r.marginPercent)}% · ${money(r.unitCost)} → ${money(r.unitSale)}`}
                        primaryTypographyProps={{ variant: "body2", noWrap: true }}
                        secondaryTypographyProps={{ variant: "caption" }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Sin finales con costo para ranking.
                </Typography>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <TrendingDownOutlinedIcon fontSize="small" color="warning" />
                <Typography variant="subtitle2" fontWeight={700}>
                  Stock alto · margen bajo
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Cantidad ≥ mediana y margen &lt; 25%
              </Typography>
              {highStockLowMargin.length ? (
                <List dense disablePadding>
                  {highStockLowMargin.map((r) => (
                    <ListItem key={r.productId ?? r.id} disableGutters sx={{ py: 0.25 }}>
                      <ListItemText
                        primary={r.name}
                        secondary={`Qty ${qtyFmt(r.quantity)} · margen ${qtyFmt(r.marginPercent)}%`}
                        primaryTypographyProps={{ variant: "body2", noWrap: true }}
                        secondaryTypographyProps={{ variant: "caption" }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No hay casos claros con estos criterios.
                </Typography>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <CategoryOutlinedIcon fontSize="small" color="info" />
                <Typography variant="subtitle2" fontWeight={700}>
                  Capital por categoría
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Valor a costo (inmovilizado)
              </Typography>
              {capitalByCategory.length ? (
                <List dense disablePadding>
                  {capitalByCategory.map((r) => (
                    <ListItem key={r.id} disableGutters sx={{ py: 0.25 }}>
                      <ListItemText
                        primary={r.label}
                        secondary={`${money(r.valueCost)} · ${r.productCount} prod.`}
                        primaryTypographyProps={{ variant: "body2", noWrap: true }}
                        secondaryTypographyProps={{ variant: "caption" }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Sin datos por categoría.
                </Typography>
              )}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.25 }}>
          <Button variant="contained" onClick={() => setShowAnalysis(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={productDialogOpen}
        onClose={closeProductDialog}
        fullWidth
        maxWidth="md"
        scroll="paper"
        PaperProps={{
          sx: {
            maxHeight: "98vh",
            display: "flex",
            flexDirection: "column",
            width: { xs: "100%", sm: "min(720px, 96vw)" },
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            pt: 1,
            pb: 0,
            flexShrink: 0,
          }}
        >
          <DialogTitle sx={{ p: 0, flex: 1, fontWeight: 700, fontSize: "1.05rem" }}>
            Editar producto
          </DialogTitle>
          <IconButton aria-label="Cerrar" onClick={closeProductDialog} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent dividers>
          {editingProduct ? (
            <ProductForm
              key={`edit-${editingProduct.id}`}
              isEditing
              datos={editingProduct}
              onClose={closeProductDialog}
              reload={handleProductSaved}
            />
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
          <Button type="button" onClick={closeProductDialog} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" form="eddeli-product-form" variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mb: 2 }}>
            <SummaryCard
              label="Productos"
              value={summary.productCount}
              hint="en el listado filtrado"
              color="primary"
              icon={Inventory2OutlinedIcon}
            />
            <SummaryCard
              label="Cantidad"
              value={qtyFmt(summary.quantity)}
              hint="unidades en stock"
              color="info"
              icon={NumbersOutlinedIcon}
            />
            <SummaryCard
              label="Valor a costo"
              value={money(summary.valueCost)}
              hint={
                useLastPurchaseCost
                  ? "stock × últ. compra (si hay)"
                  : "stock × catálogo (o últ. si falta)"
              }
              color="warning"
              icon={ShoppingCartOutlinedIcon}
            />
            <SummaryCard
              label="Valor a venta"
              value={money(summary.valueSale)}
              hint="stock × precio consumidor"
              color="secondary"
              icon={SellOutlinedIcon}
            />
            <SummaryCard
              label="Ganancia potencial"
              value={money(summary.profitOnFinals)}
              hint="finales: (venta − costo usado) × qty"
              color="success"
              icon={TrendingUpOutlinedIcon}
            />
            <SummaryCard
              label="Sin costo ni compra"
              value={summary.missingCostCount ?? 0}
              hint="ni catálogo ni historial de pedidos"
              color="error"
              icon={WarningAmberOutlinedIcon}
            />
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {payload?.storeName ? (
              <Chip size="small" color="primary" label={`Local: ${payload.storeName}`} sx={{ fontWeight: 700 }} />
            ) : multiStockEnabled ? (
              <Chip size="small" variant="outlined" label="Todos los locales" />
            ) : null}
            {filtersActive ? (
              <Chip
                size="small"
                color="secondary"
                variant="outlined"
                label={`Filtros activos · ${filteredItems.length} filas`}
              />
            ) : null}
            <Chip
              size="small"
              variant="outlined"
              label={`Finales con costo: ${summary.finalsWithCostCount}`}
            />
          </Stack>

          {multiStockEnabled &&
            !storeId &&
            !filtersActive &&
            Array.isArray(payload?.byStore) &&
            payload.byStore.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  Por local
                </Typography>
                <TablePro
                  rows={payload.byStore}
                  columns={byStoreColumns}
                  title="LOCALES"
                  showIndex
                  defaultRowsPerPage={10}
                  rowsPerPageOptions={[10, 25]}
                />
              </Box>
            )}

          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            Detalle por producto
          </Typography>

          <Paper variant="outlined" sx={{ p: 1.25, mb: 1.5 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.25}
              alignItems={{ md: "center" }}
              flexWrap="wrap"
              useFlexGap
            >
              <TextField
                select
                size="small"
                label="Categoría"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                sx={{ minWidth: 180 }}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="">Todas</MenuItem>
                {categoryOptions.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Tipo"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                sx={{ minWidth: 150 }}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="final">Final</MenuItem>
                <MenuItem value="intermediate">Intermedio</MenuItem>
                <MenuItem value="raw">Materia prima</MenuItem>
              </TextField>
              <Button
                size="small"
                variant={activeOptionsCount ? "contained" : "outlined"}
                startIcon={<TuneIcon />}
                onClick={() => setShowOptions(true)}
              >
                Opciones
                {activeOptionsCount ? ` (${activeOptionsCount})` : ""}
              </Button>
              <Button
                size="small"
                variant={outdatedCostCount ? "contained" : "outlined"}
                color={outdatedCostCount ? "warning" : "primary"}
                startIcon={<TrendingUpOutlinedIcon />}
                onClick={() => setShowAnalysis(true)}
              >
                Análisis
                {outdatedCostCount ? ` (${outdatedCostCount})` : ""}
              </Button>
              {filtersActive ? (
                <Button size="small" onClick={clearAllFilters}>
                  Limpiar filtros
                </Button>
              ) : null}
            </Stack>
            {activeOptionChips.length ? (
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
                {activeOptionChips.map((c) => (
                  <Chip
                    key={c.key}
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={c.label}
                    onDelete={c.onDelete}
                  />
                ))}
              </Stack>
            ) : null}
          </Paper>

          <TablePro
            rows={filteredItems}
            columns={columns}
            title="VALOR"
            showIndex
            defaultRowsPerPage={25}
            rowsPerPageOptions={[25, 50, 100]}
            loading={false}
            getRowId={(row) => row.productId ?? row.id}
          />
        </>
      )}
    </Container>
  );
}
