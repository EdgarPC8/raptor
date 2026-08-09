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
import AddIcon from "@mui/icons-material/Add";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import TablePro from "../../../components/Tables/TablePro.jsx";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog.jsx";
import { getAllSupplierOrdersRequest } from "../../../api/ordersRequest.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import SupplierOrderForm from "./components/SupplierOrderForm.jsx";
import { exportPurchasesInvoicesExcel } from "../../../utils/exportInvoiceReportExcel.js";

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

/** Compras: registrar factura proveedor + reporte diario. */
export default function PurchasesHubPage() {
  const { toast } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [draft, setDraft] = useState({
    dateFrom: monthStartIso(),
    dateTo: todayIso(),
    supplier: "",
  });
  const [applied, setApplied] = useState({
    dateFrom: monthStartIso(),
    dateTo: todayIso(),
    supplier: "",
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

  const refresh = () => void load(applied.dateFrom, applied.dateTo);

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

  const closeForm = () => {
    setFormOpen(false);
    setIsEditing(false);
    setOrderToEdit(null);
  };

  useEffect(() => {
    void load(applied.dateFrom, applied.dateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const supplierOptions = useMemo(() => {
    const set = new Set();
    for (const o of orders) {
      const name = String(o.supplier?.name || o.supplierName || "").trim();
      if (name) set.add(name);
    }
    return [...set].sort();
  }, [orders]);

  const rows = useMemo(() => {
    return orders
      .map((o) => {
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
            // En pedidos proveedor el taxRate suele ser adicional al unitPrice
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
        const pay = paymentBucketsFromList(
          o.payments,
          o.paidAmount || total,
          o.paidAt,
        );
        return {
          ...o,
          dateIso,
          emissionDate: dateIso || "—",
          estabPtoEmi: "—",
          numero: String(o.id || "—").padStart(9, "0"),
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
        };
      })
      .filter((row) => {
        if (applied.supplier && row.supplierLabel !== applied.supplier.toUpperCase()) {
          return false;
        }
        return true;
      })
      .sort((a, b) => String(b.dateIso).localeCompare(String(a.dateIso)));
  }, [orders, applied.supplier]);

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

  const applyFilters = () => {
    setApplied({ ...draft });
    void load(draft.dateFrom, draft.dateTo);
  };

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
        dateTo: applied.dateTo || todayIso(),
        fileName: `Reporte de Compras del ${applied.dateFrom || ""} al ${applied.dateTo || todayIso()}.xlsx`,
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
            Compras
          </Typography>
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
          sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
        >
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
              label="Proveedor"
              value={draft.supplier}
              onChange={(e) => setDraft((p) => ({ ...p, supplier: e.target.value }))}
            >
              <MenuItem value="">Todos</MenuItem>
              {supplierOptions.map((name) => (
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
                onClick={applyFilters}
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
                    supplier: "",
                  };
                  setDraft(next);
                  setApplied(next);
                  void load(next.dateFrom, next.dateTo);
                }}
              >
                Limpiar
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <TablePro
        title="Compras x día"
        rows={rows}
        columns={[
          { id: "emissionDate", label: "Fecha emisión" },
          { id: "estabPtoEmi", label: "Estab-PtoEmi" },
          { id: "numero", label: "Número" },
          { id: "supplierLabel", label: "Proveedor" },
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
        onRowClick={openEditPurchase}
      />
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
        Clic en una fila para editar el pedido / productos.
      </Typography>

      <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <strong>Totales:</strong> Subtotal {money(totals.subtotal)} · Descuento{" "}
          {money(totals.discount)} · IVA {money(totals.iva)} · Total {money(totals.total)}
        </Typography>
        <Typography variant="body2">
          Efectivo {money(totals.cash)} · Cheque/Banco {money(totals.checkBank)} · Tarjeta{" "}
          {money(totals.card)} · Otros {money(totals.other)} · Retención {money(totals.retention)}
        </Typography>
      </Paper>

      <SimpleDialog
        open={formOpen}
        onClose={closeForm}
        tittle={isEditing ? "Editar compra / pedido a proveedor" : "Nueva compra a proveedor"}
        maxWidth="lg"
        fullWidth
      >
        <SupplierOrderForm
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
