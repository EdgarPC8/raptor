import * as React from 'react';
import { Box, Grid, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { LineChart } from '@mui/x-charts/LineChart';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { getChartSeriesColors } from '../../../../../theme/chartPalette';

const moneyFmt = (v) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(
    Number(v ?? 0)
  );

const qtyFmt = (v) =>
  new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 }).format(Number(v ?? 0));

function rowAmountSum(row, products) {
  let sum = 0;
  for (const { id } of products) {
    const v = row[String(id)];
    if (typeof v === 'number' && !Number.isNaN(v)) sum += v;
  }
  return sum;
}

function formatXLabel(date, granularity) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  if (granularity === 'month') {
    return d.toLocaleDateString('es-EC', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
}

/** Acepta "yyyy-MM-dd" (día) o "yyyy-MM" (mes del modo Año). */
function parseSeriesPointDate(dateKey) {
  const raw = String(dateKey || '').trim();
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split('-').map(Number);
    return new Date(y, m - 1, 1, 12, 0, 0);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return new Date(`${raw.slice(0, 10)}T12:00:00`);
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ProductLegendList({ products, paletteColors, metric = 'amount', onProductClick }) {
  if (!products.length) return null;
  const clickable = typeof onProductClick === 'function';

  return (
    <Stack
      spacing={1}
      sx={{
        py: 0.5,
        pr: { xs: 0, md: 1 },
        maxHeight: { xs: 200, md: 320 },
        overflowY: 'auto',
      }}
    >
      {products.map((item, index) => {
        const color = paletteColors[index % paletteColors.length];
        return (
          <Stack
            key={item.id}
            direction="row"
            spacing={1}
            alignItems="flex-start"
            onClick={clickable ? () => onProductClick(item) : undefined}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onProductClick(item);
                    }
                  }
                : undefined
            }
            sx={{
              minWidth: 0,
              borderRadius: 1,
              px: 0.5,
              py: 0.35,
              cursor: clickable ? 'pointer' : 'default',
              '&:hover': clickable
                ? { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) }
                : undefined,
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: 0.5,
                bgcolor: color,
                flexShrink: 0,
                mt: 0.35,
                boxShadow: `0 0 0 1px ${alpha(color, 0.4)}`,
              }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }} title={item.name}>
                {item.rank != null ? `#${item.rank} ` : ''}
                {item.name}
              </Typography>
              {(item.totalAmt > 0 || item.totalQty > 0) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                  {metric === 'qty'
                    ? `${qtyFmt(item.totalQty)} u · ${moneyFmt(item.totalAmt)}`
                    : `${moneyFmt(item.totalAmt)}${item.totalQty > 0 ? ` · ${qtyFmt(item.totalQty)} u` : ''}`}
                </Typography>
              )}
              {clickable ? (
                <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 0.15 }}>
                  Ver detalle
                </Typography>
              ) : null}
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

