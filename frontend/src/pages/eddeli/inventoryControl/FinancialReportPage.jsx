import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Container,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import DonutLargeOutlinedIcon from "@mui/icons-material/DonutLargeOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import { getBusinessIndicatorsReportRequest } from "../../../api/financeRequest";
import { money } from "./collections/helpers.js";

const fmtMoney = (n) => money(n);
const fmtPct = (n) => `${Number(n || 0).toFixed(1)} %`;
const fmtWeeks = (n) =>
  n == null || !Number.isFinite(Number(n)) ? "—" : Number(n).toFixed(1);

function monthInputValue(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthRangeFromInput(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return {};
  const [y, m] = value.split("-").map(Number);
  const startDate = `${value}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${value}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

const ROWS = [
  {
    key: "monthSales",
    label: "Ventas del mes",
    hint: "Cuánto vendiste",
    icon: AttachMoneyIcon,
    format: fmtMoney,
  },
  {
    key: "monthPurchases",
    label: "Compras del mes",
    hint: "Cuánto dinero destinaste a mercadería",
    icon: ShoppingCartOutlinedIcon,
    format: fmtMoney,
  },
  {
    key: "grossMarginPct",
    label: "Margen bruto",
    hint: "Cuánto queda de las ventas después del costo de mercadería",
    icon: ShowChartIcon,
    format: fmtPct,
  },
  {
    key: "cashAvailable",
    label: "Caja disponible",
    hint: "Dinero físico disponible",
    icon: PointOfSaleIcon,
    format: fmtMoney,
  },
  {
    key: "cashSurplus",
    label: "Sobra de caja",
    hint: "Dinero de más al cerrar turnos del periodo",
    icon: AddCircleOutlineIcon,
    format: fmtMoney,
  },
  {
    key: "cashShortage",
    label: "Falta de caja",
    hint: "Dinero que faltó al cerrar turnos del periodo",
    icon: RemoveCircleOutlineIcon,
    format: fmtMoney,
  },
  {
    key: "moneyInBanks",
    label: "Dinero en bancos",
    hint: "Dinero disponible en cuentas",
    icon: AccountBalanceIcon,
    format: fmtMoney,
  },
  {
    key: "totalAvailable",
    label: "Dinero total disponible",
    hint: "Caja + bancos",
    icon: SavingsOutlinedIcon,
    format: fmtMoney,
    emphasize: true,
  },
  {
    key: "inventoryValue",
    label: "Valor del inventario",
    hint: "Mercadería que tienes",
    icon: Inventory2OutlinedIcon,
    format: fmtMoney,
  },
  {
    key: "supplierDebt",
    label: "Deuda con proveedores",
    hint: "Facturas pendientes",
    icon: ReceiptLongOutlinedIcon,
    format: fmtMoney,
  },
  {
    key: "businessPurchaseDebt",
    label: "Deuda compra del negocio",
    hint: "Saldo pendiente al anterior dueño",
    icon: LocalOfferOutlinedIcon,
    format: fmtMoney,
  },
  {
    key: "otherLoansDebt",
    label: "Otros préstamos",
    hint: "Préstamos pendientes",
    icon: CreditCardOutlinedIcon,
    format: fmtMoney,
  },
  {
    key: "monthOperatingExpenses",
    label: "Egresos del mes",
    hint: "Arriendo, internet, sueldos, etc.",
    icon: ShowChartIcon,
    format: fmtMoney,
  },
  {
    key: "monthPersonalWithdrawals",
    label: "Retiros personales",
    hint: "Dinero que sacaste para ti",
    icon: PersonOutlineIcon,
    format: fmtMoney,
  },
  {
    key: "netCashFlow",
    label: "Flujo neto de caja",
    hint: "Si entró o salió efectivo",
    icon: AccountBalanceWalletOutlinedIcon,
    format: fmtMoney,
  },
  {
    key: "minReserve",
    label: "Reserva mínima",
    hint: "Dinero que no deberías tocar",
    icon: DonutLargeOutlinedIcon,
    format: fmtMoney,
  },
  {
    key: "weeksCovered",
    label: "Semanas cubiertas",
    hint: "Cuántas semanas puedes operar con el efectivo actual",
    icon: CalendarMonthOutlinedIcon,
    format: fmtWeeks,
  },
];

export default function FinancialReportPage() {
  const [month, setMonth] = useState(() => monthInputValue());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = monthRangeFromInput(month);
      const res = await getBusinessIndicatorsReportRequest(params);
      setData(res?.data ?? res);
    } catch (err) {
      console.error("FinancialReportPage:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo cargar el reporte financiero",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const indicators = data?.indicators || {};
  const periodLabel = data?.period?.label || "—";

  const rows = useMemo(
    () =>
      ROWS.map((row) => ({
        ...row,
        value: row.format(indicators[row.key]),
      })),
    [indicators],
  );

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <AssessmentOutlinedIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={800} lineHeight={1.2}>
              Reporte financiero
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {periodLabel}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            type="month"
            label="Mes"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <Tooltip title="Actualizar">
            <span>
              <IconButton onClick={load} disabled={loading} aria-label="Actualizar">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: 2, overflow: "hidden" }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, width: "38%" }}>Indicador</TableCell>
              <TableCell sx={{ fontWeight: 800, width: "22%" }}>Resultado</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>¿Qué me dice?</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell>
                      <Skeleton width="70%" />
                    </TableCell>
                    <TableCell>
                      <Skeleton width="50%" />
                    </TableCell>
                    <TableCell>
                      <Skeleton width="90%" />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <TableRow
                      key={row.key}
                      hover
                      sx={
                        row.emphasize
                          ? { bgcolor: "action.hover", "& td": { fontWeight: 700 } }
                          : undefined
                      }
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <Icon
                            fontSize="small"
                            color="action"
                            sx={{ opacity: 0.85 }}
                          />
                          <Typography
                            variant="body2"
                            fontWeight={row.emphasize ? 800 : 600}
                          >
                            {row.label}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={row.emphasize ? 800 : 700}
                          sx={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {row.value}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {row.hint}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 1.5 }}
      >
        Caja = turnos abiertos. Bancos ≈ cobros por transferencia − pagos por
        transferencia. Reserva mínima ≈ 25% de egresos operativos del periodo.
      </Typography>
    </Container>
  );
}
