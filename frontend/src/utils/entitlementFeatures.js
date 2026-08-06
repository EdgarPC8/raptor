/**
 * Features del entitlement (gestor): gate UI / permisos en la app cliente.
 * Escalable: agregar keys nuevas sin cambiar el contrato.
 */
import { SUBSCRIPTIONS_ENABLED } from "../hooks/useSubscriptions.js";

/** @typedef {'active'|'planned'|'maintenance'|'developer'|'hidden'|'development'} FeatureStatus */

/**
 * @param {unknown} entitlement payload de /subscription (o null)
 * @param {string} key ej. multi_stock
 * @returns {FeatureStatus}
 */
export function getFeatureStatus(entitlement, key) {
  // Sin suscripciones (dev libre): todo desbloqueado.
  if (!SUBSCRIPTIONS_ENABLED) return "active";
  const features = entitlement?.features;
  if (!Array.isArray(features)) return "hidden";
  const row = features.find((f) => f && f.key === key);
  if (!row) return "hidden";
  const status = String(row.status || "planned");
  if (status === "development") return "maintenance";
  return /** @type {FeatureStatus} */ (status);
}

/** El gestor desbloqueó la opción (el cliente aún puede no haberla activado). */
export function isFeatureUnlocked(status, { isProgrammer = false } = {}) {
  if (status === "active") return true;
  if (status === "developer" && isProgrammer) return true;
  return false;
}

export const FEATURE_STATUS_HINT = {
  planned: "Próximamente: tu instalación aún no tiene esta opción desbloqueada.",
  maintenance: "En mantenimiento: no se puede activar por ahora.",
  developer: "Solo desarrollador: visible para el rol Programador.",
  hidden: "",
  active: "",
  development: "En mantenimiento: no se puede activar por ahora.",
};
