import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import AssignmentIcon from "@mui/icons-material/Assignment";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PrintIcon from "@mui/icons-material/Print";
import EditIcon from "@mui/icons-material/Edit";
import TablePro from "../../../components/Tables/TablePro.jsx";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog.jsx";
import TourHelpButton from "../../../components/TourHelpButton.jsx";
import InvoiceHubDetailDialog from "./components/InvoiceHubDetailDialog.jsx";
import { getAllSupplierOrdersRequest } from "../../../api/ordersRequest.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { APP_ROUTES } from "../../../config/appRoutes.js";
import { usePageTour } from "../../../hooks/usePageTour.js";
import { COMPRAS_HUB_TOUR_ID, getComprasHubTourSteps } from "../../../tours/comprasHubTour.js";
import {
  PEDIDO_PROVEEDOR_FORM_TOUR_ID,
  getPedidoProveedorFormTourSteps,
} from "../../../tours/pedidoProveedorFormTour.js";
import SupplierOrderForm, {
  SUPPLIER_ORDER_DIALOG_CONTENT_SX,
  SUPPLIER_ORDER_DIALOG_PAPER_SX,
} from "./components/SupplierOrderForm.jsx";
import { exportPurchasesInvoicesExcel } from "../../../utils/exportInvoiceReportExcel.js";
import { getPurchaseHubStatus, InvoiceHubStatusIcon } from "./components/invoiceHubStatus.jsx";

const MONEY_COL = {
  align: "right",
  minWidth: 52,
  cellSx: { px: 0.2, width: "1px", whiteSpace: "nowrap" },
  headerSx: { px: 0.2, width: "1px", whiteSpace: "nowrap" },
};

