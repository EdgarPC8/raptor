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
import { alpha } from "@mui/material/styles";
import EditNoteIcon from "@mui/icons-material/EditNote";
import {
  getBillableQty,
  getItemGroupId,
  money,
  moneyUnitPrice,
  toNum,
} from "./helpers.js";
import { buildPendingByDate, buildPendingByProduct } from "./summaryBuilders.js";

const VIEW_TABS = [
  { id: "orders", label: "Por pedidos" },
  { id: "product", label: "Por producto" },
  { id: "date", label: "Por fecha" },
];

function lineTotal(it) {
  return Number((getBillableQty(it) * toNum(it.price)).toFixed(2));
}

/**
 * Pestaña Vista: compacta, solo lectura + selección para agrupar.
 * Subvistas: pedidos / producto / fecha.
 */
export default function CollectionsPendingViewTab({
  itemsUngrouped = [],
  selectedItemIds = [],
  onToggleItemIds,
  onClearSelection,
  onCreateGroup,
  onPrepareOrderGroup,
  onAbonarOrder,
  onEditOrder,
  selectedTotal = 0,
  busy = false,
  onTxtReport,
}) {
  const [sub, setSub] = useState(0);
  const view = VIEW_TABS[sub]?.id || "orders";

  const byOrders = useMemo(() => {
    const map = new Map();
    for (const it of itemsUngrouped) {
      const oid = it.orderId;
      if (oid == null) continue;
      if (!map.has(oid)) {
        map.set(oid, {
          orderId: oid,
          date: it.orderDate || "",
          items: [],
          total: 0,
        });
      }
      const row = map.get(oid);
      row.items.push(it);
      row.total = Number((row.total + lineTotal(it)).toFixed(2));
    }
    return Array.from(map.values()).sort((a, b) => {
      const da = String(b.date || "");
      const db = String(a.date || "");
      if (da !== db) return da.localeCompare(db);
      return Number(b.orderId) - Number(a.orderId);
    });
  }, [itemsUngrouped]);

  const byProduct = useMemo(
    () => buildPendingByProduct(itemsUngrouped),
    [itemsUngrouped]
  );
  const byDate = useMemo(() => buildPendingByDate(itemsUngrouped), [itemsUngrouped]);

  const toggleIds = (ids = []) => onToggleItemIds?.(ids);

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
            Vista pendiente sin grupo
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Solo muestra y selecciona para agrupar. El lápiz edita el pedido (como en Pedidos).
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="outlined"
            disabled={busy || itemsUngrouped.length === 0}
            onClick={() => onTxtReport?.()}
          >
            TXT
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={busy || selectedItemIds.length === 0}
            onClick={() => onCreateGroup?.()}
          >
            Crear grupo
          </Button>
        </Stack>
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

      {selectedItemIds.length > 0 ? (
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
            <b>{selectedItemIds.length}</b> ítem(s) · <b>{money(selectedTotal)}</b>
          </Typography>
          <Button size="small" onClick={() => onClearSelection?.()} disabled={busy}>
            Limpiar
          </Button>
        </Stack>
      ) : null}

      {itemsUngrouped.length === 0 ? (
        <Alert severity="info" sx={{ py: 0.5 }}>
          No hay ítems pendientes sin grupo.
        </Alert>
      ) : null}

      {view === "orders" && itemsUngrouped.length > 0 ? (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 420 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ width: 40 }} />
                <TableCell sx={{ fontWeight: 800, py: 0.75 }}>Pedido</TableCell>
                <TableCell sx={{ fontWeight: 800, py: 0.75 }}>Fecha</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, py: 0.75 }}>
                  Ítems
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, py: 0.75 }}>
                  Total
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, py: 0.75, width: 90 }}>
                  Acción
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {byOrders.map((ord) => {
                const ids = ord.items.map((it) => it.id);
                return (
                  <TableRow key={ord.orderId} hover sx={{ "& td": { py: 0.5 } }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={idsAllSelected(ids)}
                        indeterminate={idsSomeSelected(ids)}
                        disabled={busy}
                        onChange={() => toggleIds(ids)}
                        inputProps={{
                          "aria-label": `Seleccionar pedido ${ord.orderId}`,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>#{ord.orderId}</TableCell>
                    <TableCell>{ord.date || "—"}</TableCell>
                    <TableCell align="right">{ord.items.length}</TableCell>
                    <TableCell align="right">{money(ord.total)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.25} justifyContent="flex-end" alignItems="center">
                        {onEditOrder ? (
                          <Tooltip title="Editar pedido">
                            <span>
                              <IconButton
                                size="small"
                                disabled={busy}
                                onClick={() => onEditOrder?.(ord.orderId)}
                              >
                                <EditNoteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : null}
                        <Button
                          size="small"
                          disabled={busy || !onPrepareOrderGroup}
                          onClick={() =>
                            onPrepareOrderGroup?.({
                              orderId: ord.orderId,
                              itemIds: ids,
                              concept: `Pedido #${ord.orderId}${
                                ord.date ? ` (${ord.date})` : ""
                              }`,
                            })
                          }
                        >
                          Agrupar
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={busy || !onAbonarOrder}
                          onClick={() =>
                            onAbonarOrder?.({
                              orderId: ord.orderId,
                              itemIds: ids,
                              concept: `Pedido #${ord.orderId}${
                                ord.date ? ` (${ord.date})` : ""
                              }`,
                            })
                          }
                        >
                          Abonar
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      ) : null}

      {view === "product" && itemsUngrouped.length > 0 ? (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 480 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ width: 40 }} />
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
                const ids = r.selectableItemIds?.length
                  ? r.selectableItemIds
                  : r.itemIds || [];
                return (
                  <TableRow
                    key={`${r.product}\0${r.unitPrice}`}
                    hover
                    sx={{ "& td": { py: 0.5 } }}
                  >
                    <TableCell padding="checkbox">
                      <Tooltip title="Seleccionar líneas de este producto">
                        <span>
                          <Checkbox
                            size="small"
                            checked={idsAllSelected(ids)}
                            indeterminate={idsSomeSelected(ids)}
                            disabled={busy || ids.length === 0}
                            onChange={() => toggleIds(ids)}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
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

      {view === "date" && itemsUngrouped.length > 0 ? (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 360 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ width: 40 }} />
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
                const ids = (itemsUngrouped || [])
                  .filter((it) => String(it.orderDate || "—") === String(day.date))
                  .filter((it) => !getItemGroupId(it))
                  .map((it) => it.id);
                return (
                  <TableRow key={day.date} hover sx={{ "& td": { py: 0.5 } }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={idsAllSelected(ids)}
                        indeterminate={idsSomeSelected(ids)}
                        disabled={busy || ids.length === 0}
                        onChange={() => toggleIds(ids)}
                      />
                    </TableCell>
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
    </Box>
  );
}
