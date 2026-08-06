import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add,
  Delete,
  RemoveCircleOutline,
  Search,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import SearchableSelect from "../../../components/SearchableSelect.jsx";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import { pathImg } from "../../../api/axios";
import { useAuth } from "../../../context/AuthContext";
import {
  getStoreProductsRequest,
  addProductsToStoreRequest,
  removeProductFromStoreRequest,
  toggleStoreProductRequest,
  setStoreProductExhibidorRequest,
  getStoreExhibidoresRequest,
  createStoreExhibidorRequest,
  updateStoreExhibidorRequest,
  deleteStoreExhibidorRequest,
  getAllProductsAll,
  getCategories,
} from "../../../api/inventoryControlRequest";
import {
  buildCategoryFilterOptions,
  productMatchesCategoryFilter,
  indexCategories,
} from "../../../utils/categoryUtils.js";

function normalizeProductList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

function productPrice(p) {
  const n = Number(p?.price);
  return Number.isFinite(n) ? n : null;
}

function productStock(p) {
  const n = Number(p?.stock);
  return Number.isFinite(n) ? n : null;
}

function formatMoneyShort(n) {
  if (n == null) return "—";
  return `$${Number(n).toFixed(2)}`;
}

const linkerFieldSx = {
  m: 0,
  "& .MuiInputBase-root": { fontSize: "0.82rem" },
  "& .MuiInputLabel-root": { fontSize: "0.78rem" },
};

/**
 * Catálogo del local: enlazar productos, filtrar por categoría,
 * y asignar a exhibidores (solo organización; el stock sigue siendo por local).
 */
