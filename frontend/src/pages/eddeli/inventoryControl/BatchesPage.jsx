import {
  Container,
  IconButton,
  Button,
  Tooltip,
  Typography,
  Stack,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Box,
  TextField,
  MenuItem,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Edit,
  Delete,
  EventBusy,
  Add,
  WarningAmber,
  LockOutlined,
  CallSplit,
} from "@mui/icons-material";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import BatchForm from "./components/BatchForm.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useAppSettings } from "../../../context/AppSettingsContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import TablePro from "../../../components/Tables/TablePro";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import {
  getBatchesRequest,
  getBatchesSummaryRequest,
  deleteBatchRequest,
  writeOffBatchRequest,
  closeBatchRequest,
  splitBatchRequest,
  getStoresRequest,
} from "../../../api/inventoryControlRequest";
import { storeHoldsInventory } from "../../../utils/storeLocationKind.js";

const WARN_DAYS = 30;

const FILTERS = [
  { value: "open", label: "Con stock" },
  { value: "expired", label: "Vencidos" },
  { value: "expiring", label: "Por vencer" },
  { value: "depleted", label: "Agotados / cerrados" },
  { value: "all", label: "Todos" },
];

function formatDate(iso) {
  if (!iso) return "—";
  const d = parseISO(String(iso).slice(0, 10));
  if (!isValid(d)) return String(iso).slice(0, 10);
  return format(d, "d MMM yyyy", { locale: es });
}

function statusChip(row) {
  if (row.depleted) return <Chip size="small" label="Cerrado" variant="outlined" />;
  if (row.expired) return <Chip size="small" color="error" label="Vencido" />;
  if (row.expiring) return <Chip size="small" color="warning" label="Por vencer" />;
  return <Chip size="small" color="success" label="OK" variant="outlined" />;
}

