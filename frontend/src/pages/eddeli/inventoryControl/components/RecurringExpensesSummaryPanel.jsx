import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  alpha,
  useTheme,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { APP_ROUTES } from "../../../../config/appRoutes.js";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import EventIcon from "@mui/icons-material/Event";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseIcon from "@mui/icons-material/Close";
import ChartBlockHeader from "../../../../components/Charts/ChartBlockHeader";
import { money } from "../collections/helpers.js";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

function MetricCard({ title, value, subtitle, icon: Icon, color }) {
  const theme = useTheme();
  const main = theme.palette[color]?.main || theme.palette.primary.main;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        flex: "1 1 0",
        minWidth: 0,
        borderRadius: 2,
        border: "1px solid",
        borderColor: alpha(main, 0.25),
        background: `linear-gradient(145deg, ${alpha(main, 0.1)} 0%, ${alpha(main, 0.03)} 100%)`,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={0.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: main, lineHeight: 1.2 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" display="block">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(main, 0.15),
            color: main,
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 18 }} />
        </Box>
      </Stack>
    </Paper>
  );
}

function PaymentRow({ row, formatDue, overdue = false }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" noWrap fontWeight={600}>
          {row.displayName}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {row.storeName} · {overdue ? `venció ${formatDue(row.dueDate)}` : formatDue(row.dueDate)}
          {!overdue && row.amountType === "variable" ? " · est." : ""}
        </Typography>
      </Box>
      <Chip
        size="small"
        icon={
          overdue ? <WarningAmberIcon sx={{ fontSize: "14px !important" }} /> : undefined
        }
        label={money(row.displayAmount)}
        color={overdue ? "error" : row.isDueSoon ? "warning" : "default"}
        variant="outlined"
        sx={{ fontWeight: 700, flexShrink: 0 }}
      />
    </Stack>
  );
}

export default function RecurringExpensesSummaryPanel({ recurring }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const summary = recurring?.summary ?? {
    monthlyBurden: 0,
    pendingThisMonth: 0,
    gapToCover: 0,
    dailySalesTarget: 0,
    daysLeftInMonth: 1,
    isProfitable: false,
    overdueCount: 0,
  };
  const upcoming = Array.isArray(recurring?.upcoming) ? recurring.upcoming : [];
  const overdue = Array.isArray(recurring?.overdue) ? recurring.overdue : [];
  const hasDetails = upcoming.length > 0 || overdue.length > 0;

  const formatDue = (d) => {
    if (!d) return "";
    try {
      return format(typeof d === "string" ? parseISO(d) : new Date(d), "d MMM", { locale: es });
    } catch {
      return "";
    }
  };

  return (
    <>
      <Paper
        variant="panel"
        elevation={0}
        sx={{ p: { xs: 1.25, sm: 1.5 }, borderRadius: 2, height: "100%" }}
      >
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={0.75}
          sx={{ mb: 1 }}
        >
          <ChartBlockHeader title="Gastos fijos del local" sx={{ mb: 0, flex: 1, minWidth: 0 }} />
          <Stack direction="row" spacing={0.5} flexShrink={0}>
            {hasDetails ? (
              <Button
                variant="outlined"
                size="small"
                onClick={() => setDetailsOpen(true)}
                sx={{ fontSize: "0.7rem", py: 0.25, px: 0.75 }}
              >
                Detalles
              </Button>
            ) : null}
            <Button
              component={RouterLink}
              to={APP_ROUTES.finance.recurringExpenses}
              variant="outlined"
              size="small"
              endIcon={<OpenInNewIcon sx={{ fontSize: "0.95rem !important" }} />}
              sx={{ fontSize: "0.7rem", py: 0.25, px: 0.75 }}
            >
              Ver módulo
            </Button>
          </Stack>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.5 }}>
          <MetricCard
            title="Carga mensual"
            value={money(summary.monthlyBurden)}
            subtitle="Fijos + estimados"
            icon={HomeWorkIcon}
            color="secondary"
          />
          <MetricCard
            title="Pendiente mes"
            value={money(summary.pendingThisMonth)}
            subtitle="Por pagar"
            icon={EventIcon}
            color="warning"
          />
        </Stack>

        {summary.isProfitable ? (
          <Alert severity="success" sx={{ py: 0.25 }}>
            Ingresos del mes cubren los gastos fijos estimados.
          </Alert>
        ) : summary.gapToCover > 0 ? (
          <Alert severity="info" icon={<TrendingUpIcon fontSize="inherit" />} sx={{ py: 0.25 }}>
            Faltan {money(summary.gapToCover)} para cubrir fijos. Meta diaria:{" "}
            <strong>{money(summary.dailySalesTarget)}</strong> ({summary.daysLeftInMonth} días
            restantes).
          </Alert>
        ) : null}

        {summary.overdueCount > 0 ? (
          <Alert severity="warning" sx={{ py: 0.25, mt: 1 }}>
            {summary.overdueCount} pago(s) vencido(s). Abrí <strong>Detalles</strong> o el módulo.
          </Alert>
        ) : null}
      </Paper>

      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pr: 6 }}>
          Detalle de gastos fijos
          <IconButton
            aria-label="cerrar"
            onClick={() => setDetailsOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
            <MetricCard
              title="Carga mensual"
              value={money(summary.monthlyBurden)}
              subtitle="Fijos + estimados"
              icon={HomeWorkIcon}
              color="secondary"
            />
            <MetricCard
              title="Pendiente mes"
              value={money(summary.pendingThisMonth)}
              subtitle="Por pagar"
              icon={EventIcon}
              color="warning"
            />
          </Stack>

          {overdue.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                color="error.main"
                fontWeight={700}
                display="block"
                sx={{ mb: 0.75 }}
              >
                Vencidos
              </Typography>
              <Stack spacing={0.75}>
                {overdue.map((row) => (
                  <PaymentRow key={row.id} row={row} formatDue={formatDue} overdue />
                ))}
              </Stack>
            </Box>
          )}

          {upcoming.length > 0 && (
            <Box>
              {overdue.length > 0 ? <Divider sx={{ mb: 1.5 }} /> : null}
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                display="block"
                sx={{ mb: 0.75 }}
              >
                Próximos pagos
              </Typography>
              <Stack spacing={0.75}>
                {upcoming.map((row) => (
                  <PaymentRow key={row.id} row={row} formatDue={formatDue} />
                ))}
              </Stack>
            </Box>
          )}

          {!hasDetails ? (
            <Typography variant="body2" color="text.secondary">
              No hay cuotas próximas ni vencidas.
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={() => setDetailsOpen(false)}>Cerrar</Button>
          <Button
            component={RouterLink}
            to={APP_ROUTES.finance.recurringExpenses}
            variant="contained"
            endIcon={<OpenInNewIcon />}
            onClick={() => setDetailsOpen(false)}
          >
            Ir al módulo
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
