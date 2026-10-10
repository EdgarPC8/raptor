/**
 * Modal post-cierre / pendientes: omitir diferencia o registrarla como ingreso/egreso.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import {
  getPendingDifferenceShifts,
  resolveShiftDifference,
  resolveShiftDifferencesBulk,
} from "../../api/shiftRequest.js";
import { formatDateTime } from "../../helpers/functions.js";
import { formatMoney } from "../../utils/turnoCashUtils.js";

function kindLabel(kind, amount) {
  if (kind === "surplus") return `Sobrante ${formatMoney(amount)}`;
  if (kind === "shortage") return `Faltante ${formatMoney(amount)}`;
  return formatMoney(amount);
}

function shiftRowMeta(row) {
  const store =
    row.store?.name ||
    (row.establishmentCode
      ? `${row.establishmentCode}-${row.emissionPointCode || ""}`
      : "—");
  return {
    store,
    when: row.closedAt ? formatDateTime(row.closedAt) : "—",
    operator: row.userLabel || "—",
  };
}

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   justClosed?: {
 *     id: number,
 *     cashDifference?: number,
 *     closedAt?: string,
 *     store?: object,
 *     expectedCashTotal?: number,
 *     closingCashTotal?: number,
 *     pendingClose?: boolean,
 *   } | null,
 *   toast?: (opts: object) => void,
 *   onResolved?: () => void,
 *   onConfirmClose?: (action: 'omit'|'register') => Promise<void>,
 * }} props
 */
