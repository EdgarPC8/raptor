/**
 * Menú para mostrar/ocultar columnas de una TablePro.
 * Persistencia: BD (5 tablas) o localStorage (resto) — ver tableColumnVisibility.js.
 */
import React, { useState } from "react";
import {
  Checkbox,
  FormControlLabel,
  IconButton,
  Menu,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { DB_TABLE_COLUMN_CATALOG } from "../../utils/tableColumnVisibility.js";

export default function TableColumnVisibilityControl({
  tableKey,
  hiddenIds = [],
  requiredIds,
  onToggle,
  catalogColumns,
  size = "small",
}) {
  const [anchor, setAnchor] = useState(null);
  const catalog =
    catalogColumns ||
    DB_TABLE_COLUMN_CATALOG.find((t) => t.key === tableKey)?.columns ||
    [];
  const required = requiredIds || new Set(catalog.filter((c) => c.required).map((c) => c.id));
  const hidden = new Set((hiddenIds || []).map(String));

  if (!catalog.length) return null;

  return (
    <>
      <Tooltip title="Mostrar u ocultar columnas">
        <IconButton
          size={size}
          color="inherit"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label="Columnas de la tabla"
        >
          <ViewColumnIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Stack sx={{ px: 1.5, py: 0.5, minWidth: 220 }} spacing={0.25}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
            Columnas visibles
          </Typography>
          {catalog.map((col) => {
            const locked = required.has(col.id) || col.required;
            const checked = locked || !hidden.has(col.id);
            return (
              <FormControlLabel
                key={col.id}
                control={
                  <Checkbox
                    size="small"
                    checked={checked}
                    disabled={locked}
                    onChange={(_, v) => onToggle?.(col.id, v)}
                  />
                }
                label={
                  <Typography variant="body2">
                    {col.label || col.id}
                    {locked ? " *" : ""}
                  </Typography>
                }
              />
            );
          })}
          <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
            * obligatorias
          </Typography>
        </Stack>
      </Menu>
    </>
  );
}
