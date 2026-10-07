import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Alert,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TableRowsIcon from "@mui/icons-material/TableRows";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import LoansCalendar from "./components/LoansCalendar.jsx";
import TablePro from "../../../components/Tables/TablePro";
import TableColumnVisibilityControl from "../../../components/Tables/TableColumnVisibilityControl.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useAppSettings } from "../../../context/AppSettingsContext.jsx";
import { updateAppSettings } from "../../../api/appSettingsRequest.js";
import { useTableColumnVisibility } from "../../../hooks/useTableColumnVisibility.js";
import { runMutationReload } from "../../../utils/mutationToast.js";
import { money, nowLocalDateTime } from "./collections/helpers.js";
import { formatDateTime } from "../../../helpers/functions.js";
import {
  getObligationsWorkbenchRequest,
  createObligationRequest,
  updateObligationRequest,
  payObligationRequest,
  cancelObligationRequest,
} from "../../../api/financeRequest";
import { getAllCustomersRequest } from "../../../api/inventoryControlRequest";
import {
  buildEqualInstallments,
  normalizeScheduleForApi,
  normalizeMaxInstallments,
  sumInstallmentAmounts,
  toDateOnly,
} from "../../../utils/orderPaymentSchedule.js";
import { buildFrenchAmortization } from "../../../utils/frenchAmortization.js";
import AmortizationScheduleTable from "./components/AmortizationScheduleTable.jsx";
import LoanColorPicker, { DEFAULT_LOAN_COLOR } from "./components/LoanColorPicker.jsx";

function readLoanTerms(raw) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? raw : {};
}

const money2 = (n) => Number(Number(n || 0).toFixed(2));

const FRENCH_EDIT_FIELDS = [
  "capitalReducido",
  "interest",
  "capitalCuota",
  "seguroDesgravamen",
  "seguroIncendio",
  "dividendo",
  "dueDate",
  "tasa",
];

function applyScheduleEdits(rows, edits) {
  return (rows || []).map((row) => {
    const edit = edits?.[row.sequence];
    if (!edit) return row;
    const next = { ...row };
    for (const key of FRENCH_EDIT_FIELDS) {
      if (edit[key] == null || edit[key] === "") continue;
      if (key === "dueDate") {
        next.dueDate = String(edit[key]).slice(0, 10);
        continue;
      }
      const n = Number(String(edit[key]).replace(",", "."));
      if (Number.isFinite(n)) next[key] = money2(n);
    }
    next.amount = next.dividendo;
    return next;
  });
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const PLAZOS_POR_GRUPO = 6;

function plazosEnGrupos(rows) {
  const list = rows || [];
  const groups = [];
  for (let i = 0; i < list.length; i += PLAZOS_POR_GRUPO) {
    groups.push(list.slice(i, i + PLAZOS_POR_GRUPO));
  }
  return groups;
}

function installmentRowsOf(row) {
  if (Array.isArray(row?.installments) && row.installments.length) return row.installments;
  const amount = Number(row?.total ?? row?.originalAmount ?? row?.remaining ?? 0);
  const due = toDateOnly(row?.dueDate || row?.openDate);
  if (!due || amount <= 0) return [];
  const remaining = Number(row?.remaining ?? amount);
  return [
    {
      sequence: 1,
      dueDate: due,
      amount,
      paidAmount: Number(row?.paid || 0),
      remainingAmount: remaining,
      isPaid: remaining <= 0.009,
    },
  ];
}

function nextOpenInstallment(row) {
  return installmentRowsOf(row).find((item) => !item.isPaid) || null;
}

const PARTY_TYPES = [
  { value: "employee", label: "Empleado" },
  { value: "customer", label: "Cliente" },
  { value: "supplier", label: "Proveedor" },
  { value: "other", label: "Otro" },
];

const STATUS_CHIP = {
  open: { label: "Abierta", color: "warning" },
  closed: { label: "Saldada", color: "success" },
  cancelled: { label: "Anulada", color: "default" },
};

const emptyCreateForm = () => ({
  direction: "receivable",
  partyType: "employee",
  partyName: "",
  customerId: "",
  concept: "",
  amount: "",
  openDate: nowLocalDateTime(),
  dueDate: "",
  note: "",
  labelColor: DEFAULT_LOAN_COLOR,
  split: false,
  installmentCount: 2,
  endDate: "",
  installments: [],
  french: false,
  annualRate: "",
  tea: "",
  annualCost: "",
  mora: "",
  months: "60",
  firstDueDate: "",
  insurancePerMil: "",
  firePerMil: "0",
  solca: "",
  markPastMovements: false,
});

function frenchSaveReason({ rate, months, maxPlazos, preview, rows, markPast }) {
  const annual = Number(rate);
  const count = Math.floor(Number(months) || 0);
  if (rate === "" || rate == null || !Number.isFinite(annual)) return "Indica la tasa TIR.";
  if (annual < 0 || annual > 100) return "La tasa TIR debe estar entre 0 % y 100 %.";
  if (count < 1) return "El plazo debe ser de al menos 1 mes.";
  if (count > maxPlazos) return `El máximo es ${maxPlazos} plazos. Se cambia en Configuración → Sistema.`;
  if (preview?.beforeIssue && !markPast) {
    return "La primera cuota es anterior a la emisión. Marca la opción para armar la tabla desde esa fecha.";
  }
  if (preview?.error) return preview.error;
  if (!rows?.length) return "Completa el plazo y las fechas para armar la tabla.";
  return "";
}

function SummaryCard({ title, amount, color, subtitle, integer = false }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: "100%" }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h5" fontWeight={800} color={color}>
        {integer ? Number(amount || 0).toLocaleString("es-EC") : money(amount)}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}

