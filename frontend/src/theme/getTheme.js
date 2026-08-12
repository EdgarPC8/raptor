// Tema Raptor — azul metálico / turquesa (claro, oscuro, neón).
// createTheme solo vía muiRuntime (evita error createTheme_default en Vite)
import { createTheme, alpha } from "./muiRuntime.js";
import { getChartsPalette } from "./chartPalette";
import {
  contrastTextFor,
  DEFAULT_THEME_PALETTE,
  getModeSlice,
  normalizeThemePalette,
} from "./themePalette.js";

/** Marca Raptor: azul acero → turquesa (también en DEFAULT_THEME_PALETTE) */
const brand = {
  steel: "#1A6B8A",
  aqua: "#14B8A6",
  cyan: "#22D3EE",
  ice: "#E8F7FA",
  mist: DEFAULT_THEME_PALETTE.light.backgroundDefault,
  deep: DEFAULT_THEME_PALETTE.dark.backgroundDefault,
  slate: DEFAULT_THEME_PALETTE.dark.backgroundPaper,
};

const commonColors = {
  red: "#F07167",
  green: "#2DD4A8",
  orange: "#FF9F43",
  blue: "#3B9DD9",
  purple: "#8B7CF6",
  yellow: "#F5C542",
  pink: "#F472B6",
  teal: brand.aqua,
  gold: "#C9D6E3",
  lavender: "#C4B5FD",
  cyan: brand.cyan,
  gray: "#E2E8F0",
  ...brand,
};

/**
 * Tipografía más compacta en todo el sistema (~12–14% más pequeña).
 * htmlFontSize 14 (default 16) reduce rem; fontSize 13 ajusta la escala MUI.
 */
function compactTypography(overrides = {}) {
  const { fontFamily, button: buttonOverride, ...rest } = overrides;
  return {
    htmlFontSize: 14,
    fontSize: 13,
    fontFamily:
      fontFamily ||
      `'Poppins', 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`,
    h1: { fontWeight: 800, letterSpacing: "-0.02em", fontSize: "2rem" },
    h2: { fontWeight: 800, letterSpacing: "-0.02em", fontSize: "1.6rem" },
    h3: { fontWeight: 700, fontSize: "1.35rem" },
    h4: { fontWeight: 700, fontSize: "1.15rem" },
    h5: { fontWeight: 700, fontSize: "1.02rem" },
    h6: { fontWeight: 700, fontSize: "0.95rem" },
    subtitle1: { fontSize: "0.9rem" },
    subtitle2: { fontSize: "0.8rem" },
    body1: { fontSize: "0.875rem", lineHeight: 1.45 },
    body2: { fontSize: "0.8rem", lineHeight: 1.4 },
    caption: { fontSize: "0.7rem" },
    overline: { fontSize: "0.65rem" },
    button: {
      fontSize: "0.8rem",
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: "0.02em",
      ...buttonOverride,
    },
    ...rest,
  };
}

/** Densidad un poco mayor en controles comunes. */
function compactComponents(extra = {}) {
  return {
    MuiButton: {
      styleOverrides: {
        root: { minHeight: 32, paddingTop: 4, paddingBottom: 4 },
        sizeLarge: { minHeight: 38, fontSize: "0.85rem" },
        sizeSmall: { minHeight: 26, fontSize: "0.75rem" },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { padding: 6 },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: { minHeight: "52px !important" },
        dense: { minHeight: "44px !important" },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { padding: "8px 10px", fontSize: "0.8rem" },
        sizeSmall: { padding: "4px 8px" },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { minHeight: 36, paddingTop: 4, paddingBottom: 4 },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { fontSize: "0.875rem" },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: { fontSize: "0.85rem" },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { height: 24, fontSize: "0.72rem" },
        sizeSmall: { height: 20, fontSize: "0.68rem" },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontSize: "1.05rem", paddingTop: 12, paddingBottom: 12 },
      },
    },
    ...extra,
  };
}

