import {
  RAPTOR_LOGO_URL,
} from "./raptorBrand.js";

const envAppName = String(import.meta.env.VITE_APP_NAME || "").trim();
export const APP_ID = String(import.meta.env.VITE_APP_ID || "eddeli").trim().toLowerCase();

export const SHELL_ONLY =
  import.meta.env.VITE_SHELL_ONLY === "true" ||
  import.meta.env.VITE_API_MODE === "none";

/** Fallback Raptor hasta configurar la instalación (Store y plantilla). */
export const RAPTOR_UNCONFIGURED_FALLBACK = {
  name: "Raptor",
  alias: "Raptor",
  version: "1.0.0",
  description:
    "Aplicación sin configurar. Definí nombre, logo y opciones en Sistema → Configuración.",
  author: "Raptor",
  logoPath: null,
  iconPath: null,
  phone: "",
  socials: {
    whatsapp: "",
    facebook: "",
    instagram: "",
    tiktok: "",
    email: "",
  },
  mediaFolderPrefix: "sistema",
  cajaQuickCategoryMatch: "",
  walkInCustomerLabel: "Consumidor Final",
  timezone: "America/Guayaquil",
  showPublicCatalog: false,
  showPublicStoresPropia: false,
  showPublicStoresVitrina: false,
};

/** Fallback EdDeli solo cuando el modo de Vite es eddeli. */
export const EDDELI_FALLBACK = {
  name: "EdDeli - Panadería, Pastelería y Repostería",
  alias: "EdDeli",
  version: "1.0.0",
  description: "Sistema de Gestión de Negocios",
  author: "Raptor",
  logoPath: "sistema/logos/logo.jpeg",
  iconPath: null,
  phone: "",
  socials: {
    whatsapp: "",
    facebook: "",
    instagram: "",
    tiktok: "",
    email: "",
  },
  mediaFolderPrefix: "sistema",
  cajaQuickCategoryMatch: "panader",
  walkInCustomerLabel: "Consumidor Final",
  timezone: "America/Guayaquil",
  showPublicCatalog: true,
  showPublicStoresPropia: true,
  showPublicStoresVitrina: true,
};

export const APP_SETTINGS_FALLBACK =
  SHELL_ONLY || APP_ID !== "eddeli"
    ? {
        ...RAPTOR_UNCONFIGURED_FALLBACK,
        name: envAppName && envAppName !== "Raptor" ? envAppName : "Raptor",
        alias: envAppName && envAppName !== "Raptor" ? envAppName : "Raptor",
        // Mientras no hay config real, la marca visible es Raptor (logo/wordmark).
      }
    : EDDELI_FALLBACK;

/**
 * Apps que no son EdDeli no deben heredar branding EdDeli del clon.
 * También aplica si faltan nombre/logo (aún no configurada).
 */
export function looksUnconfigured(settings) {
  if (SHELL_ONLY) return true;
  if (!settings) return true;

  const alias = String(settings.alias || "").trim();
  const name = String(settings.name || "").trim();
  const author = String(settings.author || "").trim();
  const logoPath = settings.logoPath != null ? String(settings.logoPath).trim() : "";

  if (APP_ID !== "eddeli") {
    if (/eddeli/i.test(alias) || /eddeli/i.test(name) || /panader/i.test(name)) return true;
    if (/^softed$/i.test(author)) return true;
    if (!alias || !name) return true;
    if (!logoPath) return true;
    // Plantilla Raptor aún sin personalizar
    if (/^raptor$/i.test(alias) && /^raptor$/i.test(name) && !logoPath) return true;
    return false;
  }

  // EdDeli: sin logo se considera aún no personalizada (marca Raptor offline).
  if (!logoPath) return true;
  return false;
}

export function resolveSettingsForUi(settings, { offline = false } = {}) {
  if (offline || looksUnconfigured(settings)) {
    return {
      ...RAPTOR_UNCONFIGURED_FALLBACK,
      ...((APP_ID !== "eddeli" && envAppName)
        ? {
            // Mantener el nombre de app del env solo como hint; marca visual = Raptor
            description: RAPTOR_UNCONFIGURED_FALLBACK.description,
          }
        : {}),
      _unconfigured: true,
    };
  }
  return { ...settings, _unconfigured: false };
}

export { RAPTOR_LOGO_URL };

/** @deprecated Usar useAppSettings() o getActiveAppSettings() */
export const activeApp = {
  logo: "./logo.jpeg",
  name: APP_SETTINGS_FALLBACK.name,
  alias: APP_SETTINGS_FALLBACK.alias,
  version: APP_SETTINGS_FALLBACK.version,
  description: APP_SETTINGS_FALLBACK.description,
  author: APP_SETTINGS_FALLBACK.author,
  phone: APP_SETTINGS_FALLBACK.phone,
  socials: APP_SETTINGS_FALLBACK.socials,
  year: new Date().getFullYear(),
  background: "#F0F9FB",
};

export const activeAppId = APP_ID;
