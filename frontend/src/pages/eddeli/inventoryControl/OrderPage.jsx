import {
  Container,
  Button,
  Typography,
  Box,
  Stack,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import AssignmentIcon from "@mui/icons-material/Assignment";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useCallback, useRef, useState } from "react";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import TourHelpButton from "../../../components/TourHelpButton.jsx";
import OrderForm from "./components/OrderForm";
import SupplierOrderForm, {
  SUPPLIER_ORDER_DIALOG_CONTENT_SX,
  SUPPLIER_ORDER_DIALOG_PAPER_SX,
} from "./components/SupplierOrderForm";
import {
  getOrdersForMonthRequest,
  getSupplierOrdersForMonthRequest,
  exportOrdersMonthRequest,
  importOrdersMonthRequest,
} from "../../../api/ordersRequest";
import OrderCalendaryTable from "./components/OrderCalendaryTable";
import {
  mergeOrdersById,
  monthCacheKey,
  patchOrderItemInList,
  removeOrderFromList,
  removeOrderItemFromList,
} from "../../../utils/orderListUtils";
import { isPedidosListOrder } from "../../../utils/eddeliPosOrderUtils.js";
import { usePageTour } from "../../../hooks/usePageTour.js";
import { PEDIDOS_TOUR_ID, getPedidosTourSteps } from "../../../tours/pedidosTour.js";
import {
  PEDIDO_CLIENTE_FORM_TOUR_ID,
  getPedidoClienteFormTourSteps,
} from "../../../tours/pedidoClienteFormTour.js";
import {
  PEDIDO_PROVEEDOR_FORM_TOUR_ID,
  getPedidoProveedorFormTourSteps,
} from "../../../tours/pedidoProveedorFormTour.js";
import { useAuth } from "../../../context/AuthContext";
import { format } from "date-fns";