/** Columna de texto de ancho fijo: recorta con puntos suspensivos. */
const TEXT_COL = (px) => ({
  width: px,
  maxWidth: px,
  cellSx: {
    width: px,
    maxWidth: px,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  headerSx: { width: px, maxWidth: px },
});

/** Absorbe el ancho sobrante para que no se estiren las demás columnas. */
const SPACER_COL = {
  id: "_spacer",
  label: "",
  sortable: false,
  cellSx: { width: "100%", p: 0 },
  headerSx: { width: "100%", p: 0 },
  render: () => null,
};

function printPurchaseReport(row) {
  if (!row) return;
  const moneyFmt = (n) => Number(n || 0).toFixed(2);
  const items = row.ERP_supplier_order_items || row.items || [];
  const supplier = row.ERP_supplier || row.supplier || {};
  const itemRows = (Array.isArray(items) ? items : [])
    .map((it) => {
      const qty = Number(it.quantity || 0);
      const price = Number(it.unitPrice ?? it.price ?? 0);
      const name =
        it.name ||
        it.productName ||
        it.ERP_inventory_product?.name ||
        "Ítem";
      return `<tr><td>${name}</td><td style="text-align:right">${qty}</td><td style="text-align:right">$${moneyFmt(price)}</td><td style="text-align:right">$${moneyFmt(qty * price)}</td></tr>`;
    })
    .join("");
  const html = `<!doctype html><html><head><title>Compra ${row.numero || row.id}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111}
      h1{font-size:18px;margin:0 0 8px}
      .muted{color:#666;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
      th{background:#f5f5f5}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:13px}
      .label{color:#666}
    </style></head><body>
    <h1>Compra / factura proveedor</h1>
    <div class="muted">${row.emissionDate || "—"} · Nº ${row.invoiceNumber || row.numero || row.id}</div>
    <div class="grid">
      <div><span class="label">Proveedor:</span> <strong>${row.supplierLabel || supplier.name || "—"}</strong></div>
      <div><span class="label">RUC/Cédula:</span> ${supplier.ruc || supplier.cedula || "—"}</div>
      <div><span class="label">Teléfono:</span> ${supplier.phone || "—"}</div>
      <div><span class="label">Email:</span> ${supplier.email || "—"}</div>
      <div><span class="label">Subtotal:</span> $${moneyFmt(row.subtotal)}</div>
      <div><span class="label">IVA:</span> $${moneyFmt(row.iva)}</div>
      <div><span class="label">Descuento:</span> $${moneyFmt(row.discount)}</div>
      <div><span class="label">Total:</span> <strong>$${moneyFmt(row.total)}</strong></div>
      <div><span class="label">Efectivo:</span> $${moneyFmt(row.cash)}</div>
      <div><span class="label">Chq/Bco:</span> $${moneyFmt(row.checkBank)}</div>
      <div><span class="label">Tarjeta:</span> $${moneyFmt(row.card)}</div>
      <div><span class="label">Otros:</span> $${moneyFmt(row.other)}</div>
    </div>
    <table><thead><tr><th>Producto</th><th>Cant.</th><th>P. unit.</th><th>Total</th></tr></thead>
    <tbody>${itemRows || '<tr><td colspan="4">Sin ítems</td></tr>'}</tbody></table>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`;
  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

const money = (n) => Number(n || 0).toFixed(2);

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthStartIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function orderDateIso(order) {
  const raw = order?.date || order?.receivedAt || order?.paidAt || "";
  if (!raw) return "";
  const s = String(raw);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function paymentBucketsFromList(payments = [], fallbackTotal = 0, paidAt = null) {
  const out = { cash: 0, checkBank: 0, card: 0, other: 0 };
  const list = Array.isArray(payments) ? payments : [];
  if (list.length) {
    for (const p of list) {
      const t = Number(p.amount || 0);
      const m = String(p.method || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (m.includes("efectivo")) out.cash += t;
      else if (
        m.includes("transfer") ||
        m.includes("deposito") ||
        m.includes("cheque") ||
        m.includes("banco")
      ) {
        out.checkBank += t;
      } else if (m.includes("tarjeta")) out.card += t;
      else out.other += t;
    }
    return out;
  }
  if (paidAt && fallbackTotal > 0) out.other = Number(fallbackTotal);
  return out;
}

/** Parsea Nº factura proveedor: "001-001-000000123" → estab-ptoEmi + secuencial. */
function splitSupplierInvoiceNumber(raw) {
  const invoiceNumber = String(raw || "").trim();
  if (!invoiceNumber) {
    return { invoiceNumber: "", estabPtoEmi: "—", numero: "—" };
  }
  const parts = invoiceNumber.split("-").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const estab = parts[0].padStart(3, "0");
    const pto = parts[1].padStart(3, "0");
    const seq = parts.slice(2).join("").replace(/\D/g, "") || parts[2];
    return {
      invoiceNumber,
      estabPtoEmi: `${estab}-${pto}`,
      numero: seq ? String(seq).padStart(9, "0") : invoiceNumber,
    };
  }
  const digits = invoiceNumber.replace(/\D/g, "");
  return {
    invoiceNumber,
    estabPtoEmi: "—",
    numero: digits ? digits.padStart(9, "0") : invoiceNumber,
  };
}

/** Normaliza un pedido a proveedor para la tabla y el modal de detalle. */
function mapPurchaseRow(o) {
  const dateIso = orderDateIso(o);
  const total = Number(o.totalAmount ?? o.total ?? 0);
  const supplierName = String(
    o.ERP_supplier?.name || o.supplier?.name || o.supplierName || "—",
  ).toUpperCase();
  const items = o.ERP_supplier_order_items || o.items || [];
  let subtotal = 0;
  let iva = 0;
  for (const it of items) {
    const line = Number(it.quantity || 0) * Number(it.unitPrice || it.price || 0);
    const rate = Number(it.taxRate || it.ivaRate || 0);
    if (rate > 0) {
      subtotal += line;
      iva += line * (rate / 100);
    } else {
      subtotal += line;
    }
  }
  if (!items.length) {
    subtotal = total;
    iva = 0;
  } else {
    subtotal = Number(subtotal.toFixed(2));
    iva = Number(iva.toFixed(2));
  }
  const discount = Number(o.discount || o.discountAmount || 0);
  const retention = Number(o.retention || o.withholdingAmount || 0);
  const pay = paymentBucketsFromList(o.payments, o.paidAmount || total, o.paidAt);
  const inv = splitSupplierInvoiceNumber(o.invoiceNumber);
  return {
    ...o,
    dateIso,
    emissionDate: dateIso || "—",
    invoiceNumber: inv.invoiceNumber || o.invoiceNumber || "",
    estabPtoEmi: inv.estabPtoEmi,
    numero: inv.numero,
    supplierLabel: supplierName,
    subtotal: Number(subtotal.toFixed(2)),
    discount,
    iva: Number(iva.toFixed(2)),
    total: Number(total.toFixed(2)),
    cash: pay.cash,
    checkBank: pay.checkBank,
    card: pay.card,
    other: pay.other,
    retention,
    subtotalLabel: money(subtotal),
    discountLabel: money(discount),
    ivaLabel: money(iva),
    totalLabel: money(total),
    cashLabel: money(pay.cash),
    checkBankLabel: money(pay.checkBank),
    cardLabel: money(pay.card),
    otherLabel: money(pay.other),
    retentionLabel: money(retention),
    hubStatus: getPurchaseHubStatus(o),
  };
}

/** Compras: registrar factura proveedor + reporte diario. */
export default function PurchasesHubPage() {
  const { toast } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  /** Historial completo (sin rango de fechas) para la pestaña general del proveedor. */
  const [historyRows, setHistoryRows] = useState(null);
  const supplierFormTourRef = useRef(null);
  const [filters, setFilters] = useState({
    dateFrom: monthStartIso(),
    dateTo: todayIso(),
  });

  const load = async (from, to) => {
    setLoading(true);
    try {
      const { data } = await getAllSupplierOrdersRequest({
        from: from ? new Date(`${from}T00:00:00`) : undefined,
        to: to ? new Date(`${to}T23:59:59`) : undefined,
      });
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      void toast?.({
        message:
          e?.response?.data?.message || "No se pudo cargar el reporte de compras.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => void load(filters.dateFrom, filters.dateTo);

  const openNewPurchase = () => {
    setIsEditing(false);
    setOrderToEdit(null);
    setFormOpen(true);
  };

  const openEditPurchase = (row) => {
    setIsEditing(true);
    setOrderToEdit(row);
    setFormOpen(true);
  };

  /** Abre el detalle y trae (una sola vez) todas las compras para el historial. */
  const openDetail = async (row) => {
    setDetailRow(row);
    if (historyRows) return;
    try {
      const { data } = await getAllSupplierOrdersRequest({});
      setHistoryRows((Array.isArray(data) ? data : []).map((o) => mapPurchaseRow(o)));
    } catch {
      setHistoryRows([]);
    }
  };

  const closeForm = () => {
    setFormOpen(false);
    setIsEditing(false);
    setOrderToEdit(null);
  };

  // Al cambiar fechas, recargar (debounce corto).
  useEffect(() => {
    const t = setTimeout(() => {
      void load(filters.dateFrom, filters.dateTo);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateFrom, filters.dateTo]);

  const rows = useMemo(() => {
    return orders
      .map((o) => mapPurchaseRow(o))
      .sort((a, b) => String(b.dateIso).localeCompare(String(a.dateIso)));
  }, [orders]);

  const totals = useMemo(() => {
    const sum = (key) => rows.reduce((a, r) => a + Number(r[key] || 0), 0);
    return {
      subtotal: sum("subtotal"),
      discount: sum("discount"),
      iva: sum("iva"),
      total: sum("total"),
      cash: sum("cash"),
      checkBank: sum("checkBank"),
      card: sum("card"),
      other: sum("other"),
      retention: sum("retention"),
    };
  }, [rows]);

  const exportExcel = () => {
    if (!rows.length) {
      void toast?.({
        message: "No hay filas para exportar con el filtro actual.",
        variant: "warning",
      });
      return;
    }
    try {
      exportPurchasesInvoicesExcel(rows, {
        dateTo: filters.dateTo || todayIso(),
        fileName: `Reporte de Compras del ${filters.dateFrom || ""} al ${filters.dateTo || todayIso()}.xlsx`,
      });
      void toast?.({ message: "Excel descargado.", variant: "success" });
    } catch (e) {
      void toast?.({
        message: e?.message || "No se pudo generar el Excel.",
        variant: "error",
      });
    }
  };

  const { startTour } = usePageTour({
    tourId: COMPRAS_HUB_TOUR_ID,
    getSteps: getComprasHubTourSteps,
    enabled: !loading,
  });

  const { startTour: startProveedorFormTour } = usePageTour({
    tourId: PEDIDO_PROVEEDOR_FORM_TOUR_ID,
    getSteps: getPedidoProveedorFormTourSteps,
    enabled: formOpen && !isEditing,
    autoDelayMs: 450,
    onDestroyed: () => supplierFormTourRef.current?.resetDemo?.(),
  });

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
        data-tour="compras-hub-header"
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="h5" fontWeight={800}>
              Compras
            </Typography>
            <TourHelpButton onClick={startTour} title="Ver tutorial de compras" />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Registrá la factura del proveedor (XML o manual), cargá productos y revisá el
            reporte por día.
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          data-tour="compras-hub-actions-bar"
          sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
        >
          <Button
            variant="outlined"
            startIcon={<AssignmentIcon />}
            onClick={() => navigate(APP_ROUTES.sales.orders)}
            sx={{ whiteSpace: "nowrap" }}
          >
            Ver pedidos
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownloadIcon />}
            onClick={exportExcel}
            disabled={loading || !rows.length}
          >
            Exportar Excel
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNewPurchase}>
            Nueva compra
          </Button>
        </Stack>
      </Stack>

      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 2, borderRadius: 2 }}
        data-tour="compras-hub-filters"
      >
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
          Filtros de búsqueda
        </Typography>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Fecha inicio"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filters.dateFrom}
              onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Fecha fin"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filters.dateTo}
              onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <Button
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={() =>
                setFilters({
                  dateFrom: monthStartIso(),
                  dateTo: todayIso(),
                })
              }
            >
              Limpiar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TablePro
        title="Compras x día"
        rows={rows}
        dense
        tableMaxHeight="calc(100vh - 320px)"
        columns={[
          { id: "emissionDate", label: "Fecha", minWidth: 88 },
          { id: "estabPtoEmi", label: "Estab", minWidth: 72 },
          { id: "numero", label: "Nº factura", minWidth: 96 },
          { id: "supplierLabel", label: "Proveedor", ...TEXT_COL(140) },
          { id: "subtotalLabel", label: "Subtotal", ...MONEY_COL },
          { id: "discountLabel", label: "Desc.", ...MONEY_COL },
          { id: "ivaLabel", label: "IVA", ...MONEY_COL },
          { id: "totalLabel", label: "Total", ...MONEY_COL },
          { id: "cashLabel", label: "Efectivo", ...MONEY_COL },
          { id: "checkBankLabel", label: "Chq/Bco", ...MONEY_COL },
          { id: "cardLabel", label: "Tarjeta", ...MONEY_COL },
          { id: "otherLabel", label: "Otros", ...MONEY_COL },
          { id: "retentionLabel", label: "Ret.", ...MONEY_COL },
          {
            id: "actions",
            label: "Acciones",
            stopRowClick: true,
            minWidth: 140,
            cellSx: { width: "1px", px: 0.25, whiteSpace: "nowrap" },
            headerSx: { width: "1px", px: 0.25, whiteSpace: "nowrap" },
            getSearchValue: (row) => row.hubStatus?.label || "",
            render: (row) => (
              <Stack
                direction="row"
                spacing={0.25}
                alignItems="center"
                justifyContent="flex-end"
                data-tour="compras-hub-row-actions"
              >
                <InvoiceHubStatusIcon status={row.hubStatus} />
                <Tooltip title="Ver detalle">
                  <IconButton size="small" color="primary" onClick={() => void openDetail(row)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Imprimir">
                  <IconButton size="small" color="primary" onClick={() => printPurchaseReport(row)}>
                    <PrintIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Editar">
                  <IconButton size="small" color="primary" onClick={() => openEditPurchase(row)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ),
          },
          SPACER_COL,
        ]}
        showSearch
        showPagination
        showIndex={false}
        defaultRowsPerPage={25}
        rowsPerPageOptions={[15, 25, 50, 100]}
        loading={loading}
        dataTour="compras-hub-table"
        dataTourSearch="compras-hub-search"
      />

      <Paper
        variant="outlined"
        sx={{ mt: 1.5, p: 1.5, borderRadius: 2 }}
        data-tour="compras-hub-totals"
      >
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <strong>Totales:</strong> Subtotal {money(totals.subtotal)} · Descuento{" "}
          {money(totals.discount)} · IVA {money(totals.iva)} · Total {money(totals.total)}
        </Typography>
        <Typography variant="body2">
          Efectivo {money(totals.cash)} · Cheque/Banco {money(totals.checkBank)} · Tarjeta{" "}
          {money(totals.card)} · Otros {money(totals.other)} · Retención {money(totals.retention)}
        </Typography>
      </Paper>

      <InvoiceHubDetailDialog
        open={Boolean(detailRow)}
        onClose={() => setDetailRow(null)}
        row={detailRow}
        rows={historyRows || rows}
        partyKind="supplier"
        onPrint={(row) => {
          setDetailRow(null);
          printPurchaseReport(row);
        }}
      />

      <SimpleDialog
        open={formOpen}
        onClose={closeForm}
        tittle={isEditing ? "Editar compra / pedido a proveedor" : "Nueva compra a proveedor"}
        maxWidth="xl"
        fullWidth
        paperSx={SUPPLIER_ORDER_DIALOG_PAPER_SX}
        contentSx={SUPPLIER_ORDER_DIALOG_CONTENT_SX}
        titleExtra={
          !isEditing ? (
            <TourHelpButton
              onClick={startProveedorFormTour}
              title="Ver tutorial de este formulario"
            />
          ) : null
        }
      >
        <SupplierOrderForm
          ref={supplierFormTourRef}
          onClose={closeForm}
          reload={refresh}
          isEditing={isEditing}
          datos={orderToEdit}
          active={formOpen}
        />
      </SimpleDialog>
    </Box>
  );
}
