/**
 * Modal aceptar pedido peer — misma UX que importar factura XML / guía:
 * tabla con descripción remota + SearchableSelect de producto local.
 * Si ya hay enlace (SupplierProductCode), viene preseleccionado (“ya aprendido”).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Chip,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import CloseIcon from "@mui/icons-material/Close";
import SearchableSelect from "../../../../components/SearchableSelect";
import {
  getPeerAcceptOrderRequest,
  acceptPeerSupplierOrderRequest,
  getPeerAcceptCustomerOrderRequest,
  acceptPeerCustomerOrderRequest,
} from "../../../../api/ordersRequest.js";
import { getAllProductsAll } from "../../../../api/inventoryControlRequest.js";

const money = (n) => Number(n || 0).toFixed(2);

/**
 * @param {'supplier'|'customer'} [kind]
 */
export default function PeerSupplierOrderAcceptDialog({
  open,
  orderId,
  kind = "supplier",
  onClose,
  onAccepted,
  toast,
}) {
  const isCustomer = kind === "customer";
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const detailReq = isCustomer
        ? getPeerAcceptCustomerOrderRequest(orderId)
        : getPeerAcceptOrderRequest(orderId);
      const [{ data: order }, { data: prods }] = await Promise.all([
        detailReq,
        getAllProductsAll(),
      ]);
      const list = Array.isArray(prods) ? prods : prods?.products || [];
      setProducts(list);
      setDetail(order);
      setRows(
        (order?.items || []).map((it) => {
          const hasLink = Boolean(it.productId);
          return {
            id: it.id,
            remoteName: it.remoteName || it.productName || `Ítem #${it.id}`,
            remoteCode: it.remoteCode || it.remoteBarcode || it.remoteSku || "",
            remoteBarcode: it.remoteBarcode || "",
            remoteSku: it.remoteSku || "",
            quantity: it.quantity,
            unitPrice: Number(it.unitPrice || 0),
            productId: hasLink ? String(it.productId) : "",
            matchSource: hasLink ? "supplier_code" : "none",
            initialProductId: hasLink ? Number(it.productId) : null,
          };
        }),
      );
    } catch (error) {
      toast?.({
        message: error?.response?.data?.message || "No se pudo cargar el pedido",
        variant: "error",
      });
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [orderId, isCustomer, onClose, toast]);

  useEffect(() => {
    if (open && orderId) void load();
    if (!open) {
      setDetail(null);
      setRows([]);
    }
  }, [open, orderId, load]);

  const missingMap = useMemo(
    () => rows.filter((r) => !r.productId).length,
    [rows],
  );
  const learnedCount = useMemo(
    () => rows.filter((r) => r.matchSource === "supplier_code").length,
    [rows],
  );
  const alreadyAccepted = detail?.peerAcceptStatus === "accepted";
  const isRevision = Boolean(detail?.isRevision);
  const changes = Array.isArray(detail?.changes) ? detail.changes : [];

  const changeLabel = (c) => {
    if (c.type === "added") return "Agregado";
    if (c.type === "removed") return "Eliminado";
    return "Modificado";
  };

  const handleAccept = async () => {
    if (missingMap > 0) {
      toast?.({
        message: `Faltan ${missingMap} producto(s) por enlazar`,
        variant: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      const mappings = rows.map((r) => ({
        itemId: r.id,
        productId: Number(r.productId),
      }));
      const acceptReq = isCustomer
        ? acceptPeerCustomerOrderRequest(orderId, { mappings })
        : acceptPeerSupplierOrderRequest(orderId, { mappings });
      const { data } = await acceptReq;
      toast?.({
        message: data?.message || "Pedido aceptado",
        variant: "success",
      });
      onAccepted?.(data);
      onClose?.();
    } catch (error) {
      toast?.({
        message: error?.response?.data?.message || "No se pudo aceptar el pedido",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <DialogTitle
        sx={{
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          gap: 1,
          pr: 6,
          position: "relative",
        }}
      >
        <LinkIcon color="primary" />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", minWidth: 0 }}>
          {isCustomer
            ? isRevision
              ? "Aceptar cambios del pedido de cliente"
              : "Aceptar pedido de cliente (sistema enlazado)"
            : isRevision
              ? "Aceptar cambios del pedido enlazado"
              : "Aceptar pedido del sistema enlazado"}
          {detail?.id ? <Chip size="small" label={`#${detail.id}`} /> : null}
          {isRevision ? (
            <Chip size="small" color="warning" variant="outlined" label="Edición" />
          ) : null}
          {(detail?.supplierName || detail?.customerName) ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              · {detail.supplierName || detail.customerName}
            </Typography>
          ) : null}
        </Box>
        <IconButton
          aria-label="Cerrar"
          onClick={handleClose}
          disabled={saving}
          size="small"
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {alreadyAccepted ? (
              <Alert severity="success" sx={{ py: 0.75 }}>
                Este pedido ya fue aceptado.
              </Alert>
            ) : isRevision ? (
              <Alert severity="warning" sx={{ py: 0.75 }}>
                <Typography variant="body2">
                  El sistema enlazado reenvió una <strong>edición</strong> del mismo pedido
                  (mismo id). Revisá los cambios abajo y aceptá para aplicarlos.
                </Typography>
              </Alert>
            ) : missingMap > 0 ? (
              <Alert severity="warning" sx={{ py: 0.75 }}>
                <Typography variant="body2">
                  {missingMap} línea(s) sin producto. Asignalas como cuando cargás la guía /
                  factura del proveedor. Las que ya están enlazadas aparecen como{" "}
                  <strong>ya aprendido</strong> y no hace falta tocarlas (salvo que quieras
                  cambiar el producto).
                </Typography>
              </Alert>
            ) : (
              <Alert severity="info" sx={{ py: 0.75 }}>
                <Typography variant="body2">
                  Todos los productos ya están enlazados
                  {learnedCount ? ` (${learnedCount} ya aprendido${learnedCount === 1 ? "" : "s"})` : ""}.
                  Confirmá para aceptar el pedido.
                </Typography>
              </Alert>
            )}

            {isRevision && changes.length > 0 ? (
              <Box
                sx={{
                  border: 1,
                  borderColor: "warning.light",
                  borderRadius: 1,
                  p: 1.25,
                  bgcolor: "warning.50",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Cambios respecto a la versión anterior
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Producto</TableCell>
                      <TableCell align="right">Antes</TableCell>
                      <TableCell align="right">Ahora</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {changes.map((c) => (
                      <TableRow key={`${c.type}-${c.key}`}>
                        <TableCell>
                          <Chip
                            size="small"
                            label={changeLabel(c)}
                            color={
                              c.type === "added"
                                ? "success"
                                : c.type === "removed"
                                  ? "error"
                                  : "warning"
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.85rem" }}>
                          {c.remoteName || c.key}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                          {c.type === "added"
                            ? "—"
                            : `${money(c.beforeQuantity)} × $${money(c.beforeUnitPrice)}`}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                          {c.type === "removed"
                            ? "—"
                            : `${money(c.quantity)} × $${money(c.unitPrice)}`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ) : null}

            <Box
              sx={{
                overflow: "auto",
                maxHeight: "52vh",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Descripción (app origen)</TableCell>
                    <TableCell align="right">Cant</TableCell>
                    <TableCell align="right">P.U.</TableCell>
                    <TableCell sx={{ minWidth: 280 }}>Producto en sistema</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{
                        bgcolor: !row.productId ? "action.hover" : undefined,
                      }}
                    >
                      <TableCell sx={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {row.remoteBarcode || row.remoteSku || "—"}
                        {row.matchSource === "supplier_code" ? (
                          <Typography
                            component="span"
                            variant="caption"
                            color="success.main"
                            display="block"
                          >
                            ya aprendido
                          </Typography>
                        ) : null}
                        {row.matchSource === "manual" ? (
                          <Typography
                            component="span"
                            variant="caption"
                            color="info.main"
                            display="block"
                          >
                            {row.initialProductId &&
                            Number(row.productId) !== Number(row.initialProductId)
                              ? "cambio manual"
                              : "asignado a mano"}
                          </Typography>
                        ) : null}
                        {row.matchSource === "none" ? (
                          <Typography
                            component="span"
                            variant="caption"
                            color="warning.main"
                            display="block"
                          >
                            sin enlazar
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.85rem", maxWidth: 280 }}>
                        {row.remoteName}
                      </TableCell>
                      <TableCell align="right">{money(row.quantity)}</TableCell>
                      <TableCell align="right">{money(row.unitPrice)}</TableCell>
                      <TableCell>
                        <SearchableSelect
                          label="Producto"
                          items={products}
                          value={row.productId}
                          productMeta
                          disabled={alreadyAccepted || saving}
                          onChange={(val) =>
                            setRows((prev) =>
                              prev.map((r) => {
                                if (r.id !== row.id) return r;
                                const nextId = val ? String(val) : "";
                                const sameAsLearned =
                                  nextId &&
                                  r.initialProductId &&
                                  Number(nextId) === Number(r.initialProductId);
                                return {
                                  ...r,
                                  productId: nextId,
                                  matchSource: !nextId
                                    ? "none"
                                    : sameAsLearned
                                      ? "supplier_code"
                                      : "manual",
                                };
                              }),
                            )
                          }
                          placeholder="Buscar producto…"
                          getSearchText={(p) =>
                            [p?.name, p?.barcode, p?.sku].filter(Boolean).join(" ")
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!rows.length ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography color="text.secondary">Sin ítems.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button onClick={handleClose} color="inherit" disabled={saving}>
          Cancelar
        </Button>
        <Box sx={{ flex: 1 }} />
        {!alreadyAccepted ? (
          <Button
            variant="contained"
            onClick={handleAccept}
            disabled={loading || saving || missingMap > 0 || !rows.length}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <LinkIcon />}
          >
            {missingMap > 0
              ? `Enlazar pendientes (${missingMap})`
              : isRevision
                ? "Aceptar cambios"
                : "Aceptar pedido"}
          </Button>
        ) : (
          <Button variant="contained" onClick={handleClose}>
            Cerrar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
