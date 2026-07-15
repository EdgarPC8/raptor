import { useCallback, useEffect, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import { hasCompletedTour } from "../tours/tourStorage.js";
import { runTour } from "../tours/runTour.js";

/**
 * Auto-inicia el tour la primera vez; expone startTour() para el icono de ayuda.
 * El popover sigue el tema MUI activo (claro / oscuro / neón).
 */
export function usePageTour({ tourId, getSteps, enabled = true, autoDelayMs = 650, onDestroyed } = {}) {
  const theme = useTheme();
  const runningRef = useRef(false);
  const instanceRef = useRef(null);
  const onDestroyedRef = useRef(onDestroyed);
  onDestroyedRef.current = onDestroyed;

  const startTour = useCallback(
    ({ force = false } = {}) => {
      if (!enabled || runningRef.current) return;
      if (!force && hasCompletedTour(tourId)) return;

      const steps = typeof getSteps === "function" ? getSteps() : getSteps;
      runningRef.current = true;
      instanceRef.current = runTour({
        tourId,
        steps,
        theme,
        onDestroyed: () => {
          runningRef.current = false;
          instanceRef.current = null;
          onDestroyedRef.current?.();
        },
      });
      if (!instanceRef.current) {
        runningRef.current = false;
      }
    },
    [enabled, getSteps, theme, tourId],
  );

  const restartTour = useCallback(() => {
    startTour({ force: true });
  }, [startTour]);

  useEffect(() => {
    if (!enabled) return undefined;
    if (hasCompletedTour(tourId)) return undefined;

    const timer = window.setTimeout(() => {
      startTour({ force: false });
    }, autoDelayMs);

    return () => {
      window.clearTimeout(timer);
      try {
        instanceRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      runningRef.current = false;
      instanceRef.current = null;
    };
  }, [autoDelayMs, enabled, startTour, tourId]);

  return { startTour: restartTour, hasCompleted: hasCompletedTour(tourId) };
}