export default function LoansDebtsPage() {
  const { toast, user } = useAuth();
  const { settings, setSettings } = useAppSettings();
  const maxPlazos = normalizeMaxInstallments(settings?.maxInstallments);
  const isPrivileged =
    user?.loginRol === "Administrador" || user?.loginRol === "Propietario" || user?.loginRol === "Programador";
  const purgeOn = settings?.allowLoanFinancePurge === true && isPrivileged;
  const [view, setView] = useState("calendar");
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [tab, setTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalReceivable: 0, totalPayable: 0, openCount: 0 });
  const [obligations, setObligations] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm());
  const [scheduleEdits, setScheduleEdits] = useState({});
  const frenchPreview = useMemo(() => {
    if (!createForm.french) return { rows: [], totals: null };
    return buildFrenchAmortization({
      principal: createForm.amount,
      annualRatePercent: createForm.annualRate,
      months: createForm.months,
      issueDate: toDateOnly(createForm.openDate),
      firstDueDate: createForm.firstDueDate,
      insurancePerMil: createForm.insurancePerMil || 0,
      firePerMil: createForm.firePerMil || 0,
      markPastAsMovement: createForm.markPastMovements,
      today: todayKey(),
    });
  }, [createForm]);
  const frenchRows = useMemo(() => {
    const today = todayKey();
    return applyScheduleEdits(frenchPreview.rows, scheduleEdits).map((row) => {
      if (!createForm.markPastMovements) return { ...row, historical: false };
      return { ...row, historical: String(row.dueDate || "") < today };
    });
  }, [frenchPreview, scheduleEdits, createForm.markPastMovements]);
  const frenchTotals = useMemo(() => {
    if (!frenchRows.length) return frenchPreview.totals;
    const interest = money2(frenchRows.reduce((sum, row) => sum + Number(row.interest || 0), 0));
    const seguro = money2(frenchRows.reduce((sum, row) => sum + Number(row.seguroDesgravamen || 0), 0));
    const dividendos = money2(frenchRows.reduce((sum, row) => sum + Number(row.dividendo ?? row.amount ?? 0), 0));
    return {
      interest,
      seguro,
      dividendos,
      cargaFinanciera: money2(dividendos - Number(createForm.amount || 0)),
    };
  }, [frenchRows, frenchPreview.totals, createForm.amount]);
  useEffect(() => {
    setScheduleEdits({});
  }, [
    createForm.amount,
    createForm.annualRate,
    createForm.months,
    createForm.firstDueDate,
    createForm.openDate,
    createForm.insurancePerMil,
    createForm.firePerMil,
    createForm.markPastMovements,
    createForm.french,
  ]);
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", date: "", method: "efectivo", note: "" });

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelRow, setCancelRow] = useState(null);
  const [cancelStep, setCancelStep] = useState("confirm");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editCellEdits, setEditCellEdits] = useState({});
  const [editDirty, setEditDirty] = useState(false);

  const canCancelObligation = useCallback((row) => {
    if (row?.status !== "open" && row?.status !== "closed") return false;
    if (Number(row?.paid || 0) <= 0) return row?.status === "open";
    return isPrivileged;
  }, [isPrivileged]);

  const openDetail = (row) => {
    setSelected(row);
    setDetailOpen(true);
  };

  const openPay = (row) => {
    const cuota = nextOpenInstallment(row);
    const cuotaAmount = Number(cuota?.remainingAmount ?? 0);
    setSelected(row);
    setPayTarget(cuota);
    setPayForm({
      amount: cuotaAmount > 0 ? String(cuotaAmount) : "",
      date: nowLocalDateTime(),
      method: "efectivo",
      note: cuota ? `Cuota ${cuota.sequence}` : "",
    });
    setPayOpen(true);
  };

  const openCancelDialog = useCallback((row) => {
    const hasPayments = Number(row?.paid || 0) > 0;
    setCancelStep(hasPayments && settings?.allowLoanFinancePurge !== true ? "activate" : "confirm");
    setCancelRow(row);
    setCancelOpen(true);
  }, [settings?.allowLoanFinancePurge]);

  const closeCancelDialog = () => {
    setCancelOpen(false);
    setCancelRow(null);
    setCancelStep("confirm");
  };

  const activateLoanPurge = async () => {
    setSaving(true);
    try {
      const patch = { allowLoanFinancePurge: true };
      setSettings({ ...(settings || {}), ...patch });
      const data = await updateAppSettings(patch);
      if (data?.settings) setSettings(data.settings);
      else setSettings({ ...(settings || {}), ...patch, allowLoanFinancePurge: true });
      setCancelStep("confirm");
      toast({
        message: "Opción activada. Confirma si deseas borrar este préstamo de las sumas de finanzas.",
        variant: "success",
      });
    } catch (e) {
      console.error(e);
      toast({ message: "No se pudo activar la opción", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (tab === "receivable" || tab === "payable") params.direction = tab;
      if (statusFilter !== "all") params.status = statusFilter;
      if (search.trim()) params.q = search.trim();

      const [wbRes, custRes] = await Promise.all([
        getObligationsWorkbenchRequest(params),
        getAllCustomersRequest(),
      ]);
      setSummary(wbRes.data?.summary || { totalReceivable: 0, totalPayable: 0, openCount: 0 });
      setObligations(Array.isArray(wbRes.data?.obligations) ? wbRes.data.obligations : []);
      setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
    } catch (e) {
      console.error(e);
      toast({ message: "Error al cargar préstamos", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, search, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmCancel = async () => {
    if (!cancelRow?.id) return;
    setSaving(true);
    try {
      await runMutationReload(toast, {
        promise: cancelObligationRequest(cancelRow.id),
        reload: load,
        onClose: () => {
          closeCancelDialog();
          setDetailOpen(false);
          setSelected(null);
        },
        successMessage:
          Number(cancelRow.paid || 0) > 0
            ? "Préstamo borrado. Los abonos quedaron en Movimientos en cero y se creó el detalle."
            : "Obligación anulada y movimiento eliminado de finanzas",
      });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = useCallback((row) => {
    const terms = readLoanTerms(row.loanTerms);
    const rows = installmentRowsOf(row).map((item) => ({
      ...item,
      dividendo: item.dividendo ?? item.amount,
    }));
    const first = rows[0] || {};
    const capital = Number(first.capitalReducido);
    const seguro = Number(first.seguroDesgravamen);
    const inferredPerMil =
      capital > 0 && Number.isFinite(seguro)
        ? String(Math.round((seguro / capital) * 1000000) / 1000)
        : "";
    const unpaid = Number(row.paid || 0) <= 0.009;
    setEditCellEdits({});
    setEditDirty(false);
    setEditForm({
      id: row.id,
      direction: row.direction,
      partyType: row.partyType,
      partyName: row.partyName || "",
      concept: row.concept || "",
      note: row.note || "",
      labelColor: row.labelColor || DEFAULT_LOAN_COLOR,
      amount: row.originalAmount == null ? "" : String(row.originalAmount),
      paid: Number(row.paid || 0),
      openDate: toDateOnly(terms.issueDate || row.openDate) || "",
      annualRate: terms.annualRate == null && first.tasa == null ? "" : String(terms.annualRate ?? first.tasa),
      tea: terms.tea == null ? "" : String(terms.tea),
      annualCost: terms.annualCost == null ? "" : String(terms.annualCost),
      mora: terms.mora == null ? "" : String(terms.mora),
      months: String(terms.months ?? (rows.length || "")),
      firstDueDate: toDateOnly(terms.firstDueDate || first.dueDate) || "",
      insurancePerMil: terms.insurancePerMil == null ? inferredPerMil : String(terms.insurancePerMil),
      firePerMil: terms.firePerMil == null ? "0" : String(terms.firePerMil),
      solca: terms.solca == null ? "" : String(terms.solca),
      markPastMovements: Boolean(terms.includeHistoricalMovements) || rows.some((item) => item.historical),
      french: rows.some((item) => item.capitalReducido != null) || terms.kind === "french",
      locked: !unpaid,
      rows,
    });
    setEditOpen(true);
  }, []);

  const editCanRecalc = Boolean(editForm?.french && !editForm?.locked);
  const editPreview = useMemo(() => {
    if (!editCanRecalc) return { rows: [], totals: null };
    return buildFrenchAmortization({
      principal: editForm.amount,
      annualRatePercent: editForm.annualRate,
      months: editForm.months,
      issueDate: editForm.openDate,
      firstDueDate: editForm.firstDueDate,
      insurancePerMil: editForm.insurancePerMil || 0,
      firePerMil: editForm.firePerMil || 0,
      markPastAsMovement: editForm.markPastMovements,
      today: todayKey(),
    });
  }, [editCanRecalc, editForm]);
  const editLiveRows = useMemo(() => {
    if (!editForm) return [];
    if (!editCanRecalc || !editDirty) return editForm.rows || [];
    const today = todayKey();
    return applyScheduleEdits(editPreview.rows, editCellEdits).map((row) => {
      if (!editForm.markPastMovements) return { ...row, historical: false };
      return { ...row, historical: String(row.dueDate || "") < today };
    });
  }, [editCanRecalc, editDirty, editForm, editPreview, editCellEdits]);
  const editFormulaKey = editCanRecalc
    ? [
        editForm.amount,
        editForm.annualRate,
        editForm.months,
        editForm.firstDueDate,
        editForm.openDate,
        editForm.insurancePerMil,
        editForm.firePerMil,
        editForm.markPastMovements,
      ].join("|")
    : "";
  useEffect(() => {
    setEditCellEdits({});
  }, [editFormulaKey]);

  const columns = useMemo(
    () => [
      {
        id: "openDate",
        label: "Fecha",
        render: (row) => formatDateTime(row.openDate),
      },
      {
        id: "direction",
        label: "Tipo",
        render: (row) => (
          <Chip
            size="small"
            color={row.direction === "receivable" ? "info" : "secondary"}
            label={row.direction === "receivable" ? "Que doy" : "Que recibo"}
          />
        ),
      },
      { id: "partyName", label: "Persona", render: (row) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: row.labelColor || DEFAULT_LOAN_COLOR, flexShrink: 0 }} />
          <span>{row.partyName}</span>
        </Stack>
      ), getSearchValue: (row) => row.partyName || "" },
      {
        id: "partyType",
        label: "Rol",
        render: (row) => row.partyTypeLabel || row.partyType,
      },
      { id: "concept", label: "Concepto" },
      {
        id: "plazos",
        label: "Plazos",
        render: (row) => {
          const rows = installmentRowsOf(row);
          const next = nextOpenInstallment(row);
          if (!rows.length) return "—";
          return next
            ? `${rows.length} · próx. ${next.dueDate}`
            : `${rows.length} · al día`;
        },
      },
      { id: "total", label: "Monto", render: (row) => money(row.total) },
      { id: "paid", label: "Abonado", render: (row) => money(row.paid) },
      {
        id: "remaining",
        label: "Saldo",
        render: (row) => <Typography fontWeight={700}>{money(row.remaining)}</Typography>,
      },
      {
        id: "status",
        label: "Estado",
        render: (row) => {
          const cfg = STATUS_CHIP[row.status] || STATUS_CHIP.open;
          return <Chip size="small" color={cfg.color} label={cfg.label} />;
        },
      },
      {
        id: "actions",
        label: "",
        render: (row) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Ver detalle">
              <IconButton size="small" onClick={() => openDetail(row)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {row.status !== "cancelled" && (
              <Tooltip title="Editar">
                <IconButton size="small" onClick={() => openEdit(row)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {row.status === "open" && row.remaining > 0 && (
              <Tooltip title={row.direction === "receivable" ? "Registrar cobro" : "Registrar pago"}>
                <IconButton size="small" color="primary" onClick={() => openPay(row)}>
                  <PaymentsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canCancelObligation(row) && (
              <Tooltip
                title={
                  Number(row.paid || 0) > 0
                    ? "Borrar préstamo y anular esos ingresos o egresos"
                    : "Anular y quitar de finanzas"
                }
              >
                <IconButton size="small" color="error" onClick={() => openCancelDialog(row)}>
                  <MoneyOffIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ),
      },
    ],
    [canCancelObligation, openEdit, openCancelDialog]
  );

  // Columnas Préstamos → app_settings.tableColumnVisibility (BD)
  const {
    visibleColumns,
    hiddenIds,
    requiredIds,
    toggleColumn,
  } = useTableColumnVisibility("prestamos", columns);

  const calendarEvents = useMemo(() => {
    const today = todayKey();
    const events = [];
    for (const row of obligations) {
      const name = row.partyName || row.counterpartyName || "Préstamo";
      for (const item of installmentRowsOf(row)) {
        events.push({
          id: `${row.id}-${item.sequence}`,
          date: item.dueDate,
          title: name,
          amountLabel: item.historical
            ? "Movimiento"
            : item.isPaid
              ? "Pagado"
              : money(item.remainingAmount),
          direction: row.direction,
          color: row.labelColor || DEFAULT_LOAN_COLOR,
          overdue: !item.historical && !item.isPaid && item.dueDate < today,
          paid: Boolean(item.isPaid) && !item.historical,
          obligation: row,
        });
      }
    }
    return events;
  }, [obligations]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const usingFrench = createForm.french && frenchRows.length > 0;
      const schedule = usingFrench
        ? frenchRows.map((row) => ({
            dueDate: row.dueDate,
            amount: row.dividendo,
            capitalReducido: row.capitalReducido,
            interest: row.interest,
            capitalCuota: row.capitalCuota,
            seguroDesgravamen: row.seguroDesgravamen,
            seguroIncendio: row.seguroIncendio,
            tasa: row.tasa,
            historical: Boolean(row.historical),
          }))
        : createForm.installments?.length
          ? normalizeScheduleForApi(createForm.installments)
          : createForm.dueDate
            ? [{ dueDate: toDateOnly(createForm.dueDate), amount: Number(createForm.amount) }]
            : [];
      const payload = {
        direction: createForm.direction,
        partyType: createForm.partyType,
        partyName: createForm.partyType === "customer" ? undefined : createForm.partyName.trim(),
        customerId: createForm.partyType === "customer" ? Number(createForm.customerId) : null,
        concept: createForm.concept.trim(),
        labelColor: createForm.labelColor,
        amount: Number(createForm.amount),
        openDate: createForm.openDate,
        dueDate: schedule.at(-1)?.dueDate || createForm.dueDate || null,
        note: createForm.note || null,
        installments: schedule,
        amortizationFrench: usingFrench,
        loanTerms: usingFrench
          ? {
              kind: "french",
              annualRate: Number(createForm.annualRate),
              tea: createForm.tea === "" ? null : Number(createForm.tea),
              annualCost: createForm.annualCost === "" ? null : Number(createForm.annualCost),
              mora: createForm.mora === "" ? null : Number(createForm.mora),
              months: Math.floor(Number(createForm.months)),
              issueDate: toDateOnly(createForm.openDate),
              firstDueDate: createForm.firstDueDate,
              insurancePerMil: Number(createForm.insurancePerMil || 0),
              firePerMil: Number(createForm.firePerMil || 0),
              solca: Number(createForm.solca || 0),
              daysBasis: 360,
              includeHistoricalMovements: Boolean(createForm.markPastMovements),
              skipOpeningFinance: Boolean(
                createForm.markPastMovements && toDateOnly(createForm.openDate) < todayKey(),
              ),
            }
          : null,
      };
      await runMutationReload(toast, {
        promise: createObligationRequest(payload),
        reload: load,
        onClose: () => {
          setCreateOpen(false);
          setCreateForm(emptyCreateForm());
          setScheduleEdits({});
        },
        successMessage: (() => {
          const pastCount = usingFrench
            ? frenchRows.filter((row) => row.historical).length
            : 0;
          if (pastCount > 0) {
            const financeSkipped = toDateOnly(createForm.openDate) < todayKey();
            return financeSkipped
              ? `${pastCount} cuota(s) anteriores a hoy quedaron como movimiento. Ese capital no se sumó en finanzas.`
              : `${pastCount} cuota(s) anteriores a hoy quedaron como movimiento y no entraron a finanzas.`;
          }
          return createForm.direction === "receivable"
            ? "Préstamo que das registrado (egreso en finanzas)"
            : "Préstamo que recibes registrado (ingreso en finanzas)";
        })(),
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selected?.id || !payTarget) return;
    const cuotaAmount = Number(payTarget.remainingAmount || 0);
    const amount = Number(payForm.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > cuotaAmount + 0.009) {
      toast?.({
        message: "El monto tiene que ser el de esta cuota, o menor si es un abono parcial.",
        variant: "error",
      });
      return;
    }
    setSaving(true);
    try {
      await runMutationReload(toast, {
        promise: payObligationRequest(selected.id, {
          amount,
          date: payForm.date,
          method: payForm.method,
          note: payForm.note || null,
        }),
        reload: load,
        onClose: () => {
          setPayOpen(false);
          setDetailOpen(false);
          setSelected(null);
          setPayTarget(null);
        },
        successMessage:
          selected.direction === "receivable"
            ? "Cobro de la cuota registrado como ingreso"
            : "Pago de la cuota registrado como egreso",
      });
    } finally {
      setSaving(false);
    }
  };

  const openCreateWithDirection = (direction) => {
    setCreateForm({ ...emptyCreateForm(), direction });
    setScheduleEdits({});
    setCreateOpen(true);
  };

  const changeEditTerm = (patch) => {
    setEditDirty(true);
    setEditForm((form) => (form ? { ...form, ...patch } : form));
  };

  const patchEditRow = (sequence, field, value) => {
    setEditForm((form) => {
      if (!form) return form;
      return {
        ...form,
        rows: form.rows.map((row) => {
          if (row.sequence !== sequence) return row;
          const next = { ...row, [field]: value };
          if (field === "dividendo") next.amount = value;
          if (field === "amount") next.dividendo = value;
          return next;
        }),
      };
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm?.id) return;
    const source = editCanRecalc ? editLiveRows : editForm.rows;
    const installments = source.map((row) => ({
      dueDate: toDateOnly(row.dueDate),
      amount: money2(row.dividendo ?? row.amount),
      capitalReducido: row.capitalReducido === "" || row.capitalReducido == null ? undefined : money2(row.capitalReducido),
      interest: row.interest === "" || row.interest == null ? undefined : money2(row.interest),
      capitalCuota: row.capitalCuota === "" || row.capitalCuota == null ? undefined : money2(row.capitalCuota),
      seguroDesgravamen: row.seguroDesgravamen === "" || row.seguroDesgravamen == null ? undefined : money2(row.seguroDesgravamen),
      seguroIncendio: row.seguroIncendio === "" || row.seguroIncendio == null ? undefined : money2(row.seguroIncendio),
      tasa: row.tasa === "" || row.tasa == null ? undefined : Number(row.tasa),
      historical: Boolean(row.historical),
    }));
    setSaving(true);
    try {
      await runMutationReload(toast, {
        promise: updateObligationRequest(editForm.id, {
          partyName: editForm.partyType === "customer" ? undefined : editForm.partyName.trim(),
          concept: editForm.concept.trim(),
          labelColor: editForm.labelColor,
          note: editForm.note,
          amount: Number(editForm.amount),
          openDate: editCanRecalc ? editForm.openDate : undefined,
          installments,
          amortizationFrench: editForm.french,
          loanTerms: editCanRecalc
            ? {
                kind: "french",
                annualRate: Number(editForm.annualRate),
                tea: editForm.tea === "" ? null : Number(editForm.tea),
                annualCost: editForm.annualCost === "" ? null : Number(editForm.annualCost),
                mora: editForm.mora === "" ? null : Number(editForm.mora),
                months: Math.floor(Number(editForm.months)),
                issueDate: editForm.openDate,
                firstDueDate: editForm.firstDueDate,
                insurancePerMil: Number(editForm.insurancePerMil || 0),
                firePerMil: Number(editForm.firePerMil || 0),
                solca: Number(editForm.solca || 0),
                daysBasis: 360,
                includeHistoricalMovements: Boolean(editForm.markPastMovements),
                skipOpeningFinance: Boolean(
                  editForm.markPastMovements && editForm.openDate < todayKey(),
                ),
              }
            : undefined,
        }),
        reload: load,
        onClose: () => {
          setEditOpen(false);
          setEditForm(null);
          setEditCellEdits({});
          setDetailOpen(false);
          setSelected(null);
        },
        successMessage: "Préstamo actualizado",
      });
    } finally {
      setSaving(false);
    }
  };

  const createFrenchReason = createForm.french
    ? frenchSaveReason({
        rate: createForm.annualRate,
        months: createForm.months,
        maxPlazos,
        preview: frenchPreview,
        rows: frenchRows,
        markPast: createForm.markPastMovements,
      })
    : "";
  const editFrenchReason =
    editForm?.french && editDirty && editCanRecalc
      ? frenchSaveReason({
          rate: editForm.annualRate,
          months: editForm.months,
          maxPlazos,
          preview: editPreview,
          rows: editLiveRows,
          markPast: editForm.markPastMovements,
        })
      : "";

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <AccountBalanceWalletIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Préstamos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Los que das y los que recibes, con plazos en el calendario.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openCreateWithDirection("receivable")}>
            Préstamo que doy
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreateWithDirection("payable")}>
            Préstamo que recibo
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Que das:</strong> al prestar sale un <em>egreso</em>; al cobrar, un <em>ingreso</em>.
        {" "}
        <strong>Que recibes:</strong> al recibir entra un <em>ingreso</em>; al pagar, un <em>egreso</em>.
        El crédito de ventas sigue en Caja, Pedidos y Cobranzas.
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <SummaryCard
            title="Total por cobrar"
            amount={summary.totalReceivable}
            color="info.main"
            subtitle="Préstamos que diste"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <SummaryCard
            title="Total por pagar"
            amount={summary.totalPayable}
            color="secondary.main"
            subtitle="Préstamos que recibiste"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <SummaryCard
            title="Cuentas abiertas"
            amount={summary.openCount}
            color="text.primary"
            subtitle="Préstamos activos"
            integer
          />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 3, mb: 2, overflow: "hidden" }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab value="all" label="Todas" />
          <Tab value="receivable" label="Que doy" />
          <Tab value="payable" label="Que recibo" />
        </Tabs>
      </Paper>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Buscar persona o concepto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Estado</InputLabel>
          <Select value={statusFilter} label="Estado" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="open">Abiertos</MenuItem>
            <MenuItem value="closed">Saldados</MenuItem>
            <MenuItem value="cancelled">Anulados</MenuItem>
            <MenuItem value="all">Todos</MenuItem>
          </Select>
        </FormControl>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          onChange={(_, next) => {
            if (next) setView(next);
          }}
        >
          <ToggleButton value="calendar">
            <CalendarMonthIcon fontSize="small" sx={{ mr: 0.5 }} />
            Calendario
          </ToggleButton>
          <ToggleButton value="table">
            <TableRowsIcon fontSize="small" sx={{ mr: 0.5 }} />
            Tabla
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {view === "calendar" ? (
        <LoansCalendar
          monthDate={monthDate}
          onMonthChange={setMonthDate}
          events={calendarEvents}
          onSelect={(ev) => openDetail(ev.obligation)}
        />
      ) : (
        <TablePro
          rows={obligations}
          columns={visibleColumns}
          toolbarExtra={
            <TableColumnVisibilityControl
              tableKey="prestamos"
              hiddenIds={hiddenIds}
              requiredIds={requiredIds}
              onToggle={toggleColumn}
            />
          }
          showSearch={false}
          defaultRowsPerPage={10}
          tableMaxHeight="none"
          loading={loading}
        />
      )}

      {/* Crear */}
      <SimpleDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={createForm.direction === "receivable" ? "Préstamo que doy" : "Préstamo que recibo"}
        maxWidth={createForm.french ? "xl" : "md"}
        fullWidth
        paperSx={
          createForm.french
            ? { height: "92vh", display: "flex", flexDirection: "column" }
            : undefined
        }
        contentSx={
          createForm.french
            ? { display: "flex", flexDirection: "column", overflow: "hidden", flex: "1 1 auto", minHeight: 0, py: 1 }
            : { py: 1 }
        }
        actions={
          <>
            <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              type="submit"
              form="loan-create-form"
              variant="contained"
              disabled={
                saving ||
                Boolean(createFrenchReason) ||
                (!createForm.french &&
                  createForm.split &&
                  (createForm.installments.length < 2 ||
                    Math.abs(money2(createForm.amount) - sumInstallmentAmounts(createForm.installments)) > 0.009))
              }
            >
              Guardar
            </Button>
          </>
        }
      >
        <Box
          component="form"
          id="loan-create-form"
          onSubmit={handleCreate}
          sx={
            createForm.french
              ? { display: "flex", flexDirection: "column", minHeight: 0, flex: 1, gap: 1 }
              : undefined
          }
        >
          <Stack spacing={1} sx={{ flexShrink: 0 }}>
            <Alert severity="warning" icon={false} sx={{ py: 0 }}>
              {createForm.direction === "receivable"
                ? "Se registrará un egreso en finanzas (salió el dinero)."
                : "Se registrará un ingreso en finanzas (entró el dinero)."}
            </Alert>

            <Grid container spacing={1}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de persona</InputLabel>
                  <Select
                    value={createForm.partyType}
                    label="Tipo de persona"
                    onChange={(e) => setCreateForm((f) => ({ ...f, partyType: e.target.value }))}
                  >
                    {PARTY_TYPES.map((p) => (
                      <MenuItem key={p.value} value={p.value}>
                        {p.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {createForm.partyType === "customer" ? (
                  <FormControl fullWidth size="small" required>
                    <InputLabel>Cliente</InputLabel>
                    <Select
                      value={createForm.customerId}
                      label="Cliente"
                      onChange={(e) => setCreateForm((f) => ({ ...f, customerId: e.target.value }))}
                    >
                      {customers.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    label="Nombre"
                    size="small"
                    required
                    fullWidth
                    value={createForm.partyName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, partyName: e.target.value }))}
                  />
                )}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Concepto"
                  size="small"
                  fullWidth
                  value={createForm.concept}
                  onChange={(e) => setCreateForm((f) => ({ ...f, concept: e.target.value }))}
                  placeholder="Adelanto, préstamo..."
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Monto del capital"
                  type="number"
                  size="small"
                  required
                  fullWidth
                  inputProps={{ min: 0.01, step: 0.01 }}
                  value={createForm.amount}
                  onChange={(e) => setCreateForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </Grid>
            </Grid>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between">
              <LoanColorPicker
                value={createForm.labelColor}
                onChange={(color) => setCreateForm((f) => ({ ...f, labelColor: color }))}
              />
              <FormControlLabel
                sx={{ mr: 0 }}
                control={
                  <Checkbox
                    checked={createForm.french}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        french: e.target.checked,
                        split: e.target.checked ? false : f.split,
                      }))
                    }
                  />
                }
                label="Tabla de amortización francesa"
              />
            </Stack>

            {createForm.french && (
              <Stack spacing={1}>
                <Alert severity="info" icon={false} sx={{ py: 0 }}>
                  El interés de cada cuota usa los días reales entre fechas. Puedes corregir cualquier celda de la tabla.
                </Alert>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField
                    label="Fecha de emisión"
                    type="date"
                    size="small"
                    required
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={toDateOnly(createForm.openDate) || ""}
                    onChange={(e) => {
                      const date = e.target.value;
                      const time = String(createForm.openDate || "").slice(11, 16) || "00:00";
                      setCreateForm((f) => ({ ...f, openDate: date ? `${date}T${time}` : f.openDate }));
                    }}
                  />
                  <TextField
                    label="Interés TIR %"
                    type="number"
                    size="small"
                    required
                    fullWidth
                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                    value={createForm.annualRate}
                    onChange={(e) => setCreateForm((f) => ({ ...f, annualRate: e.target.value }))}
                  />
                  <TextField
                    label="Interés TEA %"
                    type="number"
                    size="small"
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                    value={createForm.tea}
                    onChange={(e) => setCreateForm((f) => ({ ...f, tea: e.target.value }))}
                  />
                  <TextField
                    label="Tasa anual de costo %"
                    type="number"
                    size="small"
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                    value={createForm.annualCost}
                    onChange={(e) => setCreateForm((f) => ({ ...f, annualCost: e.target.value }))}
                  />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField
                    label="Mora %"
                    type="number"
                    size="small"
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                    value={createForm.mora}
                    onChange={(e) => setCreateForm((f) => ({ ...f, mora: e.target.value }))}
                  />
                  <TextField
                    label="Plazo (meses)"
                    type="number"
                    size="small"
                    required
                    fullWidth
                    inputProps={{ min: 1, max: maxPlazos, step: 1 }}
                    value={createForm.months}
                    onChange={(e) => setCreateForm((f) => ({ ...f, months: e.target.value }))}
                  />
                  <TextField
                    label="Primera cuota"
                    type="date"
                    size="small"
                    required
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={createForm.firstDueDate}
                    onChange={(e) => setCreateForm((f) => ({ ...f, firstDueDate: e.target.value }))}
                  />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField
                    label="Prima desgravamen (por mil)"
                    type="number"
                    size="small"
                    fullWidth
                    inputProps={{ min: 0, step: 0.001 }}
                    value={createForm.insurancePerMil}
                    onChange={(e) => setCreateForm((f) => ({ ...f, insurancePerMil: e.target.value }))}
                  />
                  <TextField
                    label="Prima incendio/vehículo (por mil)"
                    type="number"
                    size="small"
                    fullWidth
                    inputProps={{ min: 0, step: 0.001 }}
                    value={createForm.firePerMil}
                    onChange={(e) => setCreateForm((f) => ({ ...f, firePerMil: e.target.value }))}
                  />
                  <TextField
                    label="SOLCA"
                    type="number"
                    size="small"
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                    value={createForm.solca}
                    onChange={(e) => setCreateForm((f) => ({ ...f, solca: e.target.value }))}
                  />
                </Stack>
                {createFrenchReason && <Alert severity="warning">{createFrenchReason}</Alert>}
                {(frenchPreview.beforeIssue ||
                  createForm.markPastMovements ||
                  frenchPreview.rows.some((row) => row.dueDate < todayKey())) && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={createForm.markPastMovements}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, markPastMovements: e.target.checked }))
                        }
                      />
                    }
                    label="¿Marcar también desde esas fechas? Las cuotas anteriores a hoy quedan como movimiento y no entran a finanzas."
                  />
                )}
                {frenchPreview.beforeIssue && !createForm.markPastMovements && (
                  <Alert severity="info">
                    La primera cuota es anterior a la fecha de emisión. Marcá la opción para armar la tabla desde esa fecha.
                  </Alert>
                )}
                {frenchTotals && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={`Suma cuotas ${money(frenchTotals.dividendos)}`} />
                    <Chip size="small" label={`Interés ${money(frenchTotals.interest)}`} />
                    <Chip size="small" label={`Seguro ${money(frenchTotals.seguro)}`} />
                    <Chip size="small" label={`Carga financiera ${money(frenchTotals.cargaFinanciera)}`} />
                    <Chip
                      size="small"
                      label={`Monto líquido ${money(Number(createForm.amount || 0) - Number(createForm.solca || 0))}`}
                    />
                  </Stack>
                )}
              </Stack>
            )}

            {!createForm.french && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  label="Fecha y hora"
                  type="datetime-local"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={createForm.openDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, openDate: e.target.value }))}
                />
                <TextField
                  label="Fecha del último plazo"
                  type="date"
                  size="small"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  value={toDateOnly(createForm.endDate || createForm.dueDate) || ""}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, endDate: e.target.value, dueDate: e.target.value }))
                  }
                />
              </Stack>
            )}

            {!createForm.french && (
            <>
            <FormControlLabel
              control={
                <Checkbox
                  checked={createForm.split}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      split: e.target.checked,
                      installments: e.target.checked ? f.installments : [],
                    }))
                  }
                />
              }
              label="Dividir en plazos"
            />

            {createForm.split && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <TextField
                  label="Número de plazos"
                  type="number"
                  size="small"
                  inputProps={{ min: 2, max: maxPlazos, step: 1 }}
                  helperText={`Máximo ${maxPlazos}. Se cambia en Configuración → Sistema.`}
                  value={createForm.installmentCount}
                  onChange={(e) => setCreateForm((f) => ({ ...f, installmentCount: e.target.value }))}
                  sx={{ width: { sm: 180 } }}
                />
                <Button
                  variant="outlined"
                  onClick={() => {
                    const count = Math.floor(Number(createForm.installmentCount) || 2);
                    if (count > maxPlazos) {
                      void toast?.({
                        message: `El máximo es ${maxPlazos} plazos. Se cambia en Configuración → Sistema.`,
                        variant: "warning",
                      });
                      return;
                    }
                    const start = toDateOnly(createForm.openDate);
                    const end = toDateOnly(createForm.endDate || createForm.dueDate) || start;
                    const rows = buildEqualInstallments({
                      startDate: start,
                      endDate: end,
                      count,
                      total: Number(createForm.amount),
                      maxCount: maxPlazos,
                    });
                    setCreateForm((f) => ({ ...f, installments: rows, endDate: end || f.endDate }));
                  }}
                >
                  Generar plazos
                </Button>
              </Stack>
            )}

            {createForm.installments.length > 0 && (
              <Stack spacing={1}>
                {plazosEnGrupos(createForm.installments).map((group, g) => {
                  const from = g * PLAZOS_POR_GRUPO;
                  const label = `Plazos ${from + 1}–${from + group.length}`;
                  const rango = `${toDateOnly(group[0]?.dueDate) || ""} a ${toDateOnly(group[group.length - 1]?.dueDate) || ""}`;
                  const fields = group.map((row, localIdx) => {
                    const idx = from + localIdx;
                    return (
                      <Stack key={`${row.sequence}-${idx}`} direction="row" spacing={1}>
                        <TextField
                          label={`Plazo ${idx + 1}`}
                          type="date"
                          size="small"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          value={toDateOnly(row.dueDate) || ""}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              installments: f.installments.map((item, i) =>
                                i === idx ? { ...item, dueDate: e.target.value } : item,
                              ),
                            }))
                          }
                        />
                        <TextField
                          label="Monto"
                          type="number"
                          size="small"
                          inputProps={{ min: 0.01, step: 0.01 }}
                          value={row.amount}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              installments: f.installments.map((item, i) =>
                                i === idx ? { ...item, amount: e.target.value } : item,
                              ),
                            }))
                          }
                          sx={{ width: 140 }}
                        />
                      </Stack>
                    );
                  });
                  if (createForm.installments.length <= PLAZOS_POR_GRUPO) {
                    return <Stack key={label} spacing={1}>{fields}</Stack>;
                  }
                  return (
                    <Accordion key={label} defaultExpanded={g === 0} disableGutters>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="body2" fontWeight={700}>
                          {label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          {rango}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Stack spacing={1}>{fields}</Stack>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
                {Math.abs(money2(createForm.amount) - sumInstallmentAmounts(createForm.installments)) > 0.009 && (
                  <Alert severity="warning">
                    La suma de plazos ({money(sumInstallmentAmounts(createForm.installments))}) no coincide con el monto ({money(createForm.amount)}).
                  </Alert>
                )}
              </Stack>
            )}
            </>
            )}

            <TextField
              label="Nota"
              size="small"
              fullWidth
              value={createForm.note}
              onChange={(e) => setCreateForm((f) => ({ ...f, note: e.target.value }))}
            />
          </Stack>
          {createForm.french && (
            <Box sx={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
              <AmortizationScheduleTable
                fill
                rows={frenchRows}
                editable
                edits={scheduleEdits}
                onEdit={(sequence, field, value) =>
                  setScheduleEdits((current) => ({
                    ...current,
                    [sequence]: { ...current[sequence], [field]: value },
                  }))
                }
              />
            </Box>
          )}
        </Box>
      </SimpleDialog>

      {/* Abonar */}
      <SimpleDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title={
          selected?.direction === "receivable"
            ? `Cobrar cuota ${payTarget?.sequence ?? ""} — ${selected?.partyName}`
            : `Pagar cuota ${payTarget?.sequence ?? ""} — ${selected?.partyName}`
        }
        maxWidth="xs"
        fullWidth
      >
        <Box component="form" onSubmit={handlePay} sx={{ p: 1 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Cuota {payTarget?.sequence} · {payTarget?.dueDate}:{" "}
              <strong>{money(payTarget?.remainingAmount)}</strong>
            </Typography>
            <Alert severity="info" icon={false}>
              {selected?.direction === "receivable"
                ? "Este monto se registra como ingreso en finanzas."
                : "Este monto se registra como egreso en finanzas."}
            </Alert>
            <TextField
              label="Monto de la cuota"
              type="number"
              size="small"
              required
              fullWidth
              inputProps={{ min: 0.01, step: 0.01, max: payTarget?.remainingAmount }}
              value={payForm.amount}
              onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <TextField
              label="Fecha y hora"
              type="datetime-local"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={payForm.date}
              onChange={(e) => setPayForm((f) => ({ ...f, date: e.target.value }))}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Método</InputLabel>
              <Select
                value={payForm.method}
                label="Método"
                onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
              >
                <MenuItem value="efectivo">Efectivo</MenuItem>
                <MenuItem value="transferencia">Transferencia</MenuItem>
                <MenuItem value="otro">Otro</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Nota"
              size="small"
              fullWidth
              value={payForm.note}
              onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))}
            />
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button onClick={() => setPayOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                Registrar
              </Button>
            </Stack>
          </Stack>
        </Box>
      </SimpleDialog>

      {/* Editar */}
      <SimpleDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar préstamo"
        maxWidth={editForm?.french ? "xl" : "md"}
        fullWidth
        paperSx={
          editForm?.french
            ? { height: "92vh", display: "flex", flexDirection: "column" }
            : undefined
        }
        contentSx={
          editForm?.french
            ? { display: "flex", flexDirection: "column", overflow: "hidden", flex: "1 1 auto", minHeight: 0, py: 1 }
            : { py: 1 }
        }
        actions={
          editForm ? (
            <>
              <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button
                type="submit"
                form="loan-edit-form"
                variant="contained"
                disabled={saving || Boolean(editFrenchReason)}
              >
                Guardar
              </Button>
            </>
          ) : null
        }
      >
        {editForm && (
          <Box
            component="form"
            id="loan-edit-form"
            onSubmit={handleSaveEdit}
            sx={
              editForm.french
                ? { display: "flex", flexDirection: "column", minHeight: 0, flex: 1, gap: 1 }
                : undefined
            }
          >
            <Stack spacing={1} sx={{ flexShrink: 0 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
              {editForm.partyType !== "customer" && (
                <TextField
                  label="Persona"
                  size="small"
                  required
                  fullWidth
                  value={editForm.partyName}
                  onChange={(e) => setEditForm((form) => ({ ...form, partyName: e.target.value }))}
                />
              )}
              <TextField
                label="Concepto"
                size="small"
                required
                fullWidth
                value={editForm.concept}
                onChange={(e) => setEditForm((form) => ({ ...form, concept: e.target.value }))}
              />
              <LoanColorPicker
                value={editForm.labelColor}
                onChange={(color) => setEditForm((form) => ({ ...form, labelColor: color }))}
              />
              </Stack>
              {editForm.french ? (
                <Box
                  component="fieldset"
                  disabled={Boolean(editForm.locked)}
                  sx={{ border: "none", p: 0, m: 0, minInlineSize: 0, display: "flex", flexDirection: "column", gap: 1 }}
                >
                  <Alert severity="info" icon={false} sx={{ py: 0 }}>
                    Si no hay pagos y cambias estos datos, la tabla y el movimiento de finanzas se recalculan.
                  </Alert>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <TextField
                      label="Capital"
                      type="number"
                      size="small"
                      required
                      fullWidth
                      inputProps={{ min: 0.01, step: 0.01 }}
                      value={editForm.amount}
                      onChange={(e) => changeEditTerm({ amount: e.target.value })}
                    />
                    <TextField
                      label="Fecha de emisión"
                      type="date"
                      size="small"
                      required
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={editForm.openDate || ""}
                      onChange={(e) => changeEditTerm({ openDate: e.target.value })}
                    />
                    <TextField
                      label="Interés TIR %"
                      type="number"
                      size="small"
                      required
                      fullWidth
                      inputProps={{ min: 0, max: 100, step: 0.01 }}
                      value={editForm.annualRate}
                      onChange={(e) => changeEditTerm({ annualRate: e.target.value })}
                    />
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <TextField
                      label="Interés TEA %"
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ min: 0, step: 0.01 }}
                      value={editForm.tea}
                      onChange={(e) => changeEditTerm({ tea: e.target.value })}
                    />
                    <TextField
                      label="Tasa anual de costo %"
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ min: 0, step: 0.01 }}
                      value={editForm.annualCost}
                      onChange={(e) => changeEditTerm({ annualCost: e.target.value })}
                    />
                    <TextField
                      label="Mora %"
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ min: 0, step: 0.01 }}
                      value={editForm.mora}
                      onChange={(e) => changeEditTerm({ mora: e.target.value })}
                    />
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <TextField
                      label="Plazo (meses)"
                      type="number"
                      size="small"
                      required
                      fullWidth
                      inputProps={{ min: 1, max: maxPlazos, step: 1 }}
                      value={editForm.months}
                      onChange={(e) => changeEditTerm({ months: e.target.value })}
                    />
                    <TextField
                      label="Primera cuota"
                      type="date"
                      size="small"
                      required
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={editForm.firstDueDate || ""}
                      onChange={(e) => changeEditTerm({ firstDueDate: e.target.value })}
                    />
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <TextField
                      label="Prima desgravamen (por mil)"
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ min: 0, step: 0.001 }}
                      value={editForm.insurancePerMil}
                      onChange={(e) => changeEditTerm({ insurancePerMil: e.target.value })}
                    />
                    <TextField
                      label="Prima incendio/vehículo (por mil)"
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ min: 0, step: 0.001 }}
                      value={editForm.firePerMil}
                      onChange={(e) => changeEditTerm({ firePerMil: e.target.value })}
                    />
                    <TextField
                      label="SOLCA"
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ min: 0, step: 0.01 }}
                      value={editForm.solca}
                      onChange={(e) => changeEditTerm({ solca: e.target.value })}
                    />
                  </Stack>
                  {(editPreview.beforeIssue ||
                    editForm.markPastMovements ||
                    editPreview.rows.some((row) => row.dueDate < todayKey())) && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={editForm.markPastMovements}
                          onChange={(e) =>
                            changeEditTerm({ markPastMovements: e.target.checked })
                          }
                        />
                      }
                      label="¿Marcar también desde esas fechas? Las cuotas anteriores a hoy quedan como movimiento y no entran a finanzas."
                    />
                  )}
                  {editPreview.beforeIssue && !editForm.markPastMovements && (
                    <Alert severity="info">
                      La primera cuota es anterior a la fecha de emisión. Marcá la opción para armar la tabla desde esa fecha.
                    </Alert>
                  )}
                  {editFrenchReason && <Alert severity="warning">{editFrenchReason}</Alert>}
                </Box>
              ) : (
                <TextField
                  label="Capital"
                  type="number"
                  size="small"
                  required
                  fullWidth
                  disabled={editForm.paid > 0.009}
                  helperText={
                    editForm.paid > 0.009
                      ? "Ya tiene pagos. El capital y la tabla calculada no se rearman."
                      : "Si no hay pagos, este monto también se actualiza en finanzas."
                  }
                  inputProps={{ min: 0.01, step: 0.01 }}
                  value={editForm.amount}
                  onChange={(e) => setEditForm((form) => ({ ...form, amount: e.target.value }))}
                />
              )}
              <TextField
                label="Nota"
                size="small"
                fullWidth
                value={editForm.note}
                onChange={(e) => setEditForm((form) => ({ ...form, note: e.target.value }))}
              />
            </Stack>
              {editForm.french ? (
                <Box sx={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
                <AmortizationScheduleTable
                  fill
                  rows={editLiveRows}
                  editable
                  edits={editDirty ? editCellEdits : undefined}
                  onEdit={
                    editDirty && editCanRecalc
                      ? (sequence, field, value) =>
                          setEditCellEdits((current) => ({
                            ...current,
                            [sequence]: { ...current[sequence], [field]: value },
                          }))
                      : patchEditRow
                  }
                  paidBySequence={
                    new Map(
                      editLiveRows.map((row) => [
                        row.sequence,
                        Boolean(row.isPaid) && !row.historical,
                      ]),
                    )
                  }
                />
                </Box>
              ) : (
                <Stack spacing={1} sx={{ maxHeight: 240, overflow: "auto", pr: 0.5 }}>
                  {editForm.rows.map((row) => (
                    <Stack key={row.sequence} direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <TextField
                        label={`Cuota ${row.sequence}`}
                        type="date"
                        size="small"
                        required
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={toDateOnly(row.dueDate) || ""}
                        onChange={(e) => patchEditRow(row.sequence, "dueDate", e.target.value)}
                      />
                      <TextField
                        label="Monto"
                        type="number"
                        size="small"
                        required
                        fullWidth
                        inputProps={{ min: 0.01, step: 0.01 }}
                        value={row.amount}
                        onChange={(e) => patchEditRow(row.sequence, "amount", e.target.value)}
                      />
                    </Stack>
                  ))}
                </Stack>
              )}
          </Box>
        )}
      </SimpleDialog>

      {/* Detalle */}
      <SimpleDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selected ? `${selected.partyName} — ${selected.concept}` : "Detalle"}
        maxWidth="lg"
        fullWidth
      >
        {selected && (
          <Stack spacing={2} sx={{ p: 1 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                color={selected.direction === "receivable" ? "info" : "secondary"}
                label={selected.direction === "receivable" ? "Que doy" : "Que recibo"}
              />
              <Chip size="small" label={selected.partyTypeLabel} />
              <Chip
                size="small"
                color={(STATUS_CHIP[selected.status] || STATUS_CHIP.open).color}
                label={(STATUS_CHIP[selected.status] || STATUS_CHIP.open).label}
              />
            </Stack>

            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  {Number(selected.originalAmount) > 0 &&
                  Math.abs(Number(selected.originalAmount) - Number(selected.total)) > 0.02
                    ? "Total de cuotas"
                    : "Monto"}
                </Typography>
                <Typography fontWeight={700}>{money(selected.total)}</Typography>
                {Number(selected.originalAmount) > 0 &&
                  Math.abs(Number(selected.originalAmount) - Number(selected.total)) > 0.02 && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Capital {money(selected.originalAmount)}
                    </Typography>
                  )}
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Abonado
                </Typography>
                <Typography fontWeight={700}>{money(selected.paid)}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Saldo
                </Typography>
                <Typography fontWeight={800} color="primary.main">
                  {money(selected.remaining)}
                </Typography>
              </Grid>
            </Grid>

            {selected.note && (
              <Typography variant="body2" color="text.secondary">
                {selected.note}
              </Typography>
            )}

            <Divider />

            <Typography variant="subtitle2" fontWeight={700}>
              Tabla de amortización
            </Typography>
            {installmentRowsOf(selected).some((item) => item.capitalReducido != null) ? (
              <AmortizationScheduleTable
                rows={installmentRowsOf(selected)}
                paidBySequence={
                  new Map(
                    installmentRowsOf(selected).map((item) => [item.sequence, Boolean(item.isPaid)]),
                  )
                }
              />
            ) : (
            <Stack spacing={1}>
              {plazosEnGrupos(installmentRowsOf(selected)).map((group, g) => {
                const from = g * PLAZOS_POR_GRUPO;
                const cards = group.map((item) => (
                  <Paper key={item.sequence} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          Plazo {item.sequence} · {item.dueDate}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {money(item.amount)}
                          {item.isPaid ? "" : ` · pendiente ${money(item.remainingAmount)}`}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        color={item.isPaid ? "success" : item.dueDate < todayKey() ? "error" : "warning"}
                        label={item.isPaid ? "Pagado" : item.dueDate < todayKey() ? "Vencido" : "Pendiente"}
                      />
                    </Stack>
                  </Paper>
                ));
                if (installmentRowsOf(selected).length <= PLAZOS_POR_GRUPO) {
                  return <Stack key={`detalle-${from}`} spacing={1}>{cards}</Stack>;
                }
                const pagados = group.filter((item) => item.isPaid).length;
                return (
                  <Accordion key={`detalle-${from}`} defaultExpanded={g === 0} disableGutters>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body2" fontWeight={700}>
                        Plazos {from + 1}–{from + group.length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {pagados} de {group.length} pagados
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={1}>{cards}</Stack>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Stack>
            )}

            <Divider />

            <Typography variant="subtitle2" fontWeight={700}>
              Historial de abonos
            </Typography>
            {(selected.payments || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin abonos todavía.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {selected.payments.map((p) => (
                  <Paper key={p.id} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDateTime(p.date)} — {money(p.amount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.method}
                          {p.note ? ` · ${p.note}` : ""}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={p.financeType === "income" ? "Ingreso" : "Egreso"}
                        color={p.financeType === "income" ? "success" : "warning"}
                        variant="outlined"
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}

            <Stack direction="row" justifyContent="flex-end" spacing={1} flexWrap="wrap">
              {selected.status === "open" && selected.remaining > 0 && (
                <Button variant="contained" startIcon={<PaymentsIcon />} onClick={() => openPay(selected)}>
                  {selected.direction === "receivable"
                    ? `Cobrar cuota ${nextOpenInstallment(selected)?.sequence ?? ""}`
                    : `Pagar cuota ${nextOpenInstallment(selected)?.sequence ?? ""}`}
                </Button>
              )}
              {selected.status !== "cancelled" && (
                <Button variant="outlined" startIcon={<EditIcon />} onClick={() => openEdit(selected)}>
                  Editar
                </Button>
              )}
              <Button variant="outlined" onClick={() => setDetailOpen(false)}>
                Cerrar
              </Button>
            </Stack>
          </Stack>
        )}
      </SimpleDialog>

      <SimpleDialog
        open={cancelOpen}
        onClose={closeCancelDialog}
        title={
          cancelStep === "activate"
            ? "Este préstamo ya tiene abonos"
            : Number(cancelRow?.paid || 0) > 0
              ? "¿Estás seguro? Se borra de finanzas, no de movimientos"
              : "Anular y quitar de finanzas"
        }
        maxWidth="sm"
        fullWidth
      >
        {cancelRow && cancelStep === "activate" && (
          <Stack spacing={2} sx={{ p: 1 }}>
            <Alert severity="warning">
              Sin abonos se puede borrar siempre. Con abonos solo si está activa la opción en Configuración → Sistema.
              ¿Deseas activarla?
            </Alert>
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button onClick={closeCancelDialog} disabled={saving}>No</Button>
              <Button variant="contained" onClick={activateLoanPurge} disabled={saving}>
                Sí, activarla
              </Button>
            </Stack>
          </Stack>
        )}
        {cancelRow && cancelStep === "confirm" && (
          <Stack spacing={2} sx={{ p: 1 }}>
            <Typography variant="body2">
              {Number(cancelRow.paid || 0) > 0 ? (
                <>
                  ¿Estás seguro de borrar el préstamo de <strong>{cancelRow.partyName}</strong>? Se quita de las sumas de finanzas, pero no de Movimientos. Se crea un movimiento que detalla estos abonos:
                </>
              ) : (
                <>
                  ¿Anular el{" "}
                  {cancelRow.direction === "receivable" ? "préstamo que das" : "préstamo que recibes"} de{" "}
                  <strong>{cancelRow.partyName}</strong>?
                </>
              )}
            </Typography>
            <Alert severity="warning">
              {Number(cancelRow.paid || 0) > 0 ? (
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  <li>
                    Al crear: {cancelRow.direction === "receivable" ? "egreso" : "ingreso"} de {money(cancelRow.originalAmount || cancelRow.total)}
                  </li>
                  {(cancelRow.payments || [])
                    .filter((p) => p.status !== "cancelled")
                    .map((p) => (
                      <li key={p.id}>
                        Abono {p.financeType === "income" ? "ingreso" : "egreso"} de {money(p.amount)}
                        {p.date ? ` · ${formatDateTime(p.date)}` : ""}
                        {p.note ? ` · ${p.note}` : ""}
                      </li>
                    ))}
                </Box>
              ) : cancelRow.direction === "receivable" ? (
                "Se eliminará el egreso registrado en finanzas al otorgar este préstamo. Solo es posible porque no tiene abonos."
              ) : (
                "Se eliminará el ingreso registrado en finanzas al recibir este préstamo. Solo es posible porque no tiene abonos."
              )}
            </Alert>
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button onClick={closeCancelDialog} disabled={saving}>
                No, volver
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<MoneyOffIcon />}
                onClick={confirmCancel}
                disabled={saving || (Number(cancelRow.paid || 0) > 0 && !purgeOn)}
              >
                Sí, {Number(cancelRow.paid || 0) > 0 ? "borrar" : "anular"}
              </Button>
            </Stack>
          </Stack>
        )}
      </SimpleDialog>
    </Container>
  );
}
