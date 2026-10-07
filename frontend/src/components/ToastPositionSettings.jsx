/**
 * Posición del toast, en Configuración → Sistema.
 */
import { useState } from "react";
import { Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { updateAppSettings } from "../api/appSettingsRequest.js";
import {
  TOAST_POSITIONS,
  normalizeToastPosition,
  toastAnchorOf,
  writeStoredToastPosition,
} from "../utils/toastPosition.js";

export default function ToastPositionSettings() {
  const { settings, activeApp, setSettings, reload } = useAppSettings();
  const { toast } = useAuth();
  const [saving, setSaving] = useState(false);
  const position = normalizeToastPosition(activeApp?.toastPosition);

  const applyPosition = async (value) => {
    const next = writeStoredToastPosition(value);
    setSettings({ ...(settings || {}), toastPosition: next });
    setSaving(true);
    try {
      const data = await updateAppSettings({ toastPosition: next });
      if (normalizeToastPosition(data?.settings?.toastPosition) === next) {
        setSettings(data.settings);
        await reload?.();
      }
    } catch (err) {
      toast?.({
        message:
          err?.response?.data?.message ||
          "La posición quedó en este navegador. Reiniciá el backend para guardarla en el sistema.",
        variant: "warning",
        anchorOrigin: toastAnchorOf(next),
      });
    } finally {
      setSaving(false);
    }
  };

  const onTest = () => {
    const anchor = toastAnchorOf(position);
    toast?.({
      message: `Prueba: ${TOAST_POSITIONS.find((p) => p.value === position)?.label || "Abajo derecha"}`,
      variant: "success",
      anchorOrigin: anchor,
    });
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Elige en qué esquina o centro aparecen los avisos. Abajo derecha es el valor inicial.
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
        <TextField
          select
          size="small"
          label="Posición"
          value={position}
          disabled={saving}
          onChange={(e) => void applyPosition(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          {TOAST_POSITIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <Button size="small" variant="outlined" disabled={saving} onClick={onTest}>
          Probar toast
        </Button>
      </Box>
    </Box>
  );
}
