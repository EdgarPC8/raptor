import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { alpha } from "@mui/material/styles";
import { money, moneyUnitPrice, toNum } from "./helpers.js";
import {
  buildSupplierPendingByDate,
  buildSupplierPendingByProduct,
} from "./summaryBuilders.js";
import {
  CREDIT_ORANGE,
  formatCreditDueLabel,
  pickNextCredit,
} from "./creditHelpers.js";

const VIEW_TABS = [
  { id: "orders", label: "Por pedidos" },
  { id: "product", label: "Por producto" },
  { id: "date", label: "Por fecha" },
];

/**
 * Vista compacta proveedores: seleccionar pedidos (grupo) o productos (paca).
 * mode="paid" → solo lectura de lo ya liquidado.
 */
export default function SupplierPendingViewTab({
  mode = "pending", // pending | paid
  debtTotal = 0,
  pendingOrders = [],
  pendingItems = [],
  canSelect = false,
  selectedItemIds = [],
  selectedOrderIds = [],
  onToggleOrder,
  onToggleItemIds,
  onClearOrderSelection,
  onClearItemSelection,
  onCreateOrderGroup,
  onArmPack,
  onAbonarOrder,
  onEditOrder,
  onOpenOrder,
  selectedPackQty = 0,
  busy = false,
}) {
  const isPaid = mode === "paid";
  const selectEnabled = canSelect && !isPaid;
  const [sub, setSub] = useState(0);
  const view = VIEW_TABS[sub]?.id || "orders";

  const freeItems = useMemo(
    () =>
      isPaid
        ? pendingItems || []
        : (pendingItems || []).filter((it) => !it.packId),
    [pendingItems, isPaid]
  );

  const byOrders = useMemo(
    () =>
      (pendingOrders || [])
        .slice()
        .sort((a, b) => {
          const ra = toNum(b.remainingAmount) - toNum(a.remainingAmount);
          if (ra !== 0) return ra;
          return String(b.date || "").localeCompare(String(a.date || ""));
        }),
    [pendingOrders]
  );

  const byProduct = useMemo(
    () => buildSupplierPendingByProduct(freeItems),
    [freeItems]
  );
  const byDate = useMemo(() => buildSupplierPendingByDate(freeItems), [freeItems]);

  const selectedOrdersTotal = useMemo(
    () =>
      byOrders
        .filter((o) =>
          (selectedOrderIds || []).some((id) => Number(id) === Number(o.id))
        )
        .reduce((s, o) => s + toNum(o.remainingAmount), 0),
    [byOrders, selectedOrderIds]
  );

  const idsAllSelected = (ids) =>
    ids.length > 0 && ids.every((id) => selectedItemIds.includes(id));
  const idsSomeSelected = (ids) =>
    ids.length > 0 &&
    ids.some((id) => selectedItemIds.includes(id)) &&
    !idsAllSelected(ids);

  return (
    <Box sx={{ p: { xs: 1.25, sm: 1.5 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ mb: 1 }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {isPaid ? "Vista pagados / liquidados" : "Vista pendiente"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isPaid ? (
              <>
                Total liquidado (vista): <b>{money(debtTotal)}</b>. Consultá por pedidos /
                producto / fecha. El lápiz abre el pedido para editar.
              </>
            ) : (
              <>
                Deuda <b>{money(debtTotal)}</b>. Marcá pedidos/productos para agrupar o armar
                paca. El lápiz edita el pedido (como en Pedidos).
              </>
            )}
          </Typography>
        </Box>
      </Stack>

      <Tabs
        value={sub}
        onChange={(_, v) => setSub(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ minHeight: 36, mb: 1, borderBottom: 1, borderColor: "divider" }}
      >
        {VIEW_TABS.map((t) => (
          <Tab
            key={t.id}
            label={t.label}
            sx={{ minHeight: 36, py: 0.5, textTransform: "none" }}
          />
        ))}
      </Tabs>

      {selectEnabled && selectedOrderIds.length > 0 ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          sx={{
            mb: 1,
            px: 1,
            py: 0.75,
            borderRadius: 1.5,
            border: 1,
            borderColor: "primary.light",
            bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
          }}
        >
          <Typography variant="body2">
            <b>{selectedOrderIds.length}</b> pedido(s) · Saldo{" "}
            <b>{money(selectedOrdersTotal)}</b>
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => onClearOrderSelection?.()} disabled={busy}>
              Limpiar
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={busy || !onCreateOrderGroup}
              onClick={() => onCreateOrderGroup?.(selectedOrderIds)}
            >
              Crear grupo
            </Button>
          </Stack>
        </Stack>
      ) : null}

      {selectEnabled && selectedItemIds.length > 0 ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          sx={{
            mb: 1,
            px: 1,
            py: 0.75,
            borderRadius: 1.5,
            border: 1,
            borderColor: "warning.light",
            bgcolor: (t) => alpha(t.palette.warning.main, 0.08),
          }}
        >
          <Typography variant="body2">
            <b>{selectedItemIds.length}</b> línea(s) · Cant. {selectedPackQty}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => onClearItemSelection?.()} disabled={busy}>
              Limpiar
            </Button>
            <Button
              size="small"
              variant="contained"
              color="warning"
              startIcon={<Inventory2Icon />}
              disabled={busy || !onArmPack}
              onClick={() => onArmPack?.()}
            >
              Armar paca
            </Button>
          </Stack>
        </Stack>
      ) : null}

      {byOrders.length === 0 ? (
        <Alert severity="info" sx={{ py: 0.5 }}>
          {isPaid
            ? "Sin pedidos liquidados para este proveedor."
            : "Sin pedidos con saldo pendiente."}
        </Alert>
      ) : null}

      {view === "orders" && byOrders.length > 0 ? (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                {selectEnabled ? <TableCell padding="checkbox" sx={{ width: 40 }} /> : null}
                <TableCell sx={{ fontWeight: 800, py: 0.75 }}>Pedido</TableCell>
                <TableCell sx={{ fontWeight: 800, py: 0.75 }}>Fecha</TableCell>
                {!isPaid ? (
                  <TableCell sx={{ fontWeight: 800, py: 0.75 }}>Crédito</TableCell>
                ) : null}
                <TableCell align="right" sx={{ fontWeight: 800, py: 0.75 }}>
                  {isPaid ? "Pagado" : "Saldo"}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, py: 0.75 }}>
                  Total
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, py: 0.75, width: 130 }}>
                  Acción
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {byOrders.map((ord) => {
                const canCheck = toNum(ord.remainingAmount) > 0.009;
                const checked = (selectedOrderIds || []).some(
                  (id) => Number(id) === Number(ord.id)
                );
                const paidCol = isPaid
                  ? toNum(ord.paidAmount) || toNum(ord.totalAmount)
                  : toNum(ord.remainingAmount);
                const credit = !isPaid ? pickNextCredit(ord) : null;
                return (
                  <TableRow key={ord.id} hover sx={{ "& td": { py: 0.5 } }}>
                    {selectEnabled ? (
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={checked}
                          disabled={busy || !canCheck}
                          onChange={() => onToggleOrder?.(Number(ord.id))}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell sx={{ fontWeight: 700 }}>#{ord.id}</TableCell>
                    <TableCell>{ord.date || "—"}</TableCell>
                    {!isPaid ? (
                      <TableCell>
                        {credit ? (
                          <Chip
                            size="small"
                            label={`${formatCreditDueLabel(credit.due)} · ${money(credit.amount)}`}
                            sx={{
                              height: 22,
                              fontWeight: 700,
                              bgcolor: CREDIT_ORANGE,
                              color: "#fff",
                            }}
                            title={
                              credit.count > 1
                                ? `${credit.count} cuotas pendientes`
                                : "Próxima cuota a pagar"
                            }
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell align="right">{money(paidCol)}</TableCell>
                    <TableCell align="right">{money(ord.totalAmount)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.25} justifyContent="flex-end" alignItems="center">
                        {onEditOrder ? (
                          <Tooltip title="Editar pedido">
                            <span>
                              <IconButton
                                size="small"
                                disabled={busy}
                                onClick={() => onEditOrder?.(ord)}
                              >
                                <EditNoteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : null}
                        {isPaid ? (
                          <Button
                            size="small"
                            disabled={busy}
                            onClick={() => onOpenOrder?.(ord)}
                          >
                            Ver
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            disabled={busy || !canCheck}
                            onClick={() => onAbonarOrder?.(ord)}
                          >
                            Abonar
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      ) : null}

      {view === "product" && freeItems.length > 0 ? (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 520 }}>
            <TableHead>
              <TableRow>
                {selectEnabled ? <TableCell padding="checkbox" sx={{ width: 40 }} /> : null}
                <TableCell sx={{ fontWeight: 800, py: 0.75 }}>Producto</TableCell>
                <TableCell sx={{ fontWeight: 800, py: 0.75 }}>Pedidos</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, py: 0.75 }}>
                  Cant.
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, py: 0.75 }}>
                  P/U
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, py: 0.75 }}>
                  Total
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {byProduct.rows.map((r) => {
                const ids = (r.itemIds || []).filter((id) =>
                  freeItems.some((it) => it.id === id)
                );
                return (
                  <TableRow
                    key={`${r.product}\0${r.unitPrice}`}
                    hover
                    sx={{ "& td": { py: 0.5 } }}
                  >
                    {selectEnabled ? (
                      <TableCell padding="checkbox">
                        <Tooltip title="Seleccionar para armar paca">
                          <span>
                            <Checkbox
                              size="small"
                              checked={idsAllSelected(ids)}
                              indeterminate={idsSomeSelected(ids)}
                              disabled={busy || ids.length === 0}
                              onChange={() => onToggleItemIds?.(ids)}
                            />
                          </span>
                        </Tooltip>
                      </TableCell>
                    ) : null}
                    <TableCell>{r.product}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {(r.orderIds || []).map((oid) => (
                          <Chip key={oid} size="small" label={`#${oid}`} variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{r.qty}</TableCell>
                    <TableCell align="right">{moneyUnitPrice(r.unitPrice)}</TableCell>
                    <TableCell align="right">{money(r.total)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      ) : null}

      {view === "date" && byDate.rows.length > 0 ? (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 360 }}>
            <TableHead>
              <TableRow>
                {selectEnabled ? <TableCell padding="checkbox" sx={{ width: 40 }} /> : null}
                <TableCell sx={{ fontWeight: 800, py: 0.75 }}>Fecha</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, py: 0.75 }}>
                  Cant.
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, py: 0.75 }}>
                  Total
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {byDate.rows.map((day) => {
                const ids = freeItems
                  .filter((it) => String(it.orderDate || "—") === String(day.date))
                  .map((it) => it.id);
                return (
                  <TableRow key={day.date} hover sx={{ "& td": { py: 0.5 } }}>
                    {selectEnabled ? (
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={idsAllSelected(ids)}
                          indeterminate={idsSomeSelected(ids)}
                          disabled={busy || ids.length === 0}
                          onChange={() => onToggleItemIds?.(ids)}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell sx={{ fontWeight: 700 }}>{day.date}</TableCell>
                    <TableCell align="right">{day.qty}</TableCell>
                    <TableCell align="right">{money(day.total)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      ) : null}

      {view === "product" && freeItems.length === 0 && byOrders.length > 0 ? (
        <Alert severity="info" sx={{ py: 0.5 }}>
          {isPaid
            ? "Sin líneas de producto en pedidos liquidados."
            : "No hay líneas sueltas (todo en paca) o no hay ítems pendientes."}
        </Alert>
      ) : null}
    </Box>
  );
}