export default function StoreProductsLinker({
  storeId,
  pendingIds = [],
  onPendingChange,
  compact = false,
}) {
  const { toast: toastAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [pickId, setPickId] = useState("");
  const [busy, setBusy] = useState(false);
  const [filterAssigned, setFilterAssigned] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [exhibidorFilter, setExhibidorFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [exhibidores, setExhibidores] = useState([]);
  const [newExhibidorName, setNewExhibidorName] = useState("");
  const [assignExhibidorId, setAssignExhibidorId] = useState("");
  const [renameDialog, setRenameDialog] = useState({
    open: false,
    exhibidor: null,
    name: "",
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    exhibidor: null,
  });

  const categoryById = useMemo(() => indexCategories(categories), [categories]);
  const categoryOptions = useMemo(
    () => buildCategoryFilterOptions(categories),
    [categories],
  );

  const assignedIds = useMemo(() => {
    if (storeId) return new Set(links.map((l) => Number(l.productId)));
    return new Set((pendingIds || []).map(Number));
  }, [storeId, links, pendingIds]);

  const pickOptions = useMemo(() => {
    return catalog.filter((p) => {
      if (p?.isActive === false) return false;
      const t = String(p?.type || "").toLowerCase();
      if (t && t !== "final") return false;
      if (assignedIds.has(Number(p.id))) return false;
      return productMatchesCategoryFilter(p, categoryFilter, categoryById);
    });
  }, [catalog, assignedIds, categoryFilter, categoryById]);

  const pendingProducts = useMemo(() => {
    const map = new Map(catalog.map((p) => [Number(p.id), p]));
    return (pendingIds || []).map((id) => map.get(Number(id))).filter(Boolean);
  }, [catalog, pendingIds]);

  const loadCatalog = async () => {
    try {
      setCatalogLoading(true);
      const [{ data: products }, { data: cats }] = await Promise.all([
        getAllProductsAll(),
        getCategories().catch(() => ({ data: [] })),
      ]);
      setCatalog(normalizeProductList(products));
      setCategories(Array.isArray(cats) ? cats : cats?.data || []);
    } catch {
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  };

  const fetchLinks = async () => {
    if (!storeId) {
      setLinks([]);
      return;
    }
    try {
      setLoading(true);
      const { data } = await getStoreProductsRequest(storeId, { activeOnly: false });
      setLinks(Array.isArray(data) ? data : []);
    } catch (err) {
      toastAuth({
        promise: Promise.reject(err),
        onError: (res) => ({
          title: "Productos",
          description: res?.response?.data?.message || "No se pudo cargar",
        }),
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExhibidores = async () => {
    if (!storeId) {
      setExhibidores([]);
      return;
    }
    try {
      const { data } = await getStoreExhibidoresRequest(storeId);
      setExhibidores(Array.isArray(data) ? data : []);
    } catch {
      setExhibidores([]);
    }
  };

  useEffect(() => {
    void loadCatalog();
  }, []);

  useEffect(() => {
    void fetchLinks();
    void fetchExhibidores();
    setPickId("");
    setExhibidorFilter("");
    setAssignExhibidorId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const addProduct = async (productId) => {
    const id = Number(productId);
    if (!Number.isFinite(id) || assignedIds.has(id)) return;
    setPickId("");
    if (!storeId) {
      onPendingChange?.([...(pendingIds || []), id]);
      return;
    }
    try {
      setBusy(true);
      await addProductsToStoreRequest(storeId, [id], {
        exhibidorId: assignExhibidorId || undefined,
      });
      await fetchLinks();
    } catch (err) {
      toastAuth({
        promise: Promise.reject(err),
        onError: (res) => ({
          title: "Asignar producto",
          description: res?.response?.data?.message || "No se pudo asignar",
        }),
      });
    } finally {
      setBusy(false);
    }
  };

  const removeProduct = async (productId) => {
    const id = Number(productId);
    if (!storeId) {
      onPendingChange?.((pendingIds || []).filter((x) => Number(x) !== id));
      return;
    }
    try {
      await removeProductFromStoreRequest(storeId, id);
      setLinks((prev) => prev.filter((r) => Number(r.productId) !== id));
    } catch {
      /* ignore */
    }
  };

  const toggleVisibility = async (productId, current) => {
    if (!storeId) return;
    try {
      await toggleStoreProductRequest(storeId, productId, !current);
      setLinks((prev) =>
        prev.map((r) => (r.productId === productId ? { ...r, isActive: !current } : r)),
      );
    } catch {
      /* ignore */
    }
  };

  const changeExhibidor = async (productId, exhibidorId) => {
    if (!storeId) return;
    const value = exhibidorId === "" || exhibidorId === "none" ? null : Number(exhibidorId);
    try {
      await setStoreProductExhibidorRequest(storeId, productId, value);
      const ex = value ? exhibidores.find((e) => Number(e.id) === value) : null;
      setLinks((prev) =>
        prev.map((r) =>
          Number(r.productId) === Number(productId)
            ? {
                ...r,
                exhibidorId: value,
                exhibidor: ex
                  ? { id: ex.id, name: ex.name, position: ex.position, isActive: ex.isActive }
                  : null,
              }
            : r,
        ),
      );
    } catch (err) {
      toastAuth({
        promise: Promise.reject(err),
        onError: (res) => ({
          title: "Exhibidor",
          description: res?.response?.data?.message || "No se pudo asignar",
        }),
      });
    }
  };

  const createExhibidor = async () => {
    if (!storeId) return;
    const name = newExhibidorName.trim();
    if (!name) return;
    try {
      await toastAuth({
        promise: createStoreExhibidorRequest(storeId, { name }),
        successMessage: "Exhibidor creado",
      });
      setNewExhibidorName("");
      await fetchExhibidores();
    } catch {
      /* toast */
    }
  };

  const openRenameExhibidor = (ex) => {
    setRenameDialog({ open: true, exhibidor: ex, name: ex?.name || "" });
  };

  const closeRenameDialog = () => {
    setRenameDialog({ open: false, exhibidor: null, name: "" });
  };

  const confirmRenameExhibidor = async () => {
    const ex = renameDialog.exhibidor;
    const nextName = String(renameDialog.name || "").trim();
    if (!ex || !storeId) return;
    if (!nextName) {
      toastAuth({ message: "Escribe un nombre para el exhibidor.", variant: "warning" });
      return;
    }
    if (nextName === ex.name) {
      closeRenameDialog();
      return;
    }
    try {
      await updateStoreExhibidorRequest(storeId, ex.id, { name: nextName });
      await fetchExhibidores();
      await fetchLinks();
      closeRenameDialog();
    } catch {
      /* ignore */
    }
  };

  const openDeleteExhibidor = (ex) => {
    setDeleteDialog({ open: true, exhibidor: ex });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, exhibidor: null });
  };

  const confirmDeleteExhibidor = async () => {
    const ex = deleteDialog.exhibidor;
    if (!ex || !storeId) return;
    try {
      await deleteStoreExhibidorRequest(storeId, ex.id);
      await fetchExhibidores();
      await fetchLinks();
      closeDeleteDialog();
    } catch {
      /* ignore */
    }
  };

  const assignedRows = useMemo(() => {
    const q = filterAssigned.trim().toLowerCase();
    if (storeId) {
      return links.filter((r) => {
        const p = r.product || {};
        if (q && !String(p.name || "").toLowerCase().includes(q)) return false;
        if (!productMatchesCategoryFilter(p, categoryFilter, categoryById)) return false;
        if (exhibidorFilter === "none") {
          if (r.exhibidorId != null) return false;
        } else if (exhibidorFilter) {
          if (Number(r.exhibidorId) !== Number(exhibidorFilter)) return false;
        }
        return true;
      });
    }
    return pendingProducts.filter((p) => {
      if (q && !String(p.name || "").toLowerCase().includes(q)) return false;
      return productMatchesCategoryFilter(p, categoryFilter, categoryById);
    });
  }, [
    storeId,
    links,
    pendingProducts,
    filterAssigned,
    categoryFilter,
    exhibidorFilter,
    categoryById,
  ]);

  const listMaxH = compact ? 200 : 320;
  const colSpan = storeId ? 6 : 4;

  return (
    <Stack spacing={1.25}>
      {!storeId && (
        <Alert severity="info" sx={{ py: 0.25, "& .MuiAlert-message": { fontSize: "0.75rem" } }}>
          Puedes ir eligiendo productos ahora; se enlazarán al crear el local.
        </Alert>
      )}

      {storeId ? (
        <Paper variant="outlined" sx={{ p: 1.25 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
            Exhibidores (organización del local)
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            No llevan stock: solo agrupan productos. El inventario sigue siendo por local.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1 }}>
            <TextField
              size="small"
              label="Nuevo exhibidor"
              placeholder="Ej. Vitrina 1, Mostrador…"
              value={newExhibidorName}
              onChange={(e) => setNewExhibidorName(e.target.value)}
              fullWidth
              sx={linkerFieldSx}
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
              startIcon={<Add />}
              onClick={() => void createExhibidor()}
              sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
            >
              Crear
            </Button>
          </Stack>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {exhibidores.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                Sin exhibidores aún.
              </Typography>
            ) : (
              exhibidores.map((ex) => (
                <Chip
                  key={ex.id}
                  size="small"
                  label={ex.name}
                  onClick={() => openRenameExhibidor(ex)}
                  onDelete={() => openDeleteExhibidor(ex)}
                  deleteIcon={<Delete fontSize="small" />}
                  variant="outlined"
                />
              ))
            )}
          </Stack>
        </Paper>
      ) : null}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          select
          size="small"
          label="Categoría"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          fullWidth
          sx={linkerFieldSx}
        >
          <MenuItem value="">Todas las categorías</MenuItem>
          {categoryOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        {storeId ? (
          <TextField
            select
            size="small"
            label="Exhibidor (filtro)"
            value={exhibidorFilter}
            onChange={(e) => setExhibidorFilter(e.target.value)}
            fullWidth
            sx={linkerFieldSx}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="none">Sin exhibidor</MenuItem>
            {exhibidores.map((ex) => (
              <MenuItem key={ex.id} value={String(ex.id)}>
                {ex.name}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        {storeId ? (
          <TextField
            select
            size="small"
            label="Al añadir → exhibidor"
            value={assignExhibidorId}
            onChange={(e) => setAssignExhibidorId(e.target.value)}
            fullWidth
            sx={linkerFieldSx}
          >
            <MenuItem value="">Sin asignar</MenuItem>
            {exhibidores.map((ex) => (
              <MenuItem key={ex.id} value={String(ex.id)}>
                {ex.name}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
      </Stack>

      <SearchableSelect
        label="Buscar producto para añadir"
        placeholder="Nombre…"
        items={pickOptions}
        value={pickId}
        onChange={(id) => {
          if (id === "" || id == null) {
            setPickId("");
            return;
          }
          void addProduct(id);
        }}
        loading={catalogLoading || busy}
        clearInputOnSelect
        getOptionLabel={(p) => p?.name || ""}
        getSearchText={(p) =>
          `${p?.name || ""} ${p?.barcode || ""} ${p?.sku || ""} ${formatMoneyShort(productPrice(p))} stock ${productStock(p) ?? ""}`
        }
        renderOption={(props, p) => {
          const { key, ...rest } = props;
          const img = p.primaryImageUrl ? `${pathImg}${p.primaryImageUrl}` : null;
          const stock = productStock(p);
          const price = productPrice(p);
          return (
            <li key={key} {...rest}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%", py: 0.25 }}>
                {img ? (
                  <img
                    src={img}
                    alt=""
                    style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }}
                    onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                  />
                ) : (
                  <Box sx={{ width: 32, height: 32, bgcolor: "action.hover", borderRadius: 1, flexShrink: 0 }} />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap fontWeight={600}>
                    {p.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Stock {stock != null ? stock : "—"} · {formatMoneyShort(price)}
                  </Typography>
                </Box>
              </Stack>
            </li>
          );
        }}
      />

      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography variant="subtitle2" fontWeight={700}>
          Enlazados ({assignedRows.length}
          {storeId && links.length !== assignedRows.length ? ` / ${links.length}` : ""}
          {!storeId ? ` / ${(pendingIds || []).length}` : ""})
        </Typography>
        <TextField
          size="small"
          placeholder="Filtrar nombre…"
          value={filterAssigned}
          onChange={(e) => setFilterAssigned(e.target.value)}
          sx={{ ...linkerFieldSx, maxWidth: 180 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Box sx={{ maxHeight: listMaxH, overflow: "auto" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell align="right">Stock</TableCell>
                <TableCell align="right">Precio</TableCell>
                {storeId ? <TableCell>Exhibidor</TableCell> : null}
                {storeId ? <TableCell align="center">Visible</TableCell> : null}
                <TableCell align="center" width={48} />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={colSpan} align="center" sx={{ py: 2 }}>
                    <CircularProgress size={22} />
                  </TableCell>
                </TableRow>
              ) : assignedRows.length ? (
                storeId
                  ? assignedRows.map((r) => {
                      const p = r.product || {};
                      const img = p.primaryImageUrl ? `${pathImg}${p.primaryImageUrl}` : null;
                      return (
                        <TableRow key={r.linkId || r.productId} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {img ? (
                                <img
                                  src={img}
                                  alt={p.name}
                                  style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }}
                                  onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                                />
                              ) : (
                                <Box sx={{ width: 32, height: 32, bgcolor: "action.hover", borderRadius: 1 }} />
                              )}
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                  {p.name || `#${r.productId}`}
                                </Typography>
                                {p.category ? (
                                  <Typography variant="caption" color="text.secondary" noWrap>
                                    {p.category}
                                  </Typography>
                                ) : null}
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            {productStock(p) != null ? productStock(p) : "—"}
                          </TableCell>
                          <TableCell align="right">{formatMoneyShort(productPrice(p))}</TableCell>
                          <TableCell>
                            <TextField
                              select
                              size="small"
                              value={r.exhibidorId != null ? String(r.exhibidorId) : ""}
                              onChange={(e) => void changeExhibidor(r.productId, e.target.value)}
                              sx={{ ...linkerFieldSx, minWidth: 120 }}
                            >
                              <MenuItem value="">Sin exhibidor</MenuItem>
                              {exhibidores.map((ex) => (
                                <MenuItem key={ex.id} value={String(ex.id)}>
                                  {ex.name}
                                </MenuItem>
                              ))}
                            </TextField>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={r.isActive ? "Ocultar" : "Mostrar"}>
                              <IconButton
                                size="small"
                                onClick={() => toggleVisibility(r.productId, r.isActive)}
                              >
                                {r.isActive ? (
                                  <Visibility fontSize="small" />
                                ) : (
                                  <VisibilityOff fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Quitar">
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => void removeProduct(r.productId)}
                              >
                                <RemoveCircleOutline fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  : assignedRows.map((p) => {
                      const img = p.primaryImageUrl ? `${pathImg}${p.primaryImageUrl}` : null;
                      return (
                        <TableRow key={p.id} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {img ? (
                                <img
                                  src={img}
                                  alt={p.name}
                                  style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }}
                                  onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                                />
                              ) : (
                                <Box sx={{ width: 32, height: 32, bgcolor: "action.hover", borderRadius: 1 }} />
                              )}
                              <Typography variant="body2">{p.name}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            {productStock(p) != null ? productStock(p) : "—"}
                          </TableCell>
                          <TableCell align="right">{formatMoneyShort(productPrice(p))}</TableCell>
                          <TableCell align="center">
                            <IconButton color="error" size="small" onClick={() => void removeProduct(p.id)}>
                              <RemoveCircleOutline fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
              ) : (
                <TableRow>
                  <TableCell colSpan={colSpan} align="center" sx={{ py: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {catalogLoading
                        ? "Cargando catálogo…"
                        : "Sin productos con ese filtro. Búscalos arriba para añadir."}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      <SimpleDialog
        open={renameDialog.open}
        onClose={closeRenameDialog}
        tittle="Renombrar exhibidor"
        onClickAccept={confirmRenameExhibidor}
        fullWidth
        maxWidth="xs"
      >
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Nombre"
          value={renameDialog.name}
          onChange={(e) =>
            setRenameDialog((prev) => ({ ...prev, name: e.target.value }))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void confirmRenameExhibidor();
            }
          }}
          placeholder="Ej. Vitrina 1, Mostrador…"
        />
      </SimpleDialog>

      <SimpleDialog
        open={deleteDialog.open}
        onClose={closeDeleteDialog}
        tittle="Eliminar exhibidor"
        onClickAccept={confirmDeleteExhibidor}
      >
        ¿Eliminar exhibidor «{deleteDialog.exhibidor?.name || ""}»? Los productos quedan sin
        exhibidor (el stock no se modifica).
      </SimpleDialog>
    </Stack>
  );
}
