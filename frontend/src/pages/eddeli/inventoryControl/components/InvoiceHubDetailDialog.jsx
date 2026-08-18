import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import VisibilityIcon from "@mui/icons-material/Visibility";
import TourHelpButton from "../../../../components/TourHelpButton.jsx";
import { usePageTour } from "../../../../hooks/usePageTour.js";
import {
  INVOICE_HUB_DETAIL_TOUR_ID,
  getInvoiceHubDetailTourSteps,
} from "../../../../tours/invoiceHubDetailTour.js";

const money = (n) => Number(n || 0).toFixed(2);

/** Clave para agrupar documentos del mismo cliente / proveedor. */
function partyKeyOf(row, partyKind) {
  if (!row) return "";
  if (partyKind === "supplier") {
    const id = row.supplierId ?? row.ERP_supplier?.id ?? row.supplier?.id;
    return id != null ? `id:${id}` : `name:${row.supplierLabel || ""}`;
  }
  const id = row.customer?.id ?? row.customerId;
  return id != null ? `id:${id}` : `name:${row.customerLabel || ""}`;
}

/** Ítems normalizados de un documento (venta o compra). */
function itemsOf(row) {
  if (!row) return [];
  const raw = row.items || row.ERP_supplier_order_items || row.ERP_order_items || [];
  return (Array.isArray(raw) ? raw : []).map((it, idx) => {
    const qty = Number(it.quantity || 0);
    const price = Number(it.unitPrice ?? it.price ?? 0);
    return {
      name:
        it.name || it.productName || it.ERP_inventory_product?.name || `Ítem ${idx + 1}`,
      qty,
      price,
      line: Number(it.lineTotal ?? qty * price),
      unit: it.unitLabel || it.ERP_inventory_product?.unitAbbrev || "",
    };
  });
}

function InfoRow({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <Stack direction="row" spacing={1} sx={{ py: 0.4 }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: "break-word" }}>
        {value}
      </Typography>
    </Stack>
  );
}

