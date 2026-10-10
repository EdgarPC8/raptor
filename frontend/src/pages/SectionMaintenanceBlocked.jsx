/**
 * Pantalla cuando se abre una sección en mantenimiento (controlado desde el gestor).
 */
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  Stack,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import MaintenanceHammerAnvilIcon from "../components/MaintenanceHammerAnvilIcon.jsx";

export default function SectionMaintenanceBlocked({ section }) {
  const navigate = useNavigate();
  const title = section?.name || "Esta sección";
  const moduleLabel = section?.moduleLabel;

  const goHome = () => navigate("/", { replace: true });

  return (
    <Box
      sx={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2.5, sm: 4 },
        py: 4,
      }}
    >
      <Stack
        spacing={2.5}
        alignItems="center"
        textAlign="center"
        sx={{ maxWidth: 520, width: "100%", overflow: "visible" }}
      >
        <MaintenanceHammerAnvilIcon size={200} />
        <Typography
          component="h1"
          sx={{
            fontWeight: 900,
            fontSize: { xs: "1.65rem", sm: "2rem" },
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          En mantenimiento
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "text.secondary" }}>
          <strong style={{ color: "inherit" }}>{title}</strong>
          {moduleLabel ? ` · ${moduleLabel}` : ""}
        </Typography>
        {section?.description ? (
          <Typography variant="body2" color="text.secondary">
            {section.description}
          </Typography>
        ) : null}
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          Estamos trabajando en esta sección. Probá de nuevo más tarde. Tu
          suscripción sigue activa; solo esta parte está temporalmente fuera de
          servicio.
        </Typography>
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={goHome}
          sx={{ fontWeight: 700, mt: 1 }}
        >
          Volver al inicio
        </Button>
      </Stack>
    </Box>
  );
}
