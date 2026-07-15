/**
 * Peticiones de cuentas, roles y reseteo de contraseña (admin/programador).
 */
import axios, { jwt } from "./axios.js";
import { isGuestDataMode, guestFrom, guestDenied } from "../mocks/guest/guestApi.js";

const auth = () => ({ headers: { Authorization: jwt() } });

export const getAccount = (accountId, rolId) =>
  axios.get(`/account/${accountId}/${rolId}`, auth());

export const getAccountsRequest = () =>
  isGuestDataMode() ? guestFrom("accounts") : axios.get("/account", auth());

export const getOneAccountRequest = (id) => axios.get(`/account/${id}`, auth());

export const addAccountRequest = (data) =>
  isGuestDataMode() ? guestDenied() : axios.post("/account", data, auth());

export const updateAccountRequest = (id, data) =>
  isGuestDataMode() ? guestDenied() : axios.put(`/account/${id}`, data, auth());

export const deleteAccountRequest = (id) =>
  isGuestDataMode() ? guestDenied() : axios.delete(`/account/${id}`, auth());

export const resetPasswordRequest = (id) =>
  isGuestDataMode() ? guestDenied() : axios.put(`/account/resetPassword/${id}`, {}, auth());

export const getRolRequest = () =>
  isGuestDataMode() ? guestFrom("roles") : axios.get("/rol", auth());

export const addRolRequest = (data) =>
  isGuestDataMode() ? guestDenied() : axios.post("/rol", data, auth());

export const updateRolRequest = (id, data) =>
  isGuestDataMode() ? guestDenied() : axios.put(`/rol/${id}`, data, auth());

export const getOneRolRequest = (id) => axios.get(`/rol/${id}`, auth());

export const deleteRolRequest = (id) =>
  isGuestDataMode() ? guestDenied() : axios.delete(`/rol/${id}`, auth());

export const updateAccountUser = (accountId, userId, rolId, data) =>
  axios.put(
    `/account/updateAccountUser/${accountId}/${userId}/${rolId}`,
    data,
    auth(),
  );
