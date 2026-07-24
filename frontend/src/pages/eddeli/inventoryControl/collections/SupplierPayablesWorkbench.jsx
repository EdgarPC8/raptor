/**
 * Cuentas por pagar: abonos a pedidos de proveedores.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PaymentsIcon from "@mui/icons-material/Payments";
import {
  getSupplierPayablesWorkbenchRequest,
  paySupplierOrderRequest,
  deleteSupplierOrderPaymentRequest,
  updateSupplierOrderRequest,
  createSupplierPackRequest,
  updateSupplierPackRequest,
  dissolveSupplierPackRequest,
  paySupplierPackRequest,
} from "../../../../api/ordersRequest";
import { useAuth } from "../../../../context/AuthContext";
import {
  money,
  nowLocalDateTime,
  toNum,
} from "./helpers.js";
import SupplierPendingSummaryPanel from "./SupplierPendingSummaryPanel.jsx";
import EditNoteIcon from "@mui/icons-material/EditNote";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import { alpha } from "@mui/material/styles";

export default function SupplierPayablesWorkbench() {
  const isMobile = useMediaQuery("(max-width:900px)");
  const { toast: toastAuth, user } = useAuth();
  const isProgrammer = user?.loginRol === "Programador";
  const canManagePacks = ["Programador", "Administrador"].includes(user?.loginRol);

  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uiMsg, setUiMsg] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [mainTab, setMainTab] = useState(0); // 0 pendiente · 1 grupos · 2 pacas

  const [payOpen, setPayOpen] = useState(false);
  const [payOrderId, setPayOrderId] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(nowLocalDateTime());
  const [payNote, setPayNote] = useState("Abono a proveedor");
  const [payMethod, setPayMethod] = useState("efectivo");

  const [packOpen, setPackOpen] = useState(false);
  const [packConcept, setPackConcept] = useState("Paca / cartón");
  const [packAmount, setPackAmount] = useState("");

  const [orderGroupOpen, setOrderGroupOpen] = useState(false);
  const [orderGroupConcept, setOrderGroupConcept] = useState("");
  const [orderGroupIds, setOrderGroupIds] = useState([]);

  const [editPackOpen, setEditPackOpen] = useState(false);
  const [editPackId, setEditPackId] = useState(null);
  const [editPackConcept, setEditPackConcept] = useState("");
  const [editPackAmount, setEditPackAmount] = useState("");

  const [payPackOpen, setPayPackOpen] = useState(false);
  const [payPackId, setPayPackId] = useState(null);
  const [payPackAmount, setPayPackAmount] = useState("");
  const [payPackDate, setPayPackDate] = useState(nowLocalDateTime());
  const [payPackNote, setPayPackNote] = useState("");
  const [payPackMethod, setPayPackMethod] = useState("efectivo");

  const [editingItemId, setEditingItemId] = useState(null);
  const [editFields, setEditFields] = useState({});

  const load = async (keepSelection = true) => {
    try {
      setLoading(true);
      setUiMsg(null);
      const res = await getSupplierPayablesWorkbenchRequest();
      const data = res?.data || {};
      const nextSuppliers = Array.isArray(data.suppliers) ? data.suppliers : [];
      const nextOrders = Array.isArray(data.orders) ? data.orders : [];
      const nextPayments = Array.isArray(data.payments) ? data.payments : [];
      const nextPacks = Array.isArray(data.packs) ? data.packs : [];
      setSuppliers(nextSuppliers);
      setOrders(nextOrders);
      setPayments(nextPayments);
      setPacks(nextPacks);

      if (!keepSelection || !selectedSupplierId) {
        const firstWithDebt = nextSuppliers.find((s) => toNum(s.debtTotal) > 0);
        setSelectedSupplierId(firstWithDebt?.id ?? nextSuppliers[0]?.id ?? null);
        setSelectedOrderId(null);
        setSelectedItemIds([]);
        return;
      }
      if (!nextSuppliers.some((s) => s.id === selectedSupplierId)) {
        setSelectedSupplierId(nextSuppliers[0]?.id ?? null);
        setSelectedOrderId(null);
        setSelectedItemIds([]);
      }
    } catch (err) {
      console.error("supplier payables load:", err);
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "Error cargando cuentas por pagar",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const supplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId) || null,
    [suppliers, selectedSupplierId]
  );

  const supplierOrders = useMemo(
    () =>
      orders
        .filter((o) => o.supplierId === selectedSupplierId)
        .slice()
        .sort((a, b) => {
          const ra = toNum(b.remainingAmount) - toNum(a.remainingAmount);
          if (ra !== 0) return ra;
          return String(b.date || "").localeCompare(String(a.date || ""));
        }),
    [orders, selectedSupplierId]
  );

  const pendingOrders = useMemo(
    () => supplierOrders.filter((o) => toNum(o.remainingAmount) > 0.009),
    [supplierOrders]
  );

  const pendingItems = useMemo(() => {
    const out = [];
    for (const o of pendingOrders) {
      for (const it of o.items || []) {
        out.push({
          ...it,
          orderId: o.id,
          orderDate: o.date,
          orderReceivedAt: o.receivedAt || null,
          orderRemaining: toNum(o.remainingAmount),
          orderPaidAmount: toNum(o.paidAmount),
          supplierId: o.supplierId,
          orderNotes: o.notes || "",
          packId: it.packId || null,
        });
      }
    }
    return out.sort((a, b) => {
      const byName = String(a.product).localeCompare(String(b.product), "es");
      if (byName !== 0) return byName;
      return Number(b.orderId) - Number(a.orderId);
    });
  }, [pendingOrders]);

  const supplierPacks = useMemo(
    () =>
      packs
        .filter((p) => Number(p.supplierId) === Number(selectedSupplierId))
        .slice()
        .sort((a, b) => toNum(b.remainingAmount) - toNum(a.remainingAmount)),
    [packs, selectedSupplierId]
  );

  const paymentGroups = useMemo(
    () => supplierPacks.filter((p) => p.kind === "order_group"),
    [supplierPacks]
  );

  const cartonPacks = useMemo(
    () => supplierPacks.filter((p) => p.kind !== "order_group"),
    [supplierPacks]
  );

  const selectedPackItems = useMemo(
    () => pendingItems.filter((it) => selectedItemIds.includes(it.id)),
    [pendingItems, selectedItemIds]
  );

  const selectedPackPreview = useMemo(() => {
    const qty = selectedPackItems.reduce((s, it) => s + toNum(it.quantity), 0);
    const amt = Number(String(packAmount || "").replace(",", "."));
    const unit = qty > 0 && Number.isFinite(amt) && amt > 0 ? amt / qty : null;
    return { qty, unit, count: selectedPackItems.length };
  }, [selectedPackItems, packAmount]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const selectedPack = useMemo(
    () => packs.find((p) => p.id === payPackId || p.id === editPackId) || null,
    [packs, payPackId, editPackId]
  );

  const openEditPack = (pack) => {
    setEditPackId(pack.id);
    setEditPackConcept(pack.concept || "Paca / cartón");
    setEditPackAmount(String(toNum(pack.packAmount) || ""));
    setEditPackOpen(true);
  };

  const confirmEditPack = async () => {
    const pack = packs.find((p) => p.id === editPackId);
    const payload = { concept: editPackConcept };
    if (!(toNum(pack?.paidAmount) > 0.009)) {
      const amt = Number(String(editPackAmount).replace(",", "."));
      if (!(amt > 0)) {
        setUiMsg({ type: "error", text: "Ingresá un valor válido de la paca" });
        return;
      }
      payload.packAmount = amt;
    }
    try {
      setLoading(true);
      await toastAuth({
        promise: updateSupplierPackRequest(editPackId, payload),
        onSuccess: async () => {
          setEditPackOpen(false);
          setEditPackId(null);
          await load(true);
          return { title: "Paca", description: "Paca actualizada" };
        },
        onError: (res) => ({
          title: "Paca",
          description: res?.response?.data?.message || "No se pudo editar",
        }),
      });
    } catch (err) {
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "No se pudo editar la paca",
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmDissolvePack = async (pack) => {
    const ok = window.confirm(
      `¿Desglosar la paca «${pack.concept}» (#${pack.id})?\nSe restauran los precios anteriores y las líneas vuelven sueltas.`
    );
    if (!ok) return;
    try {
      setLoading(true);
      await toastAuth({
        promise: dissolveSupplierPackRequest(pack.id),
        onSuccess: async () => {
          await load(true);
          return { title: "Paca", description: "Paca desglosada" };
        },
        onError: (res) => ({
          title: "Paca",
          description: res?.response?.data?.message || "No se pudo desglosar",
        }),
      });
    } catch (err) {
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "No se pudo desglosar la paca",
      });
    } finally {
      setLoading(false);
    }
  };

  const orderPayments = useMemo(
    () =>
      payments.filter(
        (p) =>
          selectedOrderId != null &&
          Number(p.supplierOrderId) === Number(selectedOrderId) &&
          p.status === "completed"
      ),
    [payments, selectedOrderId]
  );

  const totalDebt = useMemo(
    () => roundSum(suppliers.map((s) => toNum(s.debtTotal))),
    [suppliers]
  );

  const openPay = (order) => {
    setPayOrderId(order.id);
    setPayAmount(String(toNum(order.remainingAmount) || ""));
    setPayDate(nowLocalDateTime());
    setPayMethod("efectivo");
    setPayNote(`Abono pedido #${order.id}`);
    setPayOpen(true);
    setSelectedOrderId(order.id);
  };

  const confirmPay = async () => {
    try {
      const amt = Number(payAmount);
      if (!(amt > 0)) {
        setUiMsg({ type: "error", text: "Ingresa un monto válido" });
        return;
      }
      setLoading(true);
      const res = await paySupplierOrderRequest(payOrderId, {
        amount: amt,
        date: payDate,
        note: payNote,
        method: payMethod,
      });
      setPayOpen(false);
      await load(true);
      const fully = res?.data?.fullyPaid;
      toastAuth?.({
        message: fully
          ? `Pedido #${payOrderId} liquidado`
          : `Abono de ${money(amt)} registrado`,
        variant: "success",
      });
      setUiMsg({
        type: "success",
        text: fully
          ? `Pedido #${payOrderId} pagado por completo.`
          : `Abono registrado. Saldo restante: ${money(res?.data?.remainingAmount)}.`,
      });
    } catch (err) {
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "No se pudo registrar el abono",
      });
    } finally {
      setLoading(false);
    }
  };

  const removePayment = async (paymentId) => {
    if (!window.confirm("¿Eliminar este abono? Se revertirá el gasto contable.")) return;
    try {
      setLoading(true);
      await deleteSupplierOrderPaymentRequest(paymentId);
      await load(true);
      setUiMsg({ type: "success", text: "Abono eliminado" });
    } catch (err) {
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "No se pudo eliminar el abono",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = (item) => {
    if (!item) {
      setEditingItemId(null);
      return;
    }
    setEditingItemId(item.id);
    setEditFields((prev) => ({
      ...prev,
      [item.id]: {
        quantity: String(item.quantity ?? ""),
        unitPrice: String(item.unitPrice ?? ""),
      },
    }));
  };

  const handleEditFieldChange = (itemId, field, value) => {
    setEditFields((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const handleEditConfirm = async (item) => {
    const order = orders.find((o) => o.id === item.orderId);
    if (!order) {
      setUiMsg({ type: "error", text: "Pedido no encontrado" });
      return;
    }
    const fields = editFields[item.id] || {};
    const canEditPrice = toNum(order.remainingAmount) > 0.009;
    const canEditQty = !order.receivedAt;
    if (!canEditPrice && !canEditQty) {
      setUiMsg({
        type: "error",
        text: "No se puede editar: pedido liquidado o ya recibido sin cambios permitidos",
      });
      return;
    }

    const nextQty = canEditQty
      ? Number(String(fields.quantity ?? "").replace(",", "."))
      : toNum(item.quantity);
    const nextPrice = canEditPrice
      ? Number(String(fields.unitPrice ?? "").replace(",", "."))
      : toNum(item.unitPrice);

    if (!(nextQty > 0) || Number.isNaN(nextQty)) {
      setUiMsg({ type: "error", text: "Cantidad inválida" });
      return;
    }
    if (!(nextPrice >= 0) || Number.isNaN(nextPrice)) {
      setUiMsg({ type: "error", text: "Precio inválido" });
      return;
    }

    const itemsPayload = (order.items || []).map((it) => ({
      productId: it.productId,
      quantity: it.id === item.id ? nextQty : toNum(it.quantity),
      unitPrice: it.id === item.id ? nextPrice : toNum(it.unitPrice),
      taxRate: toNum(it.taxRate),
    }));

    const payload = { items: itemsPayload };
    if (!order.receivedAt) {
      payload.supplierId = order.supplierId;
      payload.notes = order.notes || null;
      const d = String(order.date || "").slice(0, 10);
      payload.date = d.includes("T") ? order.date : `${d}T12:00:00`;
    }

    try {
      setLoading(true);
      await toastAuth({
        promise: updateSupplierOrderRequest(order.id, payload),
        onSuccess: async () => {
          setEditingItemId(null);
          await load(true);
          setUiMsg({ type: "success", text: `Línea del pedido #${order.id} actualizada` });
          return { title: "Pedido proveedor", description: `Pedido #${order.id} actualizado` };
        },
        onError: (res) => ({
          title: "Pedido proveedor",
          description: res?.response?.data?.message || "No se pudo actualizar la línea",
        }),
      });
    } catch (err) {
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "No se pudo actualizar la línea",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelect = (itemId) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleOrderSelect = (orderId) => {
    const id = Number(orderId);
    setSelectedOrderIds((prev) =>
      prev.some((x) => Number(x) === id)
        ? prev.filter((x) => Number(x) !== id)
        : [...prev, id]
    );
  };

  const openOrderGroupDialog = (orderIds) => {
    const ids = (orderIds || []).map((id) => Number(id)).filter((id) => id > 0);
    if (ids.length < 1) {
      setUiMsg({ type: "warning", text: "Seleccioná al menos un pedido" });
      return;
    }
    const rem = pendingOrders
      .filter((o) => ids.includes(Number(o.id)))
      .reduce((s, o) => s + toNum(o.remainingAmount), 0);
    if (!(rem > 0.009)) {
      setUiMsg({ type: "warning", text: "Los pedidos seleccionados no tienen saldo" });
      return;
    }
    setOrderGroupIds(ids);
    setOrderGroupConcept(`Grupo pedidos ${ids.map((id) => `#${id}`).join(", ")}`);
    setOrderGroupOpen(true);
  };

  const confirmCreateOrderGroup = async () => {
    const ids = orderGroupIds.map((id) => Number(id)).filter((id) => id > 0);
    if (ids.length < 1) {
      setUiMsg({ type: "warning", text: "Seleccioná al menos un pedido" });
      return;
    }
    const concept =
      String(orderGroupConcept || "").trim() ||
      `Grupo pedidos ${ids.map((id) => `#${id}`).join(", ")}`;
    try {
      setLoading(true);
      await toastAuth({
        promise: createSupplierPackRequest({
          supplierId: Number(selectedSupplierId),
          kind: "order_group",
          concept,
          orderIds: ids,
        }),
        onSuccess: async (r) => {
          setOrderGroupOpen(false);
          setOrderGroupIds([]);
          setSelectedOrderIds([]);
          setMainTab(1);
          await load(true);
          return {
            title: "Grupo de pago",
            description: `«${concept}» (#${r?.data?.packId}) creado. Aboná cuando quieras.`,
          };
        },
        onError: (r) => ({
          title: "Grupo de pago",
          description: r?.response?.data?.message || "No se pudo crear el grupo",
        }),
      });
    } catch (err) {
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "No se pudo crear el grupo",
      });
    } finally {
      setLoading(false);
    }
  };

  const openPackDialog = () => {
    if (selectedItemIds.length < 1) {
      setUiMsg({ type: "warning", text: "Seleccioná productos para armar la paca" });
      return;
    }
    if (selectedPackItems.some((it) => it.packId)) {
      setUiMsg({ type: "warning", text: "Hay líneas que ya están en otra paca" });
      return;
    }
    setPackConcept("Paca / cartón");
    setPackAmount("");
    setPackOpen(true);
  };

  const confirmCreatePack = async () => {
    const amt = Number(String(packAmount).replace(",", "."));
    if (!(amt > 0)) {
      setUiMsg({ type: "error", text: "Ingresá el valor de la paca" });
      return;
    }
    try {
      setLoading(true);
      await toastAuth({
        promise: createSupplierPackRequest({
          supplierId: Number(selectedSupplierId),
          concept: packConcept,
          packAmount: amt,
          itemIds: selectedItemIds.map((id) => Number(id)),
        }),
        onSuccess: async (res) => {
          setPackOpen(false);
          setSelectedItemIds([]);
          setMainTab(2);
          await load(true);
          const unit = res?.data?.unitPrice;
          setUiMsg({
            type: "success",
            text: `Paca creada. Precio unitario repartido: ${
              unit != null ? money(unit) : "—"
            }`,
          });
          return { title: "Paca", description: "Paca/cartón armada y precios actualizados" };
        },
        onError: (res) => ({
          title: "Paca",
          description: res?.response?.data?.message || "No se pudo crear la paca",
        }),
      });
    } catch (err) {
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "No se pudo crear la paca",
      });
    } finally {
      setLoading(false);
    }
  };

  const openPayPack = (pack) => {
    setPayPackId(pack.id);
    setPayPackAmount(String(toNum(pack.remainingAmount) || ""));
    setPayPackDate(nowLocalDateTime());
    setPayPackMethod("efectivo");
    setPayPackNote(`Abono paca #${pack.id}`);
    setPayPackOpen(true);
  };

  const confirmPayPack = async () => {
    const amt = Number(String(payPackAmount).replace(",", "."));
    if (!(amt > 0)) {
      setUiMsg({ type: "error", text: "Ingresa un monto válido" });
      return;
    }
    try {
      setLoading(true);
      const res = await paySupplierPackRequest(payPackId, {
        amount: amt,
        date: payPackDate,
        method: payPackMethod,
        note: payPackNote,
      });
      setPayPackOpen(false);
      await load(true);
      const breakdown = res?.data?.breakdown || [];
      const desglose = breakdown
        .map((b) => `#${b.orderId}: ${money(b.amount)}`)
        .join(" · ");
      toastAuth?.({
        message: res?.data?.fullyPaid
          ? `Paca #${payPackId} liquidada`
          : `Abono de ${money(amt)} a la paca`,
        variant: "success",
      });
      setUiMsg({
        type: "success",
        text: desglose
          ? `Abono registrado. Desglose: ${desglose}`
          : `Abono registrado. Saldo paca: ${money(res?.data?.remainingAmount)}`,
      });
    } catch (err) {
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "No se pudo abonar la paca",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <Card
        variant="outlined"
        sx={{
          mb: 2,
          background: (t) =>
            `linear-gradient(135deg, ${t.palette.error.main}14 0%, ${t.palette.background.paper} 55%)`,
        }}
      >
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Cuentas por pagar (proveedores)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Aboná por pedido o armá una paca/cartón (aunque ya esté entregado): ponés el valor
                total, se reparte en las unidades y al pagar se desglosa por pedido.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                color="error"
                variant="outlined"
                label={`Deuda total: ${money(totalDebt)}`}
                sx={{ fontWeight: 800 }}
              />
              <Tooltip title="Refrescar">
                <span>
                  <IconButton onClick={() => load(true)} disabled={loading}>
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>

          {loading ? <LinearProgress sx={{ mt: 1.5 }} /> : null}

          {uiMsg ? (
            <Alert
              severity={uiMsg.type || "info"}
              sx={{ mt: 1.5 }}
              onClose={() => setUiMsg(null)}
            >
              {uiMsg.text}
            </Alert>
          ) : null}

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Proveedores con deuda (primero los que más debes)
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              maxHeight: isMobile ? 120 : "none",
              overflowY: isMobile ? "auto" : "visible",
            }}
          >
            {suppliers.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay proveedores registrados.
              </Typography>
            ) : (
              suppliers.map((s) => {
                const active = s.id === selectedSupplierId;
                const amount = toNum(s.debtTotal);
                return (
                  <Chip
                    key={s.id}
                    clickable
                    onClick={() => {
                      setSelectedSupplierId(s.id);
                      setSelectedOrderId(null);
                      setSelectedItemIds([]);
                      setSelectedOrderIds([]);
                      setMainTab(0);
                      setUiMsg(null);
                    }}
                    color={active ? "error" : amount > 0 ? "warning" : "default"}
                    variant={active ? "filled" : "outlined"}
                    label={`${s.name} · ${money(amount)}`}
                    size="small"
                  />
                );
              })
            )}
          </Box>
        </CardContent>
      </Card>

      {!supplier ? (
        <Alert severity="info">Selecciona un proveedor.</Alert>
      ) : (
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent sx={{ pb: 1 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                spacing={1}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                    {supplier.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pedidos con saldo: {pendingOrders.length} · Debes{" "}
                    <b>{money(supplier.debtTotal)}</b>
                  </Typography>
                </Box>
              </Stack>
              <Tabs
                value={mainTab}
                onChange={(_, v) => setMainTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mt: 1.5, borderBottom: 1, borderColor: "divider" }}
              >
                <Tab label="Pendiente" />
                <Tab label={`Grupos (${paymentGroups.length})`} />
                <Tab label={`Pacas (${cartonPacks.length})`} />
              </Tabs>
            </CardContent>
          </Card>

          {mainTab === 0 ? (
            <>
              <SupplierPendingSummaryPanel
                debtTotal={supplier.debtTotal}
                pendingOrders={pendingOrders}
                pendingItems={pendingItems}
                packs={[]}
                isProgrammer={isProgrammer}
                canSelectItems={canManagePacks}
                selectedItemIds={selectedItemIds}
                onToggleItem={toggleItemSelect}
                selectedOrderIds={selectedOrderIds}
                onToggleOrder={toggleOrderSelect}
                onClearOrderSelection={() => setSelectedOrderIds([])}
                onCreateOrderGroup={canManagePacks ? openOrderGroupDialog : undefined}
                editingItemId={editingItemId}
                editFields={editFields}
                onEditToggle={handleEditToggle}
                onEditFieldChange={handleEditFieldChange}
                onEditConfirm={handleEditConfirm}
                onAbonarOrder={(ord) => {
                  setSelectedOrderId(ord.id);
                  openPay(ord);
                }}
                busy={loading}
              />

              {canManagePacks && selectedItemIds.length > 0 ? (
                <Card variant="outlined">
                  <CardContent>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      alignItems={{ xs: "stretch", sm: "center" }}
                      justifyContent="space-between"
                    >
                      <Typography variant="body2">
                        <b>{selectedItemIds.length}</b> línea(s) seleccionada(s) · Cant.{" "}
                        {selectedPackPreview.qty}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => setSelectedItemIds([])}>
                          Limpiar
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          startIcon={<Inventory2Icon />}
                          onClick={() => {
                            openPackDialog();
                          }}
                          disabled={loading}
                        >
                          Armar paca / cartón
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : null}

          {mainTab === 1 ? (
            <PackListCard
              title="Grupos de pago"
              emptyText="No hay grupos de pago. En Pendiente → Por pedidos, marcá pedidos y tocá Crear grupo."
              packs={paymentGroups}
              kind="order_group"
              canManage={canManagePacks}
              loading={loading}
              onPay={openPayPack}
              onEdit={openEditPack}
              onDissolve={confirmDissolvePack}
            />
          ) : null}

          {mainTab === 2 ? (
            <PackListCard
              title="Pacas / cartones"
              emptyText="No hay pacas. En Pendiente → Por producto, seleccioná líneas y armá una paca."
              packs={cartonPacks}
              kind="carton"
              canManage={canManagePacks}
              loading={loading}
              onPay={openPayPack}
              onEdit={openEditPack}
              onDissolve={confirmDissolvePack}
            />
          ) : null}

          {selectedOrder && mainTab === 0 ? (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
                  Detalle pedido #{selectedOrder.id}
                </Typography>
                <Stack spacing={0.5} sx={{ mb: 2 }}>
                  {(selectedOrder.items || []).map((it) => (
                    <Stack
                      key={it.id}
                      direction="row"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography variant="body2">
                        {it.product} × {it.quantity} · {money(it.unitPrice)}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {money(it.lineTotal)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                  Historial de abonos
                </Typography>
                {orderPayments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Aún no hay abonos en este pedido.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {orderPayments.map((p) => (
                      <Stack
                        key={p.id}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        justifyContent="space-between"
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {money(p.amount)} · {p.method}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.date} {p.note ? `· ${p.note}` : ""}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removePayment(p.id)}
                          disabled={loading}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          ) : null}
        </Stack>
      )}

      <Dialog open={payOpen} onClose={() => setPayOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>Abonar a proveedor</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              Pedido #{payOrderId}. Puedes abonar solo una parte; el saldo queda pendiente.
            </Alert>
            <TextField
              label="Monto"
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
            />
            <TextField
              label="Fecha"
              type="datetime-local"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              select
              label="Método"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              fullWidth
            >
              <MenuItem value="efectivo">Efectivo</MenuItem>
              <MenuItem value="transferencia">Transferencia</MenuItem>
              <MenuItem value="tarjeta">Tarjeta</MenuItem>
              <MenuItem value="otro">Otro</MenuItem>
            </TextField>
            <TextField
              label="Nota"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPayOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={confirmPay} disabled={loading}>
            Registrar abono
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={orderGroupOpen}
        onClose={() => {
          setOrderGroupOpen(false);
          setOrderGroupIds([]);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Crear grupo de pago</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              Como en cobranzas de clientes: nombrás el grupo ahora y abonás después cuando
              quieras. No cambia precios de productos.
            </Alert>
            <TextField
              label="Nombre del grupo (concepto)"
              value={orderGroupConcept}
              onChange={(e) => setOrderGroupConcept(e.target.value)}
              placeholder="Ej: Semana 30 · Proveedor X"
              fullWidth
              autoFocus
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={`${orderGroupIds.length} pedido(s)`}
                variant="outlined"
              />
              <Chip
                size="small"
                color="error"
                variant="outlined"
                label={`Saldo ${money(
                  pendingOrders
                    .filter((o) => orderGroupIds.some((id) => Number(id) === Number(o.id)))
                    .reduce((s, o) => s + toNum(o.remainingAmount), 0)
                )}`}
              />
            </Stack>
            <Box sx={{ maxHeight: 140, overflow: "auto" }}>
              {pendingOrders
                .filter((o) => orderGroupIds.some((id) => Number(id) === Number(o.id)))
                .map((o) => (
                  <Typography key={o.id} variant="caption" display="block" color="text.secondary">
                    · Pedido #{o.id} · saldo {money(o.remainingAmount)}
                  </Typography>
                ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setOrderGroupOpen(false);
              setOrderGroupIds([]);
            }}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={confirmCreateOrderGroup}
            disabled={loading || !String(orderGroupConcept || "").trim()}
          >
            Crear grupo
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={packOpen} onClose={() => setPackOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Armar paca / cartón</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              El valor de la paca se reparte en precio unitario (= valor ÷ cantidad total), aunque
              ya esté entregado. Al abonar la paca, el pago se desglosa por pedido.
            </Alert>
            <Typography variant="body2">
              {selectedPackPreview.count} línea(s) · Cant. total {selectedPackPreview.qty}
              {selectedPackPreview.unit != null ? (
                <>
                  {" "}
                  · P/U estimado: <b>{money(selectedPackPreview.unit)}</b>
                </>
              ) : null}
            </Typography>
            <Box sx={{ maxHeight: 160, overflow: "auto" }}>
              {selectedPackItems.map((it) => (
                <Typography key={it.id} variant="caption" display="block" color="text.secondary">
                  · {it.product} × {it.quantity} (pedido #{it.orderId})
                  {it.packId ? " — ya en paca" : ""}
                </Typography>
              ))}
            </Box>
            <TextField
              label="Nombre / concepto"
              value={packConcept}
              onChange={(e) => setPackConcept(e.target.value)}
              fullWidth
            />
            <TextField
              label="Valor de la paca"
              type="number"
              value={packAmount}
              onChange={(e) => setPackAmount(e.target.value)}
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPackOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={confirmCreatePack}
            disabled={loading}
          >
            Crear paca
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editPackOpen}
        onClose={() => {
          setEditPackOpen(false);
          setEditPackId(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Editar paca</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              Podés cambiar el nombre y el valor. Si cambia el valor, se reparte de nuevo el
              precio unitario (solo si la paca no tiene abonos).
            </Alert>
            {selectedPack && editPackId === selectedPack.id ? (
              <Box sx={{ maxHeight: 140, overflow: "auto" }}>
                {(selectedPack.items || []).map((it) => (
                  <Typography key={it.id} variant="caption" display="block" color="text.secondary">
                    · {it.product} × {it.quantity} (pedido #{it.supplierOrderId})
                  </Typography>
                ))}
              </Box>
            ) : null}
            <TextField
              label="Nombre / concepto"
              value={editPackConcept}
              onChange={(e) => setEditPackConcept(e.target.value)}
              fullWidth
            />
            <TextField
              label="Valor de la paca"
              type="number"
              value={editPackAmount}
              onChange={(e) => setEditPackAmount(e.target.value)}
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
              disabled={selectedPack && toNum(selectedPack.paidAmount) > 0.009}
              helperText={
                selectedPack && toNum(selectedPack.paidAmount) > 0.009
                  ? "Con abonos solo se puede editar el nombre"
                  : undefined
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setEditPackOpen(false);
              setEditPackId(null);
            }}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={confirmEditPack}
            disabled={loading}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={payPackOpen} onClose={() => setPayPackOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Abonar paca</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              Paca #{payPackId}
              {selectedPack ? ` · ${selectedPack.concept}` : ""}. El abono se desglosa entre los
              pedidos de la paca.
            </Alert>
            {selectedPack ? (
              <Box sx={{ maxHeight: 140, overflow: "auto" }}>
                {(selectedPack.items || []).map((it) => (
                  <Typography key={it.id} variant="caption" display="block" color="text.secondary">
                    · Pedido #{it.supplierOrderId}: {it.product} × {it.quantity} ={" "}
                    {money(it.allocatedLineTotal)}
                  </Typography>
                ))}
              </Box>
            ) : null}
            <TextField
              label="Monto"
              type="number"
              value={payPackAmount}
              onChange={(e) => setPayPackAmount(e.target.value)}
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
            />
            <TextField
              label="Fecha"
              type="datetime-local"
              value={payPackDate}
              onChange={(e) => setPayPackDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              select
              label="Método"
              value={payPackMethod}
              onChange={(e) => setPayPackMethod(e.target.value)}
              fullWidth
            >
              <MenuItem value="efectivo">Efectivo</MenuItem>
              <MenuItem value="transferencia">Transferencia</MenuItem>
              <MenuItem value="tarjeta">Tarjeta</MenuItem>
              <MenuItem value="otro">Otro</MenuItem>
            </TextField>
            <TextField
              label="Nota"
              value={payPackNote}
              onChange={(e) => setPayPackNote(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPayPackOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmPayPack}
            disabled={loading}
          >
            Registrar abono
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function PackListCard({
  title,
  emptyText,
  packs = [],
  kind = "carton",
  canManage = false,
  loading = false,
  onPay,
  onEdit,
  onDissolve,
}) {
  const isGroup = kind === "order_group";
  const accent = isGroup ? "primary" : "success";
  const payLabel = isGroup ? "Abonar grupo" : "Abonar paca";

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: (t) => alpha(t.palette[accent].main, 0.45),
        bgcolor: (t) => alpha(t.palette[accent].main, 0.05),
      }}
    >
      <CardContent>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 900,
            mb: 1,
            color: isGroup ? "primary.dark" : "success.dark",
          }}
        >
          {title}
        </Typography>
        {packs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {emptyText}
          </Typography>
        ) : (
          <Stack spacing={1}>
            {packs.map((pack) => {
              const canDissolve = toNum(pack.paidAmount) <= 0.009;
              return (
                <Accordion
                  key={pack.id}
                  defaultExpanded
                  disableGutters
                  sx={{
                    border: 1,
                    borderColor: (t) => alpha(t.palette[accent].main, 0.5),
                    borderRadius: "10px !important",
                    bgcolor: (t) => alpha(t.palette[accent].main, 0.08),
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                      sx={{ width: "100%", pr: 1 }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 900,
                          color: isGroup ? "primary.dark" : "success.dark",
                        }}
                      >
                        {pack.concept}
                      </Typography>
                      <Chip
                        size="small"
                        color={accent}
                        label={`#${pack.id}`}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={money(pack.packAmount)}
                        color={accent}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        color={toNum(pack.remainingAmount) > 0.009 ? "error" : "success"}
                        variant="outlined"
                        label={
                          toNum(pack.remainingAmount) > 0.009
                            ? `Saldo ${money(pack.remainingAmount)}`
                            : "Liquidada"
                        }
                      />
                      {(pack.orderIds || []).map((oid) => (
                        <Chip key={oid} size="small" label={`#${oid}`} variant="outlined" />
                      ))}
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                      {(pack.items || []).length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          {isGroup
                            ? "Grupo por pedidos (sin líneas de producto sueltas)."
                            : "Sin líneas."}
                        </Typography>
                      ) : (
                        (pack.items || []).map((it) => (
                          <Stack
                            key={it.id}
                            direction="row"
                            justifyContent="space-between"
                            spacing={1}
                          >
                            <Typography variant="body2">
                              {it.product} × {it.quantity}
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                              >
                                {" "}
                                · pedido #{it.supplierOrderId}
                              </Typography>
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {money(it.allocatedLineTotal)}
                            </Typography>
                          </Stack>
                        ))
                      )}
                    </Stack>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      {toNum(pack.remainingAmount) > 0.009 ? (
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          startIcon={<PaymentsIcon />}
                          onClick={() => onPay?.(pack)}
                          disabled={loading}
                        >
                          {payLabel}
                        </Button>
                      ) : null}
                      {canManage ? (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            color={accent}
                            startIcon={<EditNoteIcon />}
                            onClick={() => onEdit?.(pack)}
                            disabled={loading}
                          >
                            Editar
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            startIcon={<CallSplitIcon />}
                            onClick={() => onDissolve?.(pack)}
                            disabled={loading || !canDissolve}
                          >
                            Desglosar
                          </Button>
                        </>
                      ) : null}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function roundSum(nums) {
  return Number(nums.reduce((a, b) => a + toNum(b), 0).toFixed(2));
}
