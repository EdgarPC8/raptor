/** API de notificaciones en bandeja (listar, marcar leída, eliminar). */
import axios, { authHeaders, jwt } from "./axios.js";
import { isGuestDataMode, guestFrom, guestDenied, guestOk } from "../mocks/guest/guestApi.js";

export const getNotificationsByUser = (userId) =>
  isGuestDataMode()
    ? guestFrom("notifications")
    : axios.get(`/notifications/${userId}`, authHeaders());

export const getUnreadCount = (userId) =>
  isGuestDataMode()
    ? guestFrom("unreadCount")
    : axios.get(`/notifications/unreadCount/${userId}`, authHeaders());

export const markNotificationAsSeen = (id) =>
  isGuestDataMode() ? guestOk({ ok: true }) : axios.put(`/notifications/seen/${id}`, null, authHeaders());

export const deleteNotification = (id) =>
  isGuestDataMode() ? guestDenied() : axios.delete(`/notifications/${id}`, authHeaders());

export const markManyNotificationsAsSeen = (ids) =>
  isGuestDataMode()
    ? guestOk({ ok: true })
    : axios.put(`/notifications/bulk-seen`, { ids }, authHeaders());

export const deleteManyNotifications = (ids) =>
  isGuestDataMode()
    ? guestDenied()
    : axios.delete(`/notifications/bulk`, { data: { ids }, ...authHeaders() });

export const markAllNotificationsAsSeen = (userId) =>
  isGuestDataMode()
    ? guestOk({ ok: true })
    : axios.put(`/notifications/seen-all/${userId}`, null, authHeaders());

export const deleteReadNotifications = (userId) =>
  isGuestDataMode()
    ? guestDenied()
    : axios.delete(`/notifications/read/${userId}`, authHeaders());

export const createNotification = (data) =>
  isGuestDataMode()
    ? guestDenied()
    : axios.post("/notifications", data, {
        headers: { Authorization: jwt() },
      });
