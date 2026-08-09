/**
 * Exporta reporte de facturas (ventas/compras) a .xlsx
 * Columnas alineadas al formato "Reporte de Facturas" (JAS TROYA / facturación diaria).
 */
import * as XLSX from "xlsx";

const SALES_HEADERS = [
  "Fecha",
  "Establecimiento",
  "Punto Emision",
  "Secuencial",
  "Cliente",
  "Direccion",
  "Telefono",
  "Identificacion",
  "Correo",
  "Subtotal 0%",
  "Subtotal 12%",
  "Subtotal 13%",
  "Subtotal 15%",
  "Subtotal 5%",
  "Subtotal No Objeto",
  "Subtotal Exento",
  "Subtotal Sin Impuestos",
  "ICE",
  "IVA",
  "Total",
  "Estado",
  "Ambiente",
  "Vendedor",
  "Clave Acceso",
  "Costo General",
  "Utilidad General",
  "Propina",
];

const PURCHASE_HEADERS = [
  "Fecha",
  "Establecimiento",
  "Punto Emision",
  "Secuencial",
  "Proveedor",
  "Direccion",
  "Telefono",
  "Identificacion",
  "Correo",
  "Subtotal 0%",
  "Subtotal 12%",
  "Subtotal 13%",
  "Subtotal 15%",
  "Subtotal 5%",
  "Subtotal No Objeto",
  "Subtotal Exento",
  "Subtotal Sin Impuestos",
  "ICE",
  "IVA",
  "Total",
  "Estado",
  "Ambiente",
  "Usuario",
  "Clave Acceso",
  "Costo General",
  "Utilidad General",
  "Propina",
];

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round2(v) {
  return Number(num(v).toFixed(2));
}

/** Reparte subtotales (sin IVA) por tarifa a partir de ítems. */
export function subtotalsByTaxRate(items = []) {
  const out = {
    s0: 0,
    s5: 0,
    s12: 0,
    s13: 0,
    s15: 0,
    noObjeto: 0,
    exento: 0,
  };
  for (const it of items) {
    const qty = num(it.quantity);
    const price = num(it.unitPrice ?? it.price);
    const rate = num(it.taxRate ?? it.ivaRate);
    let sub = it.subtotal != null ? num(it.subtotal) : qty * price;
    // Si el subtotal no viene y el precio parece con IVA incluido (ventas POS),
    // los ítems de getPosSales ya traen subtotal neto.
    if (it.subtotal == null && rate > 0 && it.lineTotal != null) {
      sub = num(it.lineTotal) / (1 + rate / 100);
    } else if (it.subtotal == null && rate > 0 && it.iva == null) {
      // Pedido proveedor: unitPrice suele ser neto + taxRate aparte
      sub = qty * price;
    }
    if (rate === 0) out.s0 += sub;
    else if (rate === 5) out.s5 += sub;
    else if (rate === 12) out.s12 += sub;
    else if (rate === 13) out.s13 += sub;
    else if (rate === 15) out.s15 += sub;
    else if (rate > 0) out.s15 += sub; // otras tarifas → columna 15%
    else out.s0 += sub;
  }
  for (const k of Object.keys(out)) out[k] = round2(out[k]);
  out.sinImpuestos = round2(
    out.s0 + out.s5 + out.s12 + out.s13 + out.s15 + out.noObjeto + out.exento,
  );
  return out;
}

function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

function appendFooter(aoa, { totalAuthorized, totalAnulados = 0, totalCosto = 0, totalUtilidad = 0, label = "Facturas" }) {
  aoa.push([]);
  aoa.push([`Total de ${label}`, "", round2(totalAuthorized)]);
  aoa.push(["Total Anulados Mediante Solicitud SRI", "", round2(totalAnulados)]);
  aoa.push(["RECUERDE QUE DEBE DECLARAR TAMBIÉN LAS NOTAS DE CRÉDITO EMITIDAS"]);
  aoa.push([
    `* Para el Total en ${label} solo se estan considerando las facturas en estado Autorizado`,
  ]);
  aoa.push([
    `* Para el Total en ${label}+Pendiente de Autorizaciooón solo se estan considerando las facturas en estado Autorizado`,
  ]);
  aoa.push(["Total Costo Global", "", round2(totalCosto)]);
  aoa.push(["Total Utilidad Global", "", round2(totalUtilidad)]);
}

/**
 * @param {object[]} salesRows filas ya filtradas del SalesHub (con items, sri, customer…)
 * @param {{ fileName?: string, sheetName?: string }} [opts]
 */
