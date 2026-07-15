/**
 * Datos demo modo invitado — EDITABLE.
 * Arrays/objetos en JS (no JSON). Ajustar aquí al añadir tutorials o demos.
 *
 * Accesos rápidos / surtido: ver `products` + `tierGroups` (galletas 0.35 u. · 3×$1).
 */

const today = new Date();
today.setHours(12, 0, 0, 0);

function isoDayOffset(daysAgo = 0) {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function orderDateTimeOffset(daysAgo = 0, h = 10, m = 15, s = 0) {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, s, 0);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const unitUn = { id: 1, name: "Unidad", abbreviation: "un" };
const unitGr = { id: 2, name: "Gramo", abbreviation: "gr" };

export const units = [unitUn, unitGr];

export const categories = [
  { id: 1, name: "Panadería", parentId: null },
  { id: 2, name: "Pastelería", parentId: null },
  { id: 3, name: "Bebidas", parentId: null },
  { id: 4, name: "Insumos", parentId: null },
];

/** Productos finales para caja / accesos rápidos (stock > 0). */
export const products = [
  // ── Panadería (surtido de pan) ──
  {
    id: 101,
    name: "Pan de dulce",
    sku: "PAN-DULCE",
    barcode: "770101",
    stock: 120,
    minStock: 20,
    price: 0.15,
    cost: 0.06,
    categoryId: 1,
    category: categories[0],
    ERP_inventory_category: categories[0],
    unit: unitUn,
    type: "final",
    isActive: true,
  },
  {
    id: 102,
    name: "Pan de sal",
    sku: "PAN-SAL",
    barcode: "770102",
    stock: 95,
    minStock: 15,
    price: 0.15,
    cost: 0.05,
    categoryId: 1,
    category: categories[0],
    ERP_inventory_category: categories[0],
    unit: unitUn,
    type: "final",
    isActive: true,
  },
  {
    id: 103,
    name: "Pan de chocolate",
    sku: "PAN-CHOCO",
    barcode: "770103",
    stock: 80,
    minStock: 10,
    price: 0.2,
    cost: 0.08,
    categoryId: 1,
    category: categories[0],
    ERP_inventory_category: categories[0],
    unit: unitUn,
    type: "final",
    isActive: true,
  },
  {
    id: 104,
    name: "Pan enrollado",
    sku: "PAN-ENR",
    barcode: "770104",
    stock: 60,
    minStock: 10,
    price: 0.15,
    cost: 0.06,
    categoryId: 1,
    category: categories[0],
    ERP_inventory_category: categories[0],
    unit: unitUn,
    type: "final",
    isActive: true,
  },
  // ── Galletas saladas: $0.35 c/u · 3 × $1.00 (tramos en grupo) ──
  {
    id: 201,
    name: "Galleta salada clásica",
    sku: "GAL-SAL-01",
    barcode: "770201",
    stock: 200,
    minStock: 30,
    price: 0.35,
    cost: 0.12,
    categoryId: 1,
    category: categories[0],
    ERP_inventory_category: categories[0],
    unit: unitUn,
    type: "final",
    isActive: true,
    packageTiers: [
      { qty: 1, totalPrice: 0.35 },
      { qty: 3, totalPrice: 1 },
    ],
  },
  {
    id: 202,
    name: "Galleta salada de ajo",
    sku: "GAL-SAL-02",
    barcode: "770202",
    stock: 180,
    minStock: 25,
    price: 0.35,
    cost: 0.12,
    categoryId: 1,
    category: categories[0],
    ERP_inventory_category: categories[0],
    unit: unitUn,
    type: "final",
    isActive: true,
  },
  {
    id: 203,
    name: "Galleta salada integral",
    sku: "GAL-SAL-03",
    barcode: "770203",
    stock: 150,
    minStock: 20,
    price: 0.35,
    cost: 0.13,
    categoryId: 1,
    category: categories[0],
    ERP_inventory_category: categories[0],
    unit: unitUn,
    type: "final",
    isActive: true,
  },
  {
    id: 204,
    name: "Galleta salada de queso",
    sku: "GAL-SAL-04",
    barcode: "770204",
    stock: 140,
    minStock: 20,
    price: 0.35,
    cost: 0.14,
    categoryId: 1,
    category: categories[0],
    ERP_inventory_category: categories[0],
    unit: unitUn,
    type: "final",
    isActive: true,
  },
  // ── Otros finales ──
  {
    id: 301,
    name: "Dona de chocolate",
    sku: "DONA-CHOCO",
    barcode: "770301",
    stock: 40,
    minStock: 8,
    price: 0.35,
    cost: 0.15,
    categoryId: 2,
    category: categories[1],
    ERP_inventory_category: categories[1],
    unit: unitUn,
    type: "final",
    isActive: true,
  },
  {
    id: 302,
    name: "Café molido 250g",
    sku: "CAF-250",
    barcode: "770302",
    stock: 25,
    minStock: 5,
    price: 3.5,
    cost: 2.1,
    categoryId: 3,
    category: categories[2],
    ERP_inventory_category: categories[2],
    unit: unitUn,
    type: "final",
    isActive: true,
  },
  // Insumo (alerta inventario)
  {
    id: 401,
    name: "Harina especial",
    sku: "INS-HARINA",
    stock: 0,
    minStock: 10,
    price: 1.2,
    cost: 0.9,
    categoryId: 4,
    category: categories[3],
    unit: unitGr,
    type: "raw",
    isActive: true,
  },
  {
    id: 402,
    name: "Azúcar refinada",
    sku: "INS-AZUCAR",
    stock: 4,
    minStock: 12,
    price: 0.85,
    cost: 0.6,
    categoryId: 4,
    category: categories[3],
    unit: unitGr,
    type: "raw",
    isActive: true,
  },
];

/**
 * Grupos de tramos (canasta surtido en Accesos rápidos).
 * productIds + packageTiers { qty, totalPrice }.
 */
export const tierGroups = [
  {
    id: 1,
    name: "Pan surtido",
    description: "Mezcla panes en canasta con precio por tramo",
    categoryId: 1,
    category: categories[0],
    isActive: true,
    position: 1,
    productIds: [101, 102, 103, 104],
    packageTiers: [
      { qty: 1, totalPrice: 0.15 },
      { qty: 10, totalPrice: 1.4 },
      { qty: 20, totalPrice: 2.6 },
    ],
  },
  {
    id: 2,
    name: "Galletas saladas surtido",
    description: "Unidad $0.35 · tres por $1.00 (puedes mezclar sabores)",
    categoryId: 1,
    category: categories[0],
    isActive: true,
    position: 2,
    productIds: [201, 202, 203, 204],
    packageTiers: [
      { qty: 1, totalPrice: 0.35 },
      { qty: 3, totalPrice: 1 },
    ],
  },
];

export const customers = [
  {
    id: 1,
    name: "Consumidor Final",
    phone: "",
    email: "",
    address: "",
    isActive: true,
    isConsumidorFinal: true,
    identType: "07",
    pendingAmount: 0,
  },
  {
    id: 2,
    name: "Distribuidora Andina",
    phone: "0980001111",
    email: "cliente2@demo.ec",
    address: "Calle Demo 2",
    isActive: true,
    isConsumidorFinal: false,
    pendingAmount: 18.5,
  },
  {
    id: 3,
    name: "Café Central",
    phone: "0980002222",
    email: "cliente3@demo.ec",
    address: "Calle Demo 3",
    isActive: true,
    isConsumidorFinal: false,
    pendingAmount: 0,
  },
];

function makeOrderItem(id, productId, qty, price, { paid = true, delivered = true } = {}) {
  const p = products.find((x) => x.id === productId) || { id: productId, name: "Producto" };
  const paidAt = paid ? orderDateTimeOffset(0, 9, 30, 0) : null;
  const deliveredAt = delivered ? orderDateTimeOffset(0, 9, 31, 0) : null;
  return {
    id,
    productId,
    product: { id: p.id, name: p.name },
    ERP_inventory_product: { id: p.id, name: p.name },
    name: p.name,
    quantity: qty,
    price,
    total: Number((qty * price).toFixed(2)),
    paid,
    delivered,
    paidAt,
    deliveredAt,
    damagedQty: 0,
    giftQty: 0,
    soldQty: qty,
  };
}

export const orders = [
  {
    id: 11,
    customerId: 2,
    customer: customers[1],
    ERP_customer: customers[1],
    status: "pendiente",
    total: 21,
    paid: 0,
    paidAmount: 0,
    pending: 21,
    date: orderDateTimeOffset(1, 11, 20, 0),
    createdAt: new Date(today.getTime() - 86400000).toISOString(),
    paymentMethod: null,
    documentType: "documento",
    items: [makeOrderItem(1101, 101, 40, 0.15, { paid: false, delivered: false }), makeOrderItem(1102, 201, 30, 0.35, { paid: false, delivered: false })],
    ERP_order_items: null,
  },
  {
    id: 12,
    customerId: 3,
    customer: customers[2],
    ERP_customer: customers[2],
    status: "pagado",
    total: 3,
    paid: 3,
    paidAmount: 3,
    pending: 0,
    date: orderDateTimeOffset(0, 10, 5, 0),
    createdAt: today.toISOString(),
    paymentMethod: "efectivo",
    documentType: "documento",
    items: [makeOrderItem(1103, 201, 3, 0.35)],
    ERP_order_items: null,
  },
  {
    id: 13,
    customerId: 1,
    customer: customers[0],
    ERP_customer: customers[0],
    status: "pagado",
    total: 1.5,
    paid: 1.5,
    paidAmount: 1.5,
    pending: 0,
    date: orderDateTimeOffset(0, 14, 0, 0),
    createdAt: today.toISOString(),
    paymentMethod: "efectivo",
    documentType: "documento",
    items: [makeOrderItem(1104, 102, 10, 0.15)],
    ERP_order_items: null,
  },
].map((o) => ({
  ...o,
  ERP_order_items: o.items,
}));

export const incomes = [
  { id: 1, date: isoDayOffset(0), amount: 185.5, category: "Venta", concept: "Ventas POS", status: "confirmed", counterpartyName: "Caja" },
  { id: 2, date: isoDayOffset(1), amount: 210.0, category: "Venta", concept: "Ventas del día", status: "confirmed", counterpartyName: "Caja" },
  { id: 3, date: isoDayOffset(2), amount: 95.2, category: "Caja / POS", concept: "Cobros", status: "confirmed", counterpartyName: "Caja" },
  { id: 4, date: isoDayOffset(3), amount: 160.0, category: "Venta", concept: "Ventas", status: "confirmed", counterpartyName: "Caja" },
  { id: 5, date: isoDayOffset(4), amount: 72.0, category: "Cobros clientes", concept: "Abonos", status: "confirmed", counterpartyName: "Distribuidora Andina" },
  { id: 6, date: isoDayOffset(5), amount: 140.0, category: "Venta", concept: "Ventas", status: "confirmed", counterpartyName: "Caja" },
  { id: 7, date: isoDayOffset(6), amount: 88.0, category: "Venta", concept: "Ventas", status: "confirmed", counterpartyName: "Caja" },
];

export const expenses = [
  { id: 1, date: isoDayOffset(0), amount: 45.0, category: "Compras", concept: "Harina", status: "confirmed", counterpartyName: "Harinas del Valle" },
  { id: 2, date: isoDayOffset(1), amount: 220.0, category: "Compras", concept: "Insumos varios", status: "confirmed", counterpartyName: "Insumos Costa" },
  { id: 3, date: isoDayOffset(2), amount: 120.0, category: "Pago de servicios", concept: "Luz", status: "confirmed", counterpartyName: "CNEL" },
  { id: 4, date: isoDayOffset(3), amount: 40.0, category: "Gastos operativos", concept: "Gas", status: "confirmed", counterpartyName: "Proveedor gas" },
  { id: 5, date: isoDayOffset(4), amount: 55.0, category: "Otro", concept: "Empaques", status: "confirmed", counterpartyName: "Empaques Guayas" },
  { id: 6, date: isoDayOffset(5), amount: 30.0, category: "Honorarios", concept: "Reparación", status: "confirmed", counterpartyName: "Técnico" },
];

export const movements = [
  { id: 1, productId: 101, product: { id: 101, name: "Pan de dulce" }, type: "out", quantity: 40, date: isoDayOffset(0), note: "Venta", price: 0.15 },
  { id: 2, productId: 201, product: { id: 201, name: "Galleta salada clásica" }, type: "out", quantity: 12, date: isoDayOffset(0), note: "Venta", price: 0.35 },
];

export const posSales = [
  {
    id: 501,
    total: 1.05,
    createdAt: today.toISOString(),
    date: orderDateTimeOffset(0, 9, 0, 0),
    storeId: 1,
    itemsCount: 3,
    paymentMethod: "efectivo",
    items: [{ productId: 201, name: "Galleta salada clásica", quantity: 3, price: 0.35, total: 1.05 }],
    documentType: "documento",
    documentNumber: "NV-DEMO-501",
  },
];

export const suppliers = [
  { id: 1, name: "Harinas del Valle", phone: "042000111", email: "harinas@demo.ec", address: "Bodega 1", isActive: true },
  { id: 2, name: "Lácteos Pacífico", phone: "042000222", email: "lacteos@demo.ec", address: "Bodega 2", isActive: true },
];

export const stores = [
  { id: 1, name: "Local Centro", address: "Av. Demo 1", phone: "042110000", isActive: true },
];

export const supplierOrders = [];

export const recipes = [
  { id: 1, productFinalId: 101, productRawId: 401, productComponentId: 401, quantity: 50 },
];

export const catalogEntries = [];
export const homeProducts = [];

export const financeSummary = { totalIncome: 12500, totalExpense: 4800, balance: 10150 };

export const dashboardHero = {
  summary: {
    totalIncome: 12500,
    totalExpense: 4800,
    balance: 10150,
    monthIncome: 3200,
    monthExpense: 1450,
    monthBalance: 1750,
    futureIncome: 21,
    monthIncomeWithPending: 3221,
    projectedBalance: 10171,
    recordMonthIncome: 4000,
    recordMonthBalance: 2100,
    marginPct: 54.7,
    vsRecordPct: -8.5,
  },
  obligations: {
    summary: { totalReceivable: 21, totalPayable: 450, openCount: 1 },
    topOpen: [
      { id: 1, kind: "loan", counterpartyName: "Distribuidora Andina", remaining: 21, dueDate: isoDayOffset(0) },
    ],
  },
};

const productsStock = {
  agotados: products
    .filter((p) => Number(p.stock) <= 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      minStock: p.minStock,
      type: p.type,
      isActive: true,
      unit: p.unit?.abbreviation || "u",
    })),
  porAgotarse: products
    .filter((p) => Number(p.stock) > 0 && Number(p.stock) <= Number(p.minStock))
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      minStock: p.minStock,
      type: p.type,
      isActive: true,
      unit: p.unit?.abbreviation || "u",
    })),
};

