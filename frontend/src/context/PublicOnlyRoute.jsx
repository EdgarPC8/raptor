/**
 * Rutas públicas (login). Solo redirige al panel si hay sesión Y suscripción activa.
 * Home/login son la base: se ven aunque no haya plan.
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "./AuthContext.jsx";
import {
  useSubscriptions,
  SUBSCRIPTIONS_ENABLED,
  hasActiveSubscription,
} from "../hooks/useSubscriptions.js";
import { getPostLoginPath } from "../utils/postLoginPath.js";

export default function PublicOnlyRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const { isLoading: subLoading, subscription, expired } = useSubscriptions();

  if (isLoading || (SUBSCRIPTIONS_ENABLED && subLoading)) {
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

  if (isAuthenticated && hasActiveSubscription(subscription, expired)) {
    // Evitar bucle si ya estamos en una ruta de app
    const dest = getPostLoginPath(user?.loginRol);
    if (location.pathname === dest) return <Outlet />;
    return <Navigate to={dest} replace />;
  }

  return <Outlet />;
}
