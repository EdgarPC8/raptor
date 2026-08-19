import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PaymentsIcon from "@mui/icons-material/Payments";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import EditIcon from "@mui/icons-material/Edit";
import UndoIcon from "@mui/icons-material/Undo";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import {
  deleteSupplierOrderRequest,
  markSupplierOrderReceivedRequest,
  paySupplierOrderRequest,
  unmarkSupplierOrderPaidRequest,
  updateSupplierOrderRequest,
} from "../../../../api/ordersRequest";
import SimpleDialog from "../../../../components/Dialogs/SimpleDialog";
import { useAuth } from "../../../../context/AuthContext";
import { useAppSettings } from "../../../../context/AppSettingsContext.jsx";
import { formatDateTime } from "../../../../helpers/functions.js";
import DocumentAttachmentIcon from "./DocumentAttachmentIcon";
import DocumentUploadButton from "./DocumentUploadButton";
import ProductForm from "./ProductForm.jsx";
import SupplierOrderShoppingListDialog from "./SupplierOrderShoppingListDialog.jsx";
import {
  getProductUnitLabel,
  formatOrderLineTotal,
  formatProductPrice,
  formatUnitPrice,
} from "./ProductPriceReference";
import { useEffect, useMemo, useState } from "react";
import { getAllProductsAll, getStoresRequest } from "../../../../api/inventoryControlRequest.js";
import {
  locationKindLabel,
  normalizeLocationKind,
  sortStoresByKind,
  storeHoldsInventory,
} from "../../../../utils/storeLocationKind.js";

function supplierTotal(order) {
  if (order?.totalAmount != null && Number.isFinite(Number(order.totalAmount))) {
    return Number(Number(order.totalAmount).toFixed(2));
  }
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  let sub = 0;
  let iva = 0;
  (order.ERP_supplier_order_items || []).forEach((it) => {
    const gross = Number(it.quantity || 0) * Number(it.unitPrice || 0);
    const disc = Math.max(0, Number(it.discount || 0));
    const line = Math.max(0, gross - disc);
    sub += line;
    iva += line * (Number(it.taxRate || 0) / 100);
  });
  return round2(round2(sub) + round2(iva));
}

function supplierPaid(order) {
  if (order?.paidAmount != null && Number.isFinite(Number(order.paidAmount))) {
    return Number(Number(order.paidAmount).toFixed(2));
  }
  return order?.paidAt ? supplierTotal(order) : 0;
}

function supplierRemaining(order) {
  if (order?.remainingAmount != null && Number.isFinite(Number(order.remainingAmount))) {
    return Number(Number(order.remainingAmount).toFixed(2));
  }
  return Number(Math.max(0, supplierTotal(order) - supplierPaid(order)).toFixed(2));
}

function supplierSeverity(order) {
  const received = Boolean(order.receivedAt);
  const remaining = supplierRemaining(order);
  const paid = supplierPaid(order);
  const fullyPaid = remaining <= 0.009;
  const partial = !fullyPaid && paid > 0.009;

  if (fullyPaid && received) return 3;
  if (!fullyPaid && !received && !partial) return 0;
  if (partial) return received ? 1 : 0;
  if (received && !fullyPaid) return 1;
  if (fullyPaid && !received) return 2;
  return 1;
}

/** Convierte una fecha (ISO o "dd/MM/yyyy HH:mm:ss") a "YYYY-MM-DD" para inputs date. */
function toDateInputValue(value) {
  if (!value) return "";
  if (typeof value === "string" && value.includes("/")) {
    const [datePart] = value.split(" ");
    const [dd, mm, yyyy] = datePart.split("/");
    if (dd && mm && yyyy) return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function nowLocalDateTime() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function severityColor(severity, palette) {
  if (severity === 0) return palette.error.main;
  // Amarillo dorado (no warning MUI) para diferenciar del naranja de crédito
  if (severity === 1) return "#F5C518";
  if (severity === 2) return palette.info.main;
  return palette.success.main;
}

function money(n) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
    Number(n || 0)
  );
}

