import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PaymentsIcon from "@mui/icons-material/Payments";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import EditIcon from "@mui/icons-material/Edit";
import {
  addMonths,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { money } from "../collections/helpers.js";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_CELL_RADIUS = "12px";
const calendarGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 1,
};

function chunkWeeks(days) {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function parseMonthKey(monthKey) {
  const [y, m] = String(monthKey || "").split("-").map(Number);
  if (!y || !m) return startOfMonth(new Date());
  return new Date(y, m - 1, 1);
}

/** Día civil local, sin correr la fecha por la hora UTC. */
function toLocalDay(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m && !value.includes("T") && !value.includes(":")) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    const parsed = parseISO(value.includes("T") ? value : value.replace(" ", "T"));
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isPaidLate(row) {
  if (row?.status !== "paid") return false;
  const due = toLocalDay(row.dueDate);
  const paid = toLocalDay(row.paidDate);
  if (!due || !paid) return false;
  return paid.getTime() > due.getTime();
}

function formatDayLabel(value) {
  const d = toLocalDay(value);
  if (!d) return "—";
  return format(d, "d MMM yyyy", { locale: es });
}

function eventsOnDate(occurrences, date) {
  const due = [];
  const paidHere = [];
  for (const row of occurrences || []) {
    const dueDay = toLocalDay(row.dueDate);
    const paidDay = row.status === "paid" ? toLocalDay(row.paidDate) : null;
    if (dueDay && isSameDay(dueDay, date)) due.push(row);
    if (paidDay && dueDay && !isSameDay(paidDay, dueDay) && isSameDay(paidDay, date)) {
      paidHere.push(row);
    }
  }
  return { due, paidHere };
}

function dayTone(due, paidHere) {
  const overdue = due.filter((row) => row.status === "pending" && (row.isOverdue || daysPast(row)));
  const pending = due.filter((row) => row.status === "pending" && !overdue.includes(row));
  const latePaid = due.filter((row) => isPaidLate(row));
  const paid = due.filter((row) => row.status === "paid" && !isPaidLate(row));
  if (overdue.length) return "overdue";
  if (pending.length) return "pending";
  if (paidHere.length || latePaid.length) return "late";
  if (paid.length) return "paid";
  if (due.some((row) => row.status === "skipped")) return "skipped";
  return null;
}

function daysPast(row) {
  const due = toLocalDay(row.dueDate);
  if (!due || row.status !== "pending") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function dayLabel(due, paidHere) {
  const overdue = due.filter((row) => row.status === "pending" && (row.isOverdue || daysPast(row))).length;
  const pending = due.filter((row) => row.status === "pending").length - overdue;
  const parts = [];
  if (overdue) parts.push(`${overdue} vencido${overdue === 1 ? "" : "s"}`);
  if (pending) parts.push(`${pending} por pagar`);
  if (paidHere.length) parts.push(paidHere.length === 1 ? "pagaste aquí" : `${paidHere.length} pagos`);
  const late = due.filter(isPaidLate).length;
  if (late && !paidHere.length) parts.push(late === 1 ? "pagado tarde" : `${late} pagados tarde`);
  const onTime = due.filter((row) => row.status === "paid" && !isPaidLate(row)).length;
  if (onTime && !parts.length) parts.push(onTime === 1 ? "pagado" : `${onTime} pagados`);
  const skipped = due.filter((row) => row.status === "skipped").length;
  if (skipped && !parts.length) parts.push(skipped === 1 ? "omitido" : `${skipped} omitidos`);
  return parts.join(" · ");
}

const TONE = {
  overdue: { color: "#D32F2F", label: "Vencido, sin pagar" },
  pending: { color: "#FF6D00", label: "Por pagar" },
  late: { color: "#2E7D32", label: "Pagado después del día" },
  paid: { color: "#2E7D32", label: "Pagado" },
  skipped: { color: "#757575", label: "Omitido" },
};

export default function RecurringExpensesCalendar({
  monthKey,
  onMonthChange,
  occurrences = [],
  loading = false,
  onPay,
  onSkip,
  onRestore,
  onAdjustAmount,
}) {
  const theme = useTheme();
  const currentDate = useMemo(() => parseMonthKey(monthKey), [monthKey]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), {
      weekStartsOn: 1,
    });
    return chunkWeeks(eachDayOfInterval({ start, end }));
  }, [currentDate]);

  const shiftMonth = (delta) => {
    const next = addMonths(currentDate, delta);
    onMonthChange?.(format(next, "yyyy-MM"));
    setSelectedDate(next);
  };

  const goToday = () => {
    const now = new Date();
    onMonthChange?.(format(now, "yyyy-MM"));
    setSelectedDate(now);
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.25 }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton size="small" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
            <ChevronLeftIcon />
          </IconButton>
          <Typography
            variant="subtitle1"
            sx={{ minWidth: 160, textAlign: "center", textTransform: "capitalize", fontWeight: 800 }}
          >
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </Typography>
          <IconButton size="small" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
            <ChevronRightIcon />
          </IconButton>
          <Tooltip title="Ir a hoy">
            <Button
              size="small"
              variant="text"
              startIcon={<TodayIcon sx={{ fontSize: "1rem !important" }} />}
              onClick={goToday}
              sx={{ ml: 0.5, minWidth: 0, px: 1, fontSize: "0.75rem", fontWeight: 600 }}
            >
              Hoy
            </Button>
          </Tooltip>
          {loading ? <CircularProgress size={16} sx={{ ml: 0.5 }} /> : null}
        </Stack>
      </Stack>

      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.5} sx={{ mb: 1.25, alignItems: "center" }}>
        {Object.entries(TONE).map(([key, item]) => (
          <Stack key={key} direction="row" alignItems="center" spacing={0.6}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: item.color, flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
              {item.label}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 0.75, sm: 1 }, borderColor: alpha(theme.palette.divider, 0.9) }}>
        <Box
          sx={{
            ...calendarGridSx,
            gap: 0,
            mb: 0.75,
            pb: 0.75,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.06 : 0.03),
            borderRadius: 1.5,
            px: 0.5,
          }}
        >
          {WEEKDAY_LABELS.map((day) => (
            <Typography
              key={day}
              variant="caption"
              align="center"
              sx={{ py: 0.85, fontWeight: 700, color: "primary.main", fontSize: "0.72rem" }}
            >
              {day}
            </Typography>
          ))}
        </Box>

        {weeks.map((week, weekIndex) => {
          const open = selectedDate && week.some((day) => isSameDay(day, selectedDate));
          return (
            <Box key={weekIndex}>
              <Box sx={{ ...calendarGridSx, mb: 0.75 }}>
                {week.map((date) => {
                  const { due, paidHere } = eventsOnDate(occurrences, date);
                  const tone = dayTone(due, paidHere);
                  const color = tone ? TONE[tone].color : null;
                  const labelColor = [...due, ...paidHere].find((row) => row.labelColor)?.labelColor || null;
                  const barColor = labelColor || color;
                  const label = dayLabel(due, paidHere);
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const isToday = isSameDay(date, new Date());
                  const isOut = !isSameMonth(date, currentDate);
                  const hasItems = due.length > 0 || paidHere.length > 0;
                  return (
                    <Paper
                      key={date.toISOString()}
                      variant="outlined"
                      elevation={0}
                      onClick={() => setSelectedDate(date)}
                      sx={{
                        minHeight: { xs: 72, sm: 88 },
                        p: 1,
                        cursor: "pointer",
                        opacity: isOut ? 0.4 : 1,
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: DAY_CELL_RADIUS,
                        overflow: "hidden",
                        ...(isSelected && {
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          borderWidth: 2,
                          borderColor: "primary.main",
                        }),
                        ...(hasItems && barColor && {
                          "&::before": {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 4,
                            bgcolor: barColor,
                          },
                        }),
                      }}
                    >
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          ...(isToday && { bgcolor: "primary.main", color: "primary.contrastText" }),
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 800, fontSize: "0.8125rem", lineHeight: 1 }}>
                          {format(date, "d")}
                        </Typography>
                      </Box>
                      {hasItems ? (
                        <Typography
                          variant="caption"
                          noWrap
                          title={label}
                          sx={{
                            mt: "auto",
                            width: "100%",
                            px: 0.65,
                            py: 0.3,
                            borderRadius: "10px",
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            textAlign: "center",
                            color: color || "text.secondary",
                            bgcolor: alpha(color || theme.palette.text.primary, theme.palette.mode === "dark" ? 0.18 : 0.1),
                          }}
                        >
                          {label}
                        </Typography>
                      ) : null}
                    </Paper>
                  );
                })}
              </Box>

              <Collapse in={open} timeout="auto" unmountOnExit>
                <DayDetail
                  date={selectedDate}
                  occurrences={occurrences}
                  onPay={onPay}
                  onSkip={onSkip}
                  onRestore={onRestore}
                  onAdjustAmount={onAdjustAmount}
                />
              </Collapse>
            </Box>
          );
        })}
      </Paper>
    </Box>
  );
}

