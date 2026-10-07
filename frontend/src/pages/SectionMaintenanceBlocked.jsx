/**
 * Modal cuando se abre una sección en mantenimiento (controlado desde el gestor).
 */
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Stack,
  Alert,
} from "@mui/material";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import HomeIcon from "@mui/icons-material/Home";

export default function SectionMaintenanceBlocked({ section }) {
  const navigate = useNavigate();
  const title = section?.name || "Esta sección";
  const moduleLabel = section?.moduleLabel;

  const goHome = () => navigate("/", { replace: true });

  return (
    <Box
      sx={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        px: 2,
      }}
    >
      <Dialog open onClose={goHome} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            fontWeight: 800,
          }}
        >
          <BuildCircleIcon color="error" sx={{ fontSize: 32 }} />
          Sección en mantenimiento
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Alert severity="warning" icon={<BuildCircleIcon />}>
              Esta sección está en mantenimiento. Probá de nuevo más tarde.
            </Alert>
            <Typography variant="body1">
              <strong>{title}</strong>
              {moduleLabel ? ` (${moduleLabel})` : ""} no está disponible por
              ahora.
            </Typography>
            {section?.description ? (
              <Typography variant="body2" color="text.secondary">
                {section.description}
              </Typography>
            ) : null}
            <Typography variant="body2" color="text.secondary">
              Tu suscripción sigue activa; solo esta sección está temporalmente
              fuera de servicio.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={goHome}
            sx={{ fontWeight: 700 }}
          >
            Volver al inicio
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
