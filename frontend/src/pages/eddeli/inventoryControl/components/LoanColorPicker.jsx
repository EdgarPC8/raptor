import { Box, Stack, Typography } from "@mui/material";

export const DEFAULT_LOAN_COLOR = "#1565C0";

export default function LoanColorPicker({ value, onChange, disabled = false }) {
  const raw = String(value || "");
  const selected = /^#[0-9A-Fa-f]{6}$/.test(raw) ? raw.toUpperCase() : DEFAULT_LOAN_COLOR;
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Typography variant="body2" color="text.secondary">
        Color en el calendario
      </Typography>
      <Box
        component="input"
        type="color"
        disabled={disabled}
        value={selected}
        onChange={(e) => onChange?.(String(e.target.value || "").toUpperCase())}
        aria-label="Elegir cualquier color"
        sx={{
          width: 52,
          height: 36,
          p: 0.25,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          bgcolor: "background.paper",
          cursor: disabled ? "default" : "pointer",
        }}
      />
      <Typography variant="caption" color="text.secondary">
        {selected}
      </Typography>
    </Stack>
  );
}
