import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchAppSettings } from "../api/appSettingsRequest.js";
import {
  APP_SETTINGS_FALLBACK,
  looksUnconfigured,
  resolveSettingsForUi,
} from "../config/appInfo.js";
import { buildImageUrl, socket } from "../api/axios.js";
import { SHELL_ONLY } from "../config/deployEnv.js";
import { RAPTOR_LOGO_URL } from "../config/raptorBrand.js";
import {
  normalizeMoneyDisplayDecimals,
  normalizeMoneyRoundingMode,
} from "../utils/moneyFormat.js";
import {
  DEFAULT_RECEIPT_DETAIL_SETTINGS,
  normalizeReceiptDetailSettings,
} from "../utils/receiptDetailFormat.js";
import {
  DEFAULT_THEME_PALETTE,
  normalizeThemePalette,
  writeThemePaletteCache,
} from "../theme/themePalette.js";

const AppSettingsContext = createContext(null);

function toActiveApp(settings, { offline = false } = {}) {
  const resolved = resolveSettingsForUi(settings, { offline });
  const unconfigured = Boolean(resolved._unconfigured || offline || SHELL_ONLY);
  const prefix =
    resolved.mediaFolderPrefix ||
    APP_SETTINGS_FALLBACK.mediaFolderPrefix ||
    "sistema";
  const logoPath = resolved.logoPath;
  const iconPath = resolved.iconPath;

  let logoUrl = null;
  if (unconfigured || !logoPath) {
    logoUrl = RAPTOR_LOGO_URL;
  } else if (String(logoPath).startsWith("http")) {
    logoUrl = logoPath;
  } else {
    logoUrl = buildImageUrl(logoPath);
  }

  let iconUrl = null;
  if (iconPath) {
    if (String(iconPath).startsWith("http")) iconUrl = iconPath;
    else iconUrl = buildImageUrl(iconPath);
  }
  // Favicon: icono si existe; si no, logo.
  const faviconUrl = iconUrl || logoUrl;

  return {
    name: resolved.name,
    alias: resolved.alias,
    version: resolved.version,
    description: resolved.description,
    author: resolved.author || "Raptor",
    phone: resolved.phone || "",
    socials: resolved.socials || APP_SETTINGS_FALLBACK.socials,
    logoPath: unconfigured ? "brand/raptor-logo.svg" : logoPath,
    logoUrl,
    iconPath: unconfigured ? null : iconPath || null,
    iconUrl: unconfigured ? null : iconUrl,
    faviconUrl: unconfigured ? RAPTOR_LOGO_URL : faviconUrl,
    brandWordmark: unconfigured,
    offlineBrand: unconfigured,
    unconfigured,
    mediaFolderPrefix: prefix,
    logoFolder: resolved.logoFolder || `${prefix}/logos`,
    iconFolder: resolved.iconFolder || `${prefix}/icons`,
    qrFolder: resolved.qrFolder || `${prefix}/qr`,
    cajaQuickCategoryMatch: resolved.cajaQuickCategoryMatch || "",
    walkInCustomerLabel: resolved.walkInCustomerLabel || "Consumidor Final",
    timezone: resolved.timezone || APP_SETTINGS_FALLBACK.timezone || "America/Guayaquil",
    // Flags operativos: siempre desde settings/API. No anularlos por branding
    // “sin logo” ( Troya Market tenía ordersAllowDeliverStockAdjust=1 pero caja lo veía off ).
    showPublicCatalog: unconfigured
      ? false
      : resolved.showPublicCatalog !== false,
    showPublicStoresPropia: unconfigured
      ? false
      : resolved.showPublicStoresPropia !== false,
    showPublicStoresVitrina: unconfigured
      ? false
      : resolved.showPublicStoresVitrina !== false,
    multiStockEnabled: SHELL_ONLY
      ? false
      : Boolean(settings?.multiStockEnabled ?? resolved.multiStockEnabled),
    showProductCostInSelect: SHELL_ONLY
      ? false
      : Boolean(settings?.showProductCostInSelect ?? resolved.showProductCostInSelect),
    moneyDisplayDecimals: unconfigured
      ? 2
      : normalizeMoneyDisplayDecimals(
          settings?.moneyDisplayDecimals ?? resolved.moneyDisplayDecimals,
          2,
        ),
    moneyRoundingMode: unconfigured
      ? "up"
      : normalizeMoneyRoundingMode(
          settings?.moneyRoundingMode ?? resolved.moneyRoundingMode,
          "up",
        ),
    ordersAllowDeliverStockAdjust: SHELL_ONLY
      ? false
      : Boolean(
          settings?.ordersAllowDeliverStockAdjust ??
            resolved.ordersAllowDeliverStockAdjust,
        ),
    financeAllowAdminCorrections: SHELL_ONLY
      ? false
      : Boolean(
          settings?.financeAllowAdminCorrections ??
            resolved.financeAllowAdminCorrections !== false,
        ),
    suggestOpenPackOnPosShortage: SHELL_ONLY
      ? false
      : Boolean(
          settings?.suggestOpenPackOnPosShortage ??
            resolved.suggestOpenPackOnPosShortage,
        ),
    cajaAllowCreateProductFromSelect: SHELL_ONLY
      ? false
      : Boolean(
          settings?.cajaAllowCreateProductFromSelect ??
            resolved.cajaAllowCreateProductFromSelect,
        ),
    cajaAllowCreateProductFromScan: SHELL_ONLY
      ? false
      : Boolean(
          settings?.cajaAllowCreateProductFromScan ??
            resolved.cajaAllowCreateProductFromScan,
        ),
    cajaAllowEditProductFromCart: SHELL_ONLY
      ? false
      : Boolean(
          settings?.cajaAllowEditProductFromCart ??
            resolved.cajaAllowEditProductFromCart,
        ),
    cajaSuggestUpdateProductPrice: SHELL_ONLY
      ? false
      : Boolean(
          settings?.cajaSuggestUpdateProductPrice ??
            resolved.cajaSuggestUpdateProductPrice,
        ),
    notificationsToastGreeting: SHELL_ONLY
      ? false
      : Boolean(
          settings?.notificationsToastGreeting ??
            resolved.notificationsToastGreeting,
        ),
    notificationsToastStock: SHELL_ONLY
      ? false
      : Boolean(
          settings?.notificationsToastStock ?? resolved.notificationsToastStock,
        ),
    notificationsToastCredit: SHELL_ONLY
      ? false
      : Boolean(
          settings?.notificationsToastCredit ?? resolved.notificationsToastCredit,
        ),
    notificationsToastExpiry: SHELL_ONLY
      ? false
      : Boolean(
          settings?.notificationsToastExpiry ?? resolved.notificationsToastExpiry,
        ),
    notificationsCreditEnabled: SHELL_ONLY
      ? true
      : settings?.notificationsCreditEnabled !== false &&
        resolved.notificationsCreditEnabled !== false,
    notificationsExpiryEnabled: SHELL_ONLY
      ? false
      : Boolean(
          settings?.notificationsExpiryEnabled ??
            resolved.notificationsExpiryEnabled,
        ),
    receiptDetailSettings: unconfigured
      ? { ...DEFAULT_RECEIPT_DETAIL_SETTINGS }
      : normalizeReceiptDetailSettings(
          settings?.receiptDetailSettings ?? resolved.receiptDetailSettings,
        ),
    themePalette: unconfigured
      ? normalizeThemePalette(DEFAULT_THEME_PALETTE)
      : normalizeThemePalette(settings?.themePalette ?? resolved.themePalette),
    year: new Date().getFullYear(),
    background: "#F0F9FB",
  };
}

