import { useEffect, useState } from "react";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import { updateAppSettings } from "../api/appSettingsRequest.js";
import { normalizeMaxInstallments } from "../utils/orderPaymentSchedule.js";

export default function InstallmentLimitSettings() {
  const { settings, setSettings } = useAppSettings();
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(() => String(normalizeMaxInstallments(settings?.maxInstallments)));

  useEffect(() => {
    setValue(String(normalizeMaxInstallments(settings?.maxInstallments)));
  }, [settings?.maxInstallments]);

  const save = async () => {
    const next = normalizeMaxInstallments(value);
    setSaving(true);
    try {
      const data = await updateAppSettings({ maxInstallments: next });
      if (data?.settings) setSettings(data.settings);
      setValue(String(normalizeMaxInstallments(data?.settings?.maxInstallments ?? next)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={1} direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }}>
      <TextField
        label="Máximo de cuotas"
        type="number"
        size="small"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputProps={{ min: 1, max: 5000, step: 1 }}
        helperText="Préstamos y crédito a clientes. Por defecto 200."
        sx={{ width: { sm: 280 } }}
      />
      <Button variant="outlined" disabled={saving} onClick={save}>
        Guardar
      </Button>
      <Typography variant="caption" color="text.secondary">
        Hasta 5000.
      </Typography>
    </Stack>
  );
}
