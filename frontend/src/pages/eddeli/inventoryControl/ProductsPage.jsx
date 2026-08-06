import {
  Container,
  IconButton,
  Button,
  Tooltip,
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import TableRowsIcon from "@mui/icons-material/TableRows";
import StorefrontIcon from "@mui/icons-material/Storefront";
import SearchIcon from "@mui/icons-material/Search";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Edit, Delete, Inventory } from "@mui/icons-material";
import toast from "react-hot-toast";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import TourHelpButton from "../../../components/TourHelpButton.jsx";
import ProductForm from "./components/ProductForm";
import ProductsGridView from "./components/ProductsGridView";
import ProductsByStoreView from "./components/ProductsByStoreView";
import {
  getAllProductsAll,
  unwrapListResponse,
  deleteProduct,
  getCategories,
} from "../../../api/inventoryControlRequest";
import { buildImageUrl } from "../../../api/axios";
import TablePro from "../../../components/Tables/TablePro";
import GuestDemoBanner from "../../../components/GuestDemoBanner.jsx";
import { useBarcodeScanner } from "../../../hooks/useBarcodeScanner.js";
import {
  findEddeliProductByCode,
  normalizeProductBarcode,
} from "../../../utils/productLookup.js";
import {
  buildCategoryFilterOptions,
  formatProductCategoryName,
  productMatchesCategoryFilter,
} from "../../../utils/categoryUtils.js";
import { useAppSettings } from "../../../context/AppSettingsContext.jsx";
import { usePageTour } from "../../../hooks/usePageTour.js";
import { PRODUCTOS_TOUR_ID, getProductosTourSteps } from "../../../tours/productosTour.js";

