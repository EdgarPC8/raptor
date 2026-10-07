/**
 * Selector múltiple de roles (desde GET /rol).
 * Roles internos (Propietario/Programador) solo para Propietario y Programador.
 */
import { useEffect, useMemo, useState } from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { getRolRequest } from "../../api/accountRequest.js";
import { useAuth } from "../../context/AuthContext.jsx";

const INTERNAL_ROLES = new Set(["Propietario", "Programador"]);

export default function SelectDataRoles({ value = [], onChange }) {
  const { user } = useAuth();
  const canSeeInternalRoles =
    user?.loginRol === "Propietario" || user?.loginRol === "Programador";
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    getRolRequest()
      .then((res) => setRoles(res.data || []))
      .catch(() => setRoles([]));
  }, []);

  const visibleRoles = useMemo(
    () =>
      canSeeInternalRoles
        ? roles
        : roles.filter((r) => !INTERNAL_ROLES.has(r.name)),
    [canSeeInternalRoles, roles],
  );

  return (
    <FormControl fullWidth variant="standard" sx={{ mt: 1 }}>
      <InputLabel id="roles-select-label">Roles</InputLabel>
      <Select
        labelId="roles-select-label"
        multiple
        value={value}
        onChange={(e) => onChange(e.target.value)}
        label="Roles"
        renderValue={(selected) =>
          selected
            .map((id) => roles.find((r) => r.id === id)?.name || id)
            .filter((name) => canSeeInternalRoles || !INTERNAL_ROLES.has(name))
            .join(", ")
        }
      >
        {visibleRoles.map((item) => (
          <MenuItem key={item.id} value={item.id}>
            {item.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
