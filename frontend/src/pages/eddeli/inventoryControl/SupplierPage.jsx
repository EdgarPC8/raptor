import {
  Container,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Stack,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Edit, Delete, AddShoppingCart } from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";
import TablePro from "../../../components/Tables/TablePro";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import SupplierForm from "./components/SupplierForm";
import SupplierOrderForm, {
  SUPPLIER_ORDER_DIALOG_CONTENT_SX,
  SUPPLIER_ORDER_DIALOG_PAPER_SX,
} from "./components/SupplierOrderForm";
import {
  getAllSuppliersRequest,
  deleteSupplierRequest,
} from "../../../api/inventoryControlRequest";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import { formatSupplierDocument } from "../../../utils/supplierUtils.js";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const statusChip = (active) => (
  <Chip
    size="small"
    label={active !== false ? "Activo" : "Inactivo"}
    color={active !== false ? "success" : "default"}
    variant={active !== false ? "filled" : "outlined"}
  />
);

function SupplierPage() {
  const { toast } = useAuth();
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState([]);
  const [titleDialog, setTitleDialog] = useState("");
  const [loading, setLoading] = useState(true);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderPrefill, setOrderPrefill] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rows } = await getAllSuppliersRequest();
      setData(rows);
    } finally {
      setLoading(false);
    }
  };

  const handleDialog = () => setOpen(!open);
  const handleDialogForm = () => setOpenDialog(!openDialog);

  const openNewOrder = (supplier = null) => {
    setOrderPrefill(
      supplier
        ? {
            supplierId: supplier.id,
            supplierName: supplier.name,
            date: todayIso(),
          }
        : { date: todayIso() },
    );
    setOrderOpen(true);
  };

  const closeOrderDialog = () => {
    setOrderOpen(false);
    setOrderPrefill(null);
  };

  const deleteData = async () => {
    await runMutationReload(toast, {
      promise: deleteSupplierRequest(dataToDelete.id),
      reload: fetchData,
      onClose: handleDialog,
    });
  };

  const columns = [
    { label: "Nombre", id: "name", width: 180 },
    {
      label: "Documento",
      id: "identNumber",
      width: 160,
      render: (row) => formatSupplierDocument(row),
    },
    { label: "Teléfono", id: "phone", width: 120, render: (row) => row.phone || "—" },
    { label: "Correo", id: "email", width: 180, render: (row) => row.email || "—" },
    { label: "Ciudad", id: "city", width: 120, render: (row) => row.city || "—" },
    {
      label: "Estado",
      id: "isActive",
      width: 100,
      render: (row) => statusChip(row.isActive),
    },
    {
      label: "Acciones",
      id: "actions",
      width: 160,
      stopRowClick: true,
      render: (row) => (
        <>
          <Tooltip title="Nueva compra / pedido (XML o manual)">
            <IconButton
              color="primary"
              onClick={() => openNewOrder(row)}
              disabled={row.isActive === false}
            >
              <AddShoppingCart />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton
              onClick={() => {
                setDatos(row);
                setIsEditing(true);
                setTitleDialog("Editar proveedor");
                handleDialogForm();
              }}
            >
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton
              onClick={() => {
                setDataToDelete(row);
                handleDialog();
              }}
            >
              <Delete />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  useEffect(() => {
    void fetchData();
  }, []);

  return (
    <Container>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
        Proveedores
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Directorio de proveedores. También podés registrar una compra o pedido con fecha, o
        cargar la factura XML del SRI.
      </Typography>

      <SimpleDialog
        open={open}
        onClose={handleDialog}
        tittle="Eliminar proveedor"
        onClickAccept={deleteData}
      >
        ¿Está seguro de eliminar este proveedor?
      </SimpleDialog>

      <SimpleDialog
        open={openDialog}
        onClose={handleDialogForm}
        tittle={titleDialog}
        maxWidth="md"
        fullWidth
      >
        <SupplierForm
          onClose={handleDialogForm}
          isEditing={isEditing}
          datos={datos}
          reload={fetchData}
        />
      </SimpleDialog>

      <SimpleDialog
        open={orderOpen}
        onClose={closeOrderDialog}
        tittle={
          orderPrefill?.supplierName
            ? `Nueva compra / pedido — ${orderPrefill.supplierName}`
            : "Nueva compra / pedido a proveedor"
        }
        maxWidth="lg"
        fullWidth
        paperSx={SUPPLIER_ORDER_DIALOG_PAPER_SX}
        contentSx={SUPPLIER_ORDER_DIALOG_CONTENT_SX}
      >
        <SupplierOrderForm
          onClose={closeOrderDialog}
          reload={fetchData}
          isEditing={false}
          datos={null}
          prefillSupplierId={orderPrefill?.supplierId || null}
          prefillDate={orderPrefill?.date || todayIso()}
          lockSupplier={Boolean(orderPrefill?.supplierId)}
          active={orderOpen}
        />
      </SimpleDialog>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Button
          variant="contained"
          onClick={() => {
            setIsEditing(false);
            setDatos([]);
            setTitleDialog("Agregar proveedor");
            handleDialogForm();
          }}
        >
          Agregar proveedor
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => openNewOrder(null)}
        >
          Nueva compra / pedido (XML)
        </Button>
      </Stack>

      <TablePro
        rows={data}
        columns={columns}
        title="PROVEEDORES"
        showIndex
        defaultRowsPerPage={25}
        rowsPerPageOptions={[25, 50, 100, 200]}
        loading={loading}
      />
    </Container>
  );
}

export default SupplierPage;
