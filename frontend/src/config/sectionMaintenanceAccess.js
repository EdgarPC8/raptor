/**
 * Acceso a secciones/módulos en mantenimiento según entorno (producción vs desarrollo).
 * Fuente de verdad preferida: suscripción del gestor (status en BD).
 * Fallback: catálogo local appModulesCatalog.js.
 */
import { API_MODE } from "./deployEnv.js";
import {
  APP_MODULE_GROUPS,
  resolveModuleStatus,
  resolveGroupModuleStatus,
} from "./appModulesCatalog.js";

/** Producción: build de deploy (Vite prod) o API_MODE=production. */
export function isAppInProduction() {
  if (API_MODE === "production") return true;
  if (API_MODE === "local" || API_MODE === "server") return false;
  return !import.meta.env.DEV;
}

/** Programador puede abrir secciones en mantenimiento aunque esté en producción. */
export function canBypassSectionMaintenance(loginRol) {
  return loginRol === "Programador";
}

function normalizePath(path) {
  return String(path || "")
    .split("?")[0]
    .replace(/\/+$/, "") || "/";
}

/** Alias legacy que deben bloquearse con el módulo en mantenimiento. */
const MAINTENANCE_PATH_ALIASES = {
  diseno: [
    { path: "/editor", name: "Editor de diseño" },
    { path: "/templates", name: "Plantillas" },
    { path: "/publicity_edit", name: "Editor de diseño" },
    { path: "/editorDefault", name: "Editor de diseño" },
  ],
  diseno_promocional: [
    { path: "/editor", name: "Editor de diseño" },
    { path: "/templates", name: "Plantillas" },
    { path: "/publicity_edit", name: "Editor de diseño" },
    { path: "/editorDefault", name: "Editor de diseño" },
  ],
};

/**
 * Lista desde módulos de la API del gestor (`subscription.modules`).
 */
export function listMaintenanceSectionsFromSubscription(modules = []) {
  const out = [];
  const seen = new Set();

  const push = (path, name, moduleLabel, description) => {
    const p = normalizePath(path);
    if (!p || p.includes(":") || seen.has(p)) return;
    seen.add(p);
    out.push({
      path: p,
      name,
      moduleLabel,
      description: description || "",
    });
  };

  const isMaint = (status) =>
    status === "maintenance" || status === "development";

  for (const mod of modules) {
    for (const section of mod.sections || []) {
      if (!isMaint(section.status)) continue;
      push(section.key, section.name, mod.name, "");
    }
    const aliasKey = mod.key || "";
    const moduleMaint = isMaint(mod.status);
    if (moduleMaint && MAINTENANCE_PATH_ALIASES[aliasKey]) {
      for (const alias of MAINTENANCE_PATH_ALIASES[aliasKey]) {
        push(alias.path, alias.name, mod.name, "");
      }
    }
  }
  return out;
}

/**
 * Rutas (y meta) en mantenimiento: solo secciones con status maintenance.
 * El status del módulo no bloquea todas las secciones (control granular por sección).
 */
export function listMaintenanceSections() {
  const out = [];
  const seen = new Set();

  const push = (path, name, moduleLabel, description) => {
    const p = normalizePath(path);
    if (!p || p.includes(":") || seen.has(p)) return;
    seen.add(p);
    out.push({
      path: p,
      name,
      moduleLabel,
      description: description || "",
    });
  };

  for (const group of APP_MODULE_GROUPS) {
    for (const section of group.sections || []) {
      if (resolveModuleStatus(section) !== "maintenance") continue;
      push(
        section.path,
        section.name,
        group.label,
        section.description || group.summary,
      );
    }
    const groupMaint =
      group.status === "maintenance" || group.status === "development";
    if (groupMaint && MAINTENANCE_PATH_ALIASES[group.id]) {
      for (const alias of MAINTENANCE_PATH_ALIASES[group.id]) {
        push(alias.path, alias.name, group.label, group.summary);
      }
    }
  }
  return out;
}

function buildMaintenanceIndex(list) {
  const paths = list.map((s) => s.path).sort((a, b) => b.length - a.length);
  return { list, paths };
}

