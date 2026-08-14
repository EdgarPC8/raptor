import {
  Grid,
  TextField,
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Alert,
  InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AddBoxIcon from "@mui/icons-material/AddBox";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SearchIcon from "@mui/icons-material/Search";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ImageIcon from "@mui/icons-material/Image";
import CircularProgress from "@mui/material/CircularProgress";
import { useForm } from "react-hook-form";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  createSupplierOrderRequest,
  updateSupplierOrderRequest,
  getAllSuppliersRequest,
  getAllSupplierOrdersRequest,
  upsertSupplierProductCodesRequest,
} from "../../../../api/ordersRequest";
import { getAllProductsAll } from "../../../../api/inventoryControlRequest";
import { lookupSriPurchaseInvoiceByAccessKey } from "../../../../api/sriInvoicesRequest.js";
import { useAuth } from "../../../../context/AuthContext";
import SearchableSelect from "../../../../components/SearchableSelect";
import AttachmentField from "./AttachmentField.jsx";
import ProductForm from "./ProductForm.jsx";
import SupplierForm from "./SupplierForm.jsx";
import OrderPaymentScheduleFields from "./OrderPaymentScheduleFields.jsx";
import {
  normalizeScheduleForApi,
  toDateOnly,
} from "../../../../utils/orderPaymentSchedule.js";
import ProductPriceReference, {
  getProductUnitLabel,
  formatOrderLineTotal,
  formatProductPrice,
} from "./ProductPriceReference";
import SupplierOrderItemsBoard, { ZONE } from "./SupplierOrderItemsBoard.jsx";
import SupplierInvoiceXmlImportDialog from "./SupplierInvoiceXmlImportDialog.jsx";
import SupplierOrderShoppingListDialog from "./SupplierOrderShoppingListDialog.jsx";
import { uploadSupplierOrderVoucher } from "../../../../api/documentRequest.js";
import { useBarcodeScanner } from "../../../../hooks/useBarcodeScanner.js";
import {
  findEddeliProductByCode,
  normalizeProductBarcode,
} from "../../../../utils/productLookup.js";
import {
  buildLastPurchaseByProductId,
  getLastPurchaseForProduct,
  findLatestSupplierOrder,
} from "../../../../utils/supplierLastPurchase.js";
import { parseSriPurchaseInvoiceXml } from "../../../../utils/parseSriPurchaseInvoiceXml.js";
import {
  reorderItemInZone,
  moveItemToZone,
  buildBoardOrder,
  moveBoardEntry,
  applyBoardOrderToItems,
  syncBoardOrder,
  applyPackStructureToItems,
} from "./orderPackUtils.js";

const pad2 = (n) => String(n).padStart(2, "0");

