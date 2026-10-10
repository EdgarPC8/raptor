import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Stack } from "@mui/material";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import {
  SUBSCRIPTIONS_ENABLED,
  useSubscriptions,
} from "../hooks/useSubscriptions.js";
import { APP_ROUTES } from "../config/appRoutes.js";
import UpdatingSystemIcon from "../components/UpdatingSystemIcon.jsx";
import MaintenanceHammerAnvilIcon from "../components/MaintenanceHammerAnvilIcon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { canBypassSectionMaintenance } from "../config/sectionMaintenanceAccess.js";

function OverlayShell({ icon, title, lead, foot, glow }) {
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
        // Glow suave solo para «actualizando»; mantenimiento queda limpio (sin halo).
        ...(glow === "info"
          ? {
              backgroundImage: (t) =>
                `radial-gradient(ellipse 70% 50% at 50% 0%, ${t.palette.info.main}18, transparent 55%)`,
            }
          : null),
      }}
    >
      <Stack
        spacing={{ xs: 2, sm: 3 }}
        alignItems="center"
        textAlign="center"
        sx={{ maxWidth: 720, width: "100%", overflow: "visible" }}
      >
        {icon}
        <Typography
          component="h1"
          sx={{
            fontWeight: 900,
            fontSize: { xs: "2rem", sm: "3rem", md: "3.5rem" },
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: { xs: "1.15rem", sm: "1.4rem" },
            color: "text.secondary",
            maxWidth: 560,
          }}
        >
          {lead}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "1rem", sm: "1.15rem" },
            color: "text.secondary",
            maxWidth: 520,
          }}
        >
          {foot}
        </Typography>
      </Stack>
    </Box>
  );
}

/** Contenido visual de mantenimiento (overlay app completa). */
export function MaintenanceMessage() {
  const { activeApp } = useAppSettings();
  const brand = activeApp?.alias || activeApp?.name || "la aplicación";

  return (
    <OverlayShell
      glow="warning"
      icon={<MaintenanceHammerAnvilIcon size={220} />}
      title="Sistema en mantenimiento"
      lead={`${brand} no está disponible por ahora. Estamos trabajando para mejorar el sistema.`}
      foot="Volvé a intentarlo más tarde. Tu suscripción sigue activa; solo el acceso está pausado hasta que se reactive."
    />
  );
}

/** Contenido cuando el gestor marca la app como «actualizando». */
export function UpdatingMessage() {
  const { activeApp } = useAppSettings();
  const brand = activeApp?.alias || activeApp?.name || "la aplicación";

  return (
    <OverlayShell
      glow="info"
      icon={<UpdatingSystemIcon size={220} />}
      title="Sistema actualizándose"
      lead={`${brand} no está disponible por ahora. Se está aplicando una actualización.`}
      foot="Volvé a intentarlo en unos minutos. Tu suscripción sigue activa; solo el acceso está pausado hasta que termine la actualización."
    />
  );
}

/**
 * Ruta legacy /mantenimiento: si ya no hay bloqueo, vuelve al inicio.
 */
export default function MaintenancePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, isLoading } = useSubscriptions();
  const bypass = canBypassSectionMaintenance(user?.loginRol);
  const blocked =
    !bypass && Boolean(subscription?.maintenance || subscription?.updating);

  useEffect(() => {
    if (!SUBSCRIPTIONS_ENABLED) {
      navigate(APP_ROUTES.dashboard, { replace: true });
      return;
    }
    if (isLoading) return;
    if (!blocked) {
      navigate(APP_ROUTES.dashboard, { replace: true });
    }
  }, [isLoading, navigate, blocked]);

  if (!SUBSCRIPTIONS_ENABLED || isLoading || !blocked) {
    return null;
  }

  if (subscription?.updating) return <UpdatingMessage />;
  return <MaintenanceMessage />;
}