export const incomeExpenseBreakdown = {
  platforms: [
    { label: "Ingresos", value: 950.7 },
    { label: "Gastos", value: 510 },
  ],
  groups: {
    Ingresos: [
      { label: "Venta", value: 783.5 },
      { label: "Caja / POS", value: 95.2 },
      { label: "Cobros clientes", value: 72 },
    ],
    Gastos: [
      { label: "Compras", value: 265 },
      { label: "Pago de servicios", value: 120 },
      { label: "Gastos operativos", value: 40 },
      { label: "Otro", value: 55 },
      { label: "Honorarios", value: 30 },
    ],
  },
  meta: {
    totals: { income: 950.7, expense: 510, overall: 1460.7 },
    range: { startDate: isoDayOffset(90), endDate: isoDayOffset(0) },
  },
  incomeLines: incomes.map((i) => ({ ...i })),
  expenseLines: expenses.map((e) => ({ ...e, productName: e.concept })),
};

export const dashboardRest = {
  overView: [
    { status: "pending", label: "Pendientes", count: 1, amount: 21 },
    { status: "paid", label: "Pagados", count: 2, amount: 4.5 },
    { status: "delivered", label: "Entregados", count: 2, amount: 4.5 },
  ],
  incomeExpenseBreakdown,
  productsStock,
  recurring: {
    summary: {
      monthlyBurden: 1850,
      pendingThisMonth: 620,
      gapToCover: 0,
      dailySalesTarget: 85,
      daysLeftInMonth: 10,
      isProfitable: true,
      overdueCount: 0,
    },
    upcoming: [{ id: 1, name: "Arriendo local", amount: 450, dueDay: 5 }],
    overdue: [],
  },
};

