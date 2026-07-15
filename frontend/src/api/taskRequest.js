import axios, { authHeaders } from "./axios.js";
import { isGuestDataMode, guestFrom, guestDenied } from "../mocks/guest/guestApi.js";

const auth = () => authHeaders();

export const getTaskAssignees = () =>
  isGuestDataMode() ? guestFrom("taskAssignees") : axios.get("/tasks/assignees", auth());
export const getTaskPlans = () =>
  isGuestDataMode() ? guestFrom("taskPlans") : axios.get("/tasks/plans", auth());
export const createTaskPlan = (payload) =>
  isGuestDataMode() ? guestDenied() : axios.post("/tasks/plans", payload, auth());
export const updateTaskPlan = (id, payload) =>
  isGuestDataMode() ? guestDenied() : axios.put(`/tasks/plans/${id}`, payload, auth());
export const deleteTaskPlan = (id) =>
  isGuestDataMode() ? guestDenied() : axios.delete(`/tasks/plans/${id}`, auth());
export const publishTaskPlan = (id) =>
  isGuestDataMode() ? guestDenied() : axios.post(`/tasks/plans/${id}/publish`, {}, auth());
export const getMyTaskItems = (params = {}) => {
  if (isGuestDataMode()) return guestFrom("myTaskItems");
  const qs = new URLSearchParams(params).toString();
  return axios.get(`/tasks/my-items${qs ? `?${qs}` : ""}`, auth());
};
export const updateTaskItemStatus = (id, payload) =>
  isGuestDataMode() ? guestDenied() : axios.put(`/tasks/items/${id}/status`, payload, auth());
export const deleteTaskItem = (id) =>
  isGuestDataMode() ? guestDenied() : axios.delete(`/tasks/items/${id}`, auth());
export const executeTaskOpenBox = (id) =>
  isGuestDataMode() ? guestDenied() : axios.post(`/tasks/items/${id}/execute-open-box`, {}, auth());
