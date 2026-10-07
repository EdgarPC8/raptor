import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import { paySupplierOrderRequest } from "../../../../api/ordersRequest";

function money(n) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
    Number(n || 0),
  );
}

function nowLocalDateTime() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function supplierTotal(order) {
  if (order?.totalAmount != null && Number.isFinite(Number(order.totalAmount))) {
    return Number(order.totalAmount);
  }
  if (order?.total != null && Number.isFinite(Number(order.total))) {
    return Number(order.total);
  }
  const items = order?.ERP_supplier_order_items || order?.items || [];
  return Number(
    items
      .reduce((s, it) => {
        const line = Number(it.quantity || 0) * Number(it.unitPrice || it.price || 0);
        const rate = Number(it.taxRate || it.ivaRate || 0);
        return s + line * (1 + (rate > 0 ? rate / 100 : 0));
      }, 0)
      .toFixed(2),
  );
}

function supplierPaid(order) {
  if (Array.isArray(order?.payments) && order.payments.length) {
    return Number(
      order.payments
        .reduce((s, p) => s + Number(p.amount || 0), 0)
        .toFixed(2),
    );
  }
  if (order?.paidAmount != null && Number.isFinite(Number(order.paidAmount))) {
    return Number(order.paidAmount);
  }
  return order?.paidAt ? supplierTotal(order) : 0;
}

function supplierRemaining(order) {
  if (order?.remainingAmount != null && Number.isFinite(Number(order.remainingAmount))) {
    return Math.max(0, Number(order.remainingAmount));
  }
  return Number(Math.max(0, supplierTotal(order) - supplierPaid(order)).toFixed(2));
}

/**
 * Diálogo para abonar un pedido a proveedor (egreso).
 * Misma API que Cobranzas → Proveedores / accordion de pedidos.
 */
export default function SupplierOrderPayDialog({
  open,
  order,
  onClose,
  onPaid,
  toast,
  preferFull = false,
}) {
  const [busy, setBusy] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(nowLocalDateTime());
  const [payMethod, setPayMethod] = useState("efectivo");
  const [payNote, setPayNote] = useState("");

  const total = useMemo(() => (order ? supplierTotal(order) : 0), [order]);
  const paid = useMemo(() => (order ? supplierPaid(order) : 0), [order]);
  const remaining = useMemo(() => (order ? supplierRemaining(order) : 0), [order]);

  useEffect(() => {
    if (!open || !order?.id) return;
    const rem = remaining > 0 ? remaining : total;
    setPayAmount(preferFull || rem > 0 ? String(rem) : "");
    setPayDate(nowLocalDateTime());
    setPayMethod("efectivo");
    setPayNote(
      preferFull ? `Liquidación pedido #${order.id}` : `Abono pedido #${order.id}`,
    );
  }, [open, order?.id, preferFull, remaining, total]);

  const handlePay = async () => {
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
      await toast?.({
        promise: paySupplierOrderRequest(order.id, {
          amount,
          date: payDate,
          method: payMethod,
          note: payNote || `Abono pedido #${order.id}`,
        }),
      });
      onPaid?.();
      onClose?.();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>
        Abonar pedido #{order?.id}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <Alert severity="info" sx={{ py: 0.5 }}>
            Abono a proveedor (egreso). Saldo actual: <b>{money(remaining)}</b>
          </Alert>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`Total ${money(total)}`} />
            <Chip
              size="small"
              color="success"
              variant="outlined"
              label={`Abonado ${money(paid)}`}
            />
            <Chip
              size="small"
              color="error"
              variant="outlined"
              label={`Saldo ${money(remaining)}`}
            />
          </Stack>
          <TextField
            label="Monto a abonar"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            inputProps={{ min: 0, step: "0.01" }}
            fullWidth
            disabled={busy}
            helperText="Puedes abonar solo una parte; el resto queda pendiente"
          />
          <Button
            size="small"
            onClick={() => setPayAmount(String(remaining))}
            disabled={busy || remaining <= 0}
          >
            Usar saldo completo ({money(remaining)})
          </Button>
          <TextField
            label="Fecha"
            type="datetime-local"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            disabled={busy}
          />
          <TextField
            select
            label="Método"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            fullWidth
            disabled={busy}
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
            disabled={busy}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} color="inherit" disabled={busy}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<PaymentsIcon />}
          onClick={handlePay}
          disabled={busy || remaining <= 0}
        >
          Registrar abono
        </Button>
      </DialogActions>
    </Dialog>
  );
}
