/**
 * Noticias del periódico — catálogo fijo en código (appNewsCatalog.js).
 * Ya no se pide al backend ni se sincroniza desde el gestor.
 */
import { isGuestDataMode, guestFrom } from "../mocks/guest/guestApi.js";
import { APP_NEWS_CATALOG } from "../config/appNewsCatalog.js";

export const getNewsRequest = async () => {
  if (isGuestDataMode()) return guestFrom("news");
  return { data: APP_NEWS_CATALOG };
};
