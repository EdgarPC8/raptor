import {
  Grid,
  TextField,
  Box,
  Button,
  MenuItem,
  Typography,
  Stack,
} from "@mui/material";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../../context/AuthContext";
import {
  getAllProductsAll,
  createRecipeRequest,
  updateRecipeRequest,
} from "../../../../api/inventoryControlRequest";

import { useForm } from "react-hook-form";
import SearchableSelect from "../../../../components/SearchableSelect";
import {
  inputUnitsForProduct,
  defaultInputUnit,
  toStorageAmount,
  fromStorageAmount,
  measureKind,
  storageBaseLabel,
} from "../../../../utils/weightUnits.js";

function buildComponentOptions(products, productFinalId) {
  const others = products.filter((p) => String(p.id) !== String(productFinalId));

  const generics = others.filter(
    (p) => p.type === "raw" && p.isGenericIngredient && !p.genericProductId,
  );
  const genericFallback = others.filter(
    (p) => p.type === "raw" && !p.genericProductId,
  );
  const rawOptions = generics.length > 0 ? generics : genericFallback;

  const intermediates = others.filter((p) => p.type === "intermediate");

  return [
    ...intermediates.map((p) => ({
      ...p,
      optionLabel: `${p.name} (intermedio)`,
      componentKind: "intermediate",
    })),
    ...rawOptions.map((p) => ({
      ...p,
      optionLabel: `${p.name} (insumo genérico)`,
      componentKind: "raw",
    })),
  ];
}

