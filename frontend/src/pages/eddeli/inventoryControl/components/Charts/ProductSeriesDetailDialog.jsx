import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { LineChart } from "@mui/x-charts/LineChart";
import { useTheme } from "@mui/material/styles";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { getProductSeriesDetailRequest } from "../../../../../api/financeRequest";
import { getChartSeriesColors } from "../../../../../theme/chartPalette";

const moneyFmt = (v) =>
  new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(v ?? 0));

const qtyFmt = (v) =>
  new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(Number(v ?? 0));

function parseKeyDate(key) {
  const raw = String(key || "");
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    return new Date(y, m - 1, 1, 12, 0, 0);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return new Date(`${raw.slice(0, 10)}T12:00:00`);
  }
  return null;
}

function formatIsoDate(iso) {
  if (!iso) return "—";
  const d = parseISO(String(iso));
  if (!isValid(d)) return "—";
  return format(d, "d MMM yyyy", { locale: es });
}

function StatCard({ label, value, hint, tone }) {
  return (
    <Box
      sx={{
        p: 1,
        borderRadius: 1.25,
        border: 1,
        borderColor: tone === "warn" ? "warning.main" : "divider",
        bgcolor: tone === "warn" ? "action.hover" : "background.default",
        minWidth: 0,
        flex: "1 1 120px",
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.25 }}>
        {value}
      </Typography>
      {hint ? (
        <Box sx={{ mt: 0.2 }}>
          {typeof hint === "string" || typeof hint === "number" ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2 }}>
              {hint}
            </Typography>
          ) : (
            hint
          )}
        </Box>
      ) : null}
    </Box>
  );
}

function changeLabel(pct) {
  const n = Number(pct);
  if (!Number.isFinite(n)) return "—";
  if (n > 0) return `▲ ${n.toFixed(1)}%`;
  if (n < 0) return `▼ ${Math.abs(n).toFixed(1)}%`;
  return "= 0%";
}

function changeColor(pct) {
  const n = Number(pct);
  if (n > 0) return "success.main";
  if (n < 0) return "error.main";
  return "text.secondary";
}

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 1.5 }}>{children}</Box>;
}

/**
 * Modal compacto con pestañas: historial completo del producto (desde la 1ª venta).
 * El filtro semana/mes/año del gráfico NO afecta este detalle.
 */
