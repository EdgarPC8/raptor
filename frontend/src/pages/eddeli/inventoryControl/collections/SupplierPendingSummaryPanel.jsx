import React, { useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import PaymentsIcon from "@mui/icons-material/Payments";
import { alpha } from "@mui/material/styles";
import { money, moneyUnitPrice, toNum } from "./helpers.js";
import {
  buildSupplierPendingByDate,
  buildSupplierPendingByProduct,
} from "./summaryBuilders.js";

const SUB_VIEWS = [
  { id: "orders", label: "Por pedidos" },
  { id: "product", label: "Por producto" },
  { id: "date", label: "Por fecha" },
];

function SummaryTable({ head, rows }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {head.map((h) => (
            <TableCell key={h} sx={{ fontWeight: 800 }}>
              {h}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((cols, i) => (
          <TableRow key={i}>
            {cols.map((c, j) => (
              <TableCell key={j}>{c}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function lineTotal(it) {
  if (it.lineTotal != null) return toNum(it.lineTotal);
  const qty = toNum(it.quantity);
  const price = toNum(it.unitPrice);
  const tax = toNum(it.taxRate);
  return Number((qty * price * (1 + tax / 100)).toFixed(2));
}

/**
 * Resumen pendiente proveedores:
 * - Por pedidos: accordion + Abonar este pedido (como clientes)
 * - Por producto: mismo producto+precio agrupado, columna Pedidos
 * - Programador edita líneas dentro del pedido
 */
export default function SupplierPendingSummaryPanel({
  debtTotal,
  pendingOrders = [],
  pendingItems = [],
  packs = [],
  isProgrammer = false,
  canSelectItems = false,
  selectedItemIds = [],
  onToggleItem,
  selectedOrderIds = [],
  onToggleOrder,
  onClearOrderSelection,
  onCreateOrderGroup,
  editingItemId = null,
  editFields = {},
  onEditToggle,
  onEditFieldChange,
  onEditConfirm,
  onAbonarOrder,
  busy = false,
}) {
  const [subView, setSubView] = useState(0);
  const currentView = SUB_VIEWS[subView]?.id || "orders";

  const freeItems = useMemo(
    () => (pendingItems || []).filter((it) => !it.packId),
    [pendingItems]
  );

  const byProduct = useMemo(
    () => buildSupplierPendingByProduct(freeItems),
    [freeItems]
  );
  const byDate = useMemo(
    () => buildSupplierPendingByDate(freeItems),
    [freeItems]
  );

  const byOrders = useMemo(() => {
    return (pendingOrders || [])
      .slice()
      .sort((a, b) => {
        const ra = toNum(b.remainingAmount) - toNum(a.remainingAmount);
        if (ra !== 0) return ra;
        return String(b.date || "").localeCompare(String(a.date || ""));
      });
  }, [pendingOrders]);

  return (
    <Card variant="outlined" sx={{ mb: 2, width: "100%", boxSizing: "border-box" }}>
      <CardContent sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 1.5, sm: 2 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "flex-start" }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Resumen pendiente (por pagar)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deuda: <b>{money(debtTotal)}</b>
              {currentView === "product" && (
                <>
                  {" "}
                  · Cantidad: <b>{byProduct.grandQty}</b>
                </>
              )}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={`Deuda: ${money(debtTotal)}`}
            color="error"
            variant="outlined"
          />
        </Stack>

        <Tabs
          value={subView}
          onChange={(_, v) => setSubView(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mt: 1, borderBottom: 1, borderColor: "divider" }}
        >
          {SUB_VIEWS.map((v) => (
            <Tab key={v.id} label={v.label} />
          ))}
        </Tabs>

        <Divider sx={{ my: 1.5 }} />

        {currentView === "orders" && (
          <Stack spacing={1}>
            {byOrders.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin pedidos con saldo pendiente para este proveedor.
              </Typography>
            ) : (
              <>
                {canSelectItems ? (
                  <Typography variant="caption" color="text.secondary">
                    Marcá pedidos y creá un <b>grupo de pago</b> (pestaña Grupos). No cambia
                    precios. El abono lo hacés después.
                  </Typography>
                ) : null}
                {canSelectItems && selectedOrderIds?.length > 0 ? (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    justifyContent="space-between"
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      border: 1,
                      borderColor: "primary.light",
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                    }}
                  >
                    <Typography variant="body2">
                      <b>{selectedOrderIds.length}</b> pedido(s) · Saldo{" "}
                      <b>
                        {money(
                          byOrders
                            .filter((o) =>
                              (selectedOrderIds || []).some((id) => Number(id) === Number(o.id))
                            )
                            .reduce((s, o) => s + toNum(o.remainingAmount), 0)
                        )}
                      </b>
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Button size="small" onClick={() => onClearOrderSelection?.()}>
                        Limpiar
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        disabled={busy || !onCreateOrderGroup}
                        onClick={() => onCreateOrderGroup?.(selectedOrderIds)}
                      >
                        Crear grupo
                      </Button>
                    </Stack>
                  </Stack>
                ) : null}
                {byOrders.map((ord) => {
                const items = ord.items || [];
                const pct =
                  toNum(ord.totalAmount) > 0
                    ? Math.min(
                        100,
                        Math.round((toNum(ord.paidAmount) / toNum(ord.totalAmount)) * 100)
                      )
                    : 0;
                const orderIdNum = Number(ord.id);
                const orderChecked = (selectedOrderIds || []).some(
                  (id) => Number(id) === orderIdNum
                );
                const canCheckOrder = toNum(ord.remainingAmount) > 0.009;
                return (
                  <Stack
                    key={ord.id}
                    direction="row"
                    alignItems="flex-start"
                    spacing={0.25}
                    sx={{ width: "100%" }}
                  >
                    {canSelectItems ? (
                      <Tooltip
                        title={
                          canCheckOrder
                            ? "Seleccionar para agrupar"
                            : "Sin saldo pendiente"
                        }
                      >
                        <span>
                          <Checkbox
                            size="small"
                            checked={Boolean(orderChecked)}
                            disabled={busy || !canCheckOrder}
                            onChange={() => onToggleOrder?.(orderIdNum)}
                            sx={{ mt: 0.75, flexShrink: 0, position: "relative", zIndex: 2 }}
                            inputProps={{ "aria-label": `Seleccionar pedido ${ord.id}` }}
                          />
                        </span>
                      </Tooltip>
                    ) : null}
                    <Accordion
                      variant="outlined"
                      disableGutters
                      sx={{ flex: 1, minWidth: 0 }}
                    >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ width: "100%", pr: 1 }}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Typography sx={{ fontWeight: 800 }}>Pedido #{ord.id}</Typography>
                        {ord.date ? (
                          <Chip size="small" label={ord.date} variant="outlined" />
                        ) : null}
                        <Chip
                          size="small"
                          label={ord.status}
                          color={ord.status === "recibido" ? "success" : "default"}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={`Saldo ${money(ord.remainingAmount)}`}
                          color="error"
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={`Total ${money(ord.totalAmount)}`}
                          variant="outlined"
                        />
                        {items.some((it) => it.packId) ? (
                          <Chip
                            size="small"
                            color="success"
                            variant="outlined"
                            label="En paca/grupo"
                          />
                        ) : null}
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        color="error"
                        sx={{ mb: 1.5, height: 6, borderRadius: 99 }}
                      />
                      <SupplierOrderLinesTable
                        items={items.map((it) => ({
                          ...it,
                          orderId: ord.id,
                          orderDate: ord.date,
                          orderReceivedAt: ord.receivedAt || null,
                          orderRemaining: toNum(ord.remainingAmount),
                        }))}
                        isProgrammer={isProgrammer}
                        canSelectItems={canSelectItems}
                        selectedItemIds={selectedItemIds}
                        onToggleItem={onToggleItem}
                        editingItemId={editingItemId}
                        editFields={editFields}
                        onEditToggle={onEditToggle}
                        onEditFieldChange={onEditFieldChange}
                        onEditConfirm={onEditConfirm}
                        busy={busy}
                      />
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        sx={{ mt: 1.5 }}
                        justifyContent="flex-end"
                      >
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          startIcon={<PaymentsIcon />}
                          disabled={busy || !onAbonarOrder}
                          onClick={() => onAbonarOrder?.(ord)}
                        >
                          Abonar este pedido
                        </Button>
                      </Stack>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mt: 1 }}
                      >
                        El abono se aplica a todo el pedido (parcial o total). Para varios pedidos,
                        marcá y usá «Crear grupo»; después abonás cuando quieras.
                      </Typography>
                    </AccordionDetails>
                    </Accordion>
                  </Stack>
                );
              })}
              </>
            )}
          </Stack>
        )}

        {currentView === "product" && (
          <ProductPendingView
            byProduct={byProduct}
            pendingItems={freeItems}
            isProgrammer={isProgrammer}
            canSelectItems={canSelectItems}
            selectedItemIds={selectedItemIds}
            onToggleItem={onToggleItem}
            editingItemId={editingItemId}
            editFields={editFields}
            onEditToggle={onEditToggle}
            onEditFieldChange={onEditFieldChange}
            onEditConfirm={onEditConfirm}
            busy={busy}
          />
        )}

        {currentView === "date" && (
          <>
            {byDate.rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin ítems pendientes por fecha.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {byDate.rows.map((day) => (
                  <Accordion key={day.date} variant="outlined" disableGutters>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ width: "100%", pr: 1 }}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Typography sx={{ fontWeight: 800 }}>{day.date}</Typography>
                        <Chip size="small" label={`Cant. ${day.qty}`} variant="outlined" />
                        <Chip
                          size="small"
                          label={money(day.total)}
                          color="error"
                          variant="outlined"
                        />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <SummaryTable
                        head={["Producto", "Cant.", "P/U", "Total", "Pedido"]}
                        rows={day.products.map((p) => [
                          p.product,
                          p.qty,
                          moneyUnitPrice(p.unitPrice),
                          money(p.total),
                          p.orderId != null ? `#${p.orderId}` : "—",
                        ])}
                      />
                    </AccordionDetails>
                  </Accordion>
                ))}
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Total pendiente por fechas: {money(byDate.grandTotal)}
                </Typography>
              </Stack>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function itemsForProductPrice(pendingItems, product, unitPrice) {
  return (pendingItems || []).filter((it) => {
    const price = toNum(it.unitPrice ?? it.price, 0);
    return (
      String(it.product || "(sin nombre)") === product &&
      String(price) === String(unitPrice)
    );
  });
}

/** Agrupa filas agregadas por nombre de producto. */
function groupRowsByProductName(rows) {
  const map = new Map();
  for (const r of rows || []) {
    const key = String(r.product || "(sin nombre)");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return Array.from(map.entries()).map(([product, priceRows]) => ({
    product,
    priceRows,
    hasPriceConflict: priceRows.length > 1,
    qty: Number(priceRows.reduce((s, r) => s + toNum(r.qty), 0).toFixed(2)),
    total: Number(priceRows.reduce((s, r) => s + toNum(r.total), 0).toFixed(2)),
    orderIds: [
      ...new Set(priceRows.flatMap((r) => r.orderIds || [])),
    ].sort((a, b) => Number(a) - Number(b)),
  }));
}

function ProductPendingView({
  byProduct,
  pendingItems,
  isProgrammer,
  canSelectItems,
  selectedItemIds,
  onToggleItem,
  editingItemId,
  editFields,
  onEditToggle,
  onEditFieldChange,
  onEditConfirm,
  busy,
}) {
  const groups = useMemo(
    () => groupRowsByProductName(byProduct.rows),
    [byProduct.rows]
  );
  const flatGroups = groups.filter((g) => !g.hasPriceConflict);
  const conflictGroups = groups.filter((g) => g.hasPriceConflict);
  const [expandedFlat, setExpandedFlat] = useState({});

  if (byProduct.rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sin deuda pendiente por producto.
      </Typography>
    );
  }

  const toggleGroupItems = (itemIds = []) => {
    if (!onToggleItem || !itemIds.length) return;
    const allSelected = itemIds.every((id) => selectedItemIds.includes(id));
    itemIds.forEach((id) => {
      const selected = selectedItemIds.includes(id);
      if (allSelected && selected) onToggleItem(id);
      if (!allSelected && !selected) onToggleItem(id);
    });
  };

  const renderAggPedido = (orderIds = []) => (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {orderIds.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          —
        </Typography>
      ) : (
        orderIds.map((oid) => (
          <Chip key={oid} size="small" label={`#${oid}`} variant="outlined" />
        ))
      )}
    </Stack>
  );

  return (
    <Stack spacing={1.5}>
      <Typography variant="caption" color="text.secondary">
        Productos sueltos (sin paca). Mismo producto y precio = una fila.
        {canSelectItems
          ? " Marcá filas para armar una paca/cartón (queda en la pestaña Pacas)."
          : ""}
        {isProgrammer
          ? " Expandí para editar precio/cantidad."
          : ""}
      </Typography>

      {flatGroups.length > 0 ? (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: canSelectItems || isProgrammer ? 640 : 480 }}>
            <TableHead>
              <TableRow>
                {canSelectItems || isProgrammer ? (
                  <TableCell sx={{ width: 42 }} />
                ) : null}
                <TableCell sx={{ fontWeight: 800 }}>Producto</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Pedido</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  Cant.
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  P/U
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  Total
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flatGroups.map((g) => {
                const priceRow = g.priceRows[0];
                const groupItems = itemsForProductPrice(
                  pendingItems,
                  g.product,
                  priceRow.unitPrice
                );
                const selectableIds = groupItems
                  .filter((it) => !it.packId)
                  .map((it) => it.id);
                const allSelected =
                  selectableIds.length > 0 &&
                  selectableIds.every((id) => selectedItemIds.includes(id));
                const someSelected =
                  !allSelected &&
                  selectableIds.some((id) => selectedItemIds.includes(id));
                const open = Boolean(expandedFlat[g.product]);
                const rowKey = g.product;

                return (
                  <React.Fragment key={rowKey}>
                    <TableRow hover selected={allSelected || someSelected}>
                      {canSelectItems || isProgrammer ? (
                        <TableCell padding="checkbox">
                          <Stack direction="row" alignItems="center" spacing={0}>
                            {canSelectItems ? (
                              <Checkbox
                                size="small"
                                checked={allSelected}
                                indeterminate={someSelected}
                                disabled={busy || selectableIds.length === 0}
                                onChange={() => toggleGroupItems(selectableIds)}
                              />
                            ) : null}
                            {isProgrammer || canSelectItems ? (
                              <IconButton
                                size="small"
                                aria-label={open ? "Ocultar detalle" : "Ver detalle"}
                                onClick={() =>
                                  setExpandedFlat((prev) => ({
                                    ...prev,
                                    [rowKey]: !prev[rowKey],
                                  }))
                                }
                              >
                                <ExpandMoreIcon
                                  fontSize="small"
                                  sx={{
                                    transform: open ? "rotate(180deg)" : "none",
                                    transition: "transform .15s",
                                  }}
                                />
                              </IconButton>
                            ) : null}
                          </Stack>
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {g.product}
                        </Typography>
                        {groupItems.some((it) => it.packId) ? (
                          <Typography variant="caption" color="warning.main">
                            Incluye líneas en paca
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>{renderAggPedido(g.orderIds)}</TableCell>
                      <TableCell align="right">{g.qty}</TableCell>
                      <TableCell align="right">
                        {moneyUnitPrice(priceRow.unitPrice)}
                      </TableCell>
                      <TableCell align="right">{money(g.total)}</TableCell>
                    </TableRow>
                    {open ? (
                      <TableRow>
                        <TableCell
                          colSpan={canSelectItems || isProgrammer ? 6 : 5}
                          sx={{ bgcolor: "action.hover", py: 1.5 }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mb: 0.75 }}
                          >
                            Detalle por pedido (edición / selección individual)
                          </Typography>
                          <SupplierOrderLinesTable
                            items={groupItems}
                            isProgrammer={isProgrammer}
                            canSelectItems={canSelectItems}
                            selectedItemIds={selectedItemIds}
                            onToggleItem={onToggleItem}
                            editingItemId={editingItemId}
                            editFields={editFields}
                            onEditToggle={onEditToggle}
                            onEditFieldChange={onEditFieldChange}
                            onEditConfirm={onEditConfirm}
                            busy={busy}
                            showOrderColumn
                          />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      ) : null}

      {conflictGroups.map((g) => (
        <Accordion key={g.product} variant="outlined" disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ width: "100%", pr: 1 }}
              flexWrap="wrap"
              useFlexGap
            >
              <Typography sx={{ fontWeight: 800 }}>{g.product}</Typography>
              <Chip
                size="small"
                label={`${g.priceRows.length} precios`}
                color="warning"
                variant="outlined"
              />
              <Chip size="small" label={`Cant. ${g.qty}`} variant="outlined" />
              <Chip
                size="small"
                label={money(g.total)}
                color="error"
                variant="outlined"
              />
              {g.orderIds.map((oid) => (
                <Chip key={oid} size="small" label={`#${oid}`} variant="outlined" />
              ))}
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              {g.priceRows.map((r) => {
                const groupItems = itemsForProductPrice(
                  pendingItems,
                  r.product,
                  r.unitPrice
                );
                return (
                  <Box key={`${r.product}\0${r.unitPrice}`}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ mb: 0.75 }}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Chip
                        size="small"
                        label={`P/U ${moneyUnitPrice(r.unitPrice)}`}
                        variant="outlined"
                      />
                      <Chip size="small" label={`Cant. ${r.qty}`} variant="outlined" />
                      <Chip
                        size="small"
                        label={money(r.total)}
                        color="error"
                        variant="outlined"
                      />
                      {(r.orderIds || []).map((oid) => (
                        <Chip
                          key={oid}
                          size="small"
                          label={`#${oid}`}
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                    <SupplierOrderLinesTable
                      items={groupItems}
                      isProgrammer={isProgrammer}
                      canSelectItems={canSelectItems}
                      selectedItemIds={selectedItemIds}
                      onToggleItem={onToggleItem}
                      editingItemId={editingItemId}
                      editFields={editFields}
                      onEditToggle={onEditToggle}
                      onEditFieldChange={onEditFieldChange}
                      onEditConfirm={onEditConfirm}
                      busy={busy}
                      showOrderColumn
                    />
                  </Box>
                );
              })}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}

      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        Total por productos: {money(byProduct.grandTotal)} · Cant. {byProduct.grandQty}
      </Typography>
    </Stack>
  );
}

function SupplierOrderLinesTable({
  items,
  isProgrammer,
  canSelectItems = false,
  selectedItemIds = [],
  onToggleItem,
  editingItemId,
  editFields,
  onEditToggle,
  onEditFieldChange,
  onEditConfirm,
  busy,
  showOrderColumn = false,
}) {
  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: isProgrammer || canSelectItems ? 680 : 480 }}>
        <TableHead>
          <TableRow>
            {canSelectItems ? <TableCell sx={{ width: 42 }} /> : null}
            <TableCell sx={{ fontWeight: 800 }}>Producto</TableCell>
            {showOrderColumn ? (
              <TableCell sx={{ fontWeight: 800 }}>Pedido</TableCell>
            ) : null}
            <TableCell align="right" sx={{ fontWeight: 800 }}>
              Cant.
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 800 }}>
              P/U
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 800 }}>
              Total
            </TableCell>
            {isProgrammer ? (
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                Acciones
              </TableCell>
            ) : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {(items || []).map((it) => {
            const editing = isProgrammer && editingItemId === it.id;
            const fields = editFields?.[it.id] || {};
            const canEditPrice = toNum(it.orderRemaining) > 0.009;
            const canEditQty = !it.orderReceivedAt;
            const canEdit = isProgrammer && (canEditPrice || canEditQty);
            const qty = editing ? toNum(fields.quantity, it.quantity) : toNum(it.quantity);
            const price = editing
              ? toNum(fields.unitPrice, it.unitPrice)
              : toNum(it.unitPrice);
            const total = editing
              ? Number((qty * price * (1 + toNum(it.taxRate) / 100)).toFixed(2))
              : lineTotal({ ...it, quantity: qty, unitPrice: price });
            const inPack = Boolean(it.packId);
            const checked = selectedItemIds.includes(it.id);

            return (
              <TableRow key={it.id} hover selected={checked}>
                {canSelectItems ? (
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={checked}
                      disabled={busy || inPack}
                      onChange={() => onToggleItem?.(it.id)}
                    />
                  </TableCell>
                ) : null}
                <TableCell>
                  <Typography variant="body2">{it.product}</Typography>
                  {inPack ? (
                    <Chip
                      size="small"
                      label={`Paca #${it.packId}`}
                      color="warning"
                      variant="outlined"
                      sx={{ mt: 0.25, height: 20, fontSize: "0.65rem" }}
                    />
                  ) : null}
                </TableCell>
                {showOrderColumn ? (
                  <TableCell>
                    <Chip size="small" label={`#${it.orderId}`} variant="outlined" />
                  </TableCell>
                ) : null}
                <TableCell align="right">
                  {editing && canEditQty ? (
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 0.01, step: "any" }}
                      value={fields.quantity ?? ""}
                      onChange={(e) =>
                        onEditFieldChange?.(it.id, "quantity", e.target.value)
                      }
                      sx={{ width: 88 }}
                    />
                  ) : (
                    qty
                  )}
                </TableCell>
                <TableCell align="right">
                  {editing && canEditPrice ? (
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 0, step: "0.001" }}
                      value={fields.unitPrice ?? ""}
                      onChange={(e) =>
                        onEditFieldChange?.(it.id, "unitPrice", e.target.value)
                      }
                      sx={{ width: 100 }}
                    />
                  ) : (
                    moneyUnitPrice(price)
                  )}
                </TableCell>
                <TableCell align="right">{money(total)}</TableCell>
                {isProgrammer ? (
                  <TableCell align="right">
                    {!canEdit ? (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    ) : !editing ? (
                      <Tooltip title="Editar precio / cantidad">
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={busy}
                            onClick={() => onEditToggle?.(it)}
                          >
                            <EditNoteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : (
                      <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                        <Tooltip title="Guardar">
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              disabled={busy}
                              onClick={() => onEditConfirm?.(it)}
                            >
                              <SaveIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Cancelar">
                          <span>
                            <IconButton
                              size="small"
                              disabled={busy}
                              onClick={() => onEditToggle?.(null)}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
