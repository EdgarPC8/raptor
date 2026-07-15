/**
 * Exploración de módulos/secciones en modo invitado (sin backend).
 */
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ExtensionIcon from "@mui/icons-material/Extension";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SchoolIcon from "@mui/icons-material/School";
import {
  APP_MODULE_GROUPS,
  findCatalogMatchByPath,
  MODULE_STATUS_META,
  resolveModuleStatus,
  resolveGroupModuleStatus,
} from "../config/appModulesCatalog.js";

export default function GuestExplorePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname || "/";

  const match = useMemo(() => findCatalogMatchByPath(path), [path]);
  const isHub = path === "/" || path === "/inicio";

  const status = match ? resolveModuleStatus(match.section) : null;
  const statusMeta = status ? MODULE_STATUS_META[status] : null;

  /** Invitado: solo módulos de Administrador y Empleado. */
  const guestGroups = useMemo(
    () => APP_MODULE_GROUPS.filter((g) => resolveGroupModuleStatus(g) !== "developer"),
    [],
  );

  if (status === "developer") {
    return (
      <Box sx={{ p: 3, maxWidth: 720, mx: "auto" }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          No disponible en modo invitado
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          En invitado solo podés explorar lo de Administrador y Empleado.
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/inicio")}>
          Módulos
        </Button>
      </Box>
    );
  }

  if (isHub && !match) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 960, mx: "auto" }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <SchoolIcon color="primary" />
            <Typography variant="h5" fontWeight={800}>
              Modo invitado
            </Typography>
            <Chip label="Sin backend" size="small" color="warning" />
          </Stack>
          <Typography color="text.secondary">
            Explorá los módulos de Administrador y Empleado desde el menú lateral. Cada
            sección muestra su descripción y funciones.
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "1fr 1fr 1fr",
              },
              gap: 1.5,
            }}
          >
            {guestGroups.map((group) => (
              <Paper
                key={group.id}
                variant="outlined"
                sx={{
                  p: 2,
                  cursor: "pointer",
                  borderRadius: 2,
                  transition: "0.15s",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                  },
                }}
                onClick={() => {
                  const first = (group.sections || []).find(
                    (s) => s.path && !String(s.path).includes(":"),
                  );
                  if (first?.path) navigate(first.path);
                }}
              >
                <Typography fontWeight={800}>{group.label}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {group.summary || `${(group.sections || []).length} secciones`}
                </Typography>
                <Chip
                  size="small"
                  sx={{ mt: 1 }}
                  label={`${(group.sections || []).length} secciones`}
                />
              </Paper>
            ))}
          </Box>
        </Stack>
      </Box>
    );
  }

  if (!match) {
    return (
      <Box sx={{ p: 3, maxWidth: 720, mx: "auto" }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Sección en exploración
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Ruta <code>{path}</code> sin ficha en el catálogo. Volvé al menú o al inicio del
          modo invitado.
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/inicio")}>
          Módulos
        </Button>
      </Box>
    );
  }

  const { group, section } = match;
  const functions = section.functions || [];
  const siblings = (group.sections || []).filter(
    (s) => s.path && !String(s.path).includes(":"),
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 880, mx: "auto" }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            icon={<ExtensionIcon />}
            label="Invitado"
            size="small"
            color="info"
            variant="outlined"
          />
          <Chip label={group.label} size="small" />
          {statusMeta ? (
            <Chip
              label={statusMeta.label || status}
              size="small"
              sx={{ fontWeight: 700 }}
            />
          ) : null}
        </Stack>

        <Typography variant="h4" fontWeight={800}>
          {section.name}
        </Typography>
        <Typography color="text.secondary">
          {section.description || group.summary || "Sección del sistema Raptor."}
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(
              status === "maintenance"
                ? theme.palette.error.main
                : status === "planned"
                  ? theme.palette.warning.main
                  : theme.palette.primary.main,
              0.1,
            )}, ${alpha(theme.palette.secondary.main, 0.06)})`,
          }}
        >
          <Typography variant="subtitle2" fontWeight={800} gutterBottom>
            {status === "maintenance"
              ? "En mantenimiento"
              : status === "planned"
                ? "Próximamente"
                : status === "developer"
                  ? "Solo desarrollador"
                  : "Exploración"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {status === "maintenance"
              ? "Esta sección está fuera de uso operativo por ahora. Podés ver su ficha y volver a los módulos activos del menú."
              : status === "planned"
                ? "Aún no hay pantallas útiles aquí. Está previsto a futuro; usá el menú para recorrer lo que ya está activo en demo."
                : statusMeta?.description ||
                  "Ficha del módulo para conocer qué hará esta sección en Raptor."}
          </Typography>
        </Paper>

        {functions.length > 0 ? (
          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography fontWeight={800}>Funciones de esta sección</Typography>
            </Box>
            <Divider />
            <List dense disablePadding>
              {functions.map((fn, i) => (
                <ListItem key={`${fn.name}-${i}`} divider={i < functions.length - 1}>
                  <ListItemText
                    primary={fn.name}
                    secondary={fn.description}
                    primaryTypographyProps={{ fontWeight: 700, fontSize: 14 }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        ) : null}

        {siblings.length > 1 ? (
          <Box>
            <Typography fontWeight={800} sx={{ mb: 1 }}>
              Otras secciones de {group.label}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {siblings.map((s) => (
                <Chip
                  key={s.path}
                  label={s.name}
                  clickable
                  color={s.path === section.path ? "primary" : "default"}
                  variant={s.path === section.path ? "filled" : "outlined"}
                  onClick={() => navigate(s.path)}
                />
              ))}
            </Stack>
          </Box>
        ) : null}

        <Stack direction="row" spacing={1}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/inicio")}>
            Todos los módulos
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
