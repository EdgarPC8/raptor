import { uploadImageRequest } from "../../../api/imgRequest.js";
import { pathImg } from "../../../api/axios.js";
import { mediaStoragePath } from "../../../utils/mediaPaths.js";
import { toRelativeImagePath } from "./editorActions.js";

export const EDITOR_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/gif,.png,.jpg,.jpeg,.svg,.webp,.gif";

const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"]);

export function editorImgFolder() {
  return mediaStoragePath("diseno-promocional", "capas");
}

export function validateEditorImageFile(file) {
  if (!file) return "No se seleccionó archivo.";
  const name = String(file.name || "").toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  if (!ALLOWED_EXT.has(ext)) {
    return "Formato no permitido. Usa PNG, JPG, SVG, WEBP o GIF.";
  }
  const maxMb = 20;
  if (file.size > maxMb * 1024 * 1024) {
    return `La imagen supera ${maxMb} MB.`;
  }
  return null;
}

export async function uploadEditorImageFile(file) {
  const err = validateEditorImageFile(file);
  if (err) throw new Error(err);

  const res = await uploadImageRequest({
    file,
    folder: editorImgFolder(),
    name: "",
    replace: false,
  });

  const relPath = res?.data?.data?.relativePath;
  if (!relPath) {
    throw new Error(res?.data?.message || "No se recibió la ruta de la imagen.");
  }
  return toRelativeImagePath(relPath);
}

export function editorImageUrl(relativePath) {
  const rel = toRelativeImagePath(relativePath);
  if (!rel) return "";
  const base = String(pathImg).replace(/\/+$/, "");
  return `${base}/${String(rel).replace(/^\/+/, "")}`;
}

export function loadImageDimensions(relativePath) {
  return new Promise((resolve) => {
    const url = editorImageUrl(relativePath);
    if (!url) {
      resolve({ width: 400, height: 400 });
      return;
    }
    const img = new Image();
    img.onload = () =>
      resolve({
        width: img.naturalWidth || 400,
        height: img.naturalHeight || 400,
      });
    img.onerror = () => resolve({ width: 400, height: 400 });
    img.src = url;
  });
}

/** Escala w/h para que quepa en maxW×maxH manteniendo proporción. */
export function fitDimensions(width, height, maxW, maxH) {
  const w = Number(width) || 1;
  const h = Number(height) || 1;
  const scale = Math.min(maxW / w, maxH / h, 1);
  return {
    width: Math.max(Math.round(w * scale), 40),
    height: Math.max(Math.round(h * scale), 40),
  };
}
