/**
 * Contexto único de tema Raptor (modo claro/oscuro/neón + ThemeProvider MUI).
 *
 * Debe ir DENTRO de AppSettingsProvider para leer themePalette.
 * Caché local: arranca con paleta cacheada / default sin esperar la API.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ThemeProvider, CssBaseline } from "./muiRuntime.js";
import { getTheme } from "./getTheme.js";
import { APP_ID } from "../config/appInfo.js";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import {
  DEFAULT_THEME_PALETTE,
  normalizeThemePalette,
  readThemePaletteCache,
  writeThemePaletteCache,
} from "./themePalette.js";

const STORAGE_KEY = `${APP_ID}-theme-mode`;

const ThemeModeContext = createContext({
  mode: "light",
  setMode: () => {},
  toggle: () => {},
  brandPalette: DEFAULT_THEME_PALETTE,
  setPalettePreview: () => {},
  clearPalettePreview: () => {},
});

/** Modo visual: light | dark | neon */
export function useThemeMode() {
  return useContext(ThemeModeContext);
}

function initialPalette() {
  return normalizeThemePalette(readThemePaletteCache() || DEFAULT_THEME_PALETTE);
}

/**
 * Proveedor raíz: persiste modo, construye theme con createTheme (muiRuntime) y envuelve la app.
 */
export function ThemeModeProvider({ children }) {
  const { settings } = useAppSettings();
  const [mode, setMode] = useState(() => localStorage.getItem(STORAGE_KEY) || "light");
  const [brandPalette, setBrandPalette] = useState(initialPalette);
  const [previewPalette, setPreviewPalette] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // Sync desde settings (BD) → estado + caché
  useEffect(() => {
    if (!settings?.themePalette) return;
    const next = normalizeThemePalette(settings.themePalette);
    setBrandPalette(next);
    writeThemePaletteCache(next);
  }, [settings?.themePalette]);

  const setPalettePreview = useCallback((palette) => {
    setPreviewPalette(normalizeThemePalette(palette));
  }, []);

  const clearPalettePreview = useCallback(() => {
    setPreviewPalette(null);
  }, []);

  const activePalette = previewPalette || brandPalette;
  const theme = useMemo(() => getTheme(mode, activePalette), [mode, activePalette]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggle: () => setMode((m) => (m === "light" ? "dark" : "light")),
      brandPalette: activePalette,
      setPalettePreview,
      clearPalettePreview,
    }),
    [mode, activePalette, setPalettePreview, clearPalettePreview],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
