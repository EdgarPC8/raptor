import React from "react";
import { Stack, TextField, MenuItem, Typography } from "@mui/material";
import {
  TEMPLATE_KINDS,
  BACKGROUND_MODES,
  TEMPLATE_KIND_LABELS,
  BACKGROUND_MODE_LABELS,
  DEFAULT_TEMPLATE_SETTINGS,
  normalizeTemplateSettings,
} from "../templateSettings";

export default function TemplateSettingsFields({ value = {}, onChange, disabled = false }) {
  const settings = normalizeTemplateSettings(value);

  const setField = (field, nextValue) => {
    const merged = { ...settings, [field]: nextValue };
    if (field === "templateKind") {
      if (nextValue === "manual") merged.requiresProduct = false;
      else if (nextValue === "producto") merged.requiresProduct = true;
    }
    onChange?.(normalizeTemplateSettings(merged));
  };

  return (
    <Stack spacing={1.5}>
      <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700 }}>
        Tipo de plantilla
      </Typography>

      <TextField
        select
        size="small"
        label="Modo"
        value={settings.templateKind || DEFAULT_TEMPLATE_SETTINGS.templateKind}
        onChange={(e) => setField("templateKind", e.target.value)}
        disabled={disabled}
        fullWidth
      >
        {TEMPLATE_KINDS.map((kind) => (
          <MenuItem key={kind} value={kind}>
            {TEMPLATE_KIND_LABELS[kind] || kind}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Fondo"
        value={settings.backgroundMode || DEFAULT_TEMPLATE_SETTINGS.backgroundMode}
        onChange={(e) => setField("backgroundMode", e.target.value)}
        disabled={disabled}
        fullWidth
      >
        {BACKGROUND_MODES.map((mode) => (
          <MenuItem key={mode} value={mode}>
            {BACKGROUND_MODE_LABELS[mode] || mode}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="¿Requiere producto del catálogo?"
        value={settings.requiresProduct ? "yes" : "no"}
        onChange={(e) => setField("requiresProduct", e.target.value === "yes")}
        disabled={disabled || settings.templateKind === "manual"}
        fullWidth
        helperText={
          settings.templateKind === "manual"
            ? "Las plantillas manuales no usan catálogo."
            : settings.templateKind === "producto"
            ? "Siempre muestra selector de productos."
            : "Opcional: algunas capas usan datos del catálogo."
        }
      >
        <MenuItem value="no">No</MenuItem>
        <MenuItem value="yes">Sí</MenuItem>
      </TextField>
    </Stack>
  );
}
