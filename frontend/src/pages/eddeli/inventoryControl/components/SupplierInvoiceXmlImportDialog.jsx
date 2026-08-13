/**
 * Modal: revisar ítems de factura XML SRI y agregarlos al pedido proveedor.
 * Prioriza códigos guardados por proveedor (supplierId + código → producto).
 * Permite registrar productos faltantes uno a uno o todos juntos.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import EditIcon from "@mui/icons-material/Edit";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import SearchableSelect from "../../../../components/SearchableSelect";
import ProductForm from "./ProductForm.jsx";
import SupplierForm from "./SupplierForm.jsx";
import { getSupplierProductCodesRequest } from "../../../../api/ordersRequest.js";
import {
  createProduct,
  getUnits,
} from "../../../../api/inventoryControlRequest.js";
import {
  buildSupplierCodeMap,
  findSupplierForXmlInvoice,
  matchProductForXmlLine,
} from "../../../../utils/parseSriPurchaseInvoiceXml.js";
import { mediaStoragePath } from "../../../../utils/mediaPaths.js";

function money(n) {
  return Number(Number(n || 0).toFixed(4));
}

function pickDefaultUnitId(units) {
  if (!Array.isArray(units) || !units.length) return null;
  const byAbbr = units.find(
    (u) => String(u.abbreviation || "").toLowerCase() === "un",
  );
  if (byAbbr) return byAbbr.id;
  const byName = units.find((u) =>
    String(u.name || "").toLowerCase().includes("unidad"),
  );
  return (byName || units[0]).id;
}

/** Datos semilla para ProductForm / createProduct desde línea XML.
 * El código del proveedor NO va al barcode: queda en la descripción y
 * se vincula al proveedor al confirmar el pedido (supplier product codes).
 */
