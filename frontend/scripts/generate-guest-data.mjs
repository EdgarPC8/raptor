/**
 * OBSOLETO para el modo invitado vivo.
 * La fuente editable es `src/mocks/guest/guestSeed.js`.
 * Este script solo deja un dump de referencia (no se usa en runtime).
 *
 * Uso: npm run generate:guest-data
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appsWeb = resolve(__dirname, "../../..");
const eddeliEnv = resolve(appsWeb, "eddeli/backend/.env");
/** Dump de referencia — NO alimenta guestData (usar guestSeed.js). */
const outPath = resolve(__dirname, "../src/mocks/guest/guestDataset.db-dump.js");
const PER_TABLE = 10;
const MONTHS = 3;

const require = createRequire(import.meta.url);
const { createConnection } = require(
  resolve(appsWeb, "eddeli/backend/node_modules/mysql2/promise.js"),
);

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const env = { ...process.env, ...loadEnvFile(eddeliEnv) };

const FAKE_CUSTOMERS = [
  "Distribuidora Andina",
  "Café Central",
  "Colegio Demo",
  "Panadería Norte",
  "Minimarket Sol",
  "Hotel Mirador",
  "Restaurante La Plaza",
  "Kiosko Estación",
  "Clinica Vida",
  "Oficina Demo Sur",
];
const FAKE_PRODUCTS = [
  "Dona de chocolate",
  "Pan de dulce",
  "Pan de sal",
  "Mantequilla demo",
  "Chocolate líquido",
  "Masa de dona",
  "Pan de chocolate",
  "Pan enrollado",
  "Huevos demo",
  "Dona cruda",
  "Harina especial",
  "Azúcar refinada",
  "Croissant",
  "Bagel",
  "Empanada de queso",
  "Café molido",
  "Torta de chocolate",
  "Jugo de naranja",
  "Galleta de mantequilla",
  "Agua embotellada",
];
const FAKE_INCOME_CATS = ["Venta", "Caja / POS", "Cobros clientes", "Otros ingresos"];
const FAKE_EXPENSE_CATS = [
  "Compras",
  "Otro",
  "Pago de servicios",
  "Compra de insumos",
  "Gastos operativos",
  "Honorarios",
  "Pago Empleados",
];
const FAKE_SUPPLIERS = [
  "Harinas del Valle",
  "Lácteos Pacífico",
  "Empaques Guayas",
  "Insumos Costa",
];
const FAKE_STORES = ["Local Centro", "Local Norte", "Local Sur"];

const SENSITIVE_RE =
  /password|passwd|secret|token|certificate|private.?key|jwt|hash|salt|api.?key/i;
const NAME_RE = /^(name|firstName|secondName|firstLastName|secondLastName|counterpartyName|username|title|concept)$/i;
const CONTACT_RE = /^(email|phone|cedula|address|ruc)$/i;
const MONEY_RE = /amount|price|total|cash|cost|stock|unitPrice|remaining|principal|paid/i;

function money(n) {
  return Number(Number(n || 0).toFixed(2));
}
function morphAmount(n, salt = 1) {
  const x = Number(n) || 0;
  const factor = 0.82 + ((Math.abs(salt) % 17) / 100);
  return money(x * factor);
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function toDate(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function orderDateTime(v) {
  const d = toDate(v);
  if (!d) return null;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function isoDay(v) {
  const d = toDate(v);
  if (!d) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function sinceDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - MONTHS);
  d.setHours(0, 0, 0, 0);
  return d;
}
function sinceStr() {
  const d = sinceDate();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} 00:00:00`;
}

async function q(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return rows;
}

function pickDateColumn(fields) {
  const preferred = [
    "date",
    "createdAt",
    "openedAt",
    "updatedAt",
    "paidAt",
    "receivedAt",
    "closedAt",
  ];
  for (const p of preferred) {
    if (fields.includes(p)) return p;
  }
  return fields.find((f) => /date|At$/i.test(f)) || null;
}

function anonymizeRow(table, row, idx) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (SENSITIVE_RE.test(k)) {
      out[k] = null;
      continue;
    }
    if (Buffer.isBuffer(v)) {
      out[k] = `[blob ${v.length}b]`;
      continue;
    }
    if (v instanceof Date) {
      out[k] = v.toISOString();
      continue;
    }
    if (NAME_RE.test(k) && typeof v === "string" && v) {
      if (table.includes("customer") || k === "counterpartyName") {
        out[k] = FAKE_CUSTOMERS[idx % FAKE_CUSTOMERS.length];
      } else if (table.includes("product") || table.includes("catalog") || table.includes("home")) {
        out[k] = FAKE_PRODUCTS[idx % FAKE_PRODUCTS.length];
      } else if (table.includes("supplier")) {
        out[k] = FAKE_SUPPLIERS[idx % FAKE_SUPPLIERS.length];
      } else if (table.includes("store")) {
        out[k] = FAKE_STORES[idx % FAKE_STORES.length];
      } else if (k === "username") {
        out[k] = idx === 0 ? "edgar" : `demo${idx}`;
      } else if (k === "concept" || k === "title") {
        out[k] = `Demo ${k} #${idx + 1}`;
      } else {
        out[k] = `Demo ${idx + 1}`;
      }
      continue;
    }
    if (CONTACT_RE.test(k)) {
      if (k === "email") out[k] = `demo${idx + 1}@demo.ec`;
      else if (k === "phone") out[k] = `09${String(80000000 + idx * 111).slice(0, 8)}`;
      else if (k === "cedula" || k === "ruc") out[k] = `099000000${pad2(idx)}`;
      else if (k === "address") out[k] = `Calle Demo ${idx + 1}`;
      else out[k] = v;
      continue;
    }
    if (MONEY_RE.test(k) && typeof v === "number") {
      out[k] = morphAmount(v, idx + String(k).length);
      continue;
    }
    if (typeof v === "string" && v.length > 500) {
      out[k] = `${v.slice(0, 120)}…`;
      continue;
    }
    out[k] = v;
  }
  return out;
}

async function sampleAllTables(conn, since) {
  const tableNames = (await q(conn, "SHOW TABLES")).map((t) => Object.values(t)[0]);
  const allTables = {};
  const summary = [];

  for (const table of tableNames) {
    try {
      const cols = await q(conn, `DESCRIBE \`${table}\``);
      const fields = cols.map((c) => c.Field);
      const dateCol = pickDateColumn(fields);
      const [{ total }] = await q(conn, `SELECT COUNT(*) AS total FROM \`${table}\``);

      let rows = [];
      if (Number(total) > 0) {
        if (dateCol) {
          rows = await q(
            conn,
            `SELECT * FROM \`${table}\`
             WHERE \`${dateCol}\` >= ?
             ORDER BY \`${dateCol}\` DESC
             LIMIT ${PER_TABLE}`,
            [since],
          );
        }
        // Si no hubo filas recientes o no hay fecha, tomar sample general
        if (!rows.length) {
          const orderCol = fields.includes("id")
            ? "id"
            : dateCol || fields[0];
          rows = await q(
            conn,
            `SELECT * FROM \`${table}\` ORDER BY \`${orderCol}\` DESC LIMIT ${PER_TABLE}`,
          );
        }
      }

      const anonymized = rows.map((r, i) => anonymizeRow(table, r, i));
      allTables[table] = {
        totalRows: Number(total),
        sampled: anonymized.length,
        dateColumn: dateCol,
        columns: fields,
        rows: anonymized,
      };
      summary.push({
        table,
        total: Number(total),
        sampled: anonymized.length,
        window: dateCol ? `${MONTHS}m` : "latest",
      });
      process.stdout.write(`  ✓ ${table}: ${anonymized.length}/${total}\n`);
    } catch (err) {
      allTables[table] = {
        totalRows: null,
        sampled: 0,
        error: String(err.message || err),
        rows: [],
      };
      summary.push({ table, total: null, sampled: 0, error: String(err.message || err) });
      process.stdout.write(`  ✗ ${table}: ${err.message}\n`);
    }
  }

  return { allTables, summary, tableNames };
}

