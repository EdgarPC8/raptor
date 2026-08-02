import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import {
  getAllProductsAll,
  getStoreStocksRequest,
  transferStoreStockRequest,
  patchProductStockRequest,
} from "../../../api/inventoryControlRequest";
import SearchableSelect from "../../../components/SearchableSelect.jsx";
import { useAuth } from "../../../context/AuthContext";
import {
  locationKindLabel,
  normalizeLocationKind,
} from "../../../utils/storeLocationKind.js";
import TuneIcon from "@mui/icons-material/Tune";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";

function normalizeProductList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 1.5 }}>{children}</Box>;
}

function availInMap(map, productId) {
  const n = Number(map?.[String(productId)] ?? map?.[productId] ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Panel de stock + lista de traspasos (reutilizable en diálogo o en editar local).
 */
export function StoreStockManager({
  store,
  inventoryStores = [],
  productsSlot = null,
  embedded = false,
  defaultTab = 0,
}) {
  const { toast: toastAuth, user } = useAuth();
  const isProgrammer = user?.loginRol === "Programador";
  const [tab, setTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [filter, setFilter] = useState("");
  const [catalog, setCatalog] = useState([]);

  const [fromStoreId, setFromStoreId] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [lines, setLines] = useState([]);
  const [fromStocksMap, setFromStocksMap] = useState({});
  const [fromLoading, setFromLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [lastMsg, setLastMsg] = useState("");

  /** Programador: fijar stock absoluto en este local (sin movimiento). */
  const [editProductId, setEditProductId] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [savingAdjust, setSavingAdjust] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState("");
  const [adjustQty, setAdjustQty] = useState("");

  const storeId = store?.id ? Number(store.id) : null;
  const kind = normalizeLocationKind(store?.locationKind);

  const otherInventory = useMemo(
    () =>
      (inventoryStores || []).filter((s) => Number(s.id) !== storeId && s.isActive !== false),
    [inventoryStores, storeId],
  );

  const bodega = useMemo(
    () => (inventoryStores || []).find((s) => normalizeLocationKind(s.locationKind) === "bodega"),
    [inventoryStores],
  );

  const loadStocks = useCallback(async () => {
    if (!storeId) {
      setStocks([]);
      return;
    }
    try {
      setLoading(true);
      const { data } = await getStoreStocksRequest(storeId);
      setStocks(Array.isArray(data?.stocks) ? data.stocks : []);
    } catch (err) {
      setStocks([]);
      toastAuth({
        promise: Promise.reject(err),
        onError: (res) => ({
          title: "Stock del local",
          description: res?.response?.data?.message || "No se pudo cargar el stock",
        }),
      });
    } finally {
      setLoading(false);
    }
  }, [storeId, toastAuth]);

  const loadCatalog = useCallback(async () => {
    try {
      const { data } = await getAllProductsAll();
      setCatalog(normalizeProductList(data));
    } catch {
      setCatalog([]);
    }
  }, []);

  const loadFromStocks = useCallback(async (sid) => {
    if (!sid) {
      setFromStocksMap({});
      return;
    }
    try {
      setFromLoading(true);
      const { data } = await getStoreStocksRequest(sid);
      setFromStocksMap(data?.byProductId || {});
    } catch {
      setFromStocksMap({});
    } finally {
      setFromLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!storeId) return;
    setTab(defaultTab);
    setFilter("");
    setLastMsg("");
    setProductId("");
    setQty("");
    setLines([]);
    setToStoreId(String(storeId));
    const bodegaId = bodega?.id != null ? Number(bodega.id) : null;
    const fallbackOther = otherInventory[0];
    const defaultFrom =
      bodegaId && bodegaId !== storeId
        ? String(bodegaId)
        : fallbackOther
          ? String(fallbackOther.id)
          : "";
    setFromStoreId(defaultFrom);
    loadStocks();
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  useEffect(() => {
    loadFromStocks(fromStoreId ? Number(fromStoreId) : null);
  }, [fromStoreId, loadFromStocks]);

  const saveAbsoluteStock = useCallback(
    async (productIdToSet, quantity) => {
      if (!storeId || !isProgrammer) return;
      const pid = Number(productIdToSet);
      const n = Number(quantity);
      if (!Number.isFinite(pid) || pid <= 0) {
        throw new Error("Producto inválido");
      }
      if (!Number.isFinite(n) || n < 0) {
        throw new Error("Cantidad inválida");
      }
      await toastAuth({
        promise: patchProductStockRequest(pid, { stock: n, storeId }),
        successMessage: `Stock del local fijado en ${n}`,
      });
      await loadStocks();
    },
    [storeId, isProgrammer, toastAuth, loadStocks],
  );

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return stocks;
    return stocks.filter((r) => {
      const p = r.product || {};
      const hay = `${p.name || ""} ${p.sku || ""} ${p.barcode || ""} ${r.productId}`.toLowerCase();
      return hay.includes(q);
    });
  }, [stocks, filter]);

  const productOptions = useMemo(() => {
    return catalog
      .filter((p) => p?.isActive !== false)
      .map((p) => {
        const avail = availInMap(fromStocksMap, p.id);
        return { ...p, _avail: avail };
      })
      .sort(
        (a, b) =>
          (b._avail || 0) - (a._avail || 0) ||
          String(a.name || "").localeCompare(String(b.name || "")),
      );
  }, [catalog, fromStocksMap]);

  const availableAtFrom = useMemo(() => {
    if (!productId) return null;
    return availInMap(fromStocksMap, productId);
  }, [fromStocksMap, productId]);

  const catalogById = useMemo(() => {
    const m = new Map();
    for (const p of catalog) m.set(Number(p.id), p);
    return m;
  }, [catalog]);

  const addLine = ({ productId: pid, quantity, name } = {}) => {
    const id = Number(pid);
    const q = Number(quantity);
    if (!Number.isFinite(id) || id <= 0) return;
    if (!(q > 0)) {
      toastAuth({
        promise: Promise.reject(new Error("qty")),
        onError: () => ({
          title: "Lista de traspaso",
          description: "Indica una cantidad mayor a 0.",
        }),
      });
      return;
    }
    const avail = availInMap(fromStocksMap, id);
    if (avail > 0 && q > avail + 1e-9) {
      toastAuth({
        promise: Promise.reject(new Error("avail")),
        onError: () => ({
          title: "Lista de traspaso",
          description: `Solo hay ${avail} disponible en el origen.`,
        }),
      });
      return;
    }
    const product = catalogById.get(id);
    const label = name || product?.name || `Producto #${id}`;
    setLines((prev) => {
      const idx = prev.findIndex((l) => Number(l.productId) === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: Number(next[idx].quantity) + q,
          avail,
        };
        return next;
      }
      return [
        ...prev,
        {
          key: `${id}-${Date.now()}`,
          productId: id,
          name: label,
          quantity: q,
          avail,
        },
      ];
    });
    setProductId("");
    setQty("");
    setLastMsg("");
  };

  const addFromStockRow = (row) => {
    const q = Number(row.quantity || 0);
    if (!(q > 0)) return;
    setTab(1);
    setFromStoreId(String(storeId));
    const dest =
      bodega && Number(bodega.id) !== storeId
        ? String(bodega.id)
        : otherInventory[0]
          ? String(otherInventory[0].id)
          : "";
    setToStoreId(dest);
    const p = row.product || {};
    const id = Number(row.productId);
    setLines((prev) => {
      const idx = prev.findIndex((l) => Number(l.productId) === id);
      const entry = {
        key: `${id}-${Date.now()}`,
        productId: id,
        name: p.name || `Producto #${id}`,
        quantity: q,
        avail: q,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: q, avail: q };
        return next;
      }
      return [...prev, entry];
    });
  };

  const updateLineQty = (key, value) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, quantity: value } : l)),
    );
  };

  const removeLine = (key) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const handleTransferList = async () => {
    const from = Number(fromStoreId);
    const to = Number(toStoreId);
    if (!from || !to || from === to) {
      toastAuth({
        promise: Promise.reject(new Error("stores")),
        onError: () => ({
          title: "Traspaso",
          description: "Origen y destino deben ser distintos.",
        }),
      });
      return;
    }
    const items = lines
      .map((l) => ({
        productId: Number(l.productId),
        quantity: Number(l.quantity),
      }))
      .filter((l) => l.productId > 0 && l.quantity > 0);
    if (!items.length) {
      toastAuth({
        promise: Promise.reject(new Error("empty")),
        onError: () => ({
          title: "Traspaso",
          description: "Añade al menos un producto a la lista.",
        }),
      });
      return;
    }
    try {
      setTransferring(true);
      const { data } = await transferStoreStockRequest({
        fromStoreId: from,
        toStoreId: to,
        items,
      });
      setLastMsg(data?.message || "Lista traspasada.");
      setLines([]);
      await loadStocks();
      await loadFromStocks(from);
      toastAuth({
        promise: Promise.resolve(data),
        onSuccess: () => ({
          title: "Traspaso de lista",
          description: data?.message || "Listo",
        }),
      });
    } catch (err) {
      toastAuth({
        promise: Promise.reject(err),
        onError: (res) => ({
          title: "Traspaso",
          description: res?.response?.data?.message || err?.message || "Falló el traspaso",
        }),
      });
    } finally {
      setTransferring(false);
    }
  };

  const storeOptions = useMemo(() => {
    const list = (inventoryStores || []).filter((s) => s.isActive !== false);
    return list.map((s) => ({
      id: s.id,
      name: `${s.name} (${locationKindLabel(s.locationKind)})`,
    }));
  }, [inventoryStores]);

  const totalUnits = useMemo(
    () => stocks.reduce((acc, r) => acc + Number(r.quantity || 0), 0),
    [stocks],
  );

  const listTotalQty = useMemo(
    () => lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0),
    [lines],
  );

  const header = (
    <Stack spacing={0.25} sx={{ mb: embedded ? 1 : 0 }}>
      <Typography variant={embedded ? "subtitle1" : "h6"} fontWeight={800}>
        Stock · {store?.name || "—"}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {locationKindLabel(kind)} · {stocks.length} productos ·{" "}
        {totalUnits.toLocaleString("es-EC", { maximumFractionDigits: 2 })} uds en este local
      </Typography>
    </Stack>
  );

  const body = (
    <>
      {embedded ? header : null}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: "divider", mb: 0.5 }}
      >
        <Tab label="Tabla de stock" />
        <Tab
          label={`Lista de traspaso${lines.length ? ` (${lines.length})` : ""}`}
          icon={<SwapHorizIcon />}
          iconPosition="start"
        />
        {productsSlot ? <Tab label="Catálogo del local" /> : null}
      </Tabs>

      <TabPanel value={tab} index={0}>
        <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
          Productos con stock <strong>en este local</strong> (Bodega o sucursal). Para mover varios,
          usa “A la lista” y confirma en la pestaña de traspaso.
          {isProgrammer
            ? " Como Programador puedes fijar la cantidad exacta aquí (sin crear movimiento)."
            : ""}
        </Alert>

        {isProgrammer ? (
          <Paper variant="outlined" sx={{ p: 1.25, mb: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <TuneIcon fontSize="small" color="warning" />
              <Typography variant="subtitle2">Ajuste Programador (sin movimiento)</Typography>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "flex-start" }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <SearchableSelect
                  label="Producto"
                  items={catalog}
                  value={adjustProductId}
                  onChange={(v) => setAdjustProductId(v === "" || v == null ? "" : String(v))}
                  getOptionLabel={(item) => item?.name || ""}
                  getSearchText={(item) =>
                    `${item?.name || ""} ${item?.sku || ""} ${item?.barcode || ""} ${item?.id || ""}`
                  }
                  placeholder="Buscar producto…"
                />
              </Box>
              <TextField
                size="small"
                type="number"
                label="Cantidad en este local"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                inputProps={{ min: 0, step: "any" }}
                sx={{ width: { xs: "100%", sm: 160 } }}
              />
              <Button
                variant="contained"
                color="warning"
                disabled={savingAdjust || !adjustProductId}
                sx={{ mt: { sm: 0.5 }, whiteSpace: "nowrap" }}
                onClick={async () => {
                  try {
                    setSavingAdjust(true);
                    await saveAbsoluteStock(adjustProductId, adjustQty);
                    setAdjustProductId("");
                    setAdjustQty("");
                  } catch {
                    /* toast */
                  } finally {
                    setSavingAdjust(false);
                  }
                }}
              >
                Fijar stock
              </Button>
            </Stack>
          </Paper>
        ) : null}

        <TextField
          size="small"
          fullWidth
          placeholder="Buscar por nombre, SKU o código…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ mb: 1.5 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        {loading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={28} />
          </Stack>
        ) : filteredRows.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            Sin stock registrado aquí.
            {isProgrammer
              ? " Usa el ajuste Programador arriba o traspasa desde otro local."
              : " Traspasa desde otro local con la lista."}
          </Typography>
        ) : (
          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <Box sx={{ maxHeight: embedded ? 320 : 420, overflow: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">En este local</TableCell>
                    <TableCell align="right">Total sistema</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRows.map((row) => {
                    const p = row.product || {};
                    const q = Number(row.quantity || 0);
                    const editing = editProductId === row.productId;
                    return (
                      <TableRow key={row.productId} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {p.name || `Producto #${row.productId}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {[p.sku, p.barcode].filter(Boolean).join(" · ") ||
                              `ID ${row.productId}`}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {editing ? (
                            <TextField
                              size="small"
                              type="number"
                              value={editQty}
                              onChange={(e) => setEditQty(e.target.value)}
                              inputProps={{ min: 0, step: "any" }}
                              sx={{ width: 100 }}
                            />
                          ) : (
                            <Chip
                              size="small"
                              label={q}
                              color={q > 0 ? "success" : "default"}
                              variant={q > 0 ? "filled" : "outlined"}
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {p.stock != null ? Number(p.stock) : "—"}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            {isProgrammer && !editing ? (
                              <Tooltip title="Ajustar cantidad (Programador)">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditProductId(row.productId);
                                    setEditQty(String(q));
                                  }}
                                >
                                  <TuneIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                            {editing ? (
                              <>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  disabled={savingAdjust}
                                  onClick={async () => {
                                    try {
                                      setSavingAdjust(true);
                                      await saveAbsoluteStock(row.productId, editQty);
                                      setEditProductId(null);
                                      setEditQty("");
                                    } catch {
                                      /* toast */
                                    } finally {
                                      setSavingAdjust(false);
                                    }
                                  }}
                                >
                                  <SaveIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditProductId(null);
                                    setEditQty("");
                                  }}
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </>
                            ) : null}
                            {!editing && q > 0 ? (
                              <Button size="small" onClick={() => addFromStockRow(row)}>
                                A la lista
                              </Button>
                            ) : null}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        )}
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Alert severity="warning" sx={{ mb: 1.5, py: 0.5 }}>
          Arma la <strong>lista</strong> (varios productos), revisa cantidades y traspasa todo de
          una vez. Sale del origen y entra al destino.
        </Alert>

        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <TextField
              select
              size="small"
              label="Desde (origen)"
              value={fromStoreId}
              onChange={(e) => {
                setFromStoreId(e.target.value);
                setProductId("");
                setLines([]);
              }}
              fullWidth
            >
              {storeOptions.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Hacia (destino)"
              value={toStoreId}
              onChange={(e) => setToStoreId(e.target.value)}
              fullWidth
            >
              {storeOptions.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "flex-start" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <SearchableSelect
                label="Producto a añadir"
                items={productOptions}
                value={productId}
                onChange={(v) => setProductId(v === "" || v == null ? "" : String(v))}
                loading={fromLoading}
                getOptionLabel={(item) => {
                  if (!item) return "";
                  const avail = Number(item._avail || 0);
                  return avail > 0 ? `${item.name} · disp. ${avail}` : item.name || "";
                }}
                getSearchText={(item) =>
                  `${item?.name || ""} ${item?.sku || ""} ${item?.barcode || ""} ${item?.id || ""}`
                }
                placeholder="Buscar y añadir…"
              />
            </Box>
            <TextField
              size="small"
              type="number"
              label="Cantidad"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputProps={{ min: 0, step: "any" }}
              sx={{ width: { xs: "100%", sm: 120 } }}
            />
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              sx={{ mt: { sm: 0.5 }, whiteSpace: "nowrap" }}
              onClick={() =>
                addLine({
                  productId,
                  quantity: qty || availableAtFrom,
                  name: catalogById.get(Number(productId))?.name,
                })
              }
            >
              Añadir
            </Button>
          </Stack>

          {availableAtFrom != null && productId ? (
            <Typography variant="caption" color="text.secondary">
              Disponible en origen: <strong>{availableAtFrom}</strong>
              {availableAtFrom > 0 ? (
                <Button
                  size="small"
                  sx={{ ml: 1, textTransform: "none" }}
                  onClick={() => setQty(String(availableAtFrom))}
                >
                  Usar todo
                </Button>
              ) : null}
            </Typography>
          ) : null}

          <Stack direction="row" spacing={1} flexWrap="wrap">
            {bodega && Number(bodega.id) !== storeId ? (
              <Button
                size="small"
                variant="text"
                onClick={() => {
                  setFromStoreId(String(bodega.id));
                  setToStoreId(String(storeId));
                  setLines([]);
                }}
              >
                Plantilla: Bodega → este local
              </Button>
            ) : null}
            {bodega && Number(bodega.id) === storeId && otherInventory[0] ? (
              <Button
                size="small"
                variant="text"
                onClick={() => {
                  setFromStoreId(String(storeId));
                  setToStoreId(String(otherInventory[0].id));
                  setLines([]);
                }}
              >
                Plantilla: Bodega → sucursal
              </Button>
            ) : null}
          </Stack>

          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <Box sx={{ px: 1.5, py: 1, bgcolor: "action.hover" }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Lista a traspasar ({lines.length})
                {lines.length ? ` · ${listTotalQty} uds` : ""}
              </Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell align="right" width={120}>
                    Cantidad
                  </TableCell>
                  <TableCell align="right" width={90}>
                    Disp.
                  </TableCell>
                  <TableCell width={48} />
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 2.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Vacía. Busca productos arriba o usa “A la lista” en la tabla de stock.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((l) => (
                    <TableRow key={l.key} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {l.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={l.quantity}
                          onChange={(e) => updateLineQty(l.key, e.target.value)}
                          inputProps={{ min: 0, step: "any" }}
                          sx={{ width: 96 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="text.secondary">
                          {availInMap(fromStocksMap, l.productId) || l.avail || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Quitar">
                          <IconButton size="small" color="error" onClick={() => removeLine(l.key)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<SwapHorizIcon />}
              disabled={transferring || lines.length === 0}
              onClick={handleTransferList}
            >
              {transferring
                ? "Traspasando lista…"
                : `Traspasar lista (${lines.length})`}
            </Button>
            {lines.length ? (
              <Button color="inherit" onClick={() => setLines([])}>
                Vaciar lista
              </Button>
            ) : null}
            <Button onClick={loadStocks} disabled={loading}>
              Actualizar stock
            </Button>
          </Stack>

          {lastMsg ? (
            <Alert severity="success" sx={{ py: 0.5 }}>
              {lastMsg}
            </Alert>
          ) : null}
        </Stack>
      </TabPanel>

      {productsSlot ? (
        <TabPanel value={tab} index={2}>
          <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
            Catálogo del local: qué productos se ofrecen aquí (enlace). El{" "}
            <strong>stock físico</strong> está en las otras pestañas.
          </Alert>
          {productsSlot}
        </TabPanel>
      ) : null}
    </>
  );

  return body;
}

export default function StoreStockOrganizeDialog({
  open,
  onClose,
  store,
  inventoryStores = [],
  productsSlot = null,
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 0.5 }}>
        <Stack spacing={0.25}>
          <Typography variant="h6" fontWeight={800}>
            Stock · {store?.name || "—"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {locationKindLabel(normalizeLocationKind(store?.locationKind))} · tabla y lista de
            traspasos
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {open && store?.id ? (
          <StoreStockManager
            store={store}
            inventoryStores={inventoryStores}
            productsSlot={productsSlot}
          />
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