export default function CashDifferenceResolveDialog({
  open,
  onClose,
  justClosed = null,
  toast,
  onResolved,
  onConfirmClose,
}) {
  const [tab, setTab] = useState(0);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  const justDiff = Number(justClosed?.cashDifference ?? 0);
  const justKind = justDiff > 0 ? "surplus" : justDiff < 0 ? "shortage" : "none";
  const pendingClose = Boolean(justClosed?.pendingClose);
  const showJustTab = Boolean(justClosed?.id) && justDiff !== 0;

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getPendingDifferenceShifts({ limit: 50 });
      const list = Array.isArray(data) ? data : [];
      setPending(list);
      setSelected(new Set(list.map((r) => r.id)));
      return list;
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudieron cargar pendientes.",
        variant: "error",
      });
      setPending([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Solo al abrir el modal (no en cada cambio de loadPending / toast).
  useEffect(() => {
    if (!open) return;
    setTab(0);
    void loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intencional: solo al abrir
  }, [open]);

  const pendingOthers = useMemo(() => {
    if (!justClosed?.id) return pending;
    return pending.filter((p) => Number(p.id) !== Number(justClosed.id));
  }, [pending, justClosed]);

  const toggleId = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === pending.length) return new Set();
      return new Set(pending.map((r) => r.id));
    });
  };

  const finishAndRefresh = async ({ closeDialog = false } = {}) => {
    if (closeDialog) {
      onClose?.();
      onResolved?.();
      return;
    }
    const list = await loadPending();
    onResolved?.();
    if (!list.length && !justClosed?.id) onClose?.();
  };

  /** Cierre actual aún abierto: decide y recién ahí cierra el turno. */
  const runPendingClose = async (action) => {
    if (!onConfirmClose) return;
    setBusy(true);
    try {
      await onConfirmClose(action);
    } catch {
      /* toast en el padre */
    } finally {
      setBusy(false);
    }
  };

  const runOne = async (shiftId, action) => {
    setBusy(true);
    try {
      const { data } = await resolveShiftDifference(shiftId, action);
      void toast?.({
        message: data?.message || "Listo.",
        variant: "success",
      });
      await finishAndRefresh({ closeDialog: false });
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo regularizar.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const runBulk = async (action) => {
    const ids = [...selected];
    if (!ids.length) {
      void toast?.({ message: "Seleccioná al menos un turno.", variant: "warning" });
      return;
    }
    setBusy(true);
    try {
      const { data } = await resolveShiftDifferencesBulk(ids, action);
      void toast?.({
        message: data?.message || "Regularización masiva lista.",
        variant: "success",
      });
      const list = await loadPending();
      onResolved?.();
      if (!list.length) onClose?.();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo regularizar en lote.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const registerHint =
    justKind === "surplus"
      ? "Registrar como ingreso (sobrante entra al sistema)"
      : justKind === "shortage"
        ? "Registrar como egreso (faltante sale del sistema)"
        : "Registrar en finanzas";

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 0.5 }}>
        {pendingClose ? "Antes de cerrar el turno" : "Diferencia de caja"}
        <Typography variant="body2" color="text.secondary" fontWeight={400}>
          {pendingClose
            ? "El turno sigue abierto. Elegí qué hacer con la diferencia y recién ahí se cierra."
            : "Decidí si omitís el sobrante/faltante o lo registrás en finanzas."}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {showJustTab ? (
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, minHeight: 36 }}>
            <Tab label="Este cierre" sx={{ minHeight: 36, py: 0.5 }} />
            <Tab
              label={`Pendientes${pending.length ? ` (${pending.length})` : ""}`}
              sx={{ minHeight: 36, py: 0.5 }}
            />
          </Tabs>
        ) : (
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            Pendientes{pending.length ? ` (${pending.length})` : ""}
          </Typography>
        )}

        {showJustTab && tab === 0 && (
          <Stack spacing={2}>
            <PaperLike>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip
                  size="small"
                  color={justKind === "surplus" ? "success" : "warning"}
                  label={kindLabel(justKind, Math.abs(justDiff))}
                />
                <Typography variant="body2" color="text.secondary">
                  Turno #{justClosed.id}
                  {justClosed.closedAt ? ` · ${formatDateTime(justClosed.closedAt)}` : ""}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Contado: {formatMoney(justClosed.closingCashTotal)} · Esperado:{" "}
                {formatMoney(justClosed.expectedCashTotal)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {pendingClose
                  ? "Al confirmar se cierra el turno y se aplica tu elección."
                  : null}
                {!pendingClose
                  ? `Si lo registrás, queda como ${
                      justKind === "surplus"
                        ? "ingreso «Sobrante de caja»"
                        : "egreso «Faltante de caja»"
                    } en finanzas. Si lo omitís, solo queda en el historial.`
                  : ` Registrar → ${
                      justKind === "surplus"
                        ? "ingreso «Sobrante de caja»"
                        : "egreso «Faltante de caja»"
                    }. Omitir → solo queda la diferencia en el historial.`}
              </Typography>
            </PaperLike>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="outlined"
                disabled={busy}
                onClick={() =>
                  void (pendingClose
                    ? runPendingClose("omit")
                    : runOne(justClosed.id, "omit"))
                }
              >
                {pendingClose ? "Omitir y cerrar" : "Omitir"}
              </Button>
              <Button
                variant="contained"
                color={justKind === "surplus" ? "success" : "warning"}
                disabled={busy}
                onClick={() =>
                  void (pendingClose
                    ? runPendingClose("register")
                    : runOne(justClosed.id, "register"))
                }
              >
                {pendingClose
                  ? justKind === "surplus"
                    ? "Ingreso y cerrar"
                    : "Egreso y cerrar"
                  : registerHint}
              </Button>
            </Stack>
            {pendingOthers.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                Hay {pendingOthers.length} cierre(s) anterior(es) con diferencia pendiente — mirá la
                pestaña Pendientes.
              </Typography>
            )}
          </Stack>
        )}

        {(!showJustTab || tab === 1) && (
          <Stack spacing={1.5}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : pending.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay cierres con sobrante o faltante pendiente de regularizar.
              </Typography>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  Seleccioná uno o varios y aplicá la misma acción a todos, o resolvé fila a fila.
                </Typography>
                <TableContainer sx={{ maxHeight: 320 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={selected.size === pending.length && pending.length > 0}
                            indeterminate={
                              selected.size > 0 && selected.size < pending.length
                            }
                            onChange={toggleAll}
                          />
                        </TableCell>
                        <TableCell>Turno</TableCell>
                        <TableCell>Cierre</TableCell>
                        <TableCell>Local</TableCell>
                        <TableCell align="right">Diferencia</TableCell>
                        <TableCell align="right">Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pending.map((row) => {
                        const meta = shiftRowMeta(row);
                        const isSurplus = row.kind === "surplus";
                        return (
                          <TableRow key={row.id} hover selected={selected.has(row.id)}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                size="small"
                                checked={selected.has(row.id)}
                                onChange={() => toggleId(row.id)}
                              />
                            </TableCell>
                            <TableCell>#{row.id}</TableCell>
                            <TableCell>{meta.when}</TableCell>
                            <TableCell>{meta.store}</TableCell>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                color={isSurplus ? "success" : "warning"}
                                label={kindLabel(row.kind, row.amount)}
                                sx={{ height: 22, fontSize: "0.7rem" }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                <Button
                                  size="small"
                                  disabled={busy}
                                  onClick={() => void runOne(row.id, "omit")}
                                >
                                  Omitir
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color={isSurplus ? "success" : "warning"}
                                  disabled={busy}
                                  onClick={() => void runOne(row.id, "register")}
                                >
                                  {isSurplus ? "Ingreso" : "Egreso"}
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button
                    variant="outlined"
                    disabled={busy || !selected.size}
                    onClick={() => void runBulk("omit")}
                  >
                    Omitir seleccionados ({selected.size})
                  </Button>
                  <Button
                    variant="contained"
                    disabled={busy || !selected.size}
                    onClick={() => void runBulk("register")}
                  >
                    Registrar seleccionados ({selected.size})
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  En lote, cada turno se registra según su signo: sobrante → ingreso, faltante →
                  egreso.
                </Typography>
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {pendingClose ? "Volver (turno sigue abierto)" : "Cerrar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PaperLike({ children }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "action.hover",
      }}
    >
      {children}
    </Box>
  );
}
