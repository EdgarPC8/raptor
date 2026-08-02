import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  TablePagination,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import TuneIcon from "@mui/icons-material/Tune";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  getStoresRequest,
  getStoreStocksRequest,
  getStoreProductsRequest,
  getStoreExhibidoresRequest,
  createStoreExhibidorRequest,
  updateStoreExhibidorRequest,
  deleteStoreExhibidorRequest,
  setStoreProductExhibidorRequest,
  addProductsToStoreRequest,
  toggleStoreProductRequest,
  registerMovement,
} from "../../../../api/inventoryControlRequest";
import { buildImageUrl } from "../../../../api/axios";
import { useAuth } from "../../../../context/AuthContext";
import {
  formatProductCategoryName,
  productMatchesCategoryFilter,
} from "../../../../utils/categoryUtils.js";
import {
  locationKindLabel,
  normalizeLocationKind,
  sortStoresByKind,
  storeHoldsInventory,
} from "../../../../utils/storeLocationKind.js";

/**
 * Vista por local (multistock): stock con movimiento, exhibidores y filtros.
 */
export default function ProductsByStoreView({
  products = [],
  categoryFilter = "",
  onEdit,
  onReload,
  loading: productsLoading = false,
}) {
  const { toast: toastAuth } = useAuth();
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState("");
  const [stocksMap, setStocksMap] = useState({});
  const [linksMap, setLinksMap] = useState({}); // productId → { isActive, exhibidorId, linkId }
  const [exhibidores, setExhibidores] = useState([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | visible
  const [exhibidorFilter, setExhibidorFilter] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [newExhibidorName, setNewExhibidorName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [saving, setSaving] = useState(false);

  const inventoryStores = useMemo(
    () =>
      sortStoresByKind(
        (stores || []).filter((s) => storeHoldsInventory(s.locationKind)),
      ),
    [stores],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await getStoresRequest();
        const list = Array.isArray(data) ? data : data?.data || [];
        if (!alive) return;
        setStores(list);
        const inv = sortStoresByKind(
          list.filter((s) => storeHoldsInventory(s.locationKind)),
        );
        const bodega = inv.find(
          (s) => normalizeLocationKind(s.locationKind) === "bodega",
        );
        setStoreId((prev) => {
          if (prev && inv.some((s) => String(s.id) === String(prev))) return prev;
          return bodega ? String(bodega.id) : inv[0] ? String(inv[0].id) : "";
        });
      } catch {
        if (alive) setStores([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const refreshLocalData = useCallback(async (sid, { silent = false } = {}) => {
    if (!sid) {
      setStocksMap({});
      setLinksMap({});
      setExhibidores([]);
      return;
    }
    try {
      if (!silent) setStocksLoading(true);
      const [stocksRes, linksRes, exRes] = await Promise.all([
        getStoreStocksRequest(sid),
        getStoreProductsRequest(sid, { activeOnly: false }).catch(() => ({ data: [] })),
        getStoreExhibidoresRequest(sid).catch(() => ({ data: [] })),
      ]);

      const map = { ...(stocksRes.data?.byProductId || {}) };
      for (const row of stocksRes.data?.stocks || []) {
        map[String(row.productId)] = Number(row.quantity || 0);
      }
      setStocksMap(map);

      const lm = {};
      for (const link of Array.isArray(linksRes.data) ? linksRes.data : []) {
        lm[String(link.productId)] = {
          isActive: link.isActive !== false,
          exhibidorId: link.exhibidorId ?? null,
          exhibidor: link.exhibidor || null,
          linkId: link.linkId,
        };
      }
      setLinksMap(lm);
      setExhibidores(Array.isArray(exRes.data) ? exRes.data : []);
    } catch {
      if (!silent) {
        setStocksMap({});
        setLinksMap({});
        setExhibidores([]);
      }
    } finally {
      if (!silent) setStocksLoading(false);
    }
  }, []);

  const patchLink = useCallback((productId, patch) => {
    const key = String(productId);
    setLinksMap((prev) => ({
      ...prev,
      [key]: {
        isActive: true,
        exhibidorId: null,
        exhibidor: null,
        linkId: null,
        ...prev[key],
        ...patch,
      },
    }));
  }, []);

  useEffect(() => {
    void refreshLocalData(storeId ? Number(storeId) : null);
  }, [storeId, refreshLocalData]);

  useEffect(() => {
    setPage(0);
  }, [storeId, search, categoryFilter, statusFilter, exhibidorFilter]);

  const selectedStore = useMemo(
    () => inventoryStores.find((s) => String(s.id) === String(storeId)),
    [inventoryStores, storeId],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products || [])
      .filter((p) => {
        if (!productMatchesCategoryFilter(p, categoryFilter)) return false;

        const link = linksMap[String(p.id)];
        if (statusFilter === "active" && p.isActive === false) return false;
        if (statusFilter === "visible") {
          if (!link || link.isActive === false) return false;
        }

        if (exhibidorFilter === "none") {
          if (link?.exhibidorId != null) return false;
        } else if (exhibidorFilter) {
          if (Number(link?.exhibidorId) !== Number(exhibidorFilter)) return false;
        }

        if (!q) return true;
        const hay = `${p.name || ""} ${p.barcode || ""} ${p.sku || ""} ${p.id}`.toLowerCase();
        return hay.includes(q);
      })
      .map((p) => {
        const localQty = Number(stocksMap[String(p.id)] ?? stocksMap[p.id] ?? 0);
        const link = linksMap[String(p.id)] || null;
        return {
          ...p,
          localStock: Number.isFinite(localQty) ? localQty : 0,
          storeLink: link,
          inCatalog: !!link,
          catalogVisible: link ? link.isActive !== false : false,
          exhibidorId: link?.exhibidorId ?? null,
        };
      })
      .sort((a, b) => {
        if (b.localStock !== a.localStock) return b.localStock - a.localStock;
        return String(a.name || "").localeCompare(String(b.name || ""), "es");
      });
  }, [
    products,
    stocksMap,
    linksMap,
    search,
    categoryFilter,
    statusFilter,
    exhibidorFilter,
  ]);

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, page, rowsPerPage]);

  const withStockCount = useMemo(
    () => rows.filter((r) => Number(r.localStock) > 0).length,
    [rows],
  );

  const loading = productsLoading || stocksLoading;

  const createExhibidor = async () => {
    if (!storeId) return;
    const name = newExhibidorName.trim();
    if (!name) return;
    try {
      const res = await toastAuth({
        promise: createStoreExhibidorRequest(Number(storeId), { name }),
        successMessage: "Exhibidor creado",
      });
      setNewExhibidorName("");
      const created = res?.data?.exhibidor ?? res?.data ?? res;
      if (created?.id != null) {
        setExhibidores((prev) => [...prev, created]);
      } else {
        await refreshLocalData(Number(storeId), { silent: true });
      }
    } catch {
      /* toast */
    }
  };

  const renameExhibidor = async (ex) => {
    const name = window.prompt("Nuevo nombre del exhibidor", ex.name);
    if (!name?.trim() || name.trim() === ex.name) return;
    const nextName = name.trim();
    try {
      await updateStoreExhibidorRequest(Number(storeId), ex.id, {
        name: nextName,
      });
      setExhibidores((prev) =>
        prev.map((e) => (Number(e.id) === Number(ex.id) ? { ...e, name: nextName } : e)),
      );
      setLinksMap((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (Number(next[key]?.exhibidorId) === Number(ex.id)) {
            next[key] = {
              ...next[key],
              exhibidor: { ...(next[key].exhibidor || {}), id: ex.id, name: nextName },
            };
          }
        }
        return next;
      });
    } catch {
      /* ignore */
    }
  };

  const removeExhibidor = async (ex) => {
    if (
      !window.confirm(
        `¿Eliminar exhibidor "${ex.name}"? Los productos quedan sin exhibidor (stock intacto).`,
      )
    ) {
      return;
    }
    try {
      await deleteStoreExhibidorRequest(Number(storeId), ex.id);
      setExhibidores((prev) => prev.filter((e) => Number(e.id) !== Number(ex.id)));
      setLinksMap((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (Number(next[key]?.exhibidorId) === Number(ex.id)) {
            next[key] = { ...next[key], exhibidorId: null, exhibidor: null };
          }
        }
        return next;
      });
    } catch {
      /* ignore */
    }
  };

  const changeExhibidor = async (productId, value) => {
    if (!storeId) return;
    const key = String(productId);
    const prevLink = linksMap[key] || null;
    const exhibidorId =
      value === "" || value === "none" ? null : Number(value);
    const ex = exhibidorId
      ? exhibidores.find((e) => Number(e.id) === Number(exhibidorId))
      : null;

    // UI inmediata: sin recargar la tabla
    patchLink(productId, {
      isActive: prevLink?.isActive !== false,
      exhibidorId,
      exhibidor: ex
        ? { id: ex.id, name: ex.name, position: ex.position, isActive: ex.isActive }
        : null,
    });

    try {
      if (!prevLink) {
        await addProductsToStoreRequest(Number(storeId), [Number(productId)]);
      }
      await setStoreProductExhibidorRequest(
        Number(storeId),
        Number(productId),
        exhibidorId,
      );
    } catch (err) {
      // revertir si falla
      if (prevLink) {
        patchLink(productId, prevLink);
      } else {
        setLinksMap((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
      toastAuth({
        promise: Promise.reject(err),
        onError: (res) => ({
          title: "Exhibidor",
          description: res?.response?.data?.message || "No se pudo asignar",
        }),
      });
    }
  };

  const toggleCatalogVisible = async (row) => {
    if (!storeId) return;
    const key = String(row.id);
    const prevLink = linksMap[key] || null;
    try {
      if (!row.inCatalog) {
        patchLink(row.id, { isActive: true, exhibidorId: null, exhibidor: null });
        await addProductsToStoreRequest(Number(storeId), [Number(row.id)]);
        return;
      }
      const nextVisible = !row.catalogVisible;
      patchLink(row.id, { isActive: nextVisible });
      await toggleStoreProductRequest(
        Number(storeId),
        Number(row.id),
        nextVisible,
      );
    } catch {
      if (prevLink) patchLink(row.id, prevLink);
      else {
        setLinksMap((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    }
  };

  const saveStockAdjust = async (row) => {
    if (!storeId) return;
    const nuevo = Number(String(editQty).replace(",", "."));
    const current = Number(row.localStock || 0);
    if (!Number.isFinite(nuevo) || nuevo < 0) {
      toastAuth({
        message: "Ingrese un stock válido (≥ 0).",
        variant: "warning",
      });
      return;
    }
    if (Math.abs(nuevo - current) < 1e-9) {
      setEditingId(null);
      return;
    }
    setSaving(true);
    try {
      await toastAuth({
        promise: registerMovement({
          productId: Number(row.id),
          type: "ajuste",
          reason: "AJUSTE_INVENTARIO",
          quantity: nuevo,
          storeId: Number(storeId),
          description: `Ajuste (${selectedStore?.name || "local"}): ${row.name} ${current} → ${nuevo}`,
          price: null,
          referenceType: null,
          referenceId: null,
        }),
        successMessage: "Ajuste registrado en movimientos",
      });
      setEditingId(null);
      setEditQty("");
      setStocksMap((prev) => ({ ...prev, [String(row.id)]: nuevo }));
      onReload?.();
    } catch {
      /* toast */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 2.5, borderRadius: 2 }}>
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ sm: "center" }}
          flexWrap="wrap"
          useFlexGap
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <StorefrontIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={600}>
              Por local
            </Typography>
          </Stack>

          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id="products-by-store-label">Local</InputLabel>
            <Select
              labelId="products-by-store-label"
              label="Local"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              disabled={!inventoryStores.length}
            >
              {inventoryStores.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name} · {locationKindLabel(s.locationKind)}
                  {s.isActive === false ? " (inactivo)" : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <ToggleButtonGroup
            size="small"
            exclusive
            value={statusFilter}
            onChange={(_, v) => v && setStatusFilter(v)}
          >
            <ToggleButton value="all">Todos</ToggleButton>
            <ToggleButton value="active">Activos</ToggleButton>
            <ToggleButton value="visible">Visibles</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            select
            size="small"
            label="Exhibidor"
            value={exhibidorFilter}
            onChange={(e) => setExhibidorFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="none">Sin exhibidor</MenuItem>
            {exhibidores.map((ex) => (
              <MenuItem key={ex.id} value={String(ex.id)}>
                {ex.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            placeholder="Buscar producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 200, flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />

          {selectedStore ? (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={`${withStockCount} con stock · ${rows.length} listados`}
            />
          ) : null}
        </Stack>

        {storeId ? (
          <Paper variant="outlined" sx={{ p: 1.25 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              Exhibidores (organización)
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mb: 1 }}
            >
              No llevan stock propio. El inventario es por local; los ajustes generan movimiento tipo
              ajuste.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1 }}>
              <TextField
                size="small"
                label="Nuevo exhibidor"
                placeholder="Ej. Vitrina 1, Mostrador…"
                value={newExhibidorName}
                onChange={(e) => setNewExhibidorName(e.target.value)}
                fullWidth
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void createExhibidor();
                  }
                }}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => void createExhibidor()}
                sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
              >
                Crear
              </Button>
            </Stack>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {exhibidores.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                  Sin exhibidores en este local.
                </Typography>
              ) : (
                exhibidores.map((ex) => (
                  <Chip
                    key={ex.id}
                    size="small"
                    label={ex.name}
                    onClick={() => renameExhibidor(ex)}
                    onDelete={() => void removeExhibidor(ex)}
                    deleteIcon={<DeleteIcon fontSize="small" />}
                    variant="outlined"
                  />
                ))
              )}
            </Stack>
          </Paper>
        ) : null}

        <Alert severity="info" sx={{ py: 0.5 }}>
          <strong>Activos</strong> = producto activo en el sistema.{" "}
          <strong>Visibles</strong> = en el catálogo del local y marcados visibles (ojo). Bodega y
          sucursales inventariables aparecen en el selector.
        </Alert>
      </Stack>

      {!inventoryStores.length ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          No hay Bodega ni sucursales con inventario.
        </Typography>
      ) : loading ? (
        <Stack alignItems="center" py={6}>
          <CircularProgress size={32} />
        </Stack>
      ) : (
        <>
          <Box
            sx={{
              overflow: "auto",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell width={56}>Img</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Exhibidor</TableCell>
                  <TableCell align="right">Stock local</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="center">Catálogo</TableCell>
                  <TableCell align="center" width={100}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Ningún producto coincide con el filtro.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((p) => {
                    const src = buildImageUrl(p.primaryImageUrl);
                    const local = Number(p.localStock || 0);
                    const editing = editingId === p.id;
                    return (
                      <TableRow key={p.id} hover>
                        <TableCell
                          sx={{ cursor: onEdit ? "pointer" : "default" }}
                          onClick={() => !editing && onEdit?.(p)}
                        >
                          {src ? (
                            <Box
                              component="img"
                              src={src}
                              alt=""
                              sx={{
                                width: 40,
                                height: 40,
                                objectFit: "cover",
                                borderRadius: 1,
                                display: "block",
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 1,
                                bgcolor: "action.hover",
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell
                          sx={{ cursor: onEdit ? "pointer" : "default" }}
                          onClick={() => !editing && onEdit?.(p)}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            {p.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {[p.barcode, p.sku].filter(Boolean).join(" · ") ||
                              `ID ${p.id}`}
                            {p.isActive === false ? " · inactivo" : ""}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatProductCategoryName(p)}
                          </Typography>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <TextField
                            select
                            size="small"
                            value={
                              p.exhibidorId != null ? String(p.exhibidorId) : ""
                            }
                            onChange={(e) =>
                              void changeExhibidor(p.id, e.target.value)
                            }
                            sx={{ minWidth: 130 }}
                          >
                            <MenuItem value="">Sin exhibidor</MenuItem>
                            {exhibidores.map((ex) => (
                              <MenuItem key={ex.id} value={String(ex.id)}>
                                {ex.name}
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          {editing ? (
                            <TextField
                              size="small"
                              type="number"
                              value={editQty}
                              onChange={(e) => setEditQty(e.target.value)}
                              inputProps={{ min: 0, step: "any" }}
                              sx={{ width: 90 }}
                              autoFocus
                            />
                          ) : (
                            <Chip
                              size="small"
                              label={local}
                              color={local > 0 ? "success" : "default"}
                              variant={local > 0 ? "filled" : "outlined"}
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {Number.isFinite(Number(p.stock))
                            ? Number(p.stock)
                            : "—"}
                        </TableCell>
                        <TableCell
                          align="center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Tooltip
                            title={
                              p.catalogVisible
                                ? "Visible en catálogo del local"
                                : p.inCatalog
                                  ? "Oculto en catálogo del local"
                                  : "No está en el catálogo (clic para añadir)"
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={() => void toggleCatalogVisible(p)}
                            >
                              {p.catalogVisible ? (
                                <VisibilityIcon fontSize="small" />
                              ) : (
                                <VisibilityOffIcon fontSize="small" color="disabled" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        <TableCell
                          align="center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {editing ? (
                            <Stack direction="row" spacing={0.25} justifyContent="center">
                              <IconButton
                                size="small"
                                color="primary"
                                disabled={saving}
                                onClick={() => void saveStockAdjust(p)}
                              >
                                <SaveIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditQty("");
                                }}
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          ) : (
                            <Tooltip title="Ajustar stock (crea movimiento)">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingId(p.id);
                                  setEditQty(String(local));
                                }}
                              >
                                <TuneIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
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
            rowsPerPageOptions={[25, 50, 100]}
            labelRowsPerPage="Filas"
          />
        </>
      )}
    </Paper>
  );
}
