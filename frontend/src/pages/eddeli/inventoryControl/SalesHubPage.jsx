import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import TablePro from "../../../components/Tables/TablePro.jsx";
import { getPosSalesRequest } from "../../../api/ordersRequest.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { exportSalesInvoicesExcel } from "../../../utils/exportInvoiceReportExcel.js";

const money = (n) => Number(n || 0).toFixed(2);

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
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({
    dateFrom: monthStartIso(),
    dateTo: todayIso(),
    seller: "",
  });
  const [applied, setApplied] = useState({
    dateFrom: monthStartIso(),
    dateTo: todayIso(),
    seller: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await getPosSalesRequest({ limit: 500 });
        if (!cancelled) setSales(data || []);
      } catch (e) {
        if (!cancelled) {
          void toast?.({
            message:
              e?.response?.data?.message || "No se pudo cargar el reporte de ventas.",
            variant: "error",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const sellerOptions = useMemo(() => {
    const set = new Set();
    for (const s of sales) {
      const name = String(s.sellerName || "").trim();
      if (name && name !== "—") set.add(name);
    }
    return [...set].sort();
  }, [sales]);

  const rows = useMemo(() => {
    return sales
      .map((s) => {
        const dateIso = saleDateIso(s);
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
          emissionDate: dateIso || "—",
          estabPtoEmi: sri.estabPtoEmi || "—",
          numero: sri.sequentialLabel || String(s.id || "—"),
          sellerLabel: s.sellerName || "—",
          customerLabel:
            s.documentType === "consumidor_final"
              ? "CONSUMIDOR FINAL"
              : String(s.customer?.name || "—").toUpperCase(),
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
        };
      })
      .filter((row) => {
        if (applied.dateFrom && row.dateIso && row.dateIso < applied.dateFrom) return false;
        if (applied.dateTo && row.dateIso && row.dateIso > applied.dateTo) return false;
        if (applied.seller && row.sellerLabel !== applied.seller) return false;
        return true;
      })
      .sort((a, b) => String(b.dateIso).localeCompare(String(a.dateIso)));
  }, [sales, applied]);

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
      exportSalesInvoicesExcel(rows, {
        dateTo: applied.dateTo || todayIso(),
        fileName: `Reporte de Facturas del ${applied.dateFrom || ""} al ${applied.dateTo || todayIso()}.xlsx`,
      });
      void toast?.({ message: "Excel descargado.", variant: "success" });
    } catch (e) {
      void toast?.({
        message: e?.message || "No se pudo generar el Excel.",
        variant: "error",
      });
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
            Reporte de ventas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Facturación / ventas de caja por día (estilo facturación diaria).
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="success"
          startIcon={<FileDownloadIcon />}
          onClick={exportExcel}
          disabled={loading || !rows.length}
          sx={{ alignSelf: { xs: "stretch", sm: "center" }, whiteSpace: "nowrap" }}
        >
          Exportar Excel
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
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
              value={draft.dateFrom}
              onChange={(e) => setDraft((p) => ({ ...p, dateFrom: e.target.value }))}
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
              onChange={(e) => setDraft((p) => ({ ...p, dateTo: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Vendedor"
              value={draft.seller}
              onChange={(e) => setDraft((p) => ({ ...p, seller: e.target.value }))}
            >
              <MenuItem value="">Todos</MenuItem>
              {sellerOptions.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={5}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                startIcon={<FilterAltIcon />}
                onClick={() => setApplied({ ...draft })}
              >
                Aplicar filtros
              </Button>
              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={() => {
                  const next = {
                    dateFrom: monthStartIso(),
                    dateTo: todayIso(),
                    seller: "",
                  };
                  setDraft(next);
                  setApplied(next);
                }}
              >
                Limpiar
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <TablePro
        title="Facturación x día"
        rows={rows}
        columns={[
          { id: "emissionDate", label: "Fecha emisión" },
          { id: "estabPtoEmi", label: "Estab-PtoEmi" },
          { id: "numero", label: "Número" },
          { id: "sellerLabel", label: "Vendedor" },
          { id: "customerLabel", label: "Nombre cliente" },
          { id: "subtotalLabel", label: "Subtotal", align: "right" },
          { id: "discountLabel", label: "Descuento", align: "right" },
          { id: "ivaLabel", label: "IVA", align: "right" },
          { id: "totalLabel", label: "Total", align: "right" },
          { id: "cashLabel", label: "Efectivo", align: "right" },
          { id: "checkBankLabel", label: "Cheque/Banco", align: "right" },
          { id: "cardLabel", label: "Tarjeta", align: "right" },
          { id: "otherLabel", label: "Otros", align: "right" },
          { id: "retentionLabel", label: "Retención", align: "right" },
        ]}
        showSearch={false}
        showPagination
        showIndex={false}
        defaultRowsPerPage={25}
        rowsPerPageOptions={[15, 25, 50, 100]}
        loading={loading}
      />

      <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <strong>Totales página/filtro:</strong> Subtotal {money(totals.subtotal)} · Descuento{" "}
          {money(totals.discount)} · IVA {money(totals.iva)} · Total {money(totals.total)}
        </Typography>
        <Typography variant="body2">
          Efectivo {money(totals.cash)} · Cheque/Banco {money(totals.checkBank)} · Tarjeta{" "}
          {money(totals.card)} · Otros {money(totals.other)} · Retención {money(totals.retention)}
        </Typography>
      </Paper>
    </Box>
  );
}
