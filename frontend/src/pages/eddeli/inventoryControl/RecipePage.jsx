import {
  Container,
  Button,
  IconButton,
  Tooltip,
  TextField,
  Grid,
  Typography,
  Box,
  Stack,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import { keyframes } from "@mui/system";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Edit,
  Delete,
  RestaurantMenu,
  NotificationsActive,
  PriceChange,
} from "@mui/icons-material";

import TablePro from "../../../components/Tables/TablePro";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import RecipeForm from "./components/RecipeForm";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import {
  getAllProductsAll,
  getRecipeByProduct,
  deleteRecipeRequest,
  getRecipeCosting,
  applyIngredientPriceAlerts,
} from "../../../api/inventoryControlRequest";
import CostingAccordionTable from "./components/CostingAccordionTable";
import SearchableSelect from "../../../components/SearchableSelect";
import { productIsRecipe, productIsSellable } from "../../../utils/productRoleFlags.js";

const fmt = (n, d = 2) =>
  typeof n === "number" && Number.isFinite(n) ? n.toFixed(d) : "—";

const fmtMoney = (n, d = 2) =>
  typeof n === "number" && Number.isFinite(n) ? `$${n.toFixed(d)}` : "—";

const fmtCostUnit = (n, unitLabel = "/g") => {
  if (!(typeof n === "number" && Number.isFinite(n))) return "—";
  const digits = unitLabel === "/u" ? 4 : 6;
  return `$${n.toFixed(digits)}${unitLabel}`;
};

const alertBlink = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.45); }
  50% { opacity: 0.55; box-shadow: 0 0 0 8px rgba(211, 47, 47, 0); }
