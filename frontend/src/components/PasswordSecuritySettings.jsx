/**
 * Contraseña mínima y tope de intentos de login.
 * Arrancan apagados: el reinicio sigue siendo 12345678 hasta que se activen.
 */
import { useState } from "react";
import { FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import { updateAppSettings } from "../api/appSettingsRequest.js";

export default function PasswordSecuritySettings() {
  const { settings, setSettings } = useAppSettings();
  const [saving, setSaving] = useState(false);

  const policy = settings?.passwordPolicyEnabled === true;
  const limit = settings?.loginAttemptLimitEnabled === true;

  const save = async (patch) => {
    const next = { ...(settings || {}), ...patch };
    setSettings(next);
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
        Apagado, el reinicio deja la contraseña 12345678 y se muestra al guardar. Encendido, pide 8 caracteres y genera una contraseña nueva.
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={policy}
            disabled={saving}
            onChange={(e) => save({ passwordPolicyEnabled: e.target.checked })}
          />
        }
        label="Exigir contraseña de al menos 8 caracteres"
      />
      <FormControlLabel
        control={
          <Switch
            checked={limit}
            disabled={saving}
            onChange={(e) => save({ loginAttemptLimitEnabled: e.target.checked })}
          />
        }
        label="Bloquear tras 10 intentos fallidos"
      />
    </Stack>
  );
}
