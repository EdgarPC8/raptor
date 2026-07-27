import { Box, Typography, Skeleton, useTheme } from "@mui/material";
import { differenceInCalendarDays, parseISO, isValid } from "date-fns";

function daysUntilExpiry(expiresAt) {
  if (!expiresAt) return null;
  const d = parseISO(String(expiresAt).slice(0, 10));
  if (!isValid(d)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInCalendarDays(d, today);
}

function gaugeMetrics(batch, warnDays = 30) {
  const days = daysUntilExpiry(batch?.expiresAt);
  const warn = Math.max(Number(warnDays) || 30, 1);
  const max = warn;
  // Días restantes clampados: vencido = 0
  const remaining = days == null ? 0 : Math.max(0, Math.min(days, max));
  return {
    days,
    remaining,
    warn,
    max,
    criticalEnd: Math.max(1, Math.round(warn * 0.15)),
    warningEnd: Math.max(2, Math.round(warn * 0.5)),
    goodEnd: warn,
  };
}

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

function expiryStatus(days) {
  if (days == null) return "critical";
  if (days < 0) return "critical";
  if (days === 0) return "critical";
  if (days <= 7) return "warning";
  if (days <= 15) return "caution";
  return "good";
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

export default function BatchExpiryGauge({ batch, warnDays = 30, compact = false }) {
  const theme = useTheme();
  const { days, remaining, max, criticalEnd, warningEnd, goodEnd } = gaugeMetrics(
    batch,
    warnDays,
  );
  const status = expiryStatus(days);

  const cx = 100;
  const cy = 108;
  const rOuter = compact ? 76 : 80;
  const rInner = compact ? 58 : 62;

  const zoneColor = {
    critical: theme.palette.error.main,
    warning: theme.palette.warning.main,
    good: theme.palette.success.main,
    muted: theme.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
  };

  const zones = [
    { from: 0, to: criticalEnd, color: zoneColor.critical },
    { from: criticalEnd, to: warningEnd, color: zoneColor.warning },
    { from: warningEnd, to: goodEnd, color: zoneColor.good },
    { from: goodEnd, to: max, color: zoneColor.muted },
  ];

  const needleEnd = pointOnArc(cx, cy, (rInner + rOuter) / 2, remaining, max);
  const title = compact
    ? truncateName(batch?.productName, 14)
    : batch?.productName || "Lote";

  const statusColor =
    status === "critical"
      ? theme.palette.error.main
      : status === "warning" || status === "caution"
        ? theme.palette.warning.main
        : theme.palette.success.main;

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
        title={`${batch?.productName}${batch?.code ? ` · ${batch.code}` : ""} · vence ${batch?.expiresAt || "—"}`}
      >
        {title}
        {compact ? ` · ${formatDaysLabel(days)}` : ""}
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
        <path d={ringSegment(cx, cy, rInner, rOuter, 0, max, max)} fill={zoneColor.muted} />
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
        {String(batch?.expiresAt || "").slice(0, 10) || "—"}
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