function findSectionByPath(pathname, subscriptionModules, list, paths) {
  const p = normalizePath(pathname);
  const granular =
    Array.isArray(subscriptionModules) && subscriptionModules.length > 0;
  // Con entitlement del gestor: match exacto por sección (sin propagar a subrutas).
  const match = granular
    ? paths.find((mp) => p === mp)
    : paths.find((mp) => p === mp || p.startsWith(`${mp}/`));
  if (!match) return null;
  return (
    list.find((s) => s.path === match) || {
      path: match,
      name: "Esta sección",
      moduleLabel: "",
      description: "",
    }
  );
}

let cachedLocal = null;

function getLocalMaintenanceIndex() {
  if (!cachedLocal) {
    cachedLocal = buildMaintenanceIndex(listMaintenanceSections());
  }
  return cachedLocal;
}

function getMaintenanceIndex(subscriptionModules) {
  if (Array.isArray(subscriptionModules) && subscriptionModules.length > 0) {
    return buildMaintenanceIndex(
      listMaintenanceSectionsFromSubscription(subscriptionModules),
    );
  }
  return getLocalMaintenanceIndex();
}

export function findMaintenanceSectionForPath(
  pathname,
  subscriptionModules,
) {
  const { list, paths } = getMaintenanceIndex(subscriptionModules);
  return findSectionByPath(pathname, subscriptionModules, list, paths);
}

export function isPathInMaintenance(pathname, subscriptionModules) {
  return Boolean(
    findMaintenanceSectionForPath(pathname, subscriptionModules),
  );
}

/** En producción, bloquear la ruta salvo Programador.
 * Si hay módulos del entitlement (gestor), ese status manda también en local.
 */
export function shouldBlockMaintenancePath(
  pathname,
  loginRol,
  subscriptionModules,
) {
  if (canBypassSectionMaintenance(loginRol)) return false;
  if (Array.isArray(subscriptionModules) && subscriptionModules.length > 0) {
    return isPathInMaintenance(pathname, subscriptionModules);
  }
  if (!isAppInProduction()) return false;
  return isPathInMaintenance(pathname);
}

/**
 * Ya no se ocultan del menú: el usuario debe ver la opción y, al abrirla,
 * recibir el aviso de mantenimiento (no “desaparecer” el módulo).
 */
export function shouldHideMaintenanceMenuLink() {
  return false;
}

/** Para marcar ítems del menú con aviso visual (badge Mant.). */
export function isMenuLinkInMaintenance(link, subscriptionModules) {
  if (Array.isArray(subscriptionModules) && subscriptionModules.length > 0) {
    return isPathInMaintenance(link, subscriptionModules);
  }
  if (!isAppInProduction()) return false;
  return isPathInMaintenance(link);
}

/** Secciones / módulos «Próximamente» (planned). */
export function listPlannedSectionsFromSubscription(modules = []) {
  const out = [];
  const seen = new Set();

  const push = (path, name, moduleLabel, description) => {
    const p = normalizePath(path);
    if (!p || p.includes(":") || seen.has(p)) return;
    seen.add(p);
    out.push({
      path: p,
      name,
      moduleLabel,
      description: description || "",
    });
  };

  for (const mod of modules) {
    for (const section of mod.sections || []) {
      if (section.status !== "planned") continue;
      push(section.key, section.name, mod.name, "");
    }
  }
  return out;
}

export function listPlannedSections() {
  const out = [];
  const seen = new Set();

  const push = (path, name, moduleLabel, description) => {
    const p = normalizePath(path);
    if (!p || p.includes(":") || seen.has(p)) return;
    seen.add(p);
    out.push({
      path: p,
      name,
      moduleLabel,
      description: description || "",
    });
  };

  for (const group of APP_MODULE_GROUPS) {
    for (const section of group.sections || []) {
      if (resolveModuleStatus(section) !== "planned") continue;
      push(
        section.path,
        section.name,
        group.label,
        section.description || group.summary,
      );
    }
  }
  return out;
}

function getPlannedIndex(subscriptionModules) {
  const list =
    Array.isArray(subscriptionModules) && subscriptionModules.length > 0
      ? listPlannedSectionsFromSubscription(subscriptionModules)
      : listPlannedSections();
  const paths = list.map((s) => s.path).sort((a, b) => b.length - a.length);
  return { list, paths };
}

