import {
  Grid,
  TextField,
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AddBoxIcon from "@mui/icons-material/AddBox";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { useForm } from "react-hook-form";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  createOrderRequest,
  updateOrderRequest,
  getAllCustomersRequest,
} from "../../../../api/ordersRequest";
import { getAllProductsAll } from "../../../../api/inventoryControlRequest";
import { useAuth } from "../../../../context/AuthContext";
import SearchableSelect from "../../../../components/SearchableSelect";
import ProductPriceReference, {
  getDefaultDistributorPrice,
  getProductUnitLabel,
  formatOrderLineTotal,
  formatProductPrice,
  formatUnitPrice,
} from "./ProductPriceReference";
import ProductForm from "./ProductForm.jsx";
import PrintFormatDialog from "../../../../components/saleReceipt/PrintFormatDialog.jsx";
import { buildReceiptFromCustomerOrder } from "../../../../utils/saleReceiptUtils.js";
import { useBarcodeScanner } from "../../../../hooks/useBarcodeScanner.js";
import {
  findEddeliProductByCode,
  normalizeProductBarcode,
} from "../../../../utils/productLookup.js";
import SupplierOrderItemsBoard, { ZONE } from "./SupplierOrderItemsBoard.jsx";
import OrderPaymentScheduleFields from "./OrderPaymentScheduleFields.jsx";
import {
  normalizeScheduleForApi,
  toDateOnly,
} from "../../../../utils/orderPaymentSchedule.js";
import {
  hydratePacksAndLots,
  newPackKey,
  resolveItemLotFields,
  reorderItemInZone,
  moveItemToZone,
} from "./orderPackUtils.js";

const pad2 = (n) => String(n).padStart(2, "0");

