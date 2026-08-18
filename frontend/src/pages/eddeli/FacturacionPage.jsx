import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import VisibilityIcon from "@mui/icons-material/Visibility";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import { Link as RouterLink } from "react-router-dom";
import { APP_ROUTES } from "../../config/appRoutes.js";
import TablePro from "../../components/Tables/TablePro.jsx";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import TourHelpButton from "../../components/TourHelpButton.jsx";
import PrintFormatDialog from "../../components/saleReceipt/PrintFormatDialog.jsx";
import InvoiceHubDetailDialog from "./inventoryControl/components/InvoiceHubDetailDialog.jsx";
import { getPosSalesRequest } from "../../api/ordersRequest.js";
import { fetchSriBillingSettings } from "../../api/sriBillingRequest.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePageTour } from "../../hooks/usePageTour.js";
import {
  COMPROBANTES_POS_TOUR_ID,
  getComprobantesPosTourSteps,
} from "../../tours/comprobantesPosTour.js";
import {
  documentTypeLabel,
  formatReceiptDate,
  normalizeSaleReceipt,
  paymentMethodLabel,
} from "../../utils/saleReceiptUtils.js";

const EMPTY_FILTERS = {
  dateFrom: "",
  dateTo: "",
  status: "",
  environment: "",
  seller: "",
  paymentState: "",
  productId: "",
};

const MONEY_COL = {
  align: "right",
  minWidth: 52,
  cellSx: { px: 0.2, width: "1px", whiteSpace: "nowrap" },
  headerSx: { px: 0.2, width: "1px", whiteSpace: "nowrap" },
};

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

const SPACER_COL = {
  id: "_spacer",
  label: "",
  sortable: false,
  cellSx: { width: "100%", p: 0 },
  headerSx: { width: "100%", p: 0 },
  render: () => null,
};