export const financeWorkbench = {
  customers: customers.filter((c) => !c.isConsumidorFinal),
  orders: orders.map((o) => ({
    id: o.id,
    customerId: o.customerId,
    status: o.status,
    total: o.total,
    paid: o.paid,
    paidAmount: o.paidAmount,
    date: o.date,
    items: o.items,
  })),
  payments: [],
  groups: [],
};

export const customerSalesSummary = customers
  .filter((c) => !c.isConsumidorFinal)
  .map((c) => {
    const custOrders = orders.filter((o) => o.customerId === c.id);
    const totalAmount = custOrders.reduce((s, o) => s + o.total, 0);
    return {
      customerId: c.id,
      customer: { id: c.id, name: c.name, phone: c.phone, email: c.email },
      totalQuantity: custOrders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0),
      totalAmount,
      totalOrdersNoPaid: custOrders.filter((o) => o.pending > 0).length,
      totalAmountDeuda: custOrders.reduce((s, o) => s + o.pending, 0),
      revenuePending: custOrders.reduce((s, o) => s + o.pending, 0),
      lastOrderAt: custOrders[0]?.createdAt || null,
      orders: custOrders,
      productSummary: [],
    };
  });

export const overView = dashboardRest.overView;

export const obligationsWorkbench = {
  summary: dashboardHero.obligations.summary,
  obligations: dashboardHero.obligations.topOpen.map((o) => ({ ...o, status: "open" })),
};

