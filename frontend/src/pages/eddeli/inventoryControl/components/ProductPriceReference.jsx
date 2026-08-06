import { Box, ButtonBase, Paper, Stack, Typography } from "@mui/material";

export function formatProductPrice(amount) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount || 0));
}

/**
 * Precio UNITARIO con hasta 8 decimales (reparto exacto de pacas / costos).
 * Los totales de línea se muestran con formatProductPrice (2 decimales de moneda).
 */
export function formatUnitPrice(amount) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(Number(amount || 0));
}

/** Precio por defecto en pedidos a distribuidor/cliente. */
export function getDefaultDistributorPrice(product) {
  if (!product) return 0;
  const dist = Number(product.distributorPrice ?? 0);
  if (dist > 0) return dist;
  return Number(product.price ?? 0);
}

export function getProductUnitLabel(product) {
  const unit = product?.ERP_inventory_unit;
  return unit?.abbreviation || unit?.name || "u.";
}

export function formatOrderLineTotal(quantity, unitPrice) {
  const qty = Number(quantity);
  const price = Number(unitPrice);
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0;
  return qty * price;
}

export function OrderLineSummary({ quantity, unitPrice, unitLabel, sx }) {
  const qty = Number(quantity);
  const price = Number(unitPrice);
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) return null;
  const unit = unitLabel || "u.";
  const total = formatOrderLineTotal(qty, price);
  return (
    <Typography variant="body2" fontWeight={600} color="primary.main" sx={sx}>
      {qty} {unit} × {formatUnitPrice(price)} = {formatProductPrice(total)}
    </Typography>
  );
}

const COLOR_SUPPLIER = "#ed6c02";
const COLOR_CONSUMER = "#2e7d32";
const COLOR_LAST_BUY = "#6a1b9a";
const COLOR_DISTRIBUTOR = "#1565c0";

function PricePickButton({
  label,
  valueLabel,
  hint,
  color,
  disabled = false,
  selected = false,
  onClick,
  fullWidth = false,
}) {
  const clickable = typeof onClick === "function" && !disabled;
  return (
    <ButtonBase
      disabled={!clickable}
      onClick={clickable ? onClick : undefined}
      focusRipple={clickable}
      title={clickable ? `Usar ${label}: ${valueLabel}` : undefined}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "center",
        gap: 0.25,
        flex: fullWidth ? "1 1 100%" : "1 1 0",
        minWidth: fullWidth ? "100%" : 0,
        px: 1,
        py: 0.85,
        borderRadius: 1.25,
        border: "1.5px solid",
        borderColor: selected ? color : color,
        bgcolor: selected ? `${color}14` : "background.paper",
        color,
        textAlign: "left",
        opacity: disabled ? 0.55 : 1,
        cursor: clickable ? "pointer" : "default",
        transition: "background-color .15s, box-shadow .15s, transform .1s",
        boxShadow: selected ? `0 0 0 1px ${color}` : "none",
        "&:hover": clickable
          ? {
              bgcolor: `${color}18`,
              boxShadow: `0 2px 8px ${color}33`,
            }
          : undefined,
        "&:active": clickable ? { transform: "scale(0.98)" } : undefined,
        "&.Mui-disabled": {
          opacity: 0.55,
        },
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: 0.2,
          color: "inherit",
          opacity: 0.9,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 800,
          lineHeight: 1.25,
          color: "inherit",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {valueLabel}
      </Typography>
      {hint ? (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            lineHeight: 1.2,
            mt: 0.15,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {hint}
        </Typography>
      ) : null}
    </ButtonBase>
  );
}

/**
 * @param {"default"|"supplier"} [variant]
 * @param {null|{ unitPrice: number, dateLabel?: string|null, supplierName?: string|null, orderId?: number|null, received?: boolean }} [lastPurchase]
 * @param {(price: number) => void} [onApplyPrice] — clic en cualquier precio para llenar el input
 */
