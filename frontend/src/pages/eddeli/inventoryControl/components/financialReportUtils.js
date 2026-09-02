export const EMPLOYEE_EXPENSE_CATEGORY = "Pago Empleados";
export const INVENTORY_PURCHASE_CATEGORY = "Compras";
export const SERVICE_EXPENSE_CATEGORY = "Pago de servicios";

export const DEFAULT_REPORT_FILTERS = {
  excludeEmployeePayments: false,
  excludeInventoryPurchases: false,
  excludeOrders: false,
  excludeCustomerIds: [],
  includeStoreIds: [],
  includeStoreInventory: true,
};

export function formatReportPeriodLabel(dateFilters = {}) {
  const { startDate, endDate } = dateFilters;
  if (!startDate && !endDate) return "Todo el historial";
  if (startDate && endDate) return `${startDate} → ${endDate}`;
  if (startDate) return `Desde ${startDate}`;
  return `Hasta ${endDate}`;
}

function round2(n) {
  return Number(Number(n || 0).toFixed(2));
}

function groupByCategory(lines = []) {
  const map = new Map();
  for (const line of lines) {
    const key = line.category || "Sin categoría";
    map.set(key, round2((map.get(key) || 0) + Number(line.amount || 0)));
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function sumByCategory(lines = [], category) {
  return round2(
    lines
      .filter((line) => line.category === category)
      .reduce((sum, line) => sum + Number(line.amount || 0), 0),
  );
}

function shouldExcludeIncome(line, filters, excludedCustomerNames) {
  if (filters.excludeOrders && line.isOrderIncome) return true;

  if (filters.includeStoreIds?.length) {
    const storeId = Number(line.storeId);
    if (!storeId || !filters.includeStoreIds.includes(storeId)) {
      return true;
    }
  }

  if (!filters.excludeCustomerIds?.length) return false;

  const customerId = Number(line.customerId);
  if (customerId && filters.excludeCustomerIds.includes(customerId)) return true;

  const name = String(line.customerName || line.counterpartyName || "").trim().toLowerCase();
  if (!name) return false;
  return excludedCustomerNames.some((n) => name.includes(n) || n.includes(name));
}

function shouldExcludeExpense(line, filters) {
  if (filters.excludeEmployeePayments && line.category === EMPLOYEE_EXPENSE_CATEGORY) {
    return true;
  }
  if (filters.excludeInventoryPurchases && line.category === INVENTORY_PURCHASE_CATEGORY) {
    return true;
  }
  return false;
}

export function buildFilteredFinancialReport({
  incomeLines = [],
  expenseLines = [],
  filters = DEFAULT_REPORT_FILTERS,
  customers = [],
}) {
  const excludedCustomerNames = (filters.excludeCustomerIds || [])
    .map((id) => {
      const customer = customers.find((c) => Number(c.id) === Number(id));
      return String(customer?.name || "").trim().toLowerCase();
    })
    .filter(Boolean);

  const filteredIncome = incomeLines.filter(
    (line) => !shouldExcludeIncome(line, filters, excludedCustomerNames),
  );
  const filteredExpense = expenseLines.filter(
    (line) => !shouldExcludeExpense(line, filters),
  );

  const totalIncome = round2(
    filteredIncome.reduce((sum, line) => sum + Number(line.amount || 0), 0),
  );
  const totalExpense = round2(
    filteredExpense.reduce((sum, line) => sum + Number(line.amount || 0), 0),
  );
  const balance = round2(totalIncome - totalExpense);
  const marginPct = totalIncome > 0 ? round2((balance / totalIncome) * 100) : 0;

  const purchaseExpense = sumByCategory(expenseLines, INVENTORY_PURCHASE_CATEGORY);
  const employeeExpense = sumByCategory(expenseLines, EMPLOYEE_EXPENSE_CATEGORY);
  const serviceExpense = sumByCategory(expenseLines, SERVICE_EXPENSE_CATEGORY);
  const operationalExpense = round2(
    filteredExpense.reduce((sum, line) => {
      if (line.category === INVENTORY_PURCHASE_CATEGORY) return sum;
      return sum + Number(line.amount || 0);
    }, 0),
  );

  const excludedIncomeCount = incomeLines.length - filteredIncome.length;
  const excludedExpenseCount = expenseLines.length - filteredExpense.length;

  return {
    totalIncome,
    totalExpense,
    balance,
    marginPct,
    incomeLines: filteredIncome,
    expenseLines: filteredExpense,
    expenseBreakdown: {
      purchases: purchaseExpense,
      employee: employeeExpense,
      services: serviceExpense,
      operational: operationalExpense,
    },
    groups: {
      Ingresos: groupByCategory(filteredIncome),
      Gastos: groupByCategory(filteredExpense),
    },
    excludedIncomeCount,
    excludedExpenseCount,
    hasActiveFilters:
      filters.excludeEmployeePayments ||
      filters.excludeInventoryPurchases ||
      filters.excludeOrders ||
      (filters.excludeCustomerIds?.length ?? 0) > 0 ||
      (filters.includeStoreIds?.length ?? 0) > 0 ||
      filters.includeStoreInventory === false,
  };
}

/**
 * Métricas de rentabilidad alineadas con el análisis del negocio:
 * caja, devengado (+ por cobrar), operativo (sin compras) y posición con inventario.
 */
export function buildProfitabilityReport({
  filteredReport,
  profitabilityContext = {},
  filters = DEFAULT_REPORT_FILTERS,
  obligations = {},
}) {
  const cashIncome = round2(filteredReport.totalIncome);
  const cashExpense = round2(filteredReport.totalExpense);
  const cashBalance = round2(filteredReport.balance);

  const receivable = round2(profitabilityContext?.receivables?.total ?? 0);
  const soldTotal = round2(profitabilityContext?.receivables?.soldTotal ?? 0);
  const collectedFromOrders = round2(
    profitabilityContext?.receivables?.collectedTotal ?? 0,
  );

  const purchases = filteredReport.expenseBreakdown?.purchases ?? 0;
  const employeePay = filteredReport.expenseBreakdown?.employee ?? 0;
  const servicePay = filteredReport.expenseBreakdown?.service ?? 0;

  const operationalExpense = filters.excludeInventoryPurchases
    ? cashExpense
    : round2(Math.max(0, cashExpense - purchases));

  const accruedIncome = round2(cashIncome + receivable);
  const balanceWithReceivable = round2(cashBalance + receivable);
  const operationalProfit = round2(accruedIncome - operationalExpense);
  const operationalMarginPct =
    accruedIncome > 0 ? round2((operationalProfit / accruedIncome) * 100) : 0;

  const inventory = profitabilityContext?.inventory ?? {};
  const inventoryValue = filters.includeStoreInventory
    ? round2(inventory.valueAtCost ?? 0)
    : 0;
  const inventorySaleValue = filters.includeStoreInventory
    ? round2(inventory.valueAtSale ?? 0)
    : 0;

  const loansReceivable = round2(obligations.totalReceivable ?? 0);
  const debtsPayable = round2(obligations.totalPayable ?? 0);

  const businessPosition = round2(
    balanceWithReceivable + inventoryValue + loansReceivable - debtsPayable,
  );

  return {
    cashIncome,
    cashExpense,
    cashBalance,
    receivable,
    soldTotal,
    collectedFromOrders,
    accruedIncome,
    balanceWithReceivable,
    purchases,
    employeePay,
    servicePay,
    operationalExpense,
    operationalProfit,
    operationalMarginPct,
    inventoryValue,
    inventorySaleValue,
    inventoryProductCount: inventory.productCount ?? 0,
    inventoryUnits: inventory.totalUnits ?? 0,
    topReceivableCustomers: profitabilityContext?.receivables?.byCustomer ?? [],
    topInventoryProducts: filters.includeStoreInventory ? inventory.topProducts ?? [] : [],
    storeNames: (inventory.stores ?? []).map((s) => s.name).join(", "),
    loansReceivable,
    debtsPayable,
    businessPosition,
    includeStoreInventory: filters.includeStoreInventory !== false,
  };
}

export function describeActiveReportFilters(filters = {}, customers = [], stores = []) {
  const parts = [];
  if (filters.excludeEmployeePayments) parts.push("Sin pagos de empleados");
  if (filters.excludeInventoryPurchases) parts.push("Sin compras a proveedores");
  if (filters.excludeOrders) parts.push("Sin ingresos de pedidos/cobranzas");
  if (filters.includeStoreInventory === false) parts.push("Sin inventario del local");
  if (filters.includeStoreIds?.length) {
    const names = filters.includeStoreIds
      .map((id) => {
        const store = stores.find((s) => Number(s.id) === Number(id));
        return store
          ? `${store.name} (${store.locationKind || "local"})`
          : `#${id}`;
      })
      .filter(Boolean);
    if (names.length) parts.push(`Solo locales: ${names.join(", ")}`);
  }
  if (filters.excludeCustomerIds?.length) {
    const names = filters.excludeCustomerIds
      .map((id) => customers.find((c) => Number(c.id) === Number(id))?.name)
      .filter(Boolean);
    if (names.length) parts.push(`Sin clientes: ${names.join(", ")}`);
  }
  return parts;
}
