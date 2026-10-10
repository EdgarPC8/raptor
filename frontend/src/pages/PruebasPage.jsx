/**
 * Desarrollador → Pruebas: laboratorio de UI (solo Programador).
 * Simulación: calabaza Halloween que revienta al click.
 */
import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ScienceIcon from "@mui/icons-material/Science";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useAuth } from "../context/AuthContext.jsx";
import BurstBubble from "../components/BurstBubble.jsx";
import PumpkinIcon from "../components/icons/PumpkinIcon.jsx";
import { forceShowNavbarPumpkin } from "../components/NavbarEdgeDecor.jsx";

export default function PruebasPage() {
  const { user } = useAuth();
  const [burstCount, setBurstCount] = useState(0);
  const [labKey, setLabKey] = useState(0);

  if (user?.loginRol !== "Programador") {
    return <Navigate to="/" replace />;
  }

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", py: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <ScienceIcon color="primary" />
        <Typography variant="h5" fontWeight={800}>
          Pruebas
        </Typography>
        <Chip size="small" label="Solo Programador" color="secondary" variant="outlined" />
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Laboratorio de efectos de UI. Acá probamos cosas antes de soltarlas en el sistema
        (por ejemplo un icono flotante en el filo del navbar).
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Tocá la calabaza de lab o forzá la del filo del navbar con el botón de abajo.
      </Alert>

      <Paper
        variant="outlined"
        sx={{
          p: 3,
          borderRadius: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.5,
          mb: 2,
          background:
            "linear-gradient(160deg, rgba(17,24,39,0.08) 0%, rgba(249,115,22,0.08) 55%, transparent 100%)",
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Calabaza Halloween
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Click para reventar. Sin fondo: solo el icono.
        </Typography>
        <BurstBubble
          key={labKey}
          variant="icon"
          color="#F97316"
          icon={<PumpkinIcon />}
          size={88}
          particleCount={14}
          resetLabel="Otra calabaza"
          onBurst={() => setBurstCount((n) => n + 1)}
        />
      </Paper>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip size="small" label={`Reventadas: ${burstCount}`} />
        <Button
          size="small"
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={() => setLabKey((k) => k + 1)}
        >
          Regenerar
        </Button>
        <Button
          size="small"
          variant="contained"
          color="warning"
          startIcon={<VisibilityIcon />}
          onClick={() => forceShowNavbarPumpkin()}
        >
          Mostrar en navbar
        </Button>
      </Stack>
    </Box>
  );
}