function ProductsPage() {
  const { activeApp } = useAppSettings();
  const multiStockEnabled = activeApp?.multiStockEnabled !== false;
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState([]);
  const [titleUserDialog, settitleUserDialog] = useState("");
  const [viewMode, setViewMode] = useState("cards");
  const [cardSearch, setCardSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!multiStockEnabled && viewMode === "byStore") {
      setViewMode("cards");
    }
  }, [multiStockEnabled, viewMode]);

  const fecthData = async () => {
    setLoading(true);
    try {
      const [{ data: body }, { data: cats }] = await Promise.all([
        getAllProductsAll(),
        getCategories(),
      ]);
      setData(unwrapListResponse(body));
      setAllCategories(cats || []);
    } finally {
      setLoading(false);
    }
  };

  const categoryFilterOptions = useMemo(
    () => buildCategoryFilterOptions(allCategories),
    [allCategories],
  );

  const filteredTableData = useMemo(() => {
    if (!categoryFilter) return data;
    return data.filter((p) => productMatchesCategoryFilter(p, categoryFilter));
  }, [data, categoryFilter]);

  const handleDialog = () => setOpen(!open);

  const closeProductDialog = () => {
    setOpenDialog(false);
    setIsEditing(false);
    setDatos({});
  };

  const deleteData = async () => {
    toast.promise(
      deleteProduct(dataToDelete.id),
      {
        loading: "Eliminando...",
        success: "Producto eliminado con éxito",
        error: "Ocurrió un error",
      },
      { position: "top-right", style: { fontFamily: "roboto" } }
    );
    setData((prev) => prev.filter((item) => item.id !== dataToDelete.id));
    handleDialog();
  };

  const openEditProduct = (product) => {
    setDatos(product);
    setIsEditing(true);
    settitleUserDialog("Editar Producto");
    setOpenDialog(true);
  };

  const openNewProductWithBarcode = useCallback((rawCode) => {
    const code = normalizeProductBarcode(rawCode);
    setDatos({ barcode: code });
    setIsEditing(false);
    settitleUserDialog("Agregar Producto");
    setOpenDialog(true);
  }, []);

  const handleCatalogBarcodeScan = useCallback(
    (rawCode) => {
      const code = normalizeProductBarcode(rawCode);
      if (!code) return;
      const found = findEddeliProductByCode(data, code);
      setCardSearch(code);
      if (found) {
        toast.success(`Encontrado: ${found.name}`);
        openEditProduct(found);
        return;
      }
      openNewProductWithBarcode(code);
      toast("Código no registrado. Completa el nuevo producto.", { icon: "ℹ️" });
    },
    [data, openNewProductWithBarcode],
  );

  useBarcodeScanner({
    enabled: !openDialog && data.length > 0,
    onScan: handleCatalogBarcodeScan,
    ignoreWhenTypingInInputs: true,
  });

  const prepareCardsView = useCallback(async () => {
    setViewMode("cards");
    await new Promise((r) => window.setTimeout(r, 80));
  }, []);

  const prepareTableView = useCallback(async () => {
    setViewMode("table");
    await new Promise((r) => window.setTimeout(r, 100));
  }, []);

  const prepareByStoreView = useCallback(async () => {
    if (!multiStockEnabled) return;
    setViewMode("byStore");
    await new Promise((r) => window.setTimeout(r, 160));
  }, [multiStockEnabled]);

  const resetPageTourDemo = useCallback(() => {
    setOpenDialog(false);
    setIsEditing(false);
    setDatos({});
    setViewMode("cards");
  }, []);

  const getTourSteps = useCallback(
    () =>
      getProductosTourSteps({
        prepareCardsView,
        prepareTableView,
        prepareByStoreView,
        multiStockEnabled,
        resetTourDemo: resetPageTourDemo,
      }),
    [
      prepareCardsView,
      prepareTableView,
      prepareByStoreView,
      multiStockEnabled,
      resetPageTourDemo,
    ],
  );

  const { startTour: startTourBase } = usePageTour({
    tourId: PRODUCTOS_TOUR_ID,
    getSteps: getTourSteps,
    enabled: !loading && !openDialog,
    autoDelayMs: 800,
    onDestroyed: resetPageTourDemo,
  });

  const startTour = useCallback(() => {
    resetPageTourDemo();
    window.setTimeout(() => startTourBase(), 80);
  }, [resetPageTourDemo, startTourBase]);

  const columns = [
    {
      label: "Imagen",
      id: "primaryImageUrl",
      width: 90,
      render: (row) => {
        const src = buildImageUrl(row?.primaryImageUrl);
        return src ? (
          <img
            src={src}
            alt={row?.name || "img"}
            style={{
              width: 60,
              height: 60,
              objectFit: "cover",
              borderRadius: 8,
              display: "block",
            }}
          />
        ) : (
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: 1,
              bgcolor: "action.hover",
            }}
          />
        );
      },
    },
    {
      label: "Nombre",
      id: "name",
      width: 180,
    },
    {
      label: "Código",
      id: "barcode",
      width: 120,
      render: (row) => row.barcode || row.sku || "—",
    },
    {
      label: "Tipo",
      id: "type",
      width: 100,
      render: (params) => {
        const type = params.type;
        return type === "raw"
          ? "Materia Prima"
          : type === "intermediate"
          ? "Producto Intermedio"
          : "Producto Final";
      },
    },
    {
      label: "Categoría",
      id: "category",
      width: 100,
      render: (params) => formatProductCategoryName(params),
    },
    {
      label: "P. proveedor",
      id: "supplierPrice",
      width: 90,
      render: (row) => `$${Number(row.supplierPrice ?? 0).toFixed(2)}`,
    },
    {
      label: "P. distribuidor",
      id: "distributorPrice",
      width: 100,
      render: (row) => `$${Number(row.distributorPrice ?? 0).toFixed(2)}`,
    },
    {
      label: "P. venta",
      id: "price",
      width: 80,
      render: (row) => `$${Number(row.price ?? 0).toFixed(2)}`,
    },
    {
      label: multiStockEnabled ? "Stock (suma)" : "Stock",
      id: "stock",
      width: 90,
    },
    {
      label: "Acciones",
      id: "actions",
      width: 150,
      render: (params) => (
        <>
          <Tooltip title="Editar Producto">
            <IconButton onClick={() => openEditProduct(params)}>
              <Edit />
            </IconButton>
          </Tooltip>

          <Tooltip title="Eliminar Producto">
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

  useEffect(() => {
    fecthData();
  }, []);

  return (
    <Container>
      <GuestDemoBanner />
      <SimpleDialog
        open={open}
        onClose={handleDialog}
        tittle="Eliminar Producto"
        onClickAccept={deleteData}
      >
        ¿Está seguro de eliminar el producto?
      </SimpleDialog>

      <Dialog
        open={openDialog}
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
            {titleUserDialog}
          </DialogTitle>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <IconButton aria-label="Cerrar" onClick={closeProductDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        <DialogContent
          dividers
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 1,
            flex: "0 1 auto",
            overflow: "visible",
          }}
        >
          <ProductForm
            key={isEditing ? datos?.id ?? "edit" : datos?.barcode ?? "new"}
            onClose={closeProductDialog}
            isEditing={isEditing}
            datos={datos}
            reload={fecthData}
          />
        </DialogContent>

        <DialogActions
          sx={{
            px: 2,
            py: 1,
            gap: 1,
            flexShrink: 0,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Button type="button" onClick={closeProductDialog} color="inherit">
            Cancelar
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            type="submit"
            form="eddeli-product-form"
            variant="contained"
            data-tour="producto-form-save"
            sx={{ minWidth: 160 }}
          >
            {isEditing ? "Actualizar producto" : "Guardar producto"}
          </Button>
        </DialogActions>
      </Dialog>

      <Paper
        data-tour="productos-header"
        sx={{
          p: 2,
          mb: 2,
          mt: 1,
          borderRadius: 2,
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
        }}
      >
        <Button
          data-tour="productos-create"
          variant="text"
          endIcon={<Inventory />}
          onClick={() => {
            setIsEditing(false);
            setDatos({});
            settitleUserDialog("Agregar Producto");
            setOpenDialog(true);
          }}
        >
          Crear Producto
        </Button>
        <TourHelpButton onClick={startTour} title="Ver tutorial de productos" />
        <Box sx={{ flexGrow: 1 }} />
        <FormControl size="small" sx={{ minWidth: 220 }} data-tour="productos-category">
          <InputLabel>Categoría</InputLabel>
          <Select
            value={categoryFilter}
            label="Categoría"
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <MenuItem value="">
              <em>Todas</em>
            </MenuItem>
            {categoryFilterOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <ToggleButtonGroup
          data-tour="productos-view-mode"
          size="small"
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          aria-label="vista de productos"
        >
          <ToggleButton value="cards" aria-label="tarjetas">
            <ViewModuleIcon sx={{ mr: 0.5 }} fontSize="small" />
            Tarjetas
          </ToggleButton>
          <ToggleButton value="table" aria-label="tabla">
            <TableRowsIcon sx={{ mr: 0.5 }} fontSize="small" />
            Tabla
          </ToggleButton>
          {multiStockEnabled ? (
            <ToggleButton value="byStore" aria-label="por local">
              <StorefrontIcon sx={{ mr: 0.5 }} fontSize="small" />
              Por local
            </ToggleButton>
          ) : null}
        </ToggleButtonGroup>
      </Paper>

      {viewMode === "cards" ? (
        <Paper data-tour="productos-cards" sx={{ p: 2.5, borderRadius: 2 }}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              Catálogo
            </Typography>
            <TextField
              data-tour="productos-search"
              size="small"
              placeholder="Buscar o escanear código de barras…"
              value={cardSearch}
              onChange={(e) => setCardSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && cardSearch.trim()) {
                  e.preventDefault();
                  handleCatalogBarcodeScan(cardSearch);
                }
              }}
              sx={{ minWidth: 260, flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <ProductsGridView
            products={data}
            search={cardSearch}
            categoryFilter={categoryFilter}
            onEdit={openEditProduct}
            onReload={fecthData}
            loading={loading}
          />
        </Paper>
      ) : viewMode === "byStore" && multiStockEnabled ? (
        <ProductsByStoreView
          products={data}
          categoryFilter={categoryFilter}
          onEdit={openEditProduct}
          onReload={fecthData}
          loading={loading}
        />
      ) : (
        <Box data-tour="productos-table">
          <TablePro
            rows={filteredTableData}
            columns={columns}
            defaultRowsPerPage={25}
            rowsPerPageOptions={[25, 50, 100, 200]}
            title="PRODUCTOS"
            showIndex={true}
            loading={loading}
          />
        </Box>
      )}
    </Container>
  );
}

export default ProductsPage;
