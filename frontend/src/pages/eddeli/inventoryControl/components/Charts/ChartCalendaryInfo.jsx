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
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { ChartSkeleton } from '../../../../../components/ContentSkeleton.jsx';
import { getChartSeriesColors, CHART_SEMANTIC_INDEX } from '../../../../../theme/chartPalette';
import CalendarDayDetailDialog from './CalendarDayDetailDialog';
import {
  getCalendarMonthSummaryRequest,
  getCalendarDayDetailRequest,
  getCalendarPeriodDetailRequest,
} from '../../../../../api/financeRequest';

function chunkArray(arr, size) {
  const r = [];
  for (let i = 0; i < arr.length; i += size) r.push(arr.slice(i, i + size));
  return r;
}

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

const VIEW_ALL = 'all';
const VIEW_INCOME = 'income';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const calendarWeekGridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr)) minmax(68px, 0.55fr)',
};

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

function roundMoney(n) {
  return Number(Number(n ?? 0).toFixed(2));
}

function incomeCajaAmount(m) {
  return Number(m.posIncomeAmount ?? 0);
}

function incomeCobrosAmount(m) {
  return Number(m.collectedAmount ?? 0);
}

function incomeViewTotal(m) {
  return roundMoney(incomeCajaAmount(m) + incomeCobrosAmount(m));
}

function pct(value, max) {
  if (!max || max <= 0) return 0;
  return Math.min(100, (Number(value) / max) * 100);
}

