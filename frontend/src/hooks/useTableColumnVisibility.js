/**
 * Visibilidad de columnas TablePro.
 * - Keys en TABLE_COLUMN_STORAGE.DB_KEYS → app_settings.tableColumnVisibility (BD).
 * - Resto → localStorage solamente.
 */
import { useCallback, useMemo, useState } from "react";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import { updateAppSettings } from "../api/appSettingsRequest.js";
import {
  catalogRequiredIds,
  filterVisibleColumns,
  isDbPersistedTableKey,
  normalizeTableColumnVisibility,
  readLocalTableHidden,
  writeLocalTableHidden,
} from "../utils/tableColumnVisibility.js";

export function useTableColumnVisibility(tableKey, columns) {
  const { activeApp, reload } = useAppSettings();
  const dbMode = isDbPersistedTableKey(tableKey);
  const requiredIds = useMemo(() => catalogRequiredIds(tableKey), [tableKey]);

  const dbHidden = useMemo(() => {
    if (!dbMode) return [];
    const vis = normalizeTableColumnVisibility(activeApp?.tableColumnVisibility);
    return vis[tableKey]?.hidden || [];
  }, [dbMode, activeApp?.tableColumnVisibility, tableKey]);

  const [localHidden, setLocalHidden] = useState(() =>
    dbMode ? [] : readLocalTableHidden(tableKey),
  );

  const hiddenIds = dbMode ? dbHidden : localHidden;

  const visibleColumns = useMemo(
    () => filterVisibleColumns(columns, hiddenIds, requiredIds),
    [columns, hiddenIds, requiredIds],
  );

  const setHiddenIds = useCallback(
    async (nextHidden) => {
      const cleaned = [...new Set((nextHidden || []).map(String))].filter(
        (id) => !requiredIds.has(id),
      );
      if (dbMode) {
        const current = normalizeTableColumnVisibility(activeApp?.tableColumnVisibility);
        const next = {
          ...current,
          [tableKey]: { hidden: cleaned },
        };
        await updateAppSettings({ tableColumnVisibility: next });
        await reload?.();
        return;
      }
      writeLocalTableHidden(tableKey, cleaned);
      setLocalHidden(cleaned);
    },
    [dbMode, activeApp?.tableColumnVisibility, tableKey, requiredIds, reload],
  );

  const toggleColumn = useCallback(
    async (columnId, visible) => {
      const id = String(columnId);
      if (requiredIds.has(id)) return;
      const set = new Set(hiddenIds);
      if (visible) set.delete(id);
      else set.add(id);
      await setHiddenIds([...set]);
    },
    [hiddenIds, requiredIds, setHiddenIds],
  );

  return {
    visibleColumns,
    hiddenIds,
    requiredIds,
    dbMode,
    setHiddenIds,
    toggleColumn,
  };
}
