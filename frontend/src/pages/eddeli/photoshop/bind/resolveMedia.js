// bind/resolveMedia.js
import { pathImg } from "../../../../api/axios";

// -------------------- utils --------------------
export const joinUrl = (base = "", p = "") =>
  `${String(base).replace(/\/+$/, "")}/${String(p).replace(/^\/+/, "")}`;

export const isAbsoluteUrl = (s = "") =>
  /^https?:\/\//i.test(String(s)) ||
  /^data:image\//i.test(String(s)) ||
  /^blob:/i.test(String(s));

export const isNonEmptyString = (v) =>
  typeof v === "string" && v.trim().length > 0;

export const getByPath = (obj, path) => {
  try {
    const segments = String(path || "")
      .split(".")
      .filter((segment) => segment !== "");

    if (!segments.length) return undefined;

    let current = obj;

    for (const segment of segments) {
      if (current == null) return undefined;

      if (Array.isArray(current)) {
        if (segment === "*" || segment === "[]") {
          return current;
        }

        const mapped = current
          .map((item) => (item && typeof item === "object" ? item[segment] : undefined))
          .filter((value) => value !== undefined);

        current = mapped.length <= 1 ? mapped[0] : mapped;
        continue;
      }

      current = current?.[segment];
    }

    return current;
  } catch {
    return undefined;
  }
};

// Modo limpio:
// - "imageUrl" -> raíz
// - "product.primaryImageUrl" -> path
export const normalizeKey = (k = "") => String(k || "").trim();

// Devuelve el valor tal cual (puede ser null, "", 0, etc.)
// Solo undefined significa "no existe".
export const resolveValue = (docData, rawKey) => {
  const key = normalizeKey(rawKey);
  if (!key) return undefined;

  const root = docData && typeof docData === "object" ? docData : {};
  if (key.includes(".")) return getByPath(root, key);
  return root[key];
};

// Convierte rutas relativas usando pathImg.
// Si ya es absoluta, la respeta.
export const resolveImageUrl = (value, { base = pathImg, prefix = "" } = {}) => {
  if (!isNonEmptyString(value)) return "";

  const v = String(value).trim();
  if (isAbsoluteUrl(v)) return v;

  const baseClean = String(base).replace(/\/+$/, "");
  // Ya resuelta bajo base (evita /eddeliapi/img/eddeliapi/img/... al re-renderizar)
  if (v.startsWith(`${baseClean}/`) || v === baseClean) return v;

  if (isNonEmptyString(prefix)) return joinUrl(prefix, v);

  return joinUrl(baseClean, v);
};

export const serializeBoundValue = (value) => {
  if (value === undefined || value === null) return "";

  if (Array.isArray(value)) {
    const pieces = value
      .flatMap((item) => {
        const normalized = serializeBoundValue(item);
        return normalized === "" ? [] : [normalized];
      })
      .filter((item) => item !== "");

    return pieces.join(", ");
  }

  if (typeof value === "object") {
    const candidates = [
      value.id,
      value.name,
      value.label,
      value.displayName,
      value.title,
      value.sku,
      value.barcode,
      value.value,
      value.code,
    ].filter((item) => item !== undefined && item !== null && String(item).trim() !== "");

    if (candidates.length) return String(candidates[0]);
    return "";
  }

  return String(value);
};
