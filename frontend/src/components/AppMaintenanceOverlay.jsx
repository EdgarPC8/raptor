import { useEffect } from "react";
import { Box } from "@mui/material";
import { useLocation } from "react-router-dom";
import {
  SUBSCRIPTIONS_ENABLED,
  useSubscriptions,
} from "../hooks/useSubscriptions.js";
import {
  MaintenanceMessage,
  UpdatingMessage,
} from "../pages/MaintenancePage.jsx";
import { APP_ID } from "../config/appInfo.js";

/** Evita bucles de reload al activar/desactivar «actualizando» en el gestor. */
const RELOAD_KEY = `${APP_ID}_updating_reload_armed`;

/**
 * Cubre la app cuando el gestor marca maintenance o updating.
 * Al entrar o salir de «actualizando», fuerza una recarga para tomar el JS/CSS nuevo.
 */
export default function AppMaintenanceOverlay() {
  const location = useLocation();
  const { subscription, isLoading } = useSubscriptions();

  const isUpdating = Boolean(subscription?.updating);
  const isMaintenance = Boolean(subscription?.maintenance);

  useEffect(() => {
    if (!SUBSCRIPTIONS_ENABLED || isLoading) return;

    try {
      if (isUpdating) {
        // Primera vez que vemos updating=true → recarga fuerte una sola vez
        if (sessionStorage.getItem(RELOAD_KEY) !== "1") {
          sessionStorage.setItem(RELOAD_KEY, "1");
          window.location.reload();
        }
        return;
      }

      // Terminó la actualización → otra recarga para cargar el build nuevo
      if (sessionStorage.getItem(RELOAD_KEY) === "1") {
        sessionStorage.removeItem(RELOAD_KEY);
        window.location.reload();
      }
    } catch {
      /* private mode / sessionStorage bloqueado */
    }
  }, [isUpdating, isLoading]);

  if (!SUBSCRIPTIONS_ENABLED || isLoading) return null;
  if (!isUpdating && !isMaintenance) return null;

  const path = String(location.pathname || "");
  if (path.startsWith("/tv/") || path === "/tv") return null;

  return (
    <Box
      role="alertdialog"
      aria-modal="true"
      aria-label={
        isUpdating ? "Sistema actualizándose" : "Sistema en mantenimiento"
      }
      sx={{
        position: "fixed",
        inset: 0,
        // Por encima de snackbars / FABs (p. ej. «Guardar configuración»)
        zIndex: (t) => t.zIndex.tooltip + 100,
      }}
    >
      {isUpdating ? <UpdatingMessage /> : <MaintenanceMessage />}
    </Box>
  );
}
