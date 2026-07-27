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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AddBoxIcon from "@mui/icons-material/AddBox";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import CloseIcon from "@mui/icons-material/Close";
import { useForm } from "react-hook-form";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  createSupplierOrderRequest,
  updateSupplierOrderRequest,
  getAllSuppliersRequest,
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
import { uploadSupplierOrderVoucher } from "../../../../api/documentRequest.js";
import { useBarcodeScanner } from "../../../../hooks/useBarcodeScanner.js";
import {
  findEddeliProductByCode,
  normalizeProductBarcode,
} from "../../../../utils/productLookup.js";

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

  const items = rawItems.map((item) => {
    const lineId = newKey("line");
    const packKey = item.packKey || null;
    const hasLot = Boolean(item.expiresAt || item.lotCode);

    if (packKey && !packByKey.has(packKey)) {
      const pack = {
        key: packKey,
        name: item.packName || "Paca",
        useLots: hasLot,
      };
      packByKey.set(packKey, pack);
      packs.push(pack);
    } else if (packKey && hasLot) {
      packByKey.get(packKey).useLots = true;
    }

    let lotKey = null;
    if (packKey && hasLot) {
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

  return { items, packs, lots };
}

function resolveItemLotFields(item, packs, lots) {
  const pack = item.packKey ? packs.find((p) => p.key === item.packKey) : null;
  const lot = item.lotKey ? lots.find((l) => l.key === item.lotKey) : null;
  return {
    packKey: pack?.key || null,
    packName: pack?.name?.trim() || null,
    lotCode: lot?.code?.trim() || null,
    expiresAt: lot?.expiresAt || null,
    manufacturedAt: lot?.manufacturedAt || null,
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
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [ivaRate, setIvaRate] = useState(15);
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

  useEffect(() => {
    if (!selectedProductId) return;
    const product = products.find((p) => p.id === Number(selectedProductId));
    if (product?.supplierPrice != null) {
      setValue("unitPrice", product.supplierPrice);
    }
  }, [selectedProductId, products, setValue]);

  const fetchCatalog = async () => {
    const [prodRes, supRes] = await Promise.all([getAllProductsAll(), getAllSuppliersRequest()]);
    const list = prodRes?.data || [];
    setProducts(list);
    setSuppliers(supRes?.data || []);
    return list;
  };

  const handleProductCreated = async (created) => {
    setProductDialogOpen(false);
    await fetchCatalog();
    const id = created?.id ?? created?.data?.id;
    if (id != null) {
      setSelectedProduct(String(id));
      setValue("productId", String(id));
    }
  };

  const handleBarcodeScan = useCallback(
    (rawCode) => {
      const found = findEddeliProductByCode(products, rawCode);
      if (found) {
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
    [products, setValue, toast],
  );

  useBarcodeScanner({
    enabled: active && products.length > 0 && !productDialogOpen && !supplierDialogOpen,
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

  const handleDropItem = (lineId, zoneType, zoneKey) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.lineId !== lineId) return it;
        if (zoneType === ZONE.FREE) {
          return { ...it, packKey: null, lotKey: null };
        }
        if (zoneType === ZONE.PACK) {
          return { ...it, packKey: zoneKey, lotKey: null };
        }
        if (zoneType === ZONE.LOT) {
          const lot = lotsRef.current.find((l) => l.key === zoneKey);
          return {
            ...it,
            packKey: lot?.packKey || it.packKey,
            lotKey: zoneKey,
          };
        }
        return it;
      }),
    );
  };

  const createPack = () => {
    const key = newKey("pack");
    setPacks((prev) => [...prev, { key, name: `Paca ${prev.length + 1}`, useLots: false }]);
  };

  const updatePack = (packKey, patch) => {
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
        setSelectedProduct("");
      }
    },
  }));

  return (
    <Box
      component="form"
      data-tour="pedido-prov-form"
      sx={{ mt: 1 }}
      onSubmit={handleSubmit(submitOrder)}
    >
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <SearchableSelect
                    label="Producto"
                    items={products}
                    value={selectedProduct}
                    onChange={(val) => {
                      setSelectedProduct(val);
                      setValue("productId", val);
                    }}
                    placeholder="Buscar o escanear código de barras…"
                    getSearchText={(p) =>
                      [p?.barcode, p?.sku].filter(Boolean).join(" ")
                    }
                    onEnterWithInput={handleBarcodeScan}
                  />
                </Box>
                <Tooltip title="Crear producto nuevo">
                  <IconButton
                    color="primary"
                    onClick={() => setProductDialogOpen(true)}
                    sx={{ border: 1, borderColor: "primary.main" }}
                  >
                    <AddBoxIcon />
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
                inputProps={{ min: 0, step: "0.001" }}
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
            <Grid item xs={12} sx={{ display: "flex", justifyContent: "flex-start" }}>
              <Tooltip title="Agregar a la lista (sin paca)">
                <IconButton
                  color="primary"
                  onClick={addItem}
                  sx={{ border: 1, borderColor: "primary.main" }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1, alignSelf: "center" }}>
                Se agrega sin paca; después lo arrastrás si hace falta
              </Typography>
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
                  label="Factura / nota del proveedor"
                />
              ) : (
                <AttachmentField
                  label="Factura / nota del proveedor (opcional)"
                  pendingFile={pendingVoucherFile}
                  onPendingFileChange={setPendingVoucherFile}
                />
              )}
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
              onCreatePack={createPack}
              onUpdatePack={updatePack}
              onRemovePack={removePack}
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
            Crear producto
          </DialogTitle>
          <IconButton aria-label="Cerrar" onClick={() => setProductDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent dividers>
          <ProductForm
            key={productDialogOpen ? "new-supplier-product" : "closed"}
            isEditing={false}
            datos={{}}
            onClose={() => setProductDialogOpen(false)}
            reload={handleProductCreated}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
          <Button type="button" onClick={() => setProductDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button type="submit" form="eddeli-product-form" variant="contained" sx={{ minWidth: 160 }}>
            Guardar producto
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
    </Box>
  );
}

const SupplierOrderFormForward = forwardRef(SupplierOrderForm);
export default SupplierOrderFormForward;
