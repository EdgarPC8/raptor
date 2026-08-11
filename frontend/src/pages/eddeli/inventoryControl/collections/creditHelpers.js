/** Helpers de crédito / cuotas en Cobranzas. */

const CREDIT_ORANGE = "#FF6D00";

export function formatCreditDueLabel(due) {
  if (!due) return "";
  const s = String(due).slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

export function pickNextCredit(orderOrMeta) {
  if (!orderOrMeta) return null;
  if (orderOrMeta.nextCreditDue) {
    return {
      due: orderOrMeta.nextCreditDue,
      amount: Number(orderOrMeta.nextCreditAmount) || 0,
      count: Number(orderOrMeta.pendingCreditCount) || 0,
    };
  }
  const list = (orderOrMeta.paymentInstallments || []).filter(
    (i) => !i.isPaid && Number(i.remainingAmount ?? i.amount) > 0.009,
  );
  if (!list.length) return null;
  list.sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")));
  return {
    due: list[0].dueDate,
    amount: Number(list[0].remainingAmount ?? list[0].amount) || 0,
    count: list.length,
  };
}

export { CREDIT_ORANGE };
