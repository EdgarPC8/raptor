import axios, { authHeaders } from "./axios.js";
import { isGuestDataMode, guestFrom, guestOk, guestDenied } from "../mocks/guest/guestApi.js";

const auth = () => authHeaders();

export const getActiveShift = () => {
  if (isGuestDataMode()) return guestFrom("activeShift");
  return axios.get("/shifts/active", auth());
};

export const getShifts = (params = {}) => {
  if (isGuestDataMode()) return guestFrom("shifts");
  const qs = new URLSearchParams(params).toString();
  return axios.get(`/shifts${qs ? `?${qs}` : ""}`, auth());
};

export const getShiftById = (id) => {
  if (isGuestDataMode()) return guestFrom("activeShift");
  return axios.get(`/shifts/${id}`, auth());
};

export const openShift = (payload) => {
  if (isGuestDataMode()) return guestDenied();
  return axios.post("/shifts/open", payload, auth());
};

export const closeShift = (id, payload) => {
  if (isGuestDataMode()) return guestDenied();
  return axios.post(`/shifts/${id}/close`, payload, auth());
};

export const getShiftMovements = (shiftId) => {
  if (isGuestDataMode()) return guestOk([]);
  return axios.get(`/shifts/${shiftId}/movements`, auth());
};

export const createShiftMovement = (shiftId, payload) => {
  if (isGuestDataMode()) return guestDenied();
  return axios.post(`/shifts/${shiftId}/movements`, payload, auth());
};

export const updateShift = (id, payload) => {
  if (isGuestDataMode()) return guestDenied();
  return axios.patch(`/shifts/${id}`, payload, auth());
};

export const updateShiftMovement = (shiftId, movementId, payload) => {
  if (isGuestDataMode()) return guestDenied();
  return axios.patch(`/shifts/${shiftId}/movements/${movementId}`, payload, auth());
};

export const deleteShiftMovement = (shiftId, movementId) => {
  if (isGuestDataMode()) return guestDenied();
  return axios.delete(`/shifts/${shiftId}/movements/${movementId}`, auth());
};

export const getWeeklyShiftReport = (params = {}) => {
  if (isGuestDataMode()) return guestFrom("shiftWeeklyReport");
  const qs = new URLSearchParams(params).toString();
  return axios.get(`/shifts/reports/weekly${qs ? `?${qs}` : ""}`, auth());
};

export const getDailyShiftReport = (params = {}) => {
  if (isGuestDataMode()) return guestFrom("shiftDailyReport");
  const qs = new URLSearchParams(params).toString();
  return axios.get(`/shifts/reports/daily${qs ? `?${qs}` : ""}`, auth());
};
