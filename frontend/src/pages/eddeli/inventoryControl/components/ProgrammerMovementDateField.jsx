import { Box, IconButton, TextField, Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { nowLocalDateTime, toLocalDateTimeInput } from "../../../../utils/appDateTime.js";

const PROGRAMMER_HINT =
  "Puedes registrar con fecha y hora pasadas o corregir el historial.";

/** Campo de fecha/hora personalizada — visible solo en mantenimiento interno. */
export default function ProgrammerMovementDateField({
  isProgrammer,
  value,
  onChange,
  label = "Fecha del movimiento",
}) {
  if (!isProgrammer) return null;

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
      <TextField
        label={label}
        type="datetime-local"
        fullWidth
        size="small"
        variant="outlined"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        InputLabelProps={{ shrink: true }}
        helperText="Vacío = fecha y hora actuales"
      />
      <Tooltip title={PROGRAMMER_HINT} arrow placement="top">
        <IconButton size="small" color="info" sx={{ mt: 0.5 }} aria-label={PROGRAMMER_HINT}>
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

/** Envía datetime completo al API (conserva hora). */
export const movementDateForApi = (dateStr) => {
  if (!dateStr) return undefined;
  const s = String(dateStr).trim();
  if (!s) return undefined;
  // Solo día → mediodía local vía datetime-local no debería llegar; si llega, añade hora actual
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const now = nowLocalDateTime(); // YYYY-MM-DDTHH:mm
    return `${s}T${now.slice(11)}`;
  }
  return s.length >= 16 ? s.slice(0, 16) : s;
};

export const todayDateInput = () => nowLocalDateTime();

export const isoToDateInput = (iso) => {
  if (!iso) return "";
  try {
    return toLocalDateTimeInput(iso);
  } catch {
    return "";
  }
};
