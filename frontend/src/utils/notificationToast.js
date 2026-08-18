/** Clasifica avisos de la bandeja para toasts por tipo. */

export function notificationToastCategory(notif) {
  const sk = String(notif?.sourceKey || "").toLowerCase();
  const title = String(notif?.title || "").toLowerCase();
  const message = String(notif?.message || "").toLowerCase();
  const text = `${title} ${message}`;

  if (sk.startsWith("stock_min") || text.includes("stock mínimo") || text.includes("stock minimo")) {
    return "stock";
  }
  if (
    sk.startsWith("payment_installment") ||
    text.includes("cuota") ||
    text.includes("crédito") ||
    text.includes("credito")
  ) {
    return "credit";
  }
  if (
    sk.startsWith("batch_expiry") ||
    text.includes("caduc") ||
    (text.includes("vence") && (text.includes("lote") || text.includes("producto")))
  ) {
    return "expiry";
  }
  if (
    sk.startsWith("program:") ||
    title.includes("buenos") ||
    title.includes("buenas") ||
    title.includes("saludo")
  ) {
    return "greeting";
  }
  return null;
}

export const NOTIFICATION_TOAST_FLAG = {
  greeting: "notificationsToastGreeting",
  stock: "notificationsToastStock",
  credit: "notificationsToastCredit",
  expiry: "notificationsToastExpiry",
};

/** Color del toast: caducidad rojo, stock amarillo, crédito naranja, saludo azul. */
export function notificationToastAccent(category, palette) {
  const colors = palette?.colors || {};
  if (category === "stock") return colors.yellow || "#F5C542";
  if (category === "credit") return colors.orange || "#FF9F43";
  if (category === "expiry") return colors.red || palette?.error?.main || "#F07167";
  return colors.blue || "#3B9DD9";
}
