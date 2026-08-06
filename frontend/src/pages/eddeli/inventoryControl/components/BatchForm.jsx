import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useAuth } from "../../../../context/AuthContext";
import {
  createBatchRequest,
  updateBatchRequest,
  getAllProductsAll,
  getStoresRequest,
} from "../../../../api/inventoryControlRequest";
import { storeHoldsInventory } from "../../../../utils/storeLocationKind.js";

const stockFmt = (v) =>
  new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(Number(v || 0));

function productOptionLabel(p) {
  if (!p) return "";
  return `${p.name} · stock ${stockFmt(p.stock)}`;
}

function BatchForm({
  isEditing = false,
  datos = null,
  onClose,
  reload,
  defaultProductId = null,
  multiStockEnabled = false,
}) {
  const { toast: toastAuth } = useAuth();
  const { handleSubmit, register, reset, setValue, control, watch } = useForm({
    defaultValues: {
      productId: null,
      storeId: null,
      quantity: "",
      expiresAt: "",
      manufacturedAt: "",
      code: "",
      notes: "",
      unitCost: "",
      createExpense: false,
    },
  });
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProducts(true);
      try {
        const [{ data }, storesRes] = await Promise.all([
          getAllProductsAll(),
          multiStockEnabled
            ? getStoresRequest({ isActive: true }).catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
        ]);
        const list = Array.isArray(data) ? data : data?.products || [];
        if (!cancelled) {
          setProducts(
            [...list]
              .filter((p) => p?.isActive !== false)
              .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es")),
          );
          const rawStores = Array.isArray(storesRes.data) ? storesRes.data : [];
          setStores(rawStores.filter((s) => storeHoldsInventory(s.locationKind)));
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setStores([]);
        }
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [multiStockEnabled]);

  useEffect(() => {
    if (isEditing && datos) {
      setValue("productId", datos.productId);
      setValue("storeId", datos.storeId ?? null);
      setValue("quantity", datos.quantityRemaining ?? "");
      setValue("expiresAt", String(datos.expiresAt || "").slice(0, 10));
      setValue("manufacturedAt", datos.manufacturedAt ? String(datos.manufacturedAt).slice(0, 10) : "");
      setValue("code", datos.code || "");
      setValue("notes", datos.notes || "");
    } else if (defaultProductId) {
      setValue("productId", defaultProductId);
    }
  }, [isEditing, datos, defaultProductId, setValue]);

  const submitForm = async (formData) => {
    if (isEditing) {
      const quantityRemaining = Number(formData.quantity);
      if (!Number.isFinite(quantityRemaining) || quantityRemaining < 0) {
        return;
      }
      const payload = {
        code: formData.code,
        expiresAt: formData.expiresAt,
        manufacturedAt: formData.manufacturedAt || null,
        notes: formData.notes,
        quantityRemaining,
      };
      if (multiStockEnabled) {
        payload.storeId = formData.storeId || null;
      }
      toastAuth({
        promise: updateBatchRequest(datos.id, payload),
        onSuccess: () => {
          onClose?.();
          reload?.();
          reset();
          return { title: "Lote", description: "Lote actualizado" };
        },
      });
      return;
    }

    const productId = Number(formData.productId);
    const quantity = Number(formData.quantity);
    if (!productId || !(quantity > 0) || !formData.expiresAt) {
      return;
    }
    if (multiStockEnabled && !formData.storeId) {
      void toastAuth?.({
        message: "Con multistock indicá el local del lote.",
        variant: "warning",
      });
      return;
    }

    const payload = {
      productId,
      quantity,
      expiresAt: formData.expiresAt,
      code: formData.code || undefined,
      notes: formData.notes || undefined,
      createExpense: Boolean(formData.createExpense),
    };
    if (multiStockEnabled && formData.storeId) {
      payload.storeId = Number(formData.storeId);
    }
    if (formData.manufacturedAt) {
      payload.manufacturedAt = formData.manufacturedAt;
    }
    if (formData.unitCost !== "" && formData.unitCost != null) {
      payload.unitCost = Number(formData.unitCost);
    }

    toastAuth({
      promise: createBatchRequest(payload),
      successMessage: "Lote registrado e inventario actualizado",
      onSuccess: () => {
        onClose?.();
        reload?.();
        reset();
      },
    });
  };

  const selectedProduct =
    products.find((p) => Number(p.id) === Number(watch("productId"))) || null;

  return (
    <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit(submitForm)}>
      <Grid container spacing={2}>
        {!isEditing && (
          <Grid item xs={12}>
            <Controller
              name="productId"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Autocomplete
                  options={products}
                  loading={loadingProducts}
                  getOptionLabel={productOptionLabel}
                  filterOptions={(opts, state) => {
                    const q = String(state.inputValue || "").trim().toLowerCase();
                    if (!q) return opts;
                    return opts.filter((p) =>
                      String(p.name || "").toLowerCase().includes(q),
                    );
                  }}
                  isOptionEqualToValue={(a, b) => Number(a?.id) === Number(b?.id)}
                  value={selectedProduct}
                  onChange={(_, v) => field.onChange(v?.id ?? null)}
                  renderOption={(props, option) => (
                    <Box
                      component="li"
                      {...props}
                      key={option.id}
                      sx={{
                        display: "flex !important",
                        flexDirection: "column",
                        alignItems: "flex-start !important",
                        gap: 0.25,
                        py: 1,
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Stock: {stockFmt(option.stock)}
                      </Typography>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Producto"
                      required
                      variant="standard"
                      helperText={
                        selectedProduct
                          ? `Stock actual: ${stockFmt(selectedProduct.stock)}`
                          : "Buscá por nombre"
                      }
                    />
                  )}
                />
              )}
            />
          </Grid>
        )}

        {isEditing && (
          <Grid item xs={12}>
            <TextField
              label="Producto"
              fullWidth
              variant="standard"
              value={datos?.productName || ""}
              InputProps={{ readOnly: true }}
            />
          </Grid>
        )}

        {multiStockEnabled && (
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Local del lote"
              fullWidth
              required={!isEditing}
              variant="standard"
              value={watch("storeId") || ""}
              onChange={(e) => setValue("storeId", e.target.value || null)}
              helperText={
                isEditing
                  ? "Asigná local para poder dividir el lote"
                  : "Bodega o sucursal donde queda el stock"
              }
            >
              {stores.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        )}

        {isEditing && (
          <Grid item xs={12} sm={6}>
            <TextField
              label="Cantidad restante"
              type="number"
              fullWidth
              required
              variant="standard"
              inputProps={{ min: 0, step: "any" }}
              helperText="Solo del lote. No cambia el stock del producto ni lo elimina."
              {...register("quantity", { required: true, min: 0 })}
            />
          </Grid>
        )}

        {!isEditing && (
          <Grid item xs={12} sm={6}>
            <TextField
              label="Cantidad"
              type="number"
              fullWidth
              required
              variant="standard"
              inputProps={{ min: 0, step: "any" }}
              {...register("quantity", { required: true, min: 0.0001 })}
            />
          </Grid>
        )}

        <Grid item xs={12} sm={6}>
          <TextField
            label="Fecha de vencimiento"
            type="date"
            fullWidth
            required
            variant="standard"
            InputLabelProps={{ shrink: true }}
            helperText="Obligatoria (caducidad del lote)"
            {...register("expiresAt", { required: true })}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Fecha de elaboración"
            type="date"
            fullWidth
            variant="standard"
            InputLabelProps={{ shrink: true }}
            helperText="Opcional — sirve para calcular cuánto dura el producto"
            {...register("manufacturedAt")}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Código de lote"
            fullWidth
            variant="standard"
            placeholder="Opcional"
            {...register("code")}
          />
        </Grid>

        {!isEditing && (
          <Grid item xs={12} sm={6}>
            <TextField
              label="Costo unitario (opcional)"
              type="number"
              fullWidth
              variant="standard"
              inputProps={{ min: 0, step: "0.01" }}
              helperText="Solo si querés registrar el gasto de esta compra"
              {...register("unitCost")}
            />
          </Grid>
        )}

        <Grid item xs={12}>
          <TextField
            label="Notas"
            fullWidth
            multiline
            minRows={2}
            variant="standard"
            {...register("notes")}
          />
        </Grid>

        {!isEditing && (
          <Grid item xs={12}>
            <Controller
              name="createExpense"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(field.value)}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label="Registrar también gasto de compra (usa el costo unitario)"
                />
              )}
            />
          </Grid>
        )}

        <Grid item xs={12} sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained">
            {isEditing ? "Guardar" : "Registrar lote"}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

export default BatchForm;
