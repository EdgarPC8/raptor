/**
 * ProductSelector.jsx
 *
 * Selección de productos del inventario (como Caja) para Vista con productos.
 * - Un slot → un selector (compatible con plantillas de 1 producto).
 * - Varios slots (cards) → un selector por Producto 1…N.
 * - UI tipo Caja (SearchableSelect): nombre + precio en verde.
 */
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Stack,
  Divider,
  Chip,
} from "@mui/material";

import { useEditor } from "../EditorProvider";
import { getAllProducts } from "../../../../api/inventoryControlRequest";
import { pathImg } from "../../../../api/axios";
import { resolveLayer } from "../bind/resolveTemplate";
import { resolveValue } from "../bind/resolveMedia";
import SearchableSelect from "../../../../components/SearchableSelect";
import { isSellableInCaja } from "../../../../utils/productLookup";
import {
  collectUsedProductSlots,
  getSlotData,
  buildSlotSelectionPatch,
  slotLabel,
  getLayerProductSlot,
} from "../productSlots";

/** Normaliza un producto de inventario al shape que espera buildSlotSelectionPatch. */
const mapProductToSlotItem = (product) => {
  if (!product) return null;
  const price = Number(product.price);
  const displayPrice = Number.isFinite(price) ? `$${price.toFixed(2)}` : "";
  return {
    id: product.id,
    displayName: product.name || "",
    title: product.name || "",
    displayPrice,
    imageUrl: product.primaryImageUrl || "",
    product: {
      id: product.id,
      name: product.name || "",
      desc: product.desc || "",
      price: Number.isFinite(price) ? price : 0,
      primaryImageUrl: product.primaryImageUrl || "",
      barcode: product.barcode || "",
      sku: product.sku || "",
      categoryId: product.categoryId,
      unitId: product.unitId,
      type: product.type,
      wholesaleRules: product.wholesaleRules,
      standardWeightGrams: product.standardWeightGrams,
    },
  };
};

const itemName = (it) =>
  it?.displayName || it?.title || it?.product?.name || (it?.id != null ? `Item #${it.id}` : "");

const itemProductId = (it) => it?.product?.id ?? it?.id;

/** Precio numérico (displayPrice del API a veces ya viene como "$0.50"). */
const itemPriceNumber = (it) => {
  if (typeof it?.displayPrice === "string" && it.displayPrice.trim()) {
    const fromStr = Number(String(it.displayPrice).replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(fromStr)) return fromStr;
  }
  const raw = it?.priceOverride ?? it?.product?.price ?? it?.price ?? null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const formatItemLabel = (it) => itemName(it);

const formatItemPrice = (it) => {
  if (typeof it?.displayPrice === "string" && /^\$/.test(it.displayPrice.trim())) {
    return it.displayPrice.trim();
  }
  const n = itemPriceNumber(it);
  if (n == null) return "";
  return `$${n.toFixed(2)}`;
};

const renderProductOption = (props, it) => {
  if (!it) return null;
  const price = formatItemPrice(it);
  const optId = itemProductId(it);
  return (
    <Box
      component="li"
      {...props}
      key={optId ?? props.key}
      sx={{
        display: "flex !important",
        alignItems: "center !important",
        justifyContent: "space-between !important",
        gap: 1,
        py: "6px !important",
        width: "100%",
      }}
    >
      <Typography variant="body2" fontWeight={600} noWrap sx={{ minWidth: 0, flex: 1 }}>
        {formatItemLabel(it)}
      </Typography>
      {!!price && (
        <Typography
          variant="body2"
          fontWeight={800}
          sx={{ color: "#2e7d32", textAlign: "right", flexShrink: 0, pl: 1 }}
        >
          {price}
        </Typography>
      )}
    </Box>
  );
};

const darkSelectSx = {
  "& .MuiInputBase-root": { color: "#fff" },
  "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.72)" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.28)" },
  "& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(255,255,255,0.45)",
  },
  "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.7)" },
};

