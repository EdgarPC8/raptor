import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined";
import {
  getProductStoreStocksRequest,
  getStoresRequest,
  registerMovement,
  transferStoreStockRequest,
} from "../../../api/inventoryControlRequest.js";
import { locationKindLabel, storeHoldsInventory } from "../../../utils/storeLocationKind.js";

const number = (value) => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Multistock: ver suma, editar stock por local y traspasar entre locales.
 */
export default function ProductStoreStocksDialog({ open, product, onClose, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [savingStoreId, setSavingStoreId] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [stores, setStores] = useState([]);
  const [draftByStore, setDraftByStore] = useState({});
  const [fromStoreId, setFromStoreId] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const load = async () => {
    if (!product?.id) return;
    setLoading(true);
    setError("");
    setOkMsg("");
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

      const drafts = {};
      for (const store of inventoryStores) {
        const row = nextStocks.find((s) => Number(s.storeId) === Number(store.id));
        drafts[String(store.id)] = String(number(row?.quantity));
      }
      setDraftByStore(drafts);

      const firstWithStock = nextStocks.find((row) => number(row.quantity) > 0);
      setFromStoreId(firstWithStock ? String(firstWithStock.storeId) : inventoryStores[0] ? String(inventoryStores[0].id) : "");
      const firstDestination = inventoryStores.find(
        (store) => Number(store.id) !== Number(firstWithStock?.storeId || inventoryStores[0]?.id),
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

  const totalSum = useMemo(
    () => stores.reduce((acc, store) => acc + (stockByStore.get(Number(store.id)) || 0), 0),
    [stores, stockByStore],
  );

  const sourceAvailable = stockByStore.get(Number(fromStoreId)) || 0;

  const setDraft = (storeId, value) => {
    setDraftByStore((prev) => ({ ...prev, [String(storeId)]: value }));
    setError("");
    setOkMsg("");
  };

  const saveStoreStock = async (store) => {
    const storeId = Number(store.id);
    const next = number(draftByStore[String(storeId)]);
    const current = stockByStore.get(storeId) || 0;
    if (!(next >= 0) || !Number.isFinite(next)) {
      setError("Ingresá un stock válido (≥ 0) para el local.");
      return;
    }
    if (Math.abs(next - current) < 1e-9) {
      setOkMsg("Sin cambios en ese local.");
      return;
    }
    setSavingStoreId(storeId);
    setError("");
    setOkMsg("");
    try {
      await registerMovement({
        productId: Number(product.id),
        type: "ajuste",
        reason: "AJUSTE_INVENTARIO",
        quantity: next,
        storeId,
        description: `Ajuste (${store.name}): ${product?.name || "producto"} ${current} → ${next}`,
        price: null,
        referenceType: null,
        referenceId: null,
      });
      await load();
      await onChanged?.();
      setOkMsg(`Stock en «${store.name}» actualizado a ${next}. Total: suma de todos los locales.`);
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo guardar el stock del local.");
    } finally {
      setSavingStoreId(null);
    }
  };

  const transfer = async () => {
    const from = Number(fromStoreId);
    const to = Number(toStoreId);
    const amount = number(quantity);
    if (!from || !to || from === to) {
      setError("Elegí locales de origen y destino distintos.");
      return;
    }
    if (!(amount > 0)) {
      setError("Ingresá una cantidad mayor a 0 para traspasar.");
      return;
    }
    if (amount > sourceAvailable + 1e-9) {
      setError(`Solo hay ${sourceAvailable} disponible en el origen.`);
      return;
    }
    setLoading(true);
    setError("");
    setOkMsg("");
    try {
      await transferStoreStockRequest({
        fromStoreId: from,
        toStoreId: to,
        productId: Number(product.id),
        quantity: amount,
      });
      await load();
      await onChanged?.();
      setOkMsg("Traspaso listo. El total del producto no cambia: solo se mueve entre locales.");
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo realizar el traspaso.");
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || savingStoreId != null;

  return (
    <Dialog open={open} onClose={() => !busy && onClose?.()} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
        Stock por local · {product?.name || "Producto"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: "action.hover",
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              TOTAL (suma de locales)
            </Typography>
            <Typography variant="h4" fontWeight={800} lineHeight={1.2}>
              {totalSum}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Es la suma de lo que hay en cada local. Si editás un local o traspasás, este total se
              actualiza (el traspaso mueve unidades sin cambiar la suma).
            </Typography>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {okMsg ? <Alert severity="success">{okMsg}</Alert> : null}

          <Box>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
              <WarehouseOutlinedIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" fontWeight={800}>
                Stock en cada local
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Cambiá el número y guardá para fijar el stock de ese local (genera un movimiento de
              ajuste).
            </Typography>
            <Stack spacing={1}>
              {stores.length === 0 && !loading ? (
                <Alert severity="info">No hay locales inventariables activos.</Alert>
              ) : null}
              {stores.map((store) => {
                const sid = String(store.id);
                const current = stockByStore.get(Number(store.id)) || 0;
                const draft = draftByStore[sid] ?? String(current);
                const dirty = Math.abs(number(draft) - current) >= 1e-9;
                const saving = savingStoreId === Number(store.id);
                return (
                  <Stack
                    key={store.id}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="nowrap"
                    sx={{
                      border: 1,
                      borderColor: dirty ? "primary.main" : "divider",
                      borderRadius: 1.5,
                      p: 1.25,
                      bgcolor: "background.paper",
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {store.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {locationKindLabel(store.locationKind)}
                        {!dirty ? ` · actual ${current}` : ` · era ${current}`}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="nowrap">
                      <TextField
                        size="small"
                        label="Stock"
                        type="number"
                        value={draft}
                        onChange={(e) => setDraft(store.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveStoreStock(store);
                          }
                        }}
                        disabled={busy}
                        inputProps={{ min: 0, step: "any" }}
                        sx={{ width: 96, flexShrink: 0 }}
                      />
                      <Tooltip title={dirty ? "Guardar stock de este local" : "Sin cambios"}>
                        <span>
                          <IconButton
                            color="primary"
                            size="small"
                            disabled={busy || !dirty}
                            onClick={() => void saveStoreStock(store)}
                            aria-label={`Guardar stock en ${store.name}`}
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      {saving ? (
                        <Typography variant="caption" color="text.secondary">
                          …
                        </Typography>
                      ) : null}
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
              <SwapHorizIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" fontWeight={800}>
                Traspasar entre locales
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.25 }}>
              Mové unidades de un local a otro. El total del producto se mantiene; solo cambia
              dónde está el stock.
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="flex-start"
              flexWrap="nowrap"
            >
              <TextField
                select
                size="small"
                label="Desde"
                value={fromStoreId}
                onChange={(e) => {
                  setFromStoreId(e.target.value);
                  setError("");
                  setOkMsg("");
                }}
                disabled={busy}
                fullWidth
                helperText={
                  fromStoreId
                    ? `Disponible: ${stockByStore.get(Number(fromStoreId)) || 0}`
                    : " "
                }
              >
                {stores.map((store) => (
                  <MenuItem key={store.id} value={String(store.id)}>
                    {store.name} ({stockByStore.get(Number(store.id)) || 0})
                  </MenuItem>
                ))}
              </TextField>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  pt: 1,
                  color: "text.secondary",
                  flexShrink: 0,
                }}
              >
                <SwapHorizIcon fontSize="small" />
              </Box>
              <TextField
                select
                size="small"
                label="Hacia"
                value={toStoreId}
                onChange={(e) => {
                  setToStoreId(e.target.value);
                  setError("");
                  setOkMsg("");
                }}
                disabled={busy}
                fullWidth
                helperText=" "
              >
                {stores
                  .filter((store) => Number(store.id) !== Number(fromStoreId))
                  .map((store) => (
                    <MenuItem key={store.id} value={String(store.id)}>
                      {store.name} ({locationKindLabel(store.locationKind)})
                    </MenuItem>
                  ))}
              </TextField>
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="nowrap"
              sx={{ mt: 0.5 }}
            >
              <TextField
                size="small"
                label="Cantidad"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputProps={{ min: 0, max: sourceAvailable || undefined, step: "any" }}
                disabled={busy}
                sx={{ width: 140, flexShrink: 0 }}
                helperText={`Máx. ${sourceAvailable}`}
              />
              <Button
                variant="contained"
                startIcon={<SwapHorizIcon />}
                onClick={() => void transfer()}
                disabled={busy || !fromStoreId || !toStoreId}
                sx={{ textTransform: "none", fontWeight: 700, flexShrink: 0, mb: 2.5 }}
              >
                Traspasar
              </Button>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} color="inherit" disabled={busy}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
