/**
 * Estado de fila en reportes de compras/ventas.
 * Misma paleta y sentido que Pedidos: pagado, entregado, crédito.
 */
import { Tooltip, useTheme } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import CreditCardIcon from "@mui/icons-material/CreditCard";

/** Naranja: cuota / crédito a pagar. */
export const CREDIT_ORANGE = "#FF6D00";
/** Amarillo dorado: entregado/recibido pero falta cobro o pago. */
export const DELIVERED_GOLD = "#F5C518";

function remainingOf(row) {
  if (row?.remainingAmount != null && Number.isFinite(Number(row.remainingAmount))) {
    return Number(row.remainingAmount);
  }
  const total = Number(row?.totalAmount ?? row?.total ?? 0);
  const paid = Number(row?.paidAmount ?? 0);
  if (row?.paidAt && total > 0) return 0;
  if (Number.isFinite(total) && Number.isFinite(paid)) return Math.max(0, total - paid);
  return row?.paidAt ? 0 : 1;
}

function hasUnpaidInstallments(row) {
  const list = row?.paymentInstallments || [];
  return list.some(
    (inst) => !inst?.isPaid && Number(inst?.remainingAmount ?? inst?.amount ?? 0) > 0.009,
  );
}

function isCreditMethod(row) {
  const method = String(row?.paymentMethod || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const notes = String(row?.notes || "");
  return method.includes("credito") || notes.includes("[CREDITO]");
}

function statusShape({ key, label, toneKey, sortOrder }) {
  return { key, label, toneKey, sortOrder };
}

function creditStatus({ delivered, partyKind }) {
  const isSupplier = partyKind === "supplier";
  return statusShape({
    key: "credit",
    label: delivered
      ? "Crédito"
      : isSupplier
        ? "Crédito · no recibido"
        : "Crédito · no entregado",
    toneKey: "credit",
    sortOrder: 0,
  });
}

/** Compra / pedido a proveedor: recibido + pagado + crédito. */
export function getPurchaseHubStatus(row) {
  const received = Boolean(row?.receivedAt);
  const remaining = remainingOf(row);
  const fullyPaid = Boolean(row?.paidAt) || remaining <= 0.009;
  const isCredit = !fullyPaid && (hasUnpaidInstallments(row) || isCreditMethod(row));

  if (isCredit) return creditStatus({ delivered: received, partyKind: "supplier" });
  if (fullyPaid && received) {
    return statusShape({
      key: "complete",
      label: "Completo",
      toneKey: "success",
      sortOrder: 4,
    });
  }
  if (fullyPaid && !received) {
    return statusShape({
      key: "paid_undelivered",
      label: "Pagado · no recibido",
      toneKey: "info",
      sortOrder: 3,
    });
  }
  if (received && !fullyPaid) {
    return statusShape({
      key: "delivered_unpaid",
      label: "Recibido · no pagado",
      toneKey: "gold",
      sortOrder: 2,
    });
  }
  return statusShape({
    key: "none",
    label: "No recibido / no pagado",
    toneKey: "error",
    sortOrder: 1,
  });
}

/** Venta de caja: contado = entregado y pagado; crédito = naranja. */
export function getSaleHubStatus(row) {
  const method = String(row?.paymentMethod || "").toLowerCase();
  const status = String(row?.status || "").toLowerCase();
  const notes = String(row?.notes || "");
  const isCredit =
    method.includes("credito") ||
    notes.includes("[CREDITO]") ||
    status === "pendiente";
  const paid =
    Boolean(row?.paidAt) || status === "pagado" || remainingOf(row) <= 0.009;
  const items = row?.items || row?.ERP_order_items || [];
  const hasDeliveryInfo = items.some((it) => Object.prototype.hasOwnProperty.call(it || {}, "deliveredAt"));
  const delivered = hasDeliveryInfo ? items.every((it) => it.deliveredAt) : true;

  if (isCredit && !paid) return creditStatus({ delivered, partyKind: "customer" });
  if (paid && delivered) {
    return statusShape({
      key: "complete",
      label: "Completo",
      toneKey: "success",
      sortOrder: 4,
    });
  }
  if (paid && !delivered) {
    return statusShape({
      key: "paid_undelivered",
      label: "Pagado · no entregado",
      toneKey: "info",
      sortOrder: 3,
    });
  }
  if (delivered && !paid) {
    return statusShape({
      key: "delivered_unpaid",
      label: "Entregado · no pagado",
      toneKey: "gold",
      sortOrder: 2,
    });
  }
  return statusShape({
    key: "none",
    label: "No entregado / no pagado",
    toneKey: "error",
    sortOrder: 1,
  });
}

const STATUS_ICONS = {
  complete: CheckCircleIcon,
  none: HourglassEmptyIcon,
  delivered_unpaid: MoneyOffIcon,
  paid_undelivered: LocalShippingIcon,
  credit: CreditCardIcon,
};

export function InvoiceHubStatusIcon({ status }) {
  const theme = useTheme();
  if (!status?.label) return null;
  const Icon = STATUS_ICONS[status.key] || HourglassEmptyIcon;
  const color =
    status.toneKey === "gold"
      ? DELIVERED_GOLD
      : status.toneKey === "credit"
        ? CREDIT_ORANGE
        : theme.palette[status.toneKey]?.main || theme.palette.text.secondary;

  return (
    <Tooltip title={status.label} arrow>
      <span style={{ display: "inline-flex", lineHeight: 0, padding: "0 2px" }}>
        <Icon sx={{ fontSize: 18, color }} />
      </span>
    </Tooltip>
  );
}
