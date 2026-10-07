import React, { useMemo } from "react";
import { Box, IconButton, Paper, Stack, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function monthCells(year, month) {
  const first = new Date(year, month, 1);
  const pad = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < pad; i += 1) cells.push(null);
  for (let d = 1; d <= days; d += 1) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
}

function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Calendario mensual de plazos.
 * events: { id, date, title, amountLabel, direction, overdue, paid }
 */
export default function LoansCalendar({ monthDate, onMonthChange, events, onSelect }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const today = todayKey();
  const cells = useMemo(() => monthCells(year, month), [year, month]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const ev of events || []) {
      if (!ev?.date) continue;
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  const shift = (delta) => {
    onMonthChange(new Date(year, month + delta, 1));
  };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1, py: 1 }}>
        <IconButton aria-label="Mes anterior" onClick={() => shift(-1)}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={800} sx={{ textTransform: "capitalize" }}>
          {MONTHS[month]} {year}
        </Typography>
        <IconButton aria-label="Mes siguiente" onClick={() => shift(1)}>
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        {WEEKDAYS.map((label) => (
          <Box
            key={label}
            sx={{
              px: 0.5,
              py: 0.75,
              textAlign: "center",
              bgcolor: "action.hover",
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" fontWeight={700}>
              {label}
            </Typography>
          </Box>
        ))}
        {cells.map((day, idx) => {
          const key =
            day == null
              ? `empty-${idx}`
              : `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const items = day == null ? [] : byDay.get(key) || [];
          const isToday = key === today;
          return (
            <Box
              key={key}
              sx={{
                minHeight: { xs: 72, sm: 108 },
                p: 0.5,
                borderRight: (idx + 1) % 7 === 0 ? 0 : 1,
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: day == null ? "action.hover" : isToday ? "action.selected" : "background.paper",
                outline: isToday ? "1px solid" : "none",
                outlineColor: "primary.main",
                outlineOffset: -1,
              }}
            >
              {day != null && (
                <>
                  <Typography
                    variant="caption"
                    fontWeight={isToday ? 800 : 600}
                    color={isToday ? "primary.main" : "text.secondary"}
                  >
                    {day}
                  </Typography>
                  <Stack spacing={0.4} sx={{ mt: 0.25 }}>
                    {items.map((ev) => (
                      <Box
                        key={ev.id}
                        component="button"
                        type="button"
                        onClick={() => onSelect?.(ev)}
                        sx={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          border: 0,
                          borderRadius: 1,
                          px: 0.5,
                          py: 0.25,
                          cursor: "pointer",
                          color: "common.white",
                          bgcolor: ev.color
                            ? ev.color
                            : ev.paid
                              ? "success.main"
                              : ev.overdue
                                ? "error.main"
                                : ev.direction === "receivable"
                                  ? "info.main"
                                  : "secondary.main",
                          opacity: ev.paid ? 0.62 : 1,
                          boxShadow: ev.overdue ? "inset 0 0 0 2px #fff" : "none",
                        }}
                      >
                        <Typography variant="caption" sx={{ display: "block", fontWeight: 700, lineHeight: 1.2 }} noWrap>
                          {ev.title}
                        </Typography>
                        <Typography variant="caption" sx={{ display: "block", lineHeight: 1.2 }} noWrap>
                          {ev.amountLabel}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </>
              )}
            </Box>
          );
        })}
      </Box>

      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ px: 1.5, py: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ width: "100%" }}>
          Cada préstamo usa el color que elegiste. Si el plazo está pagado se ve más claro. El borde blanco marca un vencido.
        </Typography>
      </Stack>
    </Paper>
  );
}
