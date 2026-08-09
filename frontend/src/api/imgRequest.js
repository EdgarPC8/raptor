/** API gestión de imágenes en servidor (/img). Solo Programador. */
import axios, { jwt } from "./axios.js";

const auth = () => ({ headers: { Authorization: jwt() } });

export const scanImagesRequest = ({ folder = "", maxDepth = 30 } = {}) =>
  axios.get(
    `/img/scan?folder=${encodeURIComponent(folder)}&maxDepth=${encodeURIComponent(maxDepth)}&includeNonImages=false`,
    auth()
  );

export const uploadImageRequest = ({ file, folder = "", name = "", replace = false }) => {
  const fd = new FormData();
  // También en body por si el servidor los lee desde ahí
  if (folder) fd.append("folder", folder);
  if (name) fd.append("name", name);
  fd.append("replace", String(!!replace));
  fd.append("file", file);
  // Query: multer a veces no tiene req.body en destination; query sí está disponible
  const qs = new URLSearchParams();
  if (folder) qs.set("folder", folder);
  if (name) qs.set("name", name);
  qs.set("replace", String(!!replace));
  return axios.post(`/img/upload?${qs.toString()}`, fd, {
    headers: { Authorization: jwt() },
  });
};

export const deleteImageRequest = (relPath) =>
  axios.delete(`/img/delete?relPath=${encodeURIComponent(relPath)}`, auth());

export const downloadFolderZipRequest = (folder = "") =>
  axios.get(`/img/download?folder=${encodeURIComponent(folder)}`, {
    ...auth(),
    responseType: "blob",
  });

/** Comprueba qué rutas relativas ya existen en src/img */
export const checkImagesExistRequest = (paths = []) =>
  axios.post("/img/check-exists", { paths }, auth());

export const deleteFolderRequest = (folder, { force = false } = {}) =>
  axios.delete(
    `/img/folder?folder=${encodeURIComponent(folder)}&force=${encodeURIComponent(force)}`,
    auth()
  );
