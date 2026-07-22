/**
 * Datos demo modo invitado — EDITABLE.
 * Arrays/objetos en JS (no JSON). Ajustar aquí al añadir tutorials o demos.
 *
 * Accesos rápidos / surtido: ver `products` + `tierGroups` (galletas 0.35 u. · 3×$1).
 * Imágenes demo: public/demo/productos/ → primaryImageUrl en modo invitado.
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

/** Fotos demo en public/demo/productos/ (modo invitado sin backend). */
const demoImg = (file) => `/demo/productos/${file}`;

function productRef(id) {
  const p = products.find((x) => x.id === id);
  return p
    ? {
        id: p.id,
        name: p.name,
        primaryImageUrl: p.primaryImageUrl,
        price: p.price,
        unit: p.unit,
      }
    : { id, name: "Producto" };
}

function makeMovement(id, productId, type, qty, opts = {}) {
  const p = productRef(productId);
  const daysAgo = opts.daysAgo ?? 0;
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(opts.h ?? 8, opts.m ?? 30, 0, 0);
  return {
    id,
    productId,
    product: { id: p.id, name: p.name },
    ERP_inventory_product: p,
    type,
    reason:
      opts.reason ||
      (type === "entrada"
        ? "ENTRADA_COMPRA"
        : type === "salida"
          ? "VENTA_POS"
          : type === "produccion"
            ? "PRODUCCION"
            : "AJUSTE_INVENTARIO"),
    quantity: qty,
    price: opts.price ?? p.price ?? null,
    date: isoDayOffset(daysAgo),
    createdAt: d.toISOString(),
    note: opts.note || "",
    description: opts.note || "",
  };
}

function makePosSale(id, items, opts = {}) {
  const total = Number(
    items.reduce((s, it) => s + it.quantity * it.price, 0).toFixed(2),
  );
  const daysAgo = opts.daysAgo ?? 0;
  const h = opts.h ?? 10;
  const m = opts.m ?? 15;
  return {
    id,
    total,
    createdAt: new Date(today.getTime() - daysAgo * 86400000).toISOString(),
    date: orderDateTimeOffset(daysAgo, h, m, 0),
    storeId: opts.storeId ?? 1,
    itemsCount: items.reduce((s, it) => s + it.quantity, 0),
    paymentMethod: opts.paymentMethod ?? "efectivo",
    items,
    documentType: opts.documentType ?? "nota_venta",
    documentNumber: opts.documentNumber ?? `NV-DEMO-${id}`,
    customerName: opts.customerName ?? "Consumidor final",
  };
}

export const units = [unitUn, unitGr];

export const categories = [
  { id: 1, name: "Panadería", parentId: null, isPublic: true },
  { id: 11, name: "Panes", parentId: 1, isPublic: true },
  { id: 12, name: "Galletas saladas", parentId: 1, isPublic: true },
  { id: 2, name: "Pastelería", parentId: null, isPublic: true },
  { id: 21, name: "Dona y muffins", parentId: 2, isPublic: true },
  { id: 3, name: "Bebidas", parentId: null, isPublic: true },
  { id: 4, name: "Insumos", parentId: null, isPublic: false },
  { id: 41, name: "Harinas y azúcares", parentId: 4, isPublic: false },
];

