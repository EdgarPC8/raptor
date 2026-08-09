/**
 * Peticiones de comandos admin: backup, recarga BD, logs.
 */
import axios, { jwt } from "./axios.js";
import { isGuestDataMode, guestFrom, guestDenied } from "../mocks/guest/guestApi.js";

const auth = () => ({ headers: { Authorization: jwt() } });

export const reloadBD = () =>
  isGuestDataMode()
    ? guestDenied()
    : axios.get("/comands/reloadBD", { ...auth(), timeout: 120000 });

export const saveBackup = () =>
  isGuestDataMode()
    ? guestDenied()
    : axios.get("/comands/saveBackup", { ...auth(), timeout: 60000 });

export const getPanelStats = () =>
  isGuestDataMode() ? guestFrom("panelStats") : axios.get("/comands/panel-stats", auth());

export const getLogs = () => axios.get("/comands/getLogs", auth());

export const deleteLogsRequest = (payload) =>
  axios.delete("/comands/logs", { ...auth(), data: payload });

export const deleteLogByIdRequest = (id) =>
  axios.delete(`/comands/logs/${id}`, auth());

/** Nombre genérico: backup-YYYY-MM-DD_HH-mm-ss.json (sin marca de app). */
export function backupFilenameWithDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}.json`;
}

function filenameFromContentDisposition(header) {
  const raw = String(header || "");
  const m =
    /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(raw);
  const name = decodeURIComponent((m?.[1] || m?.[2] || m?.[3] || "").trim());
  return name && /\.json$/i.test(name) ? name : "";
}

export const downloadBackup = async () => {
  const response = await axios.get("/comands/downloadBackup", {
    ...auth(),
    responseType: "blob",
    timeout: 90000,
  });
  const fromHeader = filenameFromContentDisposition(
    response.headers?.["content-disposition"],
  );
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = fromHeader || backupFilenameWithDate();
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return response;
};

export const uploadBackup = (formData) => {
  const authorization = jwt();
  return axios.post("/comands/upload-backup", formData, {
    headers: authorization ? { Authorization: authorization } : {},
    timeout: 120000,
  });
};

export const getBackupsWorkbenchRequest = () =>
  axios.get("/comands/backups", auth());

export const setMainBackupFromStoredRequest = (filename) =>
  axios.post(`/comands/backups/stored/${encodeURIComponent(filename)}/set-main`, null, auth());

export const deleteStoredBackupRequest = (filename) =>
  axios.delete(`/comands/backups/stored/${encodeURIComponent(filename)}`, auth());

export const pruneStoredBackupsRequest = () =>
  axios.post("/comands/backups/stored/prune-and-save", null, {
    ...auth(),
    timeout: 120000,
  });

const downloadBlob = (response, filename) => {
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadMainBackupFile = async () => {
  const response = await axios.get("/comands/backups/main/download", {
    ...auth(),
    responseType: "blob",
    timeout: 90000,
  });
  downloadBlob(response, "backup.json");
  return response;
};

export const downloadStoredBackupFile = async (filename) => {
  const response = await axios.get(
    `/comands/backups/stored/${encodeURIComponent(filename)}/download`,
    { ...auth(), responseType: "blob", timeout: 90000 }
  );
  downloadBlob(response, filename);
  return response;
};