function rowsOf(allTables, table) {
  return allTables[table]?.rows || [];
}

async function main() {
  const since = sinceStr();
  const conn = await createConnection({
    host: env.DB_HOST || "localhost",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASS ?? "",
    database: env.DB_NAME || "softed",
    dateStrings: false,
  });

  console.log(`\n[1/2] Sample de TODAS las tablas (≥ ${since} cuando aplica)…`);
  const { allTables, summary, tableNames } = await sampleAllTables(conn, since);

  console.log(`\n[2/2] Armando dataset vinculado para UI invitado…`);

  // Extraer muestras raw (sin anonimizar de nuevo) para vincular mejor:
  // re-leemos pedidos reales recientes para relaciones correctas.
  const rawOrders = await q(
    conn,
    `SELECT o.* FROM ERP_orders o
     WHERE o.date >= ?
       AND EXISTS (SELECT 1 FROM ERP_order_items oi WHERE oi.orderId = o.id)
     ORDER BY o.date DESC LIMIT 40`,
    [since],
  );

  const pickedOrders = [];
  const seenCustomers = new Set();
  for (const o of rawOrders) {
    if (pickedOrders.length >= PER_TABLE) break;
    const cid = Number(o.customerId);
    if (!seenCustomers.has(cid) || pickedOrders.length < 6) {
      seenCustomers.add(cid);
      pickedOrders.push(o);
    }
  }
  while (pickedOrders.length < Math.min(PER_TABLE, rawOrders.length)) {
    const next = rawOrders.find((o) => !pickedOrders.includes(o));
    if (!next) break;
    pickedOrders.push(next);
  }

  const orderIds = pickedOrders.map((o) => o.id);
  if (!orderIds.length) {
    await conn.end();
    throw new Error("No hay pedidos con ítems en los últimos 3 meses.");
  }

  const ph = orderIds.map(() => "?").join(",");
  const rawItems = await q(
    conn,
    `SELECT * FROM ERP_order_items WHERE orderId IN (${ph}) ORDER BY orderId, id`,
    orderIds,
  );

  let productIds = [...new Set(rawItems.map((i) => Number(i.productId)).filter(Boolean))];
  const customerIds = [...new Set(pickedOrders.map((o) => Number(o.customerId)).filter(Boolean))];

  /** Top ~10 productos con más vinculaciones (pedidos + movimientos + compras). */
  const hubProducts = await q(
    conn,
    `SELECT p.*,
      (
        (SELECT COUNT(*) FROM ERP_order_items oi WHERE oi.productId = p.id)
        + (SELECT COUNT(*) FROM ERP_inventory_movements m WHERE m.productId = p.id)
        + (SELECT COUNT(*) FROM ERP_supplier_order_items soi WHERE soi.productId = p.id)
      ) AS _links
     FROM ERP_inventory_products p
     WHERE p.isActive = 1
     ORDER BY _links DESC
     LIMIT 10`,
  ).catch(() => []);

  /** Alertas reales de stock: agotados + por agotarse. */
  const rawStockOut = await q(
    conn,
    `SELECT * FROM ERP_inventory_products
     WHERE isActive = 1 AND stock <= 0
     ORDER BY ABS(stock) DESC, id ASC
     LIMIT 8`,
  ).catch(() => []);
  const rawStockLow = await q(
    conn,
    `SELECT * FROM ERP_inventory_products
     WHERE isActive = 1 AND minStock > 0 AND stock > 0 AND stock <= minStock
     ORDER BY (stock / minStock) ASC, id ASC
     LIMIT 8`,
  ).catch(() => []);

  const preferIds = [
    ...hubProducts.map((p) => Number(p.id)),
    ...rawStockOut.map((p) => Number(p.id)),
    ...rawStockLow.map((p) => Number(p.id)),
  ];
  for (const id of preferIds) {
    if (id && !productIds.includes(id)) productIds.push(id);
  }

  if (productIds.length < PER_TABLE) {
    const extra = await q(
      conn,
      `SELECT id FROM ERP_inventory_products
       WHERE isActive = 1 ${productIds.length ? `AND id NOT IN (${productIds.map(() => "?").join(",")})` : ""}
       ORDER BY updatedAt DESC LIMIT ?`,
      productIds.length ? [...productIds, PER_TABLE - productIds.length] : [PER_TABLE],
    );
    productIds = [...productIds, ...extra.map((p) => Number(p.id))];
  }

  /** Priorizar hubs + alertas al armar el catálogo demo (~12 + variantes). */
  const orderedProductIds = [
    ...preferIds.filter((id) => productIds.includes(id)),
    ...productIds.filter((id) => !preferIds.includes(id)),
  ];
  productIds = orderedProductIds.slice(0, Math.max(14, PER_TABLE + 4));

  const productsPh = productIds.map(() => "?").join(",") || "0";
  const rawProducts = productIds.length
    ? await q(conn, `SELECT * FROM ERP_inventory_products WHERE id IN (${productsPh})`, productIds)
    : [];
  /** Mantener orden de hubs primero. */
  rawProducts.sort((a, b) => productIds.indexOf(Number(a.id)) - productIds.indexOf(Number(b.id)));

  const incomeCatsAgg = await q(
    conn,
    `SELECT category, COUNT(*) AS c, SUM(amount) AS total
     FROM ERP_finance_incomes
     WHERE date >= ?
     GROUP BY category
     ORDER BY total DESC`,
    [since],
  ).catch(() => []);
  const expenseCatsAgg = await q(
    conn,
    `SELECT category, COUNT(*) AS c, SUM(amount) AS total
     FROM ERP_finance_expenses
     WHERE date >= ?
     GROUP BY category
     ORDER BY total DESC
     LIMIT 10`,
    [since],
  ).catch(() => []);

  const categoryIds = [...new Set(rawProducts.map((p) => p.categoryId).filter((x) => x != null))];
  const unitIds = [...new Set(rawProducts.map((p) => p.unitId).filter((x) => x != null))];

  const rawCategories = categoryIds.length
    ? await q(conn, `SELECT * FROM ERP_inventory_categories WHERE id IN (${categoryIds.map(() => "?").join(",")})`, categoryIds)
    : await q(conn, `SELECT * FROM ERP_inventory_categories LIMIT ${PER_TABLE}`);

  const rawUnits = unitIds.length
    ? await q(conn, `SELECT * FROM ERP_inventory_units WHERE id IN (${unitIds.map(() => "?").join(",")})`, unitIds)
    : await q(conn, `SELECT * FROM ERP_inventory_units LIMIT ${PER_TABLE}`);

  const rawCustomers = customerIds.length
    ? await q(conn, `SELECT * FROM ERP_customers WHERE id IN (${customerIds.map(() => "?").join(",")})`, customerIds)
    : [];

  const consumidor = await q(
    conn,
    `SELECT * FROM ERP_customers WHERE identType = '07' OR LOWER(name) LIKE '%consumidor%' ORDER BY id ASC LIMIT 1`,
  );
  if (consumidor[0] && !rawCustomers.some((c) => c.id === consumidor[0].id)) {
    rawCustomers.push(consumidor[0]);
  }

  const rawMovements = productIds.length
    ? await q(
        conn,
        `SELECT * FROM ERP_inventory_movements WHERE productId IN (${productsPh}) AND date >= ? ORDER BY date DESC LIMIT 30`,
        [...productIds, since],
      )
    : [];

  const rawIncomesByOrders = await q(
    conn,
    `SELECT * FROM ERP_finance_incomes
     WHERE (referenceType IN ('order','order_item','payment') AND referenceId IN (${ph}))
        OR id IN (SELECT financeIncomeId FROM ERP_orders WHERE id IN (${ph}) AND financeIncomeId IS NOT NULL)
     ORDER BY date DESC LIMIT 20`,
    [...orderIds, ...orderIds],
  ).catch(() => []);
  const rawIncomesRecent = await q(conn, `SELECT * FROM ERP_finance_incomes WHERE date >= ? ORDER BY date DESC LIMIT 15`, [since]);
  const incomeMap = new Map();
  for (const row of [...rawIncomesByOrders, ...rawIncomesRecent]) incomeMap.set(row.id, row);
  const rawIncomes = [...incomeMap.values()].slice(0, 15);

  const rawExpenses = await q(conn, `SELECT * FROM ERP_finance_expenses WHERE date >= ? ORDER BY date DESC LIMIT 12`, [since]);
  const rawPayments = customerIds.length
    ? await q(
        conn,
        `SELECT * FROM ERP_finance_payments WHERE customerId IN (${customerIds.map(() => "?").join(",")}) AND date >= ? ORDER BY date DESC LIMIT 15`,
        [...customerIds, since],
      )
    : [];

  const groupIds = [...new Set(rawPayments.map((p) => p.groupId).filter((x) => x != null))];
  const rawGroups = groupIds.length
    ? await q(conn, `SELECT * FROM ERP_finance_item_groups WHERE id IN (${groupIds.map(() => "?").join(",")})`, groupIds)
    : await q(
        conn,
        `SELECT * FROM ERP_finance_item_groups WHERE customerId IN (${customerIds.map(() => "?").join(",") || "0"}) ORDER BY id DESC LIMIT 8`,
        customerIds,
      ).catch(() => []);

  const groupItemRows = rawGroups.length
    ? await q(
        conn,
        `SELECT * FROM ERP_finance_item_group_items WHERE groupId IN (${rawGroups.map(() => "?").join(",")}) LIMIT 40`,
        rawGroups.map((g) => g.id),
      )
    : [];

  const rawSuppliers = await q(conn, `SELECT * FROM ERP_suppliers ORDER BY id DESC LIMIT 6`);
  const supplierIds = rawSuppliers.map((s) => s.id);
  const rawSupplierOrders = supplierIds.length
    ? await q(
        conn,
        `SELECT * FROM ERP_supplier_orders WHERE supplierId IN (${supplierIds.map(() => "?").join(",")}) AND date >= ? ORDER BY date DESC LIMIT 8`,
        [...supplierIds, since],
      )
    : [];
  const soIds = rawSupplierOrders.map((o) => o.id);
  const rawSupplierItems = soIds.length
    ? await q(conn, `SELECT * FROM ERP_supplier_order_items WHERE orderId IN (${soIds.map(() => "?").join(",")})`, soIds)
    : [];

  const rawStores = await q(conn, `SELECT * FROM ERP_stores WHERE isActive = 1 ORDER BY position ASC, id ASC LIMIT 4`);
  const rawShifts = await q(conn, `SELECT * FROM ERP_cash_shifts WHERE openedAt >= ? ORDER BY openedAt DESC LIMIT 6`, [since]);
  const shiftIds = rawShifts.map((s) => s.id);
  const rawShiftMovements = shiftIds.length
    ? await q(
        conn,
        `SELECT * FROM ERP_cash_shift_movements WHERE shiftId IN (${shiftIds.map(() => "?").join(",")}) ORDER BY id DESC LIMIT 20`,
        shiftIds,
      ).catch(() => [])
    : [];

  const rawObligations = await q(conn, `SELECT * FROM ERP_finance_obligations ORDER BY id DESC LIMIT 8`).catch(() => []);
  const rawPos = await q(
    conn,
    `SELECT o.* FROM ERP_orders o WHERE o.date >= ? AND (o.shiftId IS NOT NULL OR o.documentType IS NOT NULL) ORDER BY o.date DESC LIMIT 12`,
    [since],
  );
  const posIds = rawPos.map((o) => o.id);
  const rawPosItems = posIds.length
    ? await q(conn, `SELECT * FROM ERP_order_items WHERE orderId IN (${posIds.map(() => "?").join(",")})`, posIds)
    : [];

  const rawRecipes = productIds.length
    ? await q(
        conn,
        `SELECT * FROM ERP_inventory_recipes WHERE productFinalId IN (${productsPh}) OR productRawId IN (${productsPh}) LIMIT 20`,
        [...productIds, ...productIds],
      ).catch(() => [])
    : [];

  const rawCatalogs = await q(conn, `SELECT * FROM ERP_catalogs ORDER BY position ASC, id ASC LIMIT ${PER_TABLE}`).catch(() => []);
  const rawHomeProducts = await q(conn, `SELECT * FROM ERP_home_products ORDER BY id DESC LIMIT ${PER_TABLE}`).catch(() => []);
  const rawTier = await q(conn, `SELECT * FROM ERP_pricing_tier_groups ORDER BY id DESC LIMIT ${PER_TABLE}`).catch(() => []);
  const rawNotifs = await q(conn, `SELECT * FROM notifications WHERE createdAt >= ? ORDER BY createdAt DESC LIMIT ${PER_TABLE}`, [since]).catch(() => []);
  const rawNotifPrograms = await q(conn, `SELECT * FROM notification_programs ORDER BY id DESC LIMIT ${PER_TABLE}`).catch(() => []);
  const rawUsers = await q(conn, `SELECT id, firstName, secondName, firstLastName, secondLastName, username, createdAt, updatedAt FROM users LIMIT ${PER_TABLE}`).catch(() => []);
  const rawAccounts = await q(conn, `SELECT id, username, userId, isActive FROM accounts LIMIT ${PER_TABLE}`).catch(() => []);
  const rawRoles = await q(conn, `SELECT * FROM roles LIMIT ${PER_TABLE}`).catch(() => []);
  const rawElectronic = await q(conn, `SELECT * FROM electronic_invoices ORDER BY id DESC LIMIT ${PER_TABLE}`).catch(() => []);
  const rawCampaigns = await q(conn, `SELECT * FROM ERP_publicidad_campaigns ORDER BY id DESC LIMIT ${PER_TABLE}`).catch(() => []);
  const rawDevices = await q(conn, `SELECT * FROM ERP_publicidad_devices ORDER BY id DESC LIMIT ${PER_TABLE}`).catch(() => []);
  const rawStoreProducts = await q(conn, `SELECT * FROM ERP_store_products ORDER BY id DESC LIMIT ${PER_TABLE}`).catch(() => []);
  const rawDocs = await q(conn, `SELECT * FROM ERP_document_attachments ORDER BY id DESC LIMIT ${PER_TABLE}`).catch(() => []);
  const rawSri = await q(conn, `SELECT id, environment, businessName, ruc, enabled, updatedAt FROM sri_billing_settings LIMIT 1`).catch(() => []);
  const rawAppSettings = await q(conn, `SELECT id, updatedAt FROM app_settings LIMIT 1`).catch(() => []);

  await conn.end();

  // ─── Remaps anonimizados ───
  const customerIdMap = new Map();
  let nextCustomerId = 1;
  for (const c of rawCustomers) if (!customerIdMap.has(c.id)) customerIdMap.set(c.id, nextCustomerId++);

  const productIdMap = new Map();
  let nextProductId = 101;
  for (const p of rawProducts) if (!productIdMap.has(p.id)) productIdMap.set(p.id, nextProductId++);

  const categoryIdMap = new Map();
  let nextCatId = 1;
  for (const c of rawCategories) if (!categoryIdMap.has(c.id)) categoryIdMap.set(c.id, nextCatId++);

  const unitIdMap = new Map();
  let nextUnitId = 1;
  for (const u of rawUnits) if (!unitIdMap.has(u.id)) unitIdMap.set(u.id, nextUnitId++);

  const orderIdMap = new Map();
  let nextOrderId = 11;
  for (const o of pickedOrders) if (!orderIdMap.has(o.id)) orderIdMap.set(o.id, nextOrderId++);

  const itemIdMap = new Map();
  let nextItemId = 1101;
  for (const it of rawItems) if (!itemIdMap.has(it.id)) itemIdMap.set(it.id, nextItemId++);

  const groupIdMap = new Map();
  let nextGroupId = 1;
  for (const g of rawGroups || []) if (!groupIdMap.has(g.id)) groupIdMap.set(g.id, nextGroupId++);

  const units = rawUnits.slice(0, PER_TABLE).map((u) => ({
    id: unitIdMap.get(u.id),
    name: u.name || "Unidad",
    abbreviation: u.abbreviation || "u",
  }));

  const categories = rawCategories.slice(0, PER_TABLE).map((c, i) => ({
    id: categoryIdMap.get(c.id),
    name: ["Panadería", "Pastelería", "Bebidas", "Insumos", "Otros"][i % 5],
    parentId: c.parentId != null && categoryIdMap.has(c.parentId) ? categoryIdMap.get(c.parentId) : null,
  }));

  const hubIdSet = new Set(hubProducts.map((p) => Number(p.id)));
  const stockOutIdSet = new Set(rawStockOut.map((p) => Number(p.id)));
  const stockLowIdSet = new Set(rawStockLow.map((p) => Number(p.id)));

  /** Variantes derivadas del hub #1 (más vinculado): mismos tipos/precios base, stock distinto. */
  function deriveStockRole(real, index) {
    const rid = Number(real.id);
    if (stockOutIdSet.has(rid) || Number(real.stock) <= 0) return "out";
    if (stockLowIdSet.has(rid) || (Number(real.minStock) > 0 && Number(real.stock) > 0 && Number(real.stock) <= Number(real.minStock))) {
      return "low";
    }
    // Derivados forzosos: ~1/3 out, ~1/3 low, resto ok (para llenar ambos paneles)
    if (index % 3 === 0) return "out";
    if (index % 3 === 1) return "low";
    return "ok";
  }

  function demoStockFields(real, index, role) {
    const baseMin = Math.max(2, Number(real.minStock) || 8);
    if (role === "out") {
      return {
        stock: 0,
        minStock: money(Math.max(2, morphAmount(baseMin, index + 5))),
      };
    }
    if (role === "low") {
      const minStock = money(Math.max(5, morphAmount(baseMin, index + 5)));
      const ratio = 0.12 + (index % 5) * 0.12; // 12%–60% del mínimo
      return {
        stock: money(Math.max(0.5, minStock * ratio)),
        minStock,
      };
    }
    return {
      stock: money(Math.max(8, morphAmount(Math.abs(Number(real.stock) || 40), index + 3))),
      minStock: money(Math.max(0, morphAmount(Number(real.minStock) || 5, index + 5))),
    };
  }

  const productsBase = rawProducts.slice(0, 12).map((p, i) => {
    const id = productIdMap.get(p.id);
    const catId = p.categoryId != null ? categoryIdMap.get(p.categoryId) : null;
    const unitId = p.unitId != null ? unitIdMap.get(p.unitId) : units[0]?.id;
    const cat = categories.find((c) => c.id === catId);
    const unit = units.find((u) => u.id === unitId) || units[0];
    const role = deriveStockRole(p, i);
    const stocks = demoStockFields(p, i, role);
    return {
      id,
      name: FAKE_PRODUCTS[i % FAKE_PRODUCTS.length],
      sku: `D-${pad2(i + 1)}`,
      stock: stocks.stock,
      minStock: stocks.minStock,
      price: money(Math.max(0.1, morphAmount(p.price, i + 7))),
      cost: money(Math.max(0.05, morphAmount(p.supplierPrice || p.price * 0.45, i + 9))),
      categoryId: catId,
      category: cat ? { id: cat.id, name: cat.name } : null,
      unit: unit
        ? { id: unit.id, name: unit.name, abbreviation: unit.abbreviation }
        : { id: 1, name: "Unidad", abbreviation: "u" },
      type: p.type || "final",
      isActive: p.isActive !== 0 && p.isActive !== false,
      _role: role,
      _hub: hubIdSet.has(Number(p.id)),
      _sourceId: Number(p.id),
    };
  });

  /** +8 derivados del hub más vinculado (índice 0), cambiando nombre/stock/precio. */
  const hubSeed = productsBase[0] || null;
  const derivedProducts = hubSeed
    ? Array.from({ length: 8 }, (_, j) => {
        const i = productsBase.length + j;
        const role = j % 2 === 0 ? "out" : "low";
        const minStock = money(Math.max(6, (hubSeed.minStock || 10) * (0.8 + j * 0.15)));
        const stock =
          role === "out"
            ? 0
            : money(Math.max(0.5, minStock * (0.18 + (j % 4) * 0.1)));
        return {
          id: 201 + j,
          name: `${FAKE_PRODUCTS[(j + 2) % FAKE_PRODUCTS.length]} (${j + 1})`,
          sku: `D-V${pad2(j + 1)}`,
          stock,
          minStock,
          price: money(Math.max(0.1, (hubSeed.price || 1) * (0.85 + j * 0.05))),
          cost: money(Math.max(0.05, (hubSeed.cost || 0.4) * (0.9 + j * 0.04))),
          categoryId: hubSeed.categoryId,
          category: hubSeed.category,
          unit: hubSeed.unit,
          type: ["final", "raw", "intermediate"][j % 3],
          isActive: true,
          _role: role,
          _hub: false,
          _derivedFrom: hubSeed.id,
        };
      })
    : [];

  const products = [...productsBase, ...derivedProducts].map(({ _role, _hub, _sourceId, _derivedFrom, ...rest }) => rest);
  const productByDemoId = Object.fromEntries(products.map((p) => [p.id, p]));
  /** Roles originales para armar alerts sin recalcular. */
  const productRoles = new Map([
    ...productsBase.map((p) => [p.id, p._role]),
    ...derivedProducts.map((p) => [p.id, p._role]),
  ]);

  const customers = rawCustomers.slice(0, PER_TABLE).map((c, i) => {
    const isCf = c.identType === "07" || String(c.name || "").toLowerCase().includes("consumidor");
    return {
      id: customerIdMap.get(c.id),
      name: isCf ? "Consumidor Final" : FAKE_CUSTOMERS[i % FAKE_CUSTOMERS.length],
      phone: isCf ? "" : `09${String(80000000 + i * 1111).slice(0, 8)}`,
      email: isCf ? "" : `cliente${i + 1}@demo.ec`,
      address: isCf ? "" : `Calle Demo ${i + 1}`,
      isActive: true,
      isConsumidorFinal: Boolean(isCf),
      pendingAmount: 0,
    };
  });
  const customerByDemoId = Object.fromEntries(customers.map((c) => [c.id, c]));

  const orders = pickedOrders.map((o) => {
    const demoId = orderIdMap.get(o.id);
    const custId = customerIdMap.get(o.customerId);
    const items = rawItems
      .filter((it) => it.orderId === o.id)
      .map((it) => {
        const pid = productIdMap.get(it.productId);
        const prod = productByDemoId[pid];
        const qty = Number(it.quantity || it.soldQty || 0);
        const price = money(Math.max(0.1, morphAmount(it.price, it.id)));
        return {
          id: itemIdMap.get(it.id),
          productId: pid,
          product: prod ? { id: prod.id, name: prod.name } : { id: pid, name: `Producto ${pid}` },
          name: prod?.name,
          quantity: qty,
          price,
          total: money(qty * price),
          delivered: Boolean(it.deliveredAt),
          paid: Boolean(it.paidAt),
          paidAt: it.paidAt ? orderDateTime(it.paidAt) : null,
          deliveredAt: it.deliveredAt ? orderDateTime(it.deliveredAt) : null,
          damagedQty: Number(it.damagedQty || 0),
          giftQty: Number(it.giftQty || 0),
          soldQty: Number(it.soldQty || qty),
        };
      });
    const total = money(items.reduce((s, it) => s + it.total, 0));
    const paid = money(items.filter((it) => it.paid).reduce((s, it) => s + it.total, 0));
    const cust = customerByDemoId[custId];
    return {
      id: demoId,
      customerId: custId,
      customer: cust
        ? { id: cust.id, name: cust.name, phone: cust.phone, email: cust.email }
        : { id: custId, name: `Cliente ${custId}` },
      ERP_customer: cust
        ? { id: cust.id, name: cust.name, phone: cust.phone, email: cust.email }
        : { id: custId, name: `Cliente ${custId}` },
      status: o.status || (paid >= total && total > 0 ? "pagado" : "pendiente"),
      total,
      paid,
      paidAmount: paid,
      pending: money(Math.max(0, total - paid)),
      date: orderDateTime(o.date) || orderDateTime(o.createdAt),
      createdAt: toDate(o.createdAt)?.toISOString() || new Date().toISOString(),
      paymentMethod: o.paymentMethod || null,
      documentType: o.documentType || null,
      shiftId: o.shiftId || null,
      items,
      ERP_order_items: items.map((it) => ({
        ...it,
        ERP_inventory_product: it.product || { id: it.productId, name: it.name || "Producto" },
      })),
    };
  });

  for (const gi of groupItemRows) {
    const oid = gi.orderItemId;
    if (oid == null) continue;
    const gOld = gi.groupId;
    const it = rawItems.find((x) => x.id === oid);
    if (!it || !groupIdMap.has(gOld)) continue;
    const demoOrder = orders.find((o) => o.id === orderIdMap.get(it.orderId));
    const demoItem = demoOrder?.items?.find((x) => x.id === itemIdMap.get(it.id));
    if (demoItem) demoItem.groupId = groupIdMap.get(gOld);
  }

  for (const c of customers) {
    c.pendingAmount = money(
      orders.filter((o) => o.customerId === c.id).reduce((s, o) => s + (o.pending || 0), 0),
    );
  }

  const movements = rawMovements.slice(0, 20).map((m, i) => {
    const pid = productIdMap.get(m.productId);
    const prod = productByDemoId[pid];
    return {
      id: i + 1,
      productId: pid,
      product: { id: pid, name: prod?.name || `Producto ${pid}` },
      type: m.type || (Number(m.quantity) >= 0 ? "in" : "out"),
      quantity: money(Math.abs(morphAmount(m.quantity, m.id))),
      date: isoDay(m.date) || isoDay(m.createdAt),
      note: "Movimiento demo",
      reason: m.reason || null,
      referenceType: m.referenceType || null,
      referenceId: m.referenceId || null,
      price: money(morphAmount(m.price, m.id + 3)),
    };
  });

  const incomes = rawIncomes.slice(0, 12).map((inc, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (i % 28));
    return {
      id: i + 1,
      date: isoDay(d),
      amount: money(Math.max(8, morphAmount(Math.max(Number(inc.amount) || 25, 15), inc.id))),
      category: inc.category || "Venta",
      concept: `Ingreso demo #${i + 1}`,
      referenceType: inc.referenceType || null,
      referenceId:
        inc.referenceType === "order" && orderIdMap.has(inc.referenceId)
          ? orderIdMap.get(inc.referenceId)
          : null,
      status: inc.status || "confirmed",
      counterpartyName: FAKE_CUSTOMERS[i % FAKE_CUSTOMERS.length],
    };
  });

  const expenses = rawExpenses.slice(0, 12).map((e, i) => {
    const d = new Date();
    // Algunos días con más gasto (para velas rojas / barras invertidas)
    const offsetDays = i % 3 === 1 ? (i % 10) : (i % 28);
    d.setDate(d.getDate() - offsetDays);
    const baseAmt = Math.max(Number(e.amount) || 20, 12);
    const bump = i % 4 === 1 ? 1.8 : 1;
    return {
      id: i + 1,
      date: isoDay(d),
      amount: money(Math.max(5, morphAmount(baseAmt * bump, e.id))),
      category: e.category || "Insumos",
      concept: ["Harina", "Azúcar", "Luz", "Arriendo", "Nómina", "Embalaje", "Internet", "Gas"][i % 8],
      referenceType: e.referenceType || null,
      referenceId: null,
      status: e.status || "confirmed",
      counterpartyName: FAKE_SUPPLIERS[i % FAKE_SUPPLIERS.length],
    };
  });

  const suppliers = rawSuppliers.slice(0, 4).map((s, i) => ({
    id: i + 1,
    name: FAKE_SUPPLIERS[i % FAKE_SUPPLIERS.length],
    phone: `04${2000000 + i * 111}`,
    email: `proveedor${i + 1}@demo.ec`,
    address: `Bodega Demo ${i + 1}`,
    isActive: true,
  }));
  const supplierIdMap = new Map(rawSuppliers.slice(0, 4).map((s, i) => [s.id, i + 1]));

  const supplierOrders = rawSupplierOrders.slice(0, 6).map((o, i) => {
    const sid = supplierIdMap.get(o.supplierId) || 1;
    const items = rawSupplierItems
      .filter((it) => it.orderId === o.id)
      .map((it, j) => {
        const qty = Number(it.quantity || 0);
        const price = money(Math.max(0.1, morphAmount(it.unitPrice || 1, it.id)));
        return {
          id: 2100 + i * 10 + j,
          productId: productIdMap.get(it.productId) || products[0]?.id,
          name: productByDemoId[productIdMap.get(it.productId)]?.name || "Insumo",
          quantity: qty,
          price,
          total: money(qty * price),
        };
      });
    const total = money(items.reduce((s, it) => s + it.total, 0));
    return {
      id: 21 + i,
      supplierId: sid,
      supplier: { id: sid, name: suppliers.find((x) => x.id === sid)?.name || "Proveedor" },
      status: o.status || "received",
      total,
      paid: o.paidAt ? total : money(total * 0.5),
      date: orderDateTime(o.date) || orderDateTime(o.createdAt),
      items,
    };
  });

  const stores = (rawStores.length ? rawStores : [{ id: 1 }]).slice(0, 3).map((s, i) => ({
    id: i + 1,
    name: FAKE_STORES[i % FAKE_STORES.length],
    address: s.address || `Av. Demo ${i + 1}`,
    phone: s.phone || `04211${pad2(i)}00`,
    isActive: true,
  }));

  const collectionGroups = (rawGroups || []).slice(0, 6).map((g) => ({
    id: groupIdMap.get(g.id),
    customerId: customerIdMap.get(g.customerId) || customers[0]?.id,
    status: g.status || "open",
    concept: `Grupo demo ${groupIdMap.get(g.id)}`,
    totalAmount: money(morphAmount(g.totalAmount, g.id)),
    createdAt: toDate(g.createdAt)?.toISOString() || new Date().toISOString(),
  }));

  const payments = rawPayments.slice(0, 12).map((p, i) => ({
    id: i + 1,
    customerId: customerIdMap.get(p.customerId) || null,
    groupId: p.groupId != null && groupIdMap.has(p.groupId) ? groupIdMap.get(p.groupId) : null,
    amount: money(Math.max(0.5, morphAmount(p.amount, p.id))),
    date: isoDay(p.date) || isoDay(p.createdAt),
    method: p.method || "efectivo",
    status: p.status || "completed",
    note: null,
  }));

  const financeWorkbench = {
    customers: customers.filter((c) => !c.isConsumidorFinal),
    orders: orders.map((o) => ({
      id: o.id,
      customerId: o.customerId,
      status: o.status,
      total: o.total,
      paid: o.paid,
      paidAmount: o.paidAmount,
      date: o.date,
      items: o.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        product: it.name || it.product?.name,
        name: it.name,
        quantity: it.quantity,
        qty: it.quantity,
        price: it.price,
        paidAt: it.paidAt,
        deliveredAt: it.deliveredAt,
        groupId: it.groupId ?? null,
        damagedQty: it.damagedQty || 0,
        giftQty: it.giftQty || 0,
      })),
    })),
    groups: collectionGroups,
    payments,
  };

  const customerSalesSummary = customers
    .filter((c) => !c.isConsumidorFinal)
    .map((c) => {
      const custOrders = orders.filter((o) => o.customerId === c.id);
      let totalQuantity = 0;
      let totalAmount = 0;
      let totalAmountDeuda = 0;
      let totalOrdersNoPaid = 0;
      let paidFromOrders = 0;
      const productMap = new Map();
      const ordersPayload = custOrders.map((o) => {
        paidFromOrders += Number(o.paidAmount || 0);
        const ERP_order_items = o.items.map((it) => {
          const qty = Number(it.quantity || 0);
          const price = Number(it.price || 0);
          const amt = qty * price;
          totalQuantity += qty;
          totalAmount += amt;
          if (!it.paidAt) {
            totalOrdersNoPaid += 1;
            totalAmountDeuda += amt;
          }
          const key = String(it.productId);
          if (!productMap.has(key)) {
            productMap.set(key, {
              productId: it.productId,
              name: it.name || it.product?.name,
              totalQuantity: 0,
              totalPrice: 0,
              totalAmount: 0,
            });
          }
          const agg = productMap.get(key);
          agg.totalQuantity += qty;
          agg.totalPrice += price;
          agg.totalAmount += amt;
          return {
            id: it.id,
            productId: it.productId,
            quantity: it.quantity,
            price: it.price,
            paidAt: it.paidAt,
            deliveredAt: it.deliveredAt,
            groupId: it.groupId ?? null,
            damagedQty: it.damagedQty || 0,
            giftQty: it.giftQty || 0,
            ERP_inventory_product: { id: it.productId, name: it.name || it.product?.name },
          };
        });
        return {
          id: o.id,
          customerId: o.customerId,
          status: o.status,
          date: o.date,
          createdAt: o.createdAt,
          paidAmount: o.paidAmount,
          total: o.total,
          ERP_order_items,
        };
      });
      return {
        customerId: c.id,
        customer: { id: c.id, name: c.name, phone: c.phone, email: c.email },
        totalQuantity: money(totalQuantity),
        totalPrice: 0,
        totalAmount: money(totalAmount),
        totalOrdersNoPaid,
        totalAmountDeuda: money(totalAmountDeuda),
        revenuePending: money(Math.max(0, totalAmount - paidFromOrders)),
        lastOrderAt: custOrders[0]?.createdAt || null,
        orders: ordersPayload,
        productSummary: [...productMap.values()].sort((a, b) => b.totalAmount - a.totalAmount),
      };
    })
    .filter((r) => r.orders.length > 0)
    .sort((a, b) => b.revenuePending - a.revenuePending || b.totalAmount - a.totalAmount);

  const posSales = rawPos.slice(0, 8).map((o, i) => {
    const items = rawPosItems
      .filter((it) => it.orderId === o.id)
      .map((it) => {
        const qty = Number(it.quantity || 0);
        const price = money(morphAmount(it.price, it.id));
        const pid = productIdMap.get(it.productId) || products[0]?.id;
        return {
          productId: pid,
          name: productByDemoId[pid]?.name || "Producto",
          quantity: qty,
          price,
          total: money(qty * price),
        };
      });
    const total = money(items.reduce((s, it) => s + it.total, 0));
    return {
      id: 501 + i,
      total,
      createdAt: toDate(o.date || o.createdAt)?.toISOString() || new Date().toISOString(),
      date: orderDateTime(o.date || o.createdAt),
      storeId: 1,
      store: stores[0],
      itemsCount: items.reduce((s, it) => s + it.quantity, 0),
      paymentMethod: o.paymentMethod || "efectivo",
      items,
      documentType: o.documentType || "nota_venta",
      documentNumber: `NV-DEMO-${501 + i}`,
    };
  });

  const monthIncome = money(incomes.reduce((s, i) => s + i.amount, 0));
  const monthExpense = money(expenses.reduce((s, e) => s + e.amount, 0));
  const totalIncome = money(12000 + monthIncome);
  const totalExpense = money(4500 + monthExpense);
  const balance = money(totalIncome - totalExpense);
  const monthBalance = money(monthIncome - monthExpense);
  const futureIncome = money(orders.reduce((s, o) => s + (o.pending || 0), 0));

  const incomeByCat = {};
  for (const i of incomes) incomeByCat[i.category] = money((incomeByCat[i.category] || 0) + i.amount);
  const expenseByCat = {};
  for (const e of expenses) expenseByCat[e.category] = money((expenseByCat[e.category] || 0) + e.amount);

  /** Desglose con forma del backend: platforms + groups + meta (para el pie del dashboard). */
  const ventaBase =
    Number(incomeCatsAgg.find((r) => String(r.category).toLowerCase() === "venta")?.total) ||
    Object.values(incomeByCat).reduce((s, v) => s + v, 0) ||
    3400;
  const incomeGroup = FAKE_INCOME_CATS.map((label, i) => {
    const share = [0.55, 0.22, 0.15, 0.08][i] ?? 0.05;
    const fromAgg = incomeCatsAgg[i];
    const raw = fromAgg ? Number(fromAgg.total) : ventaBase * share;
    return { label, value: money(Math.max(5, morphAmount(raw, i + 11))) };
  });
  const expenseGroup = (expenseCatsAgg.length ? expenseCatsAgg : FAKE_EXPENSE_CATS.map((c) => ({ category: c, total: 100 }))).map(
    (row, i) => ({
      label: String(row.category || FAKE_EXPENSE_CATS[i] || `Gasto ${i + 1}`),
      value: money(Math.max(1, morphAmount(Number(row.total) || 50, i + 21))),
    }),
  );
  const ieIncomeTotal = money(incomeGroup.reduce((s, r) => s + r.value, 0));
  const ieExpenseTotal = money(expenseGroup.reduce((s, r) => s + r.value, 0));
  const incomeExpenseBreakdown = {
    platforms: [
      { label: "Ingresos", value: ieIncomeTotal },
      { label: "Gastos", value: ieExpenseTotal },
    ],
    groups: {
      Ingresos: incomeGroup,
      Gastos: expenseGroup,
    },
    meta: {
      totals: {
        income: ieIncomeTotal,
        expense: ieExpenseTotal,
        overall: money(ieIncomeTotal + ieExpenseTotal),
      },
      range: { startDate: since.slice(0, 10), endDate: null },
    },
    incomeLines: incomes.map((i) => ({
      id: i.id,
      date: i.date,
      concept: i.concept,
      category: i.category,
      amount: i.amount,
      counterpartyName: i.counterpartyName,
    })),
    expenseLines: expenses.map((e) => ({
      id: e.id,
      date: e.date,
      concept: e.concept,
      category: e.category,
      amount: e.amount,
      counterpartyName: e.counterpartyName,
      productName: null,
    })),
  };

  function stockAlertRow(p) {
    return {
      id: p.id,
      name: p.name,
      price: Number(p.price ?? 0),
      stock: Number(p.stock ?? 0),
      minStock: Number(p.minStock ?? 0),
      type: p.type || "final",
      isActive: p.isActive !== false,
      unit: p.unit?.abbreviation || "u",
    };
  }

  const agotados = products
    .filter((p) => {
      const role = productRoles.get(p.id);
      return role === "out" || Number(p.stock) <= 0;
    })
    .map(stockAlertRow)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "es"))
    .slice(0, 10);

  const porAgotarse = products
    .filter((p) => {
      const role = productRoles.get(p.id);
      const stock = Number(p.stock);
      const min = Number(p.minStock);
      return role === "low" || (stock > 0 && min > 0 && stock <= min);
    })
    .map(stockAlertRow)
    .sort((a, b) => a.stock - b.stock || a.minStock - b.minStock)
    .slice(0, 10);

  const now = new Date();
  incomeExpenseBreakdown.meta.range.endDate = isoDay(now);

  const dashboardHero = {
    summary: {
      totalIncome,
      totalExpense,
      balance,
      monthIncome,
      monthExpense,
      monthBalance,
      futureIncome,
      monthIncomeWithPending: money(monthIncome + futureIncome),
      projectedBalance: money(balance + futureIncome),
      recordMonthIncome: money(Math.max(monthIncome * 1.2, monthIncome + 500)),
      recordMonthBalance: money(Math.max(monthBalance, 1000)),
      marginPct: monthIncome ? money((monthBalance / monthIncome) * 100) : 0,
      vsRecordPct: -8.5,
    },
    obligations: {
      summary: {
        totalReceivable: futureIncome,
        totalPayable: 980,
        openCount: Math.max(1, orders.filter((o) => o.pending > 0).length),
      },
      topOpen: [
        { id: 1, kind: "loan", counterpartyName: FAKE_CUSTOMERS[0], remaining: 850, dueDate: isoDay(now) },
        { id: 2, kind: "debt", counterpartyName: FAKE_SUPPLIERS[0], remaining: 420, dueDate: isoDay(now) },
      ],
    },
  };

  const dashboardRest = {
    overView: [
      { status: "pending", label: "Pendientes", count: orders.filter((o) => o.pending > 0).length, amount: futureIncome },
      { status: "paid", label: "Pagados", count: orders.filter((o) => o.pending <= 0).length, amount: money(orders.filter((o) => o.pending <= 0).reduce((s, o) => s + o.total, 0)) },
      { status: "delivered", label: "Entregados", count: orders.filter((o) => o.items.every((i) => i.delivered)).length, amount: money(orders.filter((o) => o.items.every((i) => i.delivered)).reduce((s, o) => s + o.total, 0)) },
    ],
    incomeExpenseBreakdown,
    productsStock: { agotados, porAgotarse },
    workbench: financeWorkbench,
    recurring: {
      summary: { monthlyBurden: 1850, pendingThisMonth: 620, gapToCover: 0, dailySalesTarget: 85, daysLeftInMonth: 10, isProfitable: monthBalance > 0, overdueCount: 1 },
      upcoming: [{ id: 1, name: "Arriendo local", amount: 450, dueDay: 5 }, { id: 2, name: "Luz", amount: 120, dueDay: 15 }],
      overdue: [{ id: 3, name: "Internet", amount: 50, dueDay: 1 }],
    },
  };

  const recipes = rawRecipes.slice(0, 15).map((r, i) => ({
    id: i + 1,
    productFinalId: productIdMap.get(r.productFinalId) || products[0]?.id,
    productRawId: productIdMap.get(r.productRawId) || products[1]?.id,
    productComponentId: productIdMap.get(r.productRawId) || products[1]?.id,
    quantity: money(morphAmount(r.quantity || 1, i + 1)),
  }));

  const catalogEntries = rawCatalogs.slice(0, PER_TABLE).map((c, i) => ({
    id: i + 1,
    section: c.section || "home",
    title: FAKE_PRODUCTS[i % FAKE_PRODUCTS.length],
    productId: productIdMap.get(c.productId) || products[i % products.length]?.id,
    isActive: c.isActive !== 0 && c.isActive !== false,
    position: c.position ?? i + 1,
  }));

  const homeProducts = rawHomeProducts.slice(0, PER_TABLE).map((h, i) => ({
    id: i + 1,
    productId: productIdMap.get(h.productId) || products[i % products.length]?.id,
    title: FAKE_PRODUCTS[i % FAKE_PRODUCTS.length],
    isActive: true,
    position: i + 1,
  }));

  const notifications = (rawNotifs.length ? rawNotifs : [{ id: 1 }]).slice(0, PER_TABLE).map((n, i) => ({
    id: i + 1,
    title: i === 0 ? "Demo desde BD (todas las tablas)" : `Aviso demo #${i + 1}`,
    message: i === 0
      ? `Sample de ${tableNames.length} tablas; UI armada con pedidos/movimientos/finanzas vinculados.`
      : "Notificación de demostración anonimizada.",
    read: i > 2,
    createdAt: toDate(n.createdAt)?.toISOString() || now.toISOString(),
  }));

  const dataset = {
    meta: {
      generatedAt: now.toISOString(),
      source: "eddeli-db-all-tables",
      dbName: env.DB_NAME || "softed",
      since,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      perTable: PER_TABLE,
      monthsWindow: MONTHS,
      tablesTotal: tableNames.length,
      tablesSampled: summary.filter((s) => s.sampled > 0).length,
      note: "Sample de TODAS las tablas + hubs vinculados + alertas stock + IE por categoría",
      hubs: hubProducts.slice(0, 10).map((p, i) => ({
        sourceId: p.id,
        name: p.name,
        links: Number(p._links || 0),
        demoName: FAKE_PRODUCTS[i % FAKE_PRODUCTS.length],
        stock: Number(p.stock),
        minStock: Number(p.minStock),
        type: p.type,
      })),
      tableSummary: summary,
      counts: {
        orders: orders.length,
        items: rawItems.length,
        products: products.length,
        customers: customers.length,
        movements: movements.length,
        incomes: incomes.length,
        expenses: expenses.length,
        posSales: posSales.length,
        recipes: recipes.length,
        catalogs: catalogEntries.length,
        notifications: notifications.length,
      },
    },
    /** Dump ~10 de cada tabla (ya anonimizado). */
    allTables,
    units,
    categories,
    products,
    customers,
    suppliers,
    stores,
    tierGroups: rawTier.slice(0, 3).map((t, i) => ({
      id: i + 1,
      name: t.name ? `Tramo demo ${i + 1}` : `Tramo demo ${i + 1}`,
      isActive: true,
      products: products.slice(0, 3).map((p) => ({ productId: p.id, price: money(p.price * 0.9) })),
    })),
    orders,
    supplierOrders,
    incomes,
    expenses,
    movements,
    posSales,
    recipes,
    catalogEntries,
    homeProducts,
    storeProducts: rawStoreProducts.slice(0, PER_TABLE).map((sp, i) => ({
      id: i + 1,
      storeId: 1,
      productId: productIdMap.get(sp.productId) || products[0]?.id,
      isActive: true,
    })),
    shiftMovements: rawShiftMovements.slice(0, PER_TABLE).map((m, i) => ({
      id: i + 1,
      shiftId: 1,
      type: m.type || "cash_out",
      amount: money(morphAmount(m.amount || 5, i + 2)),
      note: "Movimiento de turno demo",
    })),
    electronicInvoices: rawElectronic.slice(0, PER_TABLE).map((e, i) => ({
      id: i + 1,
      documentNumber: `FAC-DEMO-${1000 + i}`,
      status: e.status || "AUTHORIZED",
      total: money(morphAmount(e.total || e.importeTotal || 25, i + 1)),
      createdAt: toDate(e.createdAt)?.toISOString() || now.toISOString(),
    })),
    publicidadCampaigns: rawCampaigns.slice(0, PER_TABLE).map((c, i) => ({
      id: i + 1,
      name: `Campaña demo ${i + 1}`,
      isActive: true,
    })),
    publicidadDevices: rawDevices.slice(0, PER_TABLE).map((d, i) => ({
      id: i + 1,
      name: `Pantalla demo ${i + 1}`,
      isActive: true,
    })),
    documentAttachments: rawDocs.slice(0, PER_TABLE).map((d, i) => ({
      id: i + 1,
      name: `Adjunto demo ${i + 1}`,
      mimeType: d.mimeType || "application/pdf",
    })),
    notificationPrograms: rawNotifPrograms.slice(0, PER_TABLE).map((p, i) => ({
      id: i + 1,
      name: `Programa demo ${i + 1}`,
      isActive: true,
    })),
    financeSummary: { totalIncome, totalExpense, balance },
    dashboardHero,
    dashboardRest,
    financeWorkbench,
    customerSalesSummary,
    incomeExpenseBreakdown: dashboardRest.incomeExpenseBreakdown,
    overView: dashboardRest.overView,
    obligationsWorkbench: {
      summary: dashboardHero.obligations.summary,
      obligations: [
        ...dashboardHero.obligations.topOpen.map((o) => ({ ...o, status: "open" })),
        ...orders.filter((o) => o.pending > 0).slice(0, 4).map((o, idx) => ({
          id: 10 + idx,
          kind: "loan",
          counterpartyName: o.customer.name,
          remaining: o.pending,
          dueDate: isoDay(now),
          status: "open",
          orderId: o.id,
        })),
      ],
    },
    supplierPayables: {
      suppliers: suppliers.map((s) => ({ id: s.id, name: s.name, pendingAmount: 0 })),
      orders: supplierOrders.map((o) => ({
        id: o.id, supplierId: o.supplierId, total: o.total, paid: o.paid, status: o.status,
      })),
    },
    expensesForChart: expenses.slice(0, 8).map((e, i) => ({
      date: e.date,
      referenceId: 200 + i,
      productName: e.concept,
      amount: e.amount,
    })),
    genericsWorkbench: {
      generics: products
        .filter((p) => p.type === "raw" || p.type === "insumo")
        .slice(0, 4)
        .map((p, i) => ({
          id: i + 1,
          name: p.name,
          unitId: p.unit?.id || 1,
          unit: { id: p.unit?.id || 1, abbreviation: p.unit?.abbreviation || "u" },
          presentations: [{ productId: p.id, name: p.name }],
        })),
      unlinkedProducts: [],
    },
    activeShift: {
      id: 1,
      status: "open",
      openedAt: now.toISOString(),
      openingCash: 50,
      storeId: 1,
      store: stores[0],
      user: { id: 0, firstName: "Invitado", firstLastName: "Raptor", username: "invitado" },
      movements: [],
      salesTotal: money(posSales.reduce((s, p) => s + p.total, 0)),
    },
    shifts: (rawShifts.length ? rawShifts : [{ status: "open" }, { status: "closed" }]).slice(0, 4).map((s, i) => ({
      id: i + 1,
      status: s.status || (i === 0 ? "open" : "closed"),
      openedAt: toDate(s.openedAt)?.toISOString() || now.toISOString(),
      closedAt: s.closedAt ? toDate(s.closedAt).toISOString() : null,
      openingCash: money(morphAmount(s.openingCashTotal || 40, i + 1)),
      closingCash: s.closingCashTotal != null ? money(morphAmount(s.closingCashTotal, i + 2)) : null,
      storeId: 1,
      store: stores[0],
    })),
    shiftWeeklyReport: {
      days: [],
      totals: {
        sales: money(posSales.reduce((s, p) => s + p.total, 0)),
        cash: money(posSales.filter((p) => p.paymentMethod === "efectivo").reduce((s, p) => s + p.total, 0)),
        card: money(posSales.filter((p) => p.paymentMethod === "tarjeta").reduce((s, p) => s + p.total, 0)),
      },
    },
    shiftDailyReport: {
      day: isoDay(now),
      sales: money(posSales[0]?.total || 0),
      cash: money(posSales[0]?.total || 0),
      card: 0,
      shifts: [],
    },
    users: (rawUsers.length ? rawUsers : [{ firstName: "Edgar" }, { firstName: "Ana" }]).slice(0, 4).map((u, i) => ({
      id: i + 1,
      firstName: i === 0 ? "Edgar" : i === 1 ? "Ana" : `User${i}`,
      firstLastName: i === 0 ? "Admin" : i === 1 ? "Caja" : "Demo",
      username: i === 0 ? "edgar" : i === 1 ? "ana" : `demo${i}`,
      isActive: true,
      roles: [{ id: i === 1 ? 4 : 2, name: i === 1 ? "Empleado" : "Administrador" }],
    })),
    accounts: (rawAccounts.length ? rawAccounts : [{}, {}]).slice(0, 4).map((a, i) => ({
      id: i + 1,
      username: i === 0 ? "edgar" : i === 1 ? "ana" : `demo${i}`,
      isActive: true,
      userId: i + 1,
    })),
    roles: (rawRoles.length ? rawRoles : [{ name: "Administrador" }, { name: "Empleado" }])
      .filter((r) => r.name !== "Programador")
      .slice(0, 4)
      .map((r, i) => ({
        id: r.name === "Empleado" ? 4 : r.name === "Administrador" ? 2 : i + 10,
        name: r.name === "Programador" ? "Administrador" : r.name || `Rol ${i + 1}`,
      })),
    panelStats: {
      users: 2,
      products: products.length,
      ordersToday: orders.length,
      salesToday: money(posSales.reduce((s, p) => s + p.total, 0)),
      tablesSampled: summary.filter((s) => s.sampled > 0).length,
    },
    notifications,
    taskPlans: [{ id: 1, name: "Apertura de local", items: [{ id: 11, title: "Revisar caja", done: true }, { id: 12, title: "Verificar stock", done: false }] }],
    taskAssignees: [{ id: 1, name: "Edgar Admin" }, { id: 2, name: "Ana Caja" }],
    myTaskItems: [{ id: 12, title: "Verificar stock", done: false, planName: "Apertura de local" }],
    sriSettings: {
      enabled: false,
      environment: rawSri[0]?.environment || "pruebas",
      businessName: "Raptor Demo",
      ruc: "0990000000001",
    },
    appSettingsHint: rawAppSettings[0] ? { id: rawAppSettings[0].id, updatedAt: rawAppSettings[0].updatedAt } : null,
    profile: {
      firstName: "Invitado",
      firstLastName: "Raptor",
      username: "invitado",
      email: "invitado@raptor.demo",
      loginRol: "Administrador",
      isGuest: true,
    },
    recipeByProduct: {
      productFinalId: products[0]?.id || null,
      items: recipes.filter((r) => r.productFinalId === products[0]?.id).slice(0, 5),
    },
    dayDetailTemplate: {
      orders: orders.slice(0, 2).map((o) => ({ id: o.id, customer: o.customer.name, total: o.total, status: o.status })),
      posSales: posSales.slice(0, 1).map((p) => ({ id: p.id, total: p.total, items: p.itemsCount })),
      incomes: incomes.slice(0, 2).map((i) => ({ id: i.id, concept: i.concept, amount: i.amount })),
      abonos: payments.slice(0, 1).map((p) => ({
        id: p.id,
        customer: customers.find((c) => c.id === p.customerId)?.name || "Cliente",
        amount: p.amount,
      })),
      directPayments: [],
      expenses: expenses.slice(0, 2).map((e) => ({ id: e.id, name: e.concept, amount: e.amount })),
      totals: {
        ordersAmount: money(orders.slice(0, 2).reduce((s, o) => s + o.total, 0)),
        ordersCount: Math.min(2, orders.length),
        posSalesAmount: posSales[0]?.total || 0,
        posSalesCount: posSales.length ? 1 : 0,
        posIncomeAmount: posSales[0]?.total || 0,
        posIncomeCount: posSales.length ? 1 : 0,
        collectedAmount: payments[0]?.amount || 0,
        expensesAmount: money(expenses.slice(0, 2).reduce((s, e) => s + e.amount, 0)),
      },
    },
    periodDetailTemplate: {
      orders: orders.map((o) => ({ id: o.id, customer: o.customer.name, total: o.total, status: o.status })),
      posSales: [{ id: 1, total: money(posSales.reduce((s, p) => s + p.total, 0)), items: posSales.reduce((s, p) => s + p.itemsCount, 0) }],
      incomes: [{ id: 1, concept: "Ventas del período", amount: monthIncome }],
      abonos: payments.slice(0, 3).map((p) => ({
        id: p.id,
        customer: customers.find((c) => c.id === p.customerId)?.name || "Cliente",
        amount: p.amount,
      })),
      directPayments: [],
      expenses: expenses.slice(0, 4).map((e) => ({ id: e.id, name: e.concept, amount: e.amount })),
      totals: {
        ordersAmount: money(orders.reduce((s, o) => s + o.total, 0)),
        ordersCount: orders.length,
        posSalesAmount: money(posSales.reduce((s, p) => s + p.total, 0)),
        posSalesCount: posSales.length,
        posIncomeAmount: money(posSales.reduce((s, p) => s + p.total, 0)),
        posIncomeCount: posSales.length,
        collectedAmount: money(payments.reduce((s, p) => s + p.amount, 0)),
        expensesAmount: monthExpense,
      },
    },
  };

  mkdirSync(dirname(outPath), { recursive: true });
  const file = `/**
 * AUTO-GENERADO — sample de TODAS las tablas BD + dataset UI.
 * npm run generate:guest-data
 *
 * Tablas: ${dataset.meta.tablesSampled}/${dataset.meta.tablesTotal} con filas
 * Pedidos=${orders.length} Mov=${movements.length} Ing=${incomes.length} Gas=${expenses.length}
 */
const guestDataset = ${JSON.stringify(dataset, null, 2)};

export default guestDataset;
`;
  writeFileSync(outPath, file, "utf8");

  console.log("\nOK →", outPath);
  console.log(`Tablas muestreadas: ${dataset.meta.tablesSampled}/${dataset.meta.tablesTotal}`);
  console.log(dataset.meta.counts);
  console.log("Balance demo $", balance);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