function DayDetail({ date, occurrences, onPay, onSkip, onRestore, onAdjustAmount }) {
  const theme = useTheme();
  if (!date) return null;
  const { due, paidHere } = eventsOnDate(occurrences, date);
  const empty = due.length === 0 && paidHere.length === 0;

  return (
    <Box
      sx={{
        mx: 0.25,
        mb: 0.75,
        px: { xs: 1, sm: 1.25 },
        py: 1.25,
        bgcolor: alpha(theme.palette.primary.main, 0.03),
        border: "1px solid",
        borderColor: alpha(theme.palette.primary.main, 0.22),
        borderRadius: 2,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
        <CalendarTodayIcon color="primary" fontSize="small" />
        <Typography variant="subtitle1" fontWeight={800} sx={{ textTransform: "capitalize" }}>
          {format(date, "EEEE d 'de' MMMM", { locale: es })}
        </Typography>
      </Stack>

      {empty ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: "center" }}>
          No hay pagos este día.
        </Typography>
      ) : null}

      <Stack spacing={1}>
        {due.map((row) => (
          <DueCard
            key={`due-${row.id}`}
            row={row}
            onPay={onPay}
            onSkip={onSkip}
            onRestore={onRestore}
            onAdjustAmount={onAdjustAmount}
          />
        ))}
        {paidHere.map((row) => (
          <Paper key={`paid-${row.id}`} variant="outlined" sx={{ p: 1.25, borderRadius: 2, borderColor: TONE.late.color }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip size="small" label="Pagaste aquí" sx={{ fontWeight: 800, bgcolor: TONE.late.color, color: "#fff" }} />
              <Typography variant="subtitle2" fontWeight={800}>
                {row.labelColor ? (
                  <Box component="span" sx={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", bgcolor: row.labelColor, mr: 0.75 }} />
                ) : null}
                {row.displayName}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {money(row.displayAmount)} · vencía el {formatDayLabel(row.dueDate)}
              {row.storeName ? ` · ${row.storeName}` : ""}
            </Typography>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

function DueCard({ row, onPay, onSkip, onRestore, onAdjustAmount }) {
  const late = isPaidLate(row);
  const overdue = row.status === "pending" && (row.isOverdue || daysPast(row));
  const tone = overdue ? TONE.overdue : row.status === "pending" ? TONE.pending : late ? TONE.late : row.status === "paid" ? TONE.paid : TONE.skipped;
  const statusLabel = overdue
    ? "Vencido"
    : row.status === "paid"
      ? late
        ? "Pagado tarde"
        : "Pagado"
      : row.status === "skipped"
        ? "Omitido"
        : "Por pagar";

  return (
    <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, borderColor: tone.color, borderLeftWidth: row.labelColor ? 6 : 1, borderLeftColor: row.labelColor || tone.color }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip size="small" label={statusLabel} sx={{ height: 22, fontWeight: 800, bgcolor: tone.color, color: "#fff" }} />
            {row.storeName ? <Chip size="small" variant="outlined" label={row.storeName} sx={{ height: 22 }} /> : null}
          </Stack>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 0.5 }}>
            {row.labelColor ? (
              <Box component="span" sx={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", bgcolor: row.labelColor, mr: 0.75 }} />
            ) : null}
            {row.displayName}
          </Typography>
          <Typography variant="body2" fontWeight={700}>
            {money(row.displayAmount)}
          </Typography>
          {overdue ? (
            <Typography variant="caption" color="error.main" display="block">
              Este día ya pasó. Puedes registrar el pago ahora.
            </Typography>
          ) : null}
          {late ? (
            <Typography variant="caption" color="success.main" display="block">
              Lo pagaste el {formatDayLabel(row.paidDate)}. También queda marcado ese día.
            </Typography>
          ) : null}
          {row.status === "paid" && !late ? (
            <Typography variant="caption" color="text.secondary" display="block">
              Pagado el {formatDayLabel(row.paidDate || row.dueDate)}.
            </Typography>
          ) : null}
          {row.status === "skipped" ? (
            <Typography variant="caption" color="text.secondary" display="block">
              Está omitida. Puedes pagarla o dejarla pendiente otra vez.
            </Typography>
          ) : null}
        </Box>
        {row.status === "skipped" ? (
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Button size="small" variant="outlined" onClick={() => onRestore?.(row)}>
              Dejar pendiente
            </Button>
            <Button size="small" variant="contained" startIcon={<PaymentsIcon />} onClick={() => onPay?.(row)}>
              Pagar
            </Button>
          </Stack>
        ) : null}
        {row.status === "pending" ? (
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            {row.amountType === "variable" ? (
              <Tooltip title="Ajustar monto">
                <IconButton size="small" onClick={() => onAdjustAmount?.(row)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            <Button size="small" variant="contained" startIcon={<PaymentsIcon />} onClick={() => onPay?.(row)}>
              Pagar
            </Button>
            <Tooltip title="Omitir este período">
              <IconButton size="small" color="warning" onClick={() => onSkip?.(row)}>
                <SkipNextIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}
