import { useEffect } from "react";
import { findMatchingCommand } from "../utils/keyboardShortcuts.js";

/**
 * Escucha atajos globales en un scope (p. ej. Caja).
 * @param {Record<string, { keys: string, enabled: boolean }>} shortcutsMap
 * @param {Record<string, () => void>} handlers  commandId → acción
 * @param {{ enabled?: boolean }} options
 */
export function useKeyboardShortcuts(shortcutsMap, handlers, { enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return undefined;
    const commandIds = Object.keys(handlers || {});
    if (!commandIds.length) return undefined;

    const onKeyDown = (event) => {
      if (event.defaultPrevented) return;
      const match = findMatchingCommand(shortcutsMap, event, commandIds);
      if (!match) return;
      const fn = handlers[match];
      if (typeof fn !== "function") return;
      event.preventDefault();
      event.stopPropagation();
      fn();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [shortcutsMap, handlers, enabled]);
}
