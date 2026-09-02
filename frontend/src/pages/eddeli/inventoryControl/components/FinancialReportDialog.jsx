import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SummarizeIcon from "@mui/icons-material/Summarize";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { PanelSkeleton } from "../../../../components/ContentSkeleton.jsx";
import {
  getFinanceDashboardHeroRequest,
  getIncomeExpenseBreakdownDetail,
  getFinancialProfitabilityReportRequest,
} from "../../../../api/financeRequest";
import { getAllCustomersRequest, getStoresRequest } from "../../../../api/inventoryControlRequest";
import { money } from "../collections/helpers.js";
import { printHtmlDocument } from "../../../../utils/printHtmlDocument.js";
import { buildCustomerDisplayName } from "../../../../utils/customerUtils.js";
import {
  DEFAULT_REPORT_FILTERS,
  buildFilteredFinancialReport,
  buildProfitabilityReport,
  describeActiveReportFilters,
  formatReportPeriodLabel,
} from "./financialReportUtils.js";

const fmtMoney = (n) => money(n);
const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;

function formatStoreOptionLabel(store) {
  const kind = store?.locationKind || "local";
  const kindLabel =
    kind === "propia" ? "sucursal" : kind === "bodega" ? "bodega" : "vitrina";
  return `${store?.name || "Local"} (${kindLabel})`;
}

function buildDateParams(dateFilters = {}) {
  const params = {};
  if (dateFilters.startDate) params.startDate = dateFilters.startDate;
  if (dateFilters.endDate) params.endDate = dateFilters.endDate;
  return params;
}

function formatLineDate(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : parseISO(String(value).slice(0, 10));
  if (!isValid(d)) return String(value).slice(0, 10);
  return format(d, "d MMM yyyy", { locale: es });
}

function ProfitabilitySection({ profitability, fmtMoney, fmtPct }) {
  if (!profitability) return null;

  const rows = [
    {
      label: "Ingresos en caja",
      value: fmtMoney(profitability.cashIncome),
      color: "success.main",
    },
    {
      label: "Por cobrar (pedidos del período)",
      value: `+ ${fmtMoney(profitability.receivable)}`,
      color: "info.main",
      hint:
        profitability.soldTotal > 0
          ? `Vendido ${fmtMoney(profitability.soldTotal)} · Cobrado ${fmtMoney(profitability.collectedFromOrders)}`
          : null,
    },
    {
      label: "Ingreso devengado",
      value: fmtMoney(profitability.accruedIncome),
      color: "success.main",
      bold: true,
    },
    { divider: true },
    {
      label: "Gastos operativos (sin compras inventario)",
      value: fmtMoney(profitability.operationalExpense),
      color: "error.main",
    },
    {
      label: "Compras a proveedores (inventario)",
      value: fmtMoney(profitability.purchases),
      color: "text.secondary",
    },
    {
      label: "Nómina (Edison / Edgar)",
      value: fmtMoney(profitability.employeePay),
      color: "text.secondary",
    },
    {
      label: "Servicios (arriendo, luz, agua…)",
      value: fmtMoney(profitability.servicePay),
      color: "text.secondary",
    },
    { divider: true },
    {
      label: "Balance en caja",
      value: fmtMoney(profitability.cashBalance),
      bold: true,
    },
    {
      label: "Balance si cobran todo",
      value: fmtMoney(profitability.balanceWithReceivable),
      color: profitability.balanceWithReceivable >= 0 ? "success.main" : "error.main",
      bold: true,
    },
    {
      label: "Utilidad operativa",
      value: fmtMoney(profitability.operationalProfit),
      color: profitability.operationalProfit >= 0 ? "success.main" : "error.main",
      hint: `Margen ${fmtPct(profitability.operationalMarginPct)}`,
      bold: true,
    },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
        Rentabilidad del período
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        La utilidad operativa no trata las compras a proveedores como gasto del día; el inventario
        del local se muestra aparte como activo.
      </Typography>
      {rows.map((row, idx) =>
        row.divider ? (
          <Divider key={`d-${idx}`} sx={{ my: 1 }} />
        ) : (
          <Box key={row.label}>
            <MetricRow
              label={row.label}
              value={row.value}
              color={row.color}
              bold={row.bold}
            />
            {row.hint && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                {row.hint}
              </Typography>
            )}
          </Box>
        ),
      )}
      {profitability.includeStoreInventory !== false && profitability.inventoryValue > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <MetricRow
            label={`Inventario en local${profitability.storeNames ? ` (${profitability.storeNames})` : ""}`}
            value={fmtMoney(profitability.inventoryValue)}
            color="primary.main"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            {profitability.inventoryProductCount} productos · {profitability.inventoryUnits} unidades
            · valor venta ~{fmtMoney(profitability.inventorySaleValue)}
          </Typography>
          <MetricRow
            label="Posición del negocio (caja + por cobrar + inventario)"
            value={fmtMoney(profitability.businessPosition)}
            bold
            color={profitability.businessPosition >= 0 ? "success.main" : "error.main"}
          />
        </>
      )}
    </Paper>
  );
}

