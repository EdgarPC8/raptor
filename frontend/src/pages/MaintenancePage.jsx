import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Stack } from "@mui/material";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import {
  SUBSCRIPTIONS_ENABLED,
  useSubscriptions,
} from "../hooks/useSubscriptions.js";
import { APP_ROUTES } from "../config/appRoutes.js";

/** Contenido visual de mantenimiento (también usado como overlay). */
export function MaintenanceMessage() {
  const { activeApp } = useAppSettings();
  const brand = activeApp?.alias || activeApp?.name || "EdDeli";

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2.5, sm: 4 },
        py: 4,
        bgcolor: "background.default",
        backgroundImage: (t) =>
          `radial-gradient(ellipse 80% 60% at 50% 0%, ${t.palette.warning.main}22, transparent 60%)`,
      }}
    >
      <Stack
        spacing={{ xs: 2, sm: 3 }}
        alignItems="center"
        textAlign="center"
        sx={{ maxWidth: 720, width: "100%" }}
      >
        <BuildCircleIcon
          sx={{
            fontSize: { xs: 96, sm: 128 },
            color: "warning.main",
          }}
        />
        <Typography
          component="h1"
          sx={{
            fontWeight: 900,
            fontSize: { xs: "2rem", sm: "3rem", md: "3.5rem" },
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          Sistema en mantenimiento
        </Typography>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: { xs: "1.15rem", sm: "1.4rem" },
            color: "text.secondary",
            maxWidth: 560,
          }}
        >
          {brand} no está disponible por ahora. Estamos trabajando para mejorar
          el sistema.
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "1rem", sm: "1.15rem" },
            color: "text.secondary",
            maxWidth: 520,
          }}
        >
          Vuelve a intentarlo más tarde. Tu suscripción sigue activa; solo el
          acceso está pausado hasta que se reactive.
        </Typography>
      </Stack>
    </Box>
  );
}

/**
 * Ruta legacy /mantenimiento: si ya no hay mantenimiento, vuelve al inicio.
 * El modo normal es el overlay (AppMaintenanceOverlay), sin cambiar de URL.
 */
export default function MaintenancePage() {
  const navigate = useNavigate();
  const { subscription, isLoading } = useSubscriptions();

  useEffect(() => {
    if (!SUBSCRIPTIONS_ENABLED) {
      navigate(APP_ROUTES.dashboard, { replace: true });
      return;
    }
    if (isLoading) return;
    if (!subscription?.maintenance) {
      navigate(APP_ROUTES.dashboard, { replace: true });
    }
  }, [isLoading, navigate, subscription?.maintenance]);

  if (!SUBSCRIPTIONS_ENABLED || isLoading || !subscription?.maintenance) {
    return null;
  }

  return <MaintenanceMessage />;
}
