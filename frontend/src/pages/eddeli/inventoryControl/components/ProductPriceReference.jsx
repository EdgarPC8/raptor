import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

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

const COLOR_SUPPLIER = "#ed6c02"; // naranja — precio proveedor
const COLOR_CONSUMER = "#2e7d32"; // verde — precio consumidor

function PriceLegend({ showDistributor = false }) {
  return (
    <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: 0.5,
            bgcolor: COLOR_SUPPLIER,
            flexShrink: 0,
          }}
        />
        <Typography variant="caption" sx={{ color: COLOR_SUPPLIER, fontWeight: 700 }}>
          Proveedor
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: 0.5,
            bgcolor: COLOR_CONSUMER,
            flexShrink: 0,
          }}
        />
        <Typography variant="caption" sx={{ color: COLOR_CONSUMER, fontWeight: 700 }}>
          Consumidor
        </Typography>
      </Stack>
      {showDistributor ? (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: 0.5,
              bgcolor: "primary.main",
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" color="primary.main" fontWeight={700}>
            Distribuidor
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  );
}

/**
 * @param {"default"|"supplier"} [variant]
 *   supplier → solo proveedor + consumidor (pedidos a proveedor)
 *   default → incluye también distribuidor
 */
export default function ProductPriceReference({
  product,
  compact = false,
  quantity,
  unitPrice,
  variant = "default",
}) {
  if (!product) return null;

  const supplier = Number(product.supplierPrice ?? 0);
  const distributor = Number(product.distributorPrice ?? 0);
  const consumer = Number(product.price ?? 0);
  const unitLabel = getProductUnitLabel(product);
  const isSupplierVariant = variant === "supplier";
  const lineSummary = (
    <OrderLineSummary
      quantity={quantity}
      unitPrice={unitPrice}
      unitLabel={unitLabel}
      sx={{ mt: compact ? 0.75 : 1 }}
    />
  );

  if (compact) {
    return (
      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
        <PriceLegend showDistributor={!isSupplierVariant} />
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            variant="outlined"
            sx={{
              borderColor: COLOR_SUPPLIER,
              color: COLOR_SUPPLIER,
              fontWeight: 700,
            }}
            label={`Prov. ${formatProductPrice(supplier)}/${unitLabel}`}
          />
          {!isSupplierVariant ? (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={`Dist. ${formatProductPrice(distributor)}/${unitLabel}`}
            />
          ) : null}
          <Chip
            size="small"
            variant="outlined"
            sx={{
              borderColor: COLOR_CONSUMER,
              color: COLOR_CONSUMER,
              fontWeight: 700,
            }}
            label={`Cons. ${formatProductPrice(consumer)}/${unitLabel}`}
          />
        </Stack>
        {lineSummary}
      </Stack>
    );
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
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        Precios del producto (por {unitLabel})
      </Typography>
      <PriceLegend showDistributor={!isSupplierVariant} />
      <Stack spacing={0.65}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" fontWeight={700} sx={{ color: COLOR_SUPPLIER }}>
            Precio proveedor
          </Typography>
          <Typography variant="body2" fontWeight={800} sx={{ color: COLOR_SUPPLIER }}>
            {formatProductPrice(supplier)}
          </Typography>
        </Stack>
        {!isSupplierVariant ? (
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" fontWeight={600} color="primary.main">
              Precio distribuidor
            </Typography>
            <Typography variant="body2" fontWeight={700} color="primary.main">
              {formatProductPrice(distributor)}
            </Typography>
          </Stack>
        ) : null}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" fontWeight={700} sx={{ color: COLOR_CONSUMER }}>
            Precio consumidor
          </Typography>
          <Typography variant="body2" fontWeight={800} sx={{ color: COLOR_CONSUMER }}>
            {formatProductPrice(consumer)}
          </Typography>
        </Stack>
        {lineSummary}
      </Stack>
    </Paper>
  );
}
