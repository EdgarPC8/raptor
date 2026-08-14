/** Utilidades de cuotas de pago para pedidos (cliente / proveedor). */

const money2 = (n) => Number(Number(n || 0).toFixed(2));

export function toDateOnly(v) {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return toDateOnly(d);
}

/**
 * Reparte N cuotas entre fecha de entrega y fecha de liquidación.
 * Montos iguales; la última ajusta centavos.
 */
export function buildEqualInstallments({ startDate, endDate, count, total }) {
  const n = Math.max(1, Math.min(36, Math.floor(Number(count) || 1)));
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate) || start;
  const totalAmt = money2(total);
  if (!start || !end || totalAmt <= 0) return [];

  const startMs = new Date(`${start}T12:00:00`).getTime();
  const endMs = new Date(`${end}T12:00:00`).getTime();
  const dates = [];
  if (n === 1) {
    dates.push(end);
  } else {
    for (let i = 0; i < n; i += 1) {
      const t = startMs + ((endMs - startMs) * i) / (n - 1);
      dates.push(toDateOnly(new Date(t)));
    }
  }

  const base = money2(Math.floor((totalAmt / n) * 100) / 100);
  const rows = dates.map((dueDate, i) => ({
    id: null,
    sequence: i + 1,
    dueDate,
    amount: base,
    locked: false,
    reminderEnabled: true,
    reminderDaysBefore: 1,
    paidAmount: 0,
    remainingAmount: base,
    isPaid: false,
  }));
  const sumBase = money2(base * n);
  const last = rows[rows.length - 1];
  last.amount = money2(last.amount + (totalAmt - sumBase));
  last.remainingAmount = last.amount;
  return rows;
}

export function sumInstallmentAmounts(rows) {
  return money2((rows || []).reduce((a, r) => a + Number(r.amount || 0), 0));
}

export function normalizeScheduleForApi(rows) {
  return (rows || [])
    .map((r, i) => ({
      id: r.id != null ? Number(r.id) : undefined,
      sequence: i + 1,
      dueDate: toDateOnly(r.dueDate),
      amount: money2(r.amount),
      reminderEnabled: r.reminderEnabled !== false,
      reminderDaysBefore: [0, 1, 2].includes(Number(r.reminderDaysBefore))
        ? Number(r.reminderDaysBefore)
        : 1,
    }))
    .filter((r) => r.dueDate && r.amount > 0);
}
