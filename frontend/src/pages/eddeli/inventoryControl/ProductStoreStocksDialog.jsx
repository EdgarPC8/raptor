import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import {
  getProductStoreStocksRequest,
  getStoresRequest,
  transferStoreStockRequest,
} from "../../../api/inventoryControlRequest.js";
import { locationKindLabel, storeHoldsInventory } from "../../../utils/storeLocationKind.js";

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Vista centrada en un producto para consultar dónde está su stock y trasladarlo.
 * Solo se monta desde Productos cuando multistock está activo.
 */
export default function ProductStoreStocksDialog({ open, product, onClose, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [stores, setStores] = useState([]);
  const [fromStoreId, setFromStoreId] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    if (!product?.id) return;
    setLoading(true);
    setError("");
    try {
      const [{ data: stockData }, { data: storesData }] = await Promise.all([
        getProductStoreStocksRequest(product.id),
        getStoresRequest({ isActive: true }),
      ]);
      const inventoryStores = (Array.isArray(storesData) ? storesData : []).filter(
        (store) => store.isActive !== false && storeHoldsInventory(store.locationKind),
      );
      const nextStocks = Array.isArray(stockData?.storeStocks) ? stockData.storeStocks : [];
      setStocks(nextStocks);
      setStores(inventoryStores);
      const firstWithStock = nextStocks.find((row) => number(row.quantity) > 0);
      setFromStoreId(firstWithStock ? String(firstWithStock.storeId) : "");
      const firstDestination = inventoryStores.find(
        (store) => Number(store.id) !== Number(firstWithStock?.storeId),
      );
      setToStoreId(firstDestination ? String(firstDestination.id) : "");
      setQuantity("");
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo cargar el stock por local.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const stockByStore = useMemo(
    () => new Map(stocks.map((row) => [Number(row.storeId), number(row.quantity)])),
    [stocks],
  );
  const sourceAvailable = stockByStore.get(Number(fromStoreId)) || 0;

  const transfer = async () => {
    const from = Number(fromStoreId);
    const to = Number(toStoreId);
    const amount = number(quantity);
    if (!from || !to || from === to) {
      setError("Selecciona locales de origen y destino distintos.");
      return;
    }
    if (!(amount > 0)) {
      setError("Ingresa una cantidad válida.");
      return;
    }
    if (amount > sourceAvailable) {
      setError(`Solo hay ${sourceAvailable} unidad(es) disponibles en el origen.`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await transferStoreStockRequest({
        fromStoreId: from,
        toStoreId: to,
        productId: Number(product.id),
        quantity: amount,
      });
      await load();
      await onChanged?.();
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo realizar el traspaso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !loading && onClose?.()} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>
        Stock por local · {product?.name || "Producto"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Total del producto: <b>{number(product?.stock)}</b>. Aquí ves su distribución y
            puedes trasladar unidades entre Bodega y sucursales propias.
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <Stack spacing={0.75}>
            {stores.map((store) => (
              <Stack
                key={store.id}
                direction="row"
                justifyContent="space-between"
                sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1 }}
              >
                <Typography variant="body2">
                  {store.name} ({locationKindLabel(store.locationKind)})
                </Typography>
                <Typography variant="body2" fontWeight={800}>
                  {stockByStore.get(Number(store.id)) || 0}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Divider />
          <Typography variant="subtitle2" fontWeight={800}>
            Traspasar este producto
          </Typography>
          <TextField
            select
            label="Desde"
            value={fromStoreId}
            onChange={(event) => {
              setFromStoreId(event.target.value);
              setError("");
            }}
            disabled={loading}
            fullWidth
          >
            {stores.map((store) => (
              <MenuItem key={store.id} value={String(store.id)}>
                {store.name} · disponible {stockByStore.get(Number(store.id)) || 0}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Hacia"
            value={toStoreId}
            onChange={(event) => {
              setToStoreId(event.target.value);
              setError("");
            }}
            disabled={loading}
            fullWidth
          >
            {stores
              .filter((store) => Number(store.id) !== Number(fromStoreId))
              .map((store) => (
                <MenuItem key={store.id} value={String(store.id)}>
                  {store.name} ({locationKindLabel(store.locationKind)})
                </MenuItem>
              ))}
          </TextField>
          <TextField
            label={`Cantidad (disponible: ${sourceAvailable})`}
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            inputProps={{ min: 0, max: sourceAvailable, step: "any" }}
            disabled={loading}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          Cerrar
        </Button>
        <Button
          variant="contained"
          startIcon={<SwapHorizIcon />}
          onClick={transfer}
          disabled={loading || !fromStoreId || !toStoreId}
        >
          Traspasar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