export default function ProductSelector({ autoSelectFirst = false, compact = false }) {
  const { state, dispatch } = useEditor();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const doc = state?.doc || {};
  const docData = doc?.data || {};
  const layers = doc?.layers || [];
  const folders = doc?.folders || doc?.meta?.folders || [];

  const usedSlots = useMemo(
    () => collectUsedProductSlots(layers, folders),
    [layers, folders]
  );

  // Si no hay binds aún, mostrar al menos Producto 1
  const slotsToShow = usedSlots.length > 0 ? usedSlots : [0];
  const multiSlot = slotsToShow.length > 1;

  const applySelection = useCallback(
    (slotIndex, it) => {
      if (!it) return;
      const patch = buildSlotSelectionPatch(docData, slotIndex, it);
      if (!patch) return;
      dispatch({ type: "SET_DOC_DATA_PATCH", patch });
    },
    [dispatch, docData]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const { data } = await getAllProducts({ all: "true" });
        if (!alive) return;

        const raw = Array.isArray(data)
          ? data
          : Array.isArray(data?.products)
            ? data.products
            : Array.isArray(data?.rows)
              ? data.rows
              : [];
        const arr = raw
          .filter(isSellableInCaja)
          .map(mapProductToSlotItem)
          .filter(Boolean)
          .sort((a, b) =>
            String(a.displayName || "").localeCompare(String(b.displayName || ""), "es", {
              sensitivity: "base",
            })
          );
        setItems(arr);

        if (autoSelectFirst && arr.length) {
          // Si la plantilla ya trae productos guardados, no pisarlos
          const hasSaved =
            !!itemProductId(getSlotData(docData, 0)) ||
            (Array.isArray(docData?.slots) &&
              docData.slots.some((s) => s && itemProductId(s) != null));
          if (!hasSaved) {
            const slots = collectUsedProductSlots(
              state?.doc?.layers || [],
              state?.doc?.folders || state?.doc?.meta?.folders || []
            );
            const slotsNeeded = (slots.length ? slots : [0]).filter(
              (slot) => itemProductId(getSlotData(docData, slot)) == null
            );

            if (slotsNeeded.length) {
              let nextData = { ...(docData || {}) };
              slotsNeeded.forEach((slot, i) => {
                const it = arr[Math.min(i, arr.length - 1)];
                const patch = buildSlotSelectionPatch(nextData, slot, it);
                if (patch) nextData = { ...nextData, ...patch };
              });
              dispatch({ type: "SET_DOC_DATA_PATCH", patch: nextData });
            }
          }
        }
      } catch (e) {
        console.error("getAllProducts (ProductSelector) error:", e);
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSelectFirst]);

  const handleSelect = (slotIndex, id) => {
    if (id === "" || id == null) return;
    const it = items.find((x) => String(itemProductId(x)) === String(id));
    applySelection(slotIndex, it);
  };

  const textLayers = useMemo(() => layers.filter((l) => l?.type === "text"), [layers]);
  const imageLayers = useMemo(() => layers.filter((l) => l?.type === "image"), [layers]);

  const [imgStatus, setImgStatus] = useState({});

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const next = {};

      for (const rawLayer of imageLayers) {
        const resolved = resolveLayer(doc, docData, rawLayer);
        const src = resolved?.props?.src || "";

        if (!src) {
          next[rawLayer?.id || ""] = false;
          continue;
        }

        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            if (!cancelled) next[rawLayer?.id || ""] = true;
            resolve(true);
          };
          img.onerror = () => {
            if (!cancelled) next[rawLayer?.id || ""] = false;
            resolve(false);
          };
          img.src = src;
        });
      }

      if (!cancelled) setImgStatus(next);
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [doc, docData, imageLayers]);

  const getRawKeyForText = (l) => l?.fieldKey || l?.bind?.textFrom || "";
  const getRawKeyForImage = (l) => l?.fieldKey || l?.bind?.srcFrom || "";

  const getValueState = (rawKey, slotData) => {
    if (!rawKey) return { k: "", value: undefined, state: "no-key" };

    const v = resolveValue(slotData, rawKey);

    if (v === undefined) return { k: rawKey, value: v, state: "missing" };
    if (v === null) return { k: rawKey, value: v, state: "null" };
    if (typeof v === "number") {
      if (Number.isNaN(v)) return { k: rawKey, value: v, state: "nan" };
      return { k: rawKey, value: v, state: "ok" };
    }
    if (typeof v === "string") {
      if (!v.trim()) return { k: rawKey, value: v, state: "empty" };
      return { k: rawKey, value: v, state: "ok" };
    }
    return { k: rawKey, value: v, state: "ok" };
  };

  const renderSlotSelect = (slotIndex) => {
    const slotData = getSlotData(docData, slotIndex);
    const selectedId = itemProductId(slotData) ?? "";

    return (
      <Box key={slotIndex} sx={{ ...darkSelectSx, mt: multiSlot || slotsToShow[0] !== slotIndex ? 1.25 : 0 }}>
        <SearchableSelect
          label={multiSlot ? slotLabel(slotIndex) : "Producto"}
          placeholder="Buscar producto…"
          items={items}
          value={selectedId}
          onChange={(id) => handleSelect(slotIndex, id)}
          loading={loading}
          getOptionLabel={formatItemLabel}
          getOptionValue={(item) => itemProductId(item)}
          getSearchText={(item) =>
            [
              itemName(item),
              item?.product?.name,
              item?.product?.barcode,
              item?.product?.sku,
            ]
              .filter(Boolean)
              .join(" ")
          }
          renderOption={renderProductOption}
        />
      </Box>
    );
  };

  const catalogPanel = (
    <Box sx={{ p: 2 }}>
      <Typography sx={{ fontWeight: 900, color: "#fff", mb: 1 }}>
        {compact ? "Productos" : multiSlot ? "Productos por card" : "Catálogo"}
      </Typography>

      {slotsToShow.map((slot) => renderSlotSelect(slot))}

      {compact ? (
        <Box sx={{ mt: 1.5, color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
          {multiSlot
            ? "Cada selector alimenta una card distinta de la plantilla."
            : "Solo cambias qué producto se muestra. Para editar la plantilla usa el Editor."}
        </Box>
      ) : (
        <>
          <Box sx={{ mt: 1, color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
            {multiSlot
              ? "Asigna un producto a cada card (Producto 1, 2…). El slot se define en el inspector de cada capa."
              : "Selecciona un producto para ver el preview en el canvas."}
          </Box>
          <Box sx={{ mt: 1, color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
            base pathImg: <span style={{ wordBreak: "break-all" }}>{String(pathImg)}</span>
          </Box>
        </>
      )}
    </Box>
  );

  if (compact) {
    return (
      <Box
        sx={{
          minHeight: 0,
          overflow: "auto",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.35)",
          height: "100%",
        }}
      >
        {catalogPanel}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: 0,
        overflow: "hidden",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {catalogPanel}

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      <Box sx={{ p: 2, overflow: "auto", minHeight: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 900, color: "#fff", mb: 1 }}>Vista rápida (capas)</Typography>

        <Box sx={{ mb: 2 }}>
          <Typography sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 800, fontSize: 12, mb: 1 }}>
            doc.data.slots
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1,
              borderRadius: 1.5,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.85)",
              fontSize: 11,
              overflow: "auto",
              maxHeight: 180,
            }}
          >
            {JSON.stringify(
              {
                slots: docData?.slots,
                id: docData?.id,
                displayName: docData?.displayName,
              },
              null,
              2
            )}
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 800, fontSize: 12, mb: 1 }}>
            Textos ({textLayers.length})
          </Typography>

          <Stack spacing={1}>
            {textLayers.length === 0 ? (
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                No hay capas de texto
              </Typography>
            ) : (
              textLayers.map((rawLayer) => {
                const resolved = resolveLayer(doc, docData, rawLayer);
                const rawKey = getRawKeyForText(rawLayer);
                const slot = getLayerProductSlot(rawLayer, folders);
                const slotData = getSlotData(docData, slot ?? 0);
                const s = getValueState(rawKey, slotData);
                const shown = resolved?.props?.text ?? rawLayer?.props?.text ?? "";

                let statusLabel = "❌ vacío";
                if (!rawKey) statusLabel = "🟡 default";
                else if (s.state === "ok") statusLabel = "✅ cargó";
                else if (s.state === "missing") statusLabel = "❌ no existe";
                else if (s.state === "null") statusLabel = "⚠️ nulo";
                else if (s.state === "empty") statusLabel = "🟡 default";

                return (
                  <Box
                    key={rawLayer.id}
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: "wrap" }}>
                      <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: 12 }}>
                        {rawLayer.name || rawLayer.id}
                      </Typography>
                      {slot != null && <Chip size="small" label={slotLabel(slot)} />}
                      <Chip size="small" label={rawKey || "fijo"} />
                      <Chip size="small" label={statusLabel} />
                    </Stack>
                    <Typography sx={{ color: "#fff", fontSize: 12 }}>
                      {shown || <span style={{ color: "rgba(255,255,255,0.45)" }}>(vacío)</span>}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Stack>
        </Box>

        <Box>
          <Typography sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 800, fontSize: 12, mb: 1 }}>
            Imágenes ({imageLayers.length})
          </Typography>

          <Stack spacing={1}>
            {imageLayers.length === 0 ? (
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                No hay capas de imagen
              </Typography>
            ) : (
              imageLayers.map((rawLayer) => {
                const resolved = resolveLayer(doc, docData, rawLayer);
                const rawKey = getRawKeyForImage(rawLayer);
                const slot = getLayerProductSlot(rawLayer, folders);
                const src = resolved?.props?.src || "";
                const loaded = imgStatus[rawLayer?.id || ""] === true;

                return (
                  <Box
                    key={rawLayer.id}
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: "wrap" }}>
                      <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: 12 }}>
                        {rawLayer.name || rawLayer.id}
                      </Typography>
                      {slot != null && <Chip size="small" label={slotLabel(slot)} />}
                      <Chip size="small" label={rawKey || "fijo"} />
                      <Chip size="small" label={src ? (loaded ? "✅ cargó" : "❌ error") : "sin src"} />
                    </Stack>
                    <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: 11, wordBreak: "break-all" }}>
                      {src || "(sin ruta)"}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
