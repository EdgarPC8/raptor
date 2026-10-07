/** Tabla francesa: interés = saldo × tasa × días reales / 360. */

function round2(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

export function daysBetween(fromIso, toIso) {
  const a = new Date(`${String(fromIso).slice(0, 10)}T12:00:00`);
  const b = new Date(`${String(toIso).slice(0, 10)}T12:00:00`);
  return Math.round((b - a) / 86400000);
}

export function addMonthsSameDay(iso, months) {
  const base = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  const day = base.getDate();
  const next = new Date(base.getFullYear(), base.getMonth() + months, 1, 12);
  const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, last));
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function buildFrenchAmortization({
  principal,
  annualRatePercent,
  months,
  issueDate,
  firstDueDate,
  insurancePerMil = 0,
  firePerMil = 0,
  markPastAsMovement = false,
  today = "",
}) {
  const capital0 = round2(principal);
  const annual = Number(annualRatePercent) / 100;
  const count = Math.floor(Number(months));
  const ins = Number(insurancePerMil) / 1000;
  const fire = Number(firePerMil) / 1000;
  const issue = String(issueDate || "").slice(0, 10);
  const first = String(firstDueDate || "").slice(0, 10);
  const todayKey = String(today || "").slice(0, 10);
  if (!(capital0 > 0) || !Number.isFinite(annual) || annual < 0 || annual > 1 || !(count >= 1) || !issue || !first) {
    if (Number.isFinite(annual) && (annual < 0 || annual > 1)) {
      return { rows: [], totals: null, error: "La tasa debe estar entre 0 % y 100 %" };
    }
    return { rows: [], totals: null };
  }
  const beforeIssue = daysBetween(issue, first) <= 0;
  if (beforeIssue && !markPastAsMovement) {
    return {
      rows: [],
      totals: null,
      beforeIssue: true,
    };
  }

  let bal = capital0;
  let prev = beforeIssue ? addMonthsSameDay(first, -1) : issue;
  const rows = [];
  let sumInterest = 0;
  let sumCapital = 0;
  let sumSeguro = 0;
  let sumFire = 0;
  let sumDiv = 0;

  for (let k = 0; k < count; k += 1) {
    const dueDate = addMonthsSameDay(first, k);
    const dd = daysBetween(prev, dueDate);
    if (dd <= 0) {
      return { rows: [], totals: null, error: "Las fechas de las cuotas deben ir hacia adelante" };
    }
    const periodRate = annual * dd / 360;
    const nrem = count - k;
    let interest;
    let capitalCuota;
    if (periodRate === 0) {
      interest = 0;
      capitalCuota = nrem === 1 ? round2(bal) : round2(bal / nrem);
    } else {
      const pow = (1 + periodRate) ** nrem;
      const pmt = nrem === 1 ? bal * (1 + periodRate) : (bal * periodRate * pow) / (pow - 1);
      interest = round2(bal * periodRate);
      capitalCuota = nrem === 1 ? round2(bal) : round2(pmt - interest);
    }
    const seguroDesgravamen = round2(bal * (Number.isFinite(ins) ? ins : 0));
    const seguroIncendio = round2(bal * (Number.isFinite(fire) ? fire : 0));
    const dividendo = round2(interest + capitalCuota + seguroDesgravamen + seguroIncendio);
    const historical = Boolean(markPastAsMovement && todayKey && dueDate < todayKey);
    rows.push({
      id: k + 1,
      sequence: k + 1,
      capitalReducido: round2(bal),
      interest,
      capitalCuota,
      seguroDesgravamen,
      seguroIncendio,
      amount: dividendo,
      dividendo,
      dueDate,
      tasa: Number(annualRatePercent),
      historical,
    });
    sumInterest = round2(sumInterest + interest);
    sumCapital = round2(sumCapital + capitalCuota);
    sumSeguro = round2(sumSeguro + seguroDesgravamen);
    sumFire = round2(sumFire + seguroIncendio);
    sumDiv = round2(sumDiv + dividendo);
    bal = round2(bal - capitalCuota);
    prev = dueDate;
  }

  return {
    rows,
    totals: {
      interest: sumInterest,
      capital: sumCapital,
      seguro: sumSeguro,
      incendio: sumFire,
      dividendos: sumDiv,
      cargaFinanciera: round2(sumDiv - capital0),
    },
  };
}
