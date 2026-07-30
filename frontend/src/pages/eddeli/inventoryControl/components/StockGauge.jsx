import { Box, Typography, Skeleton, useTheme } from '@mui/material';

/**
 * Bandas respecto al mínimo M:
 * rojo 0–M · naranja M–1.5M · amarillo 1.5M–2M · verde >2M
 */
export function classifyStockLevel(stockRaw, minRaw) {
  const stock = Number(stockRaw ?? 0);
  const min = Number(minRaw ?? 0);
  if (stock <= 0) return 'critical';
  if (!(min > 0)) return 'good';
  if (stock <= min) return 'critical';
  if (stock <= min * 1.5) return 'orange';
  if (stock <= min * 2) return 'yellow';
  return 'good';
}

function gaugeMetrics(product) {
  const stock = Number(product?.stock ?? 0);
  const minRaw = Number(product?.minStock ?? 0);
  const min = Math.max(minRaw, 0.001);
  const max = Math.max(min * 2.5, stock * 1.15, min + 1);
  return {
    stock,
    min,
    minRaw,
    max,
    redEnd: min,
    orangeEnd: min * 1.5,
    yellowEnd: min * 2,
  };
}

/** 0 a la izquierda, máximo a la derecha (arco superior). */
function valueToAngle(value, max) {
  const ratio = Math.min(Math.max(value / max, 0), 1);
  return Math.PI * (1 - ratio);
}

function pointOnArc(cx, cy, radius, value, max) {
  const angle = valueToAngle(value, max);
  return {
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  };
}

/** Segmento de anillo (arco relleno y redondeado en los extremos). */
function ringSegment(cx, cy, rInner, rOuter, v0, v1, max) {
  if (v1 <= v0) return '';
  const p0out = pointOnArc(cx, cy, rOuter, v0, max);
  const p1out = pointOnArc(cx, cy, rOuter, v1, max);
  const p1in = pointOnArc(cx, cy, rInner, v1, max);
  const p0in = pointOnArc(cx, cy, rInner, v0, max);
  return [
    `M ${p0out.x} ${p0out.y}`,
    `A ${rOuter} ${rOuter} 0 0 1 ${p1out.x} ${p1out.y}`,
    `L ${p1in.x} ${p1in.y}`,
    `A ${rInner} ${rInner} 0 0 0 ${p0in.x} ${p0in.y}`,
    'Z',
  ].join(' ');
}

const STATUS_LABEL = {
  critical: 'Crítico',
  orange: 'Bajo',
  yellow: 'Precaución',
  good: 'Adecuado',
};

export function getStockStatus(product) {
  const stock = Number(product?.stock ?? 0);
  const min = Number(product?.minStock ?? 0);
  return classifyStockLevel(stock, min);
}