export const supplierPayables = { suppliers, orders: [] };

export const expensesForChart = expenses.map((e, i) => ({
  date: e.date,
  referenceId: 200 + i,
  productName: e.concept,
  amount: e.amount,
}));

export const genericsWorkbench = { generics: [], unlinkedProducts: [] };

export const activeShift = {
  id: 1,
  status: "open",
  openedAt: today.toISOString(),
  openingCashTotal: 50,
  expectedCashTotal: 185.5,
  storeId: 1,
  store: stores[0],
  establishmentCode: "001",
  emissionPointCode: "001",
  orderCount: 8,
  user: { id: 0, firstName: "Invitado", firstLastName: "Raptor", username: "invitado" },
  sales: {
    salesCash: 135.5,
    salesTransfer: 28,
    salesCard: 12,
    salesTotal: 175.5,
  },
  cashMovements: {
    cashOut: 12,
    cashIn: 0,
    items: [
      {
        id: 1,
        direction: "out",
        category: "gasto_operativo",
        concept: "Papel envoltorio",
        amount: 5,
        createdAt: today.toISOString(),
      },
      {
        id: 2,
        direction: "out",
        category: "compra_mercancia",
        concept: "Azúcar emergencia",
        amount: 7,
        createdAt: today.toISOString(),
      },
    ],
  },
  movements: [],
  salesTotal: 175.5,
};

