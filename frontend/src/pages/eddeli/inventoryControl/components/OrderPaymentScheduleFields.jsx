/**
 * Campos de fecha de liquidación / cuotas para pedidos cliente y proveedor.
 * Por defecto colapsado detrás del botón "Pago a crédito".
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Collapse,
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
  Chip,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CreditScoreIcon from "@mui/icons-material/CreditScore";
import {
  buildEqualInstallments,
  sumInstallmentAmounts,
  toDateOnly,
} from "../../../../utils/orderPaymentSchedule.js";

const money2 = (n) => Number(Number(n || 0).toFixed(2));
const dateInputValue = (v) => toDateOnly(v) || "";

/**
 * @param {object} props
 * @param {string} props.deliveryDate - YYYY-MM-DD (fecha del pedido / entrega)
 * @param {number} props.orderTotal - total del pedido
 * @param {string} props.paymentDueDate
 * @param {(v: string) => void} props.onPaymentDueDateChange
 * @param {boolean} props.splitPayments
 * @param {(v: boolean) => void} props.onSplitPaymentsChange
 * @param {number|string} props.installmentCount
 * @param {(v: number) => void} props.onInstallmentCountChange
 * @param {Array} props.installments
 * @param {(rows: Array) => void} props.onInstallmentsChange
 * @param {'customer'|'supplier'} [props.partyKind]
 */