`;

function asProductList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

/** Productos que pueden tener receta (fabricables / finales / intermedios). */
function canHaveRecipe(p) {
  if (!p) return false;
  if (productIsRecipe(p)) return true;
  if (p.type === "final" || p.type === "intermediate") return true;
  // Vendible que no es solo empaque enlazado (legado)
  if (productIsSellable(p) && !p.genericProductId) return true;
  return false;
}

function componentTypeLabel(type) {
  if (type === "intermediate") return "Intermedio";
  if (type === "raw") return "Insumo";
  if (type === "final") return "Final";
  return type || "—";
}

function statusLabel(status) {
  if (status === "outdated") return "Desactualizado";
  if (status === "up_to_date") return "Al día";
  if (status === "no_purchase") return "Sin compra de empaque";
  if (status === "no_link") return "Sin empaque enlazado";
  return status || "—";
}

function yieldOfPack(qty, unitLabel) {
  const n = Number(qty);
  if (!Number.isFinite(n) || n <= 0) return "";
  const shown = Number.isInteger(n) ? String(n) : n.toFixed(2);
  if (unitLabel === "/u") return `${shown} unidades`;
  if (unitLabel === "/ml") return `${shown} ml`;
  return `${shown} g`;
}

function purchaseDateLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

function PriceAlertsList({ alerts, emptyHint }) {
  if (!alerts?.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyHint || "No hay insumos con precio pendiente de actualizar."}
      </Typography>
    );
  }
  return (
    <Stack spacing={1.5}>
      {alerts.map((a) => {
        const yieldText = yieldOfPack(a.qtyIntoGeneric, a.unitLabel);
        const when = purchaseDateLabel(a.purchaseAt);
        return (
          <Paper key={a.genericId} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
              <Typography variant="subtitle2">{a.genericName}</Typography>
              <Chip
                size="small"
                color={
                  a.status === "outdated"
                    ? "warning"
                    : a.status === "up_to_date"
                      ? "success"
                      : "default"
                }
                label={statusLabel(a.status)}
              />
            </Stack>
            {a.proposedCost != null && (
              <Typography variant="body2" fontWeight={800} sx={{ mt: 0.75 }}>
                Precio sugerido: {fmtCostUnit(a.proposedCost, a.unitLabel)}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              {a.presentationName
                ? `Referencia: ${a.presentationName}${
                    Number(a.linkedCount) > 1 ? " · compra más reciente" : ""
                  }`
                : "Sin empaque enlazado"}
            </Typography>
            {a.presentationName && a.packUnitPrice != null && (
              <Typography variant="caption" color="text.secondary" display="block">
                Última compra: {fmtMoney(a.packUnitPrice, 2)}
                {when ? ` el ${when}` : ""}
                {yieldText ? ` · rinde ${yieldText}` : ""}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
              <Chip
                size="small"
                label={`Actual: ${fmtCostUnit(a.currentCost, a.unitLabel)}`}
                variant="outlined"
              />
              {a.proposedCost != null ? (
                <Chip
                  size="small"
                  color={a.differs ? (a.delta > 0 ? "warning" : "success") : "default"}
                  label={`En el insumo: ${fmtCostUnit(a.proposedCost, a.unitLabel)}`}
                />
              ) : (
                <Chip size="small" variant="outlined" label="Sin precio de compra" />
              )}
              {a.differs && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    a.delta > 0
                      ? `+${fmtCostUnit(a.delta, a.unitLabel)}`
                      : fmtCostUnit(a.delta, a.unitLabel)
                  }
                />
              )}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}

function RecipePage() {
  const { toast } = useAuth();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [recipe, setRecipe] = useState([]);
  const [open, setOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState([]);
  const [titleUserDialog, settitleUserDialog] = useState("");

  const [costSummary, setCostSummary] = useState(null);
  const [costTreeData, setCostTreeData] = useState(null);
  const [loadingCost, setLoadingCost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [priceAlerts, setPriceAlerts] = useState([]);
  const [priceComparisons, setPriceComparisons] = useState([]);
  const [priceAlertModalOpen, setPriceAlertModalOpen] = useState(false);
  const [priceAlertDetailOpen, setPriceAlertDetailOpen] = useState(false);
  const [applyingPrices, setApplyingPrices] = useState(false);
  const dismissedAlertsRef = useRef(new Set());
  const lastOfferedProductRef = useRef("");

  const [uiParams, setUiParams] = useState({
    extrasPercent: 20,
    laborPercent: 45,
    producedQty: 0,
  });

  const selectedMeta = useMemo(
    () => products.find((p) => String(p.id) === String(selectedProduct)),
    [products, selectedProduct],
  );

  const handleDialog = () => setOpen(!open);
  const handleDialogUser = () => setOpenDialog(!openDialog);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data } = await getAllProductsAll();
      const list = asProductList(data).filter(canHaveRecipe);
      setProducts(list);
      if (!list.length) {
        toast?.({
          message: "No hay productos para armar receta (finales / intermedios).",
          variant: "warning",
        });
      }
    } catch (e) {
      console.error("RecipePage fetchProducts:", e);
      setProducts([]);
      toast?.({
        message: e?.response?.data?.message || "No se pudieron cargar los productos",
        variant: "error",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchRecipe = async (productId) => {
    setLoading(true);
    try {
      const { data } = await getRecipeByProduct(productId);
      setRecipe(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchCostingData = async (productId, { offerModal = true } = {}) => {
    if (!productId) return;
    try {
      setLoadingCost(true);
      const params = {
        extrasPercent: Number(uiParams.extrasPercent) || 0,
        laborPercent: Number(uiParams.laborPercent) || 0,
        producedQty: Number(uiParams.producedQty) || 0,
      };
      const { data } = await getRecipeCosting(productId, params);
      setCostTreeData(data);
      setCostSummary(data.summary || null);
      const alerts = Array.isArray(data.ingredientPriceAlerts)
        ? data.ingredientPriceAlerts
        : [];
      const comparisons = Array.isArray(data.ingredientPriceComparisons)
        ? data.ingredientPriceComparisons
        : alerts;
      setPriceAlerts(alerts);
      setPriceComparisons(comparisons);
      const dismissKey = String(productId);
      if (
        offerModal &&
        alerts.length > 0 &&
        !dismissedAlertsRef.current.has(dismissKey)
      ) {
        setPriceAlertModalOpen(true);
      }
    } catch {
      toast({ message: "Error al calcular el costeo", variant: "error" });
      setPriceAlerts([]);
      setPriceComparisons([]);
    } finally {
      setLoadingCost(false);
    }
  };

  const dismissPriceAlerts = () => {
    if (selectedProduct) {
      dismissedAlertsRef.current.add(String(selectedProduct));
    }
    setPriceAlertModalOpen(false);
  };

  const applyPriceUpdates = async (ids) => {
    const genericIds = (ids || priceAlerts.map((a) => a.genericId)).filter(Boolean);
    if (!genericIds.length) return;
    setApplyingPrices(true);
    try {
      const { data } = await applyIngredientPriceAlerts(genericIds);
      toast?.({
        message: data?.message || "Precios de insumos actualizados",
        variant: "success",
      });
      setPriceAlertModalOpen(false);
      setPriceAlertDetailOpen(false);
      if (selectedProduct) {
        dismissedAlertsRef.current.delete(String(selectedProduct));
        await fetchCostingData(selectedProduct, { offerModal: false });
      }
    } catch (e) {
      toast?.({
        message:
          e?.response?.data?.message || "No se pudieron actualizar los precios",
        variant: "error",
      });
    } finally {
      setApplyingPrices(false);
    }
  };

  const deleteData = async () => {
    await runMutationReload(toast, {
      promise: deleteRecipeRequest(dataToDelete.id),
      reload: async () => {
        const { data } = await getRecipeByProduct(selectedProduct);
        setRecipe(data || []);
        fetchCostingData(selectedProduct, { offerModal: false });
      },
      onClose: handleDialog,
    });
  };

  const columns = [
    {
      label: "Componente",
      id: "rawProduct",
      width: 160,
      render: (row) => (
        <Box>
          <Typography variant="body2">{row.rawProduct?.name}</Typography>
          <Chip
            size="small"
            variant="outlined"
            label={componentTypeLabel(row.rawProduct?.type)}
            sx={{ mt: 0.5, height: 20, fontSize: "0.7rem" }}
          />
        </Box>
      ),
    },
    {
      label: "Cantidad",
      id: "quantity",
      width: 160,
      render: (row) => {
        if (!row.isQuantityInGrams) {
          return <Typography variant="body2">{row.quantity}</Typography>;
        }
        const g = Number(row.quantity);
        const kg = g / 1000;
        const lb = g / 453.592;
        return (
          <Box>
            <Typography variant="body2" fontWeight={700}>
              {Number.isInteger(g) ? g : g.toFixed(2)} g
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              ≈ {kg.toFixed(3)} kg · {lb.toFixed(3)} lb
            </Typography>
          </Box>
        );
      },
    },
    {
      label: "Unidad",
      id: "isQuantityInGrams",
      width: 90,
      render: (row) => (row.isQuantityInGrams ? "Gramos*" : "Unidades"),
    },
    { label: "Tipo costo", id: "itemType", width: 90 },
    {
      label: "Acciones",
      id: "actions",
      width: 120,
      render: (params) => (
        <>
          <Tooltip title="Editar">
            <IconButton
              onClick={() => {
                setDatos(params);
                setIsEditing(true);
                settitleUserDialog("Editar componente");
                handleDialogUser();
              }}
            >
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton
              onClick={() => {
                handleDialog();
                setDataToDelete(params);
              }}
            >
              <Delete />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  const t = costSummary?.totales || {};
  const acc = costSummary?.acumulados || {};
  const lote = costSummary?.lote || {};
  const rent = costSummary?.rentabilidad || {};
  const yieldInfo = costSummary?.yieldInfo || [];

  const loteHint = useMemo(() => {
    if (!lote.effectiveProducedQty) return "";
    if (lote.producedQtyAuto) {
      if (lote.unidad === "gramos") {
        const src =
          lote.rendimientoSource === "productionYieldGrams"
            ? "override manual"
            : "suma de insumos";
        return `Automático: ${fmt(lote.effectiveProducedQty, 0)} g (${src})`;
      }
      return "Automático: 1 unidad";
    }
    return `Manual: ${fmt(lote.effectiveProducedQty, lote.unidad === "gramos" ? 0 : 2)} ${lote.unidad}`;
  }, [lote]);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!selectedProduct) {
      setRecipe([]);
      setCostSummary(null);
      setCostTreeData(null);
      setPriceAlerts([]);
      setPriceComparisons([]);
      setPriceAlertModalOpen(false);
      lastOfferedProductRef.current = "";
      return;
    }
    fetchRecipe(selectedProduct);
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedProduct) return;
    const key = String(selectedProduct);
    const isNewProduct = lastOfferedProductRef.current !== key;
    if (isNewProduct) lastOfferedProductRef.current = key;
    fetchCostingData(selectedProduct, { offerModal: isNewProduct });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct, uiParams.extrasPercent, uiParams.laborPercent, uiParams.producedQty]);

  return (
    <Container>
      <SimpleDialog
        open={open}
        onClose={handleDialog}
        tittle="Eliminar componente"
        onClickAccept={deleteData}
      >
        ¿Está seguro de eliminar este componente de la receta?
      </SimpleDialog>

      <SimpleDialog open={openDialog} onClose={handleDialogUser} tittle={titleUserDialog}>
        <RecipeForm
          onClose={() => {
            handleDialogUser();
            fetchRecipe(selectedProduct);
            fetchCostingData(selectedProduct, { offerModal: false });
          }}
          isEditing={isEditing}
          datos={datos}
          reload={() => fetchRecipe(selectedProduct)}
          productFinalId={selectedProduct}
        />
      </SimpleDialog>

      <Dialog
        open={priceAlertModalOpen}
        onClose={dismissPriceAlerts}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PriceChange color="warning" />
          Actualizar precios de insumos
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            El precio por gramo sale de la última compra del empaque enlazado. Al
            actualizar, ese valor se guarda en el costo y en el precio del insumo genérico.
          </Typography>
          <PriceAlertsList alerts={priceAlerts} />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, gap: 1, flexWrap: "wrap" }}>
          <Button onClick={dismissPriceAlerts} disabled={applyingPrices}>
            Ahora no
          </Button>
          <Button
            onClick={() => {
              setPriceAlertModalOpen(false);
              setPriceAlertDetailOpen(true);
            }}
            disabled={applyingPrices}
          >
            Ver todos
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => applyPriceUpdates()}
            disabled={applyingPrices || !priceAlerts.length}
            startIcon={
              applyingPrices ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            Actualizar todos
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={priceAlertDetailOpen}
        onClose={() => setPriceAlertDetailOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Precios de insumos vs última compra</DialogTitle>
        <DialogContent dividers>
          {priceAlerts.length > 0 && (
            <Typography variant="body2" color="warning.main" sx={{ mb: 1.5 }}>
              {priceAlerts.length} pendiente(s) de actualizar.
            </Typography>
          )}
          <PriceAlertsList
            alerts={priceComparisons}
            emptyHint="Esta receta no tiene insumos genéricos enlazados a empaque, o aún no hay compras."
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, gap: 1 }}>
          <Button onClick={() => setPriceAlertDetailOpen(false)} disabled={applyingPrices}>
            Cerrar
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => applyPriceUpdates()}
            disabled={applyingPrices || !priceAlerts.length}
            startIcon={
              applyingPrices ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            Actualizar pendientes
          </Button>
        </DialogActions>
      </Dialog>

      <Grid container spacing={2}>
        <Grid item xs={12} mt={2}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <SearchableSelect
                label="Producto (final o intermedio)"
                items={products}
                value={selectedProduct}
                productMeta
                loading={loadingProducts}
                onChange={(val) => {
                  setSelectedProduct(val);
                  setUiParams((p) => ({ ...p, producedQty: 0 }));
                  setPriceAlerts([]);
                  setPriceComparisons([]);
                  setPriceAlertModalOpen(false);
                }}
              />
            </Box>
            {selectedProduct && (
              <Tooltip
                title={
                  priceAlerts.length > 0
                    ? "Hay insumos con precio distinto a la última compra"
                    : "Ver precios de insumos vs última compra"
                }
              >
                <Badge
                  badgeContent={priceAlerts.length || null}
                  color="error"
                  overlap="circular"
                >
                  <IconButton
                    color={priceAlerts.length > 0 ? "warning" : "default"}
                    onClick={() =>
                      priceAlerts.length > 0
                        ? setPriceAlertModalOpen(true)
                        : setPriceAlertDetailOpen(true)
                    }
                    sx={{
                      mt: 0.5,
                      ...(priceAlerts.length > 0
                        ? {
                            animation: `${alertBlink} 1.2s ease-in-out infinite`,
                            bgcolor: "warning.light",
                            "&:hover": {
                              bgcolor: "warning.main",
                              color: "common.white",
                            },
                          }
                        : {
                            bgcolor: "action.hover",
                          }),
                    }}
                    aria-label="Precios de insumos"
                  >
                    <NotificationsActive />
                  </IconButton>
                </Badge>
              </Tooltip>
            )}
          </Stack>
          {!loadingProducts && !products.length ? (
            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
              Sin productos cargados. Revisá la conexión o que existan finales / intermedios.
            </Typography>
          ) : null}
          {selectedMeta && (
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
              <Chip size="small" label={selectedMeta.type === "intermediate" ? "Intermedio" : "Final"} />
              <Chip
                size="small"
                variant="outlined"
                label={`Venta: ${fmtMoney(Number(selectedMeta.price || 0))}`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`Distribuidor: ${fmtMoney(Number(selectedMeta.distributorPrice || 0))}`}
              />
              <Chip
                size="small"
                color={priceAlerts.length > 0 ? "warning" : "default"}
                variant={priceAlerts.length > 0 ? "filled" : "outlined"}
                icon={<PriceChange />}
                label={
                  priceAlerts.length > 0
                    ? `${priceAlerts.length} precio(s) por actualizar`
                    : "Revisar precios insumos"
                }
                onClick={() =>
                  priceAlerts.length > 0
                    ? setPriceAlertModalOpen(true)
                    : setPriceAlertDetailOpen(true)
                }
              />
            </Stack>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <Button
            variant="text"
            endIcon={<RestaurantMenu />}
            onClick={() => {
              setIsEditing(false);
              settitleUserDialog("Agregar componente");
              handleDialogUser();
            }}
            disabled={!selectedProduct}
            sx={{ mb: 1 }}
          >
            Agregar componente
          </Button>

          <TablePro
            rows={recipe}
            columns={columns}
            defaultRowsPerPage={10}
            title="Receta"
            showIndex
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              position: { md: "sticky" },
              top: { md: 16 },
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Parámetros de costeo
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap", rowGap: 1 }}>
              <TextField
                label="Extras %"
                type="number"
                size="small"
                value={uiParams.extrasPercent}
                onChange={(e) =>
                  setUiParams((p) => ({ ...p, extrasPercent: Number(e.target.value || 0) }))
                }
                sx={{ width: 112 }}
                inputProps={{ min: 0, step: 1 }}
              />
              <TextField
                label="Mano de obra %"
                type="number"
                size="small"
                value={uiParams.laborPercent}
                onChange={(e) =>
                  setUiParams((p) => ({ ...p, laborPercent: Number(e.target.value || 0) }))
                }
                sx={{ width: 132 }}
                inputProps={{ min: 0, step: 1 }}
              />
              <TextField
                label="Cant. lote (0=auto)"
                type="number"
                size="small"
                value={uiParams.producedQty}
                onChange={(e) =>
                  setUiParams((p) => ({ ...p, producedQty: Number(e.target.value || 0) }))
                }
                sx={{ width: 148 }}
                inputProps={{ min: 0, step: "any" }}
              />
            </Stack>
            {loteHint && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                {loteHint}
                {loadingCost ? " · calculando…" : ""}
              </Typography>
            )}

            {costSummary && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Costo del lote
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 0.75,
                    columnGap: 2,
                  }}
                >
                  <Typography variant="body2">
                    Insumos: <b>{fmtMoney(t.subtotalInsumos)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Materiales: <b>{fmtMoney(t.subtotalMateriales)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Extras ({t.extrasPercentInt ?? 0}%): <b>{fmtMoney(t.extras)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Mano obra ({t.laborPercentInt ?? 0}%): <b>{fmtMoney(t.labor)}</b>
                  </Typography>
                  <Typography variant="body2" sx={{ gridColumn: "1 / -1" }}>
                    Total lote: <b>{fmtMoney(t.totalLote)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Gramos insumos: <b>{fmt(acc.totalPesoEnMasaGr, 0)} g</b>
                  </Typography>
                  <Typography variant="body2">
                    Costo / {lote.unidad === "gramos" ? "g" : "u"}:{" "}
                    <b>{fmtMoney(t.costoUnitario, 4)}</b>
                  </Typography>
                </Box>

                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Rentabilidad (producto seleccionado)
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 0.75,
                    columnGap: 2,
                  }}
                >
                  <Typography variant="body2">
                    Costo calc.: <b>{fmtMoney(rent.costoUnitario, 4)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Precio venta: <b>{fmtMoney(rent.precioConsumidor)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Precio distrib.: <b>{fmtMoney(rent.precioDistribuidor)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Ganancia venta:{" "}
                    <b
                      style={{
                        color:
                          rent.gananciaConsumidor != null && rent.gananciaConsumidor >= 0
                            ? "#2e7d32"
                            : "#c62828",
                      }}
                    >
                      {fmtMoney(rent.gananciaConsumidor, 4)}
                    </b>
                    {rent.margenConsumidorPct != null ? ` (${rent.margenConsumidorPct}%)` : ""}
                  </Typography>
                  <Typography variant="body2" sx={{ gridColumn: "1 / -1" }}>
                    Ganancia distribuidor:{" "}
                    <b
                      style={{
                        color:
                          rent.gananciaDistribuidor != null && rent.gananciaDistribuidor >= 0
                            ? "#2e7d32"
                            : "#c62828",
                      }}
                    >
                      {fmtMoney(rent.gananciaDistribuidor, 4)}
                    </b>
                    {rent.margenDistribuidorPct != null ? ` (${rent.margenDistribuidorPct}%)` : ""}
                  </Typography>
                </Box>

                {yieldInfo.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                      Rendimiento del lote → productos que salen
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Producto</TableCell>
                          <TableCell align="right">Unidades</TableCell>
                          <TableCell align="right">Costo/u*</TableCell>
                          <TableCell align="right">P. dist.</TableCell>
                          <TableCell align="right">Gan. dist.</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {yieldInfo.map((y) => (
                          <TableRow key={y.parentId}>
                            <TableCell>{y.parentName}</TableCell>
                            <TableCell align="right">
                              {y.unidad === "unidad"
                                ? fmt(y.unidadesPosiblesParent, 1)
                                : `${fmt(y.unidadesPosiblesParent, 0)} g`}
                            </TableCell>
                            <TableCell align="right">{fmtMoney(y.costoPorUnidadPadre, 4)}</TableCell>
                            <TableCell align="right">{fmtMoney(y.parentDistributorPrice)}</TableCell>
                            <TableCell align="right">{fmtMoney(y.gananciaVsDistribuidor, 4)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                      * Costo/u = solo este producto (masa/intermedio) por unidad del padre, sin
                      decoración ni otros insumos del padre.
                    </Typography>
                  </Box>
                )}

                {costSummary.advertencias?.length ? (
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {costSummary.advertencias.map((msg) => (
                      <Typography key={msg} variant="body2" color="warning.main">
                        {msg}
                      </Typography>
                    ))}
                  </Stack>
                ) : null}

                {costSummary.notas && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" color="text.secondary">
                      {costSummary.notas}
                    </Typography>
                  </>
                )}
              </>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Árbol de costos
          </Typography>
          {costTreeData && <CostingAccordionTable data={costTreeData} />}
        </Grid>
      </Grid>
    </Container>
  );
}

export default RecipePage;
