/** Historial deshacer / rehacer del editor. */

export const MAX_HISTORY = 50;

const UI_ONLY = new Set([
  "SET_SELECTED",
  "SET_DRAG_ID",
  "SET_DOC_DATA_PRODUCT",
  "SET_DOC_DATA_PATCH",
  "SET_DOC_DATA_CATALOG",
  "_PUSH_HISTORY",
  "UNDO",
  "REDO",
]);

const MUTATING = new Set([
  "UPDATE_LAYER",
  "UPDATE_LAYER_PROPS",
  "UPDATE_GROUP_POS",
  "ADD_LAYER",
  "ADD_BACKGROUND_LAYER",
  "DELETE_SELECTED_LAYER",
  "DELETE_LAYER",
  "DUPLICATE_SELECTED_LAYER",
  "REORDER_BY_DROP",
  "TOGGLE_VISIBLE",
  "TOGGLE_LOCKED",
  "SET_DOC_META",
]);

export function makeSnapshot(state) {
  return {
    doc: structuredClone(state.doc),
    selected: state.selected ? { ...state.selected } : null,
  };
}

/** ¿Guardar snapshot antes de aplicar esta acción? */
export function shouldRecordHistory(action, state) {
  if (!action?.type || UI_ONLY.has(action.type)) return false;
  if (action.type === "SET_DOC" || action.type === "LOAD_TEMPLATE") return false;

  // Inicio de arrastre: un paso de undo para todo el movimiento/redimensionado.
  if (action.type === "SET_ACTION") {
    return Boolean(action.action && !state.action);
  }

  if (action.type === "UPDATE_LAYER" && state.action) return false;
  if (action.type === "UPDATE_GROUP_POS" && state.action?.type === "move-group") {
    return false;
  }

  return MUTATING.has(action.type);
}

export function pushHistoryState(state, snapshot) {
  const past = [...(state.historyPast || []), snapshot].slice(-MAX_HISTORY);
  return { ...state, historyPast: past, historyFuture: [] };
}

export function applyUndo(state) {
  const past = [...(state.historyPast || [])];
  if (!past.length) return state;

  const snapshot = past.pop();
  const current = makeSnapshot(state);

  return {
    ...state,
    doc: structuredClone(snapshot.doc),
    selected: snapshot.selected ? { ...snapshot.selected } : null,
    historyPast: past,
    historyFuture: [...(state.historyFuture || []), current],
    action: null,
    dragId: null,
  };
}

export function applyRedo(state) {
  const future = [...(state.historyFuture || [])];
  if (!future.length) return state;

  const snapshot = future.pop();
  const current = makeSnapshot(state);

  return {
    ...state,
    doc: structuredClone(snapshot.doc),
    selected: snapshot.selected ? { ...snapshot.selected } : null,
    historyPast: [...(state.historyPast || []), current],
    historyFuture: future,
    action: null,
    dragId: null,
  };
}
