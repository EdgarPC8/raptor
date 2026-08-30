import { addMonths, endOfMonth, parseISO, startOfMonth, subMonths } from "date-fns";
import {
  getAllOrdersRequest,
  getAllSupplierOrdersRequest,
} from "../../../../api/ordersRequest.js";

function parseHintDate(value) {
  if (!value) return new Date();
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = parseISO(s.slice(0, 10));
    if (!Number.isNaN(d.getTime())) return d;
  }
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function orderDateRange(hintDate) {
  const base = parseHintDate(hintDate);
  return {
    from: startOfMonth(subMonths(base, 1)),
    to: endOfMonth(addMonths(base, 1)),
  };
}

export function mapCustomerOrderToForm(order) {
  if (!order?.id) return null;
  const items = order.ERP_order_items || order.items || [];
  return {
    id: order.id,
    customerId: order.customerId,
    date: order.date,
    notes: order.notes || "",
    status: order.status,
    paidAt: order.paidAt || null,
    deliveredAt: order.deliveredAt || null,
    paymentInstallments: order.paymentInstallments || [],
    ERP_order_items: items.map((it) => ({
      id: it.id,
      productId: it.productId,
      quantity: it.quantity ?? it.qty,
      soldQty: it.soldQty,
      damagedQty: it.damagedQty,
      giftQty: it.giftQty,
      replacedQty: it.replacedQty,
      price: it.price ?? it.unitPrice,
      deliveredAt: it.deliveredAt || null,
      paidAt: it.paidAt || null,
      packKey: it.packKey || null,
      packName: it.packName || null,
      lotCode: it.lotCode || null,
      expiresAt: it.expiresAt || null,
      manufacturedAt: it.manufacturedAt || null,
      ERP_inventory_product: it.ERP_inventory_product || {
        id: it.productId,
        name:
          it.ERP_inventory_product?.name ||
          it.product ||
          it.productName ||
          it.name ||
          "(sin nombre)",
      },
    })),
  };
}

/**
 * Une pedido de /orders con el stub de cobranzas (que ya trae pacas).
 * Prioriza packKey/packName del stub si el fetch no los trae.
 */
export function mergeCustomerOrderForEdit(fetched, stub) {
  const fromApi = mapCustomerOrderToForm(fetched);
  const fromStub = mapCustomerOrderToForm(stub);
  if (!fromApi && !fromStub) return null;
  if (!fromApi) return fromStub;
  if (!fromStub) return fromApi;

  const stubById = new Map(
    (fromStub.ERP_order_items || []).map((it) => [Number(it.id), it]),
  );

  return {
    ...fromApi,
    notes: fromApi.notes || fromStub.notes || "",
    paymentInstallments:
      Array.isArray(fromApi.paymentInstallments) && fromApi.paymentInstallments.length
        ? fromApi.paymentInstallments
        : fromStub.paymentInstallments || [],
    ERP_order_items: (fromApi.ERP_order_items || []).map((it) => {
      const s = stubById.get(Number(it.id));
      if (!s) return it;
      return {
        ...it,
        quantity: it.quantity ?? s.quantity,
        price: it.price ?? s.price,
        packKey: it.packKey || s.packKey || null,
        packName: it.packName || s.packName || null,
        lotCode: it.lotCode || s.lotCode || null,
        expiresAt: it.expiresAt || s.expiresAt || null,
        manufacturedAt: it.manufacturedAt || s.manufacturedAt || null,
        ERP_inventory_product:
          it.ERP_inventory_product?.name
            ? it.ERP_inventory_product
            : s.ERP_inventory_product || it.ERP_inventory_product,
      };
    }),
  };
}

export function mapSupplierOrderToForm(order) {
  if (!order?.id) return null;
  const items = order.ERP_supplier_order_items || order.items || [];
  return {
    id: order.id,
    supplierId: order.supplierId,
    date: order.date,
    notes: order.notes || "",
    status: order.status,
    invoiceNumber: order.invoiceNumber || null,
    receivedAt: order.receivedAt || null,
    paidAt: order.paidAt || null,
    paymentInstallments: order.paymentInstallments || [],
    ERP_supplier_order_items: items.map((it) => ({
      id: it.id,
      productId: it.productId,
      quantity: it.quantity ?? it.qty,
      unitPrice: it.unitPrice ?? it.price,
      discount: it.discount ?? 0,
      taxRate: it.taxRate ?? 0,
      packKey: it.packKey || null,
      packName: it.packName || null,
      lotCode: it.lotCode || null,
      expiresAt: it.expiresAt || null,
      manufacturedAt: it.manufacturedAt || null,
      ERP_inventory_product: it.ERP_inventory_product || {
        id: it.productId,
        name:
          it.ERP_inventory_product?.name ||
          it.product ||
          it.productName ||
          it.name ||
          "(sin nombre)",
      },
    })),
  };
}

/** Une fetch de proveedores con stub de cuentas por pagar (pacas). */
export function mergeSupplierOrderForEdit(fetched, stub) {
  const fromApi = mapSupplierOrderToForm(fetched);
  const fromStub = mapSupplierOrderToForm(stub);
  if (!fromApi && !fromStub) return null;
  if (!fromApi) return fromStub;
  if (!fromStub) return fromApi;

  const stubById = new Map(
    (fromStub.ERP_supplier_order_items || []).map((it) => [Number(it.id), it]),
  );

  return {
    ...fromApi,
    notes: fromApi.notes || fromStub.notes || "",
    paymentInstallments:
      Array.isArray(fromApi.paymentInstallments) && fromApi.paymentInstallments.length
        ? fromApi.paymentInstallments
        : fromStub.paymentInstallments || [],
    ERP_supplier_order_items: (fromApi.ERP_supplier_order_items || []).map((it) => {
      const s = stubById.get(Number(it.id));
      if (!s) return it;
      return {
        ...it,
        quantity: it.quantity ?? s.quantity,
        unitPrice: it.unitPrice ?? s.unitPrice,
        packKey: it.packKey || s.packKey || null,
        packName: it.packName || s.packName || null,
        lotCode: it.lotCode || s.lotCode || null,
        expiresAt: it.expiresAt || s.expiresAt || null,
        manufacturedAt: it.manufacturedAt || s.manufacturedAt || null,
        ERP_inventory_product:
          it.ERP_inventory_product?.name
            ? it.ERP_inventory_product
            : s.ERP_inventory_product || it.ERP_inventory_product,
      };
    }),
  };
}

export async function fetchCustomerOrderForEdit(orderId, hintDate) {
  const id = Number(orderId);
  if (!Number.isFinite(id)) return null;
  const range = orderDateRange(hintDate);
  const { data } = await getAllOrdersRequest(range);
  const list = Array.isArray(data) ? data : [];
  return list.find((o) => Number(o.id) === id) || null;
}

export async function fetchSupplierOrderForEdit(orderId, hintDate) {
  const id = Number(orderId);
  if (!Number.isFinite(id)) return null;
  const range = orderDateRange(hintDate);
  const { data } = await getAllSupplierOrdersRequest(range);
  const list = Array.isArray(data) ? data : [];
  return list.find((o) => Number(o.id) === id) || null;
}
