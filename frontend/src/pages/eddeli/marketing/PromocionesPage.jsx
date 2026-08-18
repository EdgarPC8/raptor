import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  FormControlLabel,
} from "@mui/material";
import { Add, Delete, Edit, LocalOffer } from "@mui/icons-material";
import TablePro from "../../../components/Tables/TablePro.jsx";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import SearchableSelect from "../../../components/SearchableSelect.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import { getAllProductsAll } from "../../../api/inventoryControlRequest.js";
import { getAllCustomersRequest } from "../../../api/ordersRequest.js";
import { buildCustomerDisplayName } from "../../../utils/customerUtils.js";
import {
  listPromoGroups,
  createPromoGroup,
  updatePromoGroup,
  deletePromoGroup,
} from "../../../api/marketingPromotionsRequest.js";

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function benefitLabel(row) {
  const qty = Number(row.quantity) || 0;
  const name = row.productName || "producto";
  return `${qty} × ${name} por ${money(row.price)}`;
}

const emptyForm = () => ({
  name: "",
  description: "",
  isActive: true,
  benefits: [{ productId: "", quantity: 8, price: 1 }],
  customerIds: [],
});

export default function PromocionesPage() {
  const { toast } = useAuth();
  const [groups, setGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [customerToAdd, setCustomerToAdd] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [gRes, pRes, cRes] = await Promise.all([
        listPromoGroups(),
        getAllProductsAll(),
        getAllCustomersRequest(),
      ]);
      setGroups(Array.isArray(gRes.data) ? gRes.data : []);
      const rawProducts = pRes.data;
      setProducts(Array.isArray(rawProducts) ? rawProducts : rawProducts?.rows || []);
      setCustomers(Array.isArray(cRes.data) ? cRes.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const assignedCustomerIds = useMemo(() => {
    const map = new Map();
    for (const group of groups) {
      for (const member of group.members || []) {
        map.set(Number(member.customerId), group.name);
      }
    }
    return map;
  }, [groups]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setCustomerToAdd("");
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || "",
      description: row.description || "",
      isActive: row.isActive !== false,
      benefits: (row.benefits || []).length
        ? row.benefits.map((b) => ({
            productId: String(b.productId),
            quantity: b.quantity,
            price: b.price,
          }))
        : [{ productId: "", quantity: 8, price: 1 }],
      customerIds: (row.members || []).map((m) => Number(m.customerId)),
    });
    setCustomerToAdd("");
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      isActive: form.isActive,
      benefits: form.benefits
        .filter((b) => b.productId)
        .map((b) => ({
          productId: Number(b.productId),
          quantity: Number(b.quantity) || 1,
          price: Number(b.price) || 0,
        })),
      customerIds: form.customerIds,
    };
    if (!payload.name) {
      toast({ message: "Escribe un nombre para el grupo", variant: "warning" });
      return;
    }
    const promise = editing
      ? updatePromoGroup(editing.id, payload)
      : createPromoGroup(payload);
    await runMutationReload(toast, {
      promise,
      reload: load,
      onClose: () => setOpen(false),
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await runMutationReload(toast, {
      promise: deletePromoGroup(deleteTarget.id),
      reload: load,
      onClose: () => setDeleteTarget(null),
    });
  };

  const selectedCustomers = customers.filter((c) =>
    form.customerIds.includes(Number(c.id)),
  );

  const columns = [
    {
      id: "name",
      label: "Grupo",
      minWidth: 160,
      render: (row) => (
        <Stack spacing={0.25}>
          <Typography variant="body2" fontWeight={600}>
            {row.name}
          </Typography>
          {row.description ? (
            <Typography variant="caption" color="text.secondary">
              {row.description}
            </Typography>
          ) : null}
        </Stack>
      ),
    },
    {
      id: "benefits",
      label: "Beneficio",
      minWidth: 220,
      render: (row) =>
        row.benefits?.length ? (
          <Stack spacing={0.5}>
            {row.benefits.map((b) => (
              <Chip
                key={`${row.id}-${b.id || b.productId}`}
                size="small"
                icon={<LocalOffer sx={{ fontSize: 14 }} />}
                label={benefitLabel(b)}
              />
            ))}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Sin beneficio
          </Typography>
        ),
    },
    {
      id: "memberCount",
      label: "Clientes",
      width: 90,
      align: "center",
    },
    {
      id: "isActive",
      label: "Estado",
      width: 110,
      render: (row) => (
        <Chip
          size="small"
          color={row.isActive ? "success" : "default"}
          label={row.isActive ? "Activo" : "Pausado"}
        />
      ),
    },
    {
      id: "actions",
      label: "",
      width: 96,
      sortable: false,
      stopRowClick: true,
      getSearchValue: () => "",
      render: (row) => (
        <Stack direction="row">
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Promociones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crea un grupo, pégale el beneficio (ej. 8 panes × $1) y mete a los clientes.
            Un cliente solo puede estar en un grupo.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Nuevo grupo
        </Button>
      </Stack>

      <TablePro
        rows={groups}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        dense
        tableMaxHeight="calc(100vh - 220px)"
        title=""
      />

      <SimpleDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Editar · ${editing.name}` : "Nuevo grupo"}
        maxWidth="sm"
        fullWidth
        onClickAccept={save}
      >
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Nombre del grupo"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="VIP, Nuevos, Estándar…"
            fullWidth
            autoFocus
          />
          <TextField
            label="Nota (opcional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
            }
            label="Grupo activo"
          />

          <Typography variant="subtitle2">Beneficio</Typography>
          {form.benefits.map((row, index) => (
            <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
              <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
                <SearchableSelect
                  label="Producto"
                  items={products}
                  value={row.productId}
                  productMeta
                  onChange={(id) =>
                    setForm((f) => {
                      const benefits = [...f.benefits];
                      benefits[index] = { ...benefits[index], productId: id };
                      return { ...f, benefits };
                    })
                  }
                />
              </Box>
              <TextField
                label="Cantidad"
                type="number"
                value={row.quantity}
                onChange={(e) =>
                  setForm((f) => {
                    const benefits = [...f.benefits];
                    benefits[index] = { ...benefits[index], quantity: e.target.value };
                    return { ...f, benefits };
                  })
                }
                sx={{ width: 110 }}
              />
              <TextField
                label="Precio $"
                type="number"
                value={row.price}
                onChange={(e) =>
                  setForm((f) => {
                    const benefits = [...f.benefits];
                    benefits[index] = { ...benefits[index], price: e.target.value };
                    return { ...f, benefits };
                  })
                }
                sx={{ width: 110 }}
              />
              <IconButton
                color="error"
                disabled={form.benefits.length <= 1}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    benefits: f.benefits.filter((_, i) => i !== index),
                  }))
                }
              >
                <Delete fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          <Button
            size="small"
            onClick={() =>
              setForm((f) => ({
                ...f,
                benefits: [...f.benefits, { productId: "", quantity: 1, price: 0 }],
              }))
            }
          >
            Añadir otro producto
          </Button>

          <Typography variant="subtitle2">Clientes del grupo</Typography>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <SearchableSelect
                label="Añadir cliente"
                items={customers.filter((c) => !form.customerIds.includes(Number(c.id)))}
                value={customerToAdd}
                onChange={setCustomerToAdd}
                getOptionLabel={(c) => {
                  const name = buildCustomerDisplayName(c);
                  const other = assignedCustomerIds.get(Number(c.id));
                  return other ? `${name} (ahora en ${other})` : name;
                }}
              />
            </Box>
            <Button
              variant="outlined"
              disabled={!customerToAdd}
              onClick={() => {
                const id = Number(customerToAdd);
                if (!id) return;
                setForm((f) =>
                  f.customerIds.includes(id)
                    ? f
                    : { ...f, customerIds: [...f.customerIds, id] },
                );
                setCustomerToAdd("");
              }}
            >
              Añadir
            </Button>
          </Stack>
          {selectedCustomers.length ? (
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {selectedCustomers.map((c) => (
                <Chip
                  key={c.id}
                  label={buildCustomerDisplayName(c)}
                  onDelete={() =>
                    setForm((f) => ({
                      ...f,
                      customerIds: f.customerIds.filter((id) => id !== Number(c.id)),
                    }))
                  }
                />
              ))}
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Todavía no hay clientes en este grupo.
            </Typography>
          )}
        </Stack>
      </SimpleDialog>

      <SimpleDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar grupo"
        onClickAccept={confirmDelete}
      >
        <Typography>
          ¿Eliminar el grupo «{deleteTarget?.name}»? Los clientes quedan sin promo.
        </Typography>
      </SimpleDialog>
    </Container>
  );
}
