import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Stack,
  TablePagination,
  Tooltip,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import TableRowsIcon from "@mui/icons-material/TableRows";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { format, parseISO, isValid, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { Link as RouterLink } from "react-router-dom";
import ChartBlockHeader from "../../../../components/Charts/ChartBlockHeader";
import BatchExpiryGauge, { BatchExpiryGaugeSkeleton } from "./BatchExpiryGauge.jsx";
import {
  dashboardTwinPanelSx,
  DASHBOARD_TWIN_PANEL_BODY_HEIGHT,
} from "./dashboardTwinPanelLayout.js";
import { APP_ROUTES } from "../../../../config/appRoutes.js";

const GAUGE_SLOT_COUNT = 8;

const BATCH_VIEWS = {
  expiring: {
    id: "expiring",
    label: "Por vencer",
    icon: WarningAmberIcon,
    color: "warning",
    empty: "No hay lotes en zona amarilla/roja de alerta.",
  },
  expired: {
    id: "expired",
    label: "Vencidos",
    icon: EventBusyIcon,
    color: "error",
    empty: "No hay lotes vencidos con stock.",
  },
  ok: {
    id: "ok",
    label: "Vigentes",
    icon: CheckCircleOutlineIcon,
    color: "success",
    empty: "No hay lotes vigentes con stock.",
  },
};

const compactToggleSx = {
  textTransform: "none",
  px: 0.65,
  py: 0.3,
  fontSize: "0.68rem",
  lineHeight: 1.2,
  minWidth: 0,
  "& .MuiSvgIcon-root": { fontSize: "0.85rem", mr: 0.35 },
  "& .MuiChip-root": {
    height: 16,
    fontSize: "0.62rem",
    ml: 0.4,
    "& .MuiChip-label": { px: 0.5 },
  },
};

function formatDate(iso) {
  if (!iso) return "—";
  const d = parseISO(String(iso).slice(0, 10));
  if (!isValid(d)) return String(iso).slice(0, 10);
  return format(d, "d MMM yyyy", { locale: es });
}

function daysLabel(expiresAt) {
  if (!expiresAt) return "—";
  const d = parseISO(String(expiresAt).slice(0, 10));
  if (!isValid(d)) return "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const n = differenceInCalendarDays(d, today);
  if (n < 0) return `${Math.abs(n)} d vencido`;
  if (n === 0) return "Vence hoy";
  return `${n} d`;
}

function BatchAlertsFilterBar({ view, batchesAlerts, onViewChange, sx }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap sx={sx}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={view}
        sx={{ flexWrap: "nowrap" }}
        onChange={(_, v) => {
          if (v) onViewChange(v);
        }}
      >
        {Object.values(BATCH_VIEWS).map((v) => (
          <ToggleButton key={v.id} value={v.id} sx={compactToggleSx}>
            <v.icon sx={{ fontSize: "0.85rem", mr: 0.35 }} />
            {v.label}
            <Chip
              size="small"
              label={
                v.id === "expired"
                  ? batchesAlerts?.expired?.length ?? 0
                  : v.id === "ok"
                    ? batchesAlerts?.ok?.length ?? 0
                    : batchesAlerts?.expiring?.length ?? 0
              }
              color={v.color}
            />
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}

function BatchesAlertsTable({ rows, emptyMessage }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Producto</TableCell>
          <TableCell>Lote</TableCell>
          <TableCell align="right">Cant.</TableCell>
          <TableCell>Vence</TableCell>
          <TableCell align="right">Días</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} hover>
            <TableCell>
              <Typography variant="body2" fontWeight={600}>
                {row.productName}
              </Typography>
            </TableCell>
            <TableCell>{row.code || `#${row.id}`}</TableCell>
            <TableCell align="right">{row.quantityRemaining}</TableCell>
            <TableCell>{formatDate(row.expiresAt)}</TableCell>
            <TableCell align="right">
              <Chip
                size="small"
                color={row.expired ? "error" : "warning"}
                label={daysLabel(row.expiresAt)}
              />
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={5}>
              <Typography variant="body2" color="text.secondary">
                {emptyMessage}
              </Typography>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export default function DashboardBatchesPanel({ batchesAlerts }) {
  const [view, setView] = useState("expiring");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [detailOpen, setDetailOpen] = useState(false);

  const warnDays = batchesAlerts?.warnDays ?? 30;
  const currentMeta = BATCH_VIEWS[view];

  const rows = useMemo(() => {
    const list =
      view === "expired"
        ? batchesAlerts?.expired
        : view === "ok"
          ? batchesAlerts?.ok
          : batchesAlerts?.expiring;
    return [...(list || [])].sort((a, b) =>
      String(a.expiresAt || "").localeCompare(String(b.expiresAt || "")),
    );
  }, [batchesAlerts, view]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, page, rowsPerPage]);

  const gaugeSlots = useMemo(() => {
    const items = rows.slice(0, GAUGE_SLOT_COUNT);
    return Array.from({ length: GAUGE_SLOT_COUNT }, (_, i) => items[i] ?? null);
  }, [rows]);

  const hasAnyAlerts =
    (batchesAlerts?.expired?.length ?? 0) +
      (batchesAlerts?.expiring?.length ?? 0) +
      (batchesAlerts?.ok?.length ?? 0) >
    0;

  return (
    <Paper
      variant="panel"
      sx={{
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: 2,
        minWidth: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        ...dashboardTwinPanelSx,
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1, flexShrink: 0 }}
      >
        <ChartBlockHeader
          title="Lotes y vencimientos"
          subtitle={`Alerta ${warnDays} días`}
          sx={{ mb: 0, flex: 1 }}
        />
        <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
          <Tooltip title="Ir a lotes">
            <IconButton
              size="small"
              component={RouterLink}
              to={APP_ROUTES.inventory.batches}
              sx={{ border: 1, borderColor: "divider" }}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            size="small"
            startIcon={<TableRowsIcon />}
            onClick={() => setDetailOpen(true)}
            disabled={!hasAnyAlerts}
          >
            Ver detalle
          </Button>
        </Stack>
      </Stack>

      <BatchAlertsFilterBar
        view={view}
        batchesAlerts={batchesAlerts}
        onViewChange={(v) => {
          setView(v);
          setPage(0);
        }}
        sx={{ mb: 1, flexShrink: 0 }}
      />

      {rows.length === 0 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 0.75, textAlign: "center", flexShrink: 0 }}
        >
          {currentMeta.empty}
        </Typography>
      )}

      <Box
        sx={{
          height: DASHBOARD_TWIN_PANEL_BODY_HEIGHT,
          minHeight: DASHBOARD_TWIN_PANEL_BODY_HEIGHT,
          maxHeight: DASHBOARD_TWIN_PANEL_BODY_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Grid container spacing={1}>
          {gaugeSlots.map((batch, index) => (
            <Grid item xs={3} key={batch?.id ?? `batch-gauge-${index}`} sx={{ display: "flex" }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 0.5,
                  borderRadius: 1.5,
                  flex: 1,
                  width: "100%",
                  minHeight: 100,
                  maxHeight: 100,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: batch ? "background.paper" : "action.hover",
                  borderStyle: batch ? "solid" : "dashed",
                  opacity: batch ? 1 : 0.7,
                }}
              >
                {batch ? (
                  <BatchExpiryGauge batch={batch} compact />
                ) : (
                  <BatchExpiryGaugeSkeleton compact />
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {rows.length > GAUGE_SLOT_COUNT && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1, textAlign: "center", flexShrink: 0 }}
        >
          Mostrando {GAUGE_SLOT_COUNT} de {rows.length} lotes. Abrí el detalle para ver todos.
        </Typography>
      )}

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}
        >
          Detalle de lotes y vencimientos
          <IconButton aria-label="Cerrar" onClick={() => setDetailOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <BatchAlertsFilterBar
            view={view}
            batchesAlerts={batchesAlerts}
            onViewChange={(v) => {
              setView(v);
              setPage(0);
            }}
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {currentMeta.label} · {rows.length} lotes · ventana {warnDays} días
          </Typography>
          <Box sx={{ overflowX: "auto" }}>
            <BatchesAlertsTable rows={paginated} emptyMessage={currentMeta.empty} />
          </Box>
          <TablePagination
            component="div"
            count={rows.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="Filas"
            rowsPerPageOptions={[5, 10, 25]}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button component={RouterLink} to={APP_ROUTES.inventory.batches} onClick={() => setDetailOpen(false)}>
            Ir a lotes
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
