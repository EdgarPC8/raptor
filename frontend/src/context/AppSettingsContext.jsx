import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchAppSettings } from "../api/appSettingsRequest.js";
import {
  APP_SETTINGS_FALLBACK,
  looksUnconfigured,
  resolveSettingsForUi,
} from "../config/appInfo.js";
import { buildImageUrl } from "../api/axios.js";
import { SHELL_ONLY } from "../config/deployEnv.js";
import { RAPTOR_LOGO_URL } from "../config/raptorBrand.js";

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
    // Sin configurar / plantilla: sin catálogo ni locales públicos
    showPublicCatalog: unconfigured
      ? false
      : resolved.showPublicCatalog !== false,
    showPublicStoresPropia: unconfigured
      ? false
      : resolved.showPublicStoresPropia !== false,
    showPublicStoresVitrina: unconfigured
      ? false
      : resolved.showPublicStoresVitrina !== false,
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
      },
    }),
    [settings, activeApp, loading, offline],
  );

  return (
    <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
  );
}
