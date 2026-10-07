/**
 * resolveTemplate.js
 *
 * Resuelve el documento y cada capa con los datos (doc.data):
 * - Capas tipo image: src desde bind.srcFrom o props.src o fallbackSrc.
 * - Capas tipo text: text desde bind.textFrom o se mantiene props.text.
 * (El fondo se hace con una capa tipo imagen que ocupe todo el canvas.)
 */
import { pathImg } from "../../../../api/axios";
import {
  resolveValue,
  resolveImageUrl,
  isNonEmptyString,
  serializeBoundValue,
} from "./resolveMedia";

const resolveMultiProductText = (docData, keyForText) => {
  if (!keyForText) return undefined;

  const direct = resolveValue(docData, keyForText);
  if (direct !== undefined) {
    return serializeBoundValue(direct);
  }

  const rawProductIds = docData?.productIds ?? docData?.products?.map((p) => p?.id) ?? [];
  if (Array.isArray(rawProductIds) && rawProductIds.length > 0) {
    const values = rawProductIds
      .map((id) => {
        const product = Array.isArray(docData?.products)
          ? docData.products.find((p) => String(p?.id) === String(id))
          : undefined;

        if (!product) return "";

        const candidate = keyForText.startsWith("product.")
          ? keyForText.replace(/^product\./, "")
          : keyForText;

        const fromProduct = candidate === "id"
          ? product.id
          : candidate === "name"
            ? product.name
            : candidate === "displayName"
              ? product.displayName ?? product.name
              : candidate === "price"
                ? product.price
                : candidate === "sku"
                  ? product.sku
                  : candidate === "barcode"
                    ? product.barcode
                    : undefined;

        return fromProduct !== undefined && fromProduct !== null ? String(fromProduct) : "";
      })
      .filter((value) => value !== "");

    if (values.length) return values.join(", ");
  }

  return undefined;
};

/**
 * Resuelve TODO el template antes de dibujar (solo layers; sin background fijo).
 */
export const resolveTemplate = (doc, docData) => {
  if (!doc) return doc;

  return {
    ...doc,
    layers: doc.layers.map((layer) =>
      resolveLayer(doc, docData, layer)
    ),
  };
};

export const resolveLayer = (doc, docData, layer) => {
  if (!layer) return layer;

  const keyForImage = layer?.fieldKey || layer?.bind?.srcFrom || "";
  const keyForText = layer?.fieldKey || layer?.bind?.textFrom || "";

  /* ================= IMAGE / SVG ================= */
  if (layer.type === "image" || layer.type === "svg") {
    const value = resolveValue(docData, keyForImage);

    const srcPrefix = layer?.bind?.srcPrefix || "";
    const fallbackSrc = layer?.bind?.fallbackSrc || "";
    const defaultSrc = layer?.props?.src || "";

    let finalSrc = "";

    if (isNonEmptyString(value)) {
      finalSrc = resolveImageUrl(value, { base: pathImg, prefix: srcPrefix });
    } else if (isNonEmptyString(defaultSrc)) {
      finalSrc = resolveImageUrl(defaultSrc, { base: pathImg, prefix: srcPrefix });
    } else if (isNonEmptyString(fallbackSrc)) {
      finalSrc = resolveImageUrl(fallbackSrc, { base: pathImg, prefix: srcPrefix });
    }

    return {
      ...layer,
      props: { ...(layer.props || {}), src: finalSrc },
    };
  }

/* ================= TEXT ================= */
if (layer.type === "text") {
  const value = resolveMultiProductText(docData, keyForText);

  // ❌ solo undefined y null significan "no hay dato"
  if (value === undefined || value === null) return layer;

  return {
    ...layer,
    props: { ...(layer.props || {}), text: String(value) },
  };
}


  return layer;
};
