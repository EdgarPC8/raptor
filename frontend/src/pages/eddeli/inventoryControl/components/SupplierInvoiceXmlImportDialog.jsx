/**
 * Modal: revisar ítems de factura XML SRI y agregarlos al pedido proveedor.
 * Prioriza códigos guardados por proveedor (supplierId + código → producto).
 */
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchableSelect from "../../../../components/SearchableSelect";
import { getSupplierProductCodesRequest } from "../../../../api/ordersRequest.js";
import {
  buildSupplierCodeMap,
  findSupplierForXmlInvoice,
  matchProductForXmlLine,
} from "../../../../utils/parseSriPurchaseInvoiceXml.js";

function money(n) {
  return Number(Number(n || 0).toFixed(4));
}

export default function SupplierInvoiceXmlImportDialog({
  open,
  onClose,
  parsed,
  products = [],
  suppliers = [],
  preferredSupplierId = null,
  onConfirm,
}) {
  const [rows, setRows] = useState([]);
  const [codeMap, setCodeMap] = useState(() => new Map());
  const [loadingCodes, setLoadingCodes] = useState(false);

  const supplierMatch = useMemo(() => {
    if (preferredSupplierId) {
      const hit = (suppliers || []).find(
        (s) => Number(s.id) === Number(preferredSupplierId),
      );
      if (hit) return hit;
    }
    return findSupplierForXmlInvoice(suppliers, {
      ruc: parsed?.supplierRuc,
      supplierName: parsed?.supplierName,
    });
  }, [
    suppliers,
    preferredSupplierId,
    parsed?.supplierRuc,
    parsed?.supplierName,
  ]);

  const effectiveSupplierId = supplierMatch ? Number(supplierMatch.id) : null;

  useEffect(() => {
    if (!open || !effectiveSupplierId) {
      setCodeMap(new Map());
      return undefined;
    }
    let cancelled = false;
    setLoadingCodes(true);
    (async () => {
      try {
        const { data } = await getSupplierProductCodesRequest(effectiveSupplierId);
        if (!cancelled) setCodeMap(buildSupplierCodeMap(data?.codes || []));
      } catch {
        if (!cancelled) setCodeMap(new Map());
      } finally {
        if (!cancelled) setLoadingCodes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, effectiveSupplierId]);

  useEffect(() => {
    if (!open || !parsed?.lines) {
      setRows([]);
      return;
    }
    setRows(
      parsed.lines.map((line) => {
        const matched = matchProductForXmlLine(products, line, codeMap);
        const viaSupplierCode =
          matched &&
          codeMap.size > 0 &&
          [line.code, line.auxCode].some((c) => {
            const k = String(c || "")
              .trim()
              .toLowerCase();
            return k && codeMap.get(k) === Number(matched.id);
          });
        return {
          ...line,
          include: true,
          productId: matched ? String(matched.id) : "",
          matchedName: matched?.name || "",
          matchSource: matched
            ? viaSupplierCode
              ? "supplier_code"
              : "catalog"
            : "none",
        };
      }),
    );
  }, [open, parsed, products, codeMap]);

  const included = rows.filter((r) => r.include && r.productId);
  const missingMap = rows.filter((r) => r.include && !r.productId).length;
  const learnedCount = included.filter((r) => r.matchSource === "supplier_code").length;

  const handleConfirm = () => {
    if (!included.length) return;
    onConfirm?.({
      rows: included,
      supplierId: effectiveSupplierId ? String(effectiveSupplierId) : null,
      emissionDate: parsed?.emissionDate || "",
      invoiceNumber: parsed?.invoiceNumber || "",
      supplierName: parsed?.supplierName || "",
      accessKey: parsed?.accessKey || "",
      notesHint: [
        parsed?.invoiceNumber ? `Factura XML ${parsed.invoiceNumber}` : "Factura XML proveedor",
        parsed?.supplierName || "",
        parsed?.accessKey ? `Clave ${parsed.accessKey}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, pt: 1 }}>
        <DialogTitle sx={{ p: 0, fontWeight: 700, fontSize: "1.05rem" }}>
          Importar factura XML (SRI)
        </DialogTitle>
        <IconButton aria-label="Cerrar" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {parsed ? (
            <Alert severity="info" sx={{ py: 0.75 }}>
              <Typography variant="body2" fontWeight={700}>
                {parsed.supplierName || "Proveedor"}
                {parsed.tradeName ? ` · ${parsed.tradeName}` : ""}
              </Typography>
              <Typography variant="caption" display="block">
                RUC {parsed.supplierRuc || "—"} · Nº {parsed.invoiceNumber || "—"}
                {parsed.emissionDate ? ` · Emisión ${parsed.emissionDate}` : ""}
                {parsed.total != null ? ` · Total ${money(parsed.total)}` : ""}
              </Typography>
              {supplierMatch ? (
                <Typography variant="caption" display="block" color="success.main">
                  Proveedor en sistema: {supplierMatch.name}
                  {loadingCodes
                    ? " · cargando códigos guardados…"
                    : codeMap.size
                      ? ` · ${codeMap.size} código(s) guardado(s) para este proveedor`
                      : " · sin códigos guardados aún"}
                  {learnedCount > 0 ? ` · ${learnedCount} línea(s) por código de proveedor` : ""}
                </Typography>
              ) : (
                <Typography variant="caption" display="block" color="warning.main">
                  No hay proveedor coincidente. Seleccioná el proveedor en el pedido antes o después;
                  sin proveedor no se guardan los códigos para próximas compras.
                </Typography>
              )}
            </Alert>
          ) : null}

          {missingMap > 0 ? (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              {missingMap} línea(s) sin producto. Asignalas a mano: al confirmar se guarda el código
              de ese proveedor para la próxima vez.
            </Alert>
          ) : null}

          <Box sx={{ overflow: "auto", maxHeight: "52vh", border: 1, borderColor: "divider", borderRadius: 1 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Código prov.</TableCell>
                  <TableCell>Descripción (XML)</TableCell>
                  <TableCell align="right">Cant</TableCell>
                  <TableCell align="right">P.U.</TableCell>
                  <TableCell align="right">IVA%</TableCell>
                  <TableCell sx={{ minWidth: 220 }}>Producto en sistema</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key} hover selected={row.include}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={row.include}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key ? { ...r, include: e.target.checked } : r,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                      {row.code || "—"}
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
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.85rem", maxWidth: 260 }}>
                      {row.description}
                    </TableCell>
                    <TableCell align="right">{money(row.quantity)}</TableCell>
                    <TableCell align="right">{money(row.unitPrice)}</TableCell>
                    <TableCell align="right">{row.taxRate || 0}</TableCell>
                    <TableCell>
                      <SearchableSelect
                        label="Producto"
                        items={products}
                        value={row.productId}
                        productMeta
                        onChange={(val) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key
                                ? {
                                    ...r,
                                    productId: val ? String(val) : "",
                                    include: val ? true : r.include,
                                    matchSource: val ? "manual" : "none",
                                  }
                                : r,
                            ),
                          )
                        }
                        placeholder="Buscar producto…"
                        getSearchText={(p) => [p?.barcode, p?.sku].filter(Boolean).join(" ")}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={handleConfirm} disabled={!included.length}>
          Agregar {included.length || ""} al pedido
        </Button>
      </DialogActions>
    </Dialog>
  );
}