const localISODate = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const localHMS = () => {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const toLocalISOWithOffset = (d) => {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const hhOff = pad2(Math.floor(Math.abs(off) / 60));
  const mmOff = pad2(Math.abs(off) % 60);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate()
  )}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(
    d.getSeconds()
  )}${sign}${hhOff}:${mmOff}`;
};

const normalizeToYYYYMMDD = (datos) => {
  if (!datos) return localISODate();
  if (datos.dateMs) {
    const d = new Date(Number(datos.dateMs));
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
  if (typeof datos.date === "string" && datos.date.includes("T")) {
    const d = new Date(datos.date);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
  if (typeof datos.date === "string" && datos.date.includes("/")) {
    const [datePart] = datos.date.split(" ");
    const [dd, mm, yyyy] = datePart.split("/");
    if (dd && mm && yyyy) return `${yyyy}-${mm}-${dd}`;
  }
  return localISODate();
};

function OrderFormInner({ onClose, reload, isEditing = false, datos = null, active = true }, tourApiRef) {
  const { handleSubmit, register, reset, setValue, watch } = useForm();

  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [packs, setPacks] = useState([]);
  const [lots, setLots] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [printOpen, setPrintOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productDialogMode, setProductDialogMode] = useState("create");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [splitPayments, setSplitPayments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  const [installments, setInstallments] = useState([]);
  const tourGenRef = useRef(0);
  const lotsRef = useRef([]);

  const { toast } = useAuth();

  useEffect(() => {
    lotsRef.current = lots;
  }, [lots]);

  const selectedProductId = watch("productId");
  const watchQuantity = watch("quantity");
  const watchPrice = watch("price");

  const currentProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id === Number(selectedProductId)) || null;
  }, [selectedProductId, products]);

  const printReceipt = useMemo(() => {
    if (!isEditing || !datos?.id) return null;
    return buildReceiptFromCustomerOrder({
      ...datos,
      ERP_order_items: items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        price: it.unitPrice,
        deliveredAt: it.deliveredAt,
        paidAt: it.paidAt,
        ERP_inventory_product: { name: it.name },
      })),
      ERP_customer:
        customers.find((c) => String(c.id) === String(selectedCustomer)) || datos.ERP_customer,
    });
  }, [isEditing, datos, items, customers, selectedCustomer]);

  useEffect(() => {
    if (!currentProduct) return;
    const defaultPrice = getDefaultDistributorPrice(currentProduct);
    if (defaultPrice > 0) setValue("price", defaultPrice);
  }, [currentProduct, setValue]);

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
    enabled: active && products.length > 0 && !productDialogOpen,
    onScan: handleBarcodeScan,
    ignoreWhenTypingInInputs: true,
  });

  const fetchProducts = async () => {
    const { data } = await getAllProductsAll();
    setProducts(data || []);
  };

  const fetchCustomers = async () => {
    const { data } = await getAllCustomersRequest();
    setCustomers(data || []);
  };

  const handleProductSaved = async () => {
    const editId =
      productDialogMode === "edit" ? Number(currentProduct?.id || selectedProduct) : null;
    setProductDialogOpen(false);
    await fetchProducts();
    if (editId) {
      const { data } = await getAllProductsAll();
      const list = Array.isArray(data) ? data : [];
      const updated = list.find((p) => Number(p.id) === editId);
      if (updated) {
        setSelectedProduct(String(updated.id));
        setValue("productId", String(updated.id));
        const defaultPrice = getDefaultDistributorPrice(updated);
        if (defaultPrice > 0) setValue("price", defaultPrice);
      }
    }
  };

  const addItem = () => {
    const productId = Number(watch("productId"));
    const quantity = Number(watch("quantity"));
    const unitPrice = Number(watch("price"));
    if (!productId || !quantity || !Number.isFinite(unitPrice) || unitPrice < 0) {
      toast({ message: "Seleccione producto, cantidad y precio", variant: "warning" });
      return;
    }
    const product = products.find((p) => p.id === productId);
    setItems((prev) => [
      ...prev,
      {
        lineId: newPackKey("line"),
        productId,
        quantity,
        unitPrice,
        hasIva: false,
        name: product?.name || "",
        unitLabel: getProductUnitLabel(product),
        packKey: null,
        lotKey: null,
      },
    ]);
    setValue("productId", "");
    setSelectedProduct("");
    setValue("quantity", "");
    setValue("price", "");
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

  const toggleItemIva = () => {};

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
    const key = newPackKey("pack");
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
  };

  const updatePack = (packKey, patch) => {
    if (Object.prototype.hasOwnProperty.call(patch, "useLots")) {
      const enabling = Boolean(patch.useLots);
      if (enabling) {
        setLots((lotsPrev) => {
          if (lotsPrev.some((l) => l.packKey === packKey)) return lotsPrev;
          return [
            ...lotsPrev,
            {
              key: newPackKey("lot"),
              packKey,
              code: "",
              expiresAt: "",
              manufacturedAt: "",
            },
          ];
        });
      } else {
        setItems((prev) =>
          prev.map((it) => (it.packKey === packKey ? { ...it, lotKey: null } : it)),
        );
        setLots((lotsPrev) => lotsPrev.filter((l) => l.packKey !== packKey));
      }
    }
    setPacks((prev) => prev.map((p) => (p.key === packKey ? { ...p, ...patch } : p)));
  };

  const removePack = (packKey) => {
    setItems((prev) =>
      prev.map((it) => (it.packKey === packKey ? { ...it, packKey: null, lotKey: null } : it)),
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
      const tmp = next[i];
      next[i] = next[j];
      next[j] = tmp;
      return next;
    });
  };

  const applyPackTotal = (packKey, rawTotal) => {
    const total = Number(rawTotal);
    if (!Number.isFinite(total) || total < 0) {
      toast({ message: "Ingresá un valor de paca válido", variant: "warning" });
      return;
    }
    setPacks((prev) =>
      prev.map((p) => (p.key === packKey ? { ...p, totalPrice: String(total) } : p)),
    );
    setItems((prev) => {
      const packItems = prev.filter((it) => it.packKey === packKey);
      const qtySum = packItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
      if (qtySum <= 0) return prev;
      const unit = total / qtySum;
      return prev.map((it) =>
        it.packKey === packKey ? { ...it, unitPrice: Number(unit.toFixed(6)) } : it,
      );
    });
  };

  const createLot = (packKey) => {
    setLots((prev) => [
      ...prev,
      { key: newPackKey("lot"), packKey, code: "", expiresAt: "", manufacturedAt: "" },
    ]);
    setPacks((prev) => prev.map((p) => (p.key === packKey ? { ...p, useLots: true } : p)));
  };

  const updateLot = (lotKey, patch) => {
    setLots((prev) => prev.map((l) => (l.key === lotKey ? { ...l, ...patch } : l)));
  };

  const removeLot = (lotKey) => {
    setItems((prev) => prev.map((it) => (it.lotKey === lotKey ? { ...it, lotKey: null } : it)));
    setLots((prev) => prev.filter((l) => l.key !== lotKey));
  };

  const resetForm = () => {
    reset();
    setItems([]);
    setPacks([]);
    setLots([]);
    setSelectedCustomer("");
    setSelectedProduct("");
    setValue("productId", "");
    setValue("date", localISODate());
    setPaymentDueDate("");
    setSplitPayments(false);
    setInstallmentCount(2);
    setInstallments([]);
  };

  const submitOrder = async (data) => {
    if (items.length === 0) {
      toast({ message: "Debe agregar al menos un producto al pedido", variant: "warning" });
      return;
    }
    if (!selectedCustomer) {
      toast({ message: "Seleccione un cliente", variant: "warning" });
      return;
    }

    if (installments.length > 0) {
      const schedule = normalizeScheduleForApi(installments);
      if (!schedule.length) {
        toast({ message: "Revisá las cuotas: cada una necesita fecha y monto", variant: "warning" });
        return;
      }
      const sum = schedule.reduce((a, r) => a + r.amount, 0);
      const total = items.reduce(
        (acc, it) => acc + formatOrderLineTotal(it.quantity, it.unitPrice),
        0,
      );
      if (Math.abs(sum - Number(total.toFixed(2))) > 0.02) {
        toast({
          message: `La suma de cuotas (${sum.toFixed(2)}) debe igualar el total (${total.toFixed(2)})`,
          variant: "warning",
        });
        return;
      }
    }

    for (const pack of packs) {
      if (
        pack.manufacturedAt &&
        pack.expiresAt &&
        String(pack.manufacturedAt) > String(pack.expiresAt)
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

    const localDT = new Date(`${data.date}T${localHMS()}`);
    const payload = {
      customerId: selectedCustomer,
      notes: data.notes,
      dateMs: localDT.getTime(),
      date: toLocalISOWithOffset(localDT),
      items: items.map((it) => {
        const lotFields = resolveItemLotFields(it, packs, lots);
        return {
          id: it.id || undefined,
          productId: it.productId,
          quantity: Number(it.quantity),
          price: Number(it.unitPrice),
          ...lotFields,
        };
      }),
      paymentInstallments: installments.length
        ? normalizeScheduleForApi(installments)
        : paymentDueDate
          ? normalizeScheduleForApi([
              {
                dueDate: paymentDueDate,
                amount: items.reduce(
                  (acc, it) => acc + formatOrderLineTotal(it.quantity, it.unitPrice),
                  0,
                ),
              },
            ])
          : [],
    };

    try {
      if (isEditing) {
        await toast({ promise: updateOrderRequest(datos.id, payload) });
      } else {
        await toast({ promise: createOrderRequest(payload) });
      }
      resetForm();
      if (reload) await reload();
      if (onClose) await onClose();
    } catch {
      /* toast */
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    setValue("date", localISODate());

    if (isEditing && datos) {
      setSelectedCustomer(datos.customerId || "");
      setValue("notes", datos.notes || "");
      setValue("date", normalizeToYYYYMMDD(datos));
      const raw = (datos.ERP_order_items || []).map((item) => ({
        ...item,
        unitLabel: getProductUnitLabel(item.ERP_inventory_product),
      }));
      const hydrated = hydratePacksAndLots(raw, { priceField: "price" });
      setItems(
        hydrated.items.map((it) => ({
          ...it,
          unitLabel: it.unitLabel || getProductUnitLabel(
            products.find((p) => Number(p.id) === Number(it.productId)),
          ),
        })),
      );
      setPacks(hydrated.packs);
      setLots(hydrated.lots);
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
    } else if (!isEditing) {
      setPaymentDueDate("");
      setSplitPayments(false);
      setInstallmentCount(2);
      setInstallments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos]);

  const itemsTotal = useMemo(
    () => items.reduce((acc, it) => acc + formatOrderLineTotal(it.quantity, it.unitPrice), 0),
    [items],
  );

  const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));

  useImperativeHandle(tourApiRef, () => ({
    async runItemsDemo() {
      const gen = ++tourGenRef.current;
      const customer =
        customers.find((c) => /andina|café|cafe|central/i.test(c.name || "")) ||
        customers.find((c) => Number(c.id) !== 1) ||
        customers[0];
      if (customer) setSelectedCustomer(customer.id);

      setItems([]);
      setPacks([]);
      setLots([]);
      setSelectedProduct("");
      const picks = [
        products.find((p) => Number(p.id) === 101),
        products.find((p) => Number(p.id) === 201),
      ].filter(Boolean);
      const list = picks.length ? picks : products.slice(0, 2);
      for (const p of list) {
        await sleep(380);
        if (gen !== tourGenRef.current) return;
        const price = getDefaultDistributorPrice(p) || 0.15;
        const qty = Number(p.id) === 201 ? 6 : 12;
        setSelectedProduct(p.id);
        setValue("productId", p.id);
        setValue("quantity", qty);
        setValue("price", price);
        await sleep(220);
        if (gen !== tourGenRef.current) return;
        setItems((prev) => [
          ...prev,
          {
            lineId: newPackKey("line"),
            productId: p.id,
            quantity: qty,
            unitPrice: price,
            hasIva: false,
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
        setValue("price", "");
      }
    },
    createPackDemo() {
      if (tourGenRef.current < 0) return;
      createPack();
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
  }));

  return (
    <Box
      component="form"
      data-tour="pedido-cliente-form"
      sx={{ mt: 1 }}
      onSubmit={handleSubmit(submitOrder)}
    >
      <Alert severity="info" sx={{ mb: 2, py: 0.75 }}>
        <strong>Pedido de cliente</strong>
        {isEditing ? ` · #${datos?.id ?? ""}` : " · nuevo"}: a la izquierda armás cada línea; a la
        derecha el carrito y las pacas. Las ventas al contado de caja no se editan aquí.
      </Alert>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Grid container spacing={2}>
            <Grid item xs={12} data-tour="pedido-cliente-customer">
              <SearchableSelect
                label="Cliente"
                items={customers}
                value={selectedCustomer}
                onChange={(val) => setSelectedCustomer(val)}
                placeholder="Buscar cliente…"
              />
            </Grid>

            <Grid item xs={12} data-tour="pedido-cliente-product">
              <input type="hidden" {...register("productId")} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <SearchableSelect
                    label="Producto"
                    items={products}
                    value={selectedProduct}
                    productMeta
                    onChange={(val) => {
                      setSelectedProduct(val);
                      setValue("productId", val);
                    }}
                    placeholder="Buscar o escanear código de barras…"
                    getSearchText={(p) => [p?.barcode, p?.sku].filter(Boolean).join(" ")}
                    onEnterWithInput={handleBarcodeScan}
                  />
                </Box>
                <Tooltip
                  title={
                    currentProduct ? "Editar producto seleccionado" : "Crear producto nuevo"
                  }
                >
                  <IconButton
                    color="primary"
                    onClick={() => {
                      setProductDialogMode(currentProduct ? "edit" : "create");
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
                  unitPrice={watchPrice}
                  onApplyPrice={(price) =>
                    setValue("price", price, { shouldDirty: true, shouldValidate: true })
                  }
                />
              </Grid>
            )}

            <Grid item xs={6} data-tour="pedido-cliente-line">
              <TextField
                label="Cantidad"
                type="number"
                fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0.01, step: "any" }}
                {...register("quantity")}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Precio unitario"
                type="number"
                fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: "any", min: 0 }}
                helperText={
                  currentProduct
                    ? `Por defecto: ${formatUnitPrice(getDefaultDistributorPrice(currentProduct))}`
                    : undefined
                }
                {...register("price")}
              />
            </Grid>

            <Grid item xs={12} sx={{ display: "flex", justifyContent: "flex-start" }}>
              <Tooltip title="Agregar al carrito (sin paca)">
                <IconButton
                  color="primary"
                  onClick={addItem}
                  sx={{ border: 1, borderColor: "primary.main" }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 1, alignSelf: "center" }}
              >
                Se agrega sin paca; después lo agrupás si hace falta
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Fecha del pedido"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                {...register("date")}
              />
            </Grid>

            <Grid item xs={12}>
              <OrderPaymentScheduleFields
                partyKind="customer"
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
              <TextField label="Notas" fullWidth multiline rows={2} {...register("notes")} />
            </Grid>

            <Grid
              item
              xs={12}
              display="flex"
              justifyContent="flex-end"
              alignItems="center"
              gap={1}
              flexWrap="wrap"
            >
              {isEditing && printReceipt && (
                <Tooltip title="Comprobante / factura">
                  <IconButton color="primary" onClick={() => setPrintOpen(true)}>
                    <PrintIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Button
                data-tour="pedido-cliente-save"
                variant="contained"
                fullWidth
                type="submit"
              >
                {!isEditing ? "Guardar pedido de cliente" : "Actualizar pedido de cliente"}
              </Button>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={7}>
          <Box
            data-tour="pedido-cliente-items"
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
              <ShoppingCartOutlinedIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" fontWeight={700}>
                Carrito del pedido
              </Typography>
            </Box>

            <SupplierOrderItemsBoard
              items={items}
              packs={packs}
              lots={lots}
              ivaRate={0}
              showIva={false}
              tourIdPrefix="pedido-cliente"
              helpText={
                <>
                  Creá una paca vacía y meté productos con la manito, ↑↓ o el menú ⋮ (meter / sacar /
                  pasar a otra paca). Podés poner vencimiento y el{" "}
                  <strong>valor total de la paca</strong> para repartir precios unitarios.
                </>
              }
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
                  : "new-customer-order-product"
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
          <Button
            type="submit"
            form="eddeli-product-form"
            variant="contained"
            sx={{ minWidth: 160 }}
          >
            {productDialogMode === "edit" ? "Guardar cambios" : "Guardar producto"}
          </Button>
        </DialogActions>
      </Dialog>

      <PrintFormatDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        receipt={printReceipt}
      />
    </Box>
  );
}

const OrderForm = forwardRef(OrderFormInner);
export default OrderForm;