const catPanes = () => categories.find((c) => c.id === 11);
const catGalletas = () => categories.find((c) => c.id === 12);
const catDona = () => categories.find((c) => c.id === 21);
const catBebidas = () => categories.find((c) => c.id === 3);
const catInsumos = () => categories.find((c) => c.id === 41);

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
    categoryId: 11,
    category: catPanes(),
    ERP_inventory_category: catPanes(),
    unit: unitUn,
    type: "final",
    isActive: true,
    description: "Pan dulce tradicional, esponjoso y ligeramente azucarado. Ideal para desayuno o merienda.",
    primaryImageUrl: demoImg("pan-dulce.jpg"),
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
    categoryId: 11,
    category: catPanes(),
    ERP_inventory_category: catPanes(),
    unit: unitUn,
    type: "final",
    isActive: true,
    description: "Pan salado de miga firme, clásico de mostrador. Se vende por unidad.",
    primaryImageUrl: demoImg("pan-sal.jpg"),
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
    categoryId: 11,
    category: catPanes(),
    ERP_inventory_category: catPanes(),
    unit: unitUn,
    type: "final",
    isActive: true,
    description: "Pan dulce relleno de crema de chocolate. Muy pedido en horario escolar.",
    primaryImageUrl: demoImg("pan-chocolate.jpg"),
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
    categoryId: 11,
    category: catPanes(),
    ERP_inventory_category: catPanes(),
    unit: unitUn,
    type: "final",
    isActive: true,
    description: "Pan enrollado con canela y azúcar. Producción diaria en la madrugada.",
    primaryImageUrl: demoImg("pan-enrollado.jpg"),
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
    categoryId: 12,
    category: catGalletas(),
    ERP_inventory_category: catGalletas(),
    unit: unitUn,
    type: "final",
    isActive: true,
    description: "Galleta salada crujiente, sabor clásico. Promo 3 × $1.00 en mostrador.",
    packageTiers: [
      { qty: 1, totalPrice: 0.35 },
      { qty: 3, totalPrice: 1 },
    ],
    primaryImageUrl: demoImg("galleta-clasica.jpg"),
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
    categoryId: 12,
    category: catGalletas(),
    ERP_inventory_category: catGalletas(),
    unit: unitUn,
    type: "final",
    isActive: true,
    primaryImageUrl: demoImg("galleta-ajo.jpg"),
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
    categoryId: 12,
    category: catGalletas(),
    ERP_inventory_category: catGalletas(),
    unit: unitUn,
    type: "final",
    isActive: true,
    primaryImageUrl: demoImg("galleta-integral.jpg"),
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
    categoryId: 12,
    category: catGalletas(),
    ERP_inventory_category: catGalletas(),
    unit: unitUn,
    type: "final",
    isActive: true,
    primaryImageUrl: demoImg("galleta-queso.jpg"),
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
    categoryId: 21,
    category: catDona(),
    ERP_inventory_category: catDona(),
    unit: unitUn,
    type: "final",
    isActive: true,
    description: "Dona glaseada con cobertura de chocolate. Se repone a media mañana.",
    primaryImageUrl: demoImg("dona-chocolate.jpg"),
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
    category: catBebidas(),
    ERP_inventory_category: catBebidas(),
    unit: unitUn,
    type: "final",
    isActive: true,
    description: "Café ecuatoriano molido, bolsa de 250 g. Para venta en mostrador y clientes corporativos.",
    primaryImageUrl: demoImg("cafe-molido.jpg"),
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
    categoryId: 41,
    category: catInsumos(),
    unit: unitGr,
    type: "raw",
    isActive: true,
    description: "Harina de trigo especial para panadería. Stock en gramos; requiere compra urgente.",
    primaryImageUrl: demoImg("harina.jpg"),
  },
  {
    id: 402,
    name: "Azúcar refinada",
    sku: "INS-AZUCAR",
    stock: 4,
    minStock: 12,
    price: 0.85,
    cost: 0.6,
    categoryId: 41,
    category: catInsumos(),
    unit: unitGr,
    type: "raw",
    isActive: true,
    description: "Azúcar blanca refinada para producción. Presentación en saco de 50 kg enlazada al genérico.",
    primaryImageUrl: demoImg("azucar.jpg"),
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
    category: categories.find((c) => c.id === 1),
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
    category: categories.find((c) => c.id === 1),
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
    cedula: "9999999999999",
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
    name: "Panadería El Sol",
    cedula: "1790123456001",
    phone: "0987654321",
    email: "compras@panaderiaelsol.ec",
    address: "Av. Francisco de Orellana Mz. 412, Guayaquil",
    isActive: true,
    isConsumidorFinal: false,
    identType: "04",
    pendingAmount: 21,
  },
  {
    id: 3,
    name: "Café & Más — Urdesa",
    cedula: "0912345678001",
    phone: "0998123456",
    email: "pedidos@cafeymas.ec",
    address: "Víctor Emilio Estrada 123, Urdesa Central",
    isActive: true,
    isConsumidorFinal: false,
    identType: "04",
    pendingAmount: 0,
  },
  {
    id: 4,
    name: "Mini Market La Garzota",
    cedula: "1790234567001",
    phone: "042567890",
    email: "bodega@lamgarzota.ec",
    address: "Calle 4ta y Av. de las Américas, La Garzota",
    isActive: true,
    isConsumidorFinal: false,
    identType: "04",
    pendingAmount: 45.5,
  },
  {
    id: 5,
    name: "Escuela Particular San José",
    cedula: "1790345678001",
    phone: "042345678",
    email: "administracion@sanjose.edu.ec",
    address: "Av. Juan Tanca Marengo Km 2.5",
    isActive: true,
    isConsumidorFinal: false,
    identType: "04",
    pendingAmount: 0,
  },
  {
    id: 6,
    name: "Distribuidora Norte Cía. Ltda.",
    cedula: "1790456789001",
    phone: "0981122334",
    email: "ventas@distnorte.ec",
    address: "Av. de las Américas 2345, Norte de Guayaquil",
    isActive: true,
    isConsumidorFinal: false,
    identType: "04",
    pendingAmount: 12.8,
  },
];

