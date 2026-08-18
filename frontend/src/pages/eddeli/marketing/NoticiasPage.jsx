import { Box, Container, Stack, Typography } from "@mui/material";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import ScheduleIcon from "@mui/icons-material/Schedule";

/** Placeholder hasta implementar el tablero de novedades (gestor: planned). */
export default function NoticiasPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={2} alignItems="flex-start">
        <Stack direction="row" spacing={1} alignItems="center">
          <NewspaperIcon color="warning" />
          <Typography variant="h6" fontWeight={700}>
            Noticias
          </Typography>
        </Stack>
        <Box
          sx={{
            width: "100%",
            p: 3,
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <ScheduleIcon fontSize="small" color="warning" />
            <Typography variant="subtitle1" fontWeight={600}>
              Próximamente
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Acá irán las novedades del negocio: avisos, promos de la semana y
            lanzamientos. El equipo las verá aquí; si tenés activada la vista
            pública en Configuración, también podrán salir en el inicio
            (HomeLogout).
          </Typography>
        </Box>
      </Stack>
    </Container>
  );
}