export const shifts = [
  activeShift,
  {
    id: 2,
    status: "closed",
    openedAt: new Date(today.getTime() - 86400000).toISOString(),
    closedAt: new Date(today.getTime() - 40000000).toISOString(),
    openingCashTotal: 40,
    closingCashTotal: 120,
  },
];

export const shiftWeeklyReport = { days: [], totals: { sales: 800, expenses: 200 } };
export const shiftDailyReport = { date: isoDayOffset(0), sales: 185.5, expenses: 45 };

export const notifications = [
  {
    id: 1,
    title: "Modo invitado",
    message: "Datos demo editables en mocks/guest/guestSeed.js",
    read: false,
    createdAt: today.toISOString(),
  },
];

export const users = [
  { id: 0, firstName: "Invitado", secondName: "", firstLastName: "Raptor", secondLastName: "", username: "invitado" },
];
export const accounts = [{ id: 1, username: "invitado", userId: 0, isActive: true }];
export const roles = [
  { id: 1, name: "Administrador" },
  { id: 2, name: "Empleado" },
];

export const panelStats = { users: 1, orders: orders.length, products: products.length };
export const sriSettings = { readyForInvoicing: false, environment: "pruebas", enabled: false };
export const profile = {
  id: 0,
  firstName: "Invitado",
  firstLastName: "Raptor",
  username: "invitado",
  email: "invitado@demo.ec",
};