function makeOrderItem(id, productId, qty, price, opts = {}) {
  const { paid = true, delivered = true, daysAgo = 0 } = opts;
  const p = products.find((x) => x.id === productId) || { id: productId, name: "Producto" };
  const paidAt = paid ? orderDateTimeOffset(daysAgo, 9, 30, 0) : null;
  const deliveredAt = delivered ? orderDateTimeOffset(daysAgo, 9, 31, 0) : null;
  return {
    id,
    productId,
    product: { id: p.id, name: p.name },
    ERP_inventory_product: { id: p.id, name: p.name, primaryImageUrl: p.primaryImageUrl },
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

function makeOrder(id, customerId, status, items, opts = {}) {
  const customer = customers.find((c) => c.id === customerId);
  const total = Number(items.reduce((s, it) => s + it.total, 0).toFixed(2));
  const paidAmount = status === "pagado" ? total : opts.paidAmount ?? 0;
  const daysAgo = opts.daysAgo ?? 0;
  const h = opts.h ?? 10;
  const m = opts.m ?? 15;
  return {
    id,
    customerId,
    customer,
    ERP_customer: customer,
    status,
    total,
    paid: paidAmount,
    paidAmount,
    pending: Number((total - paidAmount).toFixed(2)),
    date: orderDateTimeOffset(daysAgo, h, m, 0),
    createdAt: new Date(today.getTime() - daysAgo * 86400000).toISOString(),
    paymentMethod: status === "pagado" ? opts.paymentMethod ?? "efectivo" : null,
    documentType: opts.documentType ?? "nota_venta",
    items,
    ERP_order_items: items,
  };
}

/** Pseudo-aleatorio estable por día (misma serie en cada carga). */
function demoRand(seed) {
  const x = Math.sin(seed * 9999.123) * 10000;
  return x - Math.floor(x);
}

function incomeSource(row) {
  const cat = String(row.category || "").toLowerCase();
  if (row.source === "caja" || row.source === "cobro") return row.source;
  if (cat.includes("cobro")) return "cobro";
  return "caja";
}

/**
 * Historial financiero demo (~12 meses): más ventas en fin de semana,
 * pedidos B2B lun/mié/vie, gastos fijos y días ocasionales sin movimiento.
 */
function buildFinanceHistoryDemo() {
  const extraOrders = [];
  const extraPosSales = [];
  const extraIncomes = [];
  const extraExpenses = [];

  let orderId = 19;
  let posId = 509;
  let incomeId = 8;
  let expenseId = 7;
  let itemId = 2000;

  const b2bCustomers = [2, 3, 4, 5, 6];
  const posProducts = [
    { id: 101, name: "Pan de dulce", price: 0.15 },
    { id: 102, name: "Pan de sal", price: 0.15 },
    { id: 103, name: "Pan de chocolate", price: 0.2 },
    { id: 104, name: "Pan enrollado", price: 0.15 },
    { id: 201, name: "Galleta salada clásica", price: 0.35 },
    { id: 202, name: "Galleta salada de ajo", price: 0.35 },
    { id: 301, name: "Dona de chocolate", price: 0.35 },
    { id: 302, name: "Café molido 250g", price: 3.5 },
  ];
  const paymentMethods = ["efectivo", "efectivo", "efectivo", "tarjeta", "transferencia"];

  for (let daysAgo = 7; daysAgo <= 364; daysAgo += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isMonday = dow === 1;
    const dayOfMonth = d.getDate();
    const month = d.getMonth();
    const r = demoRand(daysAgo * 17 + month * 31);

    if (r < 0.16) continue;

    const monthsAgo = Math.floor(daysAgo / 30);
    const activityScale = monthsAgo === 0 ? 1 : monthsAgo <= 3 ? 0.88 : monthsAgo <= 8 ? 0.72 : 0.58;

    const baseSales = isWeekend ? 7 : isMonday ? 3 : 5;
    const salesCount = Math.max(1, Math.round((baseSales + demoRand(daysAgo * 3) * 4) * activityScale));
    let dayPosTotal = 0;

    for (let s = 0; s < salesCount; s += 1) {
      const prod = posProducts[Math.floor(demoRand(daysAgo * 100 + s) * posProducts.length)];
      const qty = 1 + Math.floor(demoRand(daysAgo + s * 7) * (isWeekend ? 10 : 6));
      const lineTotal = Number((qty * prod.price).toFixed(2));
      const items = [{
        productId: prod.id,
        name: prod.name,
        quantity: qty,
        price: prod.price,
        total: lineTotal,
      }];
      const h = 7 + Math.floor(demoRand(s + daysAgo) * 10);
      const m = Math.floor(demoRand(s * 11) * 55);
      extraPosSales.push(makePosSale(posId++, items, {
        daysAgo,
        h,
        m,
        paymentMethod: paymentMethods[Math.floor(demoRand(daysAgo + s) * paymentMethods.length)],
      }));
      dayPosTotal += lineTotal;
    }

    if (dayPosTotal > 0) {
      extraIncomes.push({
        id: incomeId++,
        date: isoDayOffset(daysAgo),
        amount: Number((dayPosTotal * (0.94 + demoRand(daysAgo) * 0.06)).toFixed(2)),
        category: "Venta",
        concept: "Ventas POS del día",
        status: "confirmed",
        counterpartyName: "Caja",
        source: "caja",
      });
    }

    if ([1, 3, 5].includes(dow) && demoRand(daysAgo * 5) > 0.42) {
      const custId = b2bCustomers[Math.floor(demoRand(daysAgo * 2) * b2bCustomers.length)];
      const paid = demoRand(daysAgo * 13) > 0.38;
      const items = [
        makeOrderItem(itemId++, 101, 20 + Math.floor(demoRand(daysAgo) * 90), 0.15, {
          paid,
          delivered: paid || demoRand(daysAgo) > 0.45,
          daysAgo,
        }),
      ];
      if (demoRand(daysAgo * 19) > 0.45) {
        items.push(makeOrderItem(itemId++, 201, 12 + Math.floor(demoRand(daysAgo * 3) * 60), 0.35, {
          paid,
          delivered: paid,
          daysAgo,
        }));
      }
      const status = paid ? "pagado" : "pendiente";
      const order = makeOrder(orderId++, custId, status, items, {
        daysAgo,
        h: 8 + Math.floor(demoRand(daysAgo) * 5),
        m: 15 + Math.floor(demoRand(daysAgo * 2) * 30),
        paymentMethod: paid ? (demoRand(daysAgo) > 0.6 ? "transferencia" : "efectivo") : null,
      });
      extraOrders.push(order);

      if (paid) {
        const cobroDelay = Math.floor(demoRand(daysAgo * 7) * 3);
        extraIncomes.push({
          id: incomeId++,
          date: isoDayOffset(Math.max(0, daysAgo - cobroDelay)),
          amount: order.total,
          category: "Cobros clientes",
          concept: `Cobro pedido #${order.id}`,
          status: "confirmed",
          counterpartyName: customers.find((c) => c.id === custId)?.name || "Cliente",
          source: "cobro",
        });
      }
    }

    if ((dow === 2 || dow === 6) && demoRand(daysAgo * 23) > 0.38) {
      extraExpenses.push({
        id: expenseId++,
        date: isoDayOffset(daysAgo),
        amount: Number((75 + demoRand(daysAgo * 41) * 195).toFixed(2)),
        category: "Compras",
        concept: dow === 2 ? "Insumos panadería" : "Reposición mostrador",
        status: "confirmed",
        counterpartyName: "Harinas del Valle",
      });
    }

    if (dayOfMonth === 5) {
      extraExpenses.push({
        id: expenseId++,
        date: isoDayOffset(daysAgo),
        amount: 450,
        category: "Gastos operativos",
        concept: "Arriendo local",
        status: "confirmed",
        counterpartyName: "Arrendador",
      });
    }

    if (dayOfMonth === 12) {
      extraExpenses.push({
        id: expenseId++,
        date: isoDayOffset(daysAgo),
        amount: Number((98 + demoRand(month * 11) * 42).toFixed(2)),
        category: "Pago de servicios",
        concept: "Electricidad CNEL",
        status: "confirmed",
        counterpartyName: "CNEL",
      });
    }

    if (dayOfMonth === 20 && demoRand(month * 3) > 0.35) {
      extraExpenses.push({
        id: expenseId++,
        date: isoDayOffset(daysAgo),
        amount: Number((35 + demoRand(daysAgo) * 25).toFixed(2)),
        category: "Gastos operativos",
        concept: "Gas industrial",
        status: "confirmed",
        counterpartyName: "Proveedor gas",
      });
    }

    if (demoRand(daysAgo * 29) > 0.93) {
      extraExpenses.push({
        id: expenseId++,
        date: isoDayOffset(daysAgo),
        amount: Number((dayPosTotal * 1.35 + 95).toFixed(2)),
        category: "Honorarios",
        concept: "Mantenimiento horno",
        status: "confirmed",
        counterpartyName: "Servicio técnico",
      });
    }
  }

  return { extraOrders, extraPosSales, extraIncomes, extraExpenses };
}

const baseOrders = [
  makeOrder(11, 2, "pendiente", [
    makeOrderItem(1101, 101, 40, 0.15, { paid: false, delivered: false, daysAgo: 1 }),
    makeOrderItem(1102, 201, 30, 0.35, { paid: false, delivered: false, daysAgo: 1 }),
  ], { daysAgo: 1, h: 11, m: 20 }),
  makeOrder(12, 3, "pagado", [
    makeOrderItem(1103, 201, 3, 0.35, { daysAgo: 0 }),
    makeOrderItem(1104, 302, 1, 3.5, { daysAgo: 0 }),
  ], { daysAgo: 0, h: 10, m: 5 }),
  makeOrder(13, 1, "pagado", [
    makeOrderItem(1105, 102, 10, 0.15, { daysAgo: 0 }),
  ], { daysAgo: 0, h: 14, m: 0 }),
  makeOrder(14, 4, "pendiente", [
    makeOrderItem(1106, 201, 60, 0.35, { paid: false, delivered: true, daysAgo: 2 }),
    makeOrderItem(1107, 202, 40, 0.35, { paid: false, delivered: true, daysAgo: 2 }),
  ], { daysAgo: 2, h: 8, m: 45 }),
  makeOrder(15, 5, "pagado", [
    makeOrderItem(1108, 101, 100, 0.15, { daysAgo: 3 }),
    makeOrderItem(1109, 103, 50, 0.2, { daysAgo: 3 }),
  ], { daysAgo: 3, h: 7, m: 30, paymentMethod: "transferencia" }),
  makeOrder(16, 6, "pendiente", [
    makeOrderItem(1110, 204, 24, 0.35, { paid: false, delivered: false, daysAgo: 4 }),
  ], { daysAgo: 4, h: 16, m: 10 }),
  makeOrder(17, 3, "pagado", [
    makeOrderItem(1111, 301, 12, 0.35, { daysAgo: 5 }),
  ], { daysAgo: 5, h: 9, m: 0 }),
  makeOrder(18, 2, "pagado", [
    makeOrderItem(1112, 104, 20, 0.15, { daysAgo: 6 }),
    makeOrderItem(1113, 203, 9, 0.35, { daysAgo: 6 }),
  ], { daysAgo: 6, h: 12, m: 30 }),
];

const financeHistory = buildFinanceHistoryDemo();

export const orders = [...baseOrders, ...financeHistory.extraOrders];

const baseIncomes = [
  { id: 1, date: isoDayOffset(0), amount: 185.5, category: "Venta", concept: "Ventas POS", status: "confirmed", counterpartyName: "Caja", source: "caja" },
  { id: 2, date: isoDayOffset(1), amount: 210.0, category: "Venta", concept: "Ventas del día", status: "confirmed", counterpartyName: "Caja", source: "caja" },
  { id: 3, date: isoDayOffset(2), amount: 95.2, category: "Caja / POS", concept: "Cobros caja", status: "confirmed", counterpartyName: "Caja", source: "caja" },
  { id: 4, date: isoDayOffset(3), amount: 160.0, category: "Venta", concept: "Ventas", status: "confirmed", counterpartyName: "Caja", source: "caja" },
  { id: 5, date: isoDayOffset(4), amount: 72.0, category: "Cobros clientes", concept: "Abono parcial pedido", status: "confirmed", counterpartyName: "Panadería El Sol", source: "cobro" },
  { id: 6, date: isoDayOffset(5), amount: 140.0, category: "Venta", concept: "Ventas", status: "confirmed", counterpartyName: "Caja", source: "caja" },
  { id: 7, date: isoDayOffset(6), amount: 88.0, category: "Venta", concept: "Ventas", status: "confirmed", counterpartyName: "Caja", source: "caja" },
  { id: 801, date: isoDayOffset(0), amount: 4.55, category: "Cobros clientes", concept: "Cobro pedido #12", status: "confirmed", counterpartyName: "Café & Más — Urdesa", source: "cobro" },
  { id: 802, date: isoDayOffset(0), amount: 1.5, category: "Cobros clientes", concept: "Cobro pedido #13", status: "confirmed", counterpartyName: "Consumidor Final", source: "cobro" },
  { id: 803, date: isoDayOffset(3), amount: 25.0, category: "Cobros clientes", concept: "Cobro pedido #15", status: "confirmed", counterpartyName: "Escuela Particular San José", source: "cobro" },
  { id: 804, date: isoDayOffset(5), amount: 4.2, category: "Cobros clientes", concept: "Cobro pedido #17", status: "confirmed", counterpartyName: "Café & Más — Urdesa", source: "cobro" },
  { id: 805, date: isoDayOffset(6), amount: 6.15, category: "Cobros clientes", concept: "Cobro pedido #18", status: "confirmed", counterpartyName: "Panadería El Sol", source: "cobro" },
];

export const incomes = [...baseIncomes, ...financeHistory.extraIncomes];

const baseExpenses = [
  { id: 1, date: isoDayOffset(0), amount: 45.0, category: "Compras", concept: "Harina", status: "confirmed", counterpartyName: "Harinas del Valle" },
  { id: 2, date: isoDayOffset(1), amount: 220.0, category: "Compras", concept: "Insumos varios", status: "confirmed", counterpartyName: "Insumos Costa" },
  { id: 3, date: isoDayOffset(2), amount: 120.0, category: "Pago de servicios", concept: "Luz", status: "confirmed", counterpartyName: "CNEL" },
  { id: 4, date: isoDayOffset(3), amount: 40.0, category: "Gastos operativos", concept: "Gas", status: "confirmed", counterpartyName: "Proveedor gas" },
  { id: 5, date: isoDayOffset(4), amount: 55.0, category: "Otro", concept: "Empaques", status: "confirmed", counterpartyName: "Empaques Guayas" },
  { id: 6, date: isoDayOffset(5), amount: 30.0, category: "Honorarios", concept: "Reparación", status: "confirmed", counterpartyName: "Técnico" },
];

export const expenses = [...baseExpenses, ...financeHistory.extraExpenses];

export const movements = [
  makeMovement(1, 101, "salida", 40, { daysAgo: 0, h: 9, reason: "VENTA_POS", note: "Venta mostrador — pan surtido" }),
  makeMovement(2, 201, "salida", 12, { daysAgo: 0, h: 9, m: 15, note: "Promo 3 × $1 galletas" }),
  makeMovement(3, 401, "entrada", 5000, { daysAgo: 1, h: 7, reason: "ENTRADA_COMPRA", note: "Compra harina — saco 50 kg", price: 0.001 }),
  makeMovement(4, 402, "salida", 800, { daysAgo: 0, h: 5, reason: "PRODUCCION", note: "Producción pan dulce lote matutino" }),
  makeMovement(5, 103, "salida", 25, { daysAgo: 0, h: 11, reason: "VENTA_POS", note: "Venta escolar" }),
  makeMovement(6, 301, "salida", 8, { daysAgo: 0, h: 10, m: 45, note: "Donas tarde" }),
  makeMovement(7, 302, "salida", 2, { daysAgo: 1, h: 14, reason: "VENTA_POS", note: "Café molido — Café & Más" }),
  makeMovement(8, 201, "salida", 60, { daysAgo: 2, h: 8, note: "Pedido Mini Market La Garzota" }),
  makeMovement(9, 401, "ajuste", 0, { daysAgo: 3, h: 18, reason: "AJUSTE_INVENTARIO", note: "Conteo físico — harina agotada" }),
  makeMovement(10, 102, "entrada", 120, { daysAgo: 0, h: 4, m: 30, reason: "PRODUCCION", note: "Horneada pan de sal" }),
  makeMovement(11, 204, "salida", 24, { daysAgo: 4, h: 16, note: "Pedido Distribuidora Norte" }),
  makeMovement(12, 402, "entrada", 2000, { daysAgo: 2, h: 11, reason: "ENTRADA_COMPRA", note: "Reposición azúcar", price: 0.00085 }),
];

const basePosSales = [
  makePosSale(501, [{ productId: 201, name: "Galleta salada clásica", quantity: 3, price: 0.35, total: 1.05 }], { daysAgo: 0, h: 9, m: 0 }),
  makePosSale(502, [
    { productId: 101, name: "Pan de dulce", quantity: 6, price: 0.15, total: 0.9 },
    { productId: 102, name: "Pan de sal", quantity: 4, price: 0.15, total: 0.6 },
  ], { daysAgo: 0, h: 10, m: 30, paymentMethod: "efectivo" }),
  makePosSale(503, [{ productId: 301, name: "Dona de chocolate", quantity: 4, price: 0.35, total: 1.4 }], { daysAgo: 0, h: 12, m: 5, paymentMethod: "tarjeta" }),
  makePosSale(504, [{ productId: 302, name: "Café molido 250g", quantity: 1, price: 3.5, total: 3.5 }], {
    daysAgo: 0,
    h: 15,
    m: 20,
    paymentMethod: "transferencia",
    customerName: "María González",
  }),
  makePosSale(505, [
    { productId: 201, name: "Galleta salada clásica", quantity: 6, price: 0.35, total: 2.1 },
    { productId: 203, name: "Galleta salada integral", quantity: 3, price: 0.35, total: 1.05 },
  ], { daysAgo: 1, h: 8, m: 50 }),
  makePosSale(506, [{ productId: 103, name: "Pan de chocolate", quantity: 10, price: 0.2, total: 2 }], { daysAgo: 1, h: 16, m: 40 }),
  makePosSale(507, [{ productId: 104, name: "Pan enrollado", quantity: 8, price: 0.15, total: 1.2 }], { daysAgo: 2, h: 7, m: 45 }),
  makePosSale(508, [
    { productId: 201, name: "Galleta salada clásica", quantity: 9, price: 0.35, total: 3.15 },
  ], { daysAgo: 3, h: 11, m: 0, paymentMethod: "efectivo", documentNumber: "NV-DEMO-508" }),
];

export const posSales = [...basePosSales, ...financeHistory.extraPosSales];

export const suppliers = [
  {
    id: 1,
    name: "Harinas del Valle S.A.",
    phone: "042567100",
    email: "ventas@harinasdelvalle.ec",
    address: "Km 12.5 vía Daule, bodega principal",
    isActive: true,
  },
  {
    id: 2,
    name: "Lácteos Pacífico",
    phone: "042890123",
    email: "pedidos@lacteospacifico.ec",
    address: "Av. Quito 456, Guayaquil",
    isActive: true,
  },
  {
    id: 3,
    name: "Empaques Guayas",
    phone: "042334455",
    email: "comercial@empaquesguayas.ec",
    address: "Zona industrial, Av. de las Américas",
    isActive: true,
  },
  {
    id: 4,
    name: "Café Loja Export",
    phone: "072567890",
    email: "mayorista@cafeloja.ec",
    address: "Loja — despacho Guayaquil",
    isActive: true,
  },
];

export const stores = [
  {
    id: 1,
    name: "Panadería Raptor — Centro",
    address: "Av. 9 de Octubre 1205 y Boyacá",
    phone: "042110000",
    isActive: true,
  },
  {
    id: 2,
    name: "Panadería Raptor — Urdesa",
    address: "Víctor Emilio Estrada 456",
    phone: "042110001",
    isActive: true,
  },
  {
    id: 3,
    name: "Punto express — Garzota",
    address: "Calle 4ta, local 12",
    phone: "042110002",
    isActive: true,
  },
];

export const supplierOrders = [
  {
    id: 901,
    supplierId: 1,
    supplier: suppliers[0],
    status: "recibido",
    total: 285.5,
    date: isoDayOffset(2),
    items: [{ productId: 401, name: "Harina especial", quantity: 50000, price: 0.00571 }],
  },
  {
    id: 902,
    supplierId: 3,
    supplier: suppliers[2],
    status: "pendiente",
    total: 48.0,
    date: isoDayOffset(0),
    items: [{ name: "Bolsas kraft medianas", quantity: 200, price: 0.24 }],
  },
];

export const recipes = [
  { id: 1, productFinalId: 101, productRawId: 401, productComponentId: 401, quantity: 50 },
  { id: 2, productFinalId: 101, productRawId: 402, productComponentId: 402, quantity: 12 },
  { id: 3, productFinalId: 102, productRawId: 401, productComponentId: 401, quantity: 45 },
  { id: 4, productFinalId: 103, productRawId: 401, productComponentId: 401, quantity: 48 },
  { id: 5, productFinalId: 201, productRawId: 401, productComponentId: 401, quantity: 30 },
];

export const catalogEntries = [
  { id: 1, productId: 101, name: "Pan de dulce", price: 0.15, isPublic: true, position: 1 },
  { id: 2, productId: 201, name: "Galleta salada clásica", price: 0.35, isPublic: true, position: 2 },
  { id: 3, productId: 301, name: "Dona de chocolate", price: 0.35, isPublic: true, position: 3 },
];

export const homeProducts = [
  { id: 101, name: "Pan de dulce", price: 0.15, primaryImageUrl: demoImg("pan-dulce.jpg") },
  { id: 201, name: "Galleta salada clásica", price: 0.35, primaryImageUrl: demoImg("galleta-clasica.jpg") },
  { id: 103, name: "Pan de chocolate", price: 0.2, primaryImageUrl: demoImg("pan-chocolate.jpg") },
];

export const financeSummary = { totalIncome: 12500, totalExpense: 4800, balance: 10150 };

export const dashboardHero = {
  summary: {
    totalIncome: 12500,
    totalExpense: 4800,
    balance: 10150,
    monthIncome: 3200,
    monthExpense: 1450,
    monthBalance: 1750,
    futureIncome: 64.4,
    monthIncomeWithPending: 3264.4,
    projectedBalance: 10214.4,
    recordMonthIncome: 4000,
    recordMonthBalance: 2100,
    marginPct: 54.7,
    vsRecordPct: -8.5,
  },
  obligations: {
    summary: { totalReceivable: 79.3, totalPayable: 450, openCount: 3 },
    topOpen: [
      { id: 1, kind: "customer", counterpartyName: "Panadería El Sol", remaining: 21, dueDate: isoDayOffset(2) },
      { id: 2, kind: "customer", counterpartyName: "Mini Market La Garzota", remaining: 45.5, dueDate: isoDayOffset(5) },
      { id: 3, kind: "customer", counterpartyName: "Distribuidora Norte Cía. Ltda.", remaining: 12.8, dueDate: isoDayOffset(7) },
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
    { status: "pending", label: "Pendientes", count: orders.filter((o) => o.status === "pendiente").length, amount: orders.filter((o) => o.pending > 0).reduce((s, o) => s + o.pending, 0) },
    { status: "paid", label: "Pagados", count: orders.filter((o) => o.status === "pagado").length, amount: orders.filter((o) => o.status === "pagado").reduce((s, o) => s + o.total, 0) },
    { status: "delivered", label: "Entregados", count: orders.filter((o) => o.items.every((i) => i.delivered)).length, amount: orders.filter((o) => o.items.every((i) => i.delivered)).reduce((s, o) => s + o.total, 0) },
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
  payments: [
    { id: 1, orderId: 12, customerId: 3, amount: 6.55, date: orderDateTimeOffset(0, 10, 10, 0), method: "efectivo", concept: "Pedido #12" },
    { id: 2, orderId: 15, customerId: 5, amount: 25, date: orderDateTimeOffset(3, 8, 0, 0), method: "transferencia", concept: "Pedido escuela" },
    { id: 3, orderId: 18, customerId: 2, amount: 6.15, date: orderDateTimeOffset(6, 13, 0, 0), method: "efectivo", concept: "Abono parcial" },
  ],
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

export const genericsWorkbench = {
  generics: [
    {
      id: 1,
      name: "Harina de trigo",
      unitId: 2,
      categoryName: "Harinas y azúcares",
      totalStockDisplay: "0 g",
      stockOnGeneric: 0,
      presentationCount: 1,
      recipeLines: 4,
      presentations: [
        {
          id: 401,
          name: "Harina especial",
          purchasePresentation: "Saco 50 kg",
          categoryName: "Harinas y azúcares",
          stock: 0,
          stockGrams: 0,
          unitAbbrev: "gr",
          isCountUnit: false,
          price: 1.2,
        },
      ],
    },
    {
      id: 2,
      name: "Azúcar refinada",
      unitId: 2,
      categoryName: "Harinas y azúcares",
      totalStockDisplay: "4 g",
      stockOnGeneric: 0,
      presentationCount: 1,
      recipeLines: 1,
      presentations: [
        {
          id: 402,
          name: "Azúcar refinada",
          purchasePresentation: "Saco 50 kg",
          categoryName: "Harinas y azúcares",
          stock: 4,
          stockGrams: 4,
          unitAbbrev: "gr",
          isCountUnit: false,
          price: 0.85,
        },
      ],
    },
  ],
  unlinkedProducts: [],
};

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
  orderCount: 11,
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

function buildShiftWeeklyReport() {
  const weekdayShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const salesByDay = [142, 168, 155, 189, 175, 210, 185.5];
  const cashOutByDay = [35, 42, 28, 55, 40, 38, 45];
  const openingByDay = [40, 45, 50, 48, 52, 55, 50];
  const days = [];
  const summary = { openingCashTotal: 0, salesTotal: 0, cashOutTotal: 0, closingCashTotal: 0 };

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const idx = 6 - i;
    const opening = openingByDay[idx];
    const sales = salesByDay[idx];
    const cashOut = cashOutByDay[idx];
    const closing = Number((opening + sales - cashOut).toFixed(2));
    days.push({
      date,
      weekdayShort: weekdayShort[d.getDay()],
      dateLabel: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
      openingCashTotal: opening,
      salesTotal: sales,
      cashOutTotal: cashOut,
      closingCashTotal: closing,
    });
    summary.openingCashTotal += opening;
    summary.salesTotal += sales;
    summary.cashOutTotal += cashOut;
    summary.closingCashTotal += closing;
  }

  return {
    weekStart: days[0]?.date,
    weekEnd: days[days.length - 1]?.date,
    days,
    summary,
    totals: { sales: summary.salesTotal, expenses: summary.cashOutTotal },
  };
}

function mapPosSaleForShiftReport(sale) {
  return {
    id: sale.id,
    paidAt: sale.createdAt,
    documentType: sale.documentType,
    customerName: sale.customerName || "Consumidor final",
    paymentMethod: sale.paymentMethod,
    total: sale.total,
    items: (sale.items || []).map((it, idx) => ({
      id: `${sale.id}-${idx}`,
      name: it.name,
      quantity: it.quantity,
      price: it.price,
      lineTotal: it.total ?? Number((it.quantity * it.price).toFixed(2)),
    })),
  };
}

function buildShiftDailyReport() {
  const todaySales = posSales.filter((s) => {
    const created = new Date(s.createdAt);
    return created.toDateString() === today.toDateString();
  });
  const salesTotal = Number(todaySales.reduce((sum, s) => sum + s.total, 0).toFixed(2));
  const cashOutTotal = 12;
  const openingCashTotal = 50;
  return {
    date: isoDayOffset(0),
    sales: salesTotal,
    expenses: cashOutTotal,
    summary: {
      openingCashTotal,
      salesTotal,
      cashOutTotal,
      closingCashTotal: Number((openingCashTotal + salesTotal - cashOutTotal).toFixed(2)),
      ordersCount: todaySales.length,
    },
    outflows: (activeShift.cashMovements?.items || []).map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      operatorName: "Invitado Raptor",
      category: m.category,
      concept: m.concept,
      amount: m.amount,
      shiftId: activeShift.id,
    })),
    sales: todaySales.map(mapPosSaleForShiftReport),
    shifts: [
      {
        id: activeShift.id,
        status: activeShift.status,
        openedAt: activeShift.openedAt,
        operatorName: "Invitado Raptor",
        salesTotal: activeShift.salesTotal,
        openingCashTotal: activeShift.openingCashTotal,
      },
    ],
  };
}

export const shiftWeeklyReport = buildShiftWeeklyReport();
export const shiftDailyReport = buildShiftDailyReport();

export const notifications = [
  {
    id: 1,
    title: "Stock bajo — Harina especial",
    message: "La harina especial está agotada. Revisa compras con Harinas del Valle.",
    read: false,
    createdAt: new Date(today.getTime() - 3600000).toISOString(),
  },
  {
    id: 2,
    title: "Pedido pendiente #11",
    message: "Panadería El Sol tiene $21.00 pendientes de cobro.",
    read: false,
    createdAt: new Date(today.getTime() - 7200000).toISOString(),
  },
  {
    id: 3,
    title: "Turno abierto",
    message: "Caja Centro abierta desde las 07:00. Ventas del día: $175.50.",
    read: true,
    createdAt: new Date(today.getTime() - 18000000).toISOString(),
  },
  {
    id: 4,
    title: "Modo invitado",
    message: "Estás explorando con datos demo. Los cambios no se guardan.",
    read: true,
    createdAt: today.toISOString(),
  },
];

export const users = [
  { id: 0, firstName: "Invitado", secondName: "", firstLastName: "Raptor", secondLastName: "", username: "invitado" },
  { id: 1, firstName: "María", secondName: "Elena", firstLastName: "Vásquez", secondLastName: "Pérez", username: "mvasquez" },
  { id: 2, firstName: "Carlos", secondName: "Alberto", firstLastName: "Mendoza", secondLastName: "Ruiz", username: "cmendoza" },
];
export const accounts = [
  { id: 1, username: "invitado", userId: 0, isActive: true },
  { id: 2, username: "mvasquez", userId: 1, isActive: true },
  { id: 3, username: "cmendoza", userId: 2, isActive: true },
];
export const roles = [
  { id: 1, name: "Administrador" },
  { id: 2, name: "Empleado" },
];

export const panelStats = { users: users.length, orders: orders.length, products: products.length };

const todayPosTotal = posSales
  .filter((s) => new Date(s.createdAt).toDateString() === today.toDateString())
  .reduce((sum, s) => sum + s.total, 0);
const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today.toDateString());

