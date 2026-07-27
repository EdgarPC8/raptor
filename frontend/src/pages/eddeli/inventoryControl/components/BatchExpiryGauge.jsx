import { Box, Typography, Skeleton, useTheme } from "@mui/material";
import { differenceInCalendarDays, parseISO, isValid } from "date-fns";

function parseDay(raw) {
  if (!raw) return null;
  const d = parseISO(String(raw).slice(0, 10));
  return isValid(d) ? d : null;
}

function todayStart() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/**
 * Vida útil = elaboración→vencimiento, o si no hay elaboración → recepción→vencimiento.
 * Se divide en 4 partes iguales (gris / verde / amarillo / rojo al acercarse al vencimiento).
 */
export function batchLifeMetrics(batch) {
  const expires = parseDay(batch?.expiresAt);
  if (!expires) {
    return {
      daysRemaining: null,
      lifeDays: 0,
      max: 1,
      remaining: 0,
      q1: 0.25,
      q2: 0.5,
      q3: 0.75,
      status: "critical",
      startLabel: null,
    };
  }

  const manufactured = parseDay(batch?.manufacturedAt);
  const received = parseDay(batch?.receivedAt);
  const start = manufactured || received || todayStart();
  const startLabel = manufactured ? "elaboración" : received ? "recepción" : "hoy";

  let lifeDays = differenceInCalendarDays(expires, start);
  if (!Number.isFinite(lifeDays) || lifeDays < 1) lifeDays = 1;

  const daysRemaining = differenceInCalendarDays(expires, todayStart());
  const max = lifeDays;
  const remaining = daysRemaining == null ? 0 : Math.max(0, Math.min(daysRemaining, max));

  const q = lifeDays / 4;
  const q1 = q;
  const q2 = q * 2;
  const q3 = q * 3;

  let status = "fresh"; // gris
  if (daysRemaining == null || daysRemaining < 0 || daysRemaining === 0) status = "critical";
  else if (daysRemaining <= q1) status = "critical"; // rojo
  else if (daysRemaining <= q2) status = "warning"; // amarillo
  else if (daysRemaining <= q3) status = "good"; // verde
  else status = "fresh"; // gris

  return {
    daysRemaining,
    lifeDays,
    max,
    remaining,
    q1,
    q2,
    q3,
    status,
    startLabel,
  };
}

function valueToAngle(value, max) {
  const ratio = Math.min(Math.max(value / Math.max(max, 0.0001), 0), 1);
  return Math.PI * (1 - ratio);
}

function pointOnArc(cx, cy, radius, value, max) {
  const angle = valueToAngle(value, max);
  return {
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  };
}

function ringSegment(cx, cy, rInner, rOuter, v0, v1, max) {
  if (v1 <= v0) return "";
  const p0out = pointOnArc(cx, cy, rOuter, v0, max);
  const p1out = pointOnArc(cx, cy, rOuter, v1, max);
  const p1in = pointOnArc(cx, cy, rInner, v1, max);
  const p0in = pointOnArc(cx, cy, rInner, v0, max);
  return [
    `M ${p0out.x} ${p0out.y}`,
    `A ${rOuter} ${rOuter} 0 0 1 ${p1out.x} ${p1out.y}`,
    `L ${p1in.x} ${p1in.y}`,
    `A ${rInner} ${rInner} 0 0 0 ${p0in.x} ${p0in.y}`,
    "Z",
  ].join(" ");
}

function formatDaysLabel(days) {
  if (days == null) return "—";
  if (days < 0) return `${Math.abs(days)}d venc.`;
  if (days === 0) return "Hoy";
  return `${days}d`;
}

function truncateName(name, max = 14) {
  const s = String(name || "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export default function BatchExpiryGauge({ batch, compact = false }) {
  const theme = useTheme();
  const { daysRemaining, remaining, max, q1, q2, q3, status, lifeDays, startLabel } =
    batchLifeMetrics(batch);

  const cx = 100;
  const cy = 108;
  const rOuter = compact ? 76 : 80;
  const rInner = compact ? 58 : 62;

  const zoneColor = {
    critical: theme.palette.error.main,
    warning: theme.palette.warning.main,
    good: theme.palette.success.main,
    fresh: theme.palette.mode === "dark" ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)",
    track: theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
  };

  // Izquierda (0 días) = rojo … derecha (vida completa) = gris
  const zones = [
    { from: 0, to: q1, color: zoneColor.critical },
    { from: q1, to: q2, color: zoneColor.warning },
    { from: q2, to: q3, color: zoneColor.good },
    { from: q3, to: max, color: zoneColor.fresh },
  ];

  const needleEnd = pointOnArc(cx, cy, (rInner + rOuter) / 2, remaining, max);
  const title = compact
    ? truncateName(batch?.productName, 14)
    : batch?.productName || "Lote";

  const statusColor =
    status === "critical"
      ? zoneColor.critical
      : status === "warning"
        ? zoneColor.warning
        : status === "good"
          ? zoneColor.good
          : theme.palette.text.secondary;

  const statusText =
    status === "critical"
      ? "Crítico"
      : status === "warning"
        ? "Por vencer"
        : status === "good"
          ? "Aceptable"
          : "Fresco";

  return (
    <Box sx={{ textAlign: "center", minWidth: 0, width: "100%" }}>
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.primary"
        sx={{
          display: "block",
          mb: 0.25,
          px: 0.25,
          lineHeight: 1.2,
          fontSize: compact ? "0.65rem" : undefined,
        }}
        noWrap
        title={`${batch?.productName}${batch?.code ? ` · ${batch.code}` : ""} · vence ${batch?.expiresAt || "—"} · vida ${lifeDays}d (${startLabel || "—"})`}
      >
        {title}
        {compact ? ` · ${formatDaysLabel(daysRemaining)}` : ""}
      </Typography>

      <Box
        component="svg"
        viewBox="0 0 200 124"
        sx={{
          width: "100%",
          maxWidth: compact ? 132 : 270,
          mx: "auto",
          display: "block",
        }}
        aria-label={`Vencimiento ${batch?.expiresAt} de ${batch?.productName}`}
      >
        <path d={ringSegment(cx, cy, rInner, rOuter, 0, max, max)} fill={zoneColor.track} />
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
          fontSize: compact ? "0.6rem" : undefined,
          lineHeight: 1.2,
        }}
      >
        {compact
          ? String(batch?.expiresAt || "").slice(0, 10) || "—"
          : `${statusText} · ${formatDaysLabel(daysRemaining)}`}
      </Typography>
    </Box>
  );
}

export function BatchExpiryGaugeSkeleton({ compact = true }) {
  const arcW = compact ? 100 : 120;
  const arcH = compact ? 52 : 58;
  return (
    <Box sx={{ textAlign: "center", minWidth: 0, width: "100%", py: 0.25 }}>
      <Skeleton
        variant="text"
        width="72%"
        height={compact ? 14 : 18}
        sx={{ mx: "auto", mb: 0.35, borderRadius: 1 }}
      />
      <Box sx={{ display: "flex", justifyContent: "center", mb: 0.35 }}>
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
        sx={{ mx: "auto", borderRadius: 1 }}
      />
    </Box>
  );
}
