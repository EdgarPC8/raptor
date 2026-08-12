import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../../../context/AuthContext";
import {
  createSupplierRequest,
  updateSupplierRequest,
} from "../../../../api/inventoryControlRequest.js";
import {
  BANK_ACCOUNT_TYPE_OPTIONS,
  formToSupplierPayload,
  PAYMENT_METHOD_OPTIONS,
  supplierToForm,
  SUPPLIER_IDENT_TYPE_OPTIONS,
} from "../../../../utils/supplierUtils.js";

function SectionTitle({ children }) {
  return (
    <Grid item xs={12}>
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mt: 0.5 }}>
        {children}
      </Typography>
      <Divider sx={{ mt: 0.5, mb: 0.5 }} />
    </Grid>
  );
}

function SupplierForm({ isEditing = false, datos = {}, onClose, reload }) {
  const { handleSubmit, register, reset, setValue, watch } = useForm({
    defaultValues: supplierToForm(null),
  });
  const idData = datos?.id;
  const { toast: toastAuth } = useAuth();
  const identType = watch("identType");
  const isActive = watch("isActive");

  const submitForm = async (formData) => {
    const payload = formToSupplierPayload(formData);
    if (!payload.name) {
      void toastAuth?.({ message: "El nombre es obligatorio", variant: "warning" });
      return;
    }

    if (isEditing) {
      toastAuth({
        promise: updateSupplierRequest(datos.id, payload),
        onSuccess: (result) => {
          const saved = result?.data || { ...datos, ...payload, id: datos.id };
          onClose?.();
          reload?.(saved);
          reset(supplierToForm(null));
          return {
            title: "Proveedor",
            description: "Proveedor actualizado correctamente",
          };
        },
      });
      return;
    }

    toastAuth({
      promise: createSupplierRequest(payload),
      successMessage: "Proveedor guardado con éxito",
      onSuccess: (result) => {
        onClose?.();
        reload?.(result?.data);
        reset(supplierToForm(null));
      },
    });
  };

  useEffect(() => {
    if (datos && (isEditing || datos.name || datos.identNumber || datos.tradeName)) {
      reset(supplierToForm(datos));
    } else if (!isEditing) {
      reset(supplierToForm(null));
    }
  }, [isEditing, datos, reset]);

  return (
    <Box
      component="form"
      id="eddeli-supplier-form"
      sx={{ mt: 1, maxHeight: "70vh", overflowY: "auto", pr: 0.5 }}
      onSubmit={(e) => {
        e.stopPropagation();
        handleSubmit(submitForm)(e);
      }}
    >
      <Grid container spacing={2}>
        <SectionTitle>Identificación</SectionTitle>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Razón social / nombre"
            fullWidth
            required
            size="small"
            {...register("name", { required: true })}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Nombre comercial"
            fullWidth
            size="small"
            {...register("tradeName")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            label="Tipo de documento"
            fullWidth
            size="small"
            {...register("identType")}
            value={identType || "04"}
            onChange={(e) => setValue("identType", e.target.value)}
            InputLabelProps={{ shrink: true }}
          >
            {SUPPLIER_IDENT_TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Número de documento"
            fullWidth
            size="small"
            {...register("identNumber")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Categoría"
            fullWidth
            size="small"
            placeholder="Materia prima, empaque…"
            {...register("category")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={isActive !== false}
                onChange={(e) => setValue("isActive", e.target.checked)}
              />
            }
            label={isActive !== false ? "Proveedor activo" : "Proveedor inactivo"}
          />
        </Grid>

        <SectionTitle>Contacto</SectionTitle>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Persona de contacto"
            fullWidth
            size="small"
            {...register("contactName")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Cargo"
            fullWidth
            size="small"
            {...register("contactRole")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Teléfono"
            fullWidth
            size="small"
            {...register("phone")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="WhatsApp"
            fullWidth
            size="small"
            {...register("whatsapp")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Sitio web"
            fullWidth
            size="small"
            {...register("website")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Correo"
            fullWidth
            size="small"
            type="email"
            {...register("email")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Correo de facturas"
            fullWidth
            size="small"
            type="email"
            {...register("invoiceEmail")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>

        <SectionTitle>Ubicación</SectionTitle>
        <Grid item xs={12}>
          <TextField
            label="Dirección"
            fullWidth
            size="small"
            {...register("address")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Ciudad"
            fullWidth
            size="small"
            {...register("city")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Provincia"
            fullWidth
            size="small"
            {...register("province")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>

        <SectionTitle>Pagos</SectionTitle>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Banco"
            fullWidth
            size="small"
            {...register("bankName")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            label="Tipo de cuenta"
            fullWidth
            size="small"
            defaultValue=""
            {...register("bankAccountType")}
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="">—</MenuItem>
            {BANK_ACCOUNT_TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Número de cuenta"
            fullWidth
            size="small"
            {...register("bankAccountNumber")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Plazo de pago (días)"
            fullWidth
            size="small"
            type="number"
            inputProps={{ min: 0 }}
            {...register("paymentTermDays")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={8}>
          <TextField
            select
            label="Forma de pago preferida"
            fullWidth
            size="small"
            defaultValue=""
            {...register("preferredPaymentMethod")}
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="">—</MenuItem>
            {PAYMENT_METHOD_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <SectionTitle>Notas</SectionTitle>
        <Grid item xs={12}>
          <TextField
            label="Condiciones / observaciones"
            fullWidth
            size="small"
            multiline
            minRows={2}
            {...register("notes")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>

        <Grid item xs={12}>
          <Button variant="contained" fullWidth type="submit" sx={{ mt: 1 }}>
            {!isEditing ? "Guardar proveedor" : "Actualizar proveedor"}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SupplierForm;
