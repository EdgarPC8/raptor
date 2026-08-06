import { useEffect, useMemo, useState } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import NumbersIcon from '@mui/icons-material/Numbers';
import { getProductSeriesChartsRequest } from '../../../../../api/financeRequest';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { ChartSkeleton } from '../../../../../components/ContentSkeleton.jsx';
import ProductSeriesChart from './ProductSeriesChart';
import ProductSeriesDetailDialog from './ProductSeriesDetailDialog';
import { dashboardPanelSx } from '../dashboardPanelStyles.js';

const paperSx = {
  ...dashboardPanelSx,
};

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
];

const BAND_SIZE = 10;

function bandLabel(band) {
  const from = (band - 1) * BAND_SIZE + 1;
  const to = band * BAND_SIZE;
  return `Del ${from} al ${to}`;
}

export default function ProductChartsPanel() {
  const [period, setPeriod] = useState('month');
  const [band, setBand] = useState(1);
  const [sortBy, setSortBy] = useState('amount');
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState(null);
  const [meta, setMeta] = useState({ totalBands: 1, totalRanked: 0, rankStart: 1, rankEnd: 10 });
  const [detail, setDetail] = useState({ open: false, productId: null, productName: '' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await getProductSeriesChartsRequest(period, band, sortBy);
        if (cancelled) return;
        setSales(data?.sales ?? null);
        setMeta({
          totalBands: data?.totalBands ?? 1,
          totalRanked: data?.totalRanked ?? 0,
          rankStart: data?.rankStart ?? 1,
          rankEnd: data?.rankEnd ?? 10,
        });
      } catch (e) {
        console.error('ProductChartsPanel:', e);
        if (!cancelled) setSales(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, band, sortBy]);

  useEffect(() => {
    if (band > meta.totalBands) setBand(1);
  }, [meta.totalBands, band]);

  const bandOptions = useMemo(() => {
    const count = Math.max(1, meta.totalBands);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [meta.totalBands]);

  const periodLabel = sales?.periodLabel ?? '';
  const rankStart = sales?.rankStart ?? meta.rankStart;
  const rankEnd = sales?.rankEnd ?? meta.rankEnd;
  const sortLabel = sortBy === 'qty' ? 'por cantidad' : 'por ingresos ($)';

  return (
    <Paper variant="panel" sx={{ ...paperSx, overflowX: 'auto' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <ChartBlockHeader
          title="Ingresos por producto"
          subtitle="Cobranzas de productos finales. Por $ / cant. filtra el gráfico. Al hacer clic en un producto ves su historial completo (desde la 1ª venta)."
          sx={{ mb: 0, flex: 1 }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={sortBy}
            onChange={(_, v) => {
              if (v) {
                setSortBy(v);
                setBand(1);
              }
            }}
            aria-label="Ordenar ranking"
          >
            <ToggleButton value="amount" sx={{ textTransform: 'none', px: 1.25 }} title="Ranking por valor monetario">
              <AttachMoneyIcon fontSize="small" sx={{ mr: 0.35 }} />
              Por $
            </ToggleButton>
            <ToggleButton value="qty" sx={{ textTransform: 'none', px: 1.25 }} title="Ranking por cantidad">
              <NumbersIcon fontSize="small" sx={{ mr: 0.35 }} />
              Por cant.
            </ToggleButton>
          </ToggleButtonGroup>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="product-charts-band-label">Rango</InputLabel>
            <Select
              labelId="product-charts-band-label"
              label="Rango"
              value={band}
              onChange={(e) => setBand(Number(e.target.value))}
              disabled={loading || meta.totalRanked === 0}
            >
              {bandOptions.map((b) => (
                <MenuItem key={b} value={b}>
                  {bandLabel(b)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={period}
            onChange={(_, v) => {
              if (v) {
                setPeriod(v);
                setBand(1);
              }
            }}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <ToggleButton key={opt.value} value={opt.value} sx={{ textTransform: 'none', px: 1.5 }}>
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        {loading
          ? 'Cargando…'
          : `${periodLabel} · ranking ${sortLabel} · posiciones ${rankStart}–${rankEnd} · ${meta.totalRanked} productos`}
      </Typography>

      {loading ? (
        <ChartSkeleton height={300} />
      ) : (
        <ProductSeriesChart
          bundle={sales}
          loading={false}
          chartHeight={300}
          showHeader={false}
          sideLegend
          metric={sortBy}
          onProductClick={(item) =>
            setDetail({
              open: true,
              productId: item.id,
              productName: item.name,
            })
          }
        />
      )}

      <ProductSeriesDetailDialog
        open={detail.open}
        onClose={() => setDetail({ open: false, productId: null, productName: '' })}
        productId={detail.productId}
        productName={detail.productName}
      />
    </Paper>
  );
}
