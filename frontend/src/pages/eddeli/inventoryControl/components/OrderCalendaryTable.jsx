import React, { useState, useEffect, useMemo, useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
import {
  Box, Button, Typography, Grid, Paper, Collapse, TextField, IconButton, Tooltip,
  Accordion, AccordionSummary, AccordionDetails, Divider,
  useTheme, CircularProgress, ToggleButton, ToggleButtonGroup,
  Chip, LinearProgress, Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import {
  format, addMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, startOfWeek, endOfWeek,
  isSameDay, parse, isSameMonth
} from 'date-fns';
import { es } from 'date-fns/locale';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import PaymentsIcon from '@mui/icons-material/Payments';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TodayIcon from '@mui/icons-material/Today';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import {
  updateOrderItemRequest,
  markItemAsPaidRequest,
  markItemAsDeliveredRequest,
  deleteOrder,
  deleteOrderItem,
  updateOrderRequest,
  getAllCustomersRequest,
  addOrderItemToOrderRequest,
} from '../../../../api/ordersRequest';
import { getAllProductsAll } from '../../../../api/inventoryControlRequest';
import { useAuth } from '../../../../context/AuthContext';
import { formatDateTime } from '../../../../helpers/functions';

const ORDER_DATE_FMT = 'dd/MM/yyyy HH:mm:ss';

/** Parsea fecha de pedido; evita crash si viene undefined o mal formateada. */
function parseOrderDate(value) {
  if (value == null || value === '') return null;
  try {
    const d = parse(String(value), ORDER_DATE_FMT, new Date());
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}
import SimpleDialog from '../../../../components/Dialogs/SimpleDialog';
import SearchableSelect from '../../../../components/SearchableSelect';
import ProductPriceReference, {
  getDefaultDistributorPrice,
  getProductUnitLabel,
  formatOrderLineTotal,
  formatProductPrice,
  formatUnitPrice,
} from './ProductPriceReference';
import DocumentAttachmentIcon from './DocumentAttachmentIcon';
import DocumentUploadButton from './DocumentUploadButton';
import PrintFormatDialog from '../../../../components/saleReceipt/PrintFormatDialog.jsx';
import { buildReceiptFromCustomerOrder } from '../../../../utils/saleReceiptUtils.js';
import { formatOrderItemFromApi } from '../../../../utils/orderListUtils';
import SupplierOrderAccordion from './SupplierOrderAccordion';
import CustomerOrderPayDialog from './CustomerOrderPayDialog';

/* ---------------- Utils ---------------- */
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// Severidad por un solo pedido (0 = peor / rojo, 3 = ok / verde). Misma lógica que getStatusBaseColor.
function getOrderStatusSeverity(items) {
  if (!items?.length) return 3;
  const allPaid = items.every((i) => i.paidAt);
  const allDelivered = items.every((i) => i.deliveredAt);
  const somePaid = items.some((i) => i.paidAt);
  const someDelivered = items.some((i) => i.deliveredAt);

  if (allPaid && allDelivered) return 3;
  if (!somePaid && !someDelivered) return 0;
  if (someDelivered && !allPaid) return 1;
  if (somePaid && !allDelivered) return 2;
  return 1;
}

function getSupplierOrderSeverity(order) {
  const received = Boolean(order?.receivedAt);
  const total = Number(order?.totalAmount);
  const paid = Number(order?.paidAmount);
  const remaining =
    order?.remainingAmount != null
      ? Number(order.remainingAmount)
      : order?.paidAt
        ? 0
        : Number.isFinite(total) && Number.isFinite(paid)
          ? Math.max(0, total - paid)
          : order?.paidAt
            ? 0
            : 1;
  const fullyPaid = Boolean(order?.paidAt) || remaining <= 0.009;
  const partial = !fullyPaid && Number.isFinite(paid) && paid > 0.009;

  if (fullyPaid && received) return 3;
  if (!fullyPaid && !received && !partial) return 0;
  if (partial) return received ? 1 : 0;
  if (received && !fullyPaid) return 1;
  if (fullyPaid && !received) return 2;
  return 1;
}

function getOrderSeverity(order) {
  if (order?.orderKind === 'supplier') return getSupplierOrderSeverity(order);
  return getOrderStatusSeverity(order.ERP_order_items || order.items || []);
}

/** Color del día en calendario: gana el pedido “peor” (si hay uno rojo y otro verde → rojo). */
function getCalendarDayBaseColor(dailyOrders, theme) {
  if (!dailyOrders?.length) return null;
  const worst = Math.min(...dailyOrders.map((o) => getOrderSeverity(o)));
  const { palette } = theme;
  if (worst === 0) return palette.error.main;
  if (worst === 1) return palette.warning.main;
  if (worst === 2) return palette.info.main;
  if (worst === 3) return palette.success.main;
  return null;
}

// Devuelve el color base (success/error/warning/info) según el estado de los ítems (un pedido o lista coherente)
function getStatusBaseColor(items, theme) {
  const allPaid = items.every(i => i.paidAt);
  const allDelivered = items.every(i => i.deliveredAt);
  const somePaid = items.some(i => i.paidAt);
  const someDelivered = items.some(i => i.deliveredAt);
  const { palette } = theme;

  if (allPaid && allDelivered) return palette.success.main;   // ✓ pagado + entregado
  if (!somePaid && !someDelivered) return palette.error.main; // ✗ nada pagado/entregado
  if (someDelivered && !allPaid) return palette.warning.main; // entregado, falta pago
  if (somePaid && !allDelivered) return palette.info.main;    // pagado, falta entrega
  return null; // neutro
}

// Fondo por estado usando una tonalidad variable (alpha) unificada
function getColorByStatus(items, theme, tone) {
  const base = getStatusBaseColor(items, theme);
  if (base) return alpha(base, tone);
  return theme.palette.mode === 'dark' ? theme.palette.background.paper : 'white';
}

const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const buildFullDate = (dateStr, hh, mm, ss) => {
  if (!dateStr || hh === '' || mm === '' || ss === '') return null;
  const str = `${dateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

function getOrderStatusMeta(items) {
  const sev = getOrderStatusSeverity(items);
  if (sev === 3) return { label: 'Completo', color: 'success' };
  if (sev === 0) return { label: 'Sin avance', color: 'error' };
  if (sev === 1) return { label: 'Entregado · falta cobro', color: 'warning' };
  if (sev === 2) return { label: 'Cobrado · falta entrega', color: 'info' };
  return { label: 'Parcial', color: 'warning' };
}

function orderProgress(items) {
  const list = items || [];
  if (!list.length) return { paid: 0, delivered: 0, paidCount: 0, deliveredCount: 0, total: 0 };
  const paidCount = list.filter((i) => i.paidAt).length;
  const deliveredCount = list.filter((i) => i.deliveredAt).length;
  return {
    paid: (paidCount / list.length) * 100,
    delivered: (deliveredCount / list.length) * 100,
    paidCount,
    deliveredCount,
    total: list.length,
  };
}

const STATUS_LEGEND = [
  { label: 'Sin avance', key: 'error' },
  { label: 'Entregado · falta cobro', key: 'warning' },
  { label: 'Cobrado · falta entrega', key: 'info' },
  { label: 'Completo', key: 'success' },
];

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Radio visible en celdas del calendario (fecha + N pedidos). */
const DAY_CELL_RADIUS = '12px';

const calendarGridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: 1,
};

/* ---------------- Component ---------------- */
export default forwardRef(function OrderCalendarView({
  orders,
  loadingOrders = false,
  onMonthChange,
  onReload,
  onPatchItem,
  onRemoveOrder,
  onRemoveOrderItem,
  onEdit,
  onEditSupplier,
}, tourApiRef) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [orderFilter, setOrderFilter] = useState('all');
  const [fields, setFields] = useState({});
  const [editMode, setEditMode] = useState({});
  const [expandedOrders, setExpandedOrders] = useState({});
  const [tourFocusDay, setTourFocusDay] = useState(null);
  const [tourExtraItems, setTourExtraItems] = useState({});
  const tourGenRef = useRef(0);

  const theme = useTheme();

  // 🔸 Tonalidades centralizadas (ajusta aquí y se refleja en todo)
  const tones = {
    state: theme.palette.mode === 'dark' ? 0.4 : 0.2,       // fondos por estado (success/error/info/warning)
    stateHover: theme.palette.mode === 'dark' ? 0.18 : 0.48,  // hover del mismo estado (un poco más intenso)
    hoverNeutral: theme.palette.mode === 'dark' ? 0.14 : 0.10,// hover cuando no hay estado (fallback primario)
    selected: theme.palette.mode === 'dark' ? 0.25 : 0.5,    // día seleccionado
    outOfMonth: theme.palette.mode === 'dark' ? 0.40 : 0.10,  // días fuera de mes
    border: 0.6,                                              // opacidad de bordes
  };

  // Edición de orden (date y notes)
  const [orderEditMode, setOrderEditMode] = useState({});
  const [orderFields, setOrderFields] = useState({});

  // Dialogs de eliminación
  const [openDeleteOrder, setOpenDeleteOrder] = useState(false);
  const [openDeleteItem, setOpenDeleteItem] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [payCustomerOrder, setPayCustomerOrder] = useState(null);

  const { user, toast: toastAuth } = useAuth();

  const applyItemFromResponse = (response, itemId) => {
    const raw = response?.data?.item;
    const orderId = raw?.orderId;
    if (raw && orderId && onPatchItem) {
      onPatchItem(orderId, itemId, formatOrderItemFromApi(raw));
      return true;
    }
    return false;
  };

  const runMutation = async (promise, afterSuccess) => {
    try {
      const result = await toastAuth({ promise });
      await afterSuccess?.(result);
    } catch {
      /* toast ya mostró el error */
    }
  };

  const canManageOrders = ['Administrador', 'Programador'].includes(user?.loginRol);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  /** Borrador por pedido: agregar línea sin abrir otro formulario */
  const [addLineDraft, setAddLineDraft] = useState({});
  const [printOpen, setPrintOpen] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(null);

  const handlePrevMonth = () => setCurrentDate((prev) => addMonths(prev, -1));
  const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));

  useEffect(() => {
    onMonthChange?.(currentDate);
  }, [currentDate, onMonthChange]);

  useEffect(() => {
    if (!canManageOrders) return;
    let cancelled = false;
    (async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          getAllCustomersRequest(),
          getAllProductsAll(),
        ]);
        if (cancelled) return;
        setCustomers(custRes?.data || []);
        setProducts(prodRes?.data || []);
      } catch (e) {
        console.error('OrderCalendaryTable: catálogo clientes/productos', e);
      }
    })();
    return () => { cancelled = true; };
  }, [canManageOrders]);

  const startDay = startOfMonth(currentDate);
  const endDay = endOfMonth(currentDate);
  const startWeek = startOfWeek(startDay, { weekStartsOn: 1 });
  const endWeek = endOfWeek(endDay, { weekStartsOn: 1 });
  const daysToShow = eachDayOfInterval({ start: startWeek, end: endWeek });
  const weeks = chunkArray(daysToShow, 7);

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'customer') {
      return orders.filter((o) => o.orderKind !== 'supplier');
    }
    if (orderFilter === 'supplier') {
      return orders.filter((o) => o.orderKind === 'supplier');
    }
    return orders;
  }, [orders, orderFilter]);

  const ordersOnDate = (date) =>
    filteredOrders.filter((order) => {
      const orderDate = parseOrderDate(order?.date);
      return orderDate ? isSameDay(orderDate, date) : false;
    });

  const handleDeliver = async (itemId) => {
    await runMutation(markItemAsDeliveredRequest(itemId), async (res) => {
      if (!applyItemFromResponse(res, itemId)) await onReload?.();
    });
  };

  const handlePaid = async (itemId) => {
    await runMutation(markItemAsPaidRequest(itemId), async (res) => {
      if (!applyItemFromResponse(res, itemId)) await onReload?.();
    });
  };

  // Abrir diálogos
  const openOrderDialog = (order) => {
    setOrderToDelete(order);
    setOpenDeleteOrder(true);
  };
  const openItemDialog = (item) => {
    setItemToDelete(item);
    setOpenDeleteItem(true);
  };

  // Confirmar eliminaciones
  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    const orderId = orderToDelete.id;
    await runMutation(deleteOrder(orderId), async () => {
      setOpenDeleteOrder(false);
      setOrderToDelete(null);
      if (onRemoveOrder) onRemoveOrder(orderId);
      else await onReload?.();
    });
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    const { id: itemId, orderId } = itemToDelete;
    await runMutation(deleteOrderItem(itemId), async () => {
      setOpenDeleteItem(false);
      setItemToDelete(null);
      if (onRemoveOrderItem && orderId) onRemoveOrderItem(orderId, itemId);
      else await onReload?.();
    });
  };

  const handleAddOrderLine = async (orderId) => {
    const d = addLineDraft[orderId] || {};
    const productId = Number(d.productId);
    const quantity = Number(String(d.quantity ?? '').replace(',', '.'));
    const price = Number(String(d.price ?? '').replace(',', '.'));
    if (!productId || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) {
      toastAuth({ message: 'Selecciona producto, cantidad (> 0) y precio válidos.', variant: 'warning' });
      return;
    }
    await runMutation(addOrderItemToOrderRequest(orderId, { productId, quantity, price }), async () => {
      setAddLineDraft((prev) => ({
        ...prev,
        [orderId]: { productId: '', quantity: '', price: '' },
      }));
      await onReload?.();
    });
  };

  const selectedOrders = selectedDate ? ordersOnDate(selectedDate) : [];

  const handleDayClick = (date) => {
    if (selectedDate && isSameDay(date, selectedDate)) setSelectedDate(null);
    else setSelectedDate(date);
  };

  const handleChange = (itemId, field, value) => {
    setFields((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const buildDate = (date, hour, minute, second) => {
    if (!date || hour === '' || minute === '' || second === '') return null;
    const str = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
    const result = new Date(str);
    return isNaN(result.getTime()) ? null : result;
  };

  const handleConfirm = async (itemId) => {
    const f = fields[itemId] || {};
    const paidAt = buildDate(f?.paidDate, f?.paidHour, f?.paidMinute, f?.paidSecond);
    const deliveredAt = buildDate(f?.deliveredDate, f?.deliveredHour, f?.deliveredMinute, f?.deliveredSecond);
    const quantity = Math.max(0, toNumber(f?.quantity, 0));
    const price = Math.max(0, toNumber(f?.price, 0));

    await runMutation(
      updateOrderItemRequest(itemId, { paidAt, deliveredAt, quantity, price }),
      async (res) => {
        if (!applyItemFromResponse(res, itemId)) await onReload?.();
      },
    );
  };

  const toggleOrderEdit = (orderId) => {
    setOrderEditMode(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleConfirmOrder = async (orderId) => {
    const f = orderFields[orderId] || {};
    const newDate = buildFullDate(f.date, f.hour, f.minute, f.second);
    const payload = { date: newDate ? newDate.toISOString() : null, notes: f.notes ?? '' };
    if (f.customerId != null && f.customerId !== '') {
      payload.customerId = Number(f.customerId);
    }

    await runMutation(updateOrderRequest(orderId, payload), async () => {
      await onReload?.();
    });
  };

  useEffect(() => {
    const newFields = {};
    const newOrderFields = {};

    orders.forEach(order => {
      if (order.orderKind === 'supplier') return;
      // Ítems
      (order.ERP_order_items || order.items || []).forEach(item => {
        const paidDate = parseOrderDate(item.paidAt);
        const deliveredDate = parseOrderDate(item.deliveredAt);
        newFields[item.id] = {
          paidDate: paidDate ? format(paidDate, 'yyyy-MM-dd') : '',
          paidHour: paidDate ? String(paidDate.getHours()).padStart(2, '0') : '',
          paidMinute: paidDate ? String(paidDate.getMinutes()).padStart(2, '0') : '',
          paidSecond: paidDate ? String(paidDate.getSeconds()).padStart(2, '0') : '',
          deliveredDate: deliveredDate ? format(deliveredDate, 'yyyy-MM-dd') : '',
          deliveredHour: deliveredDate ? String(deliveredDate.getHours()).padStart(2, '0') : '',
          deliveredMinute: deliveredDate ? String(deliveredDate.getMinutes()).padStart(2, '0') : '',
          deliveredSecond: deliveredDate ? String(deliveredDate.getSeconds()).padStart(2, '0') : '',
          quantity: item.quantity ?? '',
          price: item.price ?? '',
        };
      });

      // Orden (date + notes)
      const orderDate = parseOrderDate(order.date);
      newOrderFields[order.id] = {
        date: orderDate ? format(orderDate, 'yyyy-MM-dd') : '',
        hour: orderDate ? String(orderDate.getHours()).padStart(2, '0') : '',
        minute: orderDate ? String(orderDate.getMinutes()).padStart(2, '0') : '',
        second: orderDate ? String(orderDate.getSeconds()).padStart(2, '0') : '',
        notes: order.notes ?? '',
        customerId: order.customerId != null ? String(order.customerId) : '',
      };
    });

    setFields(newFields);
    setOrderFields(newOrderFields);
  }, [orders]);

  const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));

  const findDemoCustomerOrder = useCallback(() => {
    const list = orders.filter((o) => o.orderKind !== 'supplier');
    const pending = list.find((o) => {
      const items = o.ERP_order_items || o.items || [];
      return items.some((i) => !i.paidAt);
    });
    return pending || list[0] || null;
  }, [orders]);

  const resetTourDemo = useCallback(() => {
    tourGenRef.current += 1;
    setTourFocusDay(null);
    setTourExtraItems({});
    setAddLineDraft({});
    setExpandedOrders({});
  }, []);

  const prepareOpenDayDemo = useCallback(async () => {
    const order = findDemoCustomerOrder();
    const day = order ? parseOrderDate(order.date) : new Date();
    if (!day) return;
    setOrderFilter('customer');
    if (!isSameMonth(day, currentDate)) {
      setCurrentDate(startOfMonth(day));
    }
    setTourFocusDay(day);
    setSelectedDate(day);
    await sleep(80);
  }, [findDemoCustomerOrder, currentDate]);

  const prepareExpandOrderDemo = useCallback(async () => {
    await prepareOpenDayDemo();
    const order = findDemoCustomerOrder();
    if (!order) return;
    setExpandedOrders((prev) => ({ ...prev, [order.id]: true }));
    await sleep(100);
  }, [prepareOpenDayDemo, findDemoCustomerOrder]);

  const runAddLineDemo = useCallback(async () => {
    const gen = ++tourGenRef.current;
    await prepareExpandOrderDemo();
    const order = findDemoCustomerOrder();
    if (!order) return;
    const product =
      products.find((p) => Number(p.id) === 201) ||
      products.find((p) => Number(p.id) === 101) ||
      products[0];
    if (!product) return;
    const price = String(getDefaultDistributorPrice(product) || 0.35);
    setAddLineDraft((prev) => ({
      ...prev,
      [order.id]: { productId: '', quantity: '', price: '' },
    }));
    await sleep(220);
    if (gen !== tourGenRef.current) return;
    setAddLineDraft((prev) => ({
      ...prev,
      [order.id]: { productId: String(product.id), quantity: '', price },
    }));
    for (const q of ['2', '4', '6']) {
      await sleep(300);
      if (gen !== tourGenRef.current) return;
      setAddLineDraft((prev) => ({
        ...prev,
        [order.id]: {
          ...prev[order.id],
          productId: String(product.id),
          price,
          quantity: q,
        },
      }));
    }
  }, [prepareExpandOrderDemo, findDemoCustomerOrder, products]);

  const confirmAddLineDemo = useCallback(async () => {
    const order = findDemoCustomerOrder();
    if (!order) return;
    const draft = addLineDraft[order.id] || {};
    const product = products.find((p) => String(p.id) === String(draft.productId));
    const qty = Number(draft.quantity) || 6;
    const price = Number(draft.price) || getDefaultDistributorPrice(product) || 0.35;
    const demoItem = {
      id: `tour-demo-${Date.now()}`,
      productId: product?.id || 201,
      quantity: qty,
      price,
      distributorPrice: price,
      paidAt: null,
      deliveredAt: null,
      name: product?.name || 'Producto demo',
      ERP_inventory_product: product
        ? { id: product.id, name: product.name }
        : { id: 201, name: 'Producto demo' },
      _tourDemo: true,
    };
    setTourExtraItems((prev) => ({
      ...prev,
      [order.id]: [...(prev[order.id] || []), demoItem],
    }));
    setAddLineDraft((prev) => {
      const next = { ...prev };
      delete next[order.id];
      return next;
    });
    await sleep(120);
  }, [findDemoCustomerOrder, addLineDraft, products]);

  useImperativeHandle(
    tourApiRef,
    () => ({
      prepareOpenDayDemo,
      prepareExpandOrderDemo,
      runAddLineDemo,
      confirmAddLineDemo,
      resetTourDemo,
      getDemoOrderId: () => findDemoCustomerOrder()?.id ?? null,
    }),
    [
      prepareOpenDayDemo,
      prepareExpandOrderDemo,
      runAddLineDemo,
      confirmAddLineDemo,
      resetTourDemo,
      findDemoCustomerOrder,
    ],
  );

  return (
    <>
    <Box sx={{ pt: 0, pb: 1 }}>
      {/* Dialogs globales */}
      <SimpleDialog
        open={openDeleteOrder}
        onClose={() => { setOpenDeleteOrder(false); setOrderToDelete(null); }}
        tittle="Eliminar Orden"
        onClickAccept={confirmDeleteOrder}
      >
        ¿Está seguro de eliminar la orden
        {orderToDelete ? ` #${orderToDelete.id}` : ''}? Esta acción no se puede deshacer.
      </SimpleDialog>

      <SimpleDialog
        open={openDeleteItem}
        onClose={() => { setOpenDeleteItem(false); setItemToDelete(null); }}
        tittle="Eliminar Ítem"
        onClickAccept={confirmDeleteItem}
      >
        ¿Está seguro de eliminar este ítem
        {itemToDelete && itemToDelete.ERP_inventory_product
          ? ` (${itemToDelete.ERP_inventory_product.name})`
          : ''}? Esta acción no se puede deshacer.
      </SimpleDialog>

      <Stack
        data-tour="pedidos-month-nav"
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.25 }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
          <IconButton size="small" onClick={handlePrevMonth} aria-label="Mes anterior">
            <ChevronLeftIcon />
          </IconButton>
          <Typography
            variant="subtitle1"
            sx={{
              minWidth: 140,
              textAlign: 'center',
              textTransform: 'capitalize',
              fontWeight: 800,
            }}
          >
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </Typography>
          <IconButton size="small" onClick={handleNextMonth} aria-label="Mes siguiente">
            <ChevronRightIcon />
          </IconButton>
          <Tooltip title="Ir a hoy">
            <Button
              size="small"
              variant="text"
              startIcon={<TodayIcon sx={{ fontSize: '1rem !important' }} />}
              onClick={() => {
                const now = new Date();
                setCurrentDate(startOfMonth(now));
                setSelectedDate(now);
              }}
              sx={{ ml: 0.5, minWidth: 0, px: 1, fontSize: '0.75rem', fontWeight: 600 }}
            >
              Hoy
            </Button>
          </Tooltip>
          {loadingOrders ? <CircularProgress size={16} sx={{ ml: 0.5 }} /> : null}
        </Stack>

        <ToggleButtonGroup
          data-tour="pedidos-filter"
          exclusive
          size="small"
          value={orderFilter}
          onChange={(_e, val) => val && setOrderFilter(val)}
          sx={{
            alignSelf: { xs: 'stretch', sm: 'center' },
            '& .MuiToggleButton-root': {
              flex: { xs: 1, sm: '0 0 auto' },
              py: 0.5,
              px: 1.25,
              fontSize: '0.8125rem',
              fontWeight: 600,
              textTransform: 'none',
            },
          }}
        >
          <ToggleButton value="all">Todos</ToggleButton>
          <ToggleButton value="customer">Clientes</ToggleButton>
          <ToggleButton value="supplier">Proveedores</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Stack
        direction="row"
        flexWrap="wrap"
        useFlexGap
        spacing={1.5}
        sx={{ mb: 1, gap: { xs: 0.75, sm: 1.5 }, alignItems: 'center' }}
      >
        {STATUS_LEGEND.map(({ label, key }) => (
          <Stack key={key} direction="row" alignItems="center" spacing={0.6}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: theme.palette[key].main,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
              {label}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          p: { xs: 0.75, sm: 1 },
          mb: 1,
          borderColor: alpha(theme.palette.divider, 0.9),
        }}
      >
        <Box
          sx={{
            ...calendarGridSx,
            gap: 0,
            mb: 0.75,
            pb: 0.75,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.03),
            borderRadius: 1.5,
            px: 0.5,
          }}
        >
          {WEEKDAY_LABELS.map((day) => (
            <Typography
              key={day}
              variant="caption"
              align="center"
              sx={{
                py: 0.85,
                fontWeight: 700,
                color: 'primary.main',
                fontSize: '0.72rem',
                letterSpacing: 0.3,
              }}
            >
              {day}
            </Typography>
          ))}
        </Box>

      {weeks.map((week, weekIndex) => {
        const shouldShowCollapse = selectedDate && week.some(day => isSameDay(day, selectedDate));

        return (
          <React.Fragment key={weekIndex}>
            <Box
              sx={{
                ...calendarGridSx,
                mb: weekIndex < weeks.length - 1 || shouldShowCollapse ? 0.75 : 0,
              }}
            >
              {week.map((date) => {
                const dailyOrders = ordersOnDate(date);
                const customerCount = dailyOrders.filter((o) => o.orderKind !== 'supplier').length;
                const supplierCount = dailyOrders.filter((o) => o.orderKind === 'supplier').length;
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                const isOutOfMonth = !isSameMonth(date, currentDate);
                const statusBase = getCalendarDayBaseColor(dailyOrders, theme);
                const hasOrders = dailyOrders.length > 0;

                let countLabel = '';
                if (hasOrders) {
                  if (orderFilter === 'all' && customerCount > 0 && supplierCount > 0) {
                    countLabel = `${customerCount} cli · ${supplierCount} prov`;
                  } else if (orderFilter === 'all' && customerCount > 0) {
                    countLabel = `${customerCount} ${customerCount === 1 ? 'pedido' : 'pedidos'}`;
                  } else if (orderFilter === 'all' && supplierCount > 0) {
                    countLabel = `${supplierCount} ${supplierCount === 1 ? 'pedido' : 'pedidos'}`;
                  } else {
                    countLabel = `${dailyOrders.length} ${dailyOrders.length === 1 ? 'pedido' : 'pedidos'}`;
                  }
                }

                return (
                  <Paper
                    key={date.toISOString()}
                    variant="outlined"
                    elevation={0}
                    data-tour={
                      tourFocusDay && isSameDay(date, tourFocusDay)
                        ? 'pedidos-day-focus'
                        : undefined
                    }
                    onClick={() => handleDayClick(date)}
                    sx={{
                      minHeight: { xs: 72, sm: 88 },
                      p: 1,
                      cursor: 'pointer',
                      bgcolor: 'background.paper',
                      opacity: isOutOfMonth ? 0.38 : 1,
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      borderRadius: DAY_CELL_RADIUS,
                      overflow: 'hidden',
                      '&.MuiPaper-rounded': {
                        borderRadius: DAY_CELL_RADIUS,
                      },
                      transition: 'border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease',
                      ...(isSelected && {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        borderWidth: 2,
                        borderColor: 'primary.main',
                        zIndex: 1,
                      }),
                      ...(!isSelected && {
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                          borderColor: alpha(theme.palette.primary.main, 0.5),
                        },
                      }),
                      ...(hasOrders && statusBase && {
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 4,
                          bgcolor: statusBase,
                        },
                      }),
                    }}
                  >
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        ...(isToday && {
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                        }),
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.8125rem',
                          lineHeight: 1,
                          color: isToday ? 'inherit' : isOutOfMonth ? 'text.disabled' : 'text.primary',
                        }}
                      >
                        {format(date, 'd')}
                      </Typography>
                    </Box>

                    {hasOrders ? (
                      <Box
                        sx={{
                          mt: 'auto',
                          width: '100%',
                          pt: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          noWrap
                          title={countLabel}
                          sx={{
                            display: 'block',
                            px: 0.65,
                            py: 0.3,
                            borderRadius: '10px',
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            textAlign: 'center',
                            color: statusBase || 'text.secondary',
                            bgcolor: alpha(statusBase || theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.18 : 0.1),
                            lineHeight: 1.2,
                          }}
                        >
                          {countLabel}
                        </Typography>
                      </Box>
                    ) : null}
                  </Paper>
                );
              })}
            </Box>

            <Collapse in={shouldShowCollapse} timeout="auto" unmountOnExit>
              <Box
                data-tour="pedidos-day-detail"
                sx={{
                  mx: 0.25,
                  mb: 0.75,
                  px: { xs: 1, sm: 1.25 },
                  py: 1.25,
                  bgcolor: alpha(theme.palette.primary.main, 0.03),
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.22),
                  borderRadius: 2,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5, gap: 1 }}>
                  <CalendarTodayIcon color="primary" fontSize="small" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                      {selectedDate && format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedOrders.length}{' '}
                      {selectedOrders.length === 1 ? 'pedido registrado' : 'pedidos registrados'}
                    </Typography>
                  </Box>
                  {selectedOrders.length > 0 && (
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`${selectedOrders.length} en total`}
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Stack>
                {selectedOrders.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No hay pedidos este día.
                  </Typography>
                )}

                {selectedOrders.map((order) => {
                  if (order.orderKind === 'supplier') {
                    return (
                      <SupplierOrderAccordion
                        key={`supplier-${order.id}`}
                        order={order}
                        canManage={canManageOrders}
                        tone={tones.state}
                        toast={toastAuth}
                        products={products}
                        onReload={onReload}
                        onRemove={(id) => onRemoveOrder?.(id, 'supplier')}
                        onEdit={onEditSupplier}
                      />
                    );
                  }

                  const baseItems = order.ERP_order_items || order.items || [];
                  const orderItems = [...baseItems, ...(tourExtraItems[order.id] || [])];
                  const orderColor = getColorByStatus(orderItems, theme, tones.state);
                  const hasUnpaid = orderItems.some((i) => !i.paidAt);
                  const orderTotal = orderItems.reduce(
                    (acc, i) => acc + Number(i.price || 0) * Number(i.quantity || 0),
                    0
                  );
                  const unpaidTotal = orderItems
                    .filter((i) => !i.paidAt)
                    .reduce(
                      (acc, i) => acc + Number(i.price || 0) * Number(i.quantity || 0),
                      0
                    );
                  const isTourFocusOrder =
                    expandedOrders[order.id] === true &&
                    findDemoCustomerOrder()?.id === order.id;
                  const statusMeta = getOrderStatusMeta(orderItems);
                  const progress = orderProgress(orderItems);

                  return (
                    <Accordion
                      key={order.id}
                      data-tour={isTourFocusOrder ? 'pedidos-order-focus' : undefined}
                      expanded={expandedOrders[order.id] === true}
                      onChange={(_e, isExp) =>
                        setExpandedOrders((prev) => ({ ...prev, [order.id]: isExp }))
                      }
                      sx={{
                        mb: 1,
                        backgroundColor: orderColor,
                        border: '1px solid',
                        borderColor: alpha(theme.palette.divider, tones.border),
                        borderRadius: '12px !important',
                        overflow: 'hidden',
                        '&:before': { display: 'none' },
                        boxShadow: 'none',
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          alignItems: 'center',
                          minHeight: 56,
                          '& .MuiAccordionSummary-content': { my: 1 },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%', justifyContent: 'space-between', pr: 0.5 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 0.35, gap: 0.5 }}>
                              <Typography variant="subtitle2" fontWeight={800} noWrap sx={{ maxWidth: '100%' }}>
                                {order.ERP_customer?.name || order.customer?.name || 'Cliente'}
                              </Typography>
                              <Chip
                                size="small"
                                label={statusMeta.label}
                                color={statusMeta.color}
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                              />
                            </Stack>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Pedido #{order.id} · Total ${orderTotal.toFixed(2)}
                              {hasUnpaid ? (
                                <>
                                  {' '}
                                  · Por cobrar:{' '}
                                  <Box component="span" sx={{ fontWeight: 800, color: 'warning.dark' }}>
                                    ${unpaidTotal.toFixed(2)}
                                  </Box>
                                </>
                              ) : (
                                <>
                                  {' '}
                                  ·{' '}
                                  <Box component="span" sx={{ fontWeight: 700, color: 'success.main' }}>
                                    Cobrado
                                  </Box>
                                </>
                              )}
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 0.75, maxWidth: 360 }}>
                              <Box sx={{ flex: 1, minWidth: 100 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                                  Cobro {progress.paidCount}/{progress.total}
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={progress.paid}
                                  color="success"
                                  sx={{ height: 4, borderRadius: 2, mt: 0.25, bgcolor: alpha(theme.palette.success.main, 0.12) }}
                                />
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 100 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                                  Entrega {progress.deliveredCount}/{progress.total}
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={progress.delivered}
                                  color="info"
                                  sx={{ height: 4, borderRadius: 2, mt: 0.25, bgcolor: alpha(theme.palette.info.main, 0.12) }}
                                />
                              </Box>
                            </Stack>
                          </Box>

                          {/* Acciones de la orden (editar / eliminar) */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                            {canManageOrders && (
                              <Tooltip title={orderEditMode[order.id] ? "Cancelar edición" : "Editar orden"}>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleOrderEdit(order.id);
                                  }}
                                  onFocus={(e) => e.stopPropagation()}
                                >
                                  {orderEditMode[order.id] ? <CloseIcon /> : <EditNoteIcon />}
                                </IconButton>
                              </Tooltip>
                            )}

                            {canManageOrders && (
                              <Tooltip title="Eliminar orden">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openOrderDialog(order);
                                  }}
                                  onFocus={(e) => e.stopPropagation()}
                                >
                                  <DeleteForeverIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </AccordionSummary>

                      <AccordionDetails sx={{ pt: 0, px: { xs: 1, sm: 1.5 }, pb: 1.5 }}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.75}
                          sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.75, pb: 1, borderBottom: 1, borderColor: 'divider' }}
                        >
                          <Tooltip title="Comprobante / factura">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PrintIcon fontSize="small" />}
                              onClick={() => {
                                setPrintReceipt(buildReceiptFromCustomerOrder(order));
                                setPrintOpen(true);
                              }}
                              sx={{ borderRadius: 1.5, fontSize: '0.75rem' }}
                            >
                              Imprimir
                            </Button>
                          </Tooltip>
                          {canManageOrders && hasUnpaid && (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<PaymentsIcon />}
                              onClick={() => setPayCustomerOrder(order)}
                              sx={{ borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              Abonar pedido
                            </Button>
                          )}
                        </Stack>

                        {/* Bloque de edición de la ORDEN */}
                        {orderEditMode[order.id] && (
                          <Box
                            sx={{
                              mb: 2,
                              p: 1.5,
                              border: '1px dashed',
                              borderColor: theme.palette.divider,
                              borderRadius: 1,
                              backgroundColor: theme.palette.mode === 'dark'
                                ? alpha(theme.palette.background.paper, 0.6)
                                : orderColor,
                            }}
                          >
                            <Typography variant="subtitle2" gutterBottom>Editar orden</Typography>

                            <Grid container spacing={1} sx={{ mb: 1 }}>
                              <Grid item xs={12}>
                                <SearchableSelect
                                  label="Cliente del pedido"
                                  items={customers}
                                  value={orderFields[order.id]?.customerId ?? ''}
                                  onChange={(val) =>
                                    setOrderFields((prev) => ({
                                      ...prev,
                                      [order.id]: { ...prev[order.id], customerId: val != null ? String(val) : '' },
                                    }))
                                  }
                                  getOptionLabel={(c) => c?.name ?? ''}
                                  getOptionValue={(c) => c?.id ?? ''}
                                  placeholder="Buscar cliente…"
                                />
                              </Grid>
                            </Grid>

                            <Grid container spacing={1} alignItems="flex-end">
                              <Grid item xs={12} sm={4}>
                                <TextField
                                  label="Fecha del pedido"
                                  type="date"
                                  fullWidth
                                  value={orderFields[order.id]?.date || ''}
                                  onChange={(e) => setOrderFields(prev => ({
                                    ...prev, [order.id]: { ...prev[order.id], date: e.target.value }
                                  }))}
                                />
                              </Grid>
                              <Grid item xs={4} sm={2}>
                                <TextField
                                  label="Hora"
                                  type="number"
                                  inputProps={{ min: 0, max: 23 }}
                                  fullWidth
                                  value={orderFields[order.id]?.hour || ''}
                                  onChange={(e) => setOrderFields(prev => ({
                                    ...prev, [order.id]: { ...prev[order.id], hour: e.target.value }
                                  }))}
                                />
                              </Grid>
                              <Grid item xs={4} sm={2}>
                                <TextField
                                  label="Min"
                                  type="number"
                                  inputProps={{ min: 0, max: 59 }}
                                  fullWidth
                                  value={orderFields[order.id]?.minute || ''}
                                  onChange={(e) => setOrderFields(prev => ({
                                    ...prev, [order.id]: { ...prev[order.id], minute: e.target.value }
                                  }))}
                                />
                              </Grid>
                              <Grid item xs={4} sm={2}>
                                <TextField
                                  label="Seg"
                                  type="number"
                                  inputProps={{ min: 0, max: 59 }}
                                  fullWidth
                                  value={orderFields[order.id]?.second || ''}
                                  onChange={(e) => setOrderFields(prev => ({
                                    ...prev, [order.id]: { ...prev[order.id], second: e.target.value }
                                  }))}
                                />
                              </Grid>

                              <Grid item xs={12}>
                                <TextField
                                  label="Notas"
                                  fullWidth
                                  multiline
                                  minRows={2}
                                  value={orderFields[order.id]?.notes ?? ''}
                                  onChange={(e) => setOrderFields(prev => ({
                                    ...prev, [order.id]: { ...prev[order.id], notes: e.target.value }
                                  }))}
                                />
                              </Grid>

                              <Grid item xs={12} sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<SaveIcon />}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await handleConfirmOrder(order.id);
                                    toggleOrderEdit(order.id);
                                  }}
                                >
                                  Guardar cambios
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<CloseIcon />}
                                  onClick={(e) => { e.stopPropagation(); toggleOrderEdit(order.id); }}
                                >
                                  Cancelar
                                </Button>
                              </Grid>
                            </Grid>
                          </Box>
                        )}

                        {/* Notas de la orden (solo lectura) */}
                        {!orderEditMode[order.id] && order.notes && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Notas de la orden: {order.notes}
                            </Typography>
                          </Box>
                        )}

                        {/* Lista de productos */}
                        <Box
                          data-tour={isTourFocusOrder ? 'pedidos-order-items' : undefined}
                        >
                          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: 0.8, display: 'block', mb: 1 }}>
                            Productos del pedido
                          </Typography>

                          {orderItems.map((item, idx) => {
                            const itemId = item.id;
                            const f = fields[itemId] || {};
                            const isEditing = !!editMode[itemId];

                            const toggleEdit = () => {
                              setEditMode(prev => ({ ...prev, [itemId]: !prev[itemId] }));
                            };

                            const liveQty = isEditing ? toNumber(f?.quantity, item.quantity) : item.quantity;
                            const livePrice = isEditing ? toNumber(f?.price, item.price) : item.price;
                            const liveTotal = (liveQty * livePrice).toFixed(2);

                            const itemBase = getStatusBaseColor([item], theme);
                            const productName =
                              item.ERP_inventory_product?.name ||
                              item.product?.name ||
                              item.name ||
                              "Producto";
                            const itemStatus = getOrderStatusMeta([item]);

                            return (
                              <Box
                                key={idx}
                                sx={{
                                  mb: 1.25,
                                  p: 1.25,
                                  border: '1px solid',
                                  borderColor: alpha(theme.palette.divider, tones.border),
                                  borderRadius: 1.5,
                                  backgroundColor: getColorByStatus([item], theme, tones.state),
                                  transition: 'background-color 0.2s ease, box-shadow 0.15s ease',
                                  '&:hover': {
                                    backgroundColor: itemBase
                                      ? alpha(itemBase, tones.stateHover)
                                      : alpha(theme.palette.primary.main, tones.hoverNeutral),
                                    boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.05)}`,
                                  },
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: !isEditing ? 0.75 : 0 }}>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 0.25, gap: 0.5 }}>
                                      <Typography variant="body2" fontWeight={700}>
                                        {productName}
                                      </Typography>
                                      {!isEditing && (
                                        <Chip
                                          size="small"
                                          label={itemStatus.label}
                                          color={itemStatus.color}
                                          variant="outlined"
                                          sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }}
                                        />
                                      )}
                                    </Stack>
                                    {!isEditing && (
                                      <Typography variant="caption" color="text.secondary">
                                        {item.quantity}{' '}
                                        {getProductUnitLabel(item.ERP_inventory_product)} ×{' '}
                                        {formatUnitPrice(item.price)} ={' '}
                                        <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                          {formatProductPrice(formatOrderLineTotal(item.quantity, item.price))}
                                        </Box>
                                      </Typography>
                                    )}
                                  </Box>

                                  {canManageOrders && !isEditing && (
                                    <Tooltip title="Eliminar ítem">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => openItemDialog(item)}
                                        sx={{ mt: -0.25 }}
                                      >
                                        <DeleteOutlineIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Box>

                                {!isEditing && (
                                  <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ gap: 0.5 }}>
                                    {item.paidAt ? (
                                      <Chip
                                        size="small"
                                        icon={<CheckCircleOutlineIcon />}
                                        label="Pagado"
                                        color="success"
                                        variant="outlined"
                                        sx={{ height: 24, fontSize: '0.68rem' }}
                                      />
                                    ) : (
                                      <Tooltip title="Marcar como pagado">
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          color="success"
                                          startIcon={<MonetizationOnIcon sx={{ fontSize: '1rem !important' }} />}
                                          onClick={() => handlePaid(itemId)}
                                          sx={{ minHeight: 26, py: 0.25, fontSize: '0.72rem', borderRadius: 1.5 }}
                                        >
                                          Cobrar
                                        </Button>
                                      </Tooltip>
                                    )}
                                    {item.deliveredAt ? (
                                      <Chip
                                        size="small"
                                        icon={<LocalShippingIcon />}
                                        label="Entregado"
                                        color="info"
                                        variant="outlined"
                                        sx={{ height: 24, fontSize: '0.68rem' }}
                                      />
                                    ) : (
                                      <Tooltip title="Marcar como entregado">
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          color="info"
                                          startIcon={<LocalShippingIcon sx={{ fontSize: '1rem !important' }} />}
                                          onClick={() => handleDeliver(itemId)}
                                          sx={{ minHeight: 26, py: 0.25, fontSize: '0.72rem', borderRadius: 1.5 }}
                                        >
                                          Entregar
                                        </Button>
                                      </Tooltip>
                                    )}
                                    {canManageOrders && (
                                      <Button
                                        size="small"
                                        onClick={toggleEdit}
                                        variant="text"
                                        sx={{ minHeight: 26, py: 0.25, fontSize: '0.72rem', ml: 'auto' }}
                                      >
                                        Editar
                                      </Button>
                                    )}
                                  </Stack>
                                )}

                                {(item.paidAt || item.deliveredAt) && !isEditing && (
                                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.75, gap: 0.5 }}>
                                    {item.paidAt && (
                                      <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
                                        <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />
                                        Pagado: {formatDateTime(item.paidAt)}
                                      </Typography>
                                    )}
                                    {item.deliveredAt && (
                                      <Typography variant="caption" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
                                        <LocalShippingIcon sx={{ fontSize: 14 }} />
                                        Entregado: {formatDateTime(item.deliveredAt)}
                                      </Typography>
                                    )}
                                  </Stack>
                                )}

                                {/* Modo edición: fechas + cantidad/precio */}
                                {isEditing && (
                                  <Box sx={{ mt: 2 }}>
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" gutterBottom>Detalles de ítem:</Typography>
                                      <Grid container spacing={1} alignItems="flex-end">
                                        <Grid item xs={12} sm={3}>
                                          <TextField
                                            label="Cantidad"
                                            type="number"
                                            inputProps={{ min: 0, step: 1 }}
                                            fullWidth
                                            value={f?.quantity ?? ''}
                                            onChange={(e) => handleChange(itemId, 'quantity', e.target.value)}
                                          />
                                        </Grid>
                                        <Grid item xs={12} sm={3}>
                                          <TextField
                                            label="Precio (USD)"
                                            type="number"
                                            inputProps={{ min: 0, step: '0.01' }}
                                            fullWidth
                                            value={f?.price ?? ''}
                                            onChange={(e) => handleChange(itemId, 'price', e.target.value)}
                                          />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                          <Typography variant="body2" sx={{ pl: { sm: 1 } }}>
                                            Total: ${liveTotal}
                                          </Typography>
                                        </Grid>
                                      </Grid>
                                    </Box>

                                    {['paid', 'delivered'].map((prefix) => (
                                      <Box key={prefix} sx={{ mb: 1 }}>
                                        <Typography variant="caption" gutterBottom>
                                          {prefix === 'paid' ? 'Pagado' : 'Entregado'}:
                                        </Typography>
                                        <Grid container spacing={1}>
                                          <Grid item xs={12} sm={3}>
                                            <TextField
                                              label="Fecha"
                                              type="date"
                                              fullWidth
                                              value={f[`${prefix}Date`] || ''}
                                              onChange={(e) => handleChange(itemId, `${prefix}Date`, e.target.value)}
                                            />
                                          </Grid>
                                          <Grid item xs={4} sm={3}>
                                            <TextField
                                              label="Hora"
                                              type="number"
                                              inputProps={{ min: 0, max: 23 }}
                                              fullWidth
                                              value={f[`${prefix}Hour`] || ''}
                                              onChange={(e) => handleChange(itemId, `${prefix}Hour`, e.target.value)}
                                            />
                                          </Grid>
                                          <Grid item xs={4} sm={3}>
                                            <TextField
                                              label="Minuto"
                                              type="number"
                                              inputProps={{ min: 0, max: 59 }}
                                              fullWidth
                                              value={f[`${prefix}Minute`] || ''}
                                              onChange={(e) => handleChange(itemId, `${prefix}Minute`, e.target.value)}
                                            />
                                          </Grid>
                                          <Grid item xs={4} sm={3}>
                                            <TextField
                                              label="Segundo"
                                              type="number"
                                              inputProps={{ min: 0, max: 59 }}
                                              fullWidth
                                              value={f[`${prefix}Second`] || ''}
                                              onChange={(e) => handleChange(itemId, `${prefix}Second`, e.target.value)}
                                            />
                                          </Grid>
                                        </Grid>
                                      </Box>
                                    ))}

                                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                      <Button
                                        variant="contained"
                                        size="small"
                                        onClick={async () => {
                                          await handleConfirm(itemId);
                                          toggleEdit();
                                        }}
                                      >
                                        Confirmar
                                      </Button>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={toggleEdit}
                                      >
                                        Cancelar
                                      </Button>
                                    </Box>
                                  </Box>
                                )}

                                {order.notes && !isEditing && (
                                  <>
                                    <Divider sx={{ my: 1 }} />
                                    <Typography variant="caption" color="text.secondary">
                                      Notas: {order.notes}
                                    </Typography>
                                  </>
                                )}
                              </Box>
                            );
                          })}

                          {orderItems.length > 0 && (
                            <Paper
                              variant="outlined"
                              sx={{
                                mt: 1,
                                mb: 1,
                                px: 1.25,
                                py: 0.75,
                                borderRadius: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                bgcolor: alpha(theme.palette.primary.main, 0.04),
                              }}
                            >
                              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                Total del pedido
                              </Typography>
                              <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                                {formatProductPrice(
                                  orderItems.reduce(
                                    (acc, i) => acc + formatOrderLineTotal(i.quantity, i.price),
                                    0,
                                  ),
                                )}
                              </Typography>
                            </Paper>
                          )}

                          <Divider sx={{ my: 1 }} />
                          <Box onClick={(e) => e.stopPropagation()}>
                            <Typography variant="subtitle2" gutterBottom>
                              Recibo firmado / evidencia del cliente
                            </Typography>
                            <DocumentUploadButton
                              entityType="order"
                              entityId={order.id}
                              label="Recibo firmado del cliente"
                              buttonText="Subir recibo firmado"
                              canManage={canManageOrders}
                            />
                          </Box>

                          {canManageOrders && (
                            <Box
                              data-tour={isTourFocusOrder ? 'pedidos-add-line' : undefined}
                              sx={{
                                mt: 2,
                                p: 1.5,
                                border: '1px dashed',
                                borderColor: alpha(theme.palette.primary.main, 0.35),
                                borderRadius: 1.5,
                                bgcolor: alpha(theme.palette.primary.main, 0.03),
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <AddIcon fontSize="small" color="primary" />
                                Añadir producto al pedido
                              </Typography>
                              <Grid container spacing={1} alignItems="flex-end">
                                <Grid item xs={12} sm={5}>
                                  <SearchableSelect
                                    label="Producto"
                                    items={products}
                                    value={addLineDraft[order.id]?.productId ?? ''}
                                    onChange={(val) => {
                                      const p = products.find((x) => String(x.id) === String(val));
                                      setAddLineDraft((prev) => ({
                                        ...prev,
                                        [order.id]: {
                                          ...prev[order.id],
                                          productId: val != null && val !== '' ? String(val) : '',
                                          price:
                                            p != null
                                              ? String(getDefaultDistributorPrice(p))
                                              : (prev[order.id]?.price ?? ''),
                                        },
                                      }));
                                    }}
                                    getOptionLabel={(p) => p?.name ?? ''}
                                    getOptionValue={(p) => p?.id ?? ''}
                                    placeholder="Buscar producto…"
                                  />
                                  {(() => {
                                    const draftPid = addLineDraft[order.id]?.productId;
                                    const p = draftPid
                                      ? products.find((x) => String(x.id) === String(draftPid))
                                      : null;
                                    return p ? (
                                      <ProductPriceReference
                                        product={p}
                                        compact
                                        quantity={addLineDraft[order.id]?.quantity}
                                        unitPrice={addLineDraft[order.id]?.price}
                                      />
                                    ) : null;
                                  })()}
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <TextField
                                    label="Cantidad"
                                    type="number"
                                    inputProps={{ min: 0.01, step: 'any' }}
                                    size="small"
                                    fullWidth
                                    value={addLineDraft[order.id]?.quantity ?? ''}
                                    onChange={(e) =>
                                      setAddLineDraft((prev) => ({
                                        ...prev,
                                        [order.id]: { ...prev[order.id], quantity: e.target.value },
                                      }))
                                    }
                                  />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <TextField
                                    label="Precio distribuidor"
                                    type="number"
                                    inputProps={{ min: 0, step: 'any' }}
                                    size="small"
                                    fullWidth
                                    value={addLineDraft[order.id]?.price ?? ''}
                                    onChange={(e) =>
                                      setAddLineDraft((prev) => ({
                                        ...prev,
                                        [order.id]: { ...prev[order.id], price: e.target.value },
                                      }))
                                    }
                                  />
                                </Grid>
                                <Grid item xs={12} sm={1}>
                                  <Tooltip title="Agregar producto">
                                    <IconButton
                                      color="primary"
                                      onClick={() => handleAddOrderLine(order.id)}
                                      sx={{ border: 1, borderColor: 'primary.main', borderRadius: 1 }}
                                    >
                                      <AddIcon />
                                    </IconButton>
                                  </Tooltip>
                                </Grid>
                              </Grid>
                            </Box>
                          )}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>
            </Collapse>
          </React.Fragment>
        );
      })}
      </Paper>
    </Box>

    <PrintFormatDialog
      open={printOpen}
      onClose={() => setPrintOpen(false)}
      receipt={printReceipt}
    />
    <CustomerOrderPayDialog
      open={Boolean(payCustomerOrder)}
      order={payCustomerOrder}
      onClose={() => setPayCustomerOrder(null)}
      onPaid={() => onReload?.()}
      toast={toastAuth}
    />
    </>
  );
});
