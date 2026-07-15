/** Datos extendidos del usuario autenticado (contacto, dirección, etc.). */
import axios, { jwt } from "./axios.js";
import { isGuestDataMode, guestFrom, guestDenied } from "../mocks/guest/guestApi.js";

const auth = () => ({ headers: { Authorization: jwt() } });

export const getMyUserData = () =>
  isGuestDataMode() ? guestFrom("profile") : axios.get("/users/me/data", auth());

export const updateMyUserData = (data) =>
  isGuestDataMode() ? guestDenied() : axios.put("/users/me/data", data, auth());