export const taskPlans = [];
export const taskAssignees = [];
export const myTaskItems = [];
export const electronicInvoices = [];
export const publicidadCampaigns = [];
export const publicidadDevices = [];
export const allTables = {};

export const dayDetailTemplate = {
  orders: orders.slice(0, 2).map((o) => ({
    id: o.id,
    customer: o.customer.name,
    total: o.total,
    status: o.status,
    items: o.items.map((it) => ({
      id: it.id,
      qty: it.quantity,
      price: it.price,
      subtotal: it.total,
      paidAt: it.paidAt,
      deliveredAt: it.deliveredAt,
    })),
  })),
  posSales: posSales.map((p) => ({ id: p.id, total: p.total, customer: "Consumidor final", items: p.items })),
  incomes: incomes.slice(0, 2),
  abonos: [],
  directPayments: [],
  expenses: expenses.slice(0, 2).map((e) => ({ id: e.id, concept: e.concept, amount: e.amount })),
  totals: {
    ordersAmount: 24.5,
    ordersCount: 2,
    posSalesAmount: 1.05,
    posSalesCount: 1,
    posIncomeAmount: 1.05,
    posIncomeCount: 1,
    collectedAmount: 4.5,
    expensesAmount: 45,
  },
};

export const periodDetailTemplate = { ...dayDetailTemplate };

const guestSeed = {
  meta: {
    source: "guestSeed.js",
    note: "Datos demo editables (arrays JS). Fuentes de tutoriales / Accesos rápidos.",
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    generatedAt: today.toISOString(),
  },
  units,
  categories,
  products,
  tierGroups,
  customers,
  orders,
  incomes,
  expenses,
  movements,
  posSales,
  suppliers,
  stores,
  supplierOrders,
  recipes,
  catalogEntries,
  homeProducts,
  financeSummary,
  dashboardHero,
  dashboardRest,
  financeWorkbench,
  customerSalesSummary,
  incomeExpenseBreakdown,
  overView,
  obligationsWorkbench,
  supplierPayables,
  expensesForChart,
  genericsWorkbench,
  activeShift,
  shifts,
  shiftWeeklyReport,
  shiftDailyReport,
  notifications,
  users,
  accounts,
  roles,
  panelStats,
  sriSettings,
  profile,
  taskPlans,
  taskAssignees,
  myTaskItems,
  electronicInvoices,
  publicidadCampaigns,
  publicidadDevices,
  allTables,
  dayDetailTemplate,
  periodDetailTemplate,
};

export default guestSeed;
