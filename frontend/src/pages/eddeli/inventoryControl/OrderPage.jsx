import {
  Container,
  Button,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import { useCallback, useRef, useState } from "react";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import TourHelpButton from "../../../components/TourHelpButton.jsx";
import OrderForm from "./components/OrderForm";
import SupplierOrderForm from "./components/SupplierOrderForm";
import {
  getOrdersForMonthRequest,
  getSupplierOrdersForMonthRequest,
} from "../../../api/ordersRequest";
import OrderCalendaryTable from "./components/OrderCalendaryTable";
import {
  mergeOrdersById,
  monthCacheKey,
  patchOrderItemInList,
  removeOrderFromList,
  removeOrderItemFromList,
} from "../../../utils/orderListUtils";
import { isCajaPosOrder } from "../../../utils/eddeliPosOrderUtils.js";
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

function OrderPage() {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
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
        .filter((o) => !isCajaPosOrder(o))
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
  const runAddLineDemo = useCallback(
    () => calendarTourRef.current?.runAddLineDemo?.(),
    [],
  );
  const confirmAddLineDemo = useCallback(
    () => calendarTourRef.current?.confirmAddLineDemo?.(),
    [],
  );

  const prepareCreateFormDemo = useCallback(async () => {
    setIsEditing(false);
    setOrderToEdit(null);
    setTitleDialog("Registrar nuevo pedido");
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
        runAddLineDemo,
        confirmAddLineDemo,
        prepareCreateFormDemo,
        runCreateFormItemsDemo,
        resetTourDemo: resetPageTourDemo,
      }),
    [
      prepareOpenDayDemo,
      prepareExpandOrderDemo,
      runAddLineDemo,
      confirmAddLineDemo,
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
      }),
    [],
  );

  const getProveedorFormTourSteps = useCallback(
    () =>
      getPedidoProveedorFormTourSteps({
        runItemsDemo: () => supplierFormTourRef.current?.runItemsDemo?.(),
        resetDemo: () => supplierFormTourRef.current?.resetDemo?.(),
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
    <Container>
      <Stack
        data-tour="pedidos-header"
        direction="row"
        flexWrap="wrap"
        alignItems="center"
        spacing={0.75}
        useFlexGap
        sx={{ mb: 1, gap: 0.75 }}
      >
        <Typography variant="subtitle1" sx={{ flex: "1 1 auto", minWidth: 120, mb: 0, fontWeight: 600 }}>
          Pedidos Registrados
        </Typography>
        <TourHelpButton onClick={startTour} title="Ver tutorial de pedidos" />
        <Button
          data-tour="pedidos-create-customer"
          size="small"
          variant="contained"
          sx={{ py: 0.4, px: 1.25, minHeight: 28, fontSize: "0.8125rem" }}
          onClick={() => {
            setIsEditing(false);
            setOrderToEdit(null);
            setTitleDialog("Registrar nuevo pedido");
            handleDialog();
          }}
        >
          Crear pedido (cliente)
        </Button>
        <Button
          data-tour="pedidos-create-supplier"
          size="small"
          variant="contained"
          color="secondary"
          sx={{ py: 0.4, px: 1.25, minHeight: 28, fontSize: "0.8125rem" }}
          onClick={() => {
            setIsEditingSupplier(false);
            setSupplierOrderToEdit(null);
            setSupplierPrefill(null);
            handleSupplierDialog();
          }}
        >
          Pedido a proveedor
        </Button>
      </Stack>

      <SimpleDialog
        open={openDialog}
        onClose={() => {
          setIsEditing(false);
          setOrderToEdit(null);
          orderFormTourRef.current?.resetDemo?.();
          handleDialog();
        }}
        tittle={titleDialog}
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
        maxWidth="lg"
        fullWidth
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
          setTitleDialog("Editar Pedido");
          setOpenDialog(true);
        }}
        onEditSupplier={(pedido) => {
          setIsEditingSupplier(true);
          setSupplierOrderToEdit(pedido);
          setSupplierPrefill(null);
          setOpenSupplierDialog(true);
        }}
      />
    </Container>
  );
}

export default OrderPage;
