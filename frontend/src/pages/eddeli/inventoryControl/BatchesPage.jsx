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
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import {
  Edit,
  Delete,
  EventBusy,
  Add,
  WarningAmber,
} from "@mui/icons-material";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import BatchForm from "./components/BatchForm.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import TablePro from "../../../components/Tables/TablePro";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import {
  getBatchesRequest,
  getBatchesSummaryRequest,
  deleteBatchRequest,
  writeOffBatchRequest,
} from "../../../api/inventoryControlRequest";

const WARN_DAYS = 30;

const FILTERS = [
  { value: "open", label: "Con stock" },
  { value: "expired", label: "Vencidos" },
  { value: "expiring", label: "Por vencer" },
  { value: "depleted", label: "Agotados" },
  { value: "all", label: "Todos" },
];

function formatDate(iso) {
  if (!iso) return "—";
  const d = parseISO(String(iso).slice(0, 10));
  if (!isValid(d)) return String(iso).slice(0, 10);
  return format(d, "d MMM yyyy", { locale: es });
}

function statusChip(row) {
  if (row.depleted) return <Chip size="small" label="Agotado" variant="outlined" />;
  if (row.expired) return <Chip size="small" color="error" label="Vencido" />;
  if (row.expiring) return <Chip size="small" color="warning" label="Por vencer" />;
  return <Chip size="small" color="success" label="OK" variant="outlined" />;
}

function BatchesPage() {
  const { toast } = useAuth();
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

  const askDelete = (row) => {
    setTargetRow(row);
    setConfirmMode("delete");
    setConfirmOpen(true);
  };

  const runConfirm = async () => {
    if (!targetRow) return;
    const promise =
      confirmMode === "writeOff"
        ? writeOffBatchRequest(targetRow.id)
        : deleteBatchRequest(targetRow.id);
    await runMutationReload(toast, {
      promise,
      reload: fetchData,
      onClose: () => setConfirmOpen(false),
    });
  };

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
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          {!row.depleted && (
            <Tooltip title="Baja por caducidad">
              <IconButton size="small" color="warning" onClick={() => askWriteOff(row)}>
                <EventBusy fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {row.depleted && (
            <Tooltip title="Eliminar del historial">
              <IconButton size="small" color="error" onClick={() => askDelete(row)}>
                <Delete fontSize="small" />
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
            Registrá lotes al recibir mercadería. El stock del producto sube con cada lote.
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
        <Chip label={`Agotados: ${summary.depleted ?? 0}`} variant="outlined" size="small" />
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
        />
      </SimpleDialog>

      <SimpleDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={confirmMode === "writeOff" ? "Baja por caducidad" : "Eliminar lote"}
        maxWidth="xs"
      >
        <Typography variant="body2" sx={{ mb: 2 }}>
          {confirmMode === "writeOff"
            ? `Se descontará ${targetRow?.quantityRemaining ?? 0} del stock de «${targetRow?.productName}» con motivo caducado. El lote quedará en historial.`
            : `¿Eliminar el lote #${targetRow?.id} del historial?`}
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color={confirmMode === "writeOff" ? "warning" : "error"}
            onClick={runConfirm}
          >
            Confirmar
          </Button>
        </Stack>
      </SimpleDialog>
    </Container>
  );
}

export default BatchesPage;
