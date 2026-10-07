/**
 * Acceso a secciones/módulos en mantenimiento / próximamente / oculto.
 *
 * Con suscripción del gestor: los estados vienen de `subscription.modules`
 * (Raptor Solutions controla active / maintenance / planned / hidden).
 * Sin módulos del gestor: fallback al catálogo local (appModulesCatalog.js).
 */
import { API_MODE } from "./deployEnv.js";
import {
  APP_MODULE_GROUPS,
  MODULE_STATUS_META,
  normalizeModuleStatus,
  resolveModuleStatus,
  resolveGroupModuleStatus,
  listCatalogModuleGroupsWithStatus,
} from "./appModulesCatalog.js";
import {
  canonicalizeAppPath,
  normalizeAppPath,
  appPathsMatch,
} from "./appRoutes.js";

/** Producción: build de deploy (Vite prod) o API_MODE=production. */
export function isAppInProduction() {
  if (API_MODE === "production") return true;
  if (API_MODE === "local" || API_MODE === "server") return false;
  return !import.meta.env.DEV;
}

/** Propietario puede abrir secciones en mantenimiento aunque esté en producción. */
export function canBypassSectionMaintenance(loginRol) {
  return loginRol === "Propietario" || loginRol === "Programador";
}

function normalizePath(path) {
  return canonicalizeAppPath(path);
}

function hasGestorModules(modules) {
  return Array.isArray(modules) && modules.length > 0;
}

/** Alias legacy que deben bloquearse con el módulo en mantenimiento. */
const MAINTENANCE_PATH_ALIASES = {
  marketing: [
    { path: "/editor", name: "Editor de diseño" },
    { path: "/templates", name: "Plantillas" },
    { path: "/publicity_edit", name: "Editor de diseño" },
    { path: "/editorDefault", name: "Editor de diseño" },
  ],
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
    const moduleMaint = isMaint(mod.status);
    for (const section of mod.sections || []) {
      if (!isMaint(section.status) && !moduleMaint) continue;
      if (section.status === "hidden" || section.status === "planned") continue;
      push(section.key, section.name, mod.name, "");
    }
    const aliasKey = mod.key || "";
    if (moduleMaint && MAINTENANCE_PATH_ALIASES[aliasKey]) {
      for (const alias of MAINTENANCE_PATH_ALIASES[aliasKey]) {
        push(alias.path, alias.name, mod.name, "");
      }
    }
  }
  return out;
}

/**
 * Rutas (y meta) en mantenimiento: catálogo local.
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

function findSectionByPath(pathname, list, paths) {
  const p = normalizePath(pathname);
  const match = paths.find((mp) => p === mp || p.startsWith(`${mp}/`));
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
  if (hasGestorModules(subscriptionModules)) {
    return buildMaintenanceIndex(
      listMaintenanceSectionsFromSubscription(subscriptionModules),
    );
  }
  return getLocalMaintenanceIndex();
}

export function findMaintenanceSectionForPath(pathname, subscriptionModules) {
  const { list, paths } = getMaintenanceIndex(subscriptionModules);
  return findSectionByPath(pathname, list, paths);
}

export function isPathInMaintenance(pathname, subscriptionModules) {
  return Boolean(findMaintenanceSectionForPath(pathname, subscriptionModules));
}

/**
 * Bloquear ruta en mantenimiento.
 * Con módulos del gestor: aplica siempre (el control plane manda).
 * Sin gestor: solo en producción (dev libre con catálogo local).
 */
export function shouldBlockMaintenancePath(
  pathname,
  loginRol,
  subscriptionModules,
) {
  if (canBypassSectionMaintenance(loginRol)) return false;
  if (
    !hasGestorModules(subscriptionModules) &&
    !isAppInProduction()
  ) {
    return false;
  }
  return isPathInMaintenance(pathname, subscriptionModules);
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
  if (
    !hasGestorModules(subscriptionModules) &&
    !isAppInProduction()
  ) {
    return false;
  }
  return isPathInMaintenance(link, subscriptionModules);
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
  if (hasGestorModules(subscriptionModules)) {
    const list = listPlannedSectionsFromSubscription(subscriptionModules);
    return {
      list,
      paths: list.map((s) => s.path).sort((a, b) => b.length - a.length),
    };
  }
  const list = listPlannedSections();
  return {
    list,
    paths: list.map((s) => s.path).sort((a, b) => b.length - a.length),
  };
}

export function findPlannedSectionForPath(pathname, subscriptionModules) {
  const { list, paths } = getPlannedIndex(subscriptionModules);
  return findSectionByPath(pathname, list, paths);
}