export default function ProductSeriesDetailDialog({
  open,
  onClose,
  productId = null,
  productName = "",
}) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);
  const colors = useMemo(() => getChartSeriesColors(theme), [theme]);

  useEffect(() => {
    if (!open || !productId) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      setDetail(null);
      setTab(0);
      try {
        const { data } = await getProductSeriesDetailRequest(productId);
        if (!cancelled) setDetail(data);
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || "No se pudo cargar el detalle");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, productId]);

  const chartData = useMemo(() => {
    const series = detail?.series || [];
    return series
      .map((p) => {
        const date = parseKeyDate(p.key);
        if (!date) return null;
        return {
          date,
          amount: Number(p.amount || 0) || null,
          qty: Number(p.qty || 0) || null,
        };
      })
      .filter(Boolean)
      .filter((r) => (r.amount || 0) > 0 || (r.qty || 0) > 0);
  }, [detail]);

  const titleName = detail?.product?.name || productName || `Producto #${productId}`;
  const bucketWord = detail?.granularity === "month" ? "mes" : "día";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ pr: 6, pb: 0.5, fontWeight: 700 }}>
        {titleName}
        <Typography variant="body2" color="text.secondary" fontWeight={400}>
          Historial completo · {detail?.periodLabel || "Cargando…"}
          {detail?.firstSaleAt
            ? ` · 1ª venta ${formatIsoDate(detail.firstSaleAt)}`
            : ""}
        </Typography>
        <IconButton
          aria-label="Cerrar"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 1 }}>
        {loading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={32} />
          </Stack>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : !detail ? (
          <Typography color="text.secondary">Sin datos.</Typography>
        ) : (
          <>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 36,
                borderBottom: 1,
                borderColor: "divider",
                "& .MuiTab-root": { minHeight: 36, py: 0.5, textTransform: "none", fontWeight: 600 },
              }}
            >
              <Tab label="Resumen" />
              <Tab label="Evolución" />
              <Tab label="Día semana" />
              <Tab label="Ranking" />
            </Tabs>

            <TabPanel value={tab} index={0}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <StatCard label="Ingresos totales" value={moneyFmt(detail.totals?.amount)} />
                  <StatCard label="Cantidad total" value={`${qtyFmt(detail.totals?.qty)} u`} />
                  <StatCard
                    label="Cobros"
                    value={String(detail.totals?.payments ?? 0)}
                    hint={`${detail.totals?.activeDays ?? 0} días con venta`}
                  />
                  <StatCard
                    label="Ritmo (u / día)"
                    value={`${qtyFmt(detail.velocity?.qtyPerDay)} u`}
                    hint={detail.velocity?.label || "—"}
                  />
                  <StatCard
                    label="% días con venta"
                    value={`${qtyFmt(detail.velocity?.pctDaysWithSales)}%`}
                    hint={`${detail.totals?.activeDays ?? 0} de ${detail.totals?.calendarDays ?? "—"}`}
                  />
                  <StatCard
                    label="Stock / cobertura"
                    value={`${qtyFmt(detail.velocity?.stock)} · ${
                      detail.velocity?.daysOfCover == null
                        ? "—"
                        : `${qtyFmt(detail.velocity.daysOfCover)} d`
                    }`}
                    hint={
                      detail.velocity?.minStock > 0
                        ? `Mínimo ${qtyFmt(detail.velocity.minStock)}`
                        : "Días de stock ≈ stock ÷ ritmo"
                    }
                    tone={
                      detail.velocity?.belowMinStock ||
                      (detail.velocity?.daysOfCover != null && detail.velocity.daysOfCover <= 3)
                        ? "warn"
                        : undefined
                    }
                  />
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <StatCard
                    label="Margen estimado"
                    value={moneyFmt(detail.margin?.estimatedMargin)}
                    hint={`${qtyFmt(detail.margin?.marginPct)}% · costo ${moneyFmt(detail.margin?.estimatedCost)}`}
                  />
                  {detail.comparison ? (
                    <>
                      <StatCard
                        label={detail.comparison.currentLabel || "Últimos 30 días"}
                        value={moneyFmt(detail.comparison.current?.amount ?? 0)}
                        hint={`${qtyFmt(detail.comparison.current?.qty ?? 0)} u`}
                      />
                      <StatCard
                        label={`Vs ${detail.comparison.previousLabel}`}
                        value={
                          <Typography
                            component="span"
                            variant="subtitle2"
                            fontWeight={700}
                            sx={{ color: changeColor(detail.comparison.amountChangePct) }}
                          >
                            {changeLabel(detail.comparison.amountChangePct)}
                          </Typography>
                        }
                        hint={`Cant. ${changeLabel(detail.comparison.qtyChangePct)}`}
                      />
                    </>
                  ) : null}
                </Stack>

                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  {detail.peakByAmount ? (
                    <Chip
                      size="small"
                      color="success"
                      variant="outlined"
                      label={`Pico $: ${detail.peakByAmount.label}`}
                    />
                  ) : null}
                  {detail.peakWeekdayByAmount ? (
                    <Chip
                      size="small"
                      color="warning"
                      variant="outlined"
                      label={`Mejor día: ${detail.peakWeekdayByAmount.label}`}
                    />
                  ) : null}
                  {detail.peakByQty ? (
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`Pico cant.: ${detail.peakByQty.label}`}
                    />
                  ) : null}
                </Stack>
              </Stack>
            </TabPanel>

            <TabPanel value={tab} index={1}>
              {chartData.length > 0 ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    Serie por {bucketWord} desde el inicio de ventas
                  </Typography>
                  <LineChart
                    dataset={chartData}
                    xAxis={[
                      {
                        dataKey: "date",
                        scaleType: "time",
                        valueFormatter: (d) =>
                          detail.granularity === "month"
                            ? d.toLocaleDateString("es-EC", { month: "short", year: "2-digit" })
                            : d.toLocaleDateString("es-EC", { day: "2-digit", month: "short" }),
                      },
                    ]}
                    series={[
                      {
                        dataKey: "amount",
                        label: "Ingresos ($)",
                        color: colors[0],
                        area: true,
                        showMark: false,
                        curve: "monotoneX",
                        valueFormatter: (v) => (v == null ? "—" : moneyFmt(v)),
                      },
                    ]}
                    height={280}
                    margin={{ left: 8, right: 8, top: 8, bottom: 24 }}
                    slotProps={{ legend: { hidden: true } }}
                  />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Sin puntos de serie.
                </Typography>
              )}
            </TabPanel>

            <TabPanel value={tab} index={2}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                Total histórico agrupado por día de la semana
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Día</TableCell>
                    <TableCell align="right">Ingresos</TableCell>
                    <TableCell align="right">Cant.</TableCell>
                    <TableCell align="right">Días c/ venta</TableCell>
                    <TableCell align="right">Prom.</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(detail.weekdayStats || []).map((row) => {
                    const isTop =
                      detail.peakWeekdayByAmount &&
                      Number(row.weekday) === Number(detail.peakWeekdayByAmount.weekday);
                    return (
                      <TableRow key={row.weekday} hover selected={Boolean(isTop)}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={isTop ? 700 : 500}>
                            {row.label}
                            {isTop ? " · top" : ""}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{moneyFmt(row.amount)}</TableCell>
                        <TableCell align="right">{qtyFmt(row.qty)}</TableCell>
                        <TableCell align="right">{row.daysWithSales}</TableCell>
                        <TableCell align="right">{moneyFmt(row.avgAmountPerOccurrence)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabPanel>

            <TabPanel value={tab} index={3}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                    Top {bucketWord}s por ingresos
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>{detail.granularity === "month" ? "Mes" : "Día"}</TableCell>
                        <TableCell align="right">$</TableCell>
                        <TableCell align="right">Cant.</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(detail.topDays || []).slice(0, 8).map((row, idx) => (
                        <TableRow key={row.key} hover>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{row.label}</TableCell>
                          <TableCell align="right">{moneyFmt(row.amount)}</TableCell>
                          <TableCell align="right">{qtyFmt(row.qty)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>

                {detail.granularity === "month" && (detail.topCalendarDays || []).length > 0 ? (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                      Top días concretos
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Día</TableCell>
                          <TableCell align="right">$</TableCell>
                          <TableCell align="right">Cant.</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detail.topCalendarDays.slice(0, 8).map((row, idx) => (
                          <TableRow key={row.key} hover>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>{row.label}</TableCell>
                            <TableCell align="right">{moneyFmt(row.amount)}</TableCell>
                            <TableCell align="right">{qtyFmt(row.qty)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ) : null}
              </Stack>
            </TabPanel>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