const newKey = (prefix) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const localISODate = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const toLocalISOWithOffset = (d) => {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const hhOff = pad2(Math.floor(Math.abs(off) / 60));
  const mmOff = pad2(Math.abs(off) % 60);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}${sign}${hhOff}:${mmOff}`;
};

const normalizeToYYYYMMDD = (datos) => {
  if (!datos) return localISODate();
  if (typeof datos.date === "string" && datos.date.includes("/")) {
    const [datePart] = datos.date.split(" ");
    const [dd, mm, yyyy] = datePart.split("/");
    if (dd && mm && yyyy) return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof datos.date === "string" && datos.date.includes("T")) {
    const d = new Date(datos.date);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
  return localISODate();
};

const dateOnly = (v) => (v ? String(v).slice(0, 10) : "");

/** Reconstruye packs/lots a partir de ítems guardados (edición). */
function hydratePacksAndLots(rawItems) {
  const packs = [];
  const lots = [];
  const packByKey = new Map();
  const lotBySig = new Map();
  const packSigs = new Map(); // packKey -> Set of date signatures

  const effectivePackKey = (item) => {
    if (item.packKey) return String(item.packKey);
    // Pedidos viejos / sin packKey: agrupar por nombre de paca.
    const name = String(item.packName || "").trim();
    if (name) return `name_${name}`;
    return null;
  };

  for (const item of rawItems) {
    const packKey = effectivePackKey(item);
    if (!packKey) continue;
    const hasLot = Boolean(item.expiresAt || item.lotCode || item.manufacturedAt);
    const sig = hasLot
      ? `${item.lotCode || ""}|${dateOnly(item.expiresAt)}|${dateOnly(item.manufacturedAt)}`
      : null;
    if (!packByKey.has(packKey)) {
      const pack = {
        key: packKey,
        name: item.packName || "Paca",
        useLots: false,
        lotCode: "",
        expiresAt: "",
        manufacturedAt: "",
        totalPrice: "",
        // Los packs reconstruidos pertenecen a un pedido existente.
        expanded: false,
      };
      packByKey.set(packKey, pack);
      packs.push(pack);
      packSigs.set(packKey, new Set());
    }
    if (sig) packSigs.get(packKey).add(sig);
  }

  for (const [packKey, sigSet] of packSigs.entries()) {
    const pack = packByKey.get(packKey);
    const sigs = [...sigSet];
    if (sigs.length > 1) {
      pack.useLots = true;
    } else if (sigs.length === 1) {
      const [lotCode, expiresAt, manufacturedAt] = sigs[0].split("|");
      pack.useLots = false;
      pack.lotCode = lotCode || "";
      pack.expiresAt = expiresAt || "";
      pack.manufacturedAt = manufacturedAt || "";
    }
  }

  const items = rawItems.map((item) => {
    const lineId = newKey("line");
    const packKey = effectivePackKey(item);
    const pack = packKey ? packByKey.get(packKey) : null;
    let lotKey = null;

    if (pack?.useLots && (item.expiresAt || item.lotCode || item.manufacturedAt)) {
      const sig = `${packKey}|${item.lotCode || ""}|${dateOnly(item.expiresAt)}|${dateOnly(item.manufacturedAt)}`;
      if (!lotBySig.has(sig)) {
        const lot = {
          key: newKey("lot"),
          packKey,
          code: item.lotCode || "",
          expiresAt: dateOnly(item.expiresAt),
          manufacturedAt: dateOnly(item.manufacturedAt),
        };
        lotBySig.set(sig, lot);
        lots.push(lot);
      }
      lotKey = lotBySig.get(sig).key;
    }

    return {
      lineId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: Number(item.discount) || 0,
      hasIva: Number(item.taxRate) > 0,
      taxRate: Number(item.taxRate) || 0,
      name: item.ERP_inventory_product?.name || item.name || "",
      unitLabel: getProductUnitLabel(item.ERP_inventory_product),
      packKey: packKey || null,
      lotKey,
    };
  });

  for (const pack of packs) {
    const sum = items
      .filter((it) => it.packKey === pack.key)
      .reduce((acc, it) => acc + formatOrderLineTotal(it.quantity, it.unitPrice, it.discount), 0);
    pack.totalPrice = sum > 0 ? String(Number(sum.toFixed(2))) : "";
  }

  return { items, packs, lots };
}

function resolveItemLotFields(item, packs, lots) {
  const pack = item.packKey ? packs.find((p) => p.key === item.packKey) : null;
  const lot = item.lotKey ? lots.find((l) => l.key === item.lotKey) : null;
  if (lot) {
    return {
      packKey: pack?.key || lot.packKey || item.packKey || null,
      packName: pack?.name?.trim() || null,
      lotCode: lot?.code?.trim() || null,
      expiresAt: lot?.expiresAt || null,
      manufacturedAt: lot?.manufacturedAt || null,
    };
  }
  // Paca simple: un solo vencimiento para todos los productos de la paca.
  if (pack && !pack.useLots) {
    return {
      packKey: pack.key || item.packKey || null,
      packName: pack.name?.trim() || null,
      lotCode: String(pack.lotCode || "").trim() || null,
      expiresAt: pack.expiresAt || null,
      manufacturedAt: pack.manufacturedAt || null,
    };
  }
  return {
    packKey: pack?.key || item.packKey || null,
    packName: pack?.name?.trim() || null,
    lotCode: null,
    expiresAt: null,
    manufacturedAt: null,
  };
}

function SupplierOrderForm(
  {
    onClose,
    reload,
    isEditing = false,
    datos = null,
    prefillSupplierId = null,
    prefillDate = null,
    lockSupplier = false,
    active = true,
  },
  tourApiRef,
) {
  const { handleSubmit, register, reset, setValue, watch } = useForm();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [packs, setPacks] = useState([]);
  const [lots, setLots] = useState([]);
  const [boardOrder, setBoardOrder] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [pendingVoucherFile, setPendingVoucherFile] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  /** create = producto nuevo · edit = editar el seleccionado */
  const [productDialogMode, setProductDialogMode] = useState("create");
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [xmlImportOpen, setXmlImportOpen] = useState(false);
  const [xmlParsed, setXmlParsed] = useState(null);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const xmlFileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [accessKeyLookup, setAccessKeyLookup] = useState("");
  const [lookingUpXml, setLookingUpXml] = useState(false);
  const [ivaRate, setIvaRate] = useState(15);
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [splitPayments, setSplitPayments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  const [installments, setInstallments] = useState([]);
  /** Solo productos que este proveedor ya me vendió (historial de pedidos). */
  const [onlySoldBySupplier, setOnlySoldBySupplier] = useState(false);
  const [soldProductIds, setSoldProductIds] = useState(() => new Set());
  const [loadingSoldProducts, setLoadingSoldProducts] = useState(false);
  /** Cache de pedidos a proveedor para última compra y filtro por historial. */
  const [supplierOrdersCache, setSupplierOrdersCache] = useState([]);
  const tourGenRef = useRef(0);
  const lotsRef = useRef([]);
  const packsRef = useRef([]);
  const { toast } = useAuth();

  useEffect(() => {
    lotsRef.current = lots;
  }, [lots]);

  useEffect(() => {
    packsRef.current = packs;
  }, [packs]);

  const selectedProductId = watch("productId");
  const watchQuantity = watch("quantity");
  const watchUnitPrice = watch("unitPrice");

  const currentProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id === Number(selectedProductId)) || null;
  }, [selectedProductId, products]);

  const productOptions = useMemo(() => {
    if (!onlySoldBySupplier) return products;
    if (!selectedSupplier) return [];
    return products.filter((p) => soldProductIds.has(Number(p.id)));
  }, [products, onlySoldBySupplier, selectedSupplier, soldProductIds]);

  const lastPurchaseByProductId = useMemo(
    () => buildLastPurchaseByProductId(supplierOrdersCache),
    [supplierOrdersCache],
  );

  const currentLastPurchase = useMemo(
    () => getLastPurchaseForProduct(lastPurchaseByProductId, selectedProductId),
    [lastPurchaseByProductId, selectedProductId],
  );

  const lastOrderWithPacks = useMemo(
    () => findLatestSupplierOrder(supplierOrdersCache, selectedSupplier, { requirePacks: true }),
    [supplierOrdersCache, selectedSupplier],
  );

  const lastOrderAny = useMemo(
    () => findLatestSupplierOrder(supplierOrdersCache, selectedSupplier, { requirePacks: false }),
    [supplierOrdersCache, selectedSupplier],
  );

  const cartMatchesLastPacks = useMemo(() => {
    if (!lastOrderWithPacks || !items.length) return 0;
    const packedProductIds = new Set();
    for (const it of lastOrderWithPacks.ERP_supplier_order_items || lastOrderWithPacks.items || []) {
      if (it?.packKey || String(it?.packName || "").trim()) {
        const pid = Number(it.productId);
        if (pid) packedProductIds.add(pid);
      }
    }
    return items.filter((it) => packedProductIds.has(Number(it.productId))).length;
  }, [lastOrderWithPacks, items]);

  // Historial de pedidos a proveedor (última compra + filtro “solo vendidos”)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getAllSupplierOrdersRequest();
        if (!cancelled) setSupplierOrdersCache(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setSupplierOrdersCache([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Productos que este proveedor ya vendió (desde cache)
  useEffect(() => {
    if (!selectedSupplier) {
      setSoldProductIds(new Set());
      setLoadingSoldProducts(false);
      return;
    }
    setLoadingSoldProducts(true);
    const ids = new Set();
    const sid = Number(selectedSupplier);
    for (const o of supplierOrdersCache) {
      if (Number(o.supplierId) !== sid) continue;
      const lines = o.ERP_supplier_order_items || o.items || [];
      for (const it of lines) {
        const pid = Number(it.productId);
        if (pid) ids.add(pid);
      }
    }
    setSoldProductIds(ids);
    setLoadingSoldProducts(false);
  }, [selectedSupplier, supplierOrdersCache]);

  useEffect(() => {
    if (!selectedProductId) return;
    const last = getLastPurchaseForProduct(lastPurchaseByProductId, selectedProductId);
    if (last && Number.isFinite(Number(last.unitPrice)) && Number(last.unitPrice) >= 0) {
      setValue("unitPrice", last.unitPrice);
      return;
    }
    const product = products.find((p) => p.id === Number(selectedProductId));
    if (product?.supplierPrice != null) {
      setValue("unitPrice", product.supplierPrice);
    }
  }, [selectedProductId, products, setValue, lastPurchaseByProductId]);

  const fetchCatalog = async () => {
    const [prodRes, supRes] = await Promise.all([getAllProductsAll(), getAllSuppliersRequest()]);
    const list = prodRes?.data || [];
    setProducts(list);
    setSuppliers(supRes?.data || []);
    return list;
  };

  const handleProductSaved = async (saved) => {
    const editingId =
      productDialogMode === "edit" ? Number(currentProduct?.id || selectedProductId) : null;
    setProductDialogOpen(false);
    const list = await fetchCatalog();
    const id = saved?.id ?? saved?.data?.id ?? editingId;
    if (id != null) {
      setSelectedProduct(String(id));
      setValue("productId", String(id));
      const last = getLastPurchaseForProduct(lastPurchaseByProductId, id);
      if (last && Number.isFinite(Number(last.unitPrice)) && Number(last.unitPrice) >= 0) {
        setValue("unitPrice", last.unitPrice);
      } else {
        const updated = list.find((p) => Number(p.id) === Number(id));
        if (updated?.supplierPrice != null) {
          setValue("unitPrice", updated.supplierPrice);
        }
      }
    }
  };

  const normalizeAccessKeyInput = useCallback((raw) => {
    // Dígitos ASCII + fullwidth (por si pegan desde PDF)
    return String(raw || "")
      .replace(/[\uFF10-\uFF19]/g, (ch) => String(ch.charCodeAt(0) - 0xff10))
      .replace(/\D/g, "")
      .slice(0, 49);
  }, []);

  const openXmlImportFromText = useCallback((text) => {
    const parsed = parseSriPurchaseInvoiceXml(text);
    setXmlParsed(parsed);
    setXmlImportOpen(true);
  }, []);

  const lookupInvoiceByAccessKey = useCallback(
    async (rawKey) => {
      const digits = normalizeAccessKeyInput(rawKey);
      setAccessKeyLookup(digits);
      if (digits.length !== 49) {
        toast({
          message: `La clave debe tener 49 dígitos (ahora: ${digits.length}). Pegá o escaneá la clave completa del RIDE.`,
          variant: "warning",
        });
        return;
      }
      setLookingUpXml(true);
      try {
        const result = await lookupSriPurchaseInvoiceByAccessKey(digits);
        if (!result?.xml) throw new Error("El SRI no devolvió el XML del comprobante.");
        try {
          openXmlImportFromText(result.xml);
        } catch (parseErr) {
          throw new Error(
            parseErr?.message ||
              "Se obtuvo el XML del SRI pero no se pudo leer la factura. Probá Subir XML.",
          );
        }
        toast({
          message: `Factura encontrada en el SRI (${result.estado || "AUTORIZADO"}).`,
          variant: "success",
        });
      } catch (err) {
        const apiMsg = err?.response?.data?.message;
        const network =
          !err?.response &&
          (err?.code === "ERR_NETWORK" || /network|ECONNREFUSED/i.test(String(err?.message || "")));
        toast({
          message: network
            ? "No hay conexión con el servidor (backend). Revisá que EdDeli esté corriendo."
            : apiMsg || err?.message || "No se pudo consultar la factura en el SRI.",
          variant: "error",
        });
      } finally {
        setLookingUpXml(false);
      }
    },
    [normalizeAccessKeyInput, openXmlImportFromText, toast],
  );

  const handleBarcodeScan = useCallback(
    (rawCode) => {
      const digitsOnly = normalizeAccessKeyInput(rawCode);
      // Código de barras RIDE = clave de acceso SRI (49 dígitos)
      if (digitsOnly.length === 49) {
        void lookupInvoiceByAccessKey(digitsOnly);
        return;
      }
      const found = findEddeliProductByCode(products, rawCode);
      if (found) {
        if (onlySoldBySupplier && selectedSupplier && !soldProductIds.has(Number(found.id))) {
          toast({
            message: `"${found.name}" no está en el historial de este proveedor`,
            variant: "warning",
          });
          return;
        }
        setSelectedProduct(String(found.id));
        setValue("productId", String(found.id));
        toast({ message: `Producto: ${found.name}`, variant: "success" });
        return;
      }
      const code = normalizeProductBarcode(rawCode) || String(rawCode || "").trim();
      toast({
        message: code ? `No se encontró producto con código "${code}"` : "Código vacío",
        variant: "warning",
      });
    },
    [
      products,
      setValue,
      toast,
      onlySoldBySupplier,
      selectedSupplier,
      soldProductIds,
      lookupInvoiceByAccessKey,
      normalizeAccessKeyInput,
    ],
  );

  useBarcodeScanner({
    enabled:
      active &&
      products.length > 0 &&
      !productDialogOpen &&
      !supplierDialogOpen &&
      !xmlImportOpen &&
      !lookingUpXml,
    onScan: handleBarcodeScan,
    ignoreWhenTypingInInputs: true,
  });

  const addItem = () => {
    const productId = Number(watch("productId"));
    const quantity = Number(watch("quantity"));
    const unitPrice = Number(watch("unitPrice"));
    if (!productId || !quantity || unitPrice == null || Number.isNaN(unitPrice)) {
      toast({ message: "Seleccione producto, cantidad y precio unitario", variant: "warning" });
      return;
    }
    const product = products.find((p) => p.id === productId);
    const productIva = Number(product?.taxRate) || 0;
    if (productIva > 0) setIvaRate(productIva);
    const lineId = newKey("line");
    setItems((prev) => [
      ...prev,
      {
        lineId,
        productId,
        quantity,
        unitPrice,
        discount: 0,
        hasIva: productIva > 0,
        taxRate: productIva,
        name: product?.name || "",
        unitLabel: getProductUnitLabel(product),
        packKey: null,
        lotKey: null,
      },
    ]);
    setBoardOrder((prev) => [...prev, { type: "item", key: lineId }]);
    setValue("productId", "");
    setSelectedProduct("");
    setValue("quantity", "");
    setValue("unitPrice", "");
  };

  const handleXmlFilePicked = async (e) => {
    const file = e.target?.files?.[0];
    e.target.value = "";
    if (!file) return;
    const name = String(file.name || "").toLowerCase();
    if (!name.endsWith(".xml") && file.type && !file.type.includes("xml")) {
      toast({ message: "Seleccioná un archivo .xml de factura SRI.", variant: "warning" });
      return;
    }
    try {
      const text = await file.text();
      openXmlImportFromText(text);
    } catch (err) {
      toast({
        message: err?.message || "No se pudo leer el XML de la factura.",
        variant: "error",
      });
    }
  };

  const handleXmlImportConfirm = async ({
    rows,
    supplierId,
    emissionDate,
    notesHint,
    invoiceNumber,
  }) => {
    const nextLines = [];
    let maxIva = Number(ivaRate) || 0;
    for (const row of rows) {
      const productId = Number(row.productId);
      const product = products.find((p) => Number(p.id) === productId);
      if (!productId || !product) continue;
      const taxRate = Number(row.taxRate) || Number(product.taxRate) || 0;
      if (taxRate > maxIva) maxIva = taxRate;
      nextLines.push({
        lineId: newKey("line"),
        productId,
        quantity: Number(row.quantity) || 0,
        unitPrice: Number(row.unitPrice) || 0,
        discount: Math.max(0, Number(row.discount) || 0),
        hasIva: taxRate > 0,
        taxRate,
        name: product.name || row.description || "",
        unitLabel: getProductUnitLabel(product),
        packKey: null,
        lotKey: null,
      });
    }
    if (!nextLines.length) {
      toast({ message: "No hay líneas válidas para agregar.", variant: "warning" });
      return;
    }

    const sid = Number(supplierId || selectedSupplier) || null;
    if (sid) {
      const codeItems = [];
      for (const row of rows) {
        const productId = Number(row.productId);
        if (!productId) continue;
        for (const raw of [row.code, row.auxCode]) {
          const supplierCode = String(raw || "").trim();
          if (!supplierCode) continue;
          codeItems.push({ supplierCode, productId });
        }
      }
      if (codeItems.length) {
        try {
          await upsertSupplierProductCodesRequest({ supplierId: sid, items: codeItems });
        } catch {
          toast({
            message: "Productos agregados, pero no se pudieron guardar los códigos del proveedor.",
            variant: "warning",
          });
        }
      }
    }

    setItems((prev) => [...prev, ...nextLines]);
    setBoardOrder((prev) => [
      ...prev,
      ...nextLines.map((line) => ({ type: "item", key: line.lineId })),
    ]);
    if (maxIva > 0) setIvaRate(maxIva);
    if (sid && !lockSupplier) {
      setSelectedSupplier(String(sid));
    }
    if (emissionDate) {
      setValue("date", emissionDate);
    }
    if (invoiceNumber) {
      setValue("invoiceNumber", String(invoiceNumber).trim());
    }
    const prevNotes = String(watch("notes") || "").trim();
    if (notesHint && !prevNotes.includes(notesHint.slice(0, 24))) {
      setValue("notes", prevNotes ? `${prevNotes}\n${notesHint}` : notesHint);
    }
    setXmlImportOpen(false);
    setXmlParsed(null);
    toast({
      message: sid
        ? `Se agregaron ${nextLines.length} producto(s). Códigos de este proveedor guardados para próximas facturas.`
        : `Se agregaron ${nextLines.length} producto(s). Elegí proveedor para guardar códigos la próxima vez.`,
      variant: "success",
    });
  };

  const removeItem = (lineId) => {
    setItems((prev) => prev.filter((it) => it.lineId !== lineId));
    setBoardOrder((prev) => prev.filter((entry) => !(entry.type === "item" && entry.key === lineId)));
  };

  const updateItemField = (lineId, field, rawValue) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.lineId !== lineId) return it;
        const value = rawValue === "" ? "" : Number(rawValue);
        return { ...it, [field]: value };
      }),
    );
  };

  // Si se modifica una línea, el valor mostrado para su paca vuelve a ser
  // exactamente la suma de las líneas que contiene.
  useEffect(() => {
    setPacks((prev) => {
      let changed = false;
      const next = prev.map((pack) => {
        const packItems = items.filter((item) => item.packKey === pack.key);
        if (!packItems.length) return pack;
        const total = packItems.reduce(
          (sum, item) =>
            sum + formatOrderLineTotal(item.quantity, item.unitPrice, item.discount),
          0,
        );
        const totalPrice = String(Number(total.toFixed(2)));
        if (pack.totalPrice === totalPrice) return pack;
        changed = true;
        return { ...pack, totalPrice };
      });
      return changed ? next : prev;
    });
  }, [items]);

  const toggleItemIva = (lineId, checked) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.lineId !== lineId) return it;
        const product = products.find((p) => Number(p.id) === Number(it.productId));
        const rate =
          Number(it.taxRate) ||
          Number(product?.taxRate) ||
          Number(ivaRate) ||
          15;
        return {
          ...it,
          hasIva: checked,
          taxRate: checked ? rate : Number(it.taxRate) || rate,
        };
      }),
    );
  };

  const handleDropItem = (lineId, zoneType, zoneKey, beforeLineId = null) => {
    setItems((prev) => {
      let assign = null;
      if (zoneType === ZONE.FREE) assign = null;
      else if (zoneType === ZONE.PACK) assign = { packKey: zoneKey, lotKey: null };
      else if (zoneType === ZONE.LOT) {
        const lot = lotsRef.current.find((l) => l.key === zoneKey);
        assign = { packKey: lot?.packKey || null, lotKey: zoneKey };
      } else return prev;
      const next = moveItemToZone(prev, lineId, assign, beforeLineId);
      setBoardOrder((bo) => syncBoardOrder(bo, next, packsRef.current));
      return next;
    });
  };

  const moveItem = (lineId, direction) => {
    const current = items.find((it) => it.lineId === lineId);
    if (!current) return;
    if (current.packKey) {
      setItems((prev) => reorderItemInZone(prev, lineId, direction));
      return;
    }
    setBoardOrder((prev) => {
      const next = moveBoardEntry(prev, "item", lineId, direction);
      if (next === prev) return prev;
      setItems((itemsPrev) => applyBoardOrderToItems(itemsPrev, next));
      return next;
    });
  };

  const assignItem = (lineId, assign) => {
    setItems((prev) => {
      const next = moveItemToZone(prev, lineId, assign, null);
      setBoardOrder((bo) => syncBoardOrder(bo, next, packsRef.current));
      return next;
    });
  };

  const createPack = () => {
    const key = newKey("pack");
    setPacks((prev) => [
      ...prev,
      {
        key,
        name: `Paca ${prev.length + 1}`,
        useLots: false,
        lotCode: "",
        expiresAt: "",
        manufacturedAt: "",
        totalPrice: "",
        expanded: true,
      },
    ]);
    setBoardOrder((prev) => [...prev, { type: "pack", key }]);
    toast({
      message: "Paca vacía creada. Arrastrá productos, usá ↑↓ o el menú ⋮ para meterlos.",
      variant: "info",
    });
  };

  const applyPacksFromLastOrder = () => {
    if (isEditing) return;
    if (!lastOrderWithPacks) {
      toast({
        message: "Este proveedor aún no tiene un pedido anterior con pacas.",
        variant: "warning",
      });
      return;
    }
    if (!items.length) {
      toast({
        message: "Agregá productos al carrito y después armamos las pacas como el último pedido.",
        variant: "info",
      });
      return;
    }
    const result = applyPackStructureToItems(
      items,
      lastOrderWithPacks.ERP_supplier_order_items || lastOrderWithPacks.items || [],
    );
    if (!result.matched) {
      toast({
        message:
          "Ningún producto del carrito coincide con las pacas del último pedido. Agregá esos productos primero.",
        variant: "warning",
      });
      return;
    }
    setItems(result.items);
    setPacks(result.packs);
    setLots(result.lots);
    setBoardOrder(result.boardOrder);
    toast({
      message: `Pacas armadas como el pedido #${lastOrderWithPacks.id} (${result.matched} producto${result.matched === 1 ? "" : "s"}).`,
      variant: "success",
    });
  };

  const importLastSupplierOrder = () => {
    if (isEditing) return;
    const source = lastOrderWithPacks || lastOrderAny;
    if (!source) {
      toast({
        message: "Este proveedor aún no tiene pedidos anteriores para copiar.",
        variant: "warning",
      });
      return;
    }
    if (items.length > 0) {
      const ok = window.confirm(
        "Esto reemplaza el carrito actual por el último pedido (productos + pacas). ¿Continuar?",
      );
      if (!ok) return;
    }

    const raw = (source.ERP_supplier_order_items || source.items || []).map((item) => ({
      ...item,
      // Borrador nuevo: sin ids ni vencimientos viejos
      id: undefined,
      expiresAt: null,
      manufacturedAt: null,
      lotCode: item.lotCode || null,
    }));
    const hydrated = hydratePacksAndLots(raw);
    const packsNext = hydrated.packs.map((pack) => ({
      ...pack,
      lotCode: "",
      expiresAt: "",
      manufacturedAt: "",
      useLots: false,
      expanded: Boolean(hydrated.items.some((it) => it.packKey === pack.key)) ? false : true,
    }));
    const itemsNext = hydrated.items.map((it) => ({
      ...it,
      lotKey: null,
      name:
        it.name ||
        products.find((p) => Number(p.id) === Number(it.productId))?.name ||
        "",
      unitLabel:
        it.unitLabel ||
        getProductUnitLabel(products.find((p) => Number(p.id) === Number(it.productId))),
    }));

    setItems(itemsNext);
    setPacks(packsNext);
    setLots([]);
    setBoardOrder(buildBoardOrder(itemsNext, packsNext));

    const firstIva = itemsNext.find((it) => Number(it.taxRate) > 0);
    if (firstIva) setIvaRate(Number(firstIva.taxRate) || 15);

    toast({
      message: `Se cargó el pedido #${source.id}. Sacá lo que no necesites.`,
      variant: "success",
    });
  };

  const updatePack = (packKey, patch) => {
    if (patch.useLots === true) {
      setPacks((prev) => {
        const pack = prev.find((p) => p.key === packKey);
        // Si la paca ya tenía un vencimiento único, lo pasa al primer lote.
        if (pack && (pack.expiresAt || pack.lotCode || pack.manufacturedAt)) {
          setLots((lotsPrev) => {
            if (lotsPrev.some((l) => l.packKey === packKey)) return lotsPrev;
            return [
              ...lotsPrev,
              {
                key: newKey("lot"),
                packKey,
                code: pack.lotCode || "",
                expiresAt: pack.expiresAt || "",
                manufacturedAt: pack.manufacturedAt || "",
              },
            ];
          });
        }
        return prev.map((p) =>
          p.key === packKey
            ? { ...p, ...patch, lotCode: "", expiresAt: "", manufacturedAt: "" }
            : p,
        );
      });
      return;
    }
    if (patch.useLots === false) {
      setItems((itemsPrev) =>
        itemsPrev.map((it) =>
          it.packKey === packKey ? { ...it, lotKey: null } : it,
        ),
      );
      setLots((lotsPrev) => lotsPrev.filter((l) => l.packKey !== packKey));
    }
    setPacks((prev) =>
      prev.map((p) => (p.key === packKey ? { ...p, ...patch } : p)),
    );
  };

  const removePack = (packKey) => {
    let freedKeys = [];
    setItems((prev) => {
      freedKeys = prev.filter((it) => it.packKey === packKey).map((it) => it.lineId);
      return prev.map((it) =>
        it.packKey === packKey ? { ...it, packKey: null, lotKey: null } : it,
      );
    });
    setLots((prev) => prev.filter((l) => l.packKey !== packKey));
    setPacks((prev) => prev.filter((p) => p.key !== packKey));
    setBoardOrder((prev) => {
      const idx = prev.findIndex((entry) => entry.type === "pack" && entry.key === packKey);
      const freed = freedKeys.map((key) => ({ type: "item", key }));
      if (idx < 0) {
        return [
          ...prev.filter((entry) => !(entry.type === "pack" && entry.key === packKey)),
          ...freed,
        ];
      }
      return [
        ...prev.slice(0, idx),
        ...freed,
        ...prev.slice(idx + 1).filter((entry) => !(entry.type === "pack" && entry.key === packKey)),
      ];
    });
  };

  const movePack = (packKey, direction) => {
    setBoardOrder((prev) => {
      const next = moveBoardEntry(prev, "pack", packKey, direction);
      if (next === prev) return prev;
      setItems((itemsPrev) => applyBoardOrderToItems(itemsPrev, next));
      return next;
    });
  };

  /** Reparte el valor total de la paca en los P. unit. de sus productos. */
  const applyPackTotal = (packKey, rawTotal) => {
    const total = Number(String(rawTotal ?? "").replace(",", "."));
    if (!Number.isFinite(total) || total < 0) {
      toast({ message: "Indicá un valor de paca válido (≥ 0).", variant: "warning" });
      return;
    }
    setPacks((prev) =>
      prev.map((p) => (p.key === packKey ? { ...p, totalPrice: String(total) } : p)),
    );
    setItems((prev) => {
      const packItems = prev.filter((it) => it.packKey === packKey);
      const rows = packItems.map((it) => ({
        lineId: it.lineId,
        qty: Number(it.quantity),
        line: formatOrderLineTotal(it.quantity, it.unitPrice, it.discount),
      }));
      const sumQty = rows.reduce((a, r) => a + (r.qty > 0 ? r.qty : 0), 0);
      const sumLine = rows.reduce((a, r) => a + (r.line > 0 ? r.line : 0), 0);
      if (!(sumQty > 0)) {
        toast({
          message: "La paca no tiene cantidades para repartir el valor.",
          variant: "warning",
        });
        return prev;
      }
      return prev.map((it) => {
        if (it.packKey !== packKey) return it;
        const qty = Number(it.quantity);
        if (!(qty > 0)) return it;
        let newUnit;
        if (sumLine > 1e-9) {
          const line = formatOrderLineTotal(it.quantity, it.unitPrice, it.discount);
          newUnit = (total * (line / sumLine)) / qty;
        } else {
          newUnit = total / sumQty;
        }
        return { ...it, unitPrice: Number(newUnit.toFixed(8)), discount: 0 };
      });
    });
    toast({
      message: "Valor de la paca aplicado a los precios unitarios.",
      variant: "success",
    });
  };

  const createLot = (packKey) => {
    setLots((prev) => [
      ...prev,
      {
        key: newKey("lot"),
        packKey,
        code: "",
        expiresAt: "",
        manufacturedAt: "",
      },
    ]);
    setPacks((prev) =>
      prev.map((p) => (p.key === packKey ? { ...p, useLots: true } : p)),
    );
  };

  const updateLot = (lotKey, patch) => {
    setLots((prev) => prev.map((l) => (l.key === lotKey ? { ...l, ...patch } : l)));
  };

  const removeLot = (lotKey) => {
    setItems((prev) =>
      prev.map((it) => (it.lotKey === lotKey ? { ...it, lotKey: null } : it)),
    );
    setLots((prev) => prev.filter((l) => l.key !== lotKey));
  };

  const handleSupplierCreated = async (created) => {
    setSupplierDialogOpen(false);
    await fetchCatalog();
    const id = created?.id ?? created?.data?.id;
    if (id != null) setSelectedSupplier(String(id));
  };

  const submitOrder = async (data) => {
    if (items.length === 0) {
      toast({ message: "Agrega al menos un producto", variant: "warning" });
      return;
    }
    if (!selectedSupplier) {
      toast({ message: "Selecciona un proveedor", variant: "warning" });
      return;
    }

    const invalidItem = items.some(
      (it) => !(Number(it.quantity) > 0) || !(Number(it.unitPrice) >= 0) || it.unitPrice === "",
    );
    if (invalidItem) {
      toast({ message: "Revisa la cantidad y el precio de los productos", variant: "warning" });
      return;
    }

    for (const pack of packs) {
      if (!String(pack.name || "").trim()) {
        toast({ message: "Todas las pacas necesitan un nombre", variant: "warning" });
        return;
      }
      const inPack = items.some((it) => it.packKey === pack.key);
      if (!inPack) {
        toast({
          message: `La paca «${pack.name || "sin nombre"}» no tiene productos. Arrastrá ítems o eliminá la paca.`,
          variant: "warning",
        });
        return;
      }
      if (
        !pack.useLots &&
        pack.manufacturedAt &&
        pack.expiresAt &&
        pack.manufacturedAt > pack.expiresAt
      ) {
        toast({
          message: `En la paca «${pack.name}» la elaboración no puede ser posterior al vencimiento`,
          variant: "warning",
        });
        return;
      }
    }

    for (const item of items) {
      if (!item.lotKey) continue;
      const lot = lots.find((l) => l.key === item.lotKey);
      if (!lot?.expiresAt) {
        toast({
          message: `El lote de «${item.name}» necesita fecha de vencimiento`,
          variant: "warning",
        });
        return;
      }
    }

    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    let sub = 0;
    let iva = 0;
    items.forEach((it) => {
      const line = formatOrderLineTotal(it.quantity, it.unitPrice, it.discount);
      sub += line;
      if (it.hasIva) {
        const rate = (Number(it.taxRate) || Number(ivaRate) || 0) / 100;
        iva += line * rate;
      }
    });
    const orderTotalNow = round2(round2(sub) + round2(iva));

    if (installments.length > 0) {
      const schedule = normalizeScheduleForApi(installments);
      if (!schedule.length) {
        toast({ message: "Revisá las cuotas: cada una necesita fecha y monto", variant: "warning" });
        return;
      }
      const sum = schedule.reduce((a, r) => a + r.amount, 0);
      if (Math.abs(sum - orderTotalNow) > 0.02) {
        toast({
          message: `La suma de cuotas (${sum.toFixed(2)}) debe igualar el total (${orderTotalNow.toFixed(2)})`,
          variant: "warning",
        });
        return;
      }
    }

    const localDT = new Date(`${data.date}T12:00:00`);
    const invoiceNumberClean = String(data.invoiceNumber || "").trim().slice(0, 80) || null;
    const payload = {
      supplierId: Number(selectedSupplier),
      notes: data.notes || null,
      invoiceNumber: invoiceNumberClean,
      date: toLocalISOWithOffset(localDT),
      items: applyBoardOrderToItems(items, boardOrder).map((it) => {
        const lotFields = resolveItemLotFields(it, packs, lots);
        return {
          productId: it.productId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          discount: Math.max(0, Number(it.discount) || 0),
          taxRate: it.hasIva ? Number(it.taxRate) || Number(ivaRate) || 0 : 0,
          ...lotFields,
        };
      }),
      paymentInstallments: installments.length
        ? normalizeScheduleForApi(installments)
        : paymentDueDate
          ? normalizeScheduleForApi([{ dueDate: paymentDueDate, amount: orderTotalNow }])
          : [],
    };

    const voucherFile = pendingVoucherFile;

    try {
      if (isEditing) {
        await toast({
          promise: updateSupplierOrderRequest(datos.id, payload),
          onSuccess: async () => {
            if (voucherFile) {
              try {
                await uploadSupplierOrderVoucher(voucherFile, datos.id, invoiceNumberClean);
              } catch {
                toast({
                  message: "Pedido actualizado, pero no se pudo subir el comprobante.",
                  variant: "warning",
                });
              }
            }
          },
        });
      } else {
        await toast({
          promise: createSupplierOrderRequest(payload),
          onSuccess: async (result) => {
            const orderId = result?.data?.id;
            if (voucherFile && orderId) {
              try {
                await uploadSupplierOrderVoucher(voucherFile, orderId, invoiceNumberClean);
              } catch {
                toast({
                  message: "Pedido guardado, pero no se pudo subir el comprobante.",
                  variant: "warning",
                });
              }
            }
          },
        });
      }
      reset();
      setItems([]);
      setPacks([]);
      setLots([]);
      setBoardOrder([]);
      setPendingVoucherFile(null);
      setPaymentDueDate("");
      setSplitPayments(false);
      setInstallmentCount(2);
      setInstallments([]);
      if (reload) await reload();
      if (onClose) await onClose();
    } catch {
      /* toast */
    }
  };

  useEffect(() => {
    fetchCatalog();

    if (isEditing && datos) {
      setSelectedSupplier(String(datos.supplierId || ""));
      setValue("notes", datos.notes || "");
      setValue("invoiceNumber", datos.invoiceNumber || "");
      setValue("date", normalizeToYYYYMMDD(datos));
      const hydrated = hydratePacksAndLots(datos.ERP_supplier_order_items || []);
      setItems(hydrated.items);
      setPacks(hydrated.packs);
      setLots(hydrated.lots);
      setBoardOrder(buildBoardOrder(hydrated.items, hydrated.packs));
      const firstIva = (datos.ERP_supplier_order_items || []).find(
        (item) => Number(item.taxRate) > 0,
      );
      if (firstIva) setIvaRate(Number(firstIva.taxRate));
      const sched = Array.isArray(datos.paymentInstallments) ? datos.paymentInstallments : [];
      setInstallments(
        sched.map((r) => ({
          id: r.id ?? null,
          sequence: r.sequence,
          dueDate: toDateOnly(r.dueDate) || "",
          amount: Number(r.amount) || 0,
          locked: Boolean(r.locked || r.isPaid),
          paidAmount: Number(r.paidAmount) || 0,
          remainingAmount: Number(r.remainingAmount) || 0,
          isPaid: Boolean(r.isPaid),
        })),
      );
      setPaymentDueDate(
        toDateOnly(datos.paymentDueDate) ||
          toDateOnly(sched[sched.length - 1]?.dueDate) ||
          "",
      );
      setSplitPayments(sched.length > 1);
      setInstallmentCount(Math.max(2, sched.length || 2));
      return;
    }

    setItems([]);
    setPacks([]);
    setLots([]);
    setBoardOrder([]);
    setPendingVoucherFile(null);
    setPaymentDueDate("");
    setSplitPayments(false);
    setInstallmentCount(2);
    setInstallments([]);
    setValue("notes", "");
    setValue("invoiceNumber", "");
    setValue("date", prefillDate || localISODate());
    setSelectedSupplier(prefillSupplierId ? String(prefillSupplierId) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, isEditing, prefillSupplierId, prefillDate]);

  const { subtotal, ivaTotal, itemsTotal, discountTotal } = useMemo(() => {
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    let sub = 0;
    let iva = 0;
    let disc = 0;
    items.forEach((it) => {
      const line = formatOrderLineTotal(it.quantity, it.unitPrice, it.discount);
      disc += Math.max(0, Number(it.discount) || 0);
      sub += line;
      if (it.hasIva) {
        const rate = (Number(it.taxRate) || Number(ivaRate) || 0) / 100;
        iva += line * rate;
      }
    });
    const rSub = round2(sub);
    const rIva = round2(iva);
    return {
      subtotal: rSub,
      ivaTotal: rIva,
      itemsTotal: round2(rSub + rIva),
      discountTotal: round2(disc),
    };
  }, [items, ivaRate]);

  const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));

  useImperativeHandle(tourApiRef, () => ({
    async runItemsDemo() {
      const gen = ++tourGenRef.current;
      const supplier = suppliers[0];
      if (supplier && !lockSupplier) {
        setSelectedSupplier(String(supplier.id));
      }
      setItems([]);
      setPacks([]);
      setLots([]);
      setBoardOrder([]);
      const picks = [
        products.find((p) => Number(p.id) === 101),
        products.find((p) => Number(p.id) === 201),
      ].filter(Boolean);
      const list = picks.length ? picks : products.slice(0, 2);
      for (const p of list) {
        await sleep(380);
        if (gen !== tourGenRef.current) return;
        const unitPrice = Number(p.supplierPrice ?? p.price ?? 0.5);
        const qty = Number(p.id) === 201 ? 10 : 20;
        setSelectedProduct(p.id);
        setValue("productId", p.id);
        setValue("quantity", qty);
        setValue("unitPrice", unitPrice);
        await sleep(220);
        if (gen !== tourGenRef.current) return;
        const lineId = newKey("line");
        setItems((prev) => [
          ...prev,
          {
            lineId,
            productId: p.id,
            quantity: qty,
            unitPrice,
            discount: 0,
            hasIva: Number(p?.taxRate) > 0,
            taxRate: Number(p?.taxRate) || 0,
            name: p.name,
            unitLabel: getProductUnitLabel(p),
            packKey: null,
            lotKey: null,
            _tourDemo: true,
          },
        ]);
        setBoardOrder((prev) => [...prev, { type: "item", key: lineId }]);
        setSelectedProduct("");
        setValue("productId", "");
        setValue("quantity", "");
        setValue("unitPrice", "");
      }
    },
    resetDemo() {
      tourGenRef.current += 1;
      if (!isEditing) {
        setItems((prev) => prev.filter((it) => !it._tourDemo));
        setPacks([]);
        setLots([]);
        setBoardOrder([]);
        setSelectedProduct("");
      }
    },
    createPackDemo() {
      if (isEditing) return;
      createPack();
    },
  }));

  return (
    <Box
      component="form"
      data-tour="pedido-prov-form"
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        height: { xs: "auto", md: "min(78vh, 820px)" },
        mt: 0,
      }}
      onSubmit={handleSubmit(submitOrder)}
    >
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", px: { xs: 0.5, sm: 1 }, pt: 0.5, pb: 1 }}>
      <Alert severity="info" sx={{ mb: 1, py: 0.25 }}>
        <strong>Pedido a proveedor</strong>
        {isEditing ? ` · #${datos?.id ?? ""}` : " · nuevo"}
      </Alert>
      <Grid container spacing={1.25}>
        <Grid item xs={12} md={5}>
          <Grid container spacing={1}>
            <Grid item xs={12} data-tour="pedido-prov-supplier">
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ flex: 1 }}>
                  <SearchableSelect
                    label="Proveedor"
                    items={suppliers}
                    value={selectedSupplier}
                    onChange={(val) => setSelectedSupplier(val != null ? String(val) : "")}
                    disabled={lockSupplier}
                  />
                </Box>
                {!lockSupplier && (
                  <Tooltip title="Agregar proveedor nuevo">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => setSupplierDialogOpen(true)}
                      sx={{ border: 1, borderColor: "primary.main" }}
                    >
                      <AddBusinessIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} data-tour="pedido-prov-product">
              <input type="hidden" {...register("productId")} />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={onlySoldBySupplier}
                    disabled={!selectedSupplier || loadingSoldProducts}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setOnlySoldBySupplier(on);
                      if (on && selectedProductId) {
                        const pid = Number(selectedProductId);
                        if (!soldProductIds.has(pid)) {
                          setSelectedProduct("");
                          setValue("productId", "");
                        }
                      }
                    }}
                  />
                }
                label={
                  <Typography variant="caption">
                    Solo vendidos por este proveedor
                    {onlySoldBySupplier && selectedSupplier
                      ? ` (${soldProductIds.size})`
                      : ""}
                  </Typography>
                }
                sx={{ mb: 0.25, ml: 0, alignItems: "center" }}
              />
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ flex: 1 }}>
                  <SearchableSelect
                    label="Producto"
                    items={productOptions}
                    value={selectedProduct}
                    productMeta
                    onChange={(val) => {
                      setSelectedProduct(val);
                      setValue("productId", val);
                    }}
                    placeholder={
                      onlySoldBySupplier && !selectedSupplier
                        ? "Seleccioná un proveedor primero…"
                        : onlySoldBySupplier && soldProductIds.size === 0
                          ? "Sin historial de ventas de este proveedor…"
                          : "Buscar o escanear código…"
                    }
                    getSearchText={(p) =>
                      [p?.barcode, p?.sku].filter(Boolean).join(" ")
                    }
                    onEnterWithInput={handleBarcodeScan}
                  />
                </Box>
                <Tooltip
                  title={
                    currentProduct
                      ? "Editar producto seleccionado"
                      : "Crear producto nuevo"
                  }
                >
                  <IconButton
                    color="primary"
                    size="small"
                    onClick={() => {
                      if (currentProduct) {
                        setProductDialogMode("edit");
                      } else {
                        setProductDialogMode("create");
                      }
                      setProductDialogOpen(true);
                    }}
                    sx={{ border: 1, borderColor: "primary.main" }}
                  >
                    {currentProduct ? <EditIcon fontSize="small" /> : <AddBoxIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            {currentProduct && (
              <Grid item xs={12}>
                <ProductPriceReference
                  product={currentProduct}
                  quantity={watchQuantity}
                  unitPrice={watchUnitPrice}
                  variant="supplier"
                  lastPurchase={currentLastPurchase}
                  onApplyPrice={(price) =>
                    setValue("unitPrice", price, { shouldDirty: true, shouldValidate: true })
                  }
                />
              </Grid>
            )}
            <Grid item xs={4} data-tour="pedido-prov-line">
              <TextField
                fullWidth
                size="small"
                label="Cantidad"
                type="number"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0.01, step: "any" }}
                {...register("quantity")}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                label="Precio unit."
                type="number"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0, step: "any" }}
                {...register("unitPrice")}
              />
            </Grid>
            <Grid item xs={4} sx={{ display: "flex", alignItems: "stretch" }}>
              <Button
                fullWidth
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={addItem}
                sx={{ minHeight: 40 }}
              >
                Agregar
              </Button>
            </Grid>
            <Grid item xs={12}>
              <input
                ref={xmlFileInputRef}
                type="file"
                accept=".xml,text/xml,application/xml"
                hidden
                onChange={(e) => void handleXmlFilePicked(e)}
              />
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Clave acceso SRI (49 dígitos)"
                    value={accessKeyLookup}
                    onChange={(e) =>
                      setAccessKeyLookup(normalizeAccessKeyInput(e.target.value))
                    }
                    onPaste={(e) => {
                      const text = e.clipboardData?.getData("text") || "";
                      const digits = normalizeAccessKeyInput(text);
                      if (!digits) return;
                      e.preventDefault();
                      setAccessKeyLookup(digits);
                      if (digits.length === 49) {
                        window.setTimeout(() => void lookupInvoiceByAccessKey(digits), 0);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      e.stopPropagation();
                      const digits = normalizeAccessKeyInput(e.target.value);
                      void lookupInvoiceByAccessKey(digits);
                    }}
                    placeholder="Pegá o escaneá la clave del RIDE"
                    helperText={`${String(accessKeyLookup || "").length}/49 · IVA por producto en la lista`}
                    inputProps={{ inputMode: "numeric", autoComplete: "off" }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <QrCodeScannerIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end" sx={{ gap: 0.25 }}>
                          <Tooltip
                            title={lookingUpXml ? "Consultando SRI…" : "Buscar en SRI"}
                          >
                            <span>
                              <IconButton
                                type="button"
                                color="primary"
                                size="small"
                                edge="end"
                                disabled={lookingUpXml}
                                onClick={() =>
                                  void lookupInvoiceByAccessKey(accessKeyLookup)
                                }
                                aria-label="Buscar en SRI"
                              >
                                {lookingUpXml ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : (
                                  <SearchIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Subir XML factura">
                            <span>
                              <IconButton
                                type="button"
                                color="primary"
                                size="small"
                                edge="end"
                                disabled={lookingUpXml}
                                onClick={() => xmlFileInputRef.current?.click()}
                                aria-label="Subir XML factura"
                              >
                                <UploadFileIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                {/* Misma columna de ícono que Proveedor / Producto */}
                <Box
                  aria-hidden
                  sx={{
                    width: 34,
                    height: 34,
                    flexShrink: 0,
                    visibility: "hidden",
                    pointerEvents: "none",
                  }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Fecha del pedido"
                type="date"
                InputLabelProps={{ shrink: true }}
                {...register("date")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Nº factura proveedor"
                placeholder="001-001-000000123"
                {...register("invoiceNumber")}
              />
            </Grid>
            <Grid item xs={12}>
              <OrderPaymentScheduleFields
                partyKind="supplier"
                deliveryDate={watch("date")}
                orderTotal={itemsTotal}
                paymentDueDate={paymentDueDate}
                onPaymentDueDateChange={setPaymentDueDate}
                splitPayments={splitPayments}
                onSplitPaymentsChange={setSplitPayments}
                installmentCount={installmentCount}
                onInstallmentCountChange={setInstallmentCount}
                installments={installments}
                onInstallmentsChange={setInstallments}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Notas"
                multiline
                rows={2}
                {...register("notes")}
              />
            </Grid>
            {isEditing ? (
              <Grid item xs={12}>
                <AttachmentField
                  entityType="supplier_order"
                  entityId={datos.id}
                  label="Comprobantes ya guardados"
                  helperText=""
                  compact
                />
              </Grid>
            ) : null}
          </Grid>
        </Grid>

        <Grid item xs={12} md={7}>
          <Box
            data-tour="pedido-prov-items"
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              p: 1,
              height: "100%",
              minHeight: { xs: 280, md: 420 },
              display: "flex",
              flexDirection: "column",
              gap: 0.75,
              bgcolor: "background.default",
              maxHeight: { md: "100%" },
              overflow: "auto",
            }}
          >
            {!isEditing && selectedSupplier && (lastOrderWithPacks || lastOrderAny) ? (
              <Alert
                severity="info"
                sx={{ py: 0.5, "& .MuiAlert-message": { width: "100%" } }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  <Typography variant="body2">
                    {lastOrderWithPacks
                      ? `Último pedido con pacas: #${lastOrderWithPacks.id}. Podés reutilizar esa estructura.`
                      : `Último pedido: #${lastOrderAny.id}. Todavía no tenía pacas; igual podés traerlo.`}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!lastOrderWithPacks || cartMatchesLastPacks === 0}
                      onClick={applyPacksFromLastOrder}
                    >
                      Armar pacas del carrito
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      disableElevation
                      onClick={importLastSupplierOrder}
                    >
                      Traer último pedido
                    </Button>
                  </Box>
                  {!items.length ? (
                    <Typography variant="caption" color="text.secondary">
                      Opción 1: agregá productos y después “Armar pacas del carrito”. Opción 2: traé
                      todo y andá quitando.
                    </Typography>
                  ) : lastOrderWithPacks && cartMatchesLastPacks === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      Los productos del carrito no coinciden con las pacas del último pedido.
                    </Typography>
                  ) : null}
                </Box>
              </Alert>
            ) : null}

            <SupplierOrderItemsBoard
              items={items}
              packs={packs}
              lots={lots}
              boardOrder={boardOrder}
              ivaRate={ivaRate}
              onRemoveItem={removeItem}
              onUpdateItemField={updateItemField}
              onToggleItemIva={toggleItemIva}
              onDropItem={handleDropItem}
              onMoveItem={moveItem}
              onAssignItem={assignItem}
              onCreatePack={createPack}
              onUpdatePack={updatePack}
              onRemovePack={removePack}
              onMovePack={movePack}
              onApplyPackTotal={applyPackTotal}
              onCreateLot={createLot}
              onUpdateLot={updateLot}
              onRemoveLot={removeLot}
              onOpenShoppingList={() => setShoppingListOpen(true)}
            />

            {items.length > 0 && (
              <Box sx={{ mt: "auto", pt: 1, borderTop: 1, borderColor: "divider" }}>
                {discountTotal > 0 ? (
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      Descuentos
                    </Typography>
                    <Typography variant="body2">−{formatProductPrice(discountTotal)}</Typography>
                  </Box>
                ) : null}
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography variant="body2">{formatProductPrice(subtotal)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    IVA
                  </Typography>
                  <Typography variant="body2">{formatProductPrice(ivaTotal)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Total
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {formatProductPrice(itemsTotal)}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          px: { xs: 1, sm: 1.5 },
          py: 1,
          position: "sticky",
          bottom: 0,
          zIndex: 2,
        }}
      >
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) setPendingVoucherFile(file);
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) setPendingVoucherFile(file);
          }}
        />
        {pendingVoucherFile ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              mb: 0.75,
            }}
          >
            <ImageIcon fontSize="small" color="primary" />
            <Typography variant="caption" noWrap title={pendingVoucherFile.name} sx={{ maxWidth: 220 }}>
              {pendingVoucherFile.name}
            </Typography>
            <IconButton
              size="small"
              aria-label="Quitar foto"
              onClick={() => setPendingVoucherFile(null)}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : null}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Button
            type="button"
            size="small"
            variant="outlined"
            startIcon={<ImageIcon />}
            onClick={() => galleryInputRef.current?.click()}
          >
            Subir foto
          </Button>
          <Button
            type="button"
            size="small"
            variant="outlined"
            startIcon={<PhotoCameraIcon />}
            onClick={() => cameraInputRef.current?.click()}
          >
            Tomar foto
          </Button>
          <Button
            data-tour="pedido-prov-save"
            type="submit"
            variant="contained"
            size="small"
            sx={{ minWidth: 160, px: 2 }}
          >
            {isEditing ? "Guardar pedido" : "Registrar pedido"}
          </Button>
        </Box>
      </Box>

      <Dialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        scroll="paper"
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, pt: 1 }}>
          <DialogTitle sx={{ p: 0, fontWeight: 700, fontSize: "1.05rem" }}>
            {productDialogMode === "edit" ? "Editar producto" : "Crear producto"}
          </DialogTitle>
          <IconButton aria-label="Cerrar" onClick={() => setProductDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent dividers>
          <ProductForm
            key={
              productDialogOpen
                ? productDialogMode === "edit"
                  ? `edit-product-${currentProduct?.id || "x"}`
                  : "new-supplier-product"
                : "closed"
            }
            isEditing={productDialogMode === "edit"}
            datos={productDialogMode === "edit" ? currentProduct || {} : {}}
            onClose={() => setProductDialogOpen(false)}
            reload={handleProductSaved}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
          <Button type="button" onClick={() => setProductDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button type="submit" form="eddeli-product-form" variant="contained" sx={{ minWidth: 160 }}>
            {productDialogMode === "edit" ? "Guardar cambios" : "Guardar producto"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={supplierDialogOpen}
        onClose={() => setSupplierDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        scroll="paper"
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, pt: 1 }}>
          <DialogTitle sx={{ p: 0, fontWeight: 700, fontSize: "1.05rem" }}>
            Agregar proveedor
          </DialogTitle>
          <IconButton aria-label="Cerrar" onClick={() => setSupplierDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent dividers>
          <SupplierForm
            key={supplierDialogOpen ? "new-supplier" : "closed"}
            isEditing={false}
            datos={{}}
            onClose={() => setSupplierDialogOpen(false)}
            reload={handleSupplierCreated}
          />
        </DialogContent>
      </Dialog>

      <SupplierInvoiceXmlImportDialog
        open={xmlImportOpen}
        onClose={() => {
          setXmlImportOpen(false);
          setXmlParsed(null);
        }}
        parsed={xmlParsed}
        products={products}
        suppliers={suppliers}
        preferredSupplierId={selectedSupplier || null}
        supplierOrdersCache={supplierOrdersCache}
        onConfirm={(payload) => void handleXmlImportConfirm(payload)}
        onProductCreated={(product) => {
          if (!product?.id) return;
          setProducts((prev) => {
            const idx = prev.findIndex((p) => Number(p.id) === Number(product.id));
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...product };
              return next;
            }
            return [...prev, product];
          });
        }}
        onSupplierSaved={(supplier) => {
          if (!supplier?.id) return;
          setSuppliers((prev) => {
            const idx = prev.findIndex((s) => Number(s.id) === Number(supplier.id));
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...supplier };
              return next;
            }
            return [...prev, supplier];
          });
          setSelectedSupplier(String(supplier.id));
        }}
      />

      <SupplierOrderShoppingListDialog
        open={shoppingListOpen}
        onClose={() => setShoppingListOpen(false)}
        items={items}
        supplierName={
          suppliers.find((s) => String(s.id) === String(selectedSupplier))?.name || ""
        }
        dateLabel={watch("date") || ""}
        notes={watch("notes") || ""}
        orderId={isEditing ? datos?.id : null}
      />
    </Box>
  );
}

const SupplierOrderFormForward = forwardRef(SupplierOrderForm);

/** Estilos para que el modal deje el botón Guardar fijo abajo. */
export const SUPPLIER_ORDER_DIALOG_PAPER_SX = {
  display: "flex",
  flexDirection: "column",
  height: { xs: "100%", sm: "min(90vh, 900px)" },
  maxHeight: "92vh",
  width: { sm: "min(96vw, 1400px)" },
  maxWidth: { sm: "1400px" },
};

export const SUPPLIER_ORDER_DIALOG_CONTENT_SX = {
  p: { xs: 1, sm: 1.5 },
  pt: { xs: 0.5, sm: 1 },
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  flex: 1,
  minHeight: 0,
};

export default SupplierOrderFormForward;
