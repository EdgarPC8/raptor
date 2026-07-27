import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { ListSkeleton } from "../../../components/ContentSkeleton.jsx";
import ScienceIcon from "@mui/icons-material/Science";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import InventoryIcon from "@mui/icons-material/Inventory";
import SearchIcon from "@mui/icons-material/Search";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import CloseIcon from "@mui/icons-material/Close";
import {
  getAllProductsAll,
  getGenericIngredientsWorkbench,
  linkPresentationRequest,
  unlinkPresentationRequest,
} from "../../../api/inventoryControlRequest.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import ProductForm from "./components/ProductForm.jsx";

function formatStock(row) {
  return `${row.stock} ${row.unitAbbrev}`;
}

function RecipeChips({ count = 0, names = [], size = "small" }) {
  if (!count) {
    return (
      <Chip
        size={size}
        variant="outlined"
        color="default"
        icon={<MenuBookIcon />}
        label="Sin recetas"
      />
    );
  }
  const tip =
    names.length > 0
      ? `En recetas: ${names.slice(0, 8).join(", ")}${names.length > 8 ? "…" : ""}`
      : `${count} línea(s) de receta`;
  return (
    <Tooltip title={tip}>
      <Chip
        size={size}
        color="info"
        variant="outlined"
        icon={<MenuBookIcon />}
        label={`En ${count} receta${count === 1 ? "" : "s"}`}
      />
    </Tooltip>
  );
}