export default function StockGauge({ product, compact = false }) {
  const theme = useTheme();
  const { stock, min, max, redEnd, orangeEnd, yellowEnd } = gaugeMetrics(product);
  const status = classifyStockLevel(stock, Number(product?.minStock ?? 0));

  const cx = 100;
  const cy = 108;
  const rOuter = compact ? 76 : 80;
  const rInner = compact ? 58 : 62;

  const zoneColor = {
    critical: theme.palette.error.main,
    orange: '#ed6c02',
    yellow: '#f9a825',
    good: theme.palette.success.main,
    muted: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
  };

  const zones = [
    { from: 0, to: redEnd, color: zoneColor.critical },
    { from: redEnd, to: orangeEnd, color: zoneColor.orange },
    { from: orangeEnd, to: yellowEnd, color: zoneColor.yellow },
    { from: yellowEnd, to: max, color: zoneColor.good },
  ];

  const needleEnd = pointOnArc(cx, cy, (rInner + rOuter) / 2, stock, max);
  const allTicks = [
    { value: 0, label: '0' },
    { value: redEnd, label: formatTick(redEnd) },
    { value: orangeEnd, label: formatTick(orangeEnd) },
    { value: yellowEnd, label: formatTick(yellowEnd) },
    { value: max, label: formatTick(max) },
  ];
  const ticks = compact
    ? [
        { value: 0, label: '0' },
        { value: redEnd, label: formatTick(redEnd) },
        { value: max, label: formatTick(max) },
      ]
    : allTicks;

  const title = compact
    ? truncateName(product?.name, 14)
    : `${product?.name} (Stock: ${formatTick(stock)})`;

  const statusColor =
    status === 'critical'
      ? zoneColor.critical
      : status === 'orange'
        ? zoneColor.orange
        : status === 'yellow'
          ? zoneColor.yellow
          : zoneColor.good;

  return (
    <Box sx={{ textAlign: 'center', minWidth: 0, width: '100%' }}>
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.primary"
        sx={{
          display: 'block',
          mb: 0.25,
          px: 0.25,
          lineHeight: 1.2,
          fontSize: compact ? '0.65rem' : undefined,
        }}
        noWrap
        title={`${product?.name} (Stock: ${stock})`}
      >
        {title}
        {compact ? ` · ${formatTick(stock)}` : ''}
      </Typography>

      <Box
        component="svg"
        viewBox="0 0 200 124"
        sx={{
          width: '100%',
          maxWidth: compact ? 132 : 270,
          mx: 'auto',
          display: 'block',
        }}
        aria-label={`Stock ${stock} de ${product?.name}`}
      >
        <path
          d={ringSegment(cx, cy, rInner, rOuter, 0, max, max)}
          fill={zoneColor.muted}
        />

        {zones.map((z) => {
          if (z.to <= z.from) return null;
          return (
            <path
              key={`${z.from}-${z.to}`}
              d={ringSegment(cx, cy, rInner, rOuter, z.from, z.to, max)}
              fill={z.color}
            />
          );
        })}

        {ticks.map((t) => {
          const p = pointOnArc(cx, cy, rOuter + (compact ? 4 : 6), t.value, max);
          const lp = pointOnArc(cx, cy, rOuter + (compact ? 10 : 14), t.value, max);
          const anchor = t.value <= max * 0.15 ? 'start' : t.value >= max * 0.85 ? 'end' : 'middle';
          return (
            <g key={t.value}>
              {!compact && (
                <line
                  x1={p.x}
                  y1={p.y}
                  x2={lp.x}
                  y2={lp.y}
                  stroke={theme.palette.text.disabled}
                  strokeWidth={1}
                />
              )}
              <text
                x={lp.x}
                y={lp.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={compact ? 7 : 9}
                fill={theme.palette.text.secondary}
              >
                {t.label}
              </text>
            </g>
          );
        })}

        <line
          x1={cx}
          y1={cy}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={theme.palette.text.primary}
          strokeWidth={compact ? 2 : 2.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={compact ? 4 : 5} fill={theme.palette.text.primary} />
        <circle cx={cx} cy={cy} r={compact ? 2 : 2.5} fill={theme.palette.background.paper} />
      </Box>

      <Typography
        variant="caption"
        sx={{
          color: statusColor,
          fontWeight: 600,
          fontSize: compact ? '0.6rem' : undefined,
          lineHeight: 1.2,
        }}
      >
        {compact ? formatTick(min) : `${STATUS_LABEL[status]} · mín. ${formatTick(min)}`}
      </Typography>
    </Box>
  );
}

function formatTick(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  if (Math.abs(v - Math.round(v)) < 0.001) return String(Math.round(v));
  return v.toFixed(1);
}

function truncateName(name, max = 14) {
  const s = String(name || '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Placeholder cuando no hay producto para llenar el slot del grid 4×2. */
export function StockGaugeSkeleton({ compact = true }) {
  const arcW = compact ? 100 : 120;
  const arcH = compact ? 52 : 58;
  return (
    <Box sx={{ textAlign: 'center', minWidth: 0, width: '100%', py: 0.25 }}>
      <Skeleton
        variant="text"
        width="72%"
        height={compact ? 14 : 18}
        sx={{ mx: 'auto', mb: 0.35, borderRadius: 1 }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.35 }}>
        <Skeleton
          variant="rounded"
          width={arcW}
          height={arcH}
          sx={{
            borderRadius: `${arcW}px ${arcW}px 4px 4px`,
            opacity: 0.35,
          }}
        />
      </Box>
      <Skeleton
        variant="text"
        width="40%"
        height={compact ? 12 : 14}
        sx={{ mx: 'auto', borderRadius: 1 }}
      />
    </Box>
  );
}