function BatchesPage() {
  const { toast } = useAuth();
  const { activeApp } = useAppSettings();
  const multiStockEnabled = Boolean(activeApp?.multiStockEnabled);

  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({
    active: 0,
    expiring: 0,
    expired: 0,
    depleted: 0,
    total: 0,
  });
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState(null);
  const [titleDialog, setTitleDialog] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState("delete");
  const [targetRow, setTargetRow] = useState(null);

  const [splitOpen, setSplitOpen] = useState(false);
  const [splitRow, setSplitRow] = useState(null);
  const [splitStores, setSplitStores] = useState([]);
  const [splitToStoreId, setSplitToStoreId] = useState("");
  const [splitQty, setSplitQty] = useState("");
  const [splitSaving, setSplitSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        getBatchesRequest({ alert: filter, warnDays: WARN_DAYS }),
        getBatchesSummaryRequest({ warnDays: WARN_DAYS }),
      ]);
      setData(Array.isArray(listRes.data) ? listRes.data : []);
      setSummary(sumRes.data || {});
    } catch (e) {
      console.error("BatchesPage:", e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setIsEditing(false);
    setDatos(null);
    setTitleDialog("Registrar lote");
    setOpenForm(true);
  };

  const openEdit = (row) => {
    setIsEditing(true);
    setDatos(row);
    setTitleDialog(`Editar lote #${row.id}`);
    setOpenForm(true);
  };

  const askWriteOff = (row) => {
    setTargetRow(row);
    setConfirmMode("writeOff");
    setConfirmOpen(true);
  };

  const askClose = (row) => {
    setTargetRow(row);
    setConfirmMode("close");
    setConfirmOpen(true);
  };

  const askDelete = (row) => {
    setTargetRow(row);
    setConfirmMode("delete");
    setConfirmOpen(true);
  };

  const openSplit = async (row) => {
    setSplitRow(row);
    const half = Number(row.quantityRemaining || 0) / 2;
    setSplitQty(half > 0 ? String(Number(half.toFixed(4))) : "");
    setSplitToStoreId("");
    setSplitOpen(true);
    try {
      const { data } = await getStoresRequest({ isActive: true });
      const list = (Array.isArray(data) ? data : []).filter((s) =>
        storeHoldsInventory(s.locationKind),
      );
      setSplitStores(list.filter((s) => Number(s.id) !== Number(row.storeId)));
    } catch {
      setSplitStores([]);
    }
  };

  const runConfirm = async () => {
    if (!targetRow) return;
    const promise =
      confirmMode === "writeOff"
        ? writeOffBatchRequest(targetRow.id)
        : confirmMode === "close"
          ? closeBatchRequest(targetRow.id)
          : deleteBatchRequest(targetRow.id);
    await runMutationReload(toast, {
      promise,
      reload: fetchData,
      onClose: () => setConfirmOpen(false),
    });
  };

  const runSplit = async () => {
    if (!splitRow) return;
    const qty = Number(splitQty);
    const toStoreId = Number(splitToStoreId);
    if (!toStoreId || !(qty > 0)) {
      void toast?.({ message: "Indicá local destino y cantidad.", variant: "warning" });
      return;
    }
    setSplitSaving(true);
    try {
      await runMutationReload(toast, {
        promise: splitBatchRequest(splitRow.id, { toStoreId, quantity: qty }),
        reload: fetchData,
        onClose: () => setSplitOpen(false),
        successMessage: "Lote dividido y stock trasladado",
      });
    } finally {
      setSplitSaving(false);
    }
  };

  const confirmTitle = useMemo(() => {
    if (confirmMode === "writeOff") return "Baja por caducidad";
    if (confirmMode === "close") return "Cerrar lote";
    return "Eliminar lote";
  }, [confirmMode]);

  const confirmBody = useMemo(() => {
    if (confirmMode === "writeOff") {
      return `Se descontará ${targetRow?.quantityRemaining ?? 0} del stock de «${targetRow?.productName}» con motivo caducado. El lote quedará cerrado.`;
    }
    if (confirmMode === "close") {
      return `¿Cerrar el lote #${targetRow?.id} (${targetRow?.productName})? Quedará en 0 / agotado. No se toca el stock del producto (ya se controla con las ventas).`;
    }
    return `¿Eliminar el lote #${targetRow?.id} (${targetRow?.productName})? Solo se borra el registro del lote. El producto y su stock no se tocan.`;
  }, [confirmMode, targetRow]);

  const columns = [
    {
      label: "Producto",
      id: "productName",
      render: (row) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {row.productName}
          </Typography>
          {row.code ? (
            <Typography variant="caption" color="text.secondary">
              Lote: {row.code}
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary">
              #{row.id}
            </Typography>
          )}
        </Box>
      ),
    },
    ...(multiStockEnabled
      ? [
          {
            label: "Local",
            id: "storeName",
            render: (row) => row.storeName || "—",
          },
        ]
      : []),
    {
      label: "Cantidad",
      id: "quantityRemaining",
      render: (row) => (
        <Typography variant="body2">
          {row.quantityRemaining}
          <Typography component="span" variant="caption" color="text.secondary">
            {" "}
            / {row.quantityInitial}
          </Typography>
        </Typography>
      ),
    },
    {
      label: "Elaboración",
      id: "manufacturedAt",
      render: (row) => formatDate(row.manufacturedAt) || "—",
    },
    {
      label: "Vence",
      id: "expiresAt",
      render: (row) => formatDate(row.expiresAt),
    },
    {
      label: "Duración",
      id: "shelfLifeDays",
      render: (row) =>
        row.shelfLifeDays != null ? `${row.shelfLifeDays} días` : "—",
    },
    {
      label: "Estado",
      id: "alert",
      render: (row) => statusChip(row),
    },
    {
      label: "Recibido",
      id: "receivedAt",
      render: (row) => formatDate(row.receivedAt),
    },
    {
      label: "Acciones",
      id: "actions",
      stopRowClick: true,
      getSearchValue: () => "",
      render: (row) => (
        <>
          <Tooltip title="Editar lote (fechas y cantidad)">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          {!row.depleted && (
            <Tooltip title="Cerrar lote (terminado / sin stock de lote)">
              <IconButton size="small" onClick={() => askClose(row)}>
                <LockOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {multiStockEnabled && !row.depleted && row.storeId && (
            <Tooltip title="Dividir lote hacia otro local">
              <IconButton size="small" color="primary" onClick={() => openSplit(row)}>
                <CallSplit fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Eliminar lote (no borra el producto)">
            <IconButton size="small" color="error" onClick={() => askDelete(row)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
          {!row.depleted && (
            <Tooltip title="Baja por caducidad (resta stock del producto)">
              <IconButton size="small" color="warning" onClick={() => askWriteOff(row)}>
                <EventBusy fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </>
      ),
    },
  ];

  return (
    <Container>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Lotes y vencimientos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Las ventas/salidas descuentan el lote (FEFO). Al llegar a 0 se cierra solo.
            {multiStockEnabled
              ? " Con multistock podés dividir un lote hacia otro local."
              : ""}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Registrar lote
        </Button>
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
        <Chip label={`OK: ${summary.active ?? 0}`} color="success" variant="outlined" size="small" />
        <Chip
          icon={<WarningAmber />}
          label={`Por vencer (${WARN_DAYS}d): ${summary.expiring ?? 0}`}
          color="warning"
          size="small"
        />
        <Chip label={`Vencidos: ${summary.expired ?? 0}`} color="error" size="small" />
        <Chip label={`Cerrados: ${summary.depleted ?? 0}`} variant="outlined" size="small" />
      </Stack>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={filter}
        onChange={(_, v) => v && setFilter(v)}
        sx={{ mb: 2, flexWrap: "wrap" }}
      >
        {FILTERS.map((f) => (
          <ToggleButton key={f.value} value={f.value} sx={{ textTransform: "none" }}>
            {f.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <TablePro
        rows={data}
        columns={columns}
        title="LOTES"
        showIndex
        defaultRowsPerPage={25}
        rowsPerPageOptions={[25, 50, 100]}
        loading={loading}
      />

      <SimpleDialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        title={titleDialog}
        maxWidth="sm"
      >
        <BatchForm
          isEditing={isEditing}
          datos={datos}
          onClose={() => setOpenForm(false)}
          reload={fetchData}
          multiStockEnabled={multiStockEnabled}
        />
      </SimpleDialog>

      <SimpleDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={confirmTitle}
        maxWidth="xs"
      >
        <Typography variant="body2" sx={{ mb: 2 }}>
          {confirmBody}
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color={
              confirmMode === "writeOff"
                ? "warning"
                : confirmMode === "close"
                  ? "primary"
                  : "error"
            }
            onClick={runConfirm}
          >
            Confirmar
          </Button>
        </Stack>
      </SimpleDialog>

      <SimpleDialog
        open={splitOpen}
        onClose={() => setSplitOpen(false)}
        title="Dividir lote a otro local"
        maxWidth="xs"
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Origen: <strong>{splitRow?.storeName || "—"}</strong> · restante{" "}
          <strong>{splitRow?.quantityRemaining ?? 0}</strong>. Se crea un lote nuevo con la misma
          fecha de vencimiento y se traslada el stock.
        </Typography>
        <TextField
          select
          fullWidth
          size="small"
          label="Local destino"
          value={splitToStoreId}
          onChange={(e) => setSplitToStoreId(e.target.value)}
          sx={{ mb: 1.5 }}
        >
          {splitStores.map((s) => (
            <MenuItem key={s.id} value={String(s.id)}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          size="small"
          type="number"
          label="Cantidad a mover"
          value={splitQty}
          onChange={(e) => setSplitQty(e.target.value)}
          inputProps={{ min: 0, step: "any" }}
          helperText="Por defecto la mitad del lote"
          sx={{ mb: 2 }}
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={() => setSplitOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={runSplit} disabled={splitSaving}>
            Dividir y trasladar
          </Button>
        </Stack>
      </SimpleDialog>
    </Container>
  );
}

export default BatchesPage;