export function xmlLineToProductSeed(line) {
  const code = String(line?.code || "").trim();
  const aux = String(line?.auxCode || "").trim();
  return {
    name: String(line?.description || "Producto XML").trim().slice(0, 150),
    barcode: "",
    type: "raw",
    supplierPrice: Number(line?.unitPrice) || 0,
    taxRate: Number(line?.taxRate) || 0,
    supplierCode: code || aux || "",
    desc: [
      code ? `Código proveedor: ${code}` : null,
      aux && aux !== code ? `Código auxiliar: ${aux}` : null,
      "Importado desde factura XML",
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

function buildCreateFormData(seed, unitId) {
  const fd = new FormData();
  fd.append("subfolder", mediaStoragePath("products"));
  fd.append("name", seed.name);
  fd.append("type", seed.type || "raw");
  fd.append("unitId", String(unitId));
  // Nunca poner el código del proveedor como barcode
  if (seed.desc) fd.append("desc", seed.desc);
  fd.append("price", "0");
  fd.append("supplierPrice", String(Number(seed.supplierPrice) || 0));
  fd.append("distributorPrice", "0");
  fd.append("netWeight", "0");
  fd.append("minStock", "0");
  fd.append("stock", "0");
  fd.append("standardWeightGrams", "0");
  fd.append("taxRate", String(Number(seed.taxRate) || 0));
  fd.append("wholesaleRules", "[]");
  fd.append("packageTiers", "[]");
  fd.append("customFileName", seed.name || "producto");
  return fd;
}

/** Compara proveedor del sistema vs datos del XML → campos a enriquecer/actualizar. */
export function getSupplierXmlDiffs(supplier, parsed) {
  if (!parsed) return [];
  const diffs = [];
  const xmlRuc = String(parsed.supplierRuc || "").trim();
  const xmlName = String(parsed.supplierName || "").trim();
  const xmlTrade = String(parsed.tradeName || "").trim();
  const xmlAddr = String(parsed.supplierAddress || "").trim();

  if (!supplier) {
    if (xmlRuc || xmlName) {
      diffs.push({ field: "new", label: "Proveedor nuevo desde XML" });
    }
    return diffs;
  }

  const curRuc = String(supplier.identNumber || "").trim();
  const curName = String(supplier.name || "").trim();
  const curTrade = String(supplier.tradeName || "").trim();
  const curAddr = String(supplier.address || "").trim();

  if (xmlRuc && xmlRuc !== curRuc) {
    diffs.push({
      field: "identNumber",
      label: "RUC",
      from: curRuc || "(vacío)",
      to: xmlRuc,
    });
  }
  if (xmlName && xmlName.toLowerCase() !== curName.toLowerCase()) {
    diffs.push({
      field: "name",
      label: "Razón social",
      from: curName || "(vacío)",
      to: xmlName,
    });
  }
  if (xmlTrade && xmlTrade.toLowerCase() !== curTrade.toLowerCase()) {
    diffs.push({
      field: "tradeName",
      label: "Nombre comercial",
      from: curTrade || "(vacío)",
      to: xmlTrade,
    });
  }
  if (xmlAddr && xmlAddr.toLowerCase() !== curAddr.toLowerCase()) {
    diffs.push({
      field: "address",
      label: "Dirección",
      from: curAddr || "(vacío)",
      to: xmlAddr,
    });
  }
  return diffs;
}

/** Fusiona datos actuales del proveedor con los del XML (XML gana en campos presentes). */
export function mergeSupplierWithXml(supplier, parsed) {
  const base = supplier ? { ...supplier } : {};
  if (!parsed) return base;
  if (parsed.supplierName) base.name = String(parsed.supplierName).trim();
  if (parsed.tradeName) base.tradeName = String(parsed.tradeName).trim();
  if (parsed.supplierRuc) {
    base.identType = "04";
    base.identNumber = String(parsed.supplierRuc).trim();
  }
  if (parsed.supplierAddress) {
    base.address = String(parsed.supplierAddress).trim();
  }
  if (base.isActive == null) base.isActive = true;
  return base;
}

function mapLineToRow(line, products, codeMap, preferredProductIds = null) {
  const { product: matched, source } = matchProductForXmlLine(
    products,
    line,
    codeMap,
    { preferredProductIds },
  );
  return {
    ...line,
    include: true,
    productId: matched ? String(matched.id) : "",
    matchedName: matched?.name || "",
    matchSource: source || "none",
  };
}

export default function SupplierInvoiceXmlImportDialog({
  open,
  onClose,
  parsed,
  products = [],
  suppliers = [],
  preferredSupplierId = null,
  /** Pedidos previos del proveedor (para priorizar productos ya entregados). */
  supplierOrdersCache = [],
  onConfirm,
  onProductCreated,
  onSupplierSaved,
}) {
  const [rows, setRows] = useState([]);
  const [codeMap, setCodeMap] = useState(() => new Map());
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [defaultUnitId, setDefaultUnitId] = useState(null);
  const [creatingAll, setCreatingAll] = useState(false);
  const [createProgress, setCreateProgress] = useState({ done: 0, total: 0 });
  const [createOneOpen, setCreateOneOpen] = useState(false);
  const [createOneRowKey, setCreateOneRowKey] = useState(null);
  const [createOneSeed, setCreateOneSeed] = useState(null);
  const [productFormMode, setProductFormMode] = useState("create"); // create | edit
  const [editProductDatos, setEditProductDatos] = useState(null);
  const [renamePrompt, setRenamePrompt] = useState(null); // { row, product, xmlName }
  const [bulkError, setBulkError] = useState("");
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [supplierFormSeed, setSupplierFormSeed] = useState(null);
  const [supplierFormEditing, setSupplierFormEditing] = useState(false);
  const [supplierPromptDismissed, setSupplierPromptDismissed] = useState(false);
  const [localSupplier, setLocalSupplier] = useState(null);

  const supplierMatch = useMemo(() => {
    if (localSupplier?.id) return localSupplier;
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
    localSupplier,
    suppliers,
    preferredSupplierId,
    parsed?.supplierRuc,
    parsed?.supplierName,
  ]);

  const effectiveSupplierId = supplierMatch ? Number(supplierMatch.id) : null;

  /** Productos que este proveedor ya entregó en pedidos anteriores. */
  const preferredProductIds = useMemo(() => {
    const ids = new Set();
    if (!effectiveSupplierId) return ids;
    for (const o of supplierOrdersCache || []) {
      if (Number(o.supplierId) !== effectiveSupplierId) continue;
      const lines = o.ERP_supplier_order_items || o.items || [];
      for (const it of lines) {
        const pid = Number(it.productId);
        if (pid) ids.add(pid);
      }
    }
    return ids;
  }, [effectiveSupplierId, supplierOrdersCache]);

  const supplierXmlDiffs = useMemo(
    () => getSupplierXmlDiffs(supplierMatch, parsed),
    [supplierMatch, parsed],
  );

  const showSupplierPrompt =
    open &&
    !!parsed &&
    !supplierPromptDismissed &&
    !supplierFormOpen &&
    !!(parsed.supplierRuc || parsed.supplierName);

  useEffect(() => {
    if (!open) {
      setLocalSupplier(null);
      setSupplierPromptDismissed(false);
      setSupplierFormOpen(false);
      setSupplierFormSeed(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getUnits();
        if (!cancelled) setDefaultUnitId(pickDefaultUnitId(data || []));
      } catch {
        if (!cancelled) setDefaultUnitId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

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

  // Inicializar filas al abrir / cambiar XML, códigos o historial del proveedor
  useEffect(() => {
    if (!open || !parsed?.lines) {
      setRows([]);
      setBulkError("");
      return;
    }
    setRows(
      parsed.lines.map((line) =>
        mapLineToRow(line, products, codeMap, preferredProductIds),
      ),
    );
    // Solo al abrir o cambiar factura/códigos/historial — no al agregar productos nuevos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, parsed, codeMap, preferredProductIds]);

  // Cuando el catálogo crece, re-emparejar solo líneas sin producto
  useEffect(() => {
    if (!open || !rows.length) return;
    setRows((prev) =>
      prev.map((row) => {
        if (row.productId) return row;
        const rematched = mapLineToRow(
          row,
          products,
          codeMap,
          preferredProductIds,
        );
        if (!rematched.productId) return row;
        return {
          ...row,
          productId: rematched.productId,
          matchedName: rematched.matchedName,
          matchSource: rematched.matchSource,
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, preferredProductIds]);

  const included = rows.filter((r) => r.include && r.productId);
  const missingRows = rows.filter((r) => r.include && !r.productId);
  const missingMap = missingRows.length;
  const learnedCount = included.filter((r) => r.matchSource === "supplier_code").length;
  const historyMatchCount = included.filter(
    (r) => r.matchSource === "supplier_history",
  ).length;

  const assignProductToRow = useCallback((rowKey, product) => {
    if (!product?.id) return;
    setRows((prev) =>
      prev.map((r) =>
        r.key === rowKey
          ? {
              ...r,
              productId: String(product.id),
              matchedName: product.name || "",
              include: true,
              matchSource: "created",
            }
          : r,
      ),
    );
  }, []);

  const assignProductToMatchingMissing = useCallback((product, seedCode) => {
    if (!product?.id) return;
    const codeKey = String(seedCode || "")
      .trim()
      .toLowerCase();
    setRows((prev) =>
      prev.map((r) => {
        if (r.productId) return r;
        const codes = [r.code, r.auxCode]
          .map((c) => String(c || "").trim().toLowerCase())
          .filter(Boolean);
        const byCode = codeKey && codes.includes(codeKey);
        const byName =
          !codeKey &&
          String(r.description || "")
            .trim()
            .toLowerCase() === String(product.name || "").trim().toLowerCase();
        if (!byCode && !byName) return r;
        return {
          ...r,
          productId: String(product.id),
          matchedName: product.name || "",
          include: true,
          matchSource: "created",
        };
      }),
    );
  }, []);

  const handleProductCreated = useCallback(
    async (product) => {
      onProductCreated?.(product);
      return product;
    },
    [onProductCreated],
  );

  const openCreateOne = (row) => {
    setProductFormMode("create");
    setEditProductDatos(null);
    setCreateOneRowKey(row.key);
    setCreateOneSeed(xmlLineToProductSeed(row));
    setCreateOneOpen(true);
  };

  const startEditLinked = (row, product, { useXmlName }) => {
    const xmlName = String(row.description || "").trim().slice(0, 150);
    setProductFormMode("edit");
    setEditProductDatos({
      ...product,
      ...(useXmlName && xmlName ? { name: xmlName } : {}),
    });
    setCreateOneRowKey(row.key);
    setCreateOneSeed(null);
    setRenamePrompt(null);
    setCreateOneOpen(true);
  };

  const openEditLinked = (row) => {
    const pid = Number(row.productId);
    if (!pid) return;
    const product = (products || []).find((p) => Number(p.id) === pid);
    if (!product) return;
    const xmlName = String(row.description || "").trim().slice(0, 150);
    const currentName = String(product.name || "").trim();
    // Si el XML trae otra descripción, preguntar si reemplazar el nombre
    if (xmlName && xmlName.toLowerCase() !== currentName.toLowerCase()) {
      setRenamePrompt({ row, product, xmlName, currentName });
      return;
    }
    startEditLinked(row, product, { useXmlName: false });
  };

  const closeProductForm = () => {
    setCreateOneOpen(false);
    setCreateOneRowKey(null);
    setCreateOneSeed(null);
    setEditProductDatos(null);
    setProductFormMode("create");
    setRenamePrompt(null);
  };

  const handleCreateOneSaved = async (saved) => {
    const product = saved?.data || saved;
    const rowKey = createOneRowKey;
    const wasEdit = productFormMode === "edit";
    const supplierCode = createOneSeed?.supplierCode || "";
    closeProductForm();
    if (!product?.id) return;
    await handleProductCreated(product);
    if (wasEdit) {
      setRows((prev) =>
        prev.map((r) =>
          r.key === rowKey || Number(r.productId) === Number(product.id)
            ? {
                ...r,
                productId: String(product.id),
                matchedName: product.name || r.matchedName || "",
                include: true,
                matchSource: r.matchSource === "none" ? "manual" : r.matchSource,
              }
            : r,
        ),
      );
    } else {
      assignProductToRow(rowKey, product);
      assignProductToMatchingMissing(product, supplierCode);
    }
  };

  const createOneProductFromLine = async (line, unitId) => {
    const seed = xmlLineToProductSeed(line);
    if (!seed.name) throw new Error("Línea sin descripción");
    if (!unitId) throw new Error("No hay unidad de medida en el sistema");
    const fd = buildCreateFormData(seed, unitId);
    const { data } = await createProduct(fd);
    return data;
  };

  const openSupplierFromXml = () => {
    const seed = mergeSupplierWithXml(supplierMatch, parsed);
    setSupplierFormSeed(seed);
    setSupplierFormEditing(!!supplierMatch?.id);
    setSupplierFormOpen(true);
    setSupplierPromptDismissed(true);
  };

  const dismissSupplierPrompt = () => {
    setSupplierPromptDismissed(true);
  };

  const handleSupplierFormSaved = (saved) => {
    const row = saved?.data || saved;
    setSupplierFormOpen(false);
    setSupplierFormSeed(null);
    if (row?.id) {
      setLocalSupplier(row);
      onSupplierSaved?.(row);
    }
  };

  const handleRegisterAllMissing = async () => {
    if (!missingRows.length) return;
    if (!defaultUnitId) {
      setBulkError("No hay unidades configuradas. Creá al menos una unidad (ej. UN).");
      return;
    }
    setBulkError("");
    setCreatingAll(true);

    // Deduplicar por código (o descripción si no hay código)
    const groups = new Map();
    for (const row of missingRows) {
      const code = String(row.code || row.auxCode || "")
        .trim()
        .toLowerCase();
      const key = code || `name:${String(row.description || "").trim().toLowerCase()}`;
      if (!groups.has(key)) groups.set(key, row);
    }
    const uniqueLines = [...groups.values()];
    setCreateProgress({ done: 0, total: uniqueLines.length });

    let ok = 0;
    let fail = 0;
    const errors = [];

    try {
      for (let i = 0; i < uniqueLines.length; i++) {
        const line = uniqueLines[i];
        try {
          const product = await createOneProductFromLine(line, defaultUnitId);
          await handleProductCreated(product);
          assignProductToMatchingMissing(
            product,
            line.code || line.auxCode || "",
          );
          // Si no hay código, asignar por key de fila
          if (!line.code && !line.auxCode) {
            assignProductToRow(line.key, product);
          }
          ok += 1;
        } catch (err) {
          fail += 1;
          errors.push(
            `${line.description || line.code}: ${
              err?.response?.data?.message || err?.message || "error"
            }`,
          );
        }
        setCreateProgress({ done: i + 1, total: uniqueLines.length });
      }
      if (fail) {
        setBulkError(
          `Creados ${ok}, fallaron ${fail}. ${errors.slice(0, 3).join(" · ")}`,
        );
      }
    } finally {
      setCreatingAll(false);
    }
  };

  const handleConfirm = () => {
    if (!included.length) return;
    const sid = localSupplier?.id || effectiveSupplierId;
    onConfirm?.({
      rows: included,
      supplierId: sid ? String(sid) : null,
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

  const progressPct =
    createProgress.total > 0
      ? Math.round((createProgress.done / createProgress.total) * 100)
      : 0;

  return (
    <>
      <Dialog
        open={open}
        onClose={creatingAll ? undefined : onClose}
        fullWidth
        maxWidth="xl"
        scroll="paper"
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            pt: 1,
          }}
        >
          <DialogTitle sx={{ p: 0, fontWeight: 700, fontSize: "1.05rem" }}>
            Importar factura XML (SRI)
          </DialogTitle>
          <IconButton
            aria-label="Cerrar"
            onClick={onClose}
            size="small"
            disabled={creatingAll}
          >
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
                    Proveedor en sistema: {localSupplier?.name || supplierMatch.name}
                    {loadingCodes
                      ? " · cargando códigos guardados…"
                      : codeMap.size
                        ? ` · ${codeMap.size} código(s) guardado(s) para este proveedor`
                        : " · sin códigos guardados aún"}
                    {preferredProductIds.size
                      ? ` · ${preferredProductIds.size} producto(s) ya entregados`
                      : ""}
                    {learnedCount > 0
                      ? ` · ${learnedCount} por código de proveedor`
                      : ""}
                    {historyMatchCount > 0
                      ? ` · ${historyMatchCount} por historial`
                      : ""}
                  </Typography>
                ) : (
                  <Typography variant="caption" display="block" color="warning.main">
                    No hay proveedor coincidente. Podés crearlo con los datos del XML o
                    seleccionarlo después en el pedido.
                  </Typography>
                )}
              </Alert>
            ) : null}

            {showSupplierPrompt ? (
              <Alert
                severity="info"
                sx={{ py: 1 }}
                action={
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", pr: 0.5 }}>
                    <Button size="small" color="inherit" onClick={dismissSupplierPrompt}>
                      No
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      startIcon={supplierMatch ? <EditIcon /> : <PersonAddAltIcon />}
                      onClick={openSupplierFromXml}
                    >
                      Sí, {supplierMatch ? "actualizar" : "crear"}
                    </Button>
                  </Stack>
                }
              >
                <Typography variant="body2" fontWeight={700}>
                  {supplierMatch
                    ? "¿Deseás actualizar los datos del proveedor con el XML?"
                    : "¿Deseás registrar este proveedor con los datos del XML?"}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  RUC {parsed?.supplierRuc || "—"}
                  {parsed?.supplierName ? ` · ${parsed.supplierName}` : ""}
                  {parsed?.tradeName ? ` · ${parsed.tradeName}` : ""}
                  {parsed?.supplierAddress ? ` · ${parsed.supplierAddress}` : ""}
                </Typography>
                {supplierXmlDiffs.length > 0 && supplierMatch ? (
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    Cambios detectados:{" "}
                    {supplierXmlDiffs
                      .map((d) =>
                        d.field === "new" ? d.label : `${d.label}: ${d.from} → ${d.to}`,
                      )
                      .join(" · ")}
                  </Typography>
                ) : null}
              </Alert>
            ) : null}

            {!showSupplierPrompt && (parsed?.supplierRuc || parsed?.supplierName) ? (
              <Box>
                <Button
                  size="small"
                  variant="text"
                  startIcon={supplierMatch ? <EditIcon /> : <PersonAddAltIcon />}
                  onClick={openSupplierFromXml}
                  disabled={creatingAll}
                >
                  {supplierMatch
                    ? "Editar proveedor con datos del XML"
                    : "Crear proveedor desde XML"}
                </Button>
              </Box>
            ) : null}

            {missingMap > 0 ? (
              <Alert
                severity="warning"
                sx={{ py: 0.75 }}
                action={
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", pr: 1 }}>
                    <Button
                      size="small"
                      color="warning"
                      variant="contained"
                      startIcon={
                        creatingAll ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          <PlaylistAddIcon />
                        )
                      }
                      disabled={creatingAll || !defaultUnitId}
                      onClick={() => void handleRegisterAllMissing()}
                    >
                      Registrar todos ({missingMap})
                    </Button>
                  </Stack>
                }
              >
                <Typography variant="body2">
                  {missingMap} línea(s) sin producto. Podés asignarlas a mano, crearlas{" "}
                  <strong>una por una</strong> (botón Crear) o{" "}
                  <strong>registrar todas</strong>. El código del proveedor queda en la
                  descripción y se vincula al proveedor al agregar al pedido (no va al código
                  de barras).
                </Typography>
              </Alert>
            ) : null}

            {bulkError ? (
              <Alert severity="error" sx={{ py: 0.5 }} onClose={() => setBulkError("")}>
                {bulkError}
              </Alert>
            ) : null}

            {creatingAll ? (
              <Box>
                <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                  Creando productos {createProgress.done}/{createProgress.total} ({progressPct}
                  %)
                </Typography>
                <LinearProgress variant="determinate" value={progressPct} />
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
                    <TableCell padding="checkbox" />
                    <TableCell>Código prov.</TableCell>
                    <TableCell>Descripción (XML)</TableCell>
                    <TableCell align="right">Cant</TableCell>
                    <TableCell align="right">P.U.</TableCell>
                    <TableCell align="right">Desc.</TableCell>
                    <TableCell align="right">IVA%</TableCell>
                    <TableCell sx={{ minWidth: 260 }}>Producto en sistema</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.key} hover selected={row.include}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={row.include}
                          disabled={creatingAll}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.key === row.key
                                  ? { ...r, include: e.target.checked }
                                  : r,
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
                        {row.matchSource === "supplier_history" ? (
                          <Typography
                            component="span"
                            variant="caption"
                            color="success.main"
                            display="block"
                          >
                            historial proveedor
                          </Typography>
                        ) : null}
                        {row.matchSource === "catalog" ? (
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            catálogo general
                          </Typography>
                        ) : null}
                        {row.matchSource === "created" ? (
                          <Typography
                            component="span"
                            variant="caption"
                            color="info.main"
                            display="block"
                          >
                            recién creado
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.85rem", maxWidth: 260 }}>
                        {row.description}
                      </TableCell>
                      <TableCell align="right">{money(row.quantity)}</TableCell>
                      <TableCell align="right">{money(row.unitPrice)}</TableCell>
                      <TableCell align="right">{money(row.discount)}</TableCell>
                      <TableCell align="right">{row.taxRate || 0}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.75} alignItems="flex-start">
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <SearchableSelect
                              label="Producto"
                              items={products}
                              value={row.productId}
                              productMeta
                              disabled={creatingAll}
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
                              getSearchText={(p) =>
                                [p?.barcode, p?.sku].filter(Boolean).join(" ")
                              }
                            />
                          </Box>
                          {!row.productId ? (
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              disabled={creatingAll}
                              startIcon={<AddCircleOutlineIcon />}
                              onClick={() => openCreateOne(row)}
                              sx={{ whiteSpace: "nowrap", mt: 0.5 }}
                            >
                              Crear
                            </Button>
                          ) : (
                            <Tooltip title="Editar nombre / datos del producto">
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  disabled={creatingAll}
                                  onClick={() => openEditLinked(row)}
                                  sx={{ mt: 0.5 }}
                                  aria-label="Editar producto"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.25 }}>
          <Button onClick={onClose} color="inherit" disabled={creatingAll}>
            Cancelar
          </Button>
          <Box sx={{ flex: 1 }} />
          {missingMap > 0 ? (
            <Button
              variant="outlined"
              startIcon={<PlaylistAddIcon />}
              disabled={creatingAll || !defaultUnitId}
              onClick={() => void handleRegisterAllMissing()}
            >
              Registrar faltantes
            </Button>
          ) : null}
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={!included.length || creatingAll}
          >
            Agregar {included.length || ""} al pedido
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!renamePrompt}
        onClose={() => setRenamePrompt(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.05rem", pr: 6 }}>
          ¿Reemplazar el nombre del producto?
          <IconButton
            aria-label="Cerrar"
            onClick={() => setRenamePrompt(null)}
            size="small"
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            Verificá que el nombre del XML sea el correcto antes de reemplazarlo.
          </Alert>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Nombre actual en el sistema:
          </Typography>
          <Typography variant="body1" fontWeight={700} sx={{ mb: 1.5 }}>
            {renamePrompt?.currentName || "—"}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Nombre / descripción del XML:
          </Typography>
          <Typography variant="body1" fontWeight={700} color="primary.main">
            {renamePrompt?.xmlName || "—"}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.25, gap: 1, flexWrap: "wrap" }}>
          <Button color="inherit" onClick={() => setRenamePrompt(null)}>
            Cancelar
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            onClick={() => {
              if (!renamePrompt) return;
              startEditLinked(renamePrompt.row, renamePrompt.product, {
                useXmlName: false,
              });
            }}
          >
            No, mantener nombre
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!renamePrompt) return;
              startEditLinked(renamePrompt.row, renamePrompt.product, {
                useXmlName: true,
              });
            }}
          >
            Sí, usar nombre del XML
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={createOneOpen}
        onClose={closeProductForm}
        fullWidth
        maxWidth="lg"
        scroll="paper"
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            pt: 1,
          }}
        >
          <DialogTitle sx={{ p: 0, fontWeight: 700, fontSize: "1.05rem" }}>
            {productFormMode === "edit"
              ? "Editar producto vinculado"
              : "Registrar producto desde XML"}
          </DialogTitle>
          <IconButton aria-label="Cerrar" size="small" onClick={closeProductForm}>
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
            {productFormMode === "edit" ? (
              <>
                Revisá el <strong>nombre</strong> y el resto de datos. Al guardar se actualiza
                en el catálogo y en esta importación.
              </>
            ) : (
              <>
                Se prellenaron nombre, precio de compra e IVA. El código del proveedor va en la
                descripción (no en código de barras) y se vinculará al proveedor al agregar al
                pedido.
              </>
            )}
          </Alert>
          {createOneOpen ? (
            <ProductForm
              key={
                productFormMode === "edit"
                  ? `xml-edit-${editProductDatos?.id || "x"}`
                  : `xml-create-${createOneRowKey || "x"}`
              }
              isEditing={productFormMode === "edit"}
              datos={
                productFormMode === "edit" ? editProductDatos || {} : createOneSeed || {}
              }
              onClose={closeProductForm}
              reload={handleCreateOneSaved}
            />
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
          <Button type="button" color="inherit" onClick={closeProductForm}>
            Cancelar
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            type="submit"
            form="eddeli-product-form"
            variant="contained"
            sx={{ minWidth: 160 }}
          >
            {productFormMode === "edit" ? "Guardar cambios" : "Guardar producto"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={supplierFormOpen}
        onClose={() => {
          setSupplierFormOpen(false);
          setSupplierFormSeed(null);
        }}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            pt: 1,
          }}
        >
          <DialogTitle sx={{ p: 0, fontWeight: 700, fontSize: "1.05rem" }}>
            {supplierFormEditing ? "Actualizar proveedor desde XML" : "Registrar proveedor desde XML"}
          </DialogTitle>
          <IconButton
            aria-label="Cerrar"
            size="small"
            onClick={() => {
              setSupplierFormOpen(false);
              setSupplierFormSeed(null);
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            <Typography variant="body2" fontWeight={700}>
              Verificá que todos los datos sean correctos
            </Typography>
            <Typography variant="caption" display="block">
              Los campos se completaron con la información de la factura XML (RUC, razón
              social, nombre comercial, dirección). Revisá y corregí lo que haga falta antes
              de guardar.
            </Typography>
          </Alert>
          {supplierFormOpen ? (
            <SupplierForm
              key={`xml-supplier-${supplierFormSeed?.id || "new"}`}
              isEditing={supplierFormEditing}
              datos={supplierFormSeed || {}}
              onClose={() => {
                setSupplierFormOpen(false);
                setSupplierFormSeed(null);
              }}
              reload={handleSupplierFormSaved}
            />
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
          <Button
            type="button"
            color="inherit"
            onClick={() => {
              setSupplierFormOpen(false);
              setSupplierFormSeed(null);
            }}
          >
            Cancelar
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            type="submit"
            form="eddeli-supplier-form"
            variant="contained"
            sx={{ minWidth: 160 }}
          >
            {supplierFormEditing ? "Guardar cambios" : "Crear proveedor"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
