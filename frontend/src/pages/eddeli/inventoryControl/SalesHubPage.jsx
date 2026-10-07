import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import AddIcon from "@mui/icons-material/Add";
import AssignmentIcon from "@mui/icons-material/Assignment";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PrintIcon from "@mui/icons-material/Print";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import SendIcon from "@mui/icons-material/Send";
import LinkIcon from "@mui/icons-material/Link";
import TablePro from "../../../components/Tables/TablePro.jsx";
import TableColumnVisibilityControl from "../../../components/Tables/TableColumnVisibilityControl.jsx";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog.jsx";
import TourHelpButton from "../../../components/TourHelpButton.jsx";
import { useTableColumnVisibility } from "../../../hooks/useTableColumnVisibility.js";
import OrderForm, {
  CUSTOMER_ORDER_DIALOG_CONTENT_SX,
  CUSTOMER_ORDER_DIALOG_PAPER_SX,
} from "./components/OrderForm.jsx";
import CustomerOrderPayDialog from "./components/CustomerOrderPayDialog.jsx";
import PrintFormatDialog from "../../../components/saleReceipt/PrintFormatDialog.jsx";
import InvoiceHubDetailDialog from "./components/InvoiceHubDetailDialog.jsx";
import PeerSupplierOrderAcceptDialog from "./components/PeerSupplierOrderAcceptDialog.jsx";
import {
  getPosSalesRequest,
  pushOrderToPeerRequest,
} from "../../../api/ordersRequest.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { usePeerOrderRealtime } from "../../../hooks/usePeerOrderRealtime.js";
import { APP_ROUTES } from "../../../config/appRoutes.js";
import { usePageTour } from "../../../hooks/usePageTour.js";
import { VENTAS_HUB_TOUR_ID, getVentasHubTourSteps } from "../../../tours/ventasHubTour.js";
import { exportSalesInvoicesExcel } from "../../../utils/exportInvoiceReportExcel.js";
import {
  normalizeSaleReceipt,
  paymentMethodLabel,
} from "../../../utils/saleReceiptUtils.js";
import {
  canAbonarHubRow,
  getSaleHubStatus,
  InvoiceHubStatusIcon,
} from "./components/invoiceHubStatus.jsx";
import { formatDateTime } from "../../../helpers/functions.js";

