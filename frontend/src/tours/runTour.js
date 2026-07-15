import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tourTheme.css";
import { markTourCompleted } from "./tourStorage.js";

const TOUR_CSS_VARS = [
  "--raptor-tour-bg",
  "--raptor-tour-fg",
  "--raptor-tour-muted",
  "--raptor-tour-border",
  "--raptor-tour-shadow",
  "--raptor-tour-btn-bg",
  "--raptor-tour-btn-hover",
  "--raptor-tour-primary",
  "--raptor-tour-primary-contrast",
  "--raptor-tour-font",
];

/**
 * Aplica colores del theme MUI al popover del tour (claro / oscuro / neón).
 */
export function applyTourThemeFromMui(theme) {
  if (!theme?.palette || typeof document === "undefined") return;
  const root = document.documentElement;
  const p = theme.palette;
  const isDark = p.mode === "dark";

  root.style.setProperty("--raptor-tour-bg", p.background?.paper || (isDark ? "#102A36" : "#fff"));
  root.style.setProperty("--raptor-tour-fg", p.text?.primary || (isDark ? "#E8F7FA" : "#1a1a1a"));
  root.style.setProperty("--raptor-tour-muted", p.text?.secondary || (isDark ? "#9ab0ba" : "#5f6368"));
  root.style.setProperty("--raptor-tour-border", p.divider || (isDark ? "rgba(255,255,255,0.12)" : "#e0e0e0"));
  root.style.setProperty(
    "--raptor-tour-shadow",
    isDark ? "0 10px 32px rgba(0,0,0,0.55)" : "0 8px 28px rgba(0,0,0,0.22)",
  );
  root.style.setProperty("--raptor-tour-btn-bg", isDark ? "rgba(255,255,255,0.06)" : p.background?.paper || "#fff");
  root.style.setProperty(
    "--raptor-tour-btn-hover",
    isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
  );
  root.style.setProperty("--raptor-tour-primary", p.primary?.main || "#1A6B8A");
  root.style.setProperty(
    "--raptor-tour-primary-contrast",
    p.primary?.contrastText || "#fff",
  );
  root.style.setProperty(
    "--raptor-tour-font",
    theme.typography?.fontFamily ||
      `'Poppins', 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`,
  );
}

function clearTourThemeVars() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const key of TOUR_CSS_VARS) {
    root.style.removeProperty(key);
  }
}

/**
 * Lanza un tour con overlay oscuro y foco claro (driver.js).
 * @param {{ tourId?: string, steps: any[], theme?: import('@mui/material').Theme, onDestroyed?: () => void }} opts
 */
export function runTour({ tourId, steps, theme, onDestroyed } = {}) {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  const safeSteps = steps.filter((s) => {
    if (!s?.element) return true;
    if (s.allowMissing) return true;
    try {
      return Boolean(document.querySelector(s.element));
    } catch {
      return false;
    }
  });

  if (!safeSteps.length) return null;

  if (theme) applyTourThemeFromMui(theme);

  const isDark = theme?.palette?.mode === "dark";
  const overlayColor = isDark ? "#000000" : "#0B1C24";
  const overlayOpacity = isDark ? 0.78 : 0.7;

  const instance = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    smoothScroll: true,
    overlayColor,
    overlayOpacity,
    stagePadding: 8,
    stageRadius: 10,
    popoverOffset: 12,
    popoverClass: "raptor-tour-popover",
    skipMissingElement: true,
    nextBtnText: "Siguiente",
    prevBtnText: "Atrás",
    doneBtnText: "Listo",
    progressText: "{{current}} / {{total}}",
    steps: safeSteps,
    onNextClick: (el, step, opts) => {
      if (typeof step?.onNextClick === "function") {
        step.onNextClick(el, step, opts);
        return;
      }
      opts.driver.moveNext();
    },
    onDoneClick: (el, step, opts) => {
      if (typeof step?.onNextClick === "function") {
        step.onNextClick(el, step, opts);
        return;
      }
      opts.driver.destroy();
    },
    onDestroyed: () => {
      if (tourId) markTourCompleted(tourId);
      clearTourThemeVars();
      onDestroyed?.();
    },
  });

  instance.drive();
  return instance;
}