export function exportSalesInvoicesExcel(salesRows, opts = {}) {
  const dateTo = opts.dateTo || new Date().toISOString().slice(0, 10);
  const fileName =
    opts.fileName || `Reporte de Facturas del ${dateTo}.xlsx`;
  const sheetName = opts.sheetName || "Facturas";

  const aoa = [SALES_HEADERS];
  let totalAuthorized = 0;
  let totalAnulados = 0;
  let totalCosto = 0;
  let totalUtilidad = 0;

  for (const s of salesRows) {
    const sri = s.sri || {};
    const customer = s.customer || {};
    const items = Array.isArray(s.items) ? s.items : [];
    const tax = subtotalsByTaxRate(items);
    const status = String(sri.statusLabel || s.status || "—");
    const total = round2(s.total);
    const ice = round2(s.ice);
    const iva = round2(s.iva);
    const costo = round2(s.costoGeneral ?? s.costTotal ?? 0);
    const utilidad = round2(
      s.utilidadGeneral ?? s.utility ?? Math.max(0, tax.sinImpuestos - costo),
    );
    const isAuth = /autoriz/i.test(status);
    const isAnul = /anul/i.test(status) || /cancel/i.test(status);
    if (isAuth) totalAuthorized += total;
    if (isAnul) totalAnulados += total;
    totalCosto += costo;
    totalUtilidad += utilidad;

    const estab = String(sri.establishmentCode || "").padStart(3, "0") || "—";
    const pto = String(sri.emissionPointCode || "").padStart(3, "0") || "—";
    const seq =
      sri.sequentialLabel && sri.sequentialLabel !== "—"
        ? sri.sequentialLabel
        : s.numero && s.numero !== "—"
          ? String(s.numero).padStart(9, "0")
          : "";

    const ident =
      s.documentType === "consumidor_final"
        ? "9999999999999"
        : String(customer.cedula || customer.identificacion || "").trim();

    aoa.push([
      s.dateIso || s.emissionDate || "",
      estab === "000" ? "" : estab,
      pto === "000" ? "" : pto,
      seq,
      s.customerLabel ||
        (s.documentType === "consumidor_final"
          ? "CONSUMIDOR FINAL"
          : String(customer.name || "—").toUpperCase()),
      customer.address || "N/D",
      customer.phone || "N/D",
      ident ? `'${ident}` : "",
      customer.email ? `'${customer.email}` : "",
      tax.s0,
      tax.s12,
      tax.s13,
      tax.s15,
      tax.s5,
      tax.noObjeto,
      tax.exento,
      tax.sinImpuestos || round2(s.subtotal),
      ice,
      iva,
      total,
      status,
      sri.environmentLabel || "",
      s.sellerLabel || s.sellerName || "—",
      sri.accessKey || "",
      costo,
      utilidad,
      round2(s.propina || 0),
    ]);
  }

  appendFooter(aoa, {
    totalAuthorized,
    totalAnulados,
    totalCosto,
    totalUtilidad,
    label: "Facturas",
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  downloadWorkbook(wb, fileName);
}

/**
 * @param {object[]} purchaseRows filas filtradas de PurchasesHub
 */
export function exportPurchasesInvoicesExcel(purchaseRows, opts = {}) {
  const dateTo = opts.dateTo || new Date().toISOString().slice(0, 10);
  const fileName =
    opts.fileName || `Reporte de Compras del ${dateTo}.xlsx`;
  const sheetName = opts.sheetName || "Compras";

  const aoa = [PURCHASE_HEADERS];
  let totalAuthorized = 0;
  let totalAnulados = 0;
  let totalCosto = 0;

  for (const o of purchaseRows) {
    const supplier =
      o.ERP_supplier || o.supplier || {};
    const items = o.ERP_supplier_order_items || o.items || [];
    const tax = subtotalsByTaxRate(
      items.map((it) => ({
        quantity: it.quantity,
        unitPrice: it.unitPrice ?? it.price,
        taxRate: it.taxRate ?? it.ivaRate,
        subtotal:
          it.subtotal != null
            ? it.subtotal
            : num(it.quantity) * num(it.unitPrice ?? it.price),
      })),
    );
    const total = round2(o.total ?? o.totalAmount);
    const iva = round2(o.iva);
    const ice = round2(o.ice || 0);
    const status = String(o.statusLabel || o.status || "Registrado");
    const isAnul = /anul|cancel/i.test(status);
    // Compras: sumamos todas las no anuladas como "total"
    if (!isAnul) totalAuthorized += total;
    else totalAnulados += total;
    totalCosto += tax.sinImpuestos || round2(o.subtotal);

    const estab = String(o.establishmentCode || o.estab || "").trim();
    const pto = String(o.emissionPointCode || o.ptoEmi || "").trim();
    const seq = String(
      o.invoiceSequential ||
        o.sequential ||
        o.supplierInvoiceNumber ||
        o.numero ||
        o.id ||
        "",
    ).replace(/\D/g, "");
    const seqLabel = seq ? seq.padStart(9, "0") : String(o.id || "").padStart(9, "0");

    aoa.push([
      o.dateIso || o.emissionDate || "",
      estab ? estab.padStart(3, "0") : "",
      pto ? pto.padStart(3, "0") : "",
      seqLabel,
      o.supplierLabel ||
        String(supplier.name || o.supplierName || "—").toUpperCase(),
      supplier.address || "N/D",
      supplier.phone || "N/D",
      supplier.ruc || supplier.cedula || supplier.identificacion
        ? `'${supplier.ruc || supplier.cedula || supplier.identificacion}`
        : "",
      supplier.email ? `'${supplier.email}` : "",
      tax.s0,
      tax.s12,
      tax.s13,
      tax.s15,
      tax.s5,
      tax.noObjeto,
      tax.exento,
      tax.sinImpuestos || round2(o.subtotal),
      ice,
      iva,
      total,
      status,
      o.environmentLabel || "",
      o.userName || o.createdByName || "—",
      o.accessKey || "",
      tax.sinImpuestos || round2(o.subtotal),
      0,
      0,
    ]);
  }

  appendFooter(aoa, {
    totalAuthorized,
    totalAnulados,
    totalCosto,
    totalUtilidad: 0,
    label: "Compras",
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  downloadWorkbook(wb, fileName);
}