function ReceivableTable({ rows }) {
  if (!rows?.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No hay saldo pendiente de pedidos en este período.
      </Typography>
    );
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Cliente</TableCell>
          <TableCell align="right">Por cobrar</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.customerId}-${row.customerName}`}>
            <TableCell>{row.customerName}</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>
              {money(row.amount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function InventoryTable({ rows }) {
  if (!rows?.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sin stock registrado en la sucursal.
      </Typography>
    );
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Producto</TableCell>
          <TableCell align="right">Cant.</TableCell>
          <TableCell align="right">Valor</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.slice(0, 15).map((row) => (
          <TableRow key={row.productId}>
            <TableCell sx={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
              {row.name}
            </TableCell>
            <TableCell align="right">{row.quantity}</TableCell>
            <TableCell align="right">{money(row.valueAtCost)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MetricRow({ label, value, color = "text.primary", bold = false }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.35 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: bold ? 800 : 600, color, textAlign: "right" }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function CategoryTable({ title, rows, color }) {
  const sorted = [...(rows || [])].sort((a, b) => Number(b.value) - Number(a.value));
  const total = sorted.reduce((sum, row) => sum + Number(row.value || 0), 0);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: "100%" }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color }}>
        {title}
      </Typography>
      {sorted.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Sin movimientos con los filtros actuales.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Categoría</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell align="right">%</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((row) => (
              <TableRow key={row.label}>
                <TableCell sx={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {row.label}
                </TableCell>
                <TableCell align="right">{fmtMoney(row.value)}</TableCell>
                <TableCell align="right">
                  {total > 0 ? fmtPct((Number(row.value) / total) * 100) : "—"}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                {fmtMoney(total)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                100%
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}

function MovementTable({ title, rows, type }) {
  const limited = (rows || []).slice(0, 40);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
        {title}
        {rows?.length > 40 ? ` (primeros 40 de ${rows.length})` : ""}
      </Typography>
      {limited.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Sin registros.
        </Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Concepto</TableCell>
                <TableCell>Cliente / categoría</TableCell>
                <TableCell align="right">Monto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {limited.map((row) => (
                <TableRow key={`${type}-${row.id}`}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatLineDate(row.date)}</TableCell>
                  <TableCell sx={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {row.concept || "—"}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {type === "income"
                      ? row.customerName || row.category || "—"
                      : row.category || "—"}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 600,
                      color: type === "income" ? "success.main" : "error.main",
                    }}
                  >
                    {fmtMoney(row.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Paper>
  );
}

export default function FinancialReportDialog({ open, onClose, dateFilters = {} }) {
  const printRef = useRef(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [hero, setHero] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [profitabilityContext, setProfitabilityContext] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [stores, setStores] = useState([]);
  const [reportFilters, setReportFilters] = useState(DEFAULT_REPORT_FILTERS);

  const periodLabel = useMemo(() => formatReportPeriodLabel(dateFilters), [dateFilters]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError("");
      setHero(null);
      setBreakdown(null);
      setProfitabilityContext(null);
      setTab(0);
      setReportFilters(DEFAULT_REPORT_FILTERS);

      const params = buildDateParams(dateFilters);
      const [heroRes, breakdownRes, profitabilityRes, customersRes, storesRes] =
        await Promise.allSettled([
        getFinanceDashboardHeroRequest(params),
        getIncomeExpenseBreakdownDetail(params),
        getFinancialProfitabilityReportRequest(params),
        getAllCustomersRequest(),
        getStoresRequest({ all: "true" }),
      ]);

      if (cancelled) return;

      const errors = [];
      if (heroRes.status === "fulfilled") {
        setHero(heroRes.value?.data ?? {});
      } else {
        errors.push("resumen");
        setHero({});
      }

      if (breakdownRes.status === "fulfilled") {
        setBreakdown(breakdownRes.value?.data ?? {});
      } else {
        errors.push("movimientos");
        console.error("FinancialReportDialog breakdown:", breakdownRes.reason);
        setBreakdown({});
      }

      if (profitabilityRes.status === "fulfilled") {
        setProfitabilityContext(profitabilityRes.value?.data ?? {});
      } else {
        console.error("FinancialReportDialog profitability:", profitabilityRes.reason);
        setProfitabilityContext({});
      }

      if (customersRes.status === "fulfilled") {
        const raw = customersRes.value?.data;
        setCustomers(Array.isArray(raw) ? raw : []);
      } else {
        setCustomers([]);
      }

      if (storesRes.status === "fulfilled") {
        const raw = storesRes.value?.data;
        const list = Array.isArray(raw) ? raw : raw?.stores ?? [];
        setStores(list.filter((s) => s.isActive !== false));
      } else {
        setStores([]);
      }

      if (errors.length) {
        setLoadError(
          `No se pudo cargar ${errors.join(" ni ")} del reporte. Revisa que el backend EdDeli esté activo.`,
        );
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, dateFilters.startDate, dateFilters.endDate]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    (async () => {
      const params = buildDateParams(dateFilters);
      if (reportFilters.includeStoreIds?.length) {
        params.storeIds = reportFilters.includeStoreIds.join(",");
      }
      try {
        const res = await getFinancialProfitabilityReportRequest(params);
        if (!cancelled) setProfitabilityContext(res?.data ?? {});
      } catch (err) {
        console.error("FinancialReportDialog profitability refresh:", err);
        if (!cancelled) setProfitabilityContext({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    dateFilters.startDate,
    dateFilters.endDate,
    reportFilters.includeStoreIds,
  ]);

  const rawIncomeLines = breakdown?.incomeLines ?? [];
  const rawExpenseLines = breakdown?.expenseLines ?? [];

  const filteredReport = useMemo(() => {
    const fromLines = buildFilteredFinancialReport({
      incomeLines: rawIncomeLines,
      expenseLines: rawExpenseLines,
      filters: reportFilters,
      customers,
    });

    if (rawIncomeLines.length + rawExpenseLines.length > 0) return fromLines;

    const metaIncome = Number(breakdown?.meta?.totals?.income ?? 0);
    const metaExpense = Number(breakdown?.meta?.totals?.expense ?? 0);
    const heroIncome = Number(hero?.summary?.totalIncome ?? 0);
    const heroExpense = Number(hero?.summary?.totalExpense ?? 0);
    const totalIncome = metaIncome || heroIncome;
    const totalExpense = metaExpense || heroExpense;

    if (!totalIncome && !totalExpense) return fromLines;

    return {
      ...fromLines,
      totalIncome,
      totalExpense,
      balance: Number((totalIncome - totalExpense).toFixed(2)),
      marginPct: totalIncome > 0 ? Number((((totalIncome - totalExpense) / totalIncome) * 100).toFixed(2)) : 0,
      groups: {
        Ingresos: breakdown?.groups?.Ingresos ?? [],
        Gastos: breakdown?.groups?.Gastos ?? [],
      },
    };
  }, [rawIncomeLines, rawExpenseLines, reportFilters, customers, breakdown, hero]);

  const profitability = useMemo(
    () =>
      buildProfitabilityReport({
        filteredReport,
        profitabilityContext,
        filters: reportFilters,
        obligations: hero?.obligations?.summary ?? {},
      }),
    [filteredReport, profitabilityContext, reportFilters, hero],
  );

  const activeFilterLabels = useMemo(
    () => describeActiveReportFilters(reportFilters, customers, stores),
    [reportFilters, customers, stores],
  );

  const obligations = hero?.obligations?.summary ?? {};
  const collectionsPending = Number(hero?.summary?.futureIncome ?? 0);
  const loansReceivable = Number(obligations.totalReceivable ?? 0);
  const debtsPayable = Number(obligations.totalPayable ?? 0);
  const projectedBalance = Number(
    (
      filteredReport.balance +
      collectionsPending +
      loansReceivable -
      debtsPayable
    ).toFixed(2),
  );

  const filtersHideAll =
    filteredReport.hasActiveFilters &&
    rawIncomeLines.length + rawExpenseLines.length > 0 &&
    filteredReport.incomeLines.length + filteredReport.expenseLines.length === 0;

  const selectedStores = useMemo(
    () =>
      stores.filter((s) => (reportFilters.includeStoreIds || []).includes(Number(s.id))),
    [stores, reportFilters.includeStoreIds],
  );

  const creditVitrinaStores = useMemo(
    () => stores.filter((s) => String(s.locationKind || "").toLowerCase() === "vitrina"),
    [stores],
  );

  const selectedCustomers = useMemo(
    () =>
      customers.filter((c) =>
        (reportFilters.excludeCustomerIds || []).includes(Number(c.id)),
      ),
    [customers, reportFilters.excludeCustomerIds],
  );

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    printHtmlDocument(printRef.current.innerHTML);
  }, []);

  const handleResetFilters = () => {
    setReportFilters(DEFAULT_REPORT_FILTERS);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: "92vh",
          width: "100%",
          maxWidth: 1180,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          pr: 1,
        }}
      >
        <DialogTitle sx={{ flex: 1, py: 1.25 }}>Reporte financiero</DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          <Tooltip title="Imprimir">
            <span>
              <IconButton size="small" onClick={handlePrint} disabled={loading || tab !== 0}>
                <PrintIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton aria-label="Cerrar" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          px: 3,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
          <Tab icon={<SummarizeIcon fontSize="small" />} iconPosition="start" label="Reporte" />
          <Tab icon={<FilterAltIcon fontSize="small" />} iconPosition="start" label="Filtros" />
        </Tabs>
      </Box>

      <DialogContent
        dividers
        sx={{
          flex: 1,
          overflow: "auto",
          pt: 2,
        }}
      >
        {loading ? (
          <PanelSkeleton height={420} />
        ) : tab === 1 ? (
          <Stack spacing={2.5}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>
                Período del reporte
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Usa las fechas del panel del dashboard. Si no hay fechas, el reporte es de todo el
                historial.
              </Typography>
              <Chip label={periodLabel} color="primary" variant="outlined" size="small" />
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
                Qué excluir del reporte
              </Typography>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={reportFilters.excludeEmployeePayments}
                      onChange={(e) =>
                        setReportFilters((prev) => ({
                          ...prev,
                          excludeEmployeePayments: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="No contar pagos de empleados"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={reportFilters.excludeInventoryPurchases}
                      onChange={(e) =>
                        setReportFilters((prev) => ({
                          ...prev,
                          excludeInventoryPurchases: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="No contar compras a proveedores (inventario)"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={reportFilters.includeStoreInventory}
                      onChange={(e) =>
                        setReportFilters((prev) => ({
                          ...prev,
                          includeStoreInventory: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Incluir inventario del local en la posición"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={reportFilters.excludeOrders}
                      onChange={(e) =>
                        setReportFilters((prev) => ({
                          ...prev,
                          excludeOrders: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="No contar ingresos de pedidos / cobranzas"
                />
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>
                Solo estos locales / vitrinas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Filtra ingresos de pedidos y por cobrar al local de entrega o al turno de caja.
                Útil para vitrinas a crédito. Si no eliges ninguno, entra todo el negocio.
              </Typography>
              {creditVitrinaStores.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ width: "100%" }}>
                    Vitrinas activas:
                  </Typography>
                  {creditVitrinaStores.map((store) => (
                    <Chip
                      key={store.id}
                      size="small"
                      label={formatStoreOptionLabel(store)}
                      variant={
                        (reportFilters.includeStoreIds || []).includes(Number(store.id))
                          ? "filled"
                          : "outlined"
                      }
                      onClick={() => {
                        const id = Number(store.id);
                        setReportFilters((prev) => {
                          const current = prev.includeStoreIds || [];
                          const next = current.includes(id)
                            ? current.filter((x) => x !== id)
                            : [...current, id];
                          return { ...prev, includeStoreIds: next };
                        });
                      }}
                    />
                  ))}
                </Stack>
              )}
              <Autocomplete
                multiple
                options={stores}
                value={selectedStores}
                onChange={(_, value) =>
                  setReportFilters((prev) => ({
                    ...prev,
                    includeStoreIds: value.map((s) => Number(s.id)),
                  }))
                }
                getOptionLabel={(option) => formatStoreOptionLabel(option)}
                isOptionEqualToValue={(a, b) => Number(a.id) === Number(b.id)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Locales incluidos"
                    placeholder="Todas las sucursales y vitrinas..."
                  />
                )}
              />
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                No contar ingresos de estos clientes
              </Typography>
              <Autocomplete
                multiple
                options={customers}
                value={selectedCustomers}
                onChange={(_, value) =>
                  setReportFilters((prev) => ({
                    ...prev,
                    excludeCustomerIds: value.map((c) => Number(c.id)),
                  }))
                }
                getOptionLabel={(option) => buildCustomerDisplayName(option)}
                isOptionEqualToValue={(a, b) => Number(a.id) === Number(b.id)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Clientes a excluir"
                    placeholder="Buscar cliente..."
                  />
                )}
              />
            </Paper>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={handleResetFilters}>
                Limpiar filtros
              </Button>
              <Button variant="contained" onClick={() => setTab(0)}>
                Ver reporte
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Box ref={printRef}>
            {loadError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {loadError}
              </Alert>
            )}

            {filtersHideAll && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Los filtros activos están ocultando todos los movimientos (
                {rawIncomeLines.length} ingresos y {rawExpenseLines.length} gastos en el período).
                Ve a la pestaña Filtros y desactívalos para ver los datos.
              </Alert>
            )}

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 2 }}
            >
              <Chip label={periodLabel} color="primary" variant="outlined" size="small" />
              <Typography variant="caption" color="text.secondary">
                Generado el {format(new Date(), "d MMM yyyy, HH:mm", { locale: es })}
              </Typography>
              {activeFilterLabels.map((label) => (
                <Chip key={label} label={label} size="small" variant="outlined" />
              ))}
            </Stack>

            {(filteredReport.excludedIncomeCount > 0 || filteredReport.excludedExpenseCount > 0) &&
              !filtersHideAll && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                  Excluidos por filtros: {filteredReport.excludedIncomeCount} ingreso(s) y{" "}
                  {filteredReport.excludedExpenseCount} gasto(s).
                </Typography>
              )}

            {reportFilters.includeStoreIds?.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Mostrando solo movimientos ligados a:{" "}
                {selectedStores.map((s) => formatStoreOptionLabel(s)).join(", ")}. Los pedidos a
                crédito sin local de entrega (ej. Chile Pan, Joselo) no aparecen aquí; usa el filtro
                de clientes si necesitas incluirlos.
              </Alert>
            )}

            <ProfitabilitySection
              profitability={profitability}
              fmtMoney={fmtMoney}
              fmtPct={fmtPct}
            />

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                    Por cobrar del período
                  </Typography>
                  <ReceivableTable rows={profitability.topReceivableCustomers} />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                    Inventario en sucursal
                  </Typography>
                  {reportFilters.includeStoreInventory ? (
                    <InventoryTable rows={profitability.topInventoryProducts} />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Desactivado en filtros.
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                    Resumen del período
                  </Typography>
                  <MetricRow
                    label="Ingresos"
                    value={fmtMoney(filteredReport.totalIncome)}
                    color="success.main"
                  />
                  <MetricRow
                    label="Gastos"
                    value={fmtMoney(filteredReport.totalExpense)}
                    color="error.main"
                  />
                  <Divider sx={{ my: 1 }} />
                  <MetricRow label="Balance" value={fmtMoney(filteredReport.balance)} bold />
                  <MetricRow label="Margen" value={fmtPct(filteredReport.marginPct)} />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                    Posición proyectada
                  </Typography>
                  <MetricRow label="Por cobrar (pedidos)" value={fmtMoney(collectionsPending)} />
                  <MetricRow label="Préstamos por cobrar" value={fmtMoney(loansReceivable)} />
                  <MetricRow label="Deudas por pagar" value={fmtMoney(debtsPayable)} />
                  <Divider sx={{ my: 1 }} />
                  <MetricRow label="Dinero esperado" value={fmtMoney(projectedBalance)} bold />
                  {filteredReport.hasActiveFilters && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                      El bloque proyectado sigue mostrando el total general; los filtros aplican a
                      ingresos y gastos registrados.
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <CategoryTable
                  title="Ingresos por categoría"
                  rows={filteredReport.groups.Ingresos}
                  color="success.main"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <CategoryTable
                  title="Gastos por categoría"
                  rows={filteredReport.groups.Gastos}
                  color="error.main"
                />
              </Grid>
            </Grid>

            <Stack spacing={2}>
              <MovementTable
                title="Ingresos registrados"
                rows={filteredReport.incomeLines}
                type="income"
              />
              <MovementTable
                title="Gastos registrados"
                rows={filteredReport.expenseLines}
                type="expense"
              />
            </Stack>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ flexShrink: 0, justifyContent: "space-between", px: 3 }}>
        {tab === 0 ? (
          <Button startIcon={<FilterAltIcon />} onClick={() => setTab(1)}>
            Ajustar filtros
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
