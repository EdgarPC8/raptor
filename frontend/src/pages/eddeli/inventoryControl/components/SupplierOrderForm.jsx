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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AddBoxIcon from "@mui/icons-material/AddBox";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
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
import { useAuth } from "../../../../context/AuthContext";
import SearchableSelect from "../../../../components/SearchableSelect";
import AttachmentField from "./AttachmentField.jsx";
import ProductForm from "./ProductForm.jsx";
import SupplierForm from "./SupplierForm.jsx";
import ProductPriceReference, {
  getProductUnitLabel,
  formatOrderLineTotal,
  formatProductPrice,
} from "./ProductPriceReference";
import SupplierOrderItemsBoard, { ZONE } from "./SupplierOrderItemsBoard.jsx";
import SupplierInvoiceXmlImportDialog from "./SupplierInvoiceXmlImportDialog.jsx";
import { uploadSupplierOrderVoucher } from "../../../../api/documentRequest.js";
import { useBarcodeScanner } from "../../../../hooks/useBarcodeScanner.js";
import {
  findEddeliProductByCode,
  normalizeProductBarcode,
} from "../../../../utils/productLookup.js";
import {
  buildLastPurchaseByProductId,
  getLastPurchaseForProduct,
} from "../../../../utils/supplierLastPurchase.js";
import { parseSriPurchaseInvoiceXml } from "../../../../utils/parseSriPurchaseInvoiceXml.js";
import {
  reorderItemInZone,
  moveItemToZone,
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
        expanded: true,
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
      hasIva: Number(item.taxRate) > 0,
      name: item.ERP_inventory_product?.name || item.name || "",
      unitLabel: getProductUnitLabel(item.ERP_inventory_product),
      packKey: packKey || null,
      lotKey,
    };
  });

  for (const pack of packs) {
    const sum = items
      .filter((it) => it.packKey === pack.key)
      .reduce((acc, it) => acc + formatOrderLineTotal(it.quantity, it.unitPrice), 0);
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
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [pendingVoucherFile, setPendingVoucherFile] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  /** create = producto nuevo · edit = editar el seleccionado */
  const [productDialogMode, setProductDialogMode] = useState("create");
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [xmlImportOpen, setXmlImportOpen] = useState(false);
  const [xmlParsed, setXmlParsed] = useState(null);
  const xmlFileInputRef = useRef(null);
  const [ivaRate, setIvaRate] = useState(15);
  /** Solo productos que este proveedor ya me vendió (historial de pedidos). */
  const [onlySoldBySupplier, setOnlySoldBySupplier] = useState(false);
  const [soldProductIds, setSoldProductIds] = useState(() => new Set());
  const [loadingSoldProducts, setLoadingSoldProducts] = useState(false);
  /** Cache de pedidos a proveedor para última compra y filtro por historial. */
  const [supplierOrdersCache, setSupplierOrdersCache] = useState([]);
  const tourGenRef = useRef(0);
  const lotsRef = useRef([]);
  const { toast } = useAuth();

  useEffect(() => {
    lotsRef.current = lots;
  }, [lots]);

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

  const handleBarcodeScan = useCallback(
    (rawCode) => {
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
    [products, setValue, toast, onlySoldBySupplier, selectedSupplier, soldProductIds],
  );

  useBarcodeScanner({
    enabled: active && products.length > 0 && !productDialogOpen && !supplierDialogOpen && !xmlImportOpen,
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
    setItems((prev) => [
      ...prev,
      {
        lineId: newKey("line"),
        productId,
        quantity,
        unitPrice,
        hasIva: productIva > 0,
        name: product?.name || "",
        unitLabel: getProductUnitLabel(product),
        packKey: null,
        lotKey: null,
      },
    ]);
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
      const parsed = parseSriPurchaseInvoiceXml(text);
      setXmlParsed(parsed);
      setXmlImportOpen(true);
    } catch (err) {
      toast({
        message: err?.message || "No se pudo leer el XML de la factura.",
        variant: "error",
      });
    }
  };

  const handleXmlImportConfirm = async ({ rows, supplierId, emissionDate, notesHint }) => {
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
        hasIva: taxRate > 0,
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
    if (maxIva > 0) setIvaRate(maxIva);
    if (sid && !lockSupplier) {
      setSelectedSupplier(String(sid));
    }
    if (emissionDate) {
      setValue("date", emissionDate);
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

  const toggleItemIva = (lineId, checked) => {
    setItems((prev) =>
      prev.map((it) => (it.lineId === lineId ? { ...it, hasIva: checked } : it)),
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
      return moveItemToZone(prev, lineId, assign, beforeLineId);
    });
  };

  const moveItem = (lineId, direction) => {
    setItems((prev) => reorderItemInZone(prev, lineId, direction));
  };

  const assignItem = (lineId, assign) => {
    setItems((prev) => moveItemToZone(prev, lineId, assign, null));
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
    toast({
      message: "Paca vacía creada. Arrastrá productos, usá ↑↓ o el menú ⋮ para meterlos.",
      variant: "info",
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
    setItems((prev) =>
      prev.map((it) =>
        it.packKey === packKey ? { ...it, packKey: null, lotKey: null } : it,
      ),
    );
    setLots((prev) => prev.filter((l) => l.packKey !== packKey));
    setPacks((prev) => prev.filter((p) => p.key !== packKey));
  };

  const movePack = (packKey, direction) => {
    setPacks((prev) => {
      const i = prev.findIndex((p) => p.key === packKey);
      if (i < 0) return prev;
      const j = i + direction;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
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
        line: formatOrderLineTotal(it.quantity, it.unitPrice),
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
          const line = formatOrderLineTotal(it.quantity, it.unitPrice);
          newUnit = (total * (line / sumLine)) / qty;
        } else {
          newUnit = total / sumQty;
        }
        return { ...it, unitPrice: Number(newUnit.toFixed(8)) };
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

    const localDT = new Date(`${data.date}T12:00:00`);
    const payload = {
      supplierId: Number(selectedSupplier),
      notes: data.notes || null,
      date: toLocalISOWithOffset(localDT),
      items: items.map((it) => {
        const lotFields = resolveItemLotFields(it, packs, lots);
        return {
          productId: it.productId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          taxRate: it.hasIva ? Number(ivaRate) || 0 : 0,
          ...lotFields,
        };
      }),
    };

    const voucherFile = pendingVoucherFile;

    try {
      if (isEditing) {
        await toast({
          promise: updateSupplierOrderRequest(datos.id, payload),
          onSuccess: async () => {
            if (voucherFile) {
              try {
                await uploadSupplierOrderVoucher(voucherFile, datos.id);
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
                await uploadSupplierOrderVoucher(voucherFile, orderId);
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
      setPendingVoucherFile(null);
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
      setValue("date", normalizeToYYYYMMDD(datos));
      const hydrated = hydratePacksAndLots(datos.ERP_supplier_order_items || []);
      setItems(hydrated.items);
      setPacks(hydrated.packs);
      setLots(hydrated.lots);
      const firstIva = (datos.ERP_supplier_order_items || []).find(
        (item) => Number(item.taxRate) > 0,
      );
      if (firstIva) setIvaRate(Number(firstIva.taxRate));
      return;
    }

    setItems([]);
    setPacks([]);
    setLots([]);
    setPendingVoucherFile(null);
    setValue("notes", "");
    setValue("date", prefillDate || localISODate());
    setSelectedSupplier(prefillSupplierId ? String(prefillSupplierId) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, isEditing, prefillSupplierId, prefillDate]);

  const { subtotal, ivaTotal, itemsTotal } = useMemo(() => {
    const rate = (Number(ivaRate) || 0) / 100;
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    let sub = 0;
    let iva = 0;
    items.forEach((it) => {
      const line = formatOrderLineTotal(it.quantity, it.unitPrice);
      sub += line;
      if (it.hasIva) iva += line * rate;
    });
    const rSub = round2(sub);
    const rIva = round2(iva);
    return { subtotal: rSub, ivaTotal: rIva, itemsTotal: round2(rSub + rIva) };
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
        setItems((prev) => [
          ...prev,
          {
            lineId: newKey("line"),
            productId: p.id,
            quantity: qty,
            unitPrice,
            hasIva: Number(p?.taxRate) > 0,
            name: p.name,
            unitLabel: getProductUnitLabel(p),
            packKey: null,
            lotKey: null,
            _tourDemo: true,
          },
        ]);
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
      sx={{ mt: 1 }}
      onSubmit={handleSubmit(submitOrder)}
    >
      <Alert severity="info" sx={{ mb: 2, py: 0.75 }}>
        <strong>Pedido a proveedor</strong>
        {isEditing ? ` · #${datos?.id ?? ""}` : " · nuevo"}: compra/entrada de mercadería (no es
        pedido de cliente).
      </Alert>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Grid container spacing={2}>
            <Grid item xs={12} data-tour="pedido-prov-supplier">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                      onClick={() => setSupplierDialogOpen(true)}
                      sx={{ border: 1, borderColor: "primary.main" }}
                    >
                      <AddBusinessIcon />
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
                      // Si el producto actual no está en el filtro, limpiarlo
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
                  <Typography variant="body2">
                    Solo productos que este proveedor me ha vendido
                    {onlySoldBySupplier && selectedSupplier
                      ? ` (${soldProductIds.size})`
                      : ""}
                  </Typography>
                }
                sx={{ mb: 0.5, ml: 0, alignItems: "center" }}
              />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                          : "Buscar o escanear código de barras…"
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
                    {currentProduct ? <EditIcon /> : <AddBoxIcon />}
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
                label="Precio unit."
                type="number"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0, step: "any" }}
                {...register("unitPrice")}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="IVA (%)"
                type="number"
                value={ivaRate}
                onChange={(e) =>
                  setIvaRate(e.target.value === "" ? "" : Number(e.target.value))
                }
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0, step: "0.01" }}
              />
            </Grid>
            <Grid item xs={12} sx={{ display: "flex", justifyContent: "flex-start", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              <Tooltip title="Agregar a la lista (sin paca)">
                <IconButton
                  color="primary"
                  onClick={addItem}
                  sx={{ border: 1, borderColor: "primary.main" }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                Se agrega sin paca; después lo arrastrás si hace falta
              </Typography>
              <Box sx={{ flex: 1 }} />
              <input
                ref={xmlFileInputRef}
                type="file"
                accept=".xml,text/xml,application/xml"
                hidden
                onChange={(e) => void handleXmlFilePicked(e)}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => xmlFileInputRef.current?.click()}
              >
                Subir XML factura
              </Button>
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth label="Fecha del pedido" type="date" {...register("date")} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notas" multiline rows={2} {...register("notes")} />
            </Grid>
            <Grid item xs={12}>
              {isEditing ? (
                <AttachmentField
                  entityType="supplier_order"
                  entityId={datos.id}
                  pendingFile={pendingVoucherFile}
                  onPendingFileChange={setPendingVoucherFile}
                  label="Factura / nota del proveedor (PDF o imagen)"
                />
              ) : (
                <AttachmentField
                  label="Factura / nota del proveedor — PDF o imagen (opcional)"
                  pendingFile={pendingVoucherFile}
                  onPendingFileChange={setPendingVoucherFile}
                />
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                El XML se usa para importar productos; el PDF/imagen queda como comprobante adjunto.
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Button data-tour="pedido-prov-save" type="submit" variant="contained" fullWidth>
                {isEditing ? "Guardar pedido a proveedor" : "Registrar pedido a proveedor"}
              </Button>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={7}>
          <Box
            data-tour="pedido-prov-items"
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              p: 1.5,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 1,
              bgcolor: "background.default",
              maxHeight: { md: "70vh" },
              overflow: "auto",
            }}
          >
            <SupplierOrderItemsBoard
              items={items}
              packs={packs}
              lots={lots}
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
            />

            {items.length > 0 && (
              <Box sx={{ mt: "auto", pt: 1, borderTop: 1, borderColor: "divider" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography variant="body2">{formatProductPrice(subtotal)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    IVA ({Number(ivaRate) || 0}%)
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
        onConfirm={(payload) => void handleXmlImportConfirm(payload)}
      />
    </Box>
  );
}

const SupplierOrderFormForward = forwardRef(SupplierOrderForm);
export default SupplierOrderFormForward;
