/**
 * Paletas de charts alineadas al tema Raptor (azul metálico / turquesa).
 */

/** Light: turquesa / acero / acentos legibles */
export const CHART_SERIES_LIGHT = [
  "#0F766E",
  "#1A7A9A",
  "#0284C7",
  "#0D9488",
  "#6366F1",
  "#0891B2",
  "#059669",
  "#7C3AED",
];

/** Dark: tonos claros sobre fondo acero */
export const CHART_SERIES_DARK = [
  "#2DD4BF",
  "#38BDF8",
  "#67E8F9",
  "#5EEAD4",
  "#A5B4FC",
  "#22D3EE",
  "#34D399",
  "#C4B5FD",
];

/** Neon: cian / aqua eléctricos */
export const CHART_SERIES_NEON = [
  "#22D3EE",
  "#2DD4BF",
  "#67E8F9",
  "#5EEAD4",
  "#818CF8",
  "#38BDF8",
  "#4ADE80",
  "#A78BFA",
];

/**
 * @param {'light' | 'dark' | 'neon'} mode
 * @returns {{ series: string[] }}
 */
export function getChartsPalette(mode = "light") {
  const series =
    mode === "neon"
      ? CHART_SERIES_NEON
      : mode === "dark"
        ? CHART_SERIES_DARK
        : CHART_SERIES_LIGHT;
  return { series: [...series] };
}

/** Resuelve la lista de colores de series desde el theme (con fallback por modo). */
export function getChartSeriesColors(theme) {
  const s = theme.palette?.charts?.series;
  if (Array.isArray(s) && s.length > 0) return s;
  const custom = theme.palette?.customMode;
  const mode =
    custom === "neon" ? "neon" : theme.palette?.mode === "dark" ? "dark" : "light";
  return getChartsPalette(mode).series;
}

/**
 * Índices sugeridos dentro de `series` para semántica repetida en dashboards.
 */
export const CHART_SEMANTIC_INDEX = {
  primary: 0,
  money: 1,
  secondary: 2,
  accent: 3,
  extra: 4,
  warm: 5,
  positive: 6,
  alert: 7,
};