export default function SupplierOrderAccordion({
  order,
  canManage,
  tone,
  toast,
  onReload,
  onRemove,
  onEdit,
  products = [],
}) {
  const theme = useTheme();
  const { user } = useAuth();
  const { activeApp } = useAppSettings();
  const multiStockEnabled = activeApp?.multiStockEnabled !== false;
  const isProgramador = user?.loginRol === "Programador";
  const canFinanceCorrections =
    isProgramador ||
    (canManage && activeApp?.financeAllowAdminCorrections !== false);
  const [openDelete, setOpenDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState({ receivedAt: "", paidAt: "" });

  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productDialogDatos, setProductDialogDatos] = useState(null);
  const [productDialogBusy, setProductDialogBusy] = useState(false);
  const [payDate, setPayDate] = useState(nowLocalDateTime());
  const [payMethod, setPayMethod] = useState("efectivo");
  const [payNote, setPayNote] = useState("");

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveStoreId, setReceiveStoreId] = useState("");
  const [inventoryStores, setInventoryStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);

  const total = supplierTotal(order);
  const paid = supplierPaid(order);
  const remaining = supplierRemaining(order);
  const fullyPaid = remaining <= 0.009;
  const payPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  /** Programador puede abrir el modal de edición aunque ya esté recibido, si aún hay saldo. */
  const canOpenEditModal =
    Boolean(onEdit) && (!order.receivedAt || (isProgramador && !fullyPaid));

  const severity = supplierSeverity(order);
  const base = severityColor(severity, theme.palette);
  const bg = alpha(base, tone);

  const run = async (promise) => {
    setBusy(true);
    try {
      await toast({ promise });
      await onReload?.();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  const openEditProduct = async (item) => {
    if (!canManage) return;
    const productId = Number(item?.productId ?? item?.ERP_inventory_product?.id) || null;
    if (!productId) {
      toast?.({ message: "Este ítem no tiene producto asociado.", variant: "warning" });
      return;
    }
    setProductDialogBusy(true);
    try {
      let full = products.find((p) => Number(p.id) === Number(productId));
      if (!full) {
        const { data } = await getAllProductsAll();
        const list = Array.isArray(data) ? data : data?.products || [];
        full = list.find((p) => Number(p.id) === Number(productId));
      }
      if (!full) {
        toast?.({ message: "No se encontró el producto para editar.", variant: "error" });
        return;
      }
      setProductDialogDatos(full);
      setProductDialogOpen(true);
    } catch (e) {
      console.error(e);
      toast?.({ message: "No se pudo cargar el producto.", variant: "error" });
    } finally {
      setProductDialogBusy(false);
    }
  };

  const handleProductDialogSaved = async () => {
    setProductDialogOpen(false);
    setProductDialogDatos(null);
    await onReload?.();
  };

  const handleReceived = () => {
    if (!multiStockEnabled) {
      void run(markSupplierOrderReceivedRequest(order.id));
      return;
    }
    setReceiveOpen(true);
  };

  const loadInventoryStores = async () => {
    try {
      setStoresLoading(true);
      const { data } = await getStoresRequest();
      const list = sortStoresByKind(
        (Array.isArray(data) ? data : []).filter(
          (s) => storeHoldsInventory(s.locationKind) && s.isActive !== false,
        ),
      );
      setInventoryStores(list);
      // Por defecto recibir en sucursal propia (donde se vende en caja).
      // Bodega queda disponible en el selector para quien quiera almacenar.
      const propia = list.find((s) => normalizeLocationKind(s.locationKind) === "propia");
      const bodega = list.find((s) => normalizeLocationKind(s.locationKind) === "bodega");
      const preferred = propia || bodega || list[0];
      setReceiveStoreId(preferred ? String(preferred.id) : "");
    } catch {
      setInventoryStores([]);
      setReceiveStoreId("");
    } finally {
      setStoresLoading(false);
    }
  };

  useEffect(() => {
    if (receiveOpen && multiStockEnabled) {
      void loadInventoryStores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiveOpen, multiStockEnabled]);

  useEffect(() => {
    if (order?.receivedStoreId && multiStockEnabled && inventoryStores.length === 0) {
      void loadInventoryStores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.receivedStoreId, multiStockEnabled]);

  const receivedStoreLabel = useMemo(() => {
    const sid = order?.receivedStoreId;
    if (sid == null) return null;
    const found = inventoryStores.find((s) => Number(s.id) === Number(sid));
    if (found) return `${found.name} (${locationKindLabel(found.locationKind)})`;
    return `Local #${sid}`;
  }, [order?.receivedStoreId, inventoryStores]);

  const handleConfirmReceive = async () => {
    if (multiStockEnabled && !receiveStoreId) {
      void toast?.({
        message: "Elige Bodega o una sucursal para recibir el stock.",
        variant: "warning",
      });
      return;
    }
    setBusy(true);
    try {
      await toast({
        promise: markSupplierOrderReceivedRequest(order.id, {
          ...(multiStockEnabled ? { storeId: Number(receiveStoreId) } : {}),
        }),
      });
      setReceiveOpen(false);
      await onReload?.();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  const openPayDialog = (full = false) => {
    const rem = remaining > 0 ? remaining : total;
    setPayAmount(full || rem > 0 ? String(rem) : "");
    setPayDate(nowLocalDateTime());
    setPayMethod("efectivo");
    setPayNote(full ? `Liquidación pedido #${order.id}` : `Abono pedido #${order.id}`);
    setPayOpen(true);
  };

  const handleConfirmPay = async () => {
    const amount = Number(String(payAmount).replace(",", "."));
    if (!(amount > 0)) {
      void toast?.({ message: "Ingresa un monto válido", variant: "warning" });
      return;
    }
    if (amount > remaining + 0.009) {
      void toast?.({
        message: `El abono no puede superar el saldo (${money(remaining)})`,
        variant: "warning",
      });
      return;
    }
    setBusy(true);
    try {
      await toast({
        promise: paySupplierOrderRequest(order.id, {
          amount,
          date: payDate,
          method: payMethod,
          note: payNote || `Abono pedido #${order.id}`,
        }),
      });
      setPayOpen(false);
      await onReload?.();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  const openDateDialog = () => {
    setDateDraft({
      receivedAt: toDateInputValue(order.receivedAt),
      paidAt: toDateInputValue(order.paidAt),
    });
    setDateDialogOpen(true);
  };

  const handleSaveDates = async () => {
    setBusy(true);
    try {
      await toast({
        promise: updateSupplierOrderRequest(order.id, {
          receivedAt: dateDraft.receivedAt
            ? new Date(`${dateDraft.receivedAt}T12:00:00`).toISOString()
            : null,
          paidAt: dateDraft.paidAt
            ? new Date(`${dateDraft.paidAt}T12:00:00`).toISOString()
            : null,
        }),
      });
      setDateDialogOpen(false);
      await onReload?.();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await toast({ promise: deleteSupplierOrderRequest(order.id) });
      setOpenDelete(false);
      onRemove?.(order.id);
      await onReload?.();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  const handleUnmarkPaid = async () => {
    if (!canFinanceCorrections || !order?.paidAt) return;
    setBusy(true);
    try {
      await toast({ promise: unmarkSupplierOrderPaidRequest(order.id) });
      await onReload?.();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };


  return (
    <>
      <SimpleDialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        tittle="Eliminar pedido a proveedor"
        onClickAccept={confirmDelete}
      >
        ¿Eliminar el pedido #{order.id} a {order.ERP_supplier?.name || "proveedor"}?
        También se eliminarán gastos y abonos vinculados en Finanzas.
      </SimpleDialog>

      <Dialog
        open={receiveOpen}
        onClose={() => !busy && setReceiveOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Recibir pedido #{order.id}</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ py: 0.75, mb: 1.5 }}>
            Multistock activo: elige <strong>dónde entra</strong> la mercadería.
            Si recibes en Bodega y vendes en Sucursal, el stock no aparecerá en caja
            hasta que lo traspasés.
          </Alert>
          <TextField
            select
            fullWidth
            size="small"
            label="Recibir en"
            value={receiveStoreId}
            onChange={(e) => setReceiveStoreId(e.target.value)}
            disabled={storesLoading || busy}
            helperText={
              storesLoading
                ? "Cargando locales…"
                : "Recomendado: la misma sucursal donde abres caja."
            }
          >
            {inventoryStores.map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>
                {s.name} ({locationKindLabel(s.locationKind)})
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1 }}>
          <Button onClick={() => setReceiveOpen(false)} color="inherit" disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<LocalShippingIcon />}
            onClick={() => void handleConfirmReceive()}
            disabled={busy || storesLoading || !receiveStoreId}
          >
            Confirmar recepción
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dateDialogOpen} onClose={() => setDateDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Editar fechas · Pedido #{order.id}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
            Corrección manual. No re-dispara movimientos de stock.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Fecha de entrega"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={dateDraft.receivedAt}
              onChange={(e) => setDateDraft((p) => ({ ...p, receivedAt: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Fecha de pago"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={dateDraft.paidAt}
              onChange={(e) => setDateDraft((p) => ({ ...p, paidAt: e.target.value }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1 }}>
          <Button onClick={() => setDateDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSaveDates} disabled={busy}>
            Guardar fechas
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={payOpen} onClose={() => setPayOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Abonar pedido #{order.id}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              Puedes abonar después de crear el pedido. Saldo actual: <b>{money(remaining)}</b>
            </Alert>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`Total ${money(total)}`} />
              <Chip size="small" color="success" variant="outlined" label={`Abonado ${money(paid)}`} />
              <Chip size="small" color="error" variant="outlined" label={`Saldo ${money(remaining)}`} />
            </Stack>
            <TextField
              label="Monto a abonar"
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
              helperText="Deja el saldo o cámbialo por un abono parcial"
            />
            <Button size="small" onClick={() => setPayAmount(String(remaining))} disabled={remaining <= 0}>
              Usar saldo completo ({money(remaining)})
            </Button>
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
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={() => setPayOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmPay} disabled={busy}>
            Registrar abono
          </Button>
        </DialogActions>
      </Dialog>

      <Accordion
        sx={{
          mb: 1,
          backgroundColor: bg,
          border: "1px solid",
          borderColor: alpha(theme.palette.divider, 0.6),
          "&:before": { display: "none" },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              pr: 1,
              gap: 1,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" color="secondary.main">
                Proveedor: {order.ERP_supplier?.name || "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                Pedido #{order.id} — Total: {money(total)}
                {!fullyPaid ? (
                  <>
                    {" "}
                    · Saldo: <b>{money(remaining)}</b>
                  </>
                ) : (
                  " · Pagado"
                )}
              </Typography>
              {!fullyPaid && total > 0 ? (
                <LinearProgress
                  variant="determinate"
                  value={payPct}
                  color="error"
                  sx={{ mt: 0.75, height: 4, borderRadius: 99, maxWidth: 220 }}
                />
              ) : null}
            </Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.15, flexShrink: 0, flexWrap: "wrap" }}
              onClick={(e) => e.stopPropagation()}
            >
              <DocumentAttachmentIcon
                entityType="supplier_order"
                entityId={order.id}
                title="Ver factura / nota proveedor"
              />
              {canManage && (
                <DocumentUploadButton
                  entityType="supplier_order"
                  entityId={order.id}
                  label="Factura / nota proveedor"
                  buttonText="Adjuntar factura"
                  canManage={canManage}
                  iconsOnly
                />
              )}
              {canManage && !order.receivedAt && (
                <Tooltip title="Marcar pedido como recibido">
                  <span>
                    <IconButton
                      size="small"
                      color="warning"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReceived();
                      }}
                      onFocus={(e) => e.stopPropagation()}
                      aria-label="Marcar recibido"
                    >
                      <LocalShippingIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              {canManage && !fullyPaid && (
                <>
                  <Tooltip title="Abonar a proveedor">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          openPayDialog(false);
                        }}
                        onFocus={(e) => e.stopPropagation()}
                        aria-label="Abonar"
                      >
                        <PaymentsIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Liquidar todo el saldo">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={busy || remaining <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          openPayDialog(true);
                        }}
                        onFocus={(e) => e.stopPropagation()}
                        aria-label="Liquidar todo"
                      >
                        <MonetizationOnIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </>
              )}
              {canManage && isProgramador && (
                <Tooltip title="Editar fechas de entrega y pago">
                  <span>
                    <IconButton
                      size="small"
                      color="secondary"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDateDialog();
                      }}
                      onFocus={(e) => e.stopPropagation()}
                      aria-label="Editar fechas"
                    >
                      <EditCalendarIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              {canFinanceCorrections && (order.paidAt || paid > 0.009) && (
                <Tooltip title="Anular pago (elimina gasto en Finanzas)">
                  <span>
                    <IconButton
                      size="small"
                      color="warning"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleUnmarkPaid();
                      }}
                      onFocus={(e) => e.stopPropagation()}
                      aria-label="Anular pago"
                    >
                      <UndoIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              {canOpenEditModal && (
                <Tooltip title="Editar pedido a proveedor">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(order);
                    }}
                    onFocus={(e) => e.stopPropagation()}
                    aria-label="Editar pedido proveedor"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {(order.ERP_supplier_order_items || []).length > 0 && (
                <Tooltip title="Lista de pedido (copiar / PNG / PDF)">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShoppingListOpen(true);
                    }}
                    onFocus={(e) => e.stopPropagation()}
                    aria-label="Lista de pedido"
                  >
                    <DescriptionOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {canFinanceCorrections && (
                <Tooltip title="Eliminar pedido">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDelete(true);
                    }}
                    onFocus={(e) => e.stopPropagation()}
                  >
                    <DeleteForeverIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </AccordionSummary>

        <AccordionDetails>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1 }}>
            <Typography variant="caption">
              Recibido: {order.receivedAt ? formatDateTime(order.receivedAt) : "Pendiente"}
            </Typography>
            <Typography variant="caption">
              Pago:{" "}
              {fullyPaid
                ? order.paidAt
                  ? formatDateTime(order.paidAt)
                  : "Liquidado"
                : paid > 0
                  ? `Parcial (${money(paid)} de ${money(total)})`
                  : "Pendiente"}
            </Typography>
          </Box>

          {(order.ERP_supplier_order_items || []).map((item) => {
            const unit = getProductUnitLabel(item.ERP_inventory_product);
            const lineBase = formatOrderLineTotal(item.quantity, item.unitPrice, item.discount);
            const rate = Number(item.taxRate || 0);
            const lineTotal = lineBase * (1 + rate / 100);
            return (
              <Typography key={item.id} variant="body2" sx={{ mb: 0.5 }}>
                • {item.ERP_inventory_product?.name || "Producto"} — {item.quantity} {unit} ×{" "}
                {formatUnitPrice(item.unitPrice)}
                {Number(item.discount) > 0 ? ` − desc. ${formatProductPrice(item.discount)}` : ""}
                {rate > 0 ? ` + IVA ${rate}%` : ""} = {formatProductPrice(lineTotal)}
              </Typography>
            );
          })}

          {(order.ERP_supplier_order_items || []).length > 0 && (
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              <Typography variant="body2" fontWeight={700}>
                Total pedido: {formatProductPrice(total)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Abonado: {money(paid)} · Saldo: {money(remaining)}
              </Typography>
            </Stack>
          )}

          {Array.isArray(order.payments) && order.payments.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Abonos registrados
              </Typography>
              {order.payments.map((p) => (
                <Typography key={p.id} variant="caption" display="block" color="text.secondary">
                  · {p.date || "—"} — {money(p.amount)} ({p.method}
                  {p.note ? ` · ${p.note}` : ""})
                </Typography>
              ))}
            </Box>
          )}

          {order.notes && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Notas: {order.notes}
              </Typography>
            </>
          )}

          {order.receivedAt && order.receivedStoreId != null ? (
            <Chip
              size="small"
              color="secondary"
              variant="outlined"
              label={`Stock en: ${receivedStoreLabel || `local #${order.receivedStoreId}`}`}
              sx={{ mt: 1, height: 24, fontSize: "0.65rem" }}
            />
          ) : null}
        </AccordionDetails>
      </Accordion>

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
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, pt: 1 }}>
          <DialogTitle sx={{ p: 0, fontWeight: 700, fontSize: "1.05rem" }}>
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
            key={productDialogOpen ? `edit-product-${productDialogDatos?.id || "x"}` : "closed"}
            isEditing
            datos={productDialogDatos || {}}
            onClose={() => {
              setProductDialogOpen(false);
              setProductDialogDatos(null);
            }}
            reload={handleProductDialogSaved}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
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

      <SupplierOrderShoppingListDialog
        open={shoppingListOpen}
        onClose={() => setShoppingListOpen(false)}
        items={(order.ERP_supplier_order_items || []).map((item) => ({
          lineId: item.id,
          productId: item.productId,
          name: item.ERP_inventory_product?.name || "Producto",
          quantity: item.quantity,
          unitLabel: getProductUnitLabel(item.ERP_inventory_product),
          ERP_inventory_product: item.ERP_inventory_product,
        }))}
        supplierName={order.ERP_supplier?.name || ""}
        dateLabel={
          order.date
            ? String(order.date).slice(0, 10)
            : order.createdAt
              ? String(order.createdAt).slice(0, 10)
              : ""
        }
        notes={order.notes || ""}
        orderId={order.id}
      />
    </>
  );
}