export const taskPlans = [
  {
    id: 1,
    title: "Apertura y reposición matutina",
    description: "Checklist diario antes de abrir mostrador en Centro.",
    startDate: isoDayOffset(0),
    endDate: isoDayOffset(0),
    status: "published",
    items: [
      {
        id: 101,
        title: "Contar caja inicial",
        description: "Verificar $50.00 de fondo y firmar apertura.",
        assignedUserId: 1,
        priority: 1,
        dueDate: isoDayOffset(0),
        status: "done",
        actionType: "none",
      },
      {
        id: 102,
        title: "Reponer galletas en vitrina",
        description: "Mínimo 150 unidades surtidas antes de las 08:00.",
        assignedUserId: 2,
        priority: 2,
        dueDate: isoDayOffset(0),
        status: "in_progress",
        actionType: "none",
      },
      {
        id: 103,
        title: "Pedir harina a proveedor",
        description: "Llamar a Harinas del Valle — stock en cero.",
        assignedUserId: 1,
        priority: 0,
        dueDate: isoDayOffset(0),
        status: "pending",
        actionType: "none",
      },
    ],
  },
  {
    id: 2,
    title: "Inventario semanal",
    description: "Conteo de insumos y productos terminados.",
    startDate: isoDayOffset(2),
    endDate: isoDayOffset(4),
    status: "draft",
    items: [
      {
        id: 201,
        title: "Conteo harina y azúcar",
        description: "Registrar gramos en presentaciones.",
        assignedUserId: 2,
        priority: 1,
        dueDate: isoDayOffset(3),
        status: "pending",
        actionType: "none",
      },
    ],
  },
];

