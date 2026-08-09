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
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import { Link as RouterLink } from "react-router-dom";
import { APP_ROUTES } from "../../config/appRoutes.js";
import TablePro from "../../components/Tables/TablePro.jsx";
import PrintFormatDialog from "../../components/saleReceipt/PrintFormatDialog.jsx";
import { getPosSalesRequest } from "../../api/ordersRequest.js";
import { fetchSriBillingSettings } from "../../api/sriBillingRequest.js";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  documentTypeLabel,
  formatReceiptDate,
  normalizeSaleReceipt,
  paymentMethodLabel,
} from "../../utils/saleReceiptUtils.js";

const EMPTY_FILTERS = {
  search: "",
  dateFrom: "",
  dateTo: "",
  status: "",
  seller: "",
  paymentState: "",
  sortBy: "id",
  sortDir: "desc",
  pageSize: 15,
};

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

export default function FacturacionPage() {
  const { toast } = useAuth();
  const [sales, setSales] = useState([]);
  const [printOpen, setPrintOpen] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sriSettings, setSriSettings] = useState(null);
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);

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
          environmentLabel: sri.environmentLabel || "—",
          sriStatusLabel: sri.statusLabel || "Sin SRI",
          paymentState,
          paymentStateLabel: paymentState === "pagado" ? "Pagado" : "Pendiente",
          paymentLabel: paymentMethodLabel(s.paymentMethod),
          subtotalLabel: money(s.subtotal),
          iceLabel: money(s.ice),
          ivaLabel: money(s.iva),
          totalLabel: money(s.total),
          hasAccessKey: Boolean(sri.accessKey || sri.authorizationNumber),
          docLabel: documentTypeLabel(s.documentType),
        };
      }),
    [sales],
  );

  const filteredRows = useMemo(() => {
    const q = String(applied.search || "")
      .trim()
      .toLowerCase();
    let list = mappedSales.filter((row) => {
      if (applied.dateFrom && row.dateIso && row.dateIso < applied.dateFrom) return false;
      if (applied.dateTo && row.dateIso && row.dateIso > applied.dateTo) return false;
      if (applied.status && row.sriStatusLabel !== applied.status) return false;
      if (applied.seller && row.sellerLabel !== applied.seller) return false;
      if (applied.paymentState && row.paymentState !== applied.paymentState) return false;
      if (q) {
        const hay = [
          row.id,
          row.customerLabel,
          row.sellerLabel,
          row.estabPtoEmi,
          row.sequentialLabel,
          row.environmentLabel,
          row.sriStatusLabel,
          row.paymentStateLabel,
          row.docLabel,
          row.totalLabel,
          row.sri?.accessKey,
        ]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const dir = applied.sortDir === "asc" ? 1 : -1;
    const key = applied.sortBy || "id";
    list = [...list].sort((a, b) => {
      let av;
      let bv;
      switch (key) {
        case "date":
          av = a.dateIso || "";
          bv = b.dateIso || "";
          break;
        case "customer":
          av = String(a.customerLabel || "").toLowerCase();
          bv = String(b.customerLabel || "").toLowerCase();
          break;
        case "total":
          av = Number(a.total || 0);
          bv = Number(b.total || 0);
          break;
        case "sequential":
          av = Number(a.sri?.sequential || 0);
          bv = Number(b.sri?.sequential || 0);
          break;
        case "seller":
          av = String(a.sellerLabel || "").toLowerCase();
          bv = String(b.sellerLabel || "").toLowerCase();
          break;
        default:
          av = Number(a.id || 0);
          bv = Number(b.id || 0);
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return list;
  }, [mappedSales, applied]);

  const pageTotals = useMemo(() => {
    const pageSize = Number(applied.pageSize) || 15;
    const pageRows = filteredRows.slice(0, pageSize);
    return {
      page: {
        subtotal: pageRows.reduce((a, r) => a + Number(r.subtotal || 0), 0),
        ice: pageRows.reduce((a, r) => a + Number(r.ice || 0), 0),
        iva: pageRows.reduce((a, r) => a + Number(r.iva || 0), 0),
        total: pageRows.reduce((a, r) => a + Number(r.total || 0), 0),
      },
      all: {
        subtotal: filteredRows.reduce((a, r) => a + Number(r.subtotal || 0), 0),
        ice: filteredRows.reduce((a, r) => a + Number(r.ice || 0), 0),
        iva: filteredRows.reduce((a, r) => a + Number(r.iva || 0), 0),
        total: filteredRows.reduce((a, r) => a + Number(r.total || 0), 0),
      },
    };
  }, [filteredRows, applied.pageSize]);

  const setDraftField = (field) => (e) => {
    setDraft((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const applyFilters = () => setApplied({ ...draft });
  const resetFilters = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  };

  const openPrint = (sale) => {
    setPrintReceipt(normalizeSaleReceipt(sale));
    setPrintOpen(true);
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 1 }}
      >
        <Typography variant="h5" fontWeight={700}>
          Comprobantes POS
        </Typography>
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

      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
          Filtros de búsqueda
        </Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Búsqueda"
              placeholder="Ingrese su búsqueda"
              value={draft.search}
              onChange={setDraftField("search")}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Fecha inicio"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={draft.dateFrom}
              onChange={setDraftField("dateFrom")}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Fecha fin"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={draft.dateTo}
              onChange={setDraftField("dateTo")}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Estado"
              value={draft.status}
              onChange={setDraftField("status")}
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
              label="Vendedor"
              value={draft.seller}
              onChange={setDraftField("seller")}
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
              value={draft.paymentState}
              onChange={setDraftField("paymentState")}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="pagado">Pagado</MenuItem>
              <MenuItem value="pendiente">Pendiente</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Ordenar por"
              value={draft.sortBy}
              onChange={setDraftField("sortBy")}
            >
              <MenuItem value="id">Defecto (#)</MenuItem>
              <MenuItem value="date">Fecha</MenuItem>
              <MenuItem value="sequential">Secuencial</MenuItem>
              <MenuItem value="customer">Cliente</MenuItem>
              <MenuItem value="seller">Vendedor</MenuItem>
              <MenuItem value="total">Total</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Orden"
              value={draft.sortDir}
              onChange={setDraftField("sortDir")}
            >
              <MenuItem value="desc">Descendente</MenuItem>
              <MenuItem value="asc">Ascendente</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Ver"
              value={draft.pageSize}
              onChange={setDraftField("pageSize")}
            >
              <MenuItem value={15}>15</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                startIcon={<FilterAltIcon />}
                onClick={applyFilters}
              >
                Aplicar filtros
              </Button>
              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={resetFilters}
              >
                Limpiar
              </Button>
            </Stack>
          </Grid>
        </Grid>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1 }}
        >
          Mostrando {filteredRows.length} de {mappedSales.length} comprobantes
        </Typography>
      </Paper>

      <TablePro
        key={`pos-sales-${applied.pageSize}-${applied.sortBy}-${applied.sortDir}`}
        title="Ventas de caja"
        rows={filteredRows}
        columns={[
          {
            id: "keyIcon",
            label: "",
            render: (row) =>
              row.hasAccessKey ? (
                <Tooltip title={row.sri?.accessKey || "Clave acceso SRI"}>
                  <VpnKeyIcon fontSize="small" color="action" />
                </Tooltip>
              ) : (
                "—"
              ),
          },
          { id: "emissionDateLabel", label: "Fecha emisión" },
          { id: "estabPtoEmi", label: "Estab-PtoEmi" },
          { id: "sequentialLabel", label: "Secuencial" },
          { id: "customerLabel", label: "Cliente" },
          { id: "environmentLabel", label: "Ambiente" },
          { id: "sellerLabel", label: "Vendedor" },
          { id: "subtotalLabel", label: "Subtotal", align: "right" },
          { id: "iceLabel", label: "ICE", align: "right" },
          { id: "ivaLabel", label: "IVA", align: "right" },
          { id: "totalLabel", label: "Total", align: "right" },
          { id: "sriStatusLabel", label: "Estado" },
          { id: "paymentStateLabel", label: "Pago" },
          {
            id: "print",
            label: "Acciones",
            render: (row) => (
              <Tooltip title="Imprimir comprobante">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => openPrint(row)}
                >
                  <PrintIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ),
          },
        ]}
        showSearch={false}
        showPagination
        showIndex={false}
        defaultRowsPerPage={Number(applied.pageSize) || 15}
        rowsPerPageOptions={[15, 25, 50, 100]}
        loading={loading}
      />

      <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, borderRadius: 2 }}>
        <Stack spacing={0.5}>
          <Typography variant="body2">
            <strong>Total de la página:</strong> Subtotal {money(pageTotals.page.subtotal)} ·
            ICE {money(pageTotals.page.ice)} · IVA {money(pageTotals.page.iva)} · Total{" "}
            {money(pageTotals.page.total)}
          </Typography>
          <Typography variant="body2">
            <strong>Total general (filtro):</strong> Subtotal {money(pageTotals.all.subtotal)} ·
            ICE {money(pageTotals.all.ice)} · IVA {money(pageTotals.all.iva)} · Total{" "}
            {money(pageTotals.all.total)}
          </Typography>
        </Stack>
      </Paper>

      <PrintFormatDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        receipt={printReceipt}
      />
    </Box>
  );
}