export default function ProductPriceReference({
  product,
  compact = false,
  quantity,
  unitPrice,
  variant = "default",
  lastPurchase = null,
  onApplyPrice,
  onApplyLastPurchase,
}) {
  if (!product) return null;

  const applyPrice =
    typeof onApplyPrice === "function"
      ? onApplyPrice
      : typeof onApplyLastPurchase === "function"
        ? onApplyLastPurchase
        : null;

  const supplier = Number(product.supplierPrice ?? 0);
  const distributor = Number(product.distributorPrice ?? 0);
  const consumer = Number(product.price ?? 0);
  const lastBuy =
    lastPurchase && Number.isFinite(Number(lastPurchase.unitPrice))
      ? Number(lastPurchase.unitPrice)
      : null;
  const hasLastBuy = lastBuy != null && lastBuy >= 0;
  const unitLabel = getProductUnitLabel(product);
  const isSupplierVariant = variant === "supplier";
  const current = Number(unitPrice);
  const sameAs = (n) => Number.isFinite(current) && Math.abs(current - Number(n)) < 1e-9;

  const lastDate = hasLastBuy && lastPurchase.dateLabel
    ? String(lastPurchase.dateLabel).split(" ")[0]
    : null;
  const lastHint = hasLastBuy
    ? [
        lastPurchase.supplierName || null,
        lastPurchase.orderId ? `Pedido #${lastPurchase.orderId}` : null,
        lastPurchase.received === false ? "sin recibir" : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Sin historial de compra";

  const lineSummary = (
    <OrderLineSummary
      quantity={quantity}
      unitPrice={unitPrice}
      unitLabel={unitLabel}
      sx={{ mt: compact ? 0.5 : 0.75 }}
    />
  );

  const catalogButtons = (
    <Stack
      direction="row"
      spacing={0.75}
      useFlexGap
      sx={{ width: "100%", alignItems: "stretch" }}
    >
      <PricePickButton
        label="Proveedor"
        valueLabel={`${formatProductPrice(supplier)}/${unitLabel}`}
        color={COLOR_SUPPLIER}
        selected={sameAs(supplier)}
        onClick={applyPrice ? () => applyPrice(supplier) : undefined}
      />
      <PricePickButton
        label="Distribuidor"
        valueLabel={`${formatProductPrice(distributor)}/${unitLabel}`}
        color={COLOR_DISTRIBUTOR}
        selected={sameAs(distributor)}
        onClick={applyPrice ? () => applyPrice(distributor) : undefined}
      />
      <PricePickButton
        label="Consumidor"
        valueLabel={`${formatProductPrice(consumer)}/${unitLabel}`}
        color={COLOR_CONSUMER}
        selected={sameAs(consumer)}
        onClick={applyPrice ? () => applyPrice(consumer) : undefined}
      />
    </Stack>
  );

  // Always show the three catalog prices aligned; last purchase on top when relevant
  const body = (
    <Stack spacing={0.85} sx={{ width: "100%" }}>
      {(isSupplierVariant || hasLastBuy) && (
        <Box>
          {lastDate ? (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mb: 0.4, fontWeight: 600 }}
            >
              Última compra · {lastDate}
            </Typography>
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mb: 0.4, fontWeight: 600 }}
            >
              Última compra
            </Typography>
          )}
          <PricePickButton
            fullWidth
            label={hasLastBuy ? "Usar precio de compra" : "Sin compra previa"}
            valueLabel={hasLastBuy ? `${formatProductPrice(lastBuy)}/${unitLabel}` : "—"}
            hint={lastHint}
            color={COLOR_LAST_BUY}
            disabled={!hasLastBuy}
            selected={hasLastBuy && sameAs(lastBuy)}
            onClick={
              hasLastBuy && applyPrice ? () => applyPrice(lastBuy) : undefined
            }
          />
        </Box>
      )}

      <Box>
        {(isSupplierVariant || hasLastBuy) && (
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mb: 0.4, fontWeight: 600 }}
          >
            Precios del catálogo
          </Typography>
        )}
        {catalogButtons}
      </Box>

      {lineSummary}
    </Stack>
  );

  if (compact) {
    return <Box sx={{ mt: 0.5, width: "100%" }}>{body}</Box>;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        borderRadius: 1.5,
        bgcolor: "action.hover",
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
        Tocá un valor para llenar el precio unitario (por {unitLabel})
      </Typography>
      {body}
    </Paper>
  );
}
