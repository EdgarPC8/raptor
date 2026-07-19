import { APP_ROUTES } from "../config/appRoutes.js";

/**
 * Ruta de inicio tras login según rol activo.
 * Empleado → operación (caja); Admin/Programador → dashboard.
 */
export function getPostLoginPath(loginRol) {
  const role = String(loginRol || "").trim();
  if (role === "Empleado") return APP_ROUTES.operation.cash;
  return APP_ROUTES.dashboard;
}