export default function OrderPaymentScheduleFields({
  deliveryDate,
  orderTotal,
  paymentDueDate,
  onPaymentDueDateChange,
  splitPayments,
  onSplitPaymentsChange,
  installmentCount,
  onInstallmentCountChange,
  installments,
  onInstallmentsChange,
  partyKind = "customer",
}) {
  const [open, setOpen] = useState(false);
  const total = money2(orderTotal);
  const sum = sumInstallmentAmounts(installments);
  const diff = money2(total - sum);
  const hasSchedule = Boolean(installments?.length || paymentDueDate);
  const payLabel =
    partyKind === "supplier" ? "Fecha en que debo pagar" : "Fecha en que me deben pagar";

  // Si al editar ya hay cuotas, abrimos una vez para que se vean.
  useEffect(() => {
    if (hasSchedule) setOpen(true);
    // solo al montar / cuando aparece schedule por carga de edición
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(installments?.length)]);

  const canGenerate = Boolean(deliveryDate && paymentDueDate && total > 0);

  const handleGenerate = () => {
    if (!canGenerate) return;
    const n = splitPayments ? Number(installmentCount) || 2 : 1;
    const rows = buildEqualInstallments({
      startDate: deliveryDate,
      endDate: paymentDueDate,
      count: n,
      total,
    });
    onInstallmentsChange(rows);
  };

  const updateRow = (idx, patch) => {
    onInstallmentsChange(
      (installments || []).map((row, i) =>
        i === idx ? { ...row, ...patch } : row,
      ),
    );
  };

  const removeRow = (idx) => {
    const row = installments[idx];
    if (row?.locked) return;
    onInstallmentsChange(installments.filter((_, i) => i !== idx));
  };

  const addRow = () => {
    onInstallmentsChange([
      ...(installments || []),
      {
        id: null,
        sequence: (installments?.length || 0) + 1,
        dueDate: paymentDueDate || deliveryDate || "",
        amount: Math.max(0, diff),
        locked: false,
        reminderEnabled: true,
        reminderDaysBefore: 1,
      },
    ]);
  };

  const hint = useMemo(() => {
    if (!installments?.length) {
      return "Opcional: define cuándo liquidar. Si divides, genera cuotas y ajusta montos/fechas.";
    }
    if (Math.abs(diff) > 0.009) {
      return `La suma de cuotas (${sum.toFixed(2)}) no coincide con el total (${total.toFixed(2)}). Diferencia: ${diff.toFixed(2)}.`;
    }
    return `${installments.length} cuota(s) · total ${sum.toFixed(2)}`;
  }, [installments, sum, total, diff]);

  const summaryLabel = installments?.length
    ? `${installments.length} cuota${installments.length === 1 ? "" : "s"}`
    : paymentDueDate
      ? "Con fecha de pago"
      : null;

  return (
    <Box>
      <Button
        fullWidth
        variant={open || hasSchedule ? "outlined" : "text"}
        color={hasSchedule ? "warning" : "inherit"}
        onClick={() => setOpen((v) => !v)}
        startIcon={<CreditScoreIcon />}
        endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{
          justifyContent: "space-between",
          textTransform: "none",
          fontWeight: 700,
          px: 1.25,
          py: 1,
          borderStyle: open ? "solid" : undefined,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <span>Pago a crédito</span>
          {summaryLabel ? (
            <Chip
              size="small"
              label={summaryLabel}
              color="warning"
              variant="outlined"
              sx={{ height: 22, fontWeight: 700 }}
            />
          ) : null}
        </Stack>
      </Button>

      <Collapse in={open} timeout="auto" unmountOnExit={false}>
        <Box
          sx={{
            mt: 1,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            p: 1.5,
            bgcolor: "background.default",
          }}
        >
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Fechas y cuotas
          </Typography>

          <Grid container spacing={1.25}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label={payLabel}
                InputLabelProps={{ shrink: true }}
                value={dateInputValue(paymentDueDate)}
                onChange={(e) => onPaymentDueDateChange(e.target.value)}
                helperText="Fecha límite para liquidar todo"
                sx={{
                  "& input[type='date']": {
                    minWidth: 0,
                    width: "100%",
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} sx={{ display: "flex", alignItems: "center" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(splitPayments)}
                    onChange={(e) => onSplitPaymentsChange(e.target.checked)}
                  />
                }
                label="Dividir en cuotas"
              />
            </Grid>

            {splitPayments ? (
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Nº de pagos"
                  inputProps={{ min: 2, max: 36 }}
                  value={installmentCount}
                  onChange={(e) => onInstallmentCountChange(Number(e.target.value) || 2)}
                />
              </Grid>
            ) : null}

            <Grid item xs={12} sm={splitPayments ? 8 : 12}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!canGenerate}
                  onClick={handleGenerate}
                >
                  {splitPayments ? "Generar cuotas" : "Generar fecha de pago"}
                </Button>
                {installments?.length ? (
                  <Button size="small" variant="text" startIcon={<AddIcon />} onClick={addRow}>
                    Agregar cuota
                  </Button>
                ) : null}
              </Stack>
            </Grid>

            {installments?.length ? (
              <Grid item xs={12}>
                <Stack spacing={1.25}>
                  {installments.map((row, idx) => (
                    <Box
                      key={row.id || `new-${idx}`}
                      sx={{
                        display: "grid",
                        gap: 1,
                        alignItems: "center",
                        gridTemplateColumns: {
                          xs: "auto 1fr",
                          sm: "auto minmax(168px, 1.2fr) minmax(110px, 0.7fr) auto minmax(130px, 0.8fr) auto",
                        },
                        gridTemplateAreas: {
                          xs: `
                            "idx date"
                            "idx amount"
                            "idx remind"
                            "idx notice"
                            "idx del"
                          `,
                          sm: `"idx date amount remind notice del"`,
                        },
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ gridArea: "idx", minWidth: 36 }}
                      >
                        #{idx + 1}
                        {row.locked ? " ✓" : ""}
                      </Typography>
                      <TextField
                        size="small"
                        type="date"
                        label="Fecha cuota"
                        InputLabelProps={{ shrink: true }}
                        value={dateInputValue(row.dueDate)}
                        disabled={Boolean(row.locked)}
                        onChange={(e) => updateRow(idx, { dueDate: e.target.value })}
                        sx={{
                          gridArea: "date",
                          minWidth: 0,
                          "& input[type='date']": {
                            minWidth: 0,
                            width: "100%",
                          },
                        }}
                      />
                      <TextField
                        size="small"
                        type="number"
                        label="Monto"
                        inputProps={{ step: "0.01", min: 0 }}
                        value={row.amount ?? ""}
                        disabled={Boolean(row.locked)}
                        onChange={(e) =>
                          updateRow(idx, { amount: money2(e.target.value) })
                        }
                        sx={{ gridArea: "amount", minWidth: 0 }}
                      />
                      <FormControlLabel
                        sx={{ m: 0, gridArea: "remind", whiteSpace: "nowrap" }}
                        control={
                          <Checkbox
                            size="small"
                            checked={row.reminderEnabled !== false}
                            disabled={Boolean(row.locked)}
                            onChange={(e) =>
                              updateRow(idx, { reminderEnabled: e.target.checked })
                            }
                          />
                        }
                        label={<Typography variant="caption">Recordarme</Typography>}
                      />
                      <TextField
                        select
                        size="small"
                        label="Aviso"
                        value={
                          [0, 1, 2].includes(Number(row.reminderDaysBefore))
                            ? Number(row.reminderDaysBefore)
                            : 1
                        }
                        disabled={Boolean(row.locked) || row.reminderEnabled === false}
                        onChange={(e) =>
                          updateRow(idx, { reminderDaysBefore: Number(e.target.value) })
                        }
                        sx={{ gridArea: "notice", minWidth: 0 }}
                      >
                        <MenuItem value={0}>Mismo día</MenuItem>
                        <MenuItem value={1}>1 día antes</MenuItem>
                        <MenuItem value={2}>2 días antes</MenuItem>
                      </TextField>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={Boolean(row.locked)}
                        onClick={() => removeRow(idx)}
                        aria-label="Quitar cuota"
                        sx={{ gridArea: "del", justifySelf: { xs: "start", sm: "center" } }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            ) : null}

            <Grid item xs={12}>
              <Typography
                variant="caption"
                color={
                  Math.abs(diff) > 0.009 && installments?.length
                    ? "warning.main"
                    : "text.secondary"
                }
              >
                {hint}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Box>
  );
}
