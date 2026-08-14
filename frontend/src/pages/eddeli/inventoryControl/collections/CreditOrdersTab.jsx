import React, { useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import { money, toNum } from "./helpers.js";
import { formatCreditDueLabel, pickNextCredit } from "./creditHelpers.js";

function installmentsSummary(order) {
  const installments = Array.isArray(order.paymentInstallments)
    ? order.paymentInstallments
    : [];
  const pending = installments.filter(
    (installment) =>
      !installment.isPaid &&
      toNum(installment.remainingAmount ?? installment.amount) > 0.009,
  );
  return {
    total: installments.length,
    paid: installments.length - pending.length,
    pending: pending.length,
    next: pickNextCredit(order),
  };
}

/**
 * Créditos por pedido: el dinero sigue abonándose mediante los endpoints
 * existentes; esta vista solo concentra el calendario de cuotas pendiente.
 */
export default function CreditOrdersTab({
  orders = [],
  getPartyName,
  partyLabel,
  onPay,
  loading = false,
  color = "primary",
}) {
  const creditOrders = useMemo(
    () =>
      orders
        .filter((order) => {
          const summary = installmentsSummary(order);
          return summary.total > 0 && toNum(order.remainingAmount) > 0.009;
        })
        .map((order) => ({ order, summary: installmentsSummary(order) }))
        .sort((a, b) =>
          String(a.summary.next?.due || "9999-12-31").localeCompare(
            String(b.summary.next?.due || "9999-12-31"),
          ),
        ),
    [orders],
  );

  if (!creditOrders.length) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Alert severity="info">
          No hay pedidos a crédito con cuotas pendientes para este {partyLabel.toLowerCase()}.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            Créditos por pedido
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Próximas cuotas y saldos. Abona directamente al pedido.
          </Typography>
        </Box>
        <Chip
          color={color}
          variant="outlined"
          label={`${creditOrders.length} crédito(s) pendiente(s)`}
        />
      </Stack>

      <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
        <Table size="small" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>Pedido</TableCell>
              <TableCell>{partyLabel}</TableCell>
              <TableCell>Próximo pago</TableCell>
              <TableCell align="center">Cuotas</TableCell>
              <TableCell align="right">Saldo</TableCell>
              <TableCell align="right">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {creditOrders.map(({ order, summary }) => (
              <TableRow key={order.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    #{order.id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {String(order.date || "").slice(0, 10)}
                  </Typography>
                </TableCell>
                <TableCell>{getPartyName(order)}</TableCell>
                <TableCell>
                  {summary.next ? (
                    <Stack spacing={0.25}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formatCreditDueLabel(summary.next.due)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Cuota {money(summary.next.amount)}
                      </Typography>
                    </Stack>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    color={summary.pending ? "warning" : "success"}
                    variant="outlined"
                    label={`${summary.paid} pagadas · ${summary.pending} pendientes / ${summary.total}`}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography sx={{ fontWeight: 800 }} color="warning.dark">
                    {money(order.remainingAmount)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="contained"
                    color={color}
                    startIcon={<PaymentsIcon />}
                    onClick={() => onPay(order)}
                    disabled={loading}
                  >
                    Abonar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