export const taskAssignees = [
  { userId: 1, name: "María Vásquez", role: "Administrador" },
  { userId: 2, name: "Carlos Mendoza", role: "Empleado" },
];

export const myTaskItems = taskPlans[0].items.map((it) => ({
  ...it,
  plan: { id: taskPlans[0].id, title: taskPlans[0].title },
}));

export const sriSettings = { readyForInvoicing: false, environment: "pruebas", enabled: false };

export const profile = {
  id: 0,
  firstName: "Invitado",
  firstLastName: "Raptor",
  username: "invitado",
  email: "invitado@demo.ec",
};

export const electronicInvoices = [];
export const publicidadCampaigns = [];
export const publicidadDevices = [];
export const allTables = {};

export const dayDetailTemplate = {
  orders: todayOrders.map((o) => ({
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
  posSales: posSales
    .filter((s) => new Date(s.createdAt).toDateString() === today.toDateString())
    .map((p) => ({ id: p.id, total: p.total, customer: p.customerName || "Consumidor final", items: p.items })),
  incomes: incomes.slice(0, 3),
  abonos: [],
  directPayments: [],
  expenses: expenses.slice(0, 2).map((e) => ({ id: e.id, concept: e.concept, amount: e.amount })),
  totals: {
    ordersAmount: Number(todayOrders.reduce((s, o) => s + o.total, 0).toFixed(2)),
    ordersCount: todayOrders.length,
    posSalesAmount: todayPosTotal,
    posSalesCount: posSales.filter((s) => new Date(s.createdAt).toDateString() === today.toDateString()).length,
    posIncomeAmount: todayPosTotal,
    posIncomeCount: posSales.filter((s) => new Date(s.createdAt).toDateString() === today.toDateString()).length,
    collectedAmount: todayOrders.filter((o) => o.status === "pagado").reduce((s, o) => s + o.total, 0),
    expensesAmount: expenses[0]?.amount ?? 0,
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
