import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
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
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  getAllProductsAll,
  getGenericIngredientsWorkbench,
  linkPresentationRequest,
  unlinkPresentationRequest,
} from "../../../api/inventoryControlRequest.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import SearchableSelect from "../../../components/SearchableSelect.jsx";
import ProductForm from "./components/ProductForm.jsx";
import TourHelpButton from "../../../components/TourHelpButton.jsx";
import { usePageTour } from "../../../hooks/usePageTour.js";
import { INSUMOS_TOUR_ID, getInsumosTourSteps } from "../../../tours/insumosTour.js";
import {
  INSUMOS_LINK_TOUR_ID,
  getInsumosLinkTourSteps,
} from "../../../tours/insumosLinkTour.js";
import { suggestUnitsPerPack } from "./components/movementFormConfig.js";
import {
  suggestLinkAmount,
  formatStockWithAlt,
  measureKind,
} from "../../../utils/weightUnits.js";

function formatStock(row) {
  return `${row.stock} ${row.unitAbbrev}`;
}

/** Clasifica el producto para filtros y etiquetas de enlace. */
function productKind(product) {
  if (!product) return "final";
  if (product.isGenericIngredient || product.type === "raw") return "insumo";
  if (product.type === "intermediate") return "intermediate";
  return "final";
}

function productKindLabel(product) {
  const kind = productKind(product);
  if (kind === "insumo") return "Insumo genérico";
  if (kind === "intermediate") return "Intermedio";
  return "Producto final";
}

function productKindChipColor(product) {
  const kind = productKind(product);
  if (kind === "insumo") return "secondary";
  if (kind === "intermediate") return "default";
  return "primary";
}