function ItemsTable({ items, emptyText }) {
  if (!items.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyText}
      </Typography>
    );
  }
  return (
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
              {it.unit ? (
                <Typography variant="caption" color="text.secondary">
                  {it.unit}
                </Typography>
              ) : null}
            </TableCell>
            <TableCell align="right">{it.qty}</TableCell>
            <TableCell align="right">{it.price != null ? `$${money(it.price)}` : "—"}</TableCell>
            <TableCell align="right">${money(it.line)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Modal tipo reporte para una fila de ventas o compras.
 * partyKind: "customer" | "supplier"
 * rows: todas las filas del hub, para la pestaña general del cliente/proveedor.
 */
export default function InvoiceHubDetailDialog({
  open,
  onClose,
  row,
  rows = [],
  partyKind = "customer",
  onPrint,
}) {
  const [tab, setTab] = useState(0);
  const [activeRow, setActiveRow] = useState(row);
  const partyLabel = partyKind === "supplier" ? "Proveedor" : "Cliente";

  useEffect(() => {
    if (open) {
      setActiveRow(row);
      setTab(0);
    }
  }, [open, row]);

  const goTab = useCallback((index) => {
    setTab(index);
  }, []);

  const getDetailTourSteps = useCallback(
    () => getInvoiceHubDetailTourSteps({ goTab, partyLabel }),
    [goTab, partyLabel],
  );

  const { startTour: startDetailTour } = usePageTour({
    tourId: INVOICE_HUB_DETAIL_TOUR_ID,
    getSteps: getDetailTourSteps,
    enabled: open && Boolean(row),
    autoDelayMs: 450,
  });

  const data = activeRow || row;
  const items = useMemo(() => itemsOf(data), [data]);

  const party = useMemo(() => {
    if (!data) return {};
    if (partyKind === "supplier") {
      const s = data.ERP_supplier || data.supplier || {};
      return {
        name: data.supplierLabel || s.name || data.supplierName || "—",
        idDoc: s.ruc || s.cedula || s.taxId || "—",
        phone: s.phone || "—",
        email: s.email || "—",
        address: s.address || "—",
      };
    }
    const c = data.customer || {};
    return {
      name: data.customerLabel || c.name || "—",
      idDoc: c.cedula || c.ruc || "—",
      phone: c.phone || "—",
      email: c.email || "—",
      address: c.address || "—",
    };
  }, [data, partyKind]);

  /** Todos los documentos del mismo cliente / proveedor. */
  const history = useMemo(() => {
    if (!data) return [];
    const key = partyKeyOf(data, partyKind);
    if (!key) return [];
    return (Array.isArray(rows) ? rows : [])
      .filter((r) => partyKeyOf(r, partyKind) === key)
      .sort((a, b) => String(b.dateIso || "").localeCompare(String(a.dateIso || "")));
  }, [rows, data, partyKind]);

  /** Productos acumulados de todos esos documentos. */
  const historyItems = useMemo(() => {
    const map = new Map();
    for (const doc of history) {
      for (const it of itemsOf(doc)) {
        const prev = map.get(it.name) || { name: it.name, qty: 0, line: 0, unit: it.unit };
        prev.qty += it.qty;
        prev.line += it.line;
        map.set(it.name, prev);
      }
    }
    return [...map.values()]
      .map((it) => ({ ...it, price: null }))
      .sort((a, b) => b.line - a.line);
  }, [history]);

  const historyTotal = useMemo(
    () => history.reduce((acc, r) => acc + Number(r.total || 0), 0),
    [history],
  );

  const HISTORY_LIMIT = 100;
  const shownHistory = history.slice(0, HISTORY_LIMIT);

  if (!data) return null;

  const docLabel =
    data.numero && data.numero !== "—" ? `#${data.numero}` : `ID ${data.id}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{ "data-tour": "invoice-detail-dialog" }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          pr: 1,
          py: 1.25,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={800} noWrap>
            Detalle · {docLabel}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {data.emissionDate || "—"} · {party.name} · Total ${money(data.total)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <TourHelpButton
            onClick={startDetailTour}
            title="Ver tutorial del detalle"
          />
          {typeof onPrint === "function" && (
            <IconButton size="small" color="primary" onClick={() => onPrint(data)} aria-label="Imprimir">
              <PrintIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" onClick={onClose} aria-label="Cerrar">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <Divider />
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        data-tour="invoice-detail-tabs"
        sx={{ px: 1, minHeight: 42 }}
      >
        <Tab label="Comprobante" sx={{ minHeight: 42, textTransform: "none" }} />
        <Tab label={partyLabel} sx={{ minHeight: 42, textTransform: "none" }} />
        <Tab label="Productos" sx={{ minHeight: 42, textTransform: "none" }} />
        <Tab label="Pagos" sx={{ minHeight: 42, textTransform: "none" }} />
        <Tab
          label={`General (${history.length})`}
          sx={{ minHeight: 42, textTransform: "none" }}
        />
      </Tabs>
      <DialogContent dividers sx={{ pt: 1.5 }} data-tour="invoice-detail-content">
        {tab === 0 && (
          <Box>
            <InfoRow label="Fecha emisión" value={data.emissionDate} />
            <InfoRow label="Estab-PtoEmi" value={data.estabPtoEmi} />
            <InfoRow label="Número" value={data.numero} />
            {data.invoiceNumber ? <InfoRow label="Nº factura" value={data.invoiceNumber} /> : null}
            {data.sellerLabel ? <InfoRow label="Vendedor" value={data.sellerLabel} /> : null}
            <InfoRow label={partyLabel} value={party.name} />
            <Divider sx={{ my: 1.25 }} />
            <InfoRow label="Subtotal" value={`$${money(data.subtotal)}`} />
            <InfoRow label="Descuento" value={`$${money(data.discount)}`} />
            <InfoRow label="IVA" value={`$${money(data.iva)}`} />
            <InfoRow label="Total" value={`$${money(data.total)}`} />
            <InfoRow label="Retención" value={`$${money(data.retention)}`} />
            {data.notes ? (
              <>
                <Divider sx={{ my: 1.25 }} />
                <InfoRow
                  label="Notas"
                  value={String(data.notes).replace(/\[.*?\]/g, "").trim() || "—"}
                />
              </>
            ) : null}
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
              Datos del {partyLabel.toLowerCase()}
            </Typography>
            <InfoRow label="Nombre" value={party.name} />
            <InfoRow label="Cédula / RUC" value={party.idDoc} />
            <InfoRow label="Teléfono" value={party.phone} />
            <InfoRow label="Email" value={party.email} />
            <InfoRow label="Dirección" value={party.address} />
          </Box>
        )}

        {tab === 2 && (
          <ItemsTable items={items} emptyText="Sin detalle de productos en este registro." />
        )}

        {tab === 3 && (
          <Box>
            <InfoRow label="Efectivo" value={`$${money(data.cash)}`} />
            <InfoRow label="Cheque / Banco" value={`$${money(data.checkBank)}`} />
            <InfoRow label="Tarjeta" value={`$${money(data.card)}`} />
            <InfoRow label="Otros" value={`$${money(data.other)}`} />
            <Divider sx={{ my: 1.25 }} />
            <InfoRow
              label="Método"
              value={
                data.paymentMethodLabel ||
                data.paymentMethod ||
                (Array.isArray(data.payments) && data.payments[0]?.method) ||
                "—"
              }
            />
            {data.paidAt ? (
              <InfoRow label="Pagado el" value={String(data.paidAt).slice(0, 19)} />
            ) : null}
          </Box>
        )}

        {tab === 4 && (
          <Box>
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="subtitle2" fontWeight={800}>
                {party.name}
              </Typography>
              <Chip size="small" label={`${history.length} documentos`} />
              <Chip size="small" color="primary" label={`Total $${money(historyTotal)}`} />
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Todos los pedidos / documentos registrados
              {history.length > HISTORY_LIMIT
                ? ` (mostrando los ${HISTORY_LIMIT} más recientes)`
                : ""}
            </Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Número</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Ver</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shownHistory.map((doc) => {
                  const isCurrent = doc.id === data.id;
                  return (
                    <TableRow key={doc.id} selected={isCurrent} hover>
                      <TableCell>{doc.emissionDate || "—"}</TableCell>
                      <TableCell>{doc.invoiceNumber || doc.numero || `ID ${doc.id}`}</TableCell>
                      <TableCell align="right">${money(doc.total)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={isCurrent ? "Documento actual" : "Ver este documento"}>
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              disabled={isCurrent}
                              onClick={() => {
                                setActiveRow(doc);
                                setTab(0);
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        No hay otros documentos de este {partyLabel.toLowerCase()}.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <Typography variant="caption" color="text.secondary">
              Productos acumulados en todos esos documentos
            </Typography>
            <ItemsTable
              items={historyItems}
              emptyText="Los documentos no traen detalle de productos."
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        {typeof onPrint === "function" && (
          <Button startIcon={<PrintIcon />} onClick={() => onPrint(data)}>
            Imprimir
          </Button>
        )}
        <Button variant="contained" onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
