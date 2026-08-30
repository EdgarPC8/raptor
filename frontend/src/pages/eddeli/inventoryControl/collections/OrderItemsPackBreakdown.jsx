import React, { useMemo, useState } from "react";
import {
  Box,
  Checkbox,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import {
  buildBoardOrder,
  hydratePacksAndLots,
} from "../components/orderPackUtils.js";
import { getBillableQty, money, moneyUnitPrice, toNum } from "./helpers.js";

function supplierLineTotal(it) {
  if (it.lineTotal != null) return toNum(it.lineTotal);
  const qty = toNum(it.quantity);
  const price = toNum(it.unitPrice ?? it.price);
  const tax = toNum(it.taxRate);
  return Number((qty * price * (1 + tax / 100)).toFixed(2));
}

function customerLineTotal(it) {
  return Number((getBillableQty(it) * toNum(it.price ?? it.unitPrice)).toFixed(2));
}

function normalizeItems(items, variant) {
  const list = Array.isArray(items) ? items : [];
  return list.map((it) => ({
    ...it,
    id: it.id,
    productId: it.productId,
    quantity: toNum(it.quantity ?? it.qty),
    unitPrice: toNum(it.unitPrice ?? it.price),
    price: toNum(it.price ?? it.unitPrice),
    name: it.product ?? it.name ?? "(sin nombre)",
    packKey: it.packKey || null,
    packName: it.packName || null,
    lotCode: it.lotCode || null,
    expiresAt: it.expiresAt || null,
    manufacturedAt: it.manufacturedAt || null,
    taxRate: variant === "supplier" ? toNum(it.taxRate) : 0,
    packId: it.packId || null,
  }));
}

function ItemRow({
  it,
  variant,
  canSelect,
  selectedItemIds,
  onToggleItem,
  busy,
}) {
  const qty = toNum(it.quantity);
  const price = toNum(variant === "customer" ? it.price : it.unitPrice);
  const total =
    variant === "customer" ? customerLineTotal(it) : supplierLineTotal(it);
  const inFinancePack = Boolean(it.packId);
  const checked = selectedItemIds.includes(it.id);

  return (
    <TableRow hover selected={checked} sx={{ "& td": { py: 0.35 } }}>
      {canSelect ? (
        <TableCell padding="checkbox" sx={{ width: 36 }}>
          <Checkbox
            size="small"
            checked={checked}
            disabled={busy || inFinancePack}
            onChange={() => onToggleItem?.(it.id)}
          />
        </TableCell>
      ) : null}
      <TableCell>
        <Typography variant="body2">{it.name}</Typography>
        {inFinancePack ? (
          <Chip
            size="small"
            label={`Paca finanzas #${it.packId}`}
            color="warning"
            variant="outlined"
            sx={{ mt: 0.25, height: 20, fontSize: "0.65rem" }}
          />
        ) : null}
      </TableCell>
      <TableCell align="right">{qty}</TableCell>
      <TableCell align="right">{moneyUnitPrice(price)}</TableCell>
      <TableCell align="right">{money(total)}</TableCell>
    </TableRow>
  );
}

/**
 * Desglose de ítems de un pedido, agrupados por pacas (solo lectura).
 */
export default function OrderItemsPackBreakdown({
  items = [],
  variant = "customer",
  canSelect = false,
  selectedItemIds = [],
  onToggleItem,
  busy = false,
}) {
  const normalized = useMemo(
    () => normalizeItems(items, variant),
    [items, variant]
  );

  const { items: hydratedItems, packs } = useMemo(() => {
    const priceField = variant === "customer" ? "price" : "unitPrice";
    return hydratePacksAndLots(normalized, { priceField });
  }, [normalized, variant]);

  const boardOrder = useMemo(
    () => buildBoardOrder(hydratedItems, packs),
    [hydratedItems, packs]
  );

  const packsByKey = useMemo(
    () => new Map(packs.map((p) => [p.key, p])),
    [packs]
  );

  const itemsByLineId = useMemo(
    () => new Map(hydratedItems.map((it) => [it.lineId, it])),
    [hydratedItems]
  );

  /** Pacas colapsadas; por defecto todas abiertas e independientes. */
  const [collapsedPacks, setCollapsedPacks] = useState(() => new Set());

  const togglePack = (key) => {
    setCollapsedPacks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isPackExpanded = (key) => !collapsedPacks.has(key);

  if (!normalized.length) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ py: 0.5 }}>
        Sin productos en este pedido.
      </Typography>
    );
  }

  const colSpan = canSelect ? 5 : 4;

  return (
    <Box
      sx={{
        bgcolor: (t) => t.palette.action.hover,
        borderRadius: 1,
        p: 0.75,
        border: 1,
        borderColor: "divider",
      }}
    >
      <Table size="small" sx={{ minWidth: 420 }}>
        <TableHead>
          <TableRow>
            {canSelect ? <TableCell sx={{ width: 36 }} /> : null}
            <TableCell sx={{ fontWeight: 700, py: 0.5 }}>Producto</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, py: 0.5 }}>
              Cant.
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, py: 0.5 }}>
              P/U
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, py: 0.5 }}>
              Total
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {boardOrder.map((entry) => {
            if (entry.type === "item") {
              const it = itemsByLineId.get(entry.key);
              if (!it) return null;
              const raw = normalized.find((row) => row.id === it.id) || it;
              return (
                <ItemRow
                  key={entry.key}
                  it={{ ...raw, name: it.name }}
                  variant={variant}
                  canSelect={canSelect}
                  selectedItemIds={selectedItemIds}
                  onToggleItem={onToggleItem}
                  busy={busy}
                />
              );
            }

            const pack = packsByKey.get(entry.key);
            if (!pack) return null;
            const packItems = hydratedItems.filter((it) => it.packKey === pack.key);
            const packTotal = packItems.reduce((acc, it) => {
              const raw = normalized.find((row) => row.id === it.id) || it;
              return (
                acc +
                (variant === "customer"
                  ? customerLineTotal(raw)
                  : supplierLineTotal(raw))
              );
            }, 0);
            const expanded = isPackExpanded(pack.key);

            return (
              <React.Fragment key={pack.key}>
                <TableRow
                  sx={{
                    bgcolor: (t) => t.palette.primary.main + "12",
                    "& td": { py: 0.35, borderBottom: 0 },
                  }}
                >
                  <TableCell colSpan={colSpan} sx={{ py: 0.5 }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconButton
                        size="small"
                        onClick={() => togglePack(pack.key)}
                        aria-label={expanded ? "Colapsar paca" : "Expandir paca"}
                      >
                        <ExpandMoreIcon
                          fontSize="small"
                          sx={{
                            transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
                            transition: "transform 0.15s",
                          }}
                        />
                      </IconButton>
                      <Inventory2Icon fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight={700}>
                        {pack.name || "Paca"}
                      </Typography>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`${packItems.length} prod.`}
                        sx={{ height: 20 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {money(packTotal)}
                      </Typography>
                      {pack.expiresAt ? (
                        <Typography variant="caption" color="text.secondary">
                          · vence {pack.expiresAt}
                        </Typography>
                      ) : null}
                    </Stack>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={colSpan} sx={{ py: 0, border: 0 }}>
                    <Collapse in={expanded}>
                      <Box sx={{ pl: 1, pb: 0.5 }}>
                        {packItems.map((it) => {
                          const raw = normalized.find((row) => row.id === it.id) || it;
                          return (
                            <ItemRow
                              key={it.lineId}
                              it={{ ...raw, name: it.name }}
                              variant={variant}
                              canSelect={canSelect}
                              selectedItemIds={selectedItemIds}
                              onToggleItem={onToggleItem}
                              busy={busy}
                            />
                          );
                        })}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
