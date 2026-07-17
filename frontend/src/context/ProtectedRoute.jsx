/**
 * Envuelve rutas que requieren sesión, rol opcional y módulos del plan (gestor central).
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "./AuthContext.jsx";
import {
  useSubscriptions,
  SUBSCRIPTIONS_ENABLED,
  hasActiveSubscription,
} from "../hooks/useSubscriptions.js";
import {
  findMaintenanceSectionForPath,
  findPlannedSectionForPath,
  shouldBlockMaintenancePath,
  shouldBlockPlannedPath,
} from "../config/sectionMaintenanceAccess.js";
import SectionMaintenanceBlocked from "../pages/SectionMaintenanceBlocked.jsx";
import SectionPlannedBlocked from "../pages/SectionPlannedBlocked.jsx";
import { APP_ID } from "../config/appInfo.js";

/** Rutas base / sistema: accesibles con sesión aunque no haya plan activo. */
const SUBSCRIPTION_FREE_EXACT = new Set([
  "/inicio",
  "/home",
  "/info",
  "/donaciones",
  "/perfil",
  "/sistema/configuracion",
  "/sistema/modulos",
  "/sistema/planes",
  "/app-settings",
]);

function isSubscriptionFreePath(pathname) {
  const path = String(pathname || "").split("?")[0];
  if (SUBSCRIPTION_FREE_EXACT.has(path)) return true;
  if (path.startsWith("/sistema/configuracion")) return true;
  if (path.startsWith("/sistema/modulos")) return true;
  if (path.startsWith("/sistema/planes")) return true;
  if (path.startsWith("/sistema/facturacion-electronica")) return true;
  return false;
}

export default function ProtectedRoute({ requiredRol }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const { isLoading: isLoadingSub, subscription, expired } = useSubscriptions();

  if (isLoading || isLoadingSub) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress size={64} />
      </Box>
    );
  }

  if (!isAuthenticated) return <Navigate to="/home" replace />;

  if (!user?.loginRol) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress size={64} />
      </Box>
    );
  }

  if (requiredRol?.length && !requiredRol.includes(user.loginRol)) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" gutterBottom>
          Acceso denegado
        </Typography>
        <Typography color="text.secondary">
          Tu rol ({user.loginRol}) no tiene permiso para ver esta sección.
        </Typography>
      </Box>
    );
  }

  const subModules = subscription?.subscription?.modules;
  const path = location.pathname;
  const subscriptionFree = isSubscriptionFreePath(path);

  // Licencias desactivadas (desarrollo): acceso solo por rol.
  if (!SUBSCRIPTIONS_ENABLED) return <Outlet />;

  // Base + Sistema (config/módulos/planes): no exige plan.
  if (subscriptionFree) return <Outlet />;

  // Mantenimiento de la app: solo avisa. No cancela ni “quita” la suscripción.
  if (subscription?.maintenance) {
    return <Navigate to="/mantenimiento" replace />;
  }

  if (
    shouldBlockMaintenancePath(location.pathname, user.loginRol, subModules)
  ) {
    return (
      <SectionMaintenanceBlocked
        section={findMaintenanceSectionForPath(
          location.pathname,
          subModules,
        )}
      />
    );
  }

  if (shouldBlockPlannedPath(location.pathname, user.loginRol, subModules)) {
    return (
      <SectionPlannedBlocked
        section={findPlannedSectionForPath(location.pathname, subModules)}
      />
    );
  }

  if (!hasActiveSubscription(subscription, expired)) {
    // Sin plan: home con menú (para ir a Configuración / Módulos), no bloquear la base.
    if (path === "/" || path === "") {
      return (
        <Navigate to={APP_ID === "store" ? "/home" : "/inicio"} replace />
      );
    }
    return <Navigate to="/subscription-expired" replace />;
  }

  // Exacto o prefijo (rutas anidadas: /editor/123, /publicidad/campanas/:id, ?query).
  const sectionMatches = (sectionKey) => {
    if (!sectionKey) return false;
    const key = String(sectionKey).split("?")[0];
    return path === key || path.startsWith(`${key}/`);
  };
  const hasAccess = subscription.subscription?.modules?.find((m) =>
    m.sections.some((s) => sectionMatches(s.key)),
  );

  if (!hasAccess) {
    return (
      <Navigate
        to="/no-subscription"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