function ValueStrip({ valueText, barPercent, color, track }) {
  return (
    <Box sx={{ mb: 0.35 }}>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          fontWeight: 700,
          fontSize: '0.62rem',
          lineHeight: 1.15,
          color,
          textAlign: 'right',
          mb: 0.2,
        }}
      >
        {valueText}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={barPercent}
        sx={{
          height: 3,
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

function MonthTotalItem({ label, value, color, moneyFmt }) {
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

function WeekSummaryAmount({ value, color, moneyFmtCompact }) {
  return (
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        fontWeight: 800,
        fontSize: '0.58rem',
        color,
        lineHeight: 1.2,
        textAlign: 'center',
      }}
    >
      {moneyFmtCompact(value)}
    </Typography>
  );
}

export default function ChartCalendaryInfo({
  initialDate = new Date(),
  cellMinHeight = 100,
  navigateToMonth = null,
}) {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [monthData, setMonthData] = useState({
    days: {},
    totals: { orders: 0, posSales: 0, posIncome: 0, collected: 0, expenses: 0 },
  });
  const [monthLoading, setMonthLoading] = useState(true);
  const [viewMode, setViewMode] = useState(VIEW_ALL);

  const isIncomeView = viewMode === VIEW_INCOME;

  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [periodGranularity, setPeriodGranularity] = useState('day');
  const [periodLabel, setPeriodLabel] = useState(null);

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

  const startDay = startOfMonth(currentDate);
  const endDay = endOfMonth(currentDate);
  const startWeek = startOfWeek(startDay, { weekStartsOn: 1 });
  const endWeek = endOfWeek(endDay, { weekStartsOn: 1 });
  const daysToShow = eachDayOfInterval({ start: startWeek, end: endWeek });
  const weeks = useMemo(() => chunkArray(daysToShow, 7), [daysToShow]);

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

  const getMetrics = useCallback(
    (date) => monthData.days[format(date, 'yyyy-MM-dd')] ?? emptyMetrics(),
    [monthData.days]
  );

  useEffect(() => {
    let cancelled = false;
    const loadMonth = async () => {
      setMonthLoading(true);
      try {
        const { data } = await getCalendarMonthSummaryRequest(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1
        );
        if (!cancelled) {
          setMonthData({
            days: data?.days ?? {},
            totals: data?.totals ?? { orders: 0, posSales: 0, posIncome: 0, collected: 0, expenses: 0 },
          });
        }
      } catch (err) {
        console.error('Error calendario mes:', err);
        if (!cancelled) {
          setMonthData({ days: {}, totals: { orders: 0, posSales: 0, collected: 0, expenses: 0 } });
        }
      } finally {
        if (!cancelled) setMonthLoading(false);
      }
    };
    loadMonth();
    return () => { cancelled = true; };
  }, [currentDate]);

  const handleDayClick = useCallback(async (date) => {
    setSelectedDay(date);
    setPeriodGranularity('day');
    setPeriodLabel(null);
    setDayDetail(null);
    setDayLoading(true);
    try {
      const { data } = await getCalendarDayDetailRequest(format(date, 'yyyy-MM-dd'));
      setDayDetail(data);
    } catch (err) {
      console.error('Error detalle día:', err);
      setDayDetail({
        orders: [],
        posSales: [],
        incomes: [],
        abonos: [],
        directPayments: [],
        expenses: [],
        totals: emptyMetrics(),
      });
    } finally {
      setDayLoading(false);
    }
  }, []);

  const openMonthDetail = useCallback(async (monthDate) => {
    setCurrentDate(monthDate);
    setSelectedDay(monthDate);
    setPeriodGranularity('month');
    setPeriodLabel(format(monthDate, 'MMMM yyyy', { locale: es }));
    setDayDetail(null);
    setDayLoading(true);
    try {
      const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');
      const { data } = await getCalendarPeriodDetailRequest(start, end);
      setDayDetail(data);
    } catch (err) {
      console.error('Error detalle mes:', err);
      setDayDetail({
        orders: [],
        posSales: [],
        incomes: [],
        abonos: [],
        directPayments: [],
        expenses: [],
        totals: emptyMetrics(),
      });
    } finally {
      setDayLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!navigateToMonth?.date) return;
    openMonthDetail(navigateToMonth.date);
  }, [navigateToMonth?.requestId, navigateToMonth?.date, openMonthDetail]);

  const handleCloseModal = useCallback(() => {
    setSelectedDay(null);
    setDayDetail(null);
    setDayLoading(false);
    setPeriodGranularity('day');
    setPeriodLabel(null);
  }, []);

  const monthIncomeTotal = useMemo(
    () => roundMoney((monthData.totals.posIncome ?? 0) + (monthData.totals.collected ?? 0)),
    [monthData.totals]
  );

  const now = new Date();
  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: es });

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, position: 'relative', minWidth: 0 }}>
      {monthLoading && (
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
        title="Calendario de pedidos y cobros"
        subtitle={
          isIncomeView
            ? 'Caja y cobros de pedidos por fecha en que entró el dinero (Income). Misma fecha; solo cambia el origen.'
            : 'Pedidos y caja por fecha del pedido; cobros y gastos por fecha en Income/Expense (igual que velas). Clic en un día para detalle.'
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
          <IconButton
            size="small"
            disabled={monthLoading}
            onClick={() => setCurrentDate(addMonths(currentDate, -1))}
            aria-label="Mes anterior"
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography
            variant="subtitle1"
            sx={{ minWidth: 140, textAlign: 'center', fontWeight: 800, textTransform: 'capitalize' }}
          >
            {monthLabel}
          </Typography>
          <IconButton
            size="small"
            disabled={monthLoading}
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            aria-label="Mes siguiente"
          >
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
            Total del mes:{' '}
            <Box component="span" sx={{ fontWeight: 800, color: chartColors.incomeTotal }}>
              {moneyFmt(monthIncomeTotal)}
            </Box>
          </Typography>
        )}
      </Box>

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          mb: 1.5,
          borderColor: alpha(theme.palette.divider, 0.9),
        }}
      >
        <Box
          sx={{
            ...calendarWeekGridSx,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.03),
          }}
        >
          {WEEKDAY_LABELS.map((d) => (
            <Typography
              key={d}
              variant="caption"
              align="center"
              sx={{
                py: 0.75,
                fontWeight: 700,
                color: 'primary.main',
                fontSize: '0.72rem',
                letterSpacing: 0.3,
              }}
            >
              {d}
            </Typography>
          ))}
          <Typography
            variant="caption"
            align="center"
            sx={{
              py: 0.75,
              fontWeight: 700,
              color: 'text.secondary',
              fontSize: '0.68rem',
              borderLeft: '1px solid',
              borderColor: 'divider',
            }}
          >
            Sem
          </Typography>
        </Box>

        {weeks.map((week, weekIndex) => {
          const monthDays = week.filter((d) => isSameMonth(d, currentDate));
          const metricsList = monthDays.map((date) => ({ date, ...getMetrics(date) }));

          const maxOA = isIncomeView ? 1 : Math.max(1, ...metricsList.map((m) => m.ordersAmount));
          const maxOpPos = isIncomeView ? 1 : Math.max(1, ...metricsList.map((m) => m.posSalesAmount));
          const maxCajaIncome = Math.max(1, ...metricsList.map((m) => incomeCajaAmount(m)));
          const maxCA = Math.max(1, ...metricsList.map((m) => incomeCobrosAmount(m)));
          const maxEA = isIncomeView ? 1 : Math.max(1, ...metricsList.map((m) => m.expensesAmount));

          let weekOrdersAmount = 0;
          let weekPosSalesAmount = 0;
          let weekPosIncomeAmount = 0;
          let weekCollectedAmount = 0;
          let weekExpensesAmount = 0;

          const weekCells = week.map((date) => {
            const m = getMetrics(date);
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isToday = isSameDay(date, now);

            if (isCurrentMonth) {
              weekOrdersAmount += m.ordersAmount;
              weekPosSalesAmount += m.posSalesAmount;
              weekPosIncomeAmount += incomeCajaAmount(m);
              weekCollectedAmount += incomeCobrosAmount(m);
              weekExpensesAmount += m.expensesAmount;
            }

            const hasData = isCurrentMonth && (
              isIncomeView
                ? incomeCajaAmount(m) > 0 || incomeCobrosAmount(m) > 0
                : m.ordersCount > 0 ||
                  m.posSalesCount > 0 ||
                  incomeCobrosAmount(m) > 0 ||
                  m.expensesAmount > 0
            );

            const tip = isIncomeView
              ? `${format(date, 'dd/MM/yyyy')}\n` +
                `Caja (entrada del dinero): ${moneyFmt(incomeCajaAmount(m))}\n` +
                `Cobros pedidos: ${moneyFmt(incomeCobrosAmount(m))}\n` +
                `Total ingresos: ${moneyFmt(incomeViewTotal(m))}`
              : `${format(date, 'dd/MM/yyyy')}\n` +
                `Pedidos (fecha pedido): ${m.ordersCount} · ${moneyFmt(m.ordersAmount)}\n` +
                `Caja (fecha pedido): ${m.posSalesCount} · ${moneyFmt(m.posSalesAmount)}\n` +
                `Cobros pedidos (entrada $): ${moneyFmt(incomeCobrosAmount(m))}\n` +
                `Gastos (Expense): ${moneyFmt(m.expensesAmount)}`;

            return (
              <Box
                key={date.toISOString()}
                title={isCurrentMonth ? `${tip}\n\nClic para ver detalle` : tip}
                onClick={isCurrentMonth && !monthLoading ? () => handleDayClick(date) : undefined}
                sx={{
                  minHeight: cellMinHeight,
                  p: 0.65,
                  cursor: isCurrentMonth && !monthLoading ? 'pointer' : 'default',
                  bgcolor: 'background.paper',
                  opacity: isCurrentMonth ? 1 : 0.38,
                  position: 'relative',
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  transition: 'background-color 0.15s ease',
                  ...(isCurrentMonth && !monthLoading && {
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }),
                  ...(hasData && {
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      bgcolor: isIncomeView ? chartColors.collected : chartColors.orderMoney,
                      opacity: 0.85,
                    },
                  }),
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 0.35,
                    ...(isToday && isCurrentMonth && {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                    }),
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      lineHeight: 1,
                      color: isToday && isCurrentMonth ? 'inherit' : isCurrentMonth ? 'text.primary' : 'text.disabled',
                    }}
                  >
                    {format(date, 'd')}
                  </Typography>
                </Box>

                {hasData ? (
                  <Stack spacing={0.1}>
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
                ) : isCurrentMonth ? (
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ display: 'block', textAlign: 'center', py: 0.75, fontSize: '0.65rem' }}
                  >
                    —
                  </Typography>
                ) : null}
              </Box>
            );
          });

          const weekTip = isIncomeView
            ? `Caja: ${moneyFmt(weekPosIncomeAmount)} · Cobros: ${moneyFmt(weekCollectedAmount)} · Total: ${moneyFmt(weekPosIncomeAmount + weekCollectedAmount)}`
            : `Ped: ${moneyFmt(weekOrdersAmount)} · Caja: ${moneyFmt(weekPosSalesAmount)} · Cobros: ${moneyFmt(weekCollectedAmount)} · Gas: ${moneyFmt(weekExpensesAmount)}`;

          return (
            <Box
              key={weekIndex}
              sx={{
                ...calendarWeekGridSx,
                borderBottom: weekIndex < weeks.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              {weekCells}
              <Box
                title={weekTip}
                sx={{
                  p: 0.5,
                  minHeight: cellMinHeight,
                  bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.04 : 0.025),
                  borderLeft: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  justifyContent: 'center',
                  gap: 0.2,
                }}
              >
                {!isIncomeView && (
                  <WeekSummaryAmount value={weekOrdersAmount} color={chartColors.orderMoney} moneyFmtCompact={moneyFmtCompact} />
                )}
                {!isIncomeView && (
                  <WeekSummaryAmount value={weekPosSalesAmount} color={chartColors.posSales} moneyFmtCompact={moneyFmtCompact} />
                )}
                {isIncomeView && (
                  <WeekSummaryAmount value={weekPosIncomeAmount} color={chartColors.posSales} moneyFmtCompact={moneyFmtCompact} />
                )}
                <WeekSummaryAmount value={weekCollectedAmount} color={chartColors.collected} moneyFmtCompact={moneyFmtCompact} />
                {isIncomeView ? (
                  <WeekSummaryAmount
                    value={weekPosIncomeAmount + weekCollectedAmount}
                    color={chartColors.incomeTotal}
                    moneyFmtCompact={moneyFmtCompact}
                  />
                ) : (
                  <WeekSummaryAmount value={weekExpensesAmount} color={chartColors.expense} moneyFmtCompact={moneyFmtCompact} />
                )}
              </Box>
            </Box>
          );
        })}
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 1.5 }, borderRadius: 2 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
          Totales del mes
        </Typography>
        <Grid container spacing={2}>
          {!isIncomeView && (
            <Grid item xs={6} sm={4} md={3}>
              <MonthTotalItem label="Pedidos" value={monthData.totals.orders} color={chartColors.orderMoney} moneyFmt={moneyFmt} />
            </Grid>
          )}
          {!isIncomeView && (
            <Grid item xs={6} sm={4} md={3}>
              <MonthTotalItem label="Caja (fecha pedido)" value={monthData.totals.posSales} color={chartColors.posSales} moneyFmt={moneyFmt} />
            </Grid>
          )}
          {isIncomeView && (
            <Grid item xs={6} sm={4} md={3}>
              <MonthTotalItem label="Caja (entrada del dinero)" value={monthData.totals.posIncome} color={chartColors.posSales} moneyFmt={moneyFmt} />
            </Grid>
          )}
          <Grid item xs={6} sm={4} md={3}>
            <MonthTotalItem
              label={isIncomeView ? 'Cobros pedidos' : 'Ingresos (Income)'}
              value={monthData.totals.collected}
              color={chartColors.collected}
              moneyFmt={moneyFmt}
            />
          </Grid>
          {isIncomeView && (
            <Grid item xs={6} sm={4} md={3}>
              <MonthTotalItem label="Total ingresos" value={monthIncomeTotal} color={chartColors.incomeTotal} moneyFmt={moneyFmt} />
            </Grid>
          )}
          {!isIncomeView && (
            <Grid item xs={6} sm={4} md={3}>
              <MonthTotalItem label="Gastos" value={monthData.totals.expenses} color={chartColors.expense} moneyFmt={moneyFmt} />
            </Grid>
          )}
        </Grid>
      </Paper>

      <CalendarDayDetailDialog
        open={Boolean(selectedDay)}
        date={selectedDay}
        detail={dayDetail}
        loading={dayLoading}
        onClose={handleCloseModal}
        moneyFmt={moneyFmt}
        colors={chartColors}
        viewMode={viewMode}
        periodGranularity={periodGranularity}
        periodLabel={periodLabel}
      />
    </Box>
  );
}
