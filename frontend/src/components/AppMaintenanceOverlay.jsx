import { Box } from "@mui/material";
import { useLocation } from "react-router-dom";
import {
  SUBSCRIPTIONS_ENABLED,
  useSubscriptions,
} from "../hooks/useSubscriptions.js";
import { MaintenanceMessage } from "../pages/MaintenancePage.jsx";

/**
 * Cubre la app cuando el gestor marca maintenance.
 * No cambia la URL: al quitar mantenimiento vuelves a ver la misma pantalla.
 */
export default function AppMaintenanceOverlay() {
  const location = useLocation();
  const { subscription, isLoading } = useSubscriptions();

  if (!SUBSCRIPTIONS_ENABLED || isLoading) return null;
  if (!subscription?.maintenance) return null;

  // Pantallas TV públicas no se tapan con el overlay de la app.
  const path = String(location.pathname || "");
  if (path.startsWith("/tv/") || path === "/tv") return null;

  return (
    <Box
      role="alertdialog"
      aria-modal="true"
      aria-label="Sistema en mantenimiento"
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: (t) => t.zIndex.modal + 20,
      }}
    >
      <MaintenanceMessage />
    </Box>
  );
}
