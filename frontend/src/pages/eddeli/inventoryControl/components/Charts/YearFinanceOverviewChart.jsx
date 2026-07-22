import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Stack,
  Chip,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTheme, alpha } from '@mui/material/styles';
import {
  format,
  isSameMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { ChartSkeleton } from '../../../../../components/ContentSkeleton.jsx';
import { getChartSeriesColors, CHART_SEMANTIC_INDEX } from '../../../../../theme/chartPalette';
import { getCalendarYearSummaryRequest } from '../../../../../api/financeRequest';

const VIEW_ALL = 'all';
const VIEW_INCOME = 'income';

const emptyMetrics = () => ({
  ordersAmount: 0,
  ordersCount: 0,
  posSalesAmount: 0,
  posSalesCount: 0,
  posIncomeAmount: 0,
  posIncomeCount: 0,
  collectedAmount: 0,
  expensesAmount: 0,
});

function incomeCajaAmount(m) {
  return Number(m.posIncomeAmount ?? 0);
}

function incomeCobrosAmount(m) {
  return Number(m.collectedAmount ?? 0);
}

function roundMoney(n) {
  return Number(Number(n ?? 0).toFixed(2));
}

function pct(value, max) {
  if (!max || max <= 0) return 0;
  return Math.min(100, (Number(value) / max) * 100);
}

function hasMonthData(m, isIncomeView) {
  if (isIncomeView) {
    return incomeCajaAmount(m) > 0 || incomeCobrosAmount(m) > 0;
  }
  return (
    m.ordersCount > 0 ||
    m.posSalesCount > 0 ||
    incomeCajaAmount(m) > 0 ||
    incomeCobrosAmount(m) > 0 ||
    m.expensesAmount > 0
  );
}

const LEGEND_ALL = [
  { key: 'orderMoney', label: 'Pedidos', colorKey: 'orderMoney' },
  { key: 'posSales', label: 'Caja', colorKey: 'posSales' },
  { key: 'collected', label: 'Ingresos', colorKey: 'collected' },
  { key: 'expense', label: 'Gastos', colorKey: 'expense' },
];

const LEGEND_INCOME = [
  { key: 'posSales', label: 'Caja', colorKey: 'posSales' },
  { key: 'collected', label: 'Cobros', colorKey: 'collected' },
];

function ValueStrip({ valueText, barPercent, color, track }) {
  return (
    <Box sx={{ mb: 0.45 }}>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          fontWeight: 700,
          fontSize: '0.7rem',
          lineHeight: 1.2,
          color,
          textAlign: 'right',
          mb: 0.25,
        }}
      >
        {valueText}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={barPercent}
        sx={{
          height: 4,
          borderRadius: 1,
          bgcolor: track,
          '& .MuiLinearProgress-bar': {
            borderRadius: 1,
            bgcolor: color,
          },
        }}
      />
    </Box>
  );
}