/** Util: variantes compartidas que reaccionan a customMode */
function componentVariants() {
  return {
    MuiPaper: {
      variants: [
        {
          props: { variant: "panel" },
          style: ({ theme }) => {
            const isNeon = theme.palette.customMode === "neon";
            const isLight = theme.palette.mode === "light";
            return {
              backgroundColor: isLight
                ? alpha("#FFFFFF", 0.82)
                : alpha(theme.palette.background.paper, 0.92),
              borderRadius: 12,
              border: isNeon
                ? `1px solid ${alpha(theme.palette.primary.main, 0.4)}`
                : `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.12 : 0.2)}`,
              boxShadow: isNeon
                ? `0 0 20px ${alpha(theme.palette.primary.main, 0.22)}`
                : isLight
                  ? `0 8px 28px ${alpha("#0B4F6C", 0.08)}`
                  : `0 8px 24px ${alpha("#000", 0.35)}`,
              backdropFilter: isLight || isNeon ? "blur(8px)" : "none",
            };
          },
        },
        {
          props: { variant: "panel-cream" },
          style: ({ theme }) => ({
            background: alpha(theme.palette.primary.light, 0.12),
            backdropFilter: "blur(8px)",
            borderRadius: 16,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
            boxShadow: `0 6px 24px ${alpha(theme.palette.primary.dark, 0.08)}`,
          }),
        },
        {
          props: { variant: "panel-warm" },
          style: ({ theme }) => ({
            background: `linear-gradient(160deg, ${alpha(
              theme.palette.primary.light,
              0.22,
            )} 0%, ${alpha(theme.palette.secondary.main, 0.14)} 100%)`,
            borderRadius: 16,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            boxShadow: `0 8px 28px ${alpha(theme.palette.primary.main, 0.12)}`,
          }),
        },
        {
          props: { variant: "panel-ghost" },
          style: ({ theme }) => ({
            background: "transparent",
            borderRadius: 16,
            border: `1px dashed ${alpha(theme.palette.text.primary, 0.2)}`,
            boxShadow: "none",
          }),
        },
        {
          props: { variant: "panel-outline" },
          style: ({ theme }) => ({
            background: alpha(theme.palette.background.paper, 0.45),
            backdropFilter: "blur(4px)",
            borderRadius: 16,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
            boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.06)} inset, 0 10px 24px ${alpha(
              theme.palette.primary.dark,
              0.1,
            )}`,
          }),
        },
      ],
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", borderRadius: 12, fontWeight: 600 },
      },
      variants: [
        {
          props: { variant: "ctrl" },
          style: ({ theme }) => {
            const isNeon = theme.palette.customMode === "neon";
            const isLight = theme.palette.mode === "light";
            if (isNeon) {
              return {
                borderRadius: 14,
                fontWeight: 700,
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: theme.palette.primary.contrastText,
                boxShadow: `0 0 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                "&:hover": {
                  filter: "brightness(1.08)",
                  boxShadow: `0 0 22px ${alpha(theme.palette.secondary.main, 0.45)}`,
                },
              };
            }
            if (isLight) {
              return {
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: theme.palette.primary.contrastText,
                "&:hover": {
                  background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                },
              };
            }
            return {
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${alpha(
                theme.palette.secondary.main,
                0.95,
              )})`,
              color: theme.palette.primary.contrastText,
              "&:hover": {
                filter: "brightness(1.08)",
              },
            };
          },
        },
      ],
    },
  };
}

export function getTheme(mode = "light", brandPalette = null) {
  const palette = normalizeThemePalette(brandPalette || DEFAULT_THEME_PALETTE);
  const slice = getModeSlice(palette, mode === "neon" ? "neon" : mode === "dark" ? "dark" : "light");
  const primaryContrast = contrastTextFor(slice.primary, "#FFFFFF", "#0F2A36");
  const secondaryContrast = contrastTextFor(slice.secondary, "#FFFFFF", "#042F2E");

  // ============= RAPTOR DARK — acero profundo =============
  if (mode === "dark") {
    return createTheme({
      palette: {
        mode: "dark",
        customMode: "dark",
        background: {
          default: slice.backgroundDefault,
          paper: slice.backgroundPaper,
        },
        primary: {
          light: slice.primaryLight,
          main: slice.primary,
          dark: slice.primaryDark,
          contrastText: primaryContrast,
        },
        secondary: {
          light: slice.secondaryLight,
          main: slice.secondary,
          dark: slice.secondaryDark,
          contrastText: secondaryContrast,
        },
        text: {
          primary: slice.textPrimary,
          secondary: slice.textSecondary,
        },
        divider: alpha(slice.primaryLight || slice.primary, 0.14),
        colors: commonColors,
        charts: getChartsPalette("dark"),
        brandPalette: palette,
      },
      shape: { borderRadius: 14 },
      typography: compactTypography({
        fontFamily: `'Poppins', 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`,
      }),
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            html: { fontSize: "14px" },
            body: {
              background: `
                radial-gradient(900px 480px at 12% -8%, ${alpha(slice.primary, 0.22)}, transparent 58%),
                radial-gradient(780px 420px at 100% 0%, ${alpha(slice.secondary, 0.14)}, transparent 55%),
                linear-gradient(180deg, ${alpha(slice.backgroundPaper, 0.95)} 0%, ${slice.backgroundDefault} 55%, #08141A 100%)`,
              backgroundAttachment: "fixed",
            },
          },
        },
        ...compactComponents(),
        ...componentVariants(),
      },
    });
  }

  // ============= RAPTOR NEON — cian eléctrico =============
  if (mode === "neon") {
    return createTheme({
      palette: {
        mode: "dark",
        customMode: "neon",
        background: {
          default: slice.backgroundDefault,
          paper: slice.backgroundPaper,
        },
        primary: {
          light: slice.primaryLight,
          main: slice.primary,
          dark: slice.primaryDark,
          contrastText: primaryContrast,
        },
        secondary: {
          light: slice.secondaryLight,
          main: slice.secondary,
          dark: slice.secondaryDark,
          contrastText: secondaryContrast,
        },
        text: {
          primary: slice.textPrimary,
          secondary: slice.textSecondary,
        },
        divider: alpha(slice.primary, 0.28),
        colors: {
          ...commonColors,
          neonCyan: slice.primary,
          neonTeal: slice.secondary,
          neonAqua: slice.primaryLight,
        },
        charts: getChartsPalette("neon"),
        brandPalette: palette,
      },
      shape: { borderRadius: 18 },
      shadows: [
        "none",
        `0 0 14px ${alpha(slice.primary, 0.28)}`,
        `0 0 18px ${alpha(slice.secondary, 0.24)}`,
        ...Array(22).fill(`0 0 20px ${alpha(slice.primary, 0.16)}`),
      ],
      typography: compactTypography({
        fontFamily: `'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`,
      }),
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            html: { fontSize: "14px" },
            body: {
              background: `
                radial-gradient(1100px 560px at 18% -12%, ${alpha(slice.primary, 0.18)}, transparent 58%),
                radial-gradient(900px 480px at 108% 8%, ${alpha(slice.secondary, 0.14)}, transparent 55%),
                radial-gradient(600px 320px at 50% 110%, ${alpha(slice.primaryDark, 0.12)}, transparent 50%),
                ${slice.backgroundDefault}`,
              backgroundAttachment: "fixed",
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: `linear-gradient(180deg, ${alpha(slice.primary, 0.05)}, rgba(255,255,255,0))`,
              border: `1px solid ${alpha(slice.primary, 0.28)}`,
              boxShadow: `0 0 24px ${alpha(slice.primary, 0.16)}`,
            },
          },
        },
        ...compactComponents(),
        ...componentVariants(),
        MuiChip: {
          styleOverrides: {
            root: {
              height: 24,
              fontSize: "0.72rem",
              border: `1px solid ${alpha(slice.secondary, 0.4)}`,
              boxShadow: `0 0 12px ${alpha(slice.primary, 0.28)}`,
            },
            sizeSmall: { height: 20, fontSize: "0.68rem" },
          },
        },
      },
    });
  }

  // ============= RAPTOR LIGHT — hielo / metal suave =============
  return createTheme({
    palette: {
      mode: "light",
      customMode: "light",
      background: {
        default: slice.backgroundDefault,
        paper: slice.backgroundPaper,
      },
      primary: {
        light: slice.primaryLight,
        main: slice.primary,
        dark: slice.primaryDark,
        contrastText: primaryContrast,
      },
      secondary: {
        light: slice.secondaryLight,
        main: slice.secondary,
        dark: slice.secondaryDark,
        contrastText: secondaryContrast,
      },
      text: {
        primary: slice.textPrimary,
        secondary: slice.textSecondary,
      },
      divider: alpha(slice.textPrimary, 0.1),
      colors: commonColors,
      charts: getChartsPalette("light"),
      brandPalette: palette,
    },
    shape: { borderRadius: 12 },
    typography: compactTypography({
      fontFamily: `'Poppins', 'Roboto', sans-serif`,
      button: { textTransform: "none", fontWeight: 600 },
    }),
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { fontSize: "14px" },
          body: {
            background: `
              radial-gradient(900px 460px at 15% -10%, ${alpha(slice.primary, 0.16)}, transparent 58%),
              radial-gradient(820px 420px at 105% 5%, ${alpha(slice.secondary, 0.14)}, transparent 55%),
              linear-gradient(165deg, ${slice.backgroundDefault} 0%, ${alpha(slice.primaryLight, 0.35)} 42%, ${alpha(slice.secondary, 0.18)} 100%)`,
            backgroundAttachment: "fixed",
          },
        },
      },
      ...compactComponents(),
      ...componentVariants(),
    },
  });
}
