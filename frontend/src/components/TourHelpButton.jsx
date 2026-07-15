import { IconButton, Tooltip } from "@mui/material";
import TourIcon from "@mui/icons-material/Tour";

/**
 * Icono para reabrir el tutorial de la página actual.
 */
export default function TourHelpButton({ onClick, title = "Ver tutorial", ...props }) {
  return (
    <Tooltip title={title}>
      <IconButton
        size="small"
        color="primary"
        onClick={onClick}
        aria-label={title}
        data-tour="tour-help-btn"
        {...props}
      >
        <TourIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