function LegendRow({ items, chartColors }) {
  return (
    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.25} sx={{ gap: 1.25 }}>
      {items.map(({ key, label, colorKey }) => (
        <Stack key={key} direction="row" alignItems="center" spacing={0.5}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: chartColors[colorKey],
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
            {label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function YearTotalItem({ label, value, color, moneyFmt }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.3, mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 800, color, lineHeight: 1.2 }}>
        {moneyFmt(value)}
      </Typography>
    </Box>
  );
}

export default function YearFinanceOverviewChart({
  initialYear = new Date().getFullYear(),
  onMonthSelect,
}) {
  const theme = useTheme();
  const [year, setYear] = useState(initialYear);
  const [months, setMonths] = useState({});
  const [totals, setTotals] = useState({ orders: 0, posSales: 0, posIncome: 0, collected: 0, expenses: 0 });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(VIEW_ALL);

  const isIncomeView = viewMode === VIEW_INCOME;

  const chartColors = useMemo(() => {
    const p = theme.palette;
    const s = getChartSeriesColors(theme);
    return {
      orders: s[CHART_SEMANTIC_INDEX.primary],
      orderMoney: s[CHART_SEMANTIC_INDEX.money],
      posSales: theme.palette.info.main,
      collected: s[CHART_SEMANTIC_INDEX.positive],
      incomeTotal: theme.palette.warning.main,
      expense: p.error.main,
      track: alpha(p.text.primary, theme.palette.mode === 'dark' ? 0.2 : 0.12),
    };
  }, [theme]);

  const moneyFmt = useCallback(
    (v) =>
      new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(v ?? 0),
    []
  );

  const moneyFmtCompact = useCallback(
    (v) =>
      new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(v ?? 0),
    []
  );

  const monthDates = useMemo(
    () => Array.from({ length: 12 }, (_, i) => new Date(year, i, 1)),
    [year]
  );

  const metricsList = useMemo(
    () =>
      monthDates.map((date) => {
        const key = format(date, 'yyyy-MM');
        return { date, key, ...(months[key] ?? emptyMetrics()) };
      }),
    [monthDates, months]
  );

  const maxOA = Math.max(1, ...metricsList.map((m) => m.ordersAmount));
  const maxOpPos = isIncomeView ? 1 : Math.max(1, ...metricsList.map((m) => m.posSalesAmount));
  const maxCajaIncome = Math.max(1, ...metricsList.map((m) => incomeCajaAmount(m)));
  const maxCA = Math.max(1, ...metricsList.map((m) => incomeCobrosAmount(m)));
  const maxEA = Math.max(1, ...metricsList.map((m) => m.expensesAmount));

  const yearIncomeTotal = useMemo(
    () => roundMoney((totals.posIncome ?? 0) + (totals.collected ?? 0)),
    [totals]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await getCalendarYearSummaryRequest(year);
        if (!cancelled) {
          setMonths(data?.months ?? {});
          setTotals(data?.totals ?? { orders: 0, posSales: 0, posIncome: 0, collected: 0, expenses: 0 });
        }
      } catch (err) {
        console.error('Error resumen anual:', err);
        if (!cancelled) {
          setMonths({});
          setTotals({ orders: 0, posSales: 0, posIncome: 0, collected: 0, expenses: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [year]);

  const handleMonthClick = useCallback(
    (date) => {
      onMonthSelect?.(date);
    },
    [onMonthSelect]
  );

  const now = new Date();

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, position: 'relative', minWidth: 0 }}>
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.background.paper, 0.85),
            borderRadius: 2,
            p: 2,
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 480 }}>
            <ChartSkeleton height={220} />
          </Box>
        </Box>
      )}

      <ChartBlockHeader
        title="Resumen anual por mes"
        subtitle={
          isIncomeView
            ? 'Caja y cobros por mes según fecha en que entró el dinero (Income). Misma fecha; solo cambia el origen.'
            : 'Pedidos/caja por fecha de pedido; ingresos y gastos por Income/Expense. Clic en un mes para el calendario.'
        }
        sx={{ mb: 0.75 }}
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.25 }}
      >
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ flexShrink: 0 }}>
          <IconButton size="small" disabled={loading} onClick={() => setYear((y) => y - 1)} aria-label="Año anterior">
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography variant="subtitle1" sx={{ minWidth: 56, textAlign: 'center', fontWeight: 800 }}>
            {year}
          </Typography>
          <IconButton size="small" disabled={loading} onClick={() => setYear((y) => y + 1)} aria-label="Año siguiente">
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Stack>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={viewMode}
          onChange={(_, v) => { if (v) setViewMode(v); }}
          sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
        >
          <ToggleButton value={VIEW_ALL} sx={{ textTransform: 'none', gap: 0.75, flex: { xs: 1, sm: '0 0 auto' } }}>
            <ViewModuleIcon fontSize="small" />
            Todo
          </ToggleButton>
          <ToggleButton value={VIEW_INCOME} sx={{ textTransform: 'none', gap: 0.75, flex: { xs: 1, sm: '0 0 auto' } }}>
            <TrendingUpIcon fontSize="small" />
            Ingresos
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Box sx={{ mb: 1.25 }}>
        <LegendRow
          items={isIncomeView ? LEGEND_INCOME : LEGEND_ALL}
          chartColors={chartColors}
        />
        {isIncomeView && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
            Total del año:{' '}
            <Box component="span" sx={{ fontWeight: 800, color: chartColors.incomeTotal }}>
              {moneyFmt(yearIncomeTotal)}
            </Box>
          </Typography>
        )}
      </Box>

      <Grid container spacing={0.75}>
        {metricsList.map((m) => {
          const isCurrent = isSameMonth(m.date, now) && year === now.getFullYear();
          const data = hasMonthData(m, isIncomeView);
          const tip = isIncomeView
            ? `${format(m.date, 'MMMM yyyy', { locale: es })}\n` +
              `Caja (entrada del dinero): ${moneyFmt(incomeCajaAmount(m))}\n` +
              `Cobros pedidos: ${moneyFmt(incomeCobrosAmount(m))}\n` +
              `Total: ${moneyFmt(incomeCajaAmount(m) + incomeCobrosAmount(m))}`
            : `${format(m.date, 'MMMM yyyy', { locale: es })}\n` +
              `Pedidos (fecha pedido): ${m.ordersCount} · ${moneyFmt(m.ordersAmount)}\n` +
              `Caja (fecha pedido): ${m.posSalesCount} · ${moneyFmt(m.posSalesAmount)}\n` +
              `Cobros pedidos (entrada $): ${moneyFmt(incomeCobrosAmount(m))}\n` +
              `Gastos (Expense): ${moneyFmt(m.expensesAmount)}`;

          return (
            <Grid item xs={6} sm={4} md={3} lg={2} key={m.key}>
              <Paper
                variant="outlined"
                title={data ? `${tip}\n\nClic para ver en calendario` : tip}
                onClick={!loading ? () => handleMonthClick(m.date) : undefined}
                sx={{
                  p: 1,
                  minHeight: 112,
                  borderRadius: 1.5,
                  borderColor: isCurrent ? 'primary.main' : 'divider',
                  bgcolor: isCurrent ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
                  cursor: !loading ? 'pointer' : 'default',
                  opacity: data ? 1 : 0.55,
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                  ...(!loading && {
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }),
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      textTransform: 'capitalize',
                      color: isCurrent ? 'primary.main' : 'text.primary',
                    }}
                  >
                    {format(m.date, 'MMM', { locale: es })}
                  </Typography>
                  {isCurrent && (
                    <Chip label="Actual" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                  )}
                </Stack>

                {data ? (
                  <Stack spacing={0.15}>
                    {!isIncomeView && m.ordersAmount > 0 && (
                      <ValueStrip
                        valueText={moneyFmtCompact(m.ordersAmount)}
                        barPercent={pct(m.ordersAmount, maxOA)}
                        color={chartColors.orderMoney}
                        track={chartColors.track}
                      />
                    )}
                    {!isIncomeView && m.posSalesAmount > 0 && (
                      <ValueStrip
                        valueText={moneyFmtCompact(m.posSalesAmount)}
                        barPercent={pct(m.posSalesAmount, maxOpPos)}
                        color={chartColors.posSales}
                        track={chartColors.track}
                      />
                    )}
                    {isIncomeView && incomeCajaAmount(m) > 0 && (
                      <ValueStrip
                        valueText={moneyFmtCompact(incomeCajaAmount(m))}
                        barPercent={pct(incomeCajaAmount(m), maxCajaIncome)}
                        color={chartColors.posSales}
                        track={chartColors.track}
                      />
                    )}
                    {incomeCobrosAmount(m) > 0 && (
                      <ValueStrip
                        valueText={moneyFmtCompact(incomeCobrosAmount(m))}
                        barPercent={pct(incomeCobrosAmount(m), maxCA)}
                        color={chartColors.collected}
                        track={chartColors.track}
                      />
                    )}
                    {!isIncomeView && m.expensesAmount > 0 && (
                      <ValueStrip
                        valueText={moneyFmtCompact(m.expensesAmount)}
                        barPercent={pct(m.expensesAmount, maxEA)}
                        color={chartColors.expense}
                        track={chartColors.track}
                      />
                    )}
                  </Stack>
                ) : (
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ display: 'block', textAlign: 'center', py: 1.5, fontSize: '0.68rem' }}
                  >
                    Sin movimientos
                  </Typography>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Paper variant="outlined" sx={{ mt: 1.5, p: { xs: 1.25, sm: 1.5 }, borderRadius: 2 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
          Totales del año {year}
        </Typography>
        <Grid container spacing={2}>
          {!isIncomeView && (
            <Grid item xs={6} sm={4} md={3}>
              <YearTotalItem label="Pedidos" value={totals.orders} color={chartColors.orderMoney} moneyFmt={moneyFmt} />
            </Grid>
          )}
          {!isIncomeView && (
            <Grid item xs={6} sm={4} md={3}>
              <YearTotalItem label="Caja (fecha pedido)" value={totals.posSales} color={chartColors.posSales} moneyFmt={moneyFmt} />
            </Grid>
          )}
          {isIncomeView && (
            <Grid item xs={6} sm={4} md={3}>
              <YearTotalItem label="Caja (entrada del dinero)" value={totals.posIncome} color={chartColors.posSales} moneyFmt={moneyFmt} />
            </Grid>
          )}
          <Grid item xs={6} sm={4} md={3}>
            <YearTotalItem
              label={isIncomeView ? 'Cobros pedidos' : 'Ingresos (Income)'}
              value={totals.collected}
              color={chartColors.collected}
              moneyFmt={moneyFmt}
            />
          </Grid>
          {isIncomeView && (
            <Grid item xs={6} sm={4} md={3}>
              <YearTotalItem label="Total ingresos" value={yearIncomeTotal} color={chartColors.incomeTotal} moneyFmt={moneyFmt} />
            </Grid>
          )}
          {!isIncomeView && (
            <Grid item xs={6} sm={4} md={3}>
              <YearTotalItem label="Gastos" value={totals.expenses} color={chartColors.expense} moneyFmt={moneyFmt} />
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
}
