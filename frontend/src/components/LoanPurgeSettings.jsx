/**
 * Permite al administrador borrar un préstamo que ya tiene cuotas pagadas.
 * Arranca apagado.
 */
import { useState } from "react";
import { FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import { updateAppSettings } from "../api/appSettingsRequest.js";

export default function LoanPurgeSettings() {
  const { settings, setSettings } = useAppSettings();
  const [saving, setSaving] = useState(false);
  const enabled = settings?.allowLoanFinancePurge === true;

  const save = async (checked) => {
    const patch = { allowLoanFinancePurge: checked };
    setSettings({ ...(settings || {}), ...patch });
    setSaving(true);
    try {
      const data = await updateAppSettings(patch);
      if (data?.settings) setSettings(data.settings);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        Apagado, un préstamo sin abonos se borra y se quita de finanzas. Con abonos no se puede borrar. Encendido, al eliminar uno con abonos pregunta si estás seguro: esos montos dejan de sumar, siguen en Movimientos y se crea un movimiento con el detalle de cada abono.
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            disabled={saving}
            onChange={(e) => save(e.target.checked)}
          />
        }
        label="Permitir borrar un préstamo ya cobrado o pagado"
      />
    </Stack>
  );
}