function normalizeEnvironment(env, label) {
  const raw = String(env || "").toLowerCase().trim();
  if (raw === "produccion" || raw === "producción" || raw === "2") return "produccion";
  if (raw === "pruebas" || raw === "1") return "pruebas";
  const lbl = String(label || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (lbl.includes("produccion")) return "produccion";
  if (lbl.includes("prueba")) return "pruebas";
  return "";
}

const money = (n) => Number(n || 0).toFixed(2);

function saleDateIso(sale) {
  const raw = sale?.date || sale?.paidAt || "";
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function paymentStateOf(sale) {
  const method = String(sale?.paymentMethod || "").toLowerCase();
  const status = String(sale?.status || "").toLowerCase();
  if (method === "credito" || status === "pendiente") return "pendiente";
  if (sale?.paidAt || status === "pagado") return "pagado";
  return "pendiente";
}

function saleItems(sale) {
  const raw = sale?.items || sale?.ERP_order_items || [];
  return (Array.isArray(raw) ? raw : []).map((it, idx) => {
    const qty = Number(it.quantity || 0);
    const price = Number(it.price ?? it.unitPrice ?? 0);
    return {
      productId: it.productId ?? it.id ?? null,
      name: it.name || it.productName || it.ERP_inventory_product?.name || `Ítem ${idx + 1}`,
      qty,
      price,
      line: Number(it.lineTotal ?? qty * price),
    };
  });
}

function SaleItemsPanel({ row }) {
  const items = saleItems(row);
  if (!items.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sin productos en este comprobante.
      </Typography>
    );
  }
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
        Productos del comprobante
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Producto</TableCell>
            <TableCell align="right">Cant.</TableCell>
            <TableCell align="right">P. unit.</TableCell>
            <TableCell align="right">Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((it, i) => (
            <TableRow key={`${it.name}-${i}`}>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>
                  {it.name}
                </Typography>
              </TableCell>
              <TableCell align="right">{it.qty}</TableCell>
              <TableCell align="right">${money(it.price)}</TableCell>
              <TableCell align="right">${money(it.line)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export default function FacturacionPage() {
  const { toast } = useAuth();
  const [sales, setSales] = useState([]);
  const [printOpen, setPrintOpen] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sriSettings, setSriSettings] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data }, sri] = await Promise.all([
        getPosSalesRequest({ limit: 500 }),
        fetchSriBillingSettings().catch(() => null),
      ]);
      setSales(data || []);
      setSriSettings(sri);
    } catch (e) {
      void toast?.({
        message:
          e?.response?.data?.message || "No se pudieron cargar las ventas de caja.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sellerOptions = useMemo(() => {
    const set = new Set();
    for (const s of sales) {
      const name = String(s.sellerName || "").trim();
      if (name && name !== "—") set.add(name);
    }
    return [...set].sort();
  }, [sales]);

  /** Productos únicos presentes en las ventas (para el select buscador). */
  const productOptions = useMemo(() => {
    const map = new Map();
    for (const s of sales) {
      for (const it of saleItems(s)) {
        const key =
          it.productId != null
            ? `id:${it.productId}`
            : `name:${String(it.name || "").toLowerCase()}`;
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            productId: it.productId,
            name: it.name,
          });
        }
      }
    }
    return [...map.values()].sort((a, b) =>
      String(a.name).localeCompare(String(b.name), "es"),
    );
  }, [sales]);

  const sriStatusOptions = useMemo(() => {
    const set = new Set();
    for (const s of sales) {
      const st = String(s.sri?.statusLabel || "").trim();
      if (st) set.add(st);
    }
    return [...set].sort();
  }, [sales]);

  const mappedSales = useMemo(
    () =>
      sales.map((s) => {
        const sri = s.sri || {};
        const paymentState = paymentStateOf(s);
        return {
          ...s,
          dateIso: saleDateIso(s),
          dateLabel: formatReceiptDate(s.date || s.paidAt),
          emissionDate: (sri.authorizedAt || s.date || s.paidAt)
            ? formatReceiptDate(sri.authorizedAt || s.date || s.paidAt)
            : "—",
          emissionDateLabel: (sri.authorizedAt || s.date || s.paidAt)
            ? formatReceiptDate(sri.authorizedAt || s.date || s.paidAt)
            : "—",
          customerLabel:
            s.documentType === "consumidor_final"
              ? "CONSUMIDOR FINAL"
              : String(s.customer?.name || sri.customerName || "—").toUpperCase(),
          sellerLabel: s.sellerName || "—",
          estabPtoEmi: sri.estabPtoEmi || "—",
          sequentialLabel: sri.sequentialLabel || "—",
          numero: sri.sequentialLabel || String(s.id || "—"),
          environment: normalizeEnvironment(sri.environment, sri.environmentLabel),
          environmentLabel: sri.environmentLabel || "—",
          sriStatusLabel: sri.statusLabel || "Sin SRI",
          paymentState,
          paymentStateLabel: paymentState === "pagado" ? "Pagado" : "Pendiente",
          paymentLabel: paymentMethodLabel(s.paymentMethod),
          paymentMethodLabel: paymentMethodLabel(s.paymentMethod),
          subtotalLabel: money(s.subtotal),
          iceLabel: money(s.ice),
          ivaLabel: money(s.iva),
          totalLabel: money(s.total),
          ...(() => {
            const t = Number(s.total || 0);
            const m = String(s.paymentMethod || "")
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
          })(),
          discount: Number(s.discount || s.discountAmount || 0),
          retention: Number(s.retention || s.withholdingAmount || 0),
          hasAccessKey: Boolean(sri.accessKey || sri.authorizationNumber),
          docLabel: documentTypeLabel(s.documentType),
        };
      }),
    [sales],
  );

  const filteredRows = useMemo(() => {
    const productKey = String(filters.productId || "").trim();
    return mappedSales.filter((row) => {
      if (filters.dateFrom && row.dateIso && row.dateIso < filters.dateFrom) return false;
      if (filters.dateTo && row.dateIso && row.dateIso > filters.dateTo) return false;
      if (filters.status && row.sriStatusLabel !== filters.status) return false;
      if (filters.environment && row.environment !== filters.environment) return false;
      if (filters.seller && row.sellerLabel !== filters.seller) return false;
      if (filters.paymentState && row.paymentState !== filters.paymentState) return false;
      if (productKey) {
        const items = saleItems(row);
        const hit = items.some((it) => {
          const key =
            it.productId != null
              ? `id:${it.productId}`
              : `name:${String(it.name || "").toLowerCase()}`;
          return key === productKey;
        });
        if (!hit) return false;
      }
      return true;
    });
  }, [mappedSales, filters]);

  const pageTotals = useMemo(() => {
    return {
      all: {
        subtotal: filteredRows.reduce((a, r) => a + Number(r.subtotal || 0), 0),
        ice: filteredRows.reduce((a, r) => a + Number(r.ice || 0), 0),
        iva: filteredRows.reduce((a, r) => a + Number(r.iva || 0), 0),
        total: filteredRows.reduce((a, r) => a + Number(r.total || 0), 0),
      },
    };
  }, [filteredRows]);

  const setFilterField = (field) => (e) => {
    setFilters((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setExpandedRowId(null);
  };

  const openPrint = (sale) => {
    setPrintReceipt(normalizeSaleReceipt(sale));
    setPrintOpen(true);
  };

  const toggleExpand = (row) => {
    setExpandedRowId((prev) => (prev === row.id ? null : row.id));
  };

  const { startTour } = usePageTour({
    tourId: COMPROBANTES_POS_TOUR_ID,
    getSteps: getComprobantesPosTourSteps,
    enabled: !loading,
  });

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 1 }}
        data-tour="pos-header"
      >
        <Typography variant="h5" fontWeight={700}>
          Comprobantes POS
        </Typography>
        <TourHelpButton onClick={startTour} title="Ver tutorial de comprobantes POS" />
        {sriSettings?.readyForInvoicing ? (
          <Chip
            size="small"
            color="success"
            icon={<FactCheckIcon />}
            label="Facturación electrónica activa"
          />
        ) : (
          <Chip
            size="small"
            variant="outlined"
            color="warning"
            icon={<FactCheckIcon />}
            label="SRI no listo"
          />
        )}
      </Stack>

      <Paper sx={{ p: 1, mb: 1.5, borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Reimpresión de ventas de caja. Detalle SRI en{" "}
          <Link
            component={RouterLink}
            to={APP_ROUTES.electronicDocs.issued}
            underline="hover"
          >
            Documentos emitidos
          </Link>
          {" · "}
          <Link
            component={RouterLink}
            to={APP_ROUTES.electronicDocs.sriSettings}
            underline="hover"
          >
            Configurar SRI
          </Link>
        </Typography>
      </Paper>

      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 2, borderRadius: 2 }}
        data-tour="pos-filters"
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
              onChange={setFilterField("dateFrom")}
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
              onChange={setFilterField("dateTo")}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Estado"
              value={filters.status}
              onChange={setFilterField("status")}
            >
              <MenuItem value="">Todos</MenuItem>
              {sriStatusOptions.map((st) => (
                <MenuItem key={st} value={st}>
                  {st}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Ambiente"
              value={filters.environment}
              onChange={setFilterField("environment")}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="produccion">Producción</MenuItem>
              <MenuItem value="pruebas">Pruebas</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Vendedor"
              value={filters.seller}
              onChange={setFilterField("seller")}
            >
              <MenuItem value="">Todos</MenuItem>
              {sellerOptions.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Estado pago"
              value={filters.paymentState}
              onChange={setFilterField("paymentState")}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="pagado">Pagado</MenuItem>
              <MenuItem value="pendiente">Pendiente</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={4} data-tour="pos-product-filter">
            <SearchableSelect
              label="Producto"
              placeholder="Buscar producto en ventas…"
              items={productOptions}
              value={filters.productId}
              onChange={(v) =>
                setFilters((prev) => ({ ...prev, productId: v == null ? "" : String(v) }))
              }
              getOptionLabel={(item) => item?.name || ""}
              getOptionValue={(item) => item?.id}
              emptyOptionLabel="Todos los productos"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={resetFilters}
            >
              Limpiar
            </Button>
          </Grid>
        </Grid>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1 }}
        >
          Mostrando {filteredRows.length} de {mappedSales.length} comprobantes · buscá en la
          tabla, ordená por columna o filtrá por producto
        </Typography>
      </Paper>

      <TablePro
        title="Ventas de caja"
        rows={filteredRows}
        dense
        tableMaxHeight="calc(100vh - 340px)"
        columns={[
          {
            id: "keyIcon",
            label: "",
            sortable: false,
            minWidth: 36,
            cellSx: { width: "1px", px: 0.25 },
            headerSx: { width: "1px", px: 0.25 },
            render: (row) =>
              row.hasAccessKey ? (
                <Tooltip title={row.sri?.accessKey || "Clave acceso SRI"}>
                  <VpnKeyIcon fontSize="small" color="action" />
                </Tooltip>
              ) : (
                "—"
              ),
          },
          {
            id: "emissionDateLabel",
            label: "Fecha",
            minWidth: 88,
            getSortValue: (r) => r.dateIso || r.emissionDateLabel || "",
          },
          { id: "estabPtoEmi", label: "Estab", minWidth: 72 },
          {
            id: "sequentialLabel",
            label: "Núm.",
            minWidth: 72,
            getSortValue: (r) => Number(r.sri?.sequential || 0),
          },
          { id: "customerLabel", label: "Cliente", ...TEXT_COL(120) },
          { id: "environmentLabel", label: "Amb.", minWidth: 72, ...TEXT_COL(80) },
          { id: "sellerLabel", label: "Vendedor", ...TEXT_COL(100) },
          {
            id: "subtotalLabel",
            label: "Subtotal",
            ...MONEY_COL,
            getSortValue: (r) => Number(r.subtotal || 0),
          },
          {
            id: "iceLabel",
            label: "ICE",
            ...MONEY_COL,
            getSortValue: (r) => Number(r.ice || 0),
          },
          {
            id: "ivaLabel",
            label: "IVA",
            ...MONEY_COL,
            getSortValue: (r) => Number(r.iva || 0),
          },
          {
            id: "totalLabel",
            label: "Total",
            ...MONEY_COL,
            getSortValue: (r) => Number(r.total || 0),
          },
          { id: "sriStatusLabel", label: "Estado", minWidth: 80, ...TEXT_COL(90) },
          { id: "paymentStateLabel", label: "Pago", minWidth: 72 },
          {
            id: "print",
            label: "Acciones",
            sortable: false,
            stopRowClick: true,
            minWidth: 120,
            cellSx: { width: "1px", px: 0.25, whiteSpace: "nowrap" },
            headerSx: { width: "1px", px: 0.25 },
            render: (row) => {
              const open = expandedRowId === row.id;
              return (
                <Stack
                  direction="row"
                  spacing={0}
                  justifyContent="flex-end"
                  data-tour="pos-row-actions"
                >
                  <Tooltip title="Ver detalle / reporte">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => setDetailRow(row)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={open ? "Ocultar productos" : "Ver productos"}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => toggleExpand(row)}
                    >
                      {open ? (
                        <KeyboardArrowUpIcon fontSize="small" />
                      ) : (
                        <KeyboardArrowDownIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Imprimir comprobante">
                    <IconButton size="small" color="primary" onClick={() => openPrint(row)}>
                      <PrintIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              );
            },
          },
          SPACER_COL,
        ]}
        showSearch
        showPagination
        showIndex={false}
        defaultRowsPerPage={25}
        rowsPerPageOptions={[15, 25, 50, 100]}
        loading={loading}
        expandedRowId={expandedRowId}
        renderExpanded={(row) => <SaleItemsPanel row={row} />}
        dataTour="pos-table"
        dataTourSearch="pos-search"
      />

      <Paper
        variant="outlined"
        sx={{ mt: 1.5, p: 1.5, borderRadius: 2 }}
        data-tour="pos-totals"
      >
        <Typography variant="body2">
          <strong>Total general (filtro):</strong> Subtotal {money(pageTotals.all.subtotal)} ·
          ICE {money(pageTotals.all.ice)} · IVA {money(pageTotals.all.iva)} · Total{" "}
          {money(pageTotals.all.total)}
        </Typography>
      </Paper>

      <InvoiceHubDetailDialog
        open={Boolean(detailRow)}
        onClose={() => setDetailRow(null)}
        row={detailRow}
        rows={mappedSales}
        partyKind="customer"
        onPrint={(row) => {
          setDetailRow(null);
          openPrint(row);
        }}
      />

      <PrintFormatDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        receipt={printReceipt}
      />
    </Box>
  );
}
