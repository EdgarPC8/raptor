import axios, { jwt } from "./axios.js";
import { isGuestDataMode, guestFrom } from "../mocks/guest/guestApi.js";

/** Noticias locales sincronizadas desde Raptor Solutions. */
export const getNewsRequest = async () => {
  if (isGuestDataMode()) return guestFrom("news");
  return axios.get("/news", {
    headers: { Authorization: jwt() },
  });
};