function RecipeForm({ isEditing = false, datos = [], onClose, reload, productFinalId }) {
  const { handleSubmit, register, reset, setValue, watch } = useForm({
    defaultValues: {
      productRawId: "",
      quantity: "",
      measureUnit: "g",
      itemType: "insumo",
    },
  });

  const idData = datos?.id;
  const { toast: toastAuth } = useAuth();
  const [allProducts, setAllProducts] = useState([]);

  const componentOptions = useMemo(
    () => buildComponentOptions(allProducts, productFinalId),
    [allProducts, productFinalId],
  );

  const selectedRawId = watch("productRawId");
  const selectedComponent = componentOptions.find(
    (p) => String(p.id) === String(selectedRawId),
  );
  const isIntermediate = selectedComponent?.componentKind === "intermediate";
  const isMeasureInsumo = !isIntermediate && watch("itemType") !== "material";
  const measureUnit = watch("measureUnit") || defaultInputUnit(selectedComponent);
  const quantity = watch("quantity");
  const inputUnits = inputUnitsForProduct(selectedComponent);

  const storagePreview = useMemo(() => {
    if (!isMeasureInsumo || !selectedComponent) return null;
    const stored = toStorageAmount(quantity, measureUnit, selectedComponent);
    if (!Number.isFinite(stored) || stored <= 0) return null;
    return stored;
  }, [isMeasureInsumo, selectedComponent, quantity, measureUnit]);

  const resetForm = () => {
    reset({
      productRawId: "",
      quantity: "",
      measureUnit: "g",
      itemType: "insumo",
    });
  };

  const submitForm = async (formData) => {
    const body = {
      productFinalId,
      productRawId: formData.productRawId,
      itemType: isIntermediate ? "insumo" : formData.itemType,
    };

    if (isIntermediate || formData.itemType === "material") {
      body.quantity = Number(formData.quantity);
      body.isQuantityInGrams = false;
    } else {
      const stored = toStorageAmount(
        formData.quantity,
        formData.measureUnit || defaultInputUnit(selectedComponent),
        selectedComponent,
      );
      if (!Number.isFinite(stored) || stored <= 0) {
        toastAuth({
          message: "Indica una cantidad válida (g/kg/lb o ml/L según el insumo).",
          variant: "error",
        });
        return;
      }
      body.quantity = stored;
      // true = cantidad en la unidad continua del insumo (g o ml), no en piezas.
      body.isQuantityInGrams = true;
    }

    if (isEditing) {
      toastAuth({
        promise: updateRecipeRequest(datos.id, body),
        onSuccess: () => {
          if (onClose) onClose();
          if (reload) reload();
          resetForm();
          return {
            title: "Receta",
            description: "Componente actualizado correctamente",
          };
        },
      });
      return;
    }

    toastAuth({
      promise: createRecipeRequest([body]),
      successMessage: "Componente agregado a la receta",
      onSuccess: () => {
        if (onClose) onClose();
        if (reload) reload();
        resetForm();
      },
    });
  };

  const loadData = async () => {
    const { data } = await getAllProductsAll();
    setAllProducts(data);

    if (isEditing && datos) {
      setValue("productRawId", datos.productRawId);
      setValue("itemType", datos.itemType || "insumo");
      const prod =
        (Array.isArray(data) ? data : []).find(
          (p) => Number(p.id) === Number(datos.productRawId),
        ) || null;
      const defUnit = defaultInputUnit(prod);
      setValue("measureUnit", defUnit);
      setValue("quantity", datos.quantity);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isIntermediate) setValue("itemType", "insumo");
  }, [isIntermediate, setValue]);

  useEffect(() => {
    if (!selectedComponent || !isMeasureInsumo) return;
    const allowed = inputUnitsForProduct(selectedComponent).map((u) => u.value);
    if (!allowed.includes(measureUnit)) {
      setValue("measureUnit", defaultInputUnit(selectedComponent));
    }
  }, [selectedComponent, isMeasureInsumo, measureUnit, setValue]);

  const onMeasureUnitChange = (nextUnit) => {
    const prev = measureUnit;
    const qty = Number(quantity);
    if (Number.isFinite(qty) && qty > 0 && isMeasureInsumo && selectedComponent) {
      const stored = toStorageAmount(qty, prev, selectedComponent);
      const converted = fromStorageAmount(stored, nextUnit, selectedComponent);
      setValue("quantity", Number(converted.toFixed(6)));
    }
    setValue("measureUnit", nextUnit, { shouldDirty: true });
  };

  const kind = measureKind(selectedComponent);
  const baseLabel = storageBaseLabel(selectedComponent);

  return (
    <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit(submitForm)}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <SearchableSelect
            label="Componente de receta"
            items={componentOptions}
            value={watch("productRawId")}
            productMeta
            getOptionLabel={(item) => item.optionLabel || item.name}
            onChange={(val) => {
              setValue("productRawId", val, { shouldValidate: true, shouldDirty: true });
            }}
          />
        </Grid>

        {isMeasureInsumo ? (
          <>
            <Grid item xs={12} sm={7}>
              <TextField
                label="Cantidad"
                type="number"
                fullWidth
                variant="standard"
                inputProps={{ step: "any", min: 0 }}
                value={watch("quantity")}
                {...register("quantity", { required: true, min: 0.0001 })}
                InputLabelProps={idData ? { shrink: true } : {}}
                helperText={
                  kind === "volume"
                    ? "Ej. 900 ml o 0,9 L — se guarda en la unidad del insumo (ml/L)."
                    : "Ej. 1 lb o 0,5 kg — se guarda en gramos."
                }
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                label="Unidad de entrada"
                select
                fullWidth
                variant="standard"
                value={measureUnit}
                onChange={(e) => onMeasureUnitChange(e.target.value)}
                InputLabelProps={idData ? { shrink: true } : {}}
              >
                {inputUnits.map((u) => (
                  <MenuItem key={u.value} value={u.value}>
                    {u.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {storagePreview != null && (
              <Grid item xs={12}>
                <Stack spacing={0.25}>
                  <Typography variant="caption" color="text.secondary">
                    Se guardará como{" "}
                    <strong>
                      {Number.isInteger(storagePreview)
                        ? storagePreview
                        : Number(storagePreview.toFixed(2))}{" "}
                      {baseLabel}
                    </strong>
                    {measureUnit !== baseLabel.toLowerCase()
                      ? ` (entrada: ${quantity} ${measureUnit})`
                      : ""}
                    .
                  </Typography>
                </Stack>
              </Grid>
            )}
          </>
        ) : (
          <Grid item xs={12}>
            <TextField
              label="Cantidad (unidades)"
              type="number"
              fullWidth
              variant="standard"
              inputProps={{ step: "any", min: 0 }}
              value={watch("quantity")}
              {...register("quantity", { required: true, min: 0.0001 })}
              InputLabelProps={idData ? { shrink: true } : {}}
            />
          </Grid>
        )}

        {!isIntermediate && (
          <Grid item xs={12}>
            <TextField
              label="Tipo de ítem"
              select
              fullWidth
              variant="standard"
              value={watch("itemType")}
              {...register("itemType", { required: true })}
              InputLabelProps={idData ? { shrink: true } : {}}
            >
              <MenuItem value="insumo">Insumo (peso g/kg/lb o volumen ml/L)</MenuItem>
              <MenuItem value="material">Material (costo por unidad de empaque)</MenuItem>
            </TextField>
          </Grid>
        )}

        {isIntermediate && (
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Los productos intermedios (masas) se registran como insumo en la cadena de costos.
            </Typography>
          </Grid>
        )}

        <Grid item xs={4}>
          <Button variant="contained" fullWidth type="submit">
            {!isEditing ? "Guardar" : "Editar"}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

export default RecipeForm;