export default function ProductSeriesChart({
  title,
  subtitle = '',
  bundle = null,
  loading = false,
  chartHeight = 250,
  showHeader = true,
  sideLegend = false,
  metric = 'amount',
  onProductClick,
}) {
  const theme = useTheme();
  const products = bundle?.products ?? [];
  const granularity = bundle?.granularity ?? 'day';
  const useQty = metric === 'qty';

  const paletteColors = React.useMemo(() => getChartSeriesColors(theme), [theme]);
  const axisStroke = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.28)';
  const tickFill = theme.palette.text.secondary;

  const { preparedData, secondaryByIndex } = React.useMemo(() => {
    const amountRows = bundle?.datasetAmount ?? [];
    const qtyRows = bundle?.dataset ?? [];
    const primaryRows = useQty ? qtyRows : amountRows;
    const secondaryRows = useQty ? amountRows : qtyRows;
    const secondaryByDate = new Map(secondaryRows.map((r) => [r.date, r]));
    const secondaryIndex = [];
    const rows = [];

    for (const point of primaryRows) {
      const secondaryPoint = secondaryByDate.get(point.date) || {};
      const parsed = parseSeriesPointDate(point.date);
      if (!parsed) continue;
      const newPoint = { date: parsed };
      const secondarySlice = {};

      for (const { id } of products) {
        const k = String(id);
        const val = point[k];
        newPoint[k] = typeof val === 'number' && !Number.isNaN(val) && val !== 0 ? val : null;
        secondarySlice[k] = Number(secondaryPoint[k] ?? 0);
      }

      if (rowAmountSum(newPoint, products) <= 0) continue;
      secondaryIndex.push(secondarySlice);
      rows.push(newPoint);
    }

    return { preparedData: rows, secondaryByIndex: secondaryIndex };
  }, [bundle, products, useQty]);

  const yFormatter = React.useCallback(
    (v) => {
      if (v == null || Number.isNaN(v) || v === 0) return '—';
      return useQty ? `${qtyFmt(v)} u` : moneyFmt(v);
    },
    [useQty],
  );

  const series = React.useMemo(
    () =>
      products.map((item, index) => {
        const base = paletteColors[index % paletteColors.length];
        return {
          id: String(item.id),
          label: item.rank != null ? `#${item.rank} ${item.name}` : item.name,
          dataKey: String(item.id),
          area: true,
          showMark: false,
          color: base,
          curve: 'monotoneX',
          connectNulls: true,
          valueFormatter: (v) => yFormatter(v),
        };
      }),
    [products, paletteColors, yFormatter]
  );

  const tooltipRenderer = React.useCallback(
    (params) => {
      if (!params?.series?.length) return '';
      const dataIndex = params.series[0]?.dataIndex ?? 0;
      const row = preparedData[dataIndex];
      if (!row) return '';
      const dateStr =
        granularity === 'month'
          ? format(row.date, 'MMMM yyyy', { locale: es })
          : format(row.date, "EEEE, d 'de' MMMM yyyy", { locale: es });
      const secondarySlice = secondaryByIndex[dataIndex] || {};

      const lines = params.series
        .map((s, i) => {
          const id = s.id;
          const primary = s.data?.[dataIndex];
          if (primary == null || Number.isNaN(primary)) return '';
          const secondary = secondarySlice[id] ?? 0;
          const color = paletteColors[i % paletteColors.length];
          const primaryLine = useQty ? `${qtyFmt(primary)} u` : moneyFmt(primary);
          const secondaryLine = useQty
            ? moneyFmt(secondary)
            : `Cant. ${qtyFmt(secondary)}`;
          return `
            <div style="display:flex;align-items:flex-start;gap:8px;margin:4px 0;">
              <span style="width:10px;height:10px;border-radius:2px;background:${color};margin-top:4px;flex-shrink:0;"></span>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;">${s.label}</div>
                <div style="font-size:12px;opacity:0.9;">${primaryLine} · ${secondaryLine}</div>
              </div>
            </div>`;
        })
        .join('');

      return `<div style="padding:10px 12px;max-width:280px;"><div style="font-weight:700;margin-bottom:6px;">${dateStr}</div>${lines}</div>`;
    },
    [preparedData, secondaryByIndex, paletteColors, granularity, useQty]
  );

  const periodHint = bundle?.periodLabel ? `${bundle.periodLabel}. ` : '';

  const chartBlock = (
    <>
      {loading ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          Cargando…
        </Typography>
      ) : products.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No hay productos en este rango del ranking para el período.
        </Typography>
      ) : preparedData.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          Estos productos no tienen movimiento en las fechas del período.
        </Typography>
      ) : (
        <LineChart
          dataset={preparedData}
          xAxis={[
            {
              id: 'time',
              dataKey: 'date',
              scaleType: 'time',
              valueFormatter: (date) => formatXLabel(date, granularity),
              tickLabelStyle: { fill: tickFill },
            },
          ]}
          yAxis={[
            {
              width: 72,
              tickLabelStyle: { fill: tickFill },
              valueFormatter: yFormatter,
            },
          ]}
          series={series}
          height={chartHeight}
          experimentalFeatures={{ preferStrictDomainInLineCharts: true }}
          margin={{ left: 4, right: 8, top: 8, bottom: 24 }}
          slotProps={{
            axisLine: { stroke: axisStroke },
            axisTick: { stroke: axisStroke },
            legend: { hidden: true },
            tooltip: {
              trigger: 'axis',
              renderer: tooltipRenderer,
            },
          }}
          sx={{
            '& .MuiAreaElement-root': {
              fillOpacity: theme.palette.mode === 'dark' ? 0.14 : 0.18,
            },
            '& .MuiLineElement-root': {
              strokeWidth: 2.5,
              strokeOpacity: 1,
              filter: `drop-shadow(0 0 1px ${alpha(theme.palette.common.black, 0.15)})`,
            },
          }}
        />
      )}
    </>
  );

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      {showHeader && (
        <ChartBlockHeader
          title={title}
          subtitle={`${periodHint}${subtitle} Pasa el mouse sobre un día para ver importe y cantidad.`}
        />
      )}

      {sideLegend ? (
        <Grid container spacing={{ xs: 1.5, md: 2 }} alignItems="stretch">
          <Grid item xs={12} md={3.5} lg={3} sx={{ minWidth: 0 }}>
            {loading ? (
              <Typography variant="body2" color="text.secondary">
                Cargando…
              </Typography>
            ) : (
              <ProductLegendList
                products={products}
                paletteColors={paletteColors}
                metric={metric}
                onProductClick={onProductClick}
              />
            )}
          </Grid>
          <Grid item xs={12} md={8.5} lg={9} sx={{ minWidth: 0 }}>
            {chartBlock}
          </Grid>
        </Grid>
      ) : (
        chartBlock
      )}
    </Box>
  );
}