export function findPlannedSectionForPath(pathname, subscriptionModules) {
  const { list, paths } = getPlannedIndex(subscriptionModules);
  return findSectionByPath(pathname, subscriptionModules, list, paths);
}

export function isPathPlanned(pathname, subscriptionModules) {
  return Boolean(findPlannedSectionForPath(pathname, subscriptionModules));
}

/** Programador puede abrir secciones próximamente. */
export function shouldBlockPlannedPath(
  pathname,
  loginRol,
  subscriptionModules,
) {
  if (canBypassSectionMaintenance(loginRol)) return false;
  if (Array.isArray(subscriptionModules) && subscriptionModules.length > 0) {
    return isPathPlanned(pathname, subscriptionModules);
  }
  if (!isAppInProduction()) return false;
  return isPathPlanned(pathname);
}

export function isMenuLinkPlanned(link, subscriptionModules) {
  if (Array.isArray(subscriptionModules) && subscriptionModules.length > 0) {
    return isPathPlanned(link, subscriptionModules);
  }
  if (!isAppInProduction()) return false;
  return isPathPlanned(link);
}

/** Secciones / módulos ocultos (hidden): no se muestran en el menú. */
export function listHiddenSectionsFromSubscription(modules = []) {
  const out = [];
  const seen = new Set();

  const push = (path, name, moduleLabel, description) => {
    const p = normalizePath(path);
    if (!p || p.includes(":") || seen.has(p)) return;
    seen.add(p);
    out.push({
      path: p,
      name,
      moduleLabel,
      description: description || "",
    });
  };

  for (const mod of modules) {
    const moduleHidden = mod.status === "hidden";
    for (const section of mod.sections || []) {
      if (!moduleHidden && section.status !== "hidden") continue;
      push(section.key, section.name, mod.name, "");
    }
  }
  return out;
}

export function listHiddenSections() {
  const out = [];
  const seen = new Set();

  const push = (path, name, moduleLabel, description) => {
    const p = normalizePath(path);
    if (!p || p.includes(":") || seen.has(p)) return;
    seen.add(p);
    out.push({
      path: p,
      name,
      moduleLabel,
      description: description || "",
    });
  };

  for (const group of APP_MODULE_GROUPS) {
    const groupHidden =
      group.status === "hidden" ||
      resolveGroupModuleStatus(group) === "hidden";
    for (const section of group.sections || []) {
      const st = resolveModuleStatus(section);
      if (!groupHidden && st !== "hidden") continue;
      push(
        section.path,
        section.name,
        group.label,
        section.description || group.summary,
      );
    }
  }
  return out;
}

function getHiddenIndex(subscriptionModules) {
  const list =
    Array.isArray(subscriptionModules) && subscriptionModules.length > 0
      ? listHiddenSectionsFromSubscription(subscriptionModules)
      : listHiddenSections();
  const paths = list.map((s) => s.path).sort((a, b) => b.length - a.length);
  return { list, paths };
}

export function findHiddenSectionForPath(pathname, subscriptionModules) {
  const { list, paths } = getHiddenIndex(subscriptionModules);
  return findSectionByPath(pathname, subscriptionModules, list, paths);
}

export function isPathHidden(pathname, subscriptionModules) {
  return Boolean(findHiddenSectionForPath(pathname, subscriptionModules));
}

/**
 * Oculto: nadie lo ve en menú ni entra por URL (tampoco Programador),
 * a diferencia de mantenimiento/próximamente.
 */
export function shouldBlockHiddenPath(pathname, subscriptionModules) {
  if (Array.isArray(subscriptionModules) && subscriptionModules.length > 0) {
    return isPathHidden(pathname, subscriptionModules);
  }
  if (!isAppInProduction()) return false;
  return isPathHidden(pathname);
}

/** Ocultar del menú lateral. */
export function shouldHideHiddenMenuLink() {
  return true;
}

export function isMenuLinkHidden(link, subscriptionModules) {
  if (Array.isArray(subscriptionModules) && subscriptionModules.length > 0) {
    return isPathHidden(link, subscriptionModules);
  }
  if (!isAppInProduction()) return false;
  return isPathHidden(link);
}