function applyBrandingToDocument(activeApp) {
  if (activeApp?.name) document.title = activeApp.alias || activeApp.name;
  const fav = activeApp?.faviconUrl || activeApp?.iconUrl || activeApp?.logoUrl;
  if (!fav) return;
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  const isSvg = String(fav).includes(".svg") || activeApp.brandWordmark;
  link.type = isSvg ? "image/svg+xml" : "image/png";
  link.href = fav;
}

let settingsStore = toActiveApp(APP_SETTINGS_FALLBACK, {
  offline: SHELL_ONLY || looksUnconfigured(APP_SETTINGS_FALLBACK),
});
export function getActiveAppSettings() {
  return settingsStore;
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) return { settings: settingsStore, loading: false, reload: async () => {} };
  return ctx;
}

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(APP_SETTINGS_FALLBACK);
  const [offline, setOffline] = useState(SHELL_ONLY);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (SHELL_ONLY) {
      setOffline(true);
      settingsStore = toActiveApp(APP_SETTINGS_FALLBACK, { offline: true });
      applyBrandingToDocument(settingsStore);
      setSettings(APP_SETTINGS_FALLBACK);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAppSettings();
      const unconfigured = looksUnconfigured(data);
      setOffline(unconfigured);
      setSettings(data);
      settingsStore = toActiveApp(data, { offline: unconfigured });
      applyBrandingToDocument(settingsStore);
      if (data?.themePalette) {
        writeThemePaletteCache(data.themePalette);
      }
    } catch {
      setOffline(true);
      settingsStore = toActiveApp(APP_SETTINGS_FALLBACK, { offline: true });
      applyBrandingToDocument(settingsStore);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (SHELL_ONLY) return undefined;
    const onEntitlement = () => {
      void load();
    };
    socket.on("entitlementUpdated", onEntitlement);
    return () => {
      socket.off("entitlementUpdated", onEntitlement);
    };
  }, []);

  const activeApp = useMemo(
    () => toActiveApp(settings, { offline }),
    [settings, offline],
  );

  useEffect(() => {
    applyBrandingToDocument(activeApp);
  }, [activeApp]);

  const value = useMemo(
    () => ({
      settings,
      activeApp,
      loading,
      reload: load,
      setSettings: (next) => {
        setSettings(next);
        const unconfigured = looksUnconfigured(next);
        setOffline(unconfigured);
        settingsStore = toActiveApp(next, { offline: unconfigured });
        if (next?.themePalette) {
          writeThemePaletteCache(next.themePalette);
        }
      },
    }),
    [settings, activeApp, loading, offline],
  );

  return (
    <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
  );
}