const money = (n) => Number(n || 0).toFixed(2);

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

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthStartIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function saleDateIso(sale) {
  const raw = sale?.sri?.authorizedAt || sale?.date || sale?.paidAt || "";
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Reparte el total en columnas de forma de pago (una venta = un método). */
function paymentBuckets(method, total) {
  const t = Number(total || 0);
  const m = String(method || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const out = { cash: 0, checkBank: 0, card: 0, other: 0 };
  if (m.includes("efectivo")) out.cash = t;
  else if (
    m.includes("transfer") ||
    m.includes("deposito") ||
    m.includes("cheque") ||
    m.includes("banco")
  ) {
    out.checkBank = t;
  } else if (m.includes("tarjeta")) out.card = t;
  else out.other = t;
  return out;
}

/** Reporte de ventas (estilo facturación diaria). */
export default function SalesHubPage() {
  const { toast } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateFrom: monthStartIso(),
    dateTo: todayIso(),
  });
  const [detailRow, setDetailRow] = useState(null);
  const [payOrder, setPayOrder] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(null);
  const [saleOpen, setSaleOpen] = useState(false);
  const [peerAcceptCustomerOrderId, setPeerAcceptCustomerOrderId] = useState(null);

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getPosSalesRequest({ limit: 5000 });
      setSales(data || []);
    } catch (e) {
      void toast?.({
        message:
          e?.response?.data?.message || "No se pudo cargar el reporte de ventas.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  useEffect(() => {
    const id = Number(searchParams.get("peerAcceptCustomerOrderId"));
    if (Number.isFinite(id) && id > 0) {
      setPeerAcceptCustomerOrderId(id);
      const next = new URLSearchParams(searchParams);
      next.delete("peerAcceptCustomerOrderId");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  usePeerOrderRealtime({
    onCustomerOrder: useCallback(
      ({ orderId }) => {
        void loadSales();
        if (orderId) setPeerAcceptCustomerOrderId(orderId);
      },
      [loadSales],
    ),
  });

  /** Todas las ventas mapeadas (sin filtro de fecha): base del historial del cliente. */
  const allRows = useMemo(() => {
    return sales
      .map((s) => {
        const dateIso = saleDateIso(s);
        const dateRaw = s?.sri?.authorizedAt || s?.date || s?.paidAt || "";
        const total = Number(s.total || 0);
        const subtotal = Number(s.subtotal || 0);
        const iva = Number(s.iva || 0);
        const discount = Number(s.discount || s.discountAmount || 0);
        const retention = Number(s.retention || s.withholdingAmount || 0);
        const pay = paymentBuckets(s.paymentMethod, total);
        const sri = s.sri || {};
        return {
          ...s,
          dateIso,
          emissionDate: dateRaw ? formatDateTime(dateRaw) : "—",
          estabPtoEmi: sri.estabPtoEmi || "—",
          numero: sri.sequentialLabel || String(s.id || "—"),
          sellerLabel: s.sellerName || "—",
          customerLabel:
            s.documentType === "consumidor_final"
              ? "CONSUMIDOR FINAL"
              : String(s.customer?.name || "—").toUpperCase(),
          paymentMethodLabel: paymentMethodLabel(s.paymentMethod) || s.paymentMethod || "—",
          subtotal,
          discount,
          iva,
          total,
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
          hubStatus: getSaleHubStatus(s),
          remoteApp: s.customer?.remoteApp || null,
          remoteSyncStatus: s.remoteSyncStatus || null,
          remoteSyncSupplierOrderId: s.remoteSyncSupplierOrderId || null,
          remotePeerAcceptStatus: s.remotePeerAcceptStatus || null,
          paidAmount: s.paidAmount,
          remainingAmount: s.remainingAmount,
          isPosSale: Boolean(s.isPosSale),
          peerAcceptStatus: s.peerAcceptStatus || null,
          status: s.status || null,
          allDelivered: Array.isArray(s.items) && s.items.length > 0
            ? s.items.every((it) => it.deliveredAt)
            : false,
        };
      })
      .sort((a, b) => String(b.dateIso).localeCompare(String(a.dateIso)));
  }, [sales]);

  const rows = useMemo(
    () =>
      allRows.filter((row) => {
        if (filters.dateFrom && row.dateIso && row.dateIso < filters.dateFrom) return false;
        if (filters.dateTo && row.dateIso && row.dateIso > filters.dateTo) return false;
        return true;
      }),
    [allRows, filters],
  );

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

  const openPrint = (row) => {
    setPrintReceipt(normalizeSaleReceipt(row));
    setPrintOpen(true);
  };

  const { startTour } = usePageTour({
    tourId: VENTAS_HUB_TOUR_ID,
    getSteps: getVentasHubTourSteps,
    enabled: !loading,
  });

  const exportExcel = () => {
    if (!rows.length) {
      void toast?.({
        message: "No hay filas para exportar con el filtro actual.",
        variant: "warning",
      });
      return;
    }
    try {
      exportSalesInvoicesExcel(rows, {
        dateTo: filters.dateTo || todayIso(),
        fileName: `Reporte de Facturas del ${filters.dateFrom || ""} al ${filters.dateTo || todayIso()}.xlsx`,
      });
      void toast?.({ message: "Excel descargado.", variant: "success" });
    } catch (e) {
      void toast?.({
        message: e?.message || "No se pudo generar el Excel.",
        variant: "error",
      });
    }
  };

  // Columnas Ventas → app_settings.tableColumnVisibility (BD)
  const columns = useMemo(
    () => [
      { id: "emissionDate", label: "Fecha", minWidth: 148 },
      { id: "estabPtoEmi", label: "Estab", minWidth: 72 },
      { id: "numero", label: "Número", minWidth: 84 },
      { id: "sellerLabel", label: "Vendedor", ...TEXT_COL(110) },
      { id: "customerLabel", label: "Cliente", ...TEXT_COL(120) },
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
        minWidth: 160,
        cellSx: { width: "1px", px: 0.25, whiteSpace: "nowrap" },
        headerSx: { width: "1px", px: 0.25, whiteSpace: "nowrap" },
        getSearchValue: (row) => row.hubStatus?.label || "",
        render: (row) => (
          <Stack
            direction="row"
            spacing={0.25}
            alignItems="center"
            justifyContent="flex-end"
            data-tour="ventas-hub-row-actions"
          >
            <InvoiceHubStatusIcon status={row.hubStatus} />
            {row.peerAcceptStatus === "pending_accept" ? (
              <Tooltip title="Aceptar y enlazar productos">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => setPeerAcceptCustomerOrderId(row.id)}
                  aria-label="Aceptar pedido enlazado"
                >
                  <LinkIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            {row.remoteApp &&
            row.peerAcceptStatus !== "pending_accept" &&
            Number(row.remainingAmount || 0) > 0.009 &&
            !row.allDelivered ? (
              <Tooltip
                title={
                  row.remotePeerAcceptStatus === "accepted"
                    ? `Ya aceptado en ${row.remoteApp} (#${row.remoteSyncSupplierOrderId || "—"})`
                    : row.remotePeerAcceptStatus === "pending_accept"
                      ? `Enviado a ${row.remoteApp}, pendiente de aceptación (#${row.remoteSyncSupplierOrderId || "—"})`
                      : String(row.remoteSyncStatus || "").startsWith("synced")
                        ? `Consultar estado / reenviar a ${row.remoteApp} (#${row.remoteSyncSupplierOrderId || "—"})`
                        : `Enviar a ${row.remoteApp} como pedido a proveedor`
                }
              >
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => {
                    void toast?.({
                      promise: pushOrderToPeerRequest(row.id),
                      successMessage: "Pedido enviado al sistema enlazado",
                      onSuccess: () => void loadSales(),
                    });
                  }}
                  aria-label="Enviar al sistema enlazado"
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            {row.peerAcceptStatus !== "pending_accept" && canAbonarHubRow(row.hubStatus) ? (
              <Tooltip title="Abonar">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => setPayOrder(row)}
                  aria-label="Abonar"
                >
                  <AttachMoneyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            <Tooltip title="Ver detalle">
              <IconButton size="small" color="primary" onClick={() => setDetailRow(row)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Imprimir">
              <IconButton size="small" color="primary" onClick={() => openPrint(row)}>
                <PrintIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
      SPACER_COL,
    ],
    [],
  );

  const {
    visibleColumns,
    hiddenIds,
    requiredIds,
    toggleColumn,
  } = useTableColumnVisibility("ventas", columns);

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
        data-tour="ventas-hub-header"
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="h5" fontWeight={800}>
              Reporte de ventas
            </Typography>
            <TourHelpButton onClick={startTour} title="Ver tutorial de ventas" />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Ventas de caja y pedidos a cliente. El estado rojo es sin entrega y sin cobro.
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          data-tour="ventas-hub-actions-bar"
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
            startIcon={<AddIcon />}
            onClick={() => setSaleOpen(true)}
            sx={{ whiteSpace: "nowrap" }}
          >
            Nueva venta
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownloadIcon />}
            onClick={exportExcel}
            disabled={loading || !rows.length}
            sx={{ whiteSpace: "nowrap" }}
          >
            Exportar Excel
          </Button>
        </Stack>
      </Stack>

      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 2, borderRadius: 2 }}
        data-tour="ventas-hub-filters"
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
        title="Facturación x día"
        rows={rows}
        dense
        tableMaxHeight="calc(100vh - 300px)"
        columns={visibleColumns}
        toolbarExtra={
          <TableColumnVisibilityControl
            tableKey="ventas"
            hiddenIds={hiddenIds}
            requiredIds={requiredIds}
            onToggle={toggleColumn}
          />
        }
        showSearch
        showPagination
        showIndex={false}
        defaultRowsPerPage={25}
        rowsPerPageOptions={[15, 25, 50, 100]}
        loading={loading}
        dataTour="ventas-hub-table"
        dataTourSearch="ventas-hub-search"
      />

      <Paper
        variant="outlined"
        sx={{ mt: 1.5, p: 1.5, borderRadius: 2 }}
        data-tour="ventas-hub-totals"
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
        rows={allRows}
        partyKind="customer"
        onPrint={(row) => {
          setDetailRow(null);
          openPrint(row);
        }}
      />

      <PeerSupplierOrderAcceptDialog
        open={Boolean(peerAcceptCustomerOrderId)}
        orderId={peerAcceptCustomerOrderId}
        kind="customer"
        onClose={() => setPeerAcceptCustomerOrderId(null)}
        onAccepted={() => void loadSales()}
        toast={toast}
      />
      <CustomerOrderPayDialog
        open={Boolean(payOrder)}
        order={payOrder}
        onClose={() => setPayOrder(null)}
        toast={toast}
        onPaid={() => void loadSales()}
      />

      <PrintFormatDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        receipt={printReceipt}
      />

      <SimpleDialog
        open={saleOpen}
        onClose={() => setSaleOpen(false)}
        tittle="Venta al cliente"
        maxWidth="lg"
        fullWidth
        paperSx={CUSTOMER_ORDER_DIALOG_PAPER_SX}
        contentSx={CUSTOMER_ORDER_DIALOG_CONTENT_SX}
      >
        <OrderForm
          onClose={() => setSaleOpen(false)}
          reload={() => {}}
          isEditing={false}
          datos={null}
          active={saleOpen}
        />
      </SimpleDialog>
    </Box>
  );
}
