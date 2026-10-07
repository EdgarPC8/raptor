import {
  Grid,
  TextField,
  Box,
  Button,
  MenuItem,
  Typography,
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
  defaultInputUnit,
  measureKind,
} from "../../../../utils/weightUnits.js";
import { productIsRaw, productIsRecipe, productIsSellable } from "../../../../utils/productRoleFlags.js";

function asProductList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

/** Insumo contado por unidad (ej. huevo), no por g/ml. */
function isUnitIngredient(p) {
  if (!p) return false;
  if (Number(p.unitId) === 1) return true;
  return measureKind(p) === "other";
}

function componentKindOf(p) {
  const t = String(p?.type || "").toLowerCase();
  if (t === "intermediate") return "intermediate";
  if (t === "raw") return "raw";
  if (t === "final") return "final";
  if (productIsRecipe(p) && productIsRaw(p) && !productIsSellable(p)) return "intermediate";
  if (productIsRaw(p)) return "raw";
  return "final";
}

function componentOptionLabel(p, kind) {
  if (kind === "intermediate") return `${p.name} (intermedio)`;
  if (kind === "final") return `${p.name} (final)`;
  return isUnitIngredient(p) ? `${p.name} (insumo · unidad)` : `${p.name} (insumo)`;
}

/** Cualquier producto salvo el dueño de la receta: insumo, intermedio o final. */
function buildComponentOptions(products, productFinalId) {
  const list = Array.isArray(products) ? products : [];
  const order = { raw: 0, intermediate: 1, final: 2 };
  return list
    .filter((p) => String(p.id) !== String(productFinalId))
    .map((p) => {
      const componentKind = componentKindOf(p);
      return {
        ...p,
        componentKind,
        optionLabel: componentOptionLabel(p, componentKind),
      };
    })
    .sort((a, b) => {
      const byKind = (order[a.componentKind] ?? 9) - (order[b.componentKind] ?? 9);
      if (byKind !== 0) return byKind;
      return String(a.name || "").localeCompare(String(b.name || ""), "es");
    });
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
  const isFinal = selectedComponent?.componentKind === "final";
  const isPieceComponent = isIntermediate || isFinal;
  const isGramInsumo = Boolean(selectedComponent) && !isPieceComponent && watch("itemType") !== "material";
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
      itemType: isGramInsumo || isPieceComponent ? "insumo" : formData.itemType,
    };

    const qty = Number(formData.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toastAuth({
        message: isGramInsumo
          ? "Indica los gramos del componente, mayores que 0."
          : "Indica una cantidad mayor que 0.",
        variant: "error",
      });
      return;
    }
    body.quantity = qty;
    body.isQuantityInGrams = isGramInsumo;

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
    try {
      const { data } = await getAllProductsAll();
      const list = asProductList(data);
      setAllProducts(list);

      if (isEditing && datos) {
        setValue("productRawId", datos.productRawId);
        setValue("itemType", datos.itemType || "insumo");
        const prod =
          list.find((p) => Number(p.id) === Number(datos.productRawId)) || null;
        const defUnit = defaultInputUnit(prod);
        setValue("measureUnit", defUnit);
        setValue("quantity", datos.quantity);
        if (datos.isQuantityInGrams && prod && !isUnitIngredient(prod)) {
          setValue("measureUnit", defUnit);
        }
      }
    } catch (e) {
      console.error("RecipeForm loadData:", e);
      setAllProducts([]);
      toastAuth?.({
        message: e?.response?.data?.message || "No se pudieron cargar componentes",
        variant: "error",
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isIntermediate) setValue("itemType", "insumo");
  }, [isIntermediate, setValue]);

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

        <Grid item xs={12}>
          <TextField
            label={isGramInsumo ? "Gramos" : isFinal ? "Unidades del producto final" : "Unidades"}
            type="number"
            fullWidth
            variant="standard"
            inputProps={{ step: "any", min: 0 }}
            value={watch("quantity")}
            {...register("quantity", { required: true, min: 0.0001 })}
            InputLabelProps={idData ? { shrink: true } : {}}
            helperText={
              isGramInsumo
                ? "Gramos que lleva cada unidad producida. Ej. 450 para una funda de harina."
                : ""
            }
          />
        </Grid>

        {!isPieceComponent && (
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
              <MenuItem value="insumo">Insumo (gramos)</MenuItem>
              <MenuItem value="material">Material (costo por unidad de empaque)</MenuItem>
            </TextField>
          </Grid>
        )}

        {(isIntermediate || isFinal) && (
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              {isFinal
                ? "El producto final entra a la receta por unidades."
                : "Los productos intermedios (masas) se registran como insumo en la cadena de costos."}
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
