import {
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { PRINT_FORMAT_OPTIONS } from "../../utils/receiptFormats.js";

const ICONS = {
  a4: DescriptionIcon,
  ticket80: ReceiptLongIcon,
  ticket55: ReceiptLongIcon,
};

/** Selector A4 / 80 mm / 55 mm (misma UI en configuración, caja y cobros). */
export default function PrintFormatToggle({
  value,
  onChange,
  size = "small",
  disabled = false,
}) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      onChange={(_, v) => v && onChange(v)}
      size={size}
      disabled={disabled}
      sx={{ flexWrap: "wrap", gap: 0.5 }}
    >
      {PRINT_FORMAT_OPTIONS.map((opt) => {
        const Icon = ICONS[opt.value] || ReceiptLongIcon;
        return (
          <ToggleButton
            key={opt.value}
            value={opt.value}
            sx={{ textTransform: "none" }}
          >
            <Icon fontSize="small" sx={{ mr: 0.5 }} />
            {opt.label}
          </ToggleButton>
        );
      })}
    </ToggleButtonGroup>
  );
}
