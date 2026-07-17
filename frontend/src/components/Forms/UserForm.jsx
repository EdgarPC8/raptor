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
} from "@mui/material";

import { useRoles } from "../../hooks/useRoles";
import { useAuth } from "../../context/AuthContext.jsx";

const INTERNAL_ROLE = "Programador";

const EMPTY_FORM = {
  email: "",
  username: "",
  ci: "",
  firstName: "",
  firstLastName: "",
  password: "",
  roles: [],
};

export default function UsersForm({ onSubmit, initialData }) {
  const { user } = useAuth();
  const { roles, isLoading: isLoadingRoles } = useRoles();
  const [form, setForm] = useState(EMPTY_FORM);

  const canManageProgramador = user?.loginRol === INTERNAL_ROLE;
  const programadorRoleId = useMemo(
    () => roles?.find((r) => r.name === INTERNAL_ROLE)?.id ?? null,
    [roles],
  );
  const lockedProgramador =
    !canManageProgramador &&
    programadorRoleId != null &&
    (initialData?.roles || []).includes(programadorRoleId);

  const visibleRoles = useMemo(() => {
    const list = roles || [];
    if (canManageProgramador) return list;
    return list.filter(
      (r) => r.name !== INTERNAL_ROLE || (lockedProgramador && r.id === programadorRoleId),
    );
  }, [canManageProgramador, roles, lockedProgramador, programadorRoleId]);

  useEffect(() => {
    if (initialData) {
      setForm({
        email: initialData.email || "",
        username: initialData.username || "",
        ci: initialData.ci || "",
        firstName: initialData.firstName || "",
        firstLastName: initialData.firstLastName || "",
        password: initialData.password || "",
        roles: initialData.roles || [],
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRolesChange = (e) => {
    let next = e.target.value;
    if (
      lockedProgramador &&
      programadorRoleId != null &&
      !next.includes(programadorRoleId)
    ) {
      next = [...next, programadorRoleId];
    }
    setForm((prev) => ({ ...prev, roles: next }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let payload = form;
    if (
      lockedProgramador &&
      programadorRoleId != null &&
      !form.roles.includes(programadorRoleId)
    ) {
      payload = { ...form, roles: [...form.roles, programadorRoleId] };
    }
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="Nombre de usuario"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="CI / Cédula de identidad"
            name="ci"
            value={form.ci}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12}>
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
        <Grid item xs={12}>
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
                        color={
                          lockedProgramador && id === programadorRoleId
                            ? "default"
                            : undefined
                        }
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
                  disabled={lockedProgramador && c.id === programadorRoleId}
                >
                  {c.name}
                  {lockedProgramador && c.id === programadorRoleId
                    ? " (solo Programador puede quitarlo)"
                    : ""}
                </MenuItem>
              ))}
            </Select>
            {lockedProgramador ? (
              <FormHelperText>
                Como Administrador no puedes quitar el rol Programador de este usuario.
              </FormHelperText>
            ) : null}
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          {!!initialData ? (
            <TextField
              fullWidth
              size="small"
              label="Nueva Contraseña"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
            />
          ) : (
            <TextField
              fullWidth
              size="small"
              label="Contraseña"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          )}
        </Grid>
        <Grid item xs={12}>
          <Button type="submit" variant="contained" fullWidth>
            {initialData ? "Actualizar" : "Registrar"}
          </Button>
        </Grid>
      </Grid>
    </form>
  );
}
