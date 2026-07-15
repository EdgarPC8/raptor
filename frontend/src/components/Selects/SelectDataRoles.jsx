/**
 * Selector múltiple de roles (desde GET /rol).
 * El rol de mantenimiento interno no se ofrece al administrador.
 */
import { useEffect, useMemo, useState } from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { getRolRequest } from "../../api/accountRequest.js";
import { useAuth } from "../../context/AuthContext.jsx";

const INTERNAL_ROLE = "Programador";

export default function SelectDataRoles({ value = [], onChange }) {
  const { user } = useAuth();
  const canSeeInternalRole = user?.loginRol === INTERNAL_ROLE;
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    getRolRequest()
      .then((res) => setRoles(res.data || []))
      .catch(() => setRoles([]));
  }, []);

  const visibleRoles = useMemo(
    () =>
      canSeeInternalRole
        ? roles
        : roles.filter((r) => r.name !== INTERNAL_ROLE),
    [canSeeInternalRole, roles],
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
            .filter((name) => canSeeInternalRole || name !== INTERNAL_ROLE)
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
