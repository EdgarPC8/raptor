/**
 * Etiquetas / opciones de Autocomplete para productos (stock + precios con color).
 */
import { Box, Chip, Stack, Typography } from "@mui/material";

const stockFmt = (v) =>
  new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(Number(v || 0));

const moneyFmt = (v) =>
  new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

function stockColor(stock, minStock = 0) {
  const q = Number(stock || 0);
  const min = Number(minStock || 0);
  if (q <= 0) return "error";
  if (min > 0 && q <= min) return "warning";
  return "success";
}

/** Texto del input cerrado: Nombre · stock · precio */
export function productSelectLabel(p) {
  if (!p) return "";
  const parts = [p.name || ""];
  if (p.stock != null && p.stock !== "") {
    parts.push(`stk ${stockFmt(p.stock)}`);
  }
  if (p.price != null && p.price !== "") {
    parts.push(moneyFmt(p.price));
  }
  return parts.filter(Boolean).join(" · ");
}

/** Fila de lista con chips de stock (verde/ámbar/rojo) y precio (azul). */
export function renderProductSelectOption(props, option, opts = {}) {
  if (!option) return null;
  const showCost = Boolean(opts.showCost);
  const stock = Number(option.stock ?? 0);
  const minStock = Number(option.minStock ?? 0);
  const sale = Number(option.price ?? 0);
  const cost = Number(option.supplierPrice ?? 0);

  return (
    <Box
      component="li"
      {...props}
      key={option.id ?? props.key}
      sx={{
        display: "flex !important",
        alignItems: "center !important",
        justifyContent: "space-between !important",
        gap: 1,
        py: "6px !important",
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {option.name}
        </Typography>
        {(option.sku || option.barcode) && (
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {[option.sku, option.barcode].filter(Boolean).join(" · ")}
          </Typography>
        )}
      </Box>
      <Stack direction="row" spacing={0.5} flexShrink={0} useFlexGap flexWrap="wrap" justifyContent="flex-end">
        <Chip
          size="small"
          color={stockColor(stock, minStock)}
          label={`Stock ${stockFmt(stock)}`}
          sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem", fontWeight: 700 } }}
        />
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={moneyFmt(sale)}
          title="Precio de venta"
          sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem", fontWeight: 700 } }}
        />
        {showCost && cost > 0 && (
          <Chip
            size="small"
            color="secondary"
            variant="outlined"
            label={`Costo ${moneyFmt(cost)}`}
            title="Precio proveedor / costo"
            sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.68rem", fontWeight: 600 } }}
          />
        )}
      </Stack>
    </Box>
  );
}

export { stockFmt, moneyFmt, stockColor };
