import React, { useState, useEffect, useMemo, useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
import {
  Box, Button, Typography, Grid, Paper, Collapse, TextField, IconButton, Tooltip,
  Accordion, AccordionSummary, AccordionDetails, Divider,
  useTheme, CircularProgress, ToggleButton, ToggleButtonGroup,
  Chip, LinearProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  InputAdornment,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import {
  format, addMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, startOfWeek, endOfWeek,
  isSameDay, parse, isSameMonth
} from 'date-fns';
import { es } from 'date-fns/locale';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditNoteIcon from '@mui/icons-material/EditNote';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import PaymentsIcon from '@mui/icons-material/Payments';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TodayIcon from '@mui/icons-material/Today';
import TuneIcon from '@mui/icons-material/Tune';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

import {
  markItemAsDeliveredRequest,
  updateOrderItemRequest,
  deleteOrder,
  addOrderItemToOrderRequest,
} from '../../../../api/ordersRequest';
import {
  getAllProductsAll,
  getStoresRequest,
  getStoreStocksRequest,
  registerMovement,
} from '../../../../api/inventoryControlRequest';
import { useAuth } from '../../../../context/AuthContext';
import { useAppSettings } from '../../../../context/AppSettingsContext.jsx';
import {
  locationKindLabel,
  normalizeLocationKind,
  sortStoresByKind,
  storeHoldsInventory,
} from '../../../../utils/storeLocationKind.js';

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

/** Texto buscable: cliente/proveedor + productos del pedido. */
function orderMatchesSearch(order, rawQuery) {
  const needle = String(rawQuery || "")
    .trim()
    .toLowerCase();
  if (!needle) return true;

  const isSupplier = order?.orderKind === "supplier";
  const party = isSupplier
    ? order?.ERP_supplier?.name || order?.supplier?.name || ""
    : order?.ERP_customer?.name || order?.customer?.name || "";
  if (String(party).toLowerCase().includes(needle)) return true;

  if (String(order?.id ?? "").includes(needle)) return true;

  const items = isSupplier
    ? order?.ERP_supplier_order_items || order?.items || []
    : order?.ERP_order_items || order?.items || [];

  for (const it of items) {
    const prod = it?.ERP_inventory_product || it?.product || {};
    const hay = [
      prod.name,
      it?.name,
      prod.sku,
      prod.barcode,
      prod.code,
      it?.sku,
      it?.barcode,
    ]
      .map((v) => String(v || "").toLowerCase())
      .join(" ");
    if (hay.includes(needle)) return true;
  }
  return false;
}
import SimpleDialog from '../../../../components/Dialogs/SimpleDialog';
import SearchableSelect from '../../../../components/SearchableSelect';
import ProductForm from './ProductForm.jsx';
import ProductPriceReference, {
  getDefaultDistributorPrice,
  getProductUnitLabel,
  formatOrderLineTotal,
  formatProductPrice,
  formatUnitPrice,
} from './ProductPriceReference';
import DocumentUploadButton from './DocumentUploadButton';
import PrintFormatDialog from '../../../../components/saleReceipt/PrintFormatDialog.jsx';
import { buildReceiptFromCustomerOrder } from '../../../../utils/saleReceiptUtils.js';
import { formatOrderItemFromApi } from '../../../../utils/orderListUtils';
import { toDateOnly } from '../../../../utils/orderPaymentSchedule.js';
import SupplierOrderAccordion from './SupplierOrderAccordion';
import CustomerOrderPayDialog from './CustomerOrderPayDialog';

/** Naranja brillante: cuota / crédito a pagar. */
const CREDIT_ORANGE = '#FF6D00';
const CREDIT_ORANGE_BG = 'rgba(255, 109, 0, 0.16)';
const CREDIT_ORANGE_HOVER = '#E65100';

/** Amarillo dorado: entregado/recibido pero falta cobro o pago (sev 1). Distinto del naranja de crédito. */
const DELIVERED_GOLD = '#F5C518';
const DELIVERED_GOLD_DARK = '#8A7010';
const DELIVERED_GOLD_BG = 'rgba(245, 197, 24, 0.2)';

function parseDueDateLocal(dueDate) {
  const iso = toDateOnly(dueDate);
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Eventos de cuota pendientes para el calendario. */
function buildInstallmentEvents(orders) {
  const events = [];
  for (const order of orders || []) {
    const installments = order.paymentInstallments || [];
    for (const inst of installments) {
      if (inst.isPaid || Number(inst.remainingAmount) <= 0.009) continue;
      const due = parseDueDateLocal(inst.dueDate);
      if (!due) continue;
      const isSupplier = order.orderKind === 'supplier';
      const partyName = isSupplier
        ? order.ERP_supplier?.name || order.supplier?.name || 'Proveedor'
        : order.ERP_customer?.name || order.customer?.name || 'Cliente';
      events.push({
        kind: 'installment',
        key: `${isSupplier ? 's' : 'c'}-${order.id}-inst-${inst.id || inst.sequence}`,
        orderId: order.id,
        orderKind: isSupplier ? 'supplier' : 'customer',
        installment: inst,
        dueDate: due,
        dueDateIso: toDateOnly(inst.dueDate),
        deliveryDate: parseOrderDate(order.date),
        partyName,
        order,
        amount: Number(inst.amount) || 0,
        remaining: Number(inst.remainingAmount ?? inst.amount) || 0,
        orderRemaining: Number(order.remainingAmount) || 0,
        orderTotal: Number(order.totalAmount) || 0,
      });
    }
  }
  return events;
}

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

function getCustomerOrderSeverity(order) {
  const items = order?.ERP_order_items || order?.items || [];
  if (!items.length) return 3;
  const { paid, fullyPaid } = customerOrderMoney(order);
  const allDelivered = items.every((i) => i.deliveredAt);
  const someDelivered = items.some((i) => i.deliveredAt);
  const somePaid = fullyPaid || paid > 0.009 || items.some((i) => i.paidAt);

  if (fullyPaid && allDelivered) return 3;
  if (!somePaid && !someDelivered) return 0;
  if (someDelivered && !fullyPaid) return 1;
  if (somePaid && !allDelivered) return 2;
  return 1;
}

function getOrderSeverity(order) {
  if (order?.orderKind === 'supplier') return getSupplierOrderSeverity(order);
  return getCustomerOrderSeverity(order);
}

/** Color del día en calendario: gana el pedido “peor” (si hay uno rojo y otro verde → rojo). */
function getCalendarDayBaseColor(dailyOrders, theme) {
  if (!dailyOrders?.length) return null;
  const worst = Math.min(...dailyOrders.map((o) => getOrderSeverity(o)));
  const { palette } = theme;
  if (worst === 0) return palette.error.main;
  if (worst === 1) return DELIVERED_GOLD;
  if (worst === 2) return palette.info.main;
  if (worst === 3) return palette.success.main;
  return null;
}

const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Total cobrable de una línea de pedido cliente. */
function customerItemLineTotal(item) {
  const qty = toNumber(item?.quantity);
  const billable = Math.max(0, qty - toNumber(item?.damagedQty) - toNumber(item?.giftQty));
  return billable * toNumber(item?.price);
}

/** Totales de cobro (usa paidAmount del API si viene — abonos parciales). */
function customerOrderMoney(order) {
  const items = order?.ERP_order_items || order?.items || [];
  const total =
    order?.totalAmount != null && Number.isFinite(Number(order.totalAmount))
      ? Number(order.totalAmount)
      : items.reduce((acc, i) => acc + customerItemLineTotal(i), 0);
  let paid =
    order?.paidAmount != null && Number.isFinite(Number(order.paidAmount))
      ? Number(order.paidAmount)
      : items.filter((i) => i.paidAt).reduce((acc, i) => acc + customerItemLineTotal(i), 0);
  let remaining =
    order?.remainingAmount != null && Number.isFinite(Number(order.remainingAmount))
      ? Number(order.remainingAmount)
      : Math.max(0, total - paid);
  paid = Math.min(Math.max(0, paid), Math.max(0, total));
  remaining = Math.max(0, remaining);
  const payPct = total > 0.009 ? Math.min(100, (paid / total) * 100) : paid > 0 ? 100 : 0;
  return {
    total: Number(total.toFixed(2)),
    paid: Number(paid.toFixed(2)),
    remaining: Number(remaining.toFixed(2)),
    payPct,
    fullyPaid: remaining <= 0.009,
  };
}

// Devuelve el color base según estado de ítems (líneas individuales)
function getStatusBaseColor(items, theme) {
  const allPaid = items.every(i => i.paidAt);
  const allDelivered = items.every(i => i.deliveredAt);
  const somePaid = items.some(i => i.paidAt);
  const someDelivered = items.some(i => i.deliveredAt);
  const { palette } = theme;

  if (allPaid && allDelivered) return palette.success.main;
  if (!somePaid && !someDelivered) return palette.error.main;
  if (someDelivered && !allPaid) return DELIVERED_GOLD;
  if (somePaid && !allDelivered) return palette.info.main;
  return null;
}

function severityToBaseColor(sev, theme) {
  const { palette } = theme;
  if (sev === 0) return palette.error.main;
  if (sev === 1) return DELIVERED_GOLD;
  if (sev === 2) return palette.info.main;
  if (sev === 3) return palette.success.main;
  return null;
}

// Fondo por estado usando una tonalidad variable (alpha) unificada
function getColorByStatus(items, theme, tone) {
  const base = getStatusBaseColor(items, theme);
  if (base) return alpha(base, tone);
  return theme.palette.mode === 'dark' ? theme.palette.background.paper : 'white';
}

function getColorByOrder(order, theme, tone) {
  const base = severityToBaseColor(getOrderSeverity(order), theme);
  if (base) return alpha(base, tone);
  return theme.palette.mode === 'dark' ? theme.palette.background.paper : 'white';
}

function getOrderStatusMeta(order) {
  const sev = getOrderSeverity(order);
  if (sev === 3) return { label: 'Completo', color: 'success', chipSx: null };
  if (sev === 0) return { label: 'Sin avance', color: 'error', chipSx: null };
  if (sev === 1) {
    return {
      label: 'Entregado · falta cobro',
      color: 'default',
      chipSx: {
        borderColor: DELIVERED_GOLD,
        color: DELIVERED_GOLD_DARK || '#8A7010',
        bgcolor: DELIVERED_GOLD_BG,
        fontWeight: 700,
      },
    };
  }
  if (sev === 2) return { label: 'Cobrado · falta entrega', color: 'info', chipSx: null };
  return {
    label: 'Parcial',
    color: 'default',
    chipSx: {
      borderColor: DELIVERED_GOLD,
      color: '#8A7010',
      bgcolor: DELIVERED_GOLD_BG,
      fontWeight: 700,
    },
  };
}

/** Convierte una fecha (ISO o "dd/MM/yyyy HH:mm:ss") a "YYYY-MM-DD" para inputs date. */
function toDateInputValue(value) {
  if (!value) return '';
  if (typeof value === 'string' && value.includes('/')) {
    const [datePart] = value.split(' ');
    const [dd, mm, yyyy] = datePart.split('/');
    if (dd && mm && yyyy) return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function orderProgress(order) {
  const list = order?.ERP_order_items || order?.items || (Array.isArray(order) ? order : []);
  const money = Array.isArray(order) ? null : customerOrderMoney(order);
  if (!list.length) {
    return {
      paid: 0,
      delivered: 0,
      paidCount: 0,
      deliveredCount: 0,
      total: 0,
      paidAmount: 0,
      orderTotal: 0,
      remaining: 0,
    };
  }
  const paidCount = list.filter((i) => i.paidAt).length;
  const deliveredCount = list.filter((i) => i.deliveredAt).length;
  const paidPct = money
    ? money.payPct
    : (paidCount / list.length) * 100;
  return {
    paid: paidPct,
    delivered: (deliveredCount / list.length) * 100,
    paidCount,
    deliveredCount,
    total: list.length,
    paidAmount: money?.paid ?? 0,
    orderTotal: money?.total ?? 0,
    remaining: money?.remaining ?? 0,
    fullyPaid: money?.fullyPaid ?? paidCount === list.length,
  };
}

const STATUS_LEGEND = [
  { label: 'Sin avance', key: 'error', color: null },
  { label: 'Entregado · falta cobro', key: 'warning', color: DELIVERED_GOLD },
  { label: 'Cobrado · falta entrega', key: 'info', color: null },
  { label: 'Completo', key: 'success', color: null },
  { label: 'Cuota / crédito a pagar', key: 'credit', color: CREDIT_ORANGE },
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
  const [searchQuery, setSearchQuery] = useState('');
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

  // Dialogs de eliminación
  const [openDeleteOrder, setOpenDeleteOrder] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [payCustomerOrder, setPayCustomerOrder] = useState(null);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState({
    orderId: null,
    items: [],
    deliveredAt: '',
    paidAt: '',
  });
  const [dateBusy, setDateBusy] = useState(false);

  const { user, toast: toastAuth } = useAuth();
  const { activeApp } = useAppSettings();
  const multiStockEnabled = activeApp?.multiStockEnabled !== false;

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
  /** Ajuste de stock con movimiento `ajuste`: solo Programador y Administrador */
  const canAdjustStock = canManageOrders;
  /** Config local: modal tipo caja al entregar sin stock (solo Admin/Programador). */
  const allowDeliverStockAdjust =
    Boolean(activeApp?.ordersAllowDeliverStockAdjust) && canAdjustStock;

  const [products, setProducts] = useState([]);
  /** Borrador por pedido: agregar línea sin abrir otro formulario */
  const [addLineDraft, setAddLineDraft] = useState({});
  const [printOpen, setPrintOpen] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(null);

  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverOrder, setDeliverOrder] = useState(null);
  const [deliverPendingItems, setDeliverPendingItems] = useState([]);
  const [deliverStoreId, setDeliverStoreId] = useState('');
  const [inventoryStores, setInventoryStores] = useState([]);
  const [storeStockAvail, setStoreStockAvail] = useState(null);
  const [deliverBusy, setDeliverBusy] = useState(false);
  const [deliverAdjustOpen, setDeliverAdjustOpen] = useState(false);
  const [deliverAdjustQty, setDeliverAdjustQty] = useState({});
  const [deliverAdjustNote, setDeliverAdjustNote] = useState('');

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustStock, setAdjustStock] = useState('');
  const [adjustStoreId, setAdjustStoreId] = useState('');
  const [adjustBusy, setAdjustBusy] = useState(false);

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productDialogDatos, setProductDialogDatos] = useState(null);
  const [productDialogBusy, setProductDialogBusy] = useState(false);

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
        const prodRes = await getAllProductsAll();
        if (cancelled) return;
        setProducts(prodRes?.data || []);
      } catch (e) {
        console.error('OrderCalendaryTable: catálogo productos', e);
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
    let list = orders;
    if (orderFilter === 'customer') {
      list = list.filter((o) => o.orderKind !== 'supplier');
    } else if (orderFilter === 'supplier') {
      list = list.filter((o) => o.orderKind === 'supplier');
    }
    if (String(searchQuery || '').trim()) {
      list = list.filter((o) => orderMatchesSearch(o, searchQuery));
    }
    return list;
  }, [orders, orderFilter, searchQuery]);

  const installmentEvents = useMemo(
    () => buildInstallmentEvents(filteredOrders),
    [filteredOrders],
  );

  const ordersOnDate = (date) =>
    filteredOrders.filter((order) => {
      const orderDate = parseOrderDate(order?.date);
      return orderDate ? isSameDay(orderDate, date) : false;
    });

  const installmentsOnDate = (date) =>
    installmentEvents.filter((ev) => ev.dueDate && isSameDay(ev.dueDate, date));

  const loadInventoryStores = useCallback(async () => {
    try {
      const { data } = await getStoresRequest();
      const list = sortStoresByKind(
        (Array.isArray(data) ? data : []).filter(
          (s) => storeHoldsInventory(s.locationKind) && s.isActive !== false,
        ),
      );
      setInventoryStores(list);
      const bodega = list.find((s) => normalizeLocationKind(s.locationKind) === 'bodega');
      const defaultId = bodega ? String(bodega.id) : list[0] ? String(list[0].id) : '';
      return { list, defaultId };
    } catch {
      setInventoryStores([]);
      return { list: [], defaultId: '' };
    }
  }, []);

  const handleDeliverOrder = async (order) => {
    const pending = (order?.ERP_order_items || order?.items || []).filter((it) => it?.id && !it.deliveredAt);
    if (!pending.length) {
      toastAuth({ message: 'Este pedido ya está entregado.', variant: 'info' });
      return;
    }
    if (!multiStockEnabled) {
      const lines = pending.map((it) => {
        const pid = Number(it.productId ?? it.ERP_inventory_product?.id);
        const need = Number(it.quantity || 0);
        const prod = products.find((p) => Number(p.id) === pid);
        const avail = Number(prod?.stock ?? it.ERP_inventory_product?.stock ?? 0);
        const name = it.ERP_inventory_product?.name || prod?.name || `Producto #${pid}`;
        return {
          pid,
          need,
          avail,
          name,
          ok: Number.isFinite(avail) ? avail >= need : true,
          deficit: Math.max(0, need - (Number.isFinite(avail) ? avail : 0)),
        };
      });
      const shortages = lines.filter((l) => !l.ok);
      if (shortages.length) {
        if (!allowDeliverStockAdjust) {
          toastAuth({
            message: `Stock insuficiente: ${shortages
              .map((s) => `${s.name} (hay ${s.avail}, pide ${s.need})`)
              .join('; ')}`,
            variant: 'warning',
          });
          return;
        }
        setDeliverOrder(order);
        setDeliverPendingItems(pending);
        setStoreStockAvail(lines);
        setDeliverStoreId('');
        const init = {};
        shortages.forEach((s) => {
          init[s.pid] = String(s.deficit);
        });
        setDeliverAdjustQty(init);
        setDeliverAdjustNote('');
        setDeliverAdjustOpen(true);
        return;
      }
      setDeliverBusy(true);
      try {
        await runMutation(
          Promise.all(pending.map((it) => markItemAsDeliveredRequest(it.id))),
          async () => {
            await onReload?.();
          },
        );
      } finally {
        setDeliverBusy(false);
      }
      return;
    }
    setDeliverOrder(order);
    setDeliverPendingItems(pending);
    setDeliverOpen(true);
    const { defaultId } = await loadInventoryStores();
    setDeliverStoreId(defaultId);
    setStoreStockAvail(null);
  };

  useEffect(() => {
    if (!deliverOpen || !deliverStoreId || !deliverPendingItems?.length) {
      if (!deliverAdjustOpen) setStoreStockAvail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getStoreStocksRequest(Number(deliverStoreId));
        const map = data?.byProductId || {};
        const lines = deliverPendingItems.map((it) => {
          const pid = Number(it.productId ?? it.ERP_inventory_product?.id);
          const need = Number(it.quantity || 0);
          const avail = Number(map[pid] ?? map[String(pid)] ?? 0);
          const name = it.ERP_inventory_product?.name || `Producto #${pid}`;
          const deficit = Math.max(0, need - (Number.isFinite(avail) ? avail : 0));
          return {
            pid,
            need,
            avail,
            name,
            ok: Number.isFinite(avail) ? avail >= need : true,
            deficit,
          };
        });
        if (!cancelled) setStoreStockAvail(lines);
      } catch {
        if (!cancelled) setStoreStockAvail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deliverOpen, deliverStoreId, deliverPendingItems, deliverAdjustOpen]);

  const openDeliverAdjustFromShortage = (lines) => {
    const shortages = (lines || []).filter((l) => !l.ok);
    if (!shortages.length) return false;
    if (!allowDeliverStockAdjust) {
      toastAuth({
        message: `Stock insuficiente en este local: ${shortages
          .map((s) => `${s.name} (hay ${s.avail}, pide ${s.need})`)
          .join('; ')}`,
        variant: 'warning',
      });
      return true;
    }
    const init = {};
    shortages.forEach((s) => {
      init[s.pid] = String(s.deficit);
    });
    setDeliverAdjustQty(init);
    setDeliverAdjustNote('');
    setDeliverAdjustOpen(true);
    return true;
  };

  const runMarkDelivered = async () => {
    const payload = multiStockEnabled && deliverStoreId
      ? { storeId: Number(deliverStoreId) }
      : {};
    await runMutation(
      Promise.all(deliverPendingItems.map((it) => markItemAsDeliveredRequest(it.id, payload))),
      async () => {
        setDeliverOpen(false);
        setDeliverAdjustOpen(false);
        setDeliverOrder(null);
        setDeliverPendingItems([]);
        setDeliverAdjustQty({});
        setDeliverAdjustNote('');
        await onReload?.();
      },
    );
  };

  const confirmDeliverOrder = async () => {
    if (!deliverPendingItems?.length) return;
    if (multiStockEnabled && !deliverStoreId) {
      toastAuth({ message: 'Elige Bodega o sucursal de donde sale el stock.', variant: 'warning' });
      return;
    }
    const lines = Array.isArray(storeStockAvail) ? storeStockAvail : [];
    if (lines.some((l) => !l.ok)) {
      openDeliverAdjustFromShortage(lines);
      return;
    }
    setDeliverBusy(true);
    try {
      await runMarkDelivered();
    } finally {
      setDeliverBusy(false);
    }
  };

  const confirmDeliverAdjustAndDeliver = async () => {
    const lines = (storeStockAvail || []).filter((l) => !l.ok);
    if (!lines.length) {
      setDeliverAdjustOpen(false);
      return;
    }
    if (multiStockEnabled && !deliverStoreId) {
      toastAuth({ message: 'Elige el local de salida antes de ajustar.', variant: 'warning' });
      return;
    }
    for (const line of lines) {
      const raw = String(deliverAdjustQty[line.pid] ?? '').trim().replace(',', '.');
      const entrada = Number(raw);
      if (!Number.isFinite(entrada) || entrada < line.deficit) {
        toastAuth({
          message: `“${line.name}”: hay ${line.avail}, pide ${line.need}. La entrada debe ser al menos +${line.deficit}.`,
          variant: 'warning',
        });
        return;
      }
    }
    setDeliverBusy(true);
    try {
      const orderId = deliverOrder?.id;
      for (const line of lines) {
        const entrada = Number(
          String(deliverAdjustQty[line.pid] ?? '').trim().replace(',', '.'),
        );
        const nuevoStock = Number(line.avail) + entrada;
        await registerMovement({
          productId: Number(line.pid),
          type: 'ajuste',
          reason: 'AJUSTE_INVENTARIO',
          quantity: nuevoStock,
          description:
            deliverAdjustNote?.trim() ||
            `Ajuste desde entrega de pedidos #${orderId || '—'} · ${line.name}`,
          price: null,
          referenceType: 'order',
          referenceId: orderId || null,
          ...(multiStockEnabled ? { storeId: Number(deliverStoreId) } : {}),
        });
      }
      await runMarkDelivered();
    } catch (e) {
      toastAuth({
        message: e?.response?.data?.message || e.message || 'No se pudo ajustar o entregar',
        variant: 'error',
      });
    } finally {
      setDeliverBusy(false);
    }
  };

  const resolveItemProductId = (item) =>
    Number(item?.productId ?? item?.ERP_inventory_product?.id) || null;

  const refreshProductsCatalog = async () => {
    try {
      const { data } = await getAllProductsAll();
      setProducts(Array.isArray(data) ? data : data?.products || []);
    } catch {
      /* ignore */
    }
  };

  const openEditProduct = async (item) => {
    if (!canManageOrders) return;
    const productId = resolveItemProductId(item);
    if (!productId) {
      toastAuth?.({ message: 'Este ítem no tiene producto asociado.', variant: 'warning' });
      return;
    }
    setProductDialogBusy(true);
    try {
      let full = products.find((p) => Number(p.id) === Number(productId));
      if (!full) {
        const { data } = await getAllProductsAll();
        const list = Array.isArray(data) ? data : data?.products || [];
        setProducts(list);
        full = list.find((p) => Number(p.id) === Number(productId));
      }
      if (!full) {
        toastAuth?.({ message: 'No se encontró el producto para editar.', variant: 'error' });
        return;
      }
      setProductDialogDatos(full);
      setProductDialogOpen(true);
    } catch (e) {
      console.error(e);
      toastAuth?.({ message: 'No se pudo cargar el producto.', variant: 'error' });
    } finally {
      setProductDialogBusy(false);
    }
  };

  const handleProductDialogSaved = async () => {
    setProductDialogOpen(false);
    setProductDialogDatos(null);
    await refreshProductsCatalog();
    await onReload?.();
  };

  const openStockAdjust = async (item) => {
    if (!canAdjustStock) return;
    const productId = resolveItemProductId(item);
    if (!productId) {
      toastAuth({ message: 'No se pudo identificar el producto del ítem.', variant: 'warning' });
      return;
    }
    const row = { ...item, productId };
    setAdjustItem(row);
    const product = products.find((p) => Number(p.id) === Number(productId));
    setAdjustStock(String(product?.stock ?? item?.ERP_inventory_product?.stock ?? ''));
    setAdjustOpen(true);
    if (multiStockEnabled) {
      const { defaultId } = await loadInventoryStores();
      setAdjustStoreId(defaultId);
      if (defaultId) {
        try {
          const { data } = await getStoreStocksRequest(Number(defaultId));
          const map = data?.byProductId || {};
          const avail = Number(map[productId] ?? map[String(productId)] ?? 0);
          setAdjustStock(String(Number.isFinite(avail) ? avail : 0));
        } catch {
          /* keep product stock */
        }
      }
    } else {
      setAdjustStoreId('');
    }
  };

  const confirmStockAdjust = async () => {
    const productId = resolveItemProductId(adjustItem);
    if (!productId) return;
    const nuevo = Number(String(adjustStock).replace(',', '.'));
    if (!Number.isFinite(nuevo) || nuevo < 0) {
      toastAuth({ message: 'Ingresa un stock válido (≥ 0).', variant: 'warning' });
      return;
    }
    if (multiStockEnabled && !adjustStoreId) {
      toastAuth({ message: 'Elige el local del ajuste.', variant: 'warning' });
      return;
    }
    const name =
      adjustItem?.ERP_inventory_product?.name ||
      products.find((p) => Number(p.id) === Number(productId))?.name ||
      `#${productId}`;
    setAdjustBusy(true);
    try {
      await runMutation(
        registerMovement({
          productId: Number(productId),
          type: 'ajuste',
          reason: 'AJUSTE_INVENTARIO',
          quantity: nuevo,
          description: `Ajuste desde pedidos · ${name} (ítem #${adjustItem.id})`,
          price: null,
          referenceType: 'order_item',
          referenceId: adjustItem.id,
          ...(multiStockEnabled ? { storeId: Number(adjustStoreId) } : {}),
        }),
        async () => {
          setAdjustOpen(false);
          setAdjustItem(null);
          // refrescar catálogo local de productos
          try {
            const { data } = await getAllProductsAll();
            setProducts(Array.isArray(data) ? data : data?.products || []);
          } catch {
            /* ignore */
          }
          await onReload?.();
        },
      );
    } finally {
      setAdjustBusy(false);
    }
  };

  // Abrir diálogos
  const openCustomerDateDialog = (order) => {
    if (!canManageOrders) return;
    const items = order?.ERP_order_items || order?.items || [];
    const paid = items.find((i) => i.paidAt)?.paidAt;
    const delivered = items.find((i) => i.deliveredAt)?.deliveredAt;
    setDateDraft({
      orderId: order?.id ?? null,
      items,
      deliveredAt: toDateInputValue(delivered),
      paidAt: toDateInputValue(paid),
    });
    setDateDialogOpen(true);
  };

  const handleSaveCustomerDates = async () => {
    const items = (dateDraft.items || []).filter((i) => i?.id);
    if (!items.length) {
      toastAuth?.({ message: 'Este pedido no tiene ítems para actualizar.', variant: 'warning' });
      return;
    }
    const deliveredAt = dateDraft.deliveredAt
      ? new Date(`${dateDraft.deliveredAt}T12:00:00`).toISOString()
      : null;
    const paidAt = dateDraft.paidAt
      ? new Date(`${dateDraft.paidAt}T12:00:00`).toISOString()
      : null;
    setDateBusy(true);
    try {
      await runMutation(
        Promise.all(
          items.map((i) => updateOrderItemRequest(i.id, { deliveredAt, paidAt }))
        ),
        async () => {
          setDateDialogOpen(false);
          await onReload?.();
        }
      );
    } finally {
      setDateBusy(false);
    }
  };

  const openOrderDialog = (order) => {
    setOrderToDelete(order);
    setOpenDeleteOrder(true);
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
  const selectedInstallments = selectedDate ? installmentsOnDate(selectedDate) : [];

  const goToDeliveryDay = (deliveryDate) => {
    if (!deliveryDate) return;
    setCurrentDate(startOfMonth(deliveryDate));
    setSelectedDate(deliveryDate);
  };

  const handleDayClick = (date) => {
    if (selectedDate && isSameDay(date, selectedDate)) setSelectedDate(null);
    else setSelectedDate(date);
  };

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

      <TextField
        data-tour="pedidos-search"
        fullWidth
        size="small"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Buscar cliente, proveedor o producto…"
        sx={{ mb: 1.25 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
          endAdornment: searchQuery ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                aria-label="Limpiar búsqueda"
                onClick={() => setSearchQuery('')}
                edge="end"
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />
      {String(searchQuery || '').trim() ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {filteredOrders.length} pedido{filteredOrders.length === 1 ? '' : 's'} coincidente
          {filteredOrders.length === 1 ? '' : 's'}
        </Typography>
      ) : null}

      <Stack
        direction="row"
        flexWrap="wrap"
        useFlexGap
        spacing={1.5}
        sx={{ mb: 1, gap: { xs: 0.75, sm: 1.5 }, alignItems: 'center' }}
      >
        {STATUS_LEGEND.map(({ label, key, color }) => (
          <Stack key={key} direction="row" alignItems="center" spacing={0.6}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: color || theme.palette[key]?.main,
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
                const dailyInstallments = installmentsOnDate(date);
                const customerCount = dailyOrders.filter((o) => o.orderKind !== 'supplier').length;
                const supplierCount = dailyOrders.filter((o) => o.orderKind === 'supplier').length;
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                const isOutOfMonth = !isSameMonth(date, currentDate);
                const hasCreditDue = dailyInstallments.length > 0;
                const statusBase = hasCreditDue
                  ? CREDIT_ORANGE
                  : getCalendarDayBaseColor(dailyOrders, theme);
                const hasOrders = dailyOrders.length > 0 || hasCreditDue;

                let countLabel = '';
                if (hasCreditDue && !dailyOrders.length) {
                  countLabel = `${dailyInstallments.length} cuota${dailyInstallments.length === 1 ? '' : 's'}`;
                } else if (hasOrders) {
                  const parts = [];
                  if (dailyOrders.length) {
                    if (orderFilter === 'all' && customerCount > 0 && supplierCount > 0) {
                      parts.push(`${customerCount} cli · ${supplierCount} prov`);
                    } else {
                      parts.push(`${dailyOrders.length} ped.`);
                    }
                  }
                  if (hasCreditDue) {
                    parts.push(`${dailyInstallments.length} cuota${dailyInstallments.length === 1 ? '' : 's'}`);
                  }
                  countLabel = parts.join(' · ');
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
                      {selectedOrders.length === 1 ? 'pedido' : 'pedidos'}
                      {selectedInstallments.length
                        ? ` · ${selectedInstallments.length} cuota${selectedInstallments.length === 1 ? '' : 's'} de crédito`
                        : ''}
                    </Typography>
                  </Box>
                  {(selectedOrders.length > 0 || selectedInstallments.length > 0) && (
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`${selectedOrders.length + selectedInstallments.length} en total`}
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Stack>
                {selectedOrders.length === 0 && selectedInstallments.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No hay pedidos ni cuotas este día.
                  </Typography>
                )}

                {selectedInstallments.length > 0 && (
                  <Stack spacing={1} sx={{ mb: selectedOrders.length ? 1.5 : 0 }}>
                    {selectedInstallments.map((ev) => (
                      <Paper
                        key={ev.key}
                        variant="outlined"
                        sx={{
                          p: 1.25,
                          borderColor: CREDIT_ORANGE,
                          bgcolor: CREDIT_ORANGE_BG,
                          borderRadius: 2,
                        }}
                      >
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1}
                          alignItems={{ sm: 'center' }}
                          justifyContent="space-between"
                        >
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Chip
                                size="small"
                                label="Cuota / crédito"
                                sx={{
                                  height: 22,
                                  fontWeight: 800,
                                  bgcolor: CREDIT_ORANGE,
                                  color: '#fff',
                                }}
                              />
                              <Chip
                                size="small"
                                variant="outlined"
                                label={ev.orderKind === 'supplier' ? 'Proveedor' : 'Cliente'}
                                sx={{ height: 22, fontWeight: 700 }}
                              />
                            </Stack>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 0.5 }} noWrap>
                              {ev.partyName}
                            </Typography>
                            <Typography variant="body2" fontWeight={700}>
                              Cuota #{ev.installment.sequence}: ${Number(ev.remaining).toFixed(2)}
                              {Number(ev.amount) !== Number(ev.remaining) ? (
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {' '}
                                  (de ${Number(ev.amount).toFixed(2)})
                                </Typography>
                              ) : null}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Pedido #{ev.orderId}
                              {ev.orderRemaining > 0.009
                                ? ` · Saldo pedido $${Number(ev.orderRemaining).toFixed(2)}`
                                : ''}
                              {ev.deliveryDate
                                ? ` · Entrega ${format(ev.deliveryDate, 'dd/MM/yyyy')}`
                                : ''}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<LocalShippingIcon />}
                            disabled={!ev.deliveryDate}
                            onClick={() => goToDeliveryDay(ev.deliveryDate)}
                            sx={{
                              bgcolor: CREDIT_ORANGE,
                              '&:hover': { bgcolor: CREDIT_ORANGE_HOVER },
                              flexShrink: 0,
                            }}
                          >
                            Ver entrega
                          </Button>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
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
                  const orderWithItems = { ...order, ERP_order_items: orderItems };
                  const money = customerOrderMoney(orderWithItems);
                  const hasUnpaid = !money.fullyPaid;
                  const orderTotal = money.total;
                  const unpaidTotal = money.remaining;
                  const isTourFocusOrder =
                    expandedOrders[order.id] === true &&
                    findDemoCustomerOrder()?.id === order.id;
                  const statusMeta = getOrderStatusMeta(orderWithItems);
                  const progress = orderProgress(orderWithItems);
                  const orderColor = getColorByOrder(orderWithItems, theme, tones.state);

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
                                sx={{
                                  height: 20,
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  ...(statusMeta.chipSx || {}),
                                }}
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
                                  Cobro ${progress.paidAmount.toFixed(2)} / ${progress.orderTotal.toFixed(2)}
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

                          {/* Acciones en el header (junto a editar / eliminar) */}
                          <Box
                            data-tour={isTourFocusOrder ? 'pedidos-order-actions' : undefined}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.15, flexShrink: 0, flexWrap: 'wrap' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {canManageOrders && (
                              <DocumentUploadButton
                                entityType="order"
                                entityId={order.id}
                                label="Recibo firmado del cliente"
                                buttonText="Adjuntar recibo"
                                canManage={canManageOrders}
                                iconsOnly
                              />
                            )}
                            <Tooltip title="Imprimir comprobante">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrintReceipt(buildReceiptFromCustomerOrder(order));
                                  setPrintOpen(true);
                                }}
                                onFocus={(e) => e.stopPropagation()}
                                aria-label="Imprimir"
                              >
                                <PrintIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {canManageOrders && hasUnpaid && (
                              <Tooltip title="Liquidar / abonar pedido">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPayCustomerOrder(order);
                                  }}
                                  onFocus={(e) => e.stopPropagation()}
                                  aria-label="Liquidar pedido"
                                >
                                  <PaymentsIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canManageOrders && progress.deliveredCount < progress.total && (
                              <Tooltip title="Entregar todo el pedido">
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleDeliverOrder(orderWithItems);
                                  }}
                                  onFocus={(e) => e.stopPropagation()}
                                  aria-label="Entregar todo"
                                >
                                  <LocalShippingIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canManageOrders && (
                              <Tooltip title="Editar fechas de entrega y pago">
                                <IconButton
                                  size="small"
                                  color="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCustomerDateDialog(orderWithItems);
                                  }}
                                  onFocus={(e) => e.stopPropagation()}
                                  aria-label="Editar fechas"
                                >
                                  <EditCalendarIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canManageOrders && onEdit && (
                              <Tooltip title="Editar pedido de cliente">
                                <IconButton
                                  size="small"
                                  data-tour={isTourFocusOrder ? 'pedidos-edit-order' : undefined}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(order);
                                  }}
                                  onFocus={(e) => e.stopPropagation()}
                                  aria-label="Editar pedido"
                                >
                                  <EditNoteIcon fontSize="small" />
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
                                  aria-label="Eliminar orden"
                                >
                                  <DeleteForeverIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </AccordionSummary>

                      <AccordionDetails sx={{ pt: 0, px: { xs: 1, sm: 1.5 }, pb: 1.5 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                          <Typography variant="caption">
                            Cobro:{' '}
                            {hasUnpaid
                              ? unpaidTotal > 0 && unpaidTotal < orderTotal
                                ? `Parcial ($${unpaidTotal.toFixed(2)} pendiente)`
                                : 'Pendiente'
                              : 'Liquidado'}
                          </Typography>
                          <Typography variant="caption">
                            Entrega: {progress.deliveredCount}/{progress.total}
                          </Typography>
                        </Box>

                        {order.notes && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            Notas: {order.notes}
                          </Typography>
                        )}

                        <Box data-tour={isTourFocusOrder ? 'pedidos-order-items' : undefined}>
                          {(orderItems || []).map((item) => {
                            const itemId = item.id;
                            const productName =
                              item.ERP_inventory_product?.name ||
                              item.product?.name ||
                              item.name ||
                              'Producto';
                            const unit = getProductUnitLabel(item.ERP_inventory_product);
                            const lineTotal = formatOrderLineTotal(item.quantity, item.price);
                            return (
                              <Typography
                                key={itemId ?? `${order.id}-${productName}`}
                                variant="body2"
                                sx={{ mb: 0.5 }}
                              >
                                • {item.packName ? `[${item.packName}] ` : ""}
                                {productName} — {item.quantity} {unit} × {formatUnitPrice(item.price)} ={' '}
                                {formatProductPrice(lineTotal)}
                              </Typography>
                            );
                          })}

                          {orderItems.length > 0 && (
                            <Stack spacing={0.35} sx={{ mt: 1 }}>
                              <Typography variant="body2" fontWeight={700}>
                                Total pedido: {formatProductPrice(orderTotal)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Por cobrar: ${unpaidTotal.toFixed(2)} · Entrega {progress.deliveredCount}/
                                {progress.total}
                              </Typography>
                            </Stack>
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

    <Dialog
      open={dateDialogOpen}
      onClose={() => {
        if (dateBusy) return;
        setDateDialogOpen(false);
      }}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        Editar fechas · Pedido #{dateDraft.orderId}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
          Corrección manual. Aplica la misma fecha a todos los ítems del pedido.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Fecha de entrega"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={dateDraft.deliveredAt}
            onChange={(e) => setDateDraft((p) => ({ ...p, deliveredAt: e.target.value }))}
            fullWidth
            disabled={dateBusy}
          />
          <TextField
            label="Fecha de pago"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={dateDraft.paidAt}
            onChange={(e) => setDateDraft((p) => ({ ...p, paidAt: e.target.value }))}
            fullWidth
            disabled={dateBusy}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1 }}>
        <Button onClick={() => setDateDialogOpen(false)} color="inherit" disabled={dateBusy}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSaveCustomerDates()}
          disabled={dateBusy}
        >
          Guardar fechas
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={deliverOpen}
      onClose={() => {
        if (deliverBusy) return;
        setDeliverOpen(false);
        setDeliverOrder(null);
        setDeliverPendingItems([]);
      }}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        Entregar pedido #{deliverOrder?.id}
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="warning" sx={{ py: 0.75, mb: 1.5 }}>
          Multistock activo: elige <strong>desde dónde sale</strong> el stock de todos los ítems pendientes.
        </Alert>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Se entregarán {deliverPendingItems.length}{' '}
          {deliverPendingItems.length === 1 ? 'producto' : 'productos'} pendientes.
        </Typography>
        {Array.isArray(storeStockAvail) && storeStockAvail.length > 0 && (
          <Stack spacing={0.35} sx={{ mb: 1.25 }}>
            {storeStockAvail.map((line) => (
              <Typography
                key={line.pid}
                variant="caption"
                color={line.ok ? 'text.secondary' : 'error.main'}
              >
                · {line.name}: necesita {line.need}, hay {line.avail}
                {!line.ok ? ` (faltan ${line.deficit})` : ''}
              </Typography>
            ))}
            {storeStockAvail.some((l) => !l.ok) && allowDeliverStockAdjust ? (
              <Alert severity="info" sx={{ py: 0.5, mt: 0.75 }}>
                Falta stock. Al confirmar se abrirá el ajuste (movimiento en pedidos) y luego la entrega.
              </Alert>
            ) : null}
            {storeStockAvail.some((l) => !l.ok) && !allowDeliverStockAdjust ? (
              <Alert severity="warning" sx={{ py: 0.5, mt: 0.75 }}>
                Sin stock suficiente. Activá en Configuración «Pedidos: permitir ajuste…» (solo Admin).
              </Alert>
            ) : null}
          </Stack>
        )}
        <TextField
          select
          fullWidth
          size="small"
          label="Salida desde"
          value={deliverStoreId}
          onChange={(e) => setDeliverStoreId(e.target.value)}
          disabled={deliverBusy}
        >
          {inventoryStores.map((s) => (
            <MenuItem key={s.id} value={String(s.id)}>
              {s.name} ({locationKindLabel(s.locationKind)})
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1 }}>
        <Button
          onClick={() => {
            setDeliverOpen(false);
            setDeliverOrder(null);
            setDeliverPendingItems([]);
          }}
          disabled={deliverBusy}
          color="inherit"
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="info"
          startIcon={<LocalShippingIcon />}
          disabled={
            deliverBusy ||
            !deliverStoreId ||
            (Array.isArray(storeStockAvail) &&
              storeStockAvail.some((l) => !l.ok) &&
              !allowDeliverStockAdjust)
          }
          onClick={() => void confirmDeliverOrder()}
        >
          {Array.isArray(storeStockAvail) &&
          storeStockAvail.some((l) => !l.ok) &&
          allowDeliverStockAdjust
            ? 'Continuar (ajustar)'
            : 'Confirmar entrega'}
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={deliverAdjustOpen}
      onClose={() => {
        if (deliverBusy) return;
        setDeliverAdjustOpen(false);
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
        Stock insuficiente · ajuste desde pedidos
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          Se registrará un movimiento tipo <strong>ajuste</strong> (desde entrega de pedidos
          #{deliverOrder?.id || '—'}) y luego se completará la entrega
          {multiStockEnabled && deliverStoreId
            ? ` desde el local #${deliverStoreId}`
            : ''}
          . Solo Admin/Programador con la opción activa en Configuración.
        </Typography>
        <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1.5 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell align="right">Hay</TableCell>
                <TableCell align="right">Pide</TableCell>
                <TableCell align="right">Mín.</TableCell>
                <TableCell align="right">Entrada</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(storeStockAvail || [])
                .filter((l) => !l.ok)
                .map((row) => (
                  <TableRow key={row.pid}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">{row.avail}</TableCell>
                    <TableCell align="right">{row.need}</TableCell>
                    <TableCell align="right">{row.deficit}</TableCell>
                    <TableCell align="right" sx={{ minWidth: 110 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={deliverAdjustQty[row.pid] ?? ''}
                        onChange={(e) =>
                          setDeliverAdjustQty((prev) => ({
                            ...prev,
                            [row.pid]: e.target.value,
                          }))
                        }
                        inputProps={{ min: row.deficit, step: '0.01' }}
                        disabled={deliverBusy}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TextField
          fullWidth
          size="small"
          label="Nota del ajuste (opcional)"
          placeholder="Conteo, mercadería no cargada…"
          value={deliverAdjustNote}
          onChange={(e) => setDeliverAdjustNote(e.target.value)}
          disabled={deliverBusy}
        />
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button
          onClick={() => setDeliverAdjustOpen(false)}
          disabled={deliverBusy}
          color="inherit"
        >
          Volver
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<TuneIcon />}
          disabled={deliverBusy}
          onClick={() => void confirmDeliverAdjustAndDeliver()}
        >
          {deliverBusy ? '…' : 'Ajustar y entregar'}
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={adjustOpen}
      onClose={() => !adjustBusy && setAdjustOpen(false)}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle sx={{ fontWeight: 700 }}>Ajuste de stock</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ py: 0.75, mb: 1.5 }}>
          Rol Programador / Administrador: se crea un movimiento de inventario tipo{' '}
          <strong>ajuste</strong>
          {multiStockEnabled ? ' en el local elegido' : ' sobre el stock general'}.
        </Alert>
        <Typography variant="body2" sx={{ mb: 1.25 }}>
          {adjustItem?.ERP_inventory_product?.name ||
            products.find((p) => Number(p.id) === Number(adjustItem?.productId))?.name ||
            `Producto #${adjustItem?.productId || '—'}`}
        </Typography>
        {multiStockEnabled ? (
          <TextField
            select
            fullWidth
            size="small"
            label="Local"
            value={adjustStoreId}
            onChange={async (e) => {
              const sid = e.target.value;
              setAdjustStoreId(sid);
              if (!sid || !adjustItem?.productId) return;
              try {
                const { data } = await getStoreStocksRequest(Number(sid));
                const map = data?.byProductId || {};
                const pid = Number(adjustItem.productId);
                const avail = Number(map[pid] ?? map[String(pid)] ?? 0);
                setAdjustStock(String(Number.isFinite(avail) ? avail : 0));
              } catch {
                /* keep */
              }
            }}
            disabled={adjustBusy}
            sx={{ mb: 1.5 }}
          >
            {inventoryStores.map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>
                {s.name} ({locationKindLabel(s.locationKind)})
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        <TextField
          fullWidth
          size="small"
          type="number"
          label={multiStockEnabled ? 'Nuevo stock en este local' : 'Nuevo stock'}
          value={adjustStock}
          onChange={(e) => setAdjustStock(e.target.value)}
          inputProps={{ min: 0, step: 'any' }}
          disabled={adjustBusy}
        />
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1 }}>
        <Button onClick={() => setAdjustOpen(false)} disabled={adjustBusy} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<TuneIcon />}
          disabled={adjustBusy}
          onClick={() => void confirmStockAdjust()}
        >
          Registrar ajuste
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={productDialogOpen}
      onClose={() => {
        setProductDialogOpen(false);
        setProductDialogDatos(null);
      }}
      fullWidth
      maxWidth="lg"
      scroll="paper"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 1 }}>
        <DialogTitle sx={{ p: 0, fontWeight: 700, fontSize: '1.05rem' }}>
          Editar producto
        </DialogTitle>
        <IconButton
          aria-label="Cerrar"
          onClick={() => {
            setProductDialogOpen(false);
            setProductDialogDatos(null);
          }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent dividers>
        <ProductForm
          key={productDialogOpen ? `edit-product-${productDialogDatos?.id || 'x'}` : 'closed'}
          isEditing
          datos={productDialogDatos || {}}
          onClose={() => {
            setProductDialogOpen(false);
            setProductDialogDatos(null);
          }}
          reload={handleProductDialogSaved}
        />
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider' }}>
        <Button
          type="button"
          onClick={() => {
            setProductDialogOpen(false);
            setProductDialogDatos(null);
          }}
          color="inherit"
        >
          Cancelar
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button type="submit" form="eddeli-product-form" variant="contained" sx={{ minWidth: 160 }}>
          Guardar cambios
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
});
