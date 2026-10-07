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
  Stack,
  Chip,
} from "@mui/material";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../../../context/AuthContext";
import {
  createSupplierRequest,
  updateSupplierRequest,
  linkSupplierAccountRequest,
  unlinkSupplierAccountRequest,
} from "../../../../api/inventoryControlRequest.js";
import { getAccountsRequest, getRolRequest } from "../../../../api/accountRequest.js";
import { addUser } from "../../../../api/userRequest.js";
import SimpleDialog from "../../../../components/Dialogs/SimpleDialog.jsx";
import UsersForm from "../../../../components/Forms/UserForm.jsx";
import {
  BANK_ACCOUNT_TYPE_OPTIONS,
  formToSupplierPayload,
  PAYMENT_METHOD_OPTIONS,
  supplierToForm,
  SUPPLIER_IDENT_TYPE_OPTIONS,
} from "../../../../utils/supplierUtils.js";
import { APP_ID } from "../../../../config/appInfo.js";

const PEER_APP_OPTIONS = [
  { value: "eddeli", label: "EdDeli" },
  { value: "tienda", label: "Tienda" },
  { value: "store", label: "Store" },
].filter((o) => o.value !== APP_ID);

function isProveedorAccount(acc) {
  return (acc?.roles || []).some((r) => {
    const name = String(r?.name || "").trim();
    return name === "Proveedor" || name === "Proovedor";
  });
}

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
  const remoteApp = watch("remoteApp");
  const [accounts, setAccounts] = useState([]);
  const [linkedAccounts, setLinkedAccounts] = useState(
    () => datos?.linkedAccounts || [],
  );
  const accountIdToLink = watch("accountIdToLink");
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [proveedorRoleId, setProveedorRoleId] = useState(null);

  const loadProveedorAccounts = async () => {
    try {
      const res = await getAccountsRequest();
      const rows = res?.data || res || [];
      const filtered = Array.isArray(rows) ? rows.filter(isProveedorAccount) : [];
      setAccounts(filtered);
      return filtered;
    } catch {
      setAccounts([]);
      return [];
    }
  };

  useEffect(() => {
    void loadProveedorAccounts();
  }, []);

  useEffect(() => {
    getRolRequest()
      .then((res) => {
        const roles = res?.data || res || [];
        const role = (Array.isArray(roles) ? roles : []).find((r) => {
          const name = String(r?.name || "").trim();
          return name === "Proveedor" || name === "Proovedor";
        });
        if (role?.id) setProveedorRoleId(Number(role.id));
      })
      .catch(() => setProveedorRoleId(null));
  }, []);

  useEffect(() => {
    setLinkedAccounts(datos?.linkedAccounts || []);
  }, [datos?.id, datos?.linkedAccounts]);

  const linkAccount = (accountId) => {
    if (!datos?.id || !accountId) return;
    toastAuth({
      promise: linkSupplierAccountRequest(datos.id, Number(accountId)),
      onSuccess: (result) => {
        setLinkedAccounts(result?.data?.linkedAccounts || []);
        setValue("accountIdToLink", "");
        reload?.(result?.data);
        return {
          title: "Cuenta",
          description: "Usuario vinculado al proveedor",
        };
      },
    });
  };

  const handleCreateProveedorUser = async (form) => {
    const roleIds = [
      ...new Set(
        [...(form.roles || []), proveedorRoleId]
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];
    if (!roleIds.length) {
      void toastAuth?.({
        message: "No se encontró el rol Proveedor. Crealo en Roles e intentá de nuevo.",
        variant: "warning",
      });
      return;
    }

    toastAuth({
      promise: addUser({ ...form, roles: roleIds }).then(async (result) => {
        const created = result?.data?.user || result?.user || result?.data;
        const accountId =
          Number(created?.account?.id) ||
          Number(created?.Accounts?.[0]?.id) ||
          null;
        setCreateUserOpen(false);
        await loadProveedorAccounts();
        if (accountId && datos?.id) {
          setValue("accountIdToLink", String(accountId));
          const linked = await linkSupplierAccountRequest(datos.id, accountId);
          setLinkedAccounts(linked?.data?.linkedAccounts || []);
          reload?.(linked?.data);
          return { ...result, _linked: true };
        }
        if (accountId) setValue("accountIdToLink", String(accountId));
        return { ...result, _linked: false };
      }),
      successMessage: "Usuario Proveedor creado y listo para usar",
    });
  };
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

        <SectionTitle>Enlace con otra app</SectionTitle>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="Este proveedor es la app…"
            fullWidth
            size="small"
            value={remoteApp || ""}
            onChange={(e) => setValue("remoteApp", e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText="Cuando esa app te envíe un pedido de cliente, caerá aquí como compra a este proveedor"
          >
            <MenuItem value="">Ninguna</MenuItem>
            {PEER_APP_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <SectionTitle>Cuenta con rol Proveedor</SectionTitle>
        {isEditing && datos?.id ? (
          linkedAccounts?.length ? (
            <Grid item xs={12}>
              <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Cuenta enlazada:
                </Typography>
                <Chip
                  label={linkedAccounts[0].username}
                  onDelete={() => {
                    toastAuth({
                      promise: unlinkSupplierAccountRequest(
                        datos.id,
                        linkedAccounts[0].id,
                      ),
                      onSuccess: (result) => {
                        setLinkedAccounts(result?.data?.linkedAccounts || []);
                        return {
                          title: "Cuenta",
                          description: "Usuario desvinculado",
                        };
                      },
                    });
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Solo una cuenta por proveedor. Desvinculá para cambiarla.
                </Typography>
              </Stack>
            </Grid>
          ) : (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Usuario a vincular"
                  fullWidth
                  size="small"
                  value={accountIdToLink || ""}
                  onChange={(e) => setValue("accountIdToLink", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  helperText={
                    accounts.length
                      ? "Solo una cuenta Proveedor por proveedor"
                      : "No hay cuentas Proveedor. Usá Crear cuenta."
                  }
                >
                  <MenuItem value="">—</MenuItem>
                  {accounts.map((acc) => (
                    <MenuItem key={acc.id} value={String(acc.id)}>
                      {acc.username}
                      {acc.user
                        ? ` · ${[acc.user.firstName, acc.user.firstLastName]
                            .filter(Boolean)
                            .join(" ")}`
                        : ""}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  disabled={!accountIdToLink}
                  onClick={() => linkAccount(accountIdToLink)}
                >
                  Vincular
                </Button>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  startIcon={<PersonAddAlt1Icon />}
                  onClick={() => setCreateUserOpen(true)}
                >
                  Crear cuenta
                </Button>
              </Grid>
            </>
          )
        ) : (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Guardá el proveedor y luego editalo para vincular o crear un usuario
              con rol Proveedor.
            </Typography>
          </Grid>
        )}

        <Grid item xs={12}>
          <Button variant="contained" fullWidth type="submit" sx={{ mt: 1 }}>
            {!isEditing ? "Guardar proveedor" : "Actualizar proveedor"}
          </Button>
        </Grid>
      </Grid>

      <SimpleDialog
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        title="Crear usuario y cuenta Proveedor"
        maxWidth="md"
        fullWidth
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Acá creás la persona (datos) y su cuenta de acceso al sistema (usuario y
          contraseña) con rol Proveedor. Al guardar se vincula a este proveedor.
        </Typography>
        <UsersForm
          key={createUserOpen ? `proveedor-${proveedorRoleId || "pending"}` : "closed"}
          onSubmit={handleCreateProveedorUser}
          isEditing={false}
          presetRoles={proveedorRoleId ? [proveedorRoleId] : []}
        />
      </SimpleDialog>
    </Box>
  );
}

export default SupplierForm;
