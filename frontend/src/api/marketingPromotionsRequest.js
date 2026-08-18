import axios, { authHeaders } from "./axios.js";
import { isGuestDataMode, guestDenied } from "../mocks/guest/guestApi.js";

const emptyGroups = { data: [] };

export const listPromoGroups = () =>
  isGuestDataMode() ? Promise.resolve(emptyGroups) : axios.get("/marketing/promotions/groups", authHeaders());

export const getPromoGroupById = (id) =>
  axios.get(`/marketing/promotions/groups/${id}`, authHeaders());

export const createPromoGroup = (data) =>
  isGuestDataMode() ? guestDenied() : axios.post("/marketing/promotions/groups", data, authHeaders());

export const updatePromoGroup = (id, data) =>
  isGuestDataMode() ? guestDenied() : axios.put(`/marketing/promotions/groups/${id}`, data, authHeaders());

export const deletePromoGroup = (id) =>
  isGuestDataMode() ? guestDenied() : axios.delete(`/marketing/promotions/groups/${id}`, authHeaders());

export const addPromoMember = (groupId, customerId) =>
  isGuestDataMode()
    ? guestDenied()
    : axios.post(`/marketing/promotions/groups/${groupId}/members`, { customerId }, authHeaders());

export const removePromoMember = (groupId, customerId) =>
  isGuestDataMode()
    ? guestDenied()
    : axios.delete(`/marketing/promotions/groups/${groupId}/members/${customerId}`, authHeaders());

export const getPromoByCustomer = (customerId) => {
  if (isGuestDataMode() || !customerId) return Promise.resolve({ data: null });
  return axios.get(`/marketing/promotions/customer/${customerId}`, authHeaders());
};