export function isPathPlanned(pathname, subscriptionModules) {
  return Boolean(findPlannedSectionForPath(pathname, subscriptionModules));
}

/** «Próximamente» aplica a todos los roles (sin bypass de Propietario). */
export function shouldBlockPlannedPath(pathname, _loginRol, subscriptionModules) {
  if (
    !hasGestorModules(subscriptionModules) &&
    !isAppInProduction()
  ) {
    return false;
  }
  return isPathPlanned(pathname, subscriptionModules);
}

export function isMenuLinkPlanned(link, subscriptionModules) {
  if (
    !hasGestorModules(subscriptionModules) &&
    !isAppInProduction()
  ) {
    return false;
  }
  return isPathPlanned(link, subscriptionModules);
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
  if (hasGestorModules(subscriptionModules)) {
    const list = listHiddenSectionsFromSubscription(subscriptionModules);
    return {
      list,
      paths: list.map((s) => s.path).sort((a, b) => b.length - a.length),
    };
  }
  const list = listHiddenSections();
  return {
    list,
    paths: list.map((s) => s.path).sort((a, b) => b.length - a.length),
  };
}

export function findHiddenSectionForPath(pathname, subscriptionModules) {
  const { list, paths } = getHiddenIndex(subscriptionModules);
  return findSectionByPath(pathname, list, paths);
}

export function isPathHidden(pathname, subscriptionModules) {
  return Boolean(findHiddenSectionForPath(pathname, subscriptionModules));
}

/**
 * Oculto: nadie lo ve en menú ni entra por URL (tampoco Propietario),
 * a diferencia de mantenimiento/próximamente.
 */
export function shouldBlockHiddenPath(pathname, subscriptionModules) {
  if (
    !hasGestorModules(subscriptionModules) &&
    !isAppInProduction()
  ) {
    return false;
  }
  return isPathHidden(pathname, subscriptionModules);
}

/** Ocultar del menú lateral. */
export function shouldHideHiddenMenuLink() {
  return true;
}

export function isMenuLinkHidden(link, subscriptionModules) {
  if (
    !hasGestorModules(subscriptionModules) &&
    !isAppInProduction()
  ) {
    return false;
  }
  return isPathHidden(link, subscriptionModules);
}

/**
 * ¿Mostrar UI embebida de la sección (panel dashboard, etc.)?
 */
export function isSectionUiEnabled(pathname, loginRol, subscriptionModules) {
  if (shouldBlockHiddenPath(pathname, subscriptionModules)) return false;
  if (shouldBlockMaintenancePath(pathname, loginRol, subscriptionModules)) {
    return false;
  }
  if (shouldBlockPlannedPath(pathname, loginRol, subscriptionModules)) {
    return false;
  }
  return true;
}

/**
 * Combina catálogo local (estructura) con estados del gestor (subscription.modules).
 * Para /sistema/modulos.
 */
export function listModulesWithGestorStatus(subscriptionModules) {
  const base = listCatalogModuleGroupsWithStatus();
  if (!hasGestorModules(subscriptionModules)) return base;

  const byKey = new Map(
    subscriptionModules.map((m) => [String(m.key || "").trim(), m]),
  );

  return base.map((mod) => {
    const g = byKey.get(String(mod.id || "").trim());
    if (!g) return mod;

    const secByPath = new Map(
      (g.sections || []).map((s) => [normalizePath(s.key), s]),
    );

    const sectionItems = (mod.sectionItems || []).map((s) => {
      const hit = secByPath.get(normalizePath(s.path));
      if (!hit?.status) return s;
      const status = normalizeModuleStatus(hit.status);
      return { ...s, status };
    });

    const status = normalizeModuleStatus(g.status) || mod.status;
    return {
      ...mod,
      status,
      statusMeta: MODULE_STATUS_META[status] || MODULE_STATUS_META.active,
      sectionItems,
      plannedSectionCount: sectionItems.filter((s) => s.status === "planned")
        .length,
      maintenanceSectionCount: sectionItems.filter(
        (s) => s.status === "maintenance",
      ).length,
      hiddenSectionCount: sectionItems.filter((s) => s.status === "hidden")
        .length,
      sections: sectionItems.map((s) =>
        s.status === "planned"
          ? `${s.name} (próx.)`
          : s.status === "maintenance"
            ? `${s.name} (mant.)`
            : s.status === "hidden"
              ? `${s.name} (oculto)`
              : s.name,
      ),
    };
  });
}

/** Reexport para consumidores que ya usan appPathsMatch. */
export { appPathsMatch, normalizeAppPath };