function productUnitAbbrev(product) {
  return product?.InventoryUnit?.abbreviation || product?.unitAbbrev || "u";
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
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedTargets, setExpandedTargets] = useState(() => new Set());
  const [orderBy, setOrderBy] = useState("name");
  const [orderDirection, setOrderDirection] = useState("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [openLink, setOpenLink] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const [linkNote, setLinkNote] = useState("");
  const [linkProductId, setLinkProductId] = useState("");
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkUnitsPerPack, setLinkUnitsPerPack] = useState("1");
  const [linkTargetKindFilter, setLinkTargetKindFilter] = useState("all");
  const [allProducts, setAllProducts] = useState([]);

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

  const presentationCandidates = useMemo(
    () =>
      allProducts
        .filter(
          (product) =>
            product.type === "final" &&
            !product.isGenericIngredient &&
            Number(product.id) !== Number(linkTargetId),
        )
        .sort((a, b) => String(a.name).localeCompare(String(b.name), "es")),
    [allProducts, linkTargetId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const wb = await getGenericIngredientsWorkbench();
      setGenerics(wb.data?.generics ?? []);
      setUnlinked(wb.data?.unlinkedProducts ?? []);
      const { data: productsData } = await getAllProductsAll();
      setAllProducts(Array.isArray(productsData) ? productsData : []);
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
    const preselect = preselectId
      ? allProducts.find((p) => Number(p.id) === Number(preselectId))
      : null;
    const existingTargetId = preselect?.genericProductId
      ? String(preselect.genericProductId)
      : selected
        ? String(selected.id)
        : "";
    setLinkProductId(preselectId ? String(preselectId) : "");
    setLinkTargetId(existingTargetId);
    setLinkUnitsPerPack(
      preselect?.unitsPerPack != null && Number(preselect.unitsPerPack) > 0
        ? String(preselect.unitsPerPack)
        : "1",
    );
    setLinkNote(preselect?.purchasePresentation || "");
    setLinkTargetKindFilter("all");
    void loadAllProducts();
    setOpenLink(true);
  };

  const loadAllProducts = useCallback(async () => {
    try {
      const { data } = await getAllProductsAll();
      setAllProducts(Array.isArray(data) ? data : []);
    } catch {
      setAllProducts([]);
    }
  }, []);

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
    if (!linkProductId || !linkTargetId) return;
    await runMutationReload(toast, {
      promise: linkPresentationRequest(linkProductId, {
        targetProductId: Number(linkTargetId),
        purchasePresentation: linkNote.trim() || null,
        unitsPerPack: Number(linkUnitsPerPack),
      }),
      reload: () => {
        load();
        setOpenLink(false);
        setLinkProductId("");
        setLinkTargetId("");
        setLinkUnitsPerPack("1");
        setLinkNote("");
        setLinkTargetKindFilter("all");
      },
      successMessage: "Presentación enlazada",
    });
  };

  const unlink = async (productId) => {
    const product = generics
      .flatMap((g) => g.presentations || [])
      .find((p) => Number(p.id) === Number(productId));
    if (
      !window.confirm(
        `Se quitará el destino${product?.name ? ` de «${product.name}»` : ""} y se borrarán sus unidades por paca. ¿Continuar?`,
      )
    ) {
      return;
    }
    await runMutationReload(toast, {
      promise: unlinkPresentationRequest(productId),
      reload: load,
      successMessage: "Enlace quitado",
    });
  };

  const accent = theme.palette.primary.main;
  const selectedLink = allProducts.find((p) => String(p.id) === String(linkProductId));
  const targetCandidates = useMemo(() => {
    const rows = allProducts.filter((p) => {
      if (Number(p.id) === Number(linkProductId)) return false;
      const isInsumo = p.isGenericIngredient && !p.genericProductId;
      const isFinal = p.type === "final" && !p.isGenericIngredient;
      if (!isInsumo && !isFinal) return false;
      // Mantener el destino ya elegido aunque el filtro lo oculte.
      if (linkTargetId && String(p.id) === String(linkTargetId)) return true;
      if (linkTargetKindFilter === "insumo") return isInsumo;
      if (linkTargetKindFilter === "final") return isFinal;
      return true;
    });
    return rows.sort((a, b) => {
      const kindDiff =
        (productKind(a) === "insumo" ? 0 : 1) - (productKind(b) === "insumo" ? 0 : 1);
      return kindDiff || String(a.name).localeCompare(String(b.name), "es");
    });
  }, [allProducts, linkProductId, linkTargetKindFilter, linkTargetId]);
  const selectedTarget = targetCandidates.find(
    (p) => String(p.id) === String(linkTargetId),
  );
  const suggestedPackQty = useMemo(() => {
    if (!selectedLink || !selectedTarget) return null;
    return (
      suggestLinkAmount(selectedLink, selectedTarget) ??
      suggestUnitsPerPack(selectedLink, selectedTarget)
    );
  }, [selectedLink, selectedTarget]);

  const applySuggestedPackQty = useCallback(() => {
    if (suggestedPackQty == null || !(suggestedPackQty > 0)) return;
    setLinkUnitsPerPack(String(suggestedPackQty));
  }, [suggestedPackQty]);

  useEffect(() => {
    if (!openLink || !selectedLink || !selectedTarget) return;
    // Solo auto-rellena si está vacío, en 1, o coincide con un valor previo típico sin configurar.
    const current = Number(linkUnitsPerPack);
    if (!Number.isFinite(current) || current === 1 || linkUnitsPerPack === "") {
      applySuggestedPackQty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openLink, selectedLink?.id, selectedTarget?.id, suggestedPackQty]);
  const allProductRows = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    return [...allProducts].filter((p) => {
      const kind = productKind(p);
      if (typeFilter !== "all" && kind !== typeFilter) return false;
      if (!q) return true;
      return `${p.name} ${p.type} ${kind} ${productKindLabel(p)} ${p.sku || ""} ${p.barcode || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [allProducts, listFilter, typeFilter]);

  const productById = useMemo(
    () => new Map(allProducts.map((p) => [Number(p.id), p])),
    [allProducts],
  );
  const linksByTarget = useMemo(() => {
    const map = new Map();
    allProducts.forEach((product) => {
      if (!product.genericProductId) return;
      const targetId = Number(product.genericProductId);
      if (!map.has(targetId)) map.set(targetId, []);
      map.get(targetId).push(product);
    });
    return map;
  }, [allProducts]);

  const sortedProductRows = useMemo(() => {
    const typeOrder = { final: 0, intermediate: 1, insumo: 2 };
    const dir = orderDirection === "asc" ? 1 : -1;
    const getTargetName = (p) => {
      if (!p.genericProductId) return "";
      return productById.get(Number(p.genericProductId))?.name || "";
    };
    const getLinksCount = (p) => (linksByTarget.get(Number(p.id)) || []).length;

    return [...allProductRows].sort((a, b) => {
      let cmp = 0;
      switch (orderBy) {
        case "type":
          cmp =
            (typeOrder[productKind(a)] ?? 9) - (typeOrder[productKind(b)] ?? 9);
          break;
        case "stock":
          cmp = Number(a.stock || 0) - Number(b.stock || 0);
          break;
        case "target":
          cmp = String(getTargetName(a)).localeCompare(String(getTargetName(b)), "es", {
            sensitivity: "base",
          });
          break;
        case "links":
          cmp = getLinksCount(a) - getLinksCount(b);
          break;
        case "name":
        default:
          cmp = String(a.name || "").localeCompare(String(b.name || ""), "es", {
            sensitivity: "base",
          });
          break;
      }
      if (cmp !== 0) return cmp * dir;
      return String(a.name || "").localeCompare(String(b.name || ""), "es") * dir;
    });
  }, [allProductRows, orderBy, orderDirection, productById, linksByTarget]);

  const pagedProductRows = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedProductRows.slice(start, start + rowsPerPage);
  }, [sortedProductRows, page, rowsPerPage]);

  useEffect(() => {
    setPage(0);
  }, [listFilter, typeFilter, orderBy, orderDirection]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedProductRows.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [sortedProductRows.length, rowsPerPage, page]);

  const handleSort = (columnId) => {
    if (orderBy === columnId) {
      setOrderDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(columnId);
      setOrderDirection(columnId === "stock" || columnId === "links" ? "desc" : "asc");
    }
  };
  const toggleTarget = (id) => {
    setExpandedTargets((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { startTour } = usePageTour({
    tourId: INSUMOS_TOUR_ID,
    getSteps: getInsumosTourSteps,
    enabled: !loading,
  });
  const { startTour: startLinkTour } = usePageTour({
    tourId: INSUMOS_LINK_TOUR_ID,
    getSteps: getInsumosLinkTourSteps,
    enabled: openLink,
    autoDelayMs: 450,
  });

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Stack spacing={1} mb={2} data-tour="insumos-header">
        <Stack direction="row" spacing={1} alignItems="center">
          <ScienceIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Insumos y presentaciones
          </Typography>
          <TourHelpButton onClick={startTour} title="Ver tutorial de insumos y presentaciones" />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 860 }}>
          <strong>Insumo genérico</strong>: peso en <strong>g</strong> (Harina) o volumen en{" "}
          <strong>ml/L</strong> (Aceite). <strong>Empaque final</strong> (Quintal, Funda 900ml): al
          enlazar indicas cuánto suma al insumo — ej. 1 funda → <strong>+900 ml</strong> de Aceite.
        </Typography>
      </Stack>

      <Paper sx={{ borderRadius: 2, overflow: "hidden" }} data-tour="insumos-table">
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          alignItems="center"
          sx={{ p: 1.5, borderBottom: 1, borderColor: "divider", width: "100%", minWidth: 0 }}
        >
          <TextField
            size="small"
            data-tour="insumos-search"
            placeholder="Buscar producto, tipo, SKU o código…"
            value={listFilter}
            onChange={(e) => setListFilter(e.target.value)}
            sx={{ flex: "1 1 200px", minWidth: 0, maxWidth: "100%" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="Tipo"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ flex: "0 1 150px", minWidth: 120, maxWidth: "100%" }}
            data-tour="insumos-type-filter"
            SelectProps={{ native: false }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="insumo">Insumos</MenuItem>
            <MenuItem value="final">Finales</MenuItem>
            <MenuItem value="intermediate">Intermedios</MenuItem>
          </TextField>
          <Button
            variant="contained"
            size="small"
            startIcon={<LinkIcon />}
            onClick={() => openLinkModal()}
            sx={{ flex: "0 0 auto", whiteSpace: "nowrap" }}
            data-tour="insumos-config-link"
          >
            Configurar enlace
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={openCreateProduct}
            sx={{ flex: "0 0 auto", whiteSpace: "nowrap" }}
          >
            Crear producto
          </Button>
        </Stack>
        <TableContainer sx={{ maxHeight: "calc(100vh - 280px)" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 44 }} />
                <TableCell sortDirection={orderBy === "name" ? orderDirection : false}>
                  <TableSortLabel
                    active={orderBy === "name"}
                    direction={orderBy === "name" ? orderDirection : "asc"}
                    onClick={() => handleSort("name")}
                  >
                    Producto
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === "type" ? orderDirection : false}>
                  <TableSortLabel
                    active={orderBy === "type"}
                    direction={orderBy === "type" ? orderDirection : "asc"}
                    onClick={() => handleSort("type")}
                  >
                    Tipo
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  sortDirection={orderBy === "stock" ? orderDirection : false}
                >
                  <TableSortLabel
                    active={orderBy === "stock"}
                    direction={orderBy === "stock" ? orderDirection : "asc"}
                    onClick={() => handleSort("stock")}
                  >
                    Stock
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === "target" ? orderDirection : false}>
                  <TableSortLabel
                    active={orderBy === "target"}
                    direction={orderBy === "target" ? orderDirection : "asc"}
                    onClick={() => handleSort("target")}
                  >
                    Destino al abrir
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="center"
                  sortDirection={orderBy === "links" ? orderDirection : false}
                >
                  <TableSortLabel
                    active={orderBy === "links"}
                    direction={orderBy === "links" ? orderDirection : "asc"}
                    onClick={() => handleSort("links")}
                  >
                    Enlaces
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7}><ListSkeleton count={5} itemHeight={44} /></TableCell>
                </TableRow>
              )}
              {!loading && sortedProductRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No hay productos que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              )}
              {!loading && pagedProductRows.map((product) => {
                const links = linksByTarget.get(Number(product.id)) || [];
                const target = product.genericProductId
                  ? productById.get(Number(product.genericProductId))
                  : null;
                const expanded = expandedTargets.has(product.id);
                const typeLabel = productKindLabel(product);
                const typeColor = productKindChipColor(product);
                return (
                  <Fragment key={product.id}>
                    <TableRow key={product.id} hover>
                      <TableCell>
                        {links.length > 0 ? (
                          <IconButton size="small" onClick={() => toggleTarget(product.id)}>
                            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>{product.name}</Typography>
                        {product.purchasePresentation && (
                          <Typography variant="caption" color="text.secondary">
                            {product.purchasePresentation}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={typeLabel}
                          color={typeColor}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {product.isGenericIngredient || product.type === "raw" ? (
                          <Box>
                            <Typography variant="body2" fontWeight={700}>
                              {Number(product.stock || 0)}{" "}
                              {product.InventoryUnit?.abbreviation || product.unitAbbrev || "g"}
                            </Typography>
                            {Number(product.stock) > 0 && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {formatStockWithAlt(product.stock, product)}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <>
                            {Number(product.stock || 0)}{" "}
                            {product.InventoryUnit?.abbreviation || product.unitAbbrev || ""}
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        {target ? (
                          <Stack spacing={0.15}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <LinkIcon fontSize="inherit" color="action" />
                              <Typography variant="caption" fontWeight={700}>
                                {target.name}
                              </Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              1 abierta → +{product.unitsPerPack || "—"}{" "}
                              {target.InventoryUnit?.abbreviation ||
                                target.unitAbbrev ||
                                "u"}{" "}
                              en el destino
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">Sin enlace</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {links.length ? (
                          <Chip size="small" label={links.length} color="info" />
                        ) : "—"}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar producto">
                          <IconButton size="small" onClick={() => openEditProduct(product.id)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {product.type === "final" && (
                          <Tooltip title="Configurar destino de apertura">
                            <IconButton size="small" color="primary" onClick={() => openLinkModal(product.id)}>
                              <LinkIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                    {links.length > 0 && (
                      <TableRow key={`${product.id}-links`}>
                        <TableCell colSpan={7} sx={{ py: 0, borderBottom: expanded ? 1 : 0 }}>
                          <Collapse in={expanded} timeout="auto" unmountOnExit>
                            <Box sx={{ py: 1.5, px: 2, bgcolor: alpha(accent, 0.035) }}>
                              <Typography variant="caption" fontWeight={800} color="text.secondary">
                                PRESENTACIONES QUE SE ABREN HACIA «{product.name.toUpperCase()}»
                              </Typography>
                              <Stack spacing={0.75} mt={1}>
                                {links.map((link) => (
                                  <Stack
                                    key={link.id}
                                    direction={{ xs: "column", sm: "row" }}
                                    alignItems={{ sm: "center" }}
                                    spacing={1}
                                    sx={{ p: 1, bgcolor: "background.paper", borderRadius: 1, border: 1, borderColor: "divider" }}
                                  >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography variant="body2" fontWeight={700}>
                                        {link.name}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        display="block"
                                        sx={{ mt: 0.25 }}
                                      >
                                        Al abrir{" "}
                                        <Box component="span" fontWeight={700}>
                                          1
                                        </Box>{" "}
                                        de esta presentación: baja{" "}
                                        <Box component="span" fontWeight={700}>
                                          1
                                        </Box>{" "}
                                        {link.InventoryUnit?.abbreviation ||
                                          link.unitAbbrev ||
                                          "u"}{" "}
                                        aquí y suma{" "}
                                        <Box component="span" fontWeight={700} color="success.main">
                                          +{link.unitsPerPack || "—"}{" "}
                                          {product.InventoryUnit?.abbreviation ||
                                            product.unitAbbrev ||
                                            "u"}
                                        </Box>{" "}
                                        a «{product.name}».
                                      </Typography>
                                      {link.purchasePresentation ? (
                                        <Typography
                                          variant="caption"
                                          color="text.disabled"
                                          display="block"
                                        >
                                          Empaque: {link.purchasePresentation}
                                        </Typography>
                                      ) : null}
                                    </Box>
                                    <Tooltip title="Editar enlace">
                                      <IconButton size="small" onClick={() => openLinkModal(link.id)}>
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Quitar enlace">
                                      <IconButton size="small" color="warning" onClick={() => unlink(link.id)}>
                                        <LinkOffIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                ))}
                              </Stack>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={sortedProductRows.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Filas"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      </Paper>

      <Grid container spacing={2} sx={{ display: "none" }}>
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
                  ? "Sin insumos genéricos. Crea un producto tipo «Insumo (materia prima)» en Productos o con «Crear producto»."
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
        PaperProps={{ "data-tour": "insumos-link-dialog" }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            pr: 1,
          }}
        >
          <span>Configurar apertura de presentación</span>
          <TourHelpButton
            onClick={startLinkTour}
            title="Ver tutorial del enlace"
          />
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            <strong>1. Empaque</strong> = producto final (Funda Aceite 900ml, Quintal…).{" "}
            <strong>2. Destino</strong> = insumo (Aceite en ml, Harina en g) u otro final.{" "}
            <strong>3. Cantidad</strong> = cuánto del destino suma al abrir <em>1</em> empaque
            (ej. <strong>900 ml</strong>).
          </Typography>

          <Box sx={{ mb: 1.5 }} data-tour="insumos-link-presentation">
            <SearchableSelect
              label="Presentación a abrir (producto final / empaque)"
              placeholder="Buscar quintal, arroba, paca, caja…"
              items={presentationCandidates}
              value={linkProductId}
              onChange={(val) => {
                const nextId =
                  val && typeof val === "object"
                    ? String(val.id ?? "")
                    : String(val ?? "");
                setLinkProductId(nextId);
                const row = allProducts.find((p) => String(p.id) === String(nextId));
                if (row?.genericProductId) {
                  setLinkTargetId(String(row.genericProductId));
                  if (row.unitsPerPack != null && Number(row.unitsPerPack) > 0) {
                    setLinkUnitsPerPack(String(row.unitsPerPack));
                  }
                  if (row.purchasePresentation) setLinkNote(row.purchasePresentation);
                }
              }}
              getOptionValue={(opt) => opt?.id ?? ""}
              getOptionLabel={(opt) => {
                if (!opt) return "";
                return `[Final / empaque] ${opt.name} · ${productUnitAbbrev(opt)}`;
              }}
              getSearchText={(opt) =>
                `${opt?.name || ""} final empaque ${opt?.sku || ""} ${opt?.barcode || ""} ${
                  opt?.purchasePresentation || ""
                }`
              }
              renderOption={(props, option) => (
                <Box
                  component="li"
                  {...props}
                  key={option.id ?? props.key}
                  sx={{
                    display: "flex !important",
                    alignItems: "center !important",
                    justifyContent: "space-between !important",
                    gap: 1,
                    py: "6px !important",
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      Empaque · stock {Number(option.stock || 0)} {productUnitAbbrev(option)}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label="Final"
                    sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem", fontWeight: 700 } }}
                  />
                </Box>
              )}
            />
          </Box>

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
                Empaque seleccionado
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {selectedLink.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Indica el destino (insumo o final) y cuántas unidades entrega cada unidad abierta.
              </Typography>
            </Box>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.5 }}>
            <TextField
              select
              size="small"
              label="Ver destinos"
              value={linkTargetKindFilter}
              onChange={(e) => setLinkTargetKindFilter(e.target.value)}
              sx={{ minWidth: { xs: "100%", sm: 180 } }}
              data-tour="insumos-link-target-filter"
            >
              <MenuItem value="all">Insumos y finales</MenuItem>
              <MenuItem value="insumo">Solo insumos</MenuItem>
              <MenuItem value="final">Solo finales</MenuItem>
            </TextField>
            <Box sx={{ flex: 1, minWidth: 0 }} data-tour="insumos-link-target">
              <SearchableSelect
                label="Destino al abrir"
                placeholder={
                  linkTargetKindFilter === "insumo"
                    ? "Buscar insumo genérico (ej. Harina)…"
                    : linkTargetKindFilter === "final"
                      ? "Buscar producto final unitario…"
                      : "Buscar Harina (insumo) o un final…"
                }
                items={targetCandidates}
                value={linkTargetId}
                onChange={(val) => {
                  const nextId =
                    val && typeof val === "object"
                      ? String(val.id ?? "")
                      : String(val ?? "");
                  setLinkTargetId(nextId);
                }}
                getOptionValue={(opt) => opt?.id ?? ""}
                getOptionLabel={(opt) => {
                  if (!opt) return "";
                  const kind = productKind(opt) === "insumo" ? "Insumo" : "Final";
                  return `[${kind}] ${opt.name} · ${productUnitAbbrev(opt)}`;
                }}
                getSearchText={(opt) =>
                  `${opt?.name || ""} ${productKindLabel(opt)} ${
                    productKind(opt) === "insumo" ? "insumo genérico harina" : "producto final"
                  } ${opt?.sku || ""} ${opt?.barcode || ""}`
                }
                renderOption={(props, option) => {
                  const kind = productKind(option);
                  const isInsumo = kind === "insumo";
                  return (
                    <Box
                      component="li"
                      {...props}
                      key={option.id ?? props.key}
                      sx={{
                        display: "flex !important",
                        alignItems: "center !important",
                        justifyContent: "space-between !important",
                        gap: 1,
                        py: "6px !important",
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {option.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {isInsumo
                            ? `Insumo de receta · stock ${Number(option.stock || 0)} ${productUnitAbbrev(option)}`
                            : `Producto final · stock ${Number(option.stock || 0)} ${productUnitAbbrev(option)}`}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        color={isInsumo ? "secondary" : "primary"}
                        variant={isInsumo ? "filled" : "outlined"}
                        label={isInsumo ? "Insumo" : "Final"}
                        sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem", fontWeight: 700 } }}
                      />
                    </Box>
                  );
                }}
              />
            </Box>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: -0.5, mb: 1.5, display: "block" }}>
            Ejemplo: Funda Aceite 900ml → Aceite (ml) = <strong>900</strong>. Quintal de harina →
            Harina (g) = <strong>45360</strong>.
          </Typography>

          <TextField
            label={
              selectedTarget
                ? `Al abrir 1 empaque, suma al destino (${productUnitAbbrev(selectedTarget)}${
                    measureKind(selectedTarget) === "volume"
                      ? " · volumen"
                      : measureKind(selectedTarget) === "weight"
                        ? " · peso"
                        : ""
                  })`
                : "Cantidad que suma al destino"
            }
            fullWidth
            required
            type="number"
            value={linkUnitsPerPack}
            onChange={(e) => setLinkUnitsPerPack(e.target.value)}
            inputProps={{ min: 0.0001, step: "any" }}
            data-tour="insumos-link-units"
            helperText={
              selectedTarget
                ? `1 × «${selectedLink?.name || "empaque"}» → +${linkUnitsPerPack || "…"} ${
                    productUnitAbbrev(selectedTarget)
                  } en «${selectedTarget.name}».${
                    suggestedPackQty != null
                      ? ` Sugerido: ${suggestedPackQty} ${productUnitAbbrev(selectedTarget)}.`
                      : ""
                  }`
                : "Elige destino primero. Si el insumo está en ml, escribe 900; si está en g, escribe gramos."
            }
            sx={{ mb: 1 }}
          />
          {suggestedPackQty != null && Number(linkUnitsPerPack) !== Number(suggestedPackQty) && (
            <Button size="small" sx={{ mb: 1.5 }} onClick={applySuggestedPackQty}>
              Usar sugerido: {suggestedPackQty}{" "}
              {selectedTarget ? productUnitAbbrev(selectedTarget) : ""}
            </Button>
          )}

          <TextField
            label="Nota del empaque (opcional)"
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
            data-tour="insumos-link-save"
            disabled={
              !linkProductId ||
              !linkTargetId ||
              !Number.isFinite(Number(linkUnitsPerPack)) ||
              Number(linkUnitsPerPack) <= 0
            }
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