export default function GenericIngredientsPage() {
  const theme = useTheme();
  const { toast } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generics, setGenerics] = useState([]);
  const [unlinked, setUnlinked] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [listFilter, setListFilter] = useState("");

  const [openLink, setOpenLink] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const [linkNote, setLinkNote] = useState("");
  const [linkProductId, setLinkProductId] = useState("");
  const [linkSearch, setLinkSearch] = useState("");

  const selected = useMemo(
    () => generics.find((g) => g.id === selectedId) ?? null,
    [generics, selectedId]
  );

  const filteredGenerics = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    if (!q) return generics;
    return generics.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        String(g.categoryName || "")
          .toLowerCase()
          .includes(q)
    );
  }, [generics, listFilter]);

  const linkCandidates = useMemo(() => {
    const q = linkSearch.trim().toLowerCase();
    const list = [...unlinked].sort((a, b) => {
      const ra = Number(a.recipeLines || 0);
      const rb = Number(b.recipeLines || 0);
      if (rb !== ra) return rb - ra;
      return String(a.name).localeCompare(String(b.name), "es");
    });
    if (!q) return list;
    return list.filter((p) => {
      const hay = `${p.name} ${p.categoryName || ""} ${p.unitAbbrev || ""} ${(p.inRecipes || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [unlinked, linkSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const wb = await getGenericIngredientsWorkbench();
      setGenerics(wb.data?.generics ?? []);
      setUnlinked(wb.data?.unlinkedProducts ?? []);
      setSelectedId((prev) => {
        const list = wb.data?.generics ?? [];
        if (prev && list.some((g) => g.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (e) {
      console.error(e);
      toast?.({ message: "No se pudo cargar insumos y presentaciones", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openLinkModal = (preselectId = "") => {
    setLinkProductId(preselectId ? String(preselectId) : "");
    setLinkSearch("");
    setLinkNote("");
    setOpenLink(true);
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductDialogOpen(true);
  };

  const closeProductDialog = () => {
    setProductDialogOpen(false);
    setEditingProduct(null);
  };

  const openEditProduct = async (productId) => {
    if (!productId) return;
    setLoadingEdit(true);
    try {
      const { data } = await getAllProductsAll();
      const list = Array.isArray(data) ? data : [];
      const full = list.find((p) => Number(p.id) === Number(productId));
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
      setLoadingEdit(false);
    }
  };

  const handleProductSaved = async () => {
    const wasEdit = Boolean(editingProduct);
    closeProductDialog();
    await load();
    if (!wasEdit) {
      toast?.({
        message: "Si es tipo final, usa Enlazar para asociarlo al genérico.",
        variant: "info",
      });
    }
  };

  const linkExisting = async () => {
    if (!selected || !linkProductId) return;
    await runMutationReload(toast, {
      promise: linkPresentationRequest(linkProductId, {
        genericProductId: selected.id,
        purchasePresentation: linkNote.trim() || null,
      }),
      reload: () => {
        load();
        setOpenLink(false);
        setLinkProductId("");
        setLinkSearch("");
        setLinkNote("");
      },
      successMessage: "Producto final enlazado al genérico",
    });
  };

  const unlink = async (productId) => {
    await runMutationReload(toast, {
      promise: unlinkPresentationRequest(productId),
      reload: load,
      successMessage: "Enlace quitado",
    });
  };

  const accent = theme.palette.primary.main;
  const selectedLink = unlinked.find((p) => String(p.id) === String(linkProductId));

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Stack spacing={1} mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <ScienceIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Insumos y presentaciones
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
          <strong>Insumo genérico</strong> (tipo insumo) = Harina, lo usan las recetas.{" "}
          <strong>Empaque</strong> (tipo final) = Quintal de harina.{" "}
          <strong>Enlazar</strong> los une; en Movimientos → Abrir: baja el quintal y sube la harina.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 1.5, borderRadius: 2, maxHeight: 620, overflow: "auto" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, px: 0.5 }}>
              Insumos genéricos ({generics.length})
            </Typography>
            <TextField
              size="small"
              fullWidth
              placeholder="Buscar insumo…"
              value={listFilter}
              onChange={(e) => setListFilter(e.target.value)}
              sx={{ mb: 1.25 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
            {loading && <ListSkeleton count={5} itemHeight={72} />}
            {!loading && filteredGenerics.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                {generics.length === 0
                  ? "Sin insumos genéricos. Crea un producto tipo insumo en Productos o con «Crear producto»."
                  : "Ningún insumo coincide con la búsqueda."}
              </Typography>
            )}
            <Stack spacing={0.75}>
              {!loading &&
                filteredGenerics.map((g) => {
                  const active = g.id === selectedId;
                  return (
                    <Paper
                      key={g.id}
                      elevation={0}
                      onClick={() => setSelectedId(g.id)}
                      sx={{
                        p: 1.25,
                        cursor: "pointer",
                        borderRadius: 1.5,
                        border: "2px solid",
                        borderColor: active ? accent : "divider",
                        bgcolor: active ? alpha(accent, 0.06) : "background.paper",
                        transition: "border-color 0.15s ease",
                      }}
                    >
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {g.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Stock total: {g.totalStockDisplay} · {g.presentationCount} presentación
                      {g.presentationCount === 1 ? "" : "es"}
                    </Typography>
                    <Stack direction="row" spacing={0.5} mt={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                      <RecipeChips count={g.recipeLines} names={g.inRecipes} />
                      <Chip size="small" label={g.categoryName} />
                      <Tooltip title="Editar producto">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditProduct(g.id);
                          }}
                          disabled={loadingEdit}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    </Paper>
                  );
                })}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          {selected ? (
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "flex-start" }}
                spacing={1.5}
                mb={2}
              >
                <Box>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Insumo genérico (tipo insumo)
                    </Typography>
                    <Tooltip title="Editar producto">
                      <IconButton
                        size="small"
                        onClick={() => openEditProduct(selected.id)}
                        disabled={loadingEdit}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                    {selected.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Stock disponible (genérico + presentaciones):{" "}
                    <strong>{selected.totalStockDisplay}</strong>
                    {selected.stockOnGeneric > 0 && (
                      <> · {selected.stockOnGeneric} g en el genérico directo</>
                    )}
                  </Typography>
                  <Stack direction="row" spacing={0.75} mt={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      icon={<InventoryIcon />}
                      label={`Familia: ${selected.categoryName}`}
                    />
                    <RecipeChips count={selected.recipeLines} names={selected.inRecipes} />
                  </Stack>
                  {selected.inRecipes?.length > 0 && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Usado en: {selected.inRecipes.slice(0, 6).join(", ")}
                      {selected.inRecipes.length > 6 ? "…" : ""}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<LinkIcon />}
                    onClick={() => openLinkModal()}
                    disabled={unlinked.length === 0}
                  >
                    Enlazar
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openCreateProduct}
                  >
                    Crear producto
                  </Button>
                </Stack>
              </Stack>

              <Divider sx={{ mb: 1.5 }} />

              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <ShoppingBagIcon fontSize="small" color="action" />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Empaques enlazados — tipo final ({selected.presentations?.length || 0})
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                Productos finales (Quintal, Arroba…) enlazados a este genérico. Al abrirlos en
                Movimientos, baja su stock y sube el del insumo genérico.
              </Typography>

              {selected.presentations?.length === 0 ? (
                <Box
                  sx={{
                    py: 4,
                    textAlign: "center",
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Sin empaques. Crea el producto (tipo final) con «Crear producto» o enlaza uno
                    que ya exista.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1}>
                  {selected.presentations.map((p) => (
                    <Paper
                      key={p.id}
                      variant="outlined"
                      sx={{ p: 1.5, borderRadius: 1.5, display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {p.name}
                          </Typography>
                          <Chip size="small" label={p.type === "final" ? "Final" : p.type} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {p.purchasePresentation || "Sin nota"} · Stock: {formatStock(p)}
                          {!p.isCountUnit && p.stockGrams > 0 && ` (${p.stockGrams} g)`}
                        </Typography>
                      </Box>
                      <Tooltip title="Editar producto">
                        <IconButton
                          size="small"
                          onClick={() => openEditProduct(p.id)}
                          disabled={loadingEdit}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Quitar enlace (el producto final sigue existiendo)">
                        <IconButton size="small" color="warning" onClick={() => unlink(p.id)}>
                          <LinkOffIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          ) : (
            <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
              <Typography color="text.secondary">Selecciona un insumo genérico a la izquierda</Typography>
            </Paper>
          )}

          {unlinked.length > 0 && (
            <Paper sx={{ p: 2, borderRadius: 2, mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Productos finales sin enlazar ({unlinked.length})
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                Tipo <strong>final</strong> (ej. Quintal de harina). Usa <strong>Enlazar</strong> para
                asociarlos al genérico seleccionado.
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {unlinked.slice(0, 40).map((p) => (
                  <Tooltip
                    key={p.id}
                    title={
                      p.recipeLines
                        ? `En ${p.recipeLines} receta(s)${
                            p.inRecipes?.length
                              ? `: ${p.inRecipes.slice(0, 5).join(", ")}`
                              : ""
                          }`
                        : "Sin recetas"
                    }
                  >
                    <Chip
                      size="small"
                      label={p.name}
                      color={p.recipeLines ? "info" : "default"}
                      variant={p.recipeLines ? "filled" : "outlined"}
                      icon={p.recipeLines ? <MenuBookIcon /> : undefined}
                      onClick={() => {
                        if (selected) openLinkModal(p.id);
                      }}
                      disabled={!selected}
                    />
                  </Tooltip>
                ))}
                {unlinked.length > 40 && (
                  <Chip size="small" variant="outlined" label={`+${unlinked.length - 40} más`} />
                )}
              </Stack>
            </Paper>
          )}
        </Grid>
      </Grid>

      <Dialog
        open={openLink}
        onClose={() => setOpenLink(false)}
        maxWidth="sm"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          Enlazar producto final a «{selected?.name}»
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Elige un producto <strong>tipo final</strong> ya creado (Quintal de harina, Quintal de
            azúcar…). Sigue siendo final; solo se enlaza al genérico para poder abrirlo y pasar
            stock a «{selected?.name}».
          </Typography>

          <TextField
            size="small"
            fullWidth
            autoFocus
            placeholder="Buscar producto final…"
            value={linkSearch}
            onChange={(e) => setLinkSearch(e.target.value)}
            sx={{ mb: 1.5 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />

          <Paper
            variant="outlined"
            sx={{
              maxHeight: 320,
              overflow: "auto",
              borderRadius: 1.5,
              mb: 2,
            }}
          >
            {linkCandidates.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                {unlinked.length === 0
                  ? "No hay productos finales sin enlazar. Créalos con «Crear producto» (tipo final) o en Productos."
                  : "Ningún producto coincide con la búsqueda."}
              </Typography>
            ) : (
              <List disablePadding dense>
                {linkCandidates.map((p) => {
                  const active = String(p.id) === String(linkProductId);
                  return (
                    <ListItemButton
                      key={p.id}
                      selected={active}
                      onClick={() => setLinkProductId(String(p.id))}
                      sx={{ alignItems: "flex-start", py: 1 }}
                    >
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {p.name}
                            </Typography>
                            <Chip size="small" label="Final" />
                          </Stack>
                        }
                        secondary={`Stock ${formatStock(p)} · ${p.categoryName}`}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Paper>

          {selectedLink && (
            <Box
              sx={{
                mb: 2,
                p: 1.25,
                borderRadius: 1.5,
                bgcolor: alpha(accent, 0.06),
                border: "1px solid",
                borderColor: alpha(accent, 0.25),
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Seleccionado
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {selectedLink.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Al abrir este empaque en Movimientos: −1 {selectedLink.unitAbbrev} aquí y +stock en
                «{selected?.name}».
              </Typography>
            </Box>
          )}

          <TextField
            label="Nota (opcional)"
            fullWidth
            value={linkNote}
            onChange={(e) => setLinkNote(e.target.value)}
            placeholder="Ej: Quintal, Arroba"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLink(false)}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={<LinkIcon />}
            onClick={linkExisting}
            disabled={!linkProductId}
          >
            Enlazar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={productDialogOpen}
        onClose={closeProductDialog}
        fullWidth
        maxWidth="lg"
        scroll="paper"
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            pt: 1,
          }}
        >
          <DialogTitle sx={{ p: 0, fontWeight: 700, fontSize: "1.05rem" }}>
            {editingProduct ? "Editar producto" : "Crear producto"}
          </DialogTitle>
          <IconButton
            aria-label="Cerrar"
            onClick={closeProductDialog}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent dividers>
          {!editingProduct && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Usa el mismo formulario de Productos. El tipo por defecto es <strong>final</strong>;
              cámbialo a insumo si corresponde. Si es final, después usa <strong>Enlazar</strong>.
            </Typography>
          )}
          <ProductForm
            key={
              productDialogOpen
                ? editingProduct
                  ? `edit-${editingProduct.id}`
                  : "new-product"
                : "closed"
            }
            isEditing={Boolean(editingProduct)}
            datos={editingProduct || {}}
            onClose={closeProductDialog}
            reload={handleProductSaved}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
          <Button type="button" onClick={closeProductDialog} color="inherit">
            Cancelar
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            type="submit"
            form="eddeli-product-form"
            variant="contained"
            sx={{ minWidth: 160 }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