function OrderPage() {
  const { toast } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openSupplierDialog, setOpenSupplierDialog] = useState(false);
  const [titleDialog, setTitleDialog] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);
  const [supplierOrderToEdit, setSupplierOrderToEdit] = useState(null);
  const [supplierPrefill, setSupplierPrefill] = useState(null);

  const loadedMonthsRef = useRef(new Set());
  const visibleMonthRef = useRef(new Date());
  const calendarTourRef = useRef(null);
  const orderFormTourRef = useRef(null);
  const supplierFormTourRef = useRef(null);
  const importFileRef = useRef(null);

  const loadOrdersForMonth = useCallback(async (visibleMonth, { force = false } = {}) => {
    const key = monthCacheKey(visibleMonth);
    if (!force && loadedMonthsRef.current.has(key)) return;

    setLoadingOrders(true);
    try {
      const [customerRes, supplierRes] = await Promise.all([
        getOrdersForMonthRequest(visibleMonth),
        getSupplierOrdersForMonthRequest(visibleMonth),
      ]);
      loadedMonthsRef.current.add(key);
      const manualOrders = (Array.isArray(customerRes.data) ? customerRes.data : [])
        .filter(isPedidosListOrder)
        .map((o) => ({ ...o, orderKind: o.orderKind || "customer" }));
      const supplierOrders = (Array.isArray(supplierRes.data) ? supplierRes.data : []).map(
        (o) => ({ ...o, orderKind: "supplier" })
      );
      setOrders((prev) => mergeOrdersById(prev, [...manualOrders, ...supplierOrders]));
    } catch (e) {
      console.error("OrderPage: cargar pedidos", e);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const handleMonthChange = useCallback(
    (monthDate) => {
      visibleMonthRef.current = monthDate;
      loadOrdersForMonth(monthDate);
    },
    [loadOrdersForMonth],
  );

  const refreshCurrentRange = useCallback(async () => {
    const month = visibleMonthRef.current;
    loadedMonthsRef.current.delete(monthCacheKey(month));
    await loadOrdersForMonth(month, { force: true });
  }, [loadOrdersForMonth]);

  const handleExportMonth = useCallback(async () => {
    const month = visibleMonthRef.current || new Date();
    setTransferBusy(true);
    try {
      const res = await toast({
        promise: exportOrdersMonthRequest(month),
        successMessage: "JSON del mes exportado",
        errorMessage: "No se pudo exportar el mes",
      });
      const data = res?.data;
      if (!data) return;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pedidos-${format(month, "yyyy-MM")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      /* toast ya mostró el error */
    } finally {
      setTransferBusy(false);
    }
  }, [toast]);

  const handleImportMonthClick = useCallback(() => {
    if (transferBusy) return;
    const ok = window.confirm(
      "Importar JSON del mes\n\n" +
        "• Crea pedidos de clientes y proveedores (solo datos).\n" +
        "• No mueve stock ni recrea cobranzas / Income.\n" +
        "• Los productos deben existir (código de barras, SKU o nombre).\n\n" +
        "¿Continuar?",
    );
    if (!ok) return;
    importFileRef.current?.click();
  }, [transferBusy]);

  const handleImportFileChange = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      setTransferBusy(true);
      try {
        const text = await file.text();
        let payload;
        try {
          payload = JSON.parse(text);
        } catch {
          toast({
            message: "El archivo no es un JSON válido",
            variant: "warning",
          });
          return;
        }
        if (payload?.kind !== "eddeli-orders-month") {
          toast({
            message: "JSON inválido: se espera un export de pedidos del mes",
            variant: "warning",
          });
          return;
        }

        const res = await toast({
          promise: importOrdersMonthRequest(payload),
          successMessage: "Importación lista",
          errorMessage: "No se pudo importar el JSON",
        });
        const s = res?.data?.summary;
        if (s) {
          const skipped = Array.isArray(s.skipped) ? s.skipped.length : 0;
          const errors = Array.isArray(s.errors) ? s.errors.length : 0;
          toast({
            message:
              `Clientes: ${s.customerOrdersCreated || 0} · ` +
              `Proveedores: ${s.supplierOrdersCreated || 0}` +
              (skipped ? ` · Omitidos: ${skipped}` : "") +
              (errors ? ` · Errores: ${errors}` : ""),
            variant: errors ? "warning" : "success",
          });
        }
        await refreshCurrentRange();
      } catch {
        /* toast ya mostró el error */
      } finally {
        setTransferBusy(false);
      }
    },
    [toast, refreshCurrentRange],
  );

  const patchOrderItem = useCallback((orderId, itemId, fields) => {
    setOrders((prev) => patchOrderItemInList(prev, orderId, itemId, fields));
  }, []);

  const removeOrder = useCallback((orderId, orderKind = "customer") => {
    setOrders((prev) => removeOrderFromList(prev, orderId, orderKind));
  }, []);

  const removeOrderItem = useCallback((orderId, itemId) => {
    setOrders((prev) => removeOrderItemFromList(prev, orderId, itemId));
  }, []);

  const handleDialog = () => setOpenDialog(!openDialog);
  const handleSupplierDialog = () => setOpenSupplierDialog(!openSupplierDialog);

  const closeDialog = useCallback(async () => {
    setIsEditing(false);
    setOrderToEdit(null);
    setOpenDialog(false);
    await refreshCurrentRange();
  }, [refreshCurrentRange]);

  const closeSupplierDialog = useCallback(async () => {
    setIsEditingSupplier(false);
    setSupplierOrderToEdit(null);
    setSupplierPrefill(null);
    setOpenSupplierDialog(false);
    await refreshCurrentRange();
  }, [refreshCurrentRange]);

  const resetTourDemo = useCallback(() => {
    calendarTourRef.current?.resetTourDemo?.();
    orderFormTourRef.current?.resetDemo?.();
    supplierFormTourRef.current?.resetDemo?.();
  }, []);

  const resetPageTourDemo = useCallback(() => {
    resetTourDemo();
    setIsEditing(false);
    setOrderToEdit(null);
    setOpenDialog(false);
  }, [resetTourDemo]);

  const prepareOpenDayDemo = useCallback(
    () => calendarTourRef.current?.prepareOpenDayDemo?.(),
    [],
  );
  const prepareExpandOrderDemo = useCallback(
    () => calendarTourRef.current?.prepareExpandOrderDemo?.(),
    [],
  );
  const prepareCreateFormDemo = useCallback(async () => {
    setIsEditing(false);
    setOrderToEdit(null);
    setTitleDialog("Nuevo pedido de cliente");
    setOpenDialog(true);
    await new Promise((r) => window.setTimeout(r, 180));
  }, []);

  const runCreateFormItemsDemo = useCallback(async () => {
    if (!openDialog) {
      await prepareCreateFormDemo();
    }
    await new Promise((r) => window.setTimeout(r, 120));
    await orderFormTourRef.current?.runItemsDemo?.();
  }, [openDialog, prepareCreateFormDemo]);

  const getTourSteps = useCallback(
    () =>
      getPedidosTourSteps({
        prepareOpenDayDemo,
        prepareExpandOrderDemo,
        prepareCreateFormDemo,
        runCreateFormItemsDemo,
        resetTourDemo: resetPageTourDemo,
      }),
    [
      prepareOpenDayDemo,
      prepareExpandOrderDemo,
      prepareCreateFormDemo,
      runCreateFormItemsDemo,
      resetPageTourDemo,
    ],
  );

  const getClienteFormTourSteps = useCallback(
    () =>
      getPedidoClienteFormTourSteps({
        runItemsDemo: () => orderFormTourRef.current?.runItemsDemo?.(),
        resetDemo: () => orderFormTourRef.current?.resetDemo?.(),
        createPackDemo: () => orderFormTourRef.current?.createPackDemo?.(),
      }),
    [],
  );

  const getProveedorFormTourSteps = useCallback(
    () =>
      getPedidoProveedorFormTourSteps({
        runItemsDemo: () => supplierFormTourRef.current?.runItemsDemo?.(),
        resetDemo: () => supplierFormTourRef.current?.resetDemo?.(),
        createPackDemo: () => supplierFormTourRef.current?.createPackDemo?.(),
      }),
    [],
  );

  const { startTour: startTourBase } = usePageTour({
    tourId: PEDIDOS_TOUR_ID,
    getSteps: getTourSteps,
    enabled: !loadingOrders && orders.length > 0 && !openDialog && !openSupplierDialog,
    autoDelayMs: 800,
    onDestroyed: resetPageTourDemo,
  });

  const { startTour: startClienteFormTour } = usePageTour({
    tourId: PEDIDO_CLIENTE_FORM_TOUR_ID,
    getSteps: getClienteFormTourSteps,
    enabled: openDialog && !isEditing,
    autoDelayMs: 450,
    onDestroyed: () => orderFormTourRef.current?.resetDemo?.(),
  });

  const { startTour: startProveedorFormTour } = usePageTour({
    tourId: PEDIDO_PROVEEDOR_FORM_TOUR_ID,
    getSteps: getProveedorFormTourSteps,
    enabled: openSupplierDialog && !isEditingSupplier,
    autoDelayMs: 450,
    onDestroyed: () => supplierFormTourRef.current?.resetDemo?.(),
  });

  const startTour = useCallback(() => {
    resetPageTourDemo();
    startTourBase();
  }, [resetPageTourDemo, startTourBase]);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 1, sm: 1.5 }, px: { xs: 1.5, sm: 2 } }}>
      <Paper
        variant="panel"
        data-tour="pedidos-header"
        sx={{ p: { xs: 1.25, sm: 1.5 }, mb: 1.5, borderRadius: 2 }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          flexWrap="wrap"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={1}
          useFlexGap
        >
          <Box sx={{ flex: "1 1 auto", minWidth: 0, display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                flexShrink: 0,
              }}
            >
              <AssignmentIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ mb: 0.25, fontWeight: 800, lineHeight: 1.2 }}>
                Pedidos
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Calendario de pedidos a clientes y compras a proveedores
              </Typography>
            </Box>
          </Box>

          <Stack
            direction="row"
            flexWrap="wrap"
            alignItems="center"
            spacing={0.75}
            useFlexGap
            sx={{ flexShrink: 0, justifyContent: { xs: "flex-end", sm: "flex-end" } }}
          >
            <input
              ref={importFileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={handleImportFileChange}
            />
            <Tooltip title="Exportar JSON del mes visible (clientes + proveedores)">
              <span>
                <IconButton
                  data-tour="pedidos-export-month"
                  size="small"
                  color="primary"
                  disabled={transferBusy || loadingOrders}
                  onClick={handleExportMonth}
                  aria-label="Exportar mes"
                >
                  {transferBusy ? (
                    <CircularProgress size={18} />
                  ) : (
                    <FileDownloadOutlinedIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Importar JSON del mes (solo datos; sin stock ni cobranzas)">
              <span>
                <IconButton
                  data-tour="pedidos-import-month"
                  size="small"
                  color="primary"
                  disabled={transferBusy || loadingOrders}
                  onClick={handleImportMonthClick}
                  aria-label="Importar mes"
                >
                  <UploadFileIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <TourHelpButton onClick={startTour} title="Ver tutorial de pedidos" />
            <Button
              data-tour="pedidos-create-customer"
              size="small"
              variant="contained"
              startIcon={<PersonAddIcon sx={{ fontSize: "1rem !important" }} />}
              sx={{ py: 0.65, px: 1.5, minHeight: 32, fontSize: "0.8125rem", fontWeight: 600, borderRadius: 1.5 }}
              onClick={() => {
                setIsEditing(false);
                setOrderToEdit(null);
                setTitleDialog("Nuevo pedido de cliente");
                handleDialog();
              }}
            >
              Pedido cliente
            </Button>
            <Button
              data-tour="pedidos-create-supplier"
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<LocalShippingOutlinedIcon sx={{ fontSize: "1rem !important" }} />}
              sx={{ py: 0.65, px: 1.5, minHeight: 32, fontSize: "0.8125rem", fontWeight: 600, borderRadius: 1.5 }}
              onClick={() => {
                setIsEditingSupplier(false);
                setSupplierOrderToEdit(null);
                setSupplierPrefill(null);
                handleSupplierDialog();
              }}
            >
              Pedido proveedor
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <SimpleDialog
        open={openDialog}
        onClose={() => {
          setIsEditing(false);
          setOrderToEdit(null);
          orderFormTourRef.current?.resetDemo?.();
          handleDialog();
        }}
        tittle={titleDialog}
        maxWidth="lg"
        fullWidth
        titleExtra={
          !isEditing ? (
            <TourHelpButton
              onClick={startClienteFormTour}
              title="Ver tutorial de este formulario"
            />
          ) : null
        }
      >
        <OrderForm
          ref={orderFormTourRef}
          onClose={closeDialog}
          reload={refreshCurrentRange}
          isEditing={isEditing}
          datos={orderToEdit}
          active={openDialog}
        />
      </SimpleDialog>

      <SimpleDialog
        open={openSupplierDialog}
        onClose={() => {
          setIsEditingSupplier(false);
          setSupplierOrderToEdit(null);
          setSupplierPrefill(null);
          supplierFormTourRef.current?.resetDemo?.();
          handleSupplierDialog();
        }}
        tittle={
          isEditingSupplier
            ? "Editar pedido a proveedor"
            : supplierPrefill?.supplierName
              ? `Nuevo pedido a ${supplierPrefill.supplierName}`
              : "Registrar pedido a proveedor"
        }
        maxWidth="xl"
        fullWidth
        paperSx={SUPPLIER_ORDER_DIALOG_PAPER_SX}
        contentSx={SUPPLIER_ORDER_DIALOG_CONTENT_SX}
        titleExtra={
          !isEditingSupplier ? (
            <TourHelpButton
              onClick={startProveedorFormTour}
              title="Ver tutorial de este formulario"
            />
          ) : null
        }
      >
        <SupplierOrderForm
          ref={supplierFormTourRef}
          onClose={closeSupplierDialog}
          reload={refreshCurrentRange}
          isEditing={isEditingSupplier}
          datos={supplierOrderToEdit}
          prefillSupplierId={supplierPrefill?.supplierId}
          prefillDate={supplierPrefill?.date}
          lockSupplier={Boolean(supplierPrefill?.supplierId)}
          active={openSupplierDialog}
        />
      </SimpleDialog>

      <Paper variant="panel" sx={{ p: { xs: 1, sm: 1.25 }, borderRadius: 2, overflow: 'hidden' }}>
        <OrderCalendaryTable
        ref={calendarTourRef}
        orders={orders}
        loadingOrders={loadingOrders}
        onMonthChange={handleMonthChange}
        onReload={refreshCurrentRange}
        onPatchItem={patchOrderItem}
        onRemoveOrder={removeOrder}
        onRemoveOrderItem={removeOrderItem}
        onEdit={(pedido) => {
          setIsEditing(true);
          setOrderToEdit(pedido);
          setTitleDialog("Editar pedido de cliente");
          setOpenDialog(true);
        }}
        onEditSupplier={(pedido) => {
          setIsEditingSupplier(true);
          setSupplierOrderToEdit(pedido);
          setSupplierPrefill(null);
          setOpenSupplierDialog(true);
        }}
      />
      </Paper>
    </Container>
  );
}

export default OrderPage;
