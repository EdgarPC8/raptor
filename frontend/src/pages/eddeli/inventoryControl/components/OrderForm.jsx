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
  FormControlLabel,
  Checkbox,
  FormControl,
  FormLabel,
  Radio,
  RadioGroup,
  MenuItem,
} from "@mui/material";
import AddBoxIcon from "@mui/icons-material/AddBox";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PaymentsIcon from "@mui/icons-material/Payments";
import { useForm } from "react-hook-form";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  createOrderRequest,
  updateOrderRequest,
  getAllCustomersRequest,
  markItemAsDeliveredRequest,
  getCustomerOrderCollectionSummaryRequest,
  payCustomerOrderRequest,
} from "../../../../api/ordersRequest";
import { getAllProductsAll, getStoresRequest } from "../../../../api/inventoryControlRequest";
import { useAuth } from "../../../../context/AuthContext";
import { useAppSettings } from "../../../../context/AppSettingsContext.jsx";
import {
  locationKindLabel,
  normalizeLocationKind,
  sortStoresByKind,
  storeHoldsInventory,
} from "../../../../utils/storeLocationKind.js";
import SearchableSelect from "../../../../components/SearchableSelect";
import {
  getDefaultDistributorPrice,
  getProductUnitLabel,
  formatOrderLineTotal,
  formatProductPrice,
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
  buildBoardOrder,
  moveBoardEntry,
  applyBoardOrderToItems,
  syncBoardOrder,
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
  const [boardOrder, setBoardOrder] = useState([]);
  const packsRef = useRef([]);
  const [customers, setCustomers] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [printOpen, setPrintOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productDialogMode, setProductDialogMode] = useState("create");
  const [productDialogProduct, setProductDialogProduct] = useState(null);
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [splitPayments, setSplitPayments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  const [installments, setInstallments] = useState([]);
  const tourGenRef = useRef(0);
  const lotsRef = useRef([]);
  const settleRef = useRef({
    deliver: false,
    pay: false,
    payMethod: "efectivo",
    storeId: null,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDeliver, setConfirmDeliver] = useState(true);
  const [confirmPaid, setConfirmPaid] = useState(true);
  const [confirmPayMethod, setConfirmPayMethod] = useState("efectivo");
  const [confirmDeliverStoreId, setConfirmDeliverStoreId] = useState("");
  const [inventoryStores, setInventoryStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(false);

  const { toast } = useAuth();
  const { activeApp } = useAppSettings();
  const multiStockEnabled = activeApp?.multiStockEnabled !== false;

  useEffect(() => {
    lotsRef.current = lots;
  }, [lots]);

  useEffect(() => {
    packsRef.current = packs;
  }, [packs]);

  const selectedProductId = watch("productId");

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

  const clearProductPicker = useCallback(() => {
    setSelectedProduct("");
    setValue("productId", "");
    setValue("quantity", "");
    setValue("price", "");
  }, [setValue]);

  const addProductToCart = useCallback(
    (product, { quantity = 1, unitPrice } = {}) => {
      if (!product?.id) return;
      const qty = Number(quantity);
      const price =
        unitPrice != null && Number.isFinite(Number(unitPrice))
          ? Number(unitPrice)
          : getDefaultDistributorPrice(product);
      if (!Number.isFinite(qty) || qty <= 0) {
        toast({ message: "Cantidad inválida", variant: "warning" });
        return;
      }
      if (!Number.isFinite(price) || price < 0) {
        toast({ message: "Precio inválido", variant: "warning" });
        return;
      }
      const lineId = newPackKey("line");
      setItems((prev) => [
        ...prev,
        {
          lineId,
          productId: Number(product.id),
          quantity: qty,
          unitPrice: price,
          hasIva: false,
          name: product?.name || "",
          unitLabel: getProductUnitLabel(product),
          packKey: null,
          lotKey: null,
        },
      ]);
      setBoardOrder((prev) => [...prev, { type: "item", key: lineId }]);
      clearProductPicker();
    },
    [clearProductPicker, toast],
  );

  const handleBarcodeScan = useCallback(
    (rawCode) => {
      const found = findEddeliProductByCode(products, rawCode);
      if (found) {
        addProductToCart(found);
        toast({ message: `Agregado: ${found.name}`, variant: "success" });
        return;
      }
      const code = normalizeProductBarcode(rawCode) || String(rawCode || "").trim();
      toast({
        message: code ? `No se encontró producto con código "${code}"` : "Código vacío",
        variant: "warning",
      });
    },
    [products, addProductToCart, toast],
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

  const handleProductSaved = async (saved) => {
    const editingId =
      productDialogMode === "edit"
        ? Number(productDialogProduct?.id || currentProduct?.id || selectedProduct)
        : null;
    setProductDialogOpen(false);
    setProductDialogProduct(null);
    const { data } = await getAllProductsAll();
    const list = Array.isArray(data) ? data : [];
    setProducts(list);
    const id = saved?.id ?? saved?.data?.id ?? editingId;
    const product =
      id != null
        ? list.find((p) => Number(p.id) === Number(id))
        : null;
    if (!product) return;
    if (editingId) {
      setItems((prev) =>
        prev.map((it) =>
          Number(it.productId) === Number(editingId)
            ? {
                ...it,
                name: product.name || it.name,
                unitLabel: getProductUnitLabel(product),
              }
            : it,
        ),
      );
      return;
    }
    addProductToCart(product);
  };

  const openCreateProduct = () => {
    setProductDialogMode("create");
    setProductDialogProduct(null);
    setProductDialogOpen(true);
  };

  const openEditProduct = (productId) => {
    const product = products.find((p) => Number(p.id) === Number(productId));
    if (!product) {
      toast({ message: "Producto no encontrado en el catálogo", variant: "warning" });
      return;
    }
    setProductDialogMode("edit");
    setProductDialogProduct(product);
    setProductDialogOpen(true);
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

  // El total visible de una paca siempre representa sus productos, incluso
  // cuando se cambia cantidad o precio directamente en una línea.
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
    setBoardOrder((prev) => [...prev, { type: "pack", key }]);
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
    let freedKeys = [];
    setItems((prev) => {
      freedKeys = prev.filter((it) => it.packKey === packKey).map((it) => it.lineId);
      return prev.map((it) => (it.packKey === packKey ? { ...it, packKey: null, lotKey: null } : it));
    });
    setLots((prev) => prev.filter((l) => l.packKey !== packKey));
    setPacks((prev) => prev.filter((p) => p.key !== packKey));
    setBoardOrder((prev) => {
      const idx = prev.findIndex((entry) => entry.type === "pack" && entry.key === packKey);
      const freed = freedKeys.map((key) => ({ type: "item", key }));
      if (idx < 0) {
        return syncBoardOrder(
          [...prev.filter((entry) => !(entry.type === "pack" && entry.key === packKey)), ...freed],
          items.map((it) =>
            it.packKey === packKey ? { ...it, packKey: null, lotKey: null } : it,
          ),
          packs.filter((p) => p.key !== packKey),
        );
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
    setBoardOrder([]);
    setSelectedCustomer("");
    setSelectedProduct("");
    setValue("productId", "");
    setValue("date", localISODate());
    setPaymentDueDate("");
    setSplitPayments(false);
    setInstallmentCount(2);
    setInstallments([]);
  };

  const loadConfirmStores = async () => {
    try {
      setStoresLoading(true);
      const { data } = await getStoresRequest();
      const list = sortStoresByKind(
        (Array.isArray(data) ? data : []).filter(
          (s) => storeHoldsInventory(s.locationKind) && s.isActive !== false,
        ),
      );
      setInventoryStores(list);
      const propia = list.find((s) => normalizeLocationKind(s.locationKind) === "propia");
      const bodega = list.find((s) => normalizeLocationKind(s.locationKind) === "bodega");
      const preferred = propia || bodega || list[0];
      setConfirmDeliverStoreId(preferred ? String(preferred.id) : "");
    } catch {
      setInventoryStores([]);
      setConfirmDeliverStoreId("");
    } finally {
      setStoresLoading(false);
    }
  };

  useEffect(() => {
    if (confirmOpen && multiStockEnabled && confirmDeliver) {
      void loadConfirmStores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmOpen, multiStockEnabled, confirmDeliver]);

  const openConfirmDialog = ({ deliver = true, pay = true } = {}) => {
    setConfirmDeliver(deliver);
    setConfirmPaid(pay);
    setConfirmPayMethod("efectivo");
    setConfirmOpen(true);
  };

  const resolveDeliverStoreId = () => {
    const sid = confirmDeliverStoreId;
    return sid ? Number(sid) : null;
  };

  const handleConfirmSettle = (deliver, pay) => {
    if (deliver && multiStockEnabled && !resolveDeliverStoreId()) {
      void toast?.({
        message: "Elige Bodega o una sucursal para descontar el stock.",
        variant: "warning",
      });
      return;
    }
    settleRef.current = {
      deliver,
      pay,
      payMethod: confirmPayMethod,
      storeId: deliver && multiStockEnabled ? resolveDeliverStoreId() : null,
    };
    setConfirmOpen(false);
    handleSubmit(submitOrder)();
  };

  const nowLocalDateTime = () => {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
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
      items: applyBoardOrderToItems(items, boardOrder).map((it) => {
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

    const settle = settleRef.current || {
      deliver: false,
      pay: false,
      payMethod: "efectivo",
      storeId: null,
    };

    try {
      let orderId = isEditing ? datos?.id : null;
      let savedItems = [];
      if (isEditing) {
        const result = await toast({ promise: updateOrderRequest(datos.id, payload) });
        orderId = orderId || result?.data?.order?.id || result?.data?.id;
        savedItems =
          result?.data?.items ||
          result?.data?.order?.ERP_order_items ||
          [];
      } else {
        const result = await toast({ promise: createOrderRequest(payload) });
        orderId = result?.data?.order?.id || result?.data?.id || orderId;
        savedItems = result?.data?.items || [];
      }

      if (!Array.isArray(savedItems) || !savedItems.length) {
        savedItems = (items || []).filter((it) => it?.id);
      }

      if (orderId && settle.deliver) {
        const pending = savedItems.filter((it) => it?.id && !it.deliveredAt);
        if (!pending.length) {
          toast({
            message: "Pedido guardado; no había ítems pendientes de entrega.",
            variant: "info",
          });
        } else {
          try {
            const deliverPayload =
              settle.storeId != null ? { storeId: settle.storeId } : {};
            await Promise.all(
              pending.map((it) => markItemAsDeliveredRequest(it.id, deliverPayload)),
            );
          } catch (err) {
            toast({
              message:
                err?.response?.data?.message ||
                "Pedido guardado, pero no se pudo marcar la entrega.",
              variant: "warning",
            });
          }
        }
      }

      if (orderId && settle.pay) {
        try {
          const summaryRes = await getCustomerOrderCollectionSummaryRequest(orderId);
          const suggested = Number(summaryRes?.data?.suggestedAmount || 0);
          if (suggested > 0.009) {
            await payCustomerOrderRequest(orderId, {
              amount: suggested,
              date: nowLocalDateTime(),
              method: settle.payMethod || "efectivo",
              note: `Abono pedido #${orderId}`,
            });
          } else {
            toast({
              message: "Pedido guardado; no había saldo pendiente de cobro.",
              variant: "info",
            });
          }
        } catch (err) {
          toast({
            message:
              err?.response?.data?.message ||
              "Pedido guardado, pero no se pudo registrar el cobro.",
            variant: "warning",
          });
        }
      }

      settleRef.current = {
        deliver: false,
        pay: false,
        payMethod: "efectivo",
        storeId: null,
      };
      setConfirmOpen(false);
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
      setBoardOrder(buildBoardOrder(hydrated.items, hydrated.packs));
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
      setBoardOrder([]);
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
        const lineId = newPackKey("line");
        setItems((prev) => [
          ...prev,
          {
            lineId,
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
        setBoardOrder((prev) => [...prev, { type: "item", key: lineId }]);
        clearProductPicker();
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
        setBoardOrder([]);
        setSelectedProduct("");
      }
    },
  }));

  return (
    <Box
      component="form"
      data-tour="pedido-cliente-form"
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
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          px: { xs: 0.5, sm: 1 },
          pt: 0.5,
          pb: 1,
        }}
      >
      <Alert severity="info" sx={{ mb: 2, py: 0.75 }}>
        <strong>Pedido de cliente</strong>
        {isEditing ? ` · #${datos?.id ?? ""}` : " · nuevo"}: elegí productos a la izquierda (entran
        al carrito); a la derecha ajustás cantidad, precio y pacas. Las ventas al contado de caja no
        se editan aquí.
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
                    clearInputOnSelect
                    onChange={(val) => {
                      const product = products.find((p) => String(p.id) === String(val));
                      if (product) addProductToCart(product);
                      else {
                        setSelectedProduct(val);
                        setValue("productId", val);
                      }
                    }}
                    placeholder="Elegí un producto y entra al carrito…"
                    getSearchText={(p) => [p?.barcode, p?.sku].filter(Boolean).join(" ")}
                    onEnterWithInput={handleBarcodeScan}
                  />
                </Box>
                <Tooltip title="Crear producto nuevo">
                  <IconButton
                    color="primary"
                    onClick={openCreateProduct}
                    sx={{ border: 1, borderColor: "primary.main" }}
                  >
                    <AddBoxIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                Al elegir o crear un producto se agrega al carrito (cant. 1, precio automático).
                Cantidad y precio se editan a la derecha.
              </Typography>
            </Grid>

            <Grid item xs={12} data-tour="pedido-cliente-line">
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
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
              <ShoppingCartOutlinedIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" fontWeight={700}>
                Carrito del pedido
              </Typography>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: 0.25 }}>
              <SupplierOrderItemsBoard
                items={items}
                packs={packs}
                lots={lots}
                boardOrder={boardOrder}
                ivaRate={0}
                showIva={false}
                tourIdPrefix="pedido-cliente"
                onEditProduct={openEditProduct}
                helpText="Creá paca y meté productos con ↑↓ o ⋮. Valor total de paca reparte precios."
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
                onBoardOrderChange={(next) => {
                  setBoardOrder(next);
                  setItems((prev) => applyBoardOrderToItems(prev, next));
                }}
              />
            </Box>

            {items.length > 0 && (
              <Box
                sx={{
                  flexShrink: 0,
                  pt: 1,
                  borderTop: 1,
                  borderColor: "divider",
                  bgcolor: "background.default",
                }}
              >
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
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
            type="submit"
            variant="outlined"
            size="small"
            color="inherit"
            sx={{ minWidth: 130, px: 2 }}
            onClick={() => {
              settleRef.current = {
                deliver: false,
                pay: false,
                payMethod: "efectivo",
                storeId: null,
              };
            }}
          >
            Solo guardar
          </Button>
          <Button
            type="button"
            variant="outlined"
            size="small"
            color="warning"
            startIcon={<LocalShippingIcon />}
            sx={{ minWidth: 130, px: 2 }}
            onClick={() => openConfirmDialog({ deliver: true, pay: false })}
          >
            Solo entregar
          </Button>
          <Button
            type="button"
            variant="outlined"
            size="small"
            color="secondary"
            startIcon={<PaymentsIcon />}
            sx={{ minWidth: 120, px: 2 }}
            onClick={() => openConfirmDialog({ deliver: false, pay: true })}
          >
            Solo pagar
          </Button>
          <Button
            type="button"
            variant="contained"
            size="small"
            color="secondary"
            startIcon={<PaymentsIcon />}
            sx={{ minWidth: 160, px: 2, fontWeight: 700 }}
            onClick={() => openConfirmDialog({ deliver: true, pay: true })}
          >
            Entregar y pagar
          </Button>
        </Box>
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
          {confirmDeliver && confirmPaid
            ? "Entregar y pagar pedido"
            : confirmDeliver
              ? "Entregar pedido"
              : confirmPaid
                ? "Registrar cobro"
                : "Confirmar acción"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Elegí qué registrar ahora. Lo demás queda pendiente para después.
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmDeliver}
                onChange={(e) => setConfirmDeliver(e.target.checked)}
              />
            }
            label="Entregado (sale del inventario)"
          />
          {confirmDeliver && multiStockEnabled ? (
            <Box sx={{ mt: 1, mb: 1.5 }}>
              <Alert severity="warning" sx={{ py: 0.75, mb: 1.5 }}>
                Multistock activo: elegí <strong>de dónde sale</strong> la mercadería antes de
                confirmar.
              </Alert>
              <TextField
                select
                fullWidth
                size="small"
                label="Entregar desde"
                value={confirmDeliverStoreId}
                onChange={(e) => setConfirmDeliverStoreId(e.target.value)}
                disabled={storesLoading}
                helperText={
                  storesLoading
                    ? "Cargando locales…"
                    : "Recomendado: la sucursal donde abrís caja."
                }
              >
                {inventoryStores.map((s) => (
                  <MenuItem key={s.id} value={String(s.id)}>
                    {s.name} ({locationKindLabel(s.locationKind)})
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          ) : null}
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmPaid}
                onChange={(e) => setConfirmPaid(e.target.checked)}
              />
            }
            label="Cobrado"
          />
          {confirmPaid ? (
            <FormControl sx={{ mt: 1.5, display: "block" }}>
              <FormLabel sx={{ fontSize: "0.8rem" }}>Cómo se cobró</FormLabel>
              <RadioGroup
                row
                value={confirmPayMethod}
                onChange={(e) => setConfirmPayMethod(e.target.value)}
              >
                <FormControlLabel value="efectivo" control={<Radio size="small" />} label="Efectivo" />
                <FormControlLabel
                  value="transferencia"
                  control={<Radio size="small" />}
                  label="Transferencia"
                />
              </RadioGroup>
            </FormControl>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 0.5, px: 2, pb: 1.5 }}>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Box sx={{ flex: 1 }} />
          {confirmDeliver ? (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<LocalShippingIcon />}
              disabled={
                storesLoading || (multiStockEnabled && !confirmDeliverStoreId)
              }
              onClick={() => handleConfirmSettle(true, false)}
            >
              Solo entregar
            </Button>
          ) : null}
          {confirmPaid && !confirmDeliver ? (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<PaymentsIcon />}
              onClick={() => handleConfirmSettle(false, true)}
            >
              Solo pagar
            </Button>
          ) : null}
          {confirmDeliver && confirmPaid ? (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<PaymentsIcon />}
              disabled={
                storesLoading || (multiStockEnabled && !confirmDeliverStoreId)
              }
              onClick={() => handleConfirmSettle(true, true)}
            >
              Entregar y pagar
            </Button>
          ) : null}
          {!confirmDeliver && !confirmPaid ? (
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => handleConfirmSettle(false, false)}
            >
              Solo guardar
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

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
          <IconButton
            aria-label="Cerrar"
            onClick={() => {
              setProductDialogOpen(false);
              setProductDialogProduct(null);
            }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent dividers>
          <ProductForm
            key={
              productDialogOpen
                ? productDialogMode === "edit"
                  ? `edit-product-${productDialogProduct?.id || "x"}`
                  : "new-customer-order-product"
                : "closed"
            }
            isEditing={productDialogMode === "edit"}
            datos={productDialogMode === "edit" ? productDialogProduct || {} : {}}
            onClose={() => {
              setProductDialogOpen(false);
              setProductDialogProduct(null);
            }}
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

/** Estilos para que el modal deje los botones fijos abajo. */
export const CUSTOMER_ORDER_DIALOG_PAPER_SX = {
  display: "flex",
  flexDirection: "column",
  height: { xs: "100%", sm: "min(90vh, 900px)" },
  maxHeight: "92vh",
  width: { sm: "min(96vw, 1200px)" },
  maxWidth: { sm: "1200px" },
};

export const CUSTOMER_ORDER_DIALOG_CONTENT_SX = {
  p: { xs: 1, sm: 1.5 },
  pt: { xs: 0.5, sm: 1 },
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  flex: 1,
  minHeight: 0,
};

export default OrderForm;
