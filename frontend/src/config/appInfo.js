import {
  BRAND_NAME,
  RAPTOR_LOGO_URL,
} from "./raptorBrand.js";

const envAppName = String(import.meta.env.VITE_APP_NAME || "").trim();
export const APP_ID = String(import.meta.env.VITE_APP_ID || "eddeli").trim().toLowerCase();

export const SHELL_ONLY =
  import.meta.env.VITE_SHELL_ONLY === "true" ||
  import.meta.env.VITE_API_MODE === "none";

/** ¿Nombre de marca de plataforma (sin personalizar)? */
function isPlatformBrandName(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return false;
  if (v === "raptor") return true;
  if (v === String(BRAND_NAME).trim().toLowerCase()) return true;
  return /^raptor[\s-]*solutions?$/.test(v);
}

/** Fallback de marca hasta configurar la instalación (Store y plantilla). */
export const RAPTOR_UNCONFIGURED_FALLBACK = {
  name: BRAND_NAME,
  alias: BRAND_NAME,
  version: "1.0.0",
  description:
    "Aplicación sin configurar. Definí nombre, logo y opciones en Sistema → Configuración.",
  author: BRAND_NAME,
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
  multiStockEnabled: false,
  principalStoreId: null,
  showProductCostInSelect: false,
  moneyDisplayDecimals: 2,
  moneyRoundingMode: "up",
  ordersAllowDeliverStockAdjust: true,
  financeAllowAdminCorrections: true,
  suggestOpenPackOnPosShortage: false,
  productionOpenPackaging: false,
  cajaAllowCreateProductFromSelect: false,
  cajaAllowCreateProductFromScan: false,
  cajaAllowEditProductFromCart: false,
  cajaSuggestUpdateProductPrice: false,
  cajaAllowPercentDiscount: false,
  notificationsToastGreeting: false,
  notificationsToastStock: false,
  notificationsToastCredit: false,
  notificationsToastExpiry: false,
  notificationsCreditEnabled: true,
  notificationsExpiryEnabled: false,
  toastPosition: "bottom-right",
  receiptDetailSettings: {
    productNameCase: "as_stored",
    showLineNumber: false,
    showBarcode: false,
    showUnit: false,
    maxNameLength: 0,
    trimSpaces: true,
    collapseSpaces: true,
    applyToFactura: true,
    applyToNotaVenta: true,
    showTaxRegime: true,
    showAccountingRequired: true,
    showSpecialTaxpayer: true,
    defaultPrintFormat: "a4",
  },
  tableColumnVisibility: {
    comprobantesPos: { hidden: [] },
    ventas: { hidden: [] },
    compras: { hidden: [] },
    locales: { hidden: [] },
    prestamos: { hidden: [] },
  },
  themePalette: null,
};

/** Fallback EdDeli solo cuando el modo de Vite es eddeli. */
export const EDDELI_FALLBACK = {
  name: "EdDeli - Panadería, Pastelería y Repostería",
  alias: "EdDeli",
  version: "1.0.0",
  description: "Sistema de Gestión de Negocios",
  author: BRAND_NAME,
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
  multiStockEnabled: true,
  principalStoreId: null,
  showProductCostInSelect: false,
  moneyDisplayDecimals: 2,
  moneyRoundingMode: "up",
  ordersAllowDeliverStockAdjust: true,
  financeAllowAdminCorrections: true,
  suggestOpenPackOnPosShortage: false,
  productionOpenPackaging: false,
  cajaAllowCreateProductFromSelect: false,
  cajaAllowCreateProductFromScan: false,
  cajaAllowEditProductFromCart: false,
  cajaSuggestUpdateProductPrice: false,
  cajaAllowPercentDiscount: false,
  notificationsToastGreeting: false,
  notificationsToastStock: false,
  notificationsToastCredit: false,
  notificationsToastExpiry: false,
  notificationsCreditEnabled: true,
  notificationsExpiryEnabled: false,
  toastPosition: "bottom-right",
  receiptDetailSettings: {
    productNameCase: "as_stored",
    showLineNumber: false,
    showBarcode: false,
    showUnit: false,
    maxNameLength: 0,
    trimSpaces: true,
    collapseSpaces: true,
    applyToFactura: true,
    applyToNotaVenta: true,
    showTaxRegime: true,
    showAccountingRequired: true,
    showSpecialTaxpayer: true,
    defaultPrintFormat: "a4",
  },
  tableColumnVisibility: {
    comprobantesPos: { hidden: [] },
    ventas: { hidden: [] },
    compras: { hidden: [] },
    locales: { hidden: [] },
    prestamos: { hidden: [] },
  },
  themePalette: null,
};

export const APP_SETTINGS_FALLBACK =
  SHELL_ONLY || APP_ID !== "eddeli"
    ? {
        ...RAPTOR_UNCONFIGURED_FALLBACK,
        name:
          envAppName && !isPlatformBrandName(envAppName)
            ? envAppName
            : BRAND_NAME,
        alias:
          envAppName && !isPlatformBrandName(envAppName)
            ? envAppName
            : BRAND_NAME,
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
    // Plantilla aún sin personalizar (sigue mostrando la marca de plataforma).
    if (isPlatformBrandName(alias) && isPlatformBrandName(name)) return true;
    return false;
  }

  // EdDeli: sin logo se considera aún no personalizada (marca de plataforma).
  if (!logoPath) return true;
  return false;
}

export function resolveSettingsForUi(settings, { offline = false } = {}) {
  if (offline || looksUnconfigured(settings)) {
    return {
      ...RAPTOR_UNCONFIGURED_FALLBACK,
      ...((APP_ID !== "eddeli" && envAppName)
        ? {
            description: RAPTOR_UNCONFIGURED_FALLBACK.description,
          }
        : {}),
      _unconfigured: true,
    };
  }
  return { ...settings, _unconfigured: false };
}

export { BRAND_NAME, RAPTOR_LOGO_URL };

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
