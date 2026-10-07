import { useState, useEffect, useMemo } from "react";
import {
  Grid,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Box,
  FormHelperText,
  FormControlLabel,
  Switch,
  IconButton,
  InputAdornment,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import { useRoles } from "../../hooks/useRoles";
import { useAuth } from "../../context/AuthContext.jsx";

const INTERNAL_ROLES = new Set(["Propietario", "Programador"]);
const PASSWORD_MIN = 8;
const PASSWORD_HINT = `Mínimo ${PASSWORD_MIN} caracteres`;

const EMPTY_FORM = {
  email: "",
  username: "",
  ci: "",
  firstName: "",
  secondName: "",
  firstLastName: "",
  secondLastName: "",
  password: "",
  roles: [],
  isActive: true,
};

export default function UsersForm({
  onSubmit,
  initialData,
  presetRoles = null,
  isEditing = null,
}) {
  const { user, toast } = useAuth();
  const { roles } = useRoles();
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPass, setShowPass] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const editing = isEditing == null ? Boolean(initialData?.id) : Boolean(isEditing);

  const canManageInternal =
    user?.loginRol === "Propietario" || user?.loginRol === "Programador";
  const lockedRoleIds = useMemo(() => {
    if (canManageInternal) return new Set();
    const assigned = new Set(initialData?.roles || []);
    return new Set(
      (roles || [])
        .filter((role) => INTERNAL_ROLES.has(role.name) && assigned.has(role.id))
        .map((role) => role.id),
    );
  }, [canManageInternal, roles, initialData]);

  const visibleRoles = useMemo(() => {
    const list = roles || [];
    if (canManageInternal) return list;
    return list.filter((role) => !INTERNAL_ROLES.has(role.name) || lockedRoleIds.has(role.id));
  }, [canManageInternal, roles, lockedRoleIds]);

  useEffect(() => {
    if (initialData) {
      setForm({
        email: initialData.email || "",
        username: initialData.username || "",
        ci: initialData.ci || "",
        firstName: initialData.firstName || "",
        secondName: initialData.secondName || "",
        firstLastName: initialData.firstLastName || "",
        secondLastName: initialData.secondLastName || "",
        password: initialData.password || "",
        roles: initialData.roles || presetRoles || [],
        isActive: initialData.isActive !== false,
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        roles: Array.isArray(presetRoles) ? presetRoles : [],
      });
    }
  }, [initialData, presetRoles]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "password") {
      const len = String(value || "").length;
      if (!editing && len > 0 && len < PASSWORD_MIN) {
        setPasswordError(`Faltan ${PASSWORD_MIN - len} caracteres (mínimo ${PASSWORD_MIN})`);
      } else {
        setPasswordError("");
      }
    }
  };

  const handleRolesChange = (e) => {
    let next = e.target.value;
    if (lockedRoleIds.size && [...lockedRoleIds].some((id) => !next.includes(id))) {
      next = [...new Set([...next, ...lockedRoleIds])];
    }
    setForm((prev) => ({ ...prev, roles: next }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let payload = form;
    if (lockedRoleIds.size) {
      payload = { ...form, roles: [...new Set([...form.roles, ...lockedRoleIds])] };
    }
    const pwd = String(payload.password || "");
    if (!editing || pwd) {
      if (pwd.length < PASSWORD_MIN) {
        const msg = `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`;
        setPasswordError(msg);
        void toast?.({ message: msg, variant: "warning" });
        return;
      }
    }
    setPasswordError("");
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="Email (opcional)"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="Usuario de acceso (login)"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            helperText="Con este usuario entra al sistema"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="CI / Cédula (opcional)"
            name="ci"
            value={form.ci}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Primer nombre"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Segundo nombre"
            name="secondName"
            value={form.secondName}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Primer apellido"
            name="firstLastName"
            value={form.firstLastName}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Segundo apellido"
            name="secondLastName"
            value={form.secondLastName}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth size="small">
            <InputLabel>Roles</InputLabel>
            <Select
              multiple
              name="roles"
              required
              value={form.roles}
              onChange={handleRolesChange}
              label="Roles"
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((id) => {
                    const role = roles?.find((r) => r.id === id);
                    return (
                      <Chip
                        key={id}
                        label={role?.name || id}
                        size="small"
                        color={lockedRoleIds.has(id) ? "default" : undefined}
                      />
                    );
                  })}
                </Box>
              )}
            >
              {visibleRoles?.map((c) => (
                <MenuItem
                  key={c.id}
                  value={c.id}
                  disabled={lockedRoleIds.has(c.id)}
                >
                  {c.name}
                  {lockedRoleIds.has(c.id)
                    ? " (solo Propietario/Programador puede quitarlo)"
                    : ""}
                </MenuItem>
              ))}
            </Select>
            {lockedRoleIds.size ? (
              <FormHelperText>
                Como Administrador no puedes quitar los roles Propietario ni Programador.
              </FormHelperText>
            ) : null}
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={form.isActive !== false}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
              />
            }
            label={
              form.isActive !== false
                ? "Cuenta activa (puede iniciar sesión)"
                : "Cuenta inactiva (no puede iniciar sesión)"
            }
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label={editing ? "Nueva contraseña" : "Contraseña de acceso"}
            name="password"
            type={showPass ? "text" : "password"}
            value={form.password}
            onChange={handleChange}
            required={!editing}
            error={Boolean(passwordError)}
            helperText={
              passwordError ||
              (editing
                ? `Dejá vacío para no cambiarla. Si la cambiás: ${PASSWORD_HINT.toLowerCase()}.`
                : PASSWORD_HINT)
            }
            inputProps={{ minLength: editing ? undefined : PASSWORD_MIN }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPass ? "Ocultar contraseña" : "Ver contraseña"}
                    onClick={() => setShowPass((v) => !v)}
                    edge="end"
                    size="small"
                  >
                    {showPass ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <Button type="submit" variant="contained" fullWidth>
            {editing ? "Actualizar" : "Crear usuario y cuenta"}
          </Button>
        </Grid>
      </Grid>
    </form>
  );
}
