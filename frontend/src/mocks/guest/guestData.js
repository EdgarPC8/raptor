/**
 * Datos demo modo invitado.
 * Fuente editable: `guestSeed.js` (arrays/objetos JS).
 */
import guestSeed from "./guestSeed.js";

const y = guestSeed.meta?.year ?? new Date().getFullYear();
const m = String(guestSeed.meta?.month ?? new Date().getMonth() + 1).padStart(2, "0");

function money(n) {
  return Number(Number(n || 0).toFixed(2));
}

function monthMetrics(scale = 1) {
  return {
    ordersAmount: Number((4200 * scale).toFixed(2)),
    ordersCount: Math.round(18 * scale),
    posSalesAmount: Number((6800 * scale).toFixed(2)),
    posSalesCount: Math.round(120 * scale),
    posIncomeAmount: Number((6400 * scale).toFixed(2)),
    posIncomeCount: Math.round(110 * scale),
    collectedAmount: Number((2100 * scale).toFixed(2)),
    expensesAmount: Number((3900 * scale).toFixed(2)),
  };
}

function isoDay(d) {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function parseGuestOrderDate(o) {
  const raw = o?.date || o?.createdAt;
  if (!raw) return null;
  if (typeof raw === "string" && raw.includes("/")) {
    const [datePart] = raw.split(" ");
    const [dd, mm, yy] = datePart.split("/").map(Number);
    if (!dd || !mm || !yy) return null;
    return new Date(yy, mm - 1, dd);
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Normaliza pedidos al shape Sequelize que usan las tablas UI. */
function normalizeOrder(o) {
  if (!o) return o;
  const items = (o.ERP_order_items || o.items || []).map((it) => ({
    ...it,
    ERP_inventory_product:
      it.ERP_inventory_product ||
      it.product ||
      (it.name ? { id: it.productId, name: it.name } : { name: "Producto" }),
  }));
  const customer = o.ERP_customer || o.customer || { id: o.customerId, name: "Cliente" };
  return {
    ...o,
    customer,
    ERP_customer: typeof customer === "string" ? { name: customer } : customer,
    items,
    ERP_order_items: items,
  };
}

function weekdayLabel(d) {
  return d.toLocaleDateString("es-EC", { weekday: "short", day: "numeric" });
}

function buildMirrorBuckets(granularity, start, end, incomeByDay, expenseByDay) {
  const buckets = [];
  const cur = new Date(start);
  cur.setHours(12, 0, 0, 0);
  const endD = new Date(end);
  endD.setHours(12, 0, 0, 0);

  if (granularity === "month") {
    const cursor = new Date(cur.getFullYear(), cur.getMonth(), 1);
    while (cursor <= endD) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      let income = 0;
      let expense = 0;
      const dim = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= dim; d += 1) {
        const dk = `${key}-${String(d).padStart(2, "0")}`;
        income += incomeByDay.get(dk) || 0;
        expense += expenseByDay.get(dk) || 0;
      }
      buckets.push({
        key,
        label: cursor.toLocaleDateString("es-EC", { month: "short", year: "numeric" }),
        income,
        expense,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else if (granularity === "week") {
    const cursor = new Date(cur);
    const day = (cursor.getDay() + 6) % 7;
    cursor.setDate(cursor.getDate() - day);
    while (cursor <= endD) {
      const key = isoDay(cursor);
      let income = 0;
      let expense = 0;
      for (let i = 0; i < 7; i += 1) {
        const d = new Date(cursor);
        d.setDate(cursor.getDate() + i);
        const dk = isoDay(d);
        income += incomeByDay.get(dk) || 0;
        expense += expenseByDay.get(dk) || 0;
      }
      const weekEnd = new Date(cursor);
      weekEnd.setDate(cursor.getDate() + 6);
      buckets.push({
        key,
        label: `${cursor.getDate()}–${weekEnd.getDate()} ${weekEnd.toLocaleDateString("es-EC", { month: "short" })}`,
        income,
        expense,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
  } else {
    const cursor = new Date(cur);
    while (cursor <= endD) {
      const key = isoDay(cursor);
      buckets.push({
        key,
        label: weekdayLabel(cursor),
        income: incomeByDay.get(key) || 0,
        expense: expenseByDay.get(key) || 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return buckets.map((b) => {
    const income = money(b.income);
    const expense = money(b.expense);
    const expenseTotal = expense;
    const netBalance = money(income - expenseTotal);
    const marginPct = income > 0 ? money((netBalance / income) * 100) : 0;
    return {
      key: b.key,
      label: b.label,
      income,
      expense,
      merma: 0,
      expenseTotal,
      netBalance,
      marginPct,
    };
  });
}

function aggregateFinanceByDay(incomes = [], expenses = []) {
  const incomeByDay = new Map();
  const expenseByDay = new Map();
  for (const row of incomes) {
    const k = String(row.date || "").slice(0, 10);
    if (!k) continue;
    incomeByDay.set(k, money((incomeByDay.get(k) || 0) + Number(row.amount || 0)));
  }
  for (const row of expenses) {
    const k = String(row.date || "").slice(0, 10);
    if (!k) continue;
    expenseByDay.set(k, money((expenseByDay.get(k) || 0) + Number(row.amount || 0)));
  }
  return { incomeByDay, expenseByDay };
}

/** Serie diaria demo: varios días con gasto > ingreso (vela roja). */
function ensureDemoDailySeries(incomeByDay, expenseByDay, days = 40) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = isoDay(d);
    if (!incomeByDay.has(key) && !expenseByDay.has(key)) {
      const isLossDay = i % 4 === 1 || i % 7 === 3;
      const income = money(120 + (i % 6) * 45 + (i % 3) * 20);
      const expense = money(
        isLossDay ? income * (1.15 + (i % 3) * 0.12) : income * (0.45 + (i % 4) * 0.1),
      );
      incomeByDay.set(key, income);
      expenseByDay.set(key, expense);
    } else if (i % 5 === 2) {
      const inc = incomeByDay.get(key) || 80;
      expenseByDay.set(key, money(Math.max(expenseByDay.get(key) || 0, inc * 1.25)));
    }
  }
}

function buildCalendarDayDetail(ctx, dateKey) {
  const orders = (ctx.orders || [])
    .map(normalizeOrder)
    .filter((o) => {
      const d = parseGuestOrderDate(o);
      return d && isoDay(d) === dateKey;
    })
    .map((o) => ({
      id: o.id,
      customer: o.ERP_customer?.name || o.customer?.name || "Cliente",
      date: o.date,
      items: (o.ERP_order_items || []).map((it) => ({
        id: it.id,
        qty: Number(it.quantity || 0),
        price: Number(it.price || 0),
        subtotal: money(Number(it.quantity || 0) * Number(it.price || 0)),
        paidAt: it.paidAt || null,
        deliveredAt: it.deliveredAt || null,
      })),
      total: o.total,
      status: o.status,
    }));

  const posSales = (ctx.posSales || [])
    .filter((p) => {
      const d = new Date(p.createdAt || p.date);
      return !Number.isNaN(d.getTime()) && isoDay(d) === dateKey;
    })
    .map((p) => ({
      id: p.id,
      customer: "Consumidor final",
      total: p.total,
      items: (p.items || []).map((it, i) => ({
        id: it.id || i + 1,
        qty: Number(it.quantity || 0),
        price: Number(it.price || 0),
        subtotal: money(Number(it.quantity || 0) * Number(it.price || 0)),
      })),
      paymentMethod: p.paymentMethod || "efectivo",
      documentType: p.documentType || "nota_venta",
    }));

  const incomes = (ctx.incomes || [])
    .filter((i) => String(i.date || "").slice(0, 10) === dateKey)
    .map((i) => ({
      id: i.id,
      concept: i.concept,
      category: i.category,
      amount: i.amount,
      date: i.date,
    }));

  const expenses = (ctx.expenses || [])
    .filter((e) => String(e.date || "").slice(0, 10) === dateKey)
    .map((e) => ({
      id: e.id,
      concept: e.concept,
      category: e.category,
      productName: e.concept,
      amount: e.amount,
      date: e.date,
    }));

  const fallback = ctx.dayDetailTemplate || {};
  const useFallback = !orders.length && !posSales.length && !incomes.length && !expenses.length;

  if (useFallback) {
    return { date: dateKey, ...fallback };
  }

  const ordersAmount = money(orders.reduce((s, o) => s + Number(o.total || 0), 0));
  const posSalesAmount = money(posSales.reduce((s, p) => s + Number(p.total || 0), 0));
  const expensesAmount = money(expenses.reduce((s, e) => s + Number(e.amount || 0), 0));
  const collectedAmount = money(
    orders.reduce(
      (s, o) => s + (o.items || []).filter((it) => it.paidAt).reduce((a, it) => a + it.subtotal, 0),
      0,
    ),
  );

  return {
    date: dateKey,
    orders,
    posSales,
    incomes,
    abonos: [],
    directPayments: [],
    expenses,
    totals: {
      ordersAmount,
      ordersCount: orders.length,
      posSalesAmount,
      posSalesCount: posSales.length,
      posIncomeAmount: posSalesAmount,
      posIncomeCount: posSales.length,
      collectedAmount,
      expensesAmount,
      deliveredUnits: 0,
    },
    dailyBreakdown: {
      [dateKey]: {
        ordersAmount,
        ordersCount: orders.length,
        posSalesAmount,
        posSalesCount: posSales.length,
        posIncomeAmount: posSalesAmount,
        posIncomeCount: posSales.length,
        collectedAmount,
        expensesAmount,
      },
    },
  };
}

const guestData = {
  ...guestSeed,

  /** Resuelve payloads por clave (lo que usan los request). */
  get(key, params = {}) {
    switch (key) {
      case "dashboardHero":
        return this.dashboardHero;
      case "dashboardRest":
        return this.dashboardRest;
      case "dashboard":
        return { ...this.dashboardHero, ...this.dashboardRest };
      case "products":
        return this.products;
      case "categories":
        return this.categories;
      case "units":
        return this.units;
      case "customers":
        return this.customers;
      case "suppliers":
        return this.suppliers;
      case "stores":
        return this.stores;
      case "tierGroups":
        return this.tierGroups;
      case "incomes":
        return this.incomes;
      case "expensesList":
        return this.expenses;
      case "financeSummary":
        return this.financeSummary;
      case "orders":
        return (this.orders || []).map(normalizeOrder);
      case "supplierOrders":
        return this.supplierOrders;
      case "movements":
        return { data: this.movements, total: this.movements.length };
      case "activeShift":
        return this.activeShift;
      case "shifts":
        return this.shifts;
      case "shiftWeeklyReport":
        return this.shiftWeeklyReport;
      case "shiftDailyReport":
        return this.shiftDailyReport;
      case "obligationsWorkbench":
        return this.obligationsWorkbench;
      case "financeWorkbench":
        return this.financeWorkbench;
      case "customerSalesSummary":
        return this.customerSalesSummary;
      case "incomeExpenseBreakdown":
        return this.incomeExpenseBreakdown || this.dashboardRest?.incomeExpenseBreakdown;
      case "overView":
        return this.overView || this.dashboardRest?.overView;
      case "supplierPayables":
        return this.supplierPayables;
      case "catalogEntries":
        return this.catalogEntries;
      case "homeProducts":
        return this.homeProducts;
      case "recipes":
        return this.recipes;
      case "recipeByProduct": {
        const pid = params.productFinalId ?? this.products?.[0]?.id ?? null;
        const items = (this.recipes || []).filter((r) => r.productFinalId === pid);
        return { productFinalId: pid, items };
      }
      case "electronicInvoices":
        return this.electronicInvoices;
      case "publicidadCampaigns":
        return this.publicidadCampaigns;
      case "publicidadDevices":
        return this.publicidadDevices;
      case "allTables":
        return this.allTables;
      case "tableSummary":
        return this.meta?.tableSummary || [];
      case "genericsWorkbench":
        return this.genericsWorkbench;
      case "users":
        return this.users;
      case "accounts":
        return this.accounts;
      case "roles":
        return this.roles;
      case "panelStats":
        return this.panelStats;
      case "notifications":
        return this.notifications;
      case "unreadCount":
        return { count: (this.notifications || []).filter((n) => !n.read).length };
      case "taskPlans":
        return this.taskPlans;
      case "taskAssignees":
        return this.taskAssignees;
      case "myTaskItems":
        return this.myTaskItems;
      case "posSales":
        return this.posSales;
      case "sriSettings":
        return this.sriSettings;
      case "profile":
        return this.profile;
      case "expensesForChart":
        return this.expensesForChart;
      case "calendarYear": {
        const year = params.year ?? y;
        const months = {};
        for (let i = 1; i <= 12; i += 1) {
          const k = `${year}-${String(i).padStart(2, "0")}`;
          months[k] = monthMetrics(0.55 + (i % 5) * 0.12);
        }
        return { year, months };
      }
      case "calendarMonth": {
        const year = params.year ?? y;
        const month = params.month ?? Number(m);
        const days = {};
        const dim = new Date(year, month, 0).getDate();
        for (const o of (this.orders || []).map(normalizeOrder)) {
          const d = parseGuestOrderDate(o);
          if (!d || d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;
          const keyDate = isoDay(d);
          days[keyDate] = days[keyDate] || {
            ordersAmount: 0,
            ordersCount: 0,
            posSalesAmount: 0,
            posSalesCount: 0,
            posIncomeAmount: 0,
            posIncomeCount: 0,
            collectedAmount: 0,
            expensesAmount: 0,
          };
          days[keyDate].ordersAmount += Number(o.total || 0);
          days[keyDate].ordersCount += 1;
          days[keyDate].collectedAmount += Number(o.paid || 0);
        }
        for (const p of this.posSales || []) {
          const d = new Date(p.createdAt || p.date);
          if (Number.isNaN(d.getTime())) continue;
          if (d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;
          const keyDate = isoDay(d);
          days[keyDate] = days[keyDate] || {
            ordersAmount: 0,
            ordersCount: 0,
            posSalesAmount: 0,
            posSalesCount: 0,
            posIncomeAmount: 0,
            posIncomeCount: 0,
            collectedAmount: 0,
            expensesAmount: 0,
          };
          days[keyDate].posSalesAmount += Number(p.total || 0);
          days[keyDate].posSalesCount += 1;
          days[keyDate].posIncomeAmount += Number(p.total || 0);
          days[keyDate].posIncomeCount += 1;
        }
        for (const e of this.expenses || []) {
          const d = new Date(`${e.date}T12:00:00`);
          if (Number.isNaN(d.getTime())) continue;
          if (d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;
          const keyDate = e.date;
          days[keyDate] = days[keyDate] || {
            ordersAmount: 0,
            ordersCount: 0,
            posSalesAmount: 0,
            posSalesCount: 0,
            posIncomeAmount: 0,
            posIncomeCount: 0,
            collectedAmount: 0,
            expensesAmount: 0,
          };
          days[keyDate].expensesAmount += Number(e.amount || 0);
        }
        for (let d = 1; d <= dim; d += 1) {
          if (d % 4 !== 0) continue;
          const keyDate = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          if (days[keyDate]) continue;
          const loss = d % 8 === 0;
          days[keyDate] = {
            ordersAmount: 40 + (d % 5) * 10,
            ordersCount: 1,
            posSalesAmount: 80 + (d % 6) * 15,
            posSalesCount: 2 + (d % 3),
            posIncomeAmount: 80 + (d % 6) * 15,
            posIncomeCount: 2 + (d % 3),
            collectedAmount: 0,
            expensesAmount: loss ? 160 + (d % 4) * 20 : 20 + (d % 4) * 8,
          };
        }
        const totals = Object.values(days).reduce(
          (acc, day) => {
            acc.orders += day.ordersAmount;
            acc.posSales += day.posSalesAmount;
            acc.posIncome += day.posIncomeAmount;
            acc.collected += day.collectedAmount;
            acc.expenses += day.expensesAmount;
            return acc;
          },
          { orders: 0, posSales: 0, posIncome: 0, collected: 0, expenses: 0 },
        );
        return { days, totals };
      }
      case "calendarDay":
        return buildCalendarDayDetail(this, params.date || isoDay(new Date()));
      case "calendarPeriod": {
        const start = params.startDate;
        const end = params.endDate || start;
        if (!start) return { ...this.periodDetailTemplate };
        const dayKeys = [];
        const cursor = new Date(`${start}T12:00:00`);
        const endD = new Date(`${end}T12:00:00`);
        while (cursor <= endD) {
          dayKeys.push(isoDay(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }
        const parts = dayKeys.map((dk) => buildCalendarDayDetail(this, dk));
        const merge = (field) => parts.flatMap((p) => p[field] || []);
        const totals = parts.reduce(
          (acc, p) => {
            const t = p.totals || {};
            acc.ordersAmount += Number(t.ordersAmount || 0);
            acc.ordersCount += Number(t.ordersCount || 0);
            acc.posSalesAmount += Number(t.posSalesAmount || 0);
            acc.posSalesCount += Number(t.posSalesCount || 0);
            acc.posIncomeAmount += Number(t.posIncomeAmount || 0);
            acc.posIncomeCount += Number(t.posIncomeCount || 0);
            acc.collectedAmount += Number(t.collectedAmount || 0);
            acc.expensesAmount += Number(t.expensesAmount || 0);
            return acc;
          },
          {
            ordersAmount: 0,
            ordersCount: 0,
            posSalesAmount: 0,
            posSalesCount: 0,
            posIncomeAmount: 0,
            posIncomeCount: 0,
            collectedAmount: 0,
            expensesAmount: 0,
          },
        );
        Object.keys(totals).forEach((k) => {
          if (k.includes("Amount")) totals[k] = money(totals[k]);
        });
        return {
          startDate: start,
          endDate: end,
          orders: merge("orders"),
          posSales: merge("posSales"),
          incomes: merge("incomes"),
          abonos: merge("abonos"),
          directPayments: merge("directPayments"),
          expenses: merge("expenses"),
          totals,
        };
      }
      case "cashFlowMirror": {
        const granularity = params.granularity || "day";
        const { incomeByDay, expenseByDay } = aggregateFinanceByDay(this.incomes, this.expenses);
        ensureDemoDailySeries(incomeByDay, expenseByDay, 45);

        const now = new Date();
        let start;
        let end;
        let periodLabel;
        if (params.startDate && params.endDate) {
          start = new Date(`${params.startDate}T00:00:00`);
          end = new Date(`${params.endDate}T23:59:59`);
          periodLabel = `${params.startDate} → ${params.endDate}`;
        } else if (granularity === "week") {
          end = new Date(now);
          start = new Date(now);
          start.setDate(start.getDate() - 7 * 7);
          periodLabel = "Últimas 8 semanas";
        } else if (granularity === "month") {
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
          periodLabel = "Últimos 6 meses";
        } else {
          const day = (now.getDay() + 6) % 7;
          start = new Date(now);
          start.setDate(now.getDate() - day);
          end = new Date(start);
          end.setDate(start.getDate() + 6);
          periodLabel = "Semana actual (día a día)";
        }

        const buckets = buildMirrorBuckets(granularity, start, end, incomeByDay, expenseByDay);
        const totals = buckets.reduce(
          (acc, b) => {
            acc.income += b.income;
            acc.expense += b.expense;
            acc.expenseTotal += b.expenseTotal;
            return acc;
          },
          { income: 0, expense: 0, expenseTotal: 0, merma: 0 },
        );
        totals.income = money(totals.income);
        totals.expense = money(totals.expense);
        totals.expenseTotal = money(totals.expenseTotal);
        totals.netBalance = money(totals.income - totals.expenseTotal);
        totals.marginPct = totals.income > 0 ? money((totals.netBalance / totals.income) * 100) : 0;

        return {
          granularity,
          periodLabel,
          startDate: isoDay(start),
          endDate: isoDay(end),
          buckets,
          totals,
        };
      }
      case "cashFlowCandles": {
        const granularity = params.granularity || "day";
        const limit = Math.min(50, Math.max(5, Number(params.limit) || 25));
        const offset = Math.max(0, Number(params.offset) || 0);
        const { incomeByDay, expenseByDay } = aggregateFinanceByDay(this.incomes, this.expenses);
        ensureDemoDailySeries(incomeByDay, expenseByDay, 60);

        const allKeys = [...new Set([...incomeByDay.keys(), ...expenseByDay.keys()])].sort();
        if (!allKeys.length) {
          return {
            granularity,
            candles: [],
            openingBalance: 0,
            currentBalance: 0,
            totalCandles: 0,
            hasMore: false,
            limit,
            offset,
          };
        }

        let seriesKeys = allKeys;
        let weekMonthMeta = null;
        if (granularity === "week" || granularity === "month") {
          const map = new Map();
          for (const k of allKeys) {
            const d = new Date(`${k}T12:00:00`);
            let key;
            let label;
            if (granularity === "week") {
              const dow = (d.getDay() + 6) % 7;
              const start = new Date(d);
              start.setDate(d.getDate() - dow);
              key = isoDay(start);
              const end = new Date(start);
              end.setDate(start.getDate() + 6);
              label = `${start.getDate()}–${end.getDate()} ${end.toLocaleDateString("es-EC", { month: "short" })}`;
            } else {
              key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              label = d.toLocaleDateString("es-EC", { month: "short", year: "numeric" });
            }
            if (!map.has(key)) map.set(key, { key, label, income: 0, expense: 0 });
            const row = map.get(key);
            row.income += incomeByDay.get(k) || 0;
            row.expense += expenseByDay.get(k) || 0;
          }
          seriesKeys = [...map.keys()].sort();
          weekMonthMeta = map;
        }

        const totalCandles = seriesKeys.length;
        const sliceEnd = Math.max(0, totalCandles - offset);
        const sliceStart = Math.max(0, sliceEnd - limit);
        const windowKeys = seriesKeys.slice(sliceStart, sliceEnd);

        let balance = money(Number(this.financeSummary?.balance || 10000) - 3500);
        for (const k of seriesKeys.slice(0, sliceStart)) {
          if (granularity === "day") {
            balance = money(balance + (incomeByDay.get(k) || 0) - (expenseByDay.get(k) || 0));
          } else {
            const row = weekMonthMeta.get(k);
            balance = money(balance + (row?.income || 0) - (row?.expense || 0));
          }
        }
        const openingBalance = balance;
        const candles = [];
        for (const k of windowKeys) {
          const open = balance;
          let income;
          let expense;
          let label;
          if (granularity === "day") {
            income = incomeByDay.get(k) || 0;
            expense = expenseByDay.get(k) || 0;
            const d = new Date(`${k}T12:00:00`);
            label = d.toLocaleDateString("es-EC", { weekday: "short", day: "numeric", month: "short" });
          } else {
            const row = weekMonthMeta.get(k);
            income = row?.income || 0;
            expense = row?.expense || 0;
            label = row?.label || k;
          }
          const net = money(income - expense);
          const close = money(open + net);
          const high = money(Math.max(open, close) + Math.abs(net) * 0.08);
          const low = money(Math.min(open, close) - Math.abs(net) * 0.08);
          candles.push({
            key: k,
            label,
            time: granularity === "month" ? `${k}-01` : k,
            open,
            high,
            low,
            close,
            overdraft: low < 0,
            bullish: close >= open,
          });
          balance = close;
        }

        return {
          granularity,
          candles,
          openingBalance,
          currentBalance: balance,
          totalCandles,
          hasMore: sliceStart > 0,
          limit,
          offset,
        };
      }
      case "productSeries": {
        const period = params.period || "month";
        const top = (this.products || [])
          .filter((p) => p.type === "final")
          .slice(0, 3)
          .map((p, index) => ({
            id: p.id,
            name: p.name,
            rank: index + 1,
            totalQty: 100 + index * 40,
            totalAmt: Number(((p.price || 1) * (100 + index * 40)).toFixed(2)),
          }));
        const datasetQty = [];
        const datasetAmount = [];
        for (let i = 6; i >= 0; i -= 1) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const date = d.toISOString().slice(0, 10);
          const qtyPoint = { date };
          const amtPoint = { date };
          top.forEach((p, pi) => {
            const qty = 10 + pi * 5 + (6 - i) * 2;
            qtyPoint[String(p.id)] = qty;
            amtPoint[String(p.id)] = Number(
              (qty * (this.products.find((x) => x.id === p.id)?.price || 1)).toFixed(2),
            );
          });
          datasetQty.push(qtyPoint);
          datasetAmount.push(amtPoint);
        }
        const labels = { week: "Última semana", month: "Este mes", year: "Este año" };
        const sales = {
          period,
          periodLabel: labels[period] || labels.month,
          granularity: period === "year" ? "month" : "day",
          rankBand: 1,
          rankStart: 1,
          rankEnd: top.length,
          rankBandSize: 10,
          totalRanked: top.length,
          products: top,
          dataset: datasetQty,
          datasetAmount,
        };
        return {
          period,
          band: 1,
          rankStart: 1,
          rankEnd: top.length,
          rankBandSize: 10,
          totalRanked: top.length,
          totalBands: 1,
          periodLabel: sales.periodLabel,
          granularity: sales.granularity,
          sales,
        };
      }
      default:
        return null;
    }
  },
};

export default guestData;
