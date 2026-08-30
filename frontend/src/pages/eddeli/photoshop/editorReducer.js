/**
 * editorReducer.js
 *
 * Reducer del estado del editor. Acciones principales:
 * - SET_SELECTED, SET_ACTION, SET_DRAG_ID: UI (selección, arrastre).
 * - UPDATE_LAYER, UPDATE_LAYER_PROPS, TOGGLE_VISIBLE, TOGGLE_LOCKED: capas.
 * - ADD_LAYER, DELETE_LAYER, REORDER_BY_DROP, UPDATE_GROUP_POS: estructura.
 * - SET_DOC, SET_DOC_DATA_*: documento y datos para bind.
 */
import { ensureUniqueId, makeDefaultLayer } from "./editorActions";
import {
  pushHistoryState,
  applyUndo,
  applyRedo,
} from "./editorHistory.js";

export const initialState = (template) => ({
  doc: {
    ...template,
    layers: (template.layers || []).map((l) => ({
      ...l,
      name: l.name ?? l.id,
      visible: l.visible ?? true,
      locked: l.locked ?? false,
    })),
  },
  selected: null, // { kind:"layer"|"group", id }
  action: null, // move/resize runtime
  ops: [],
  dragId: null,
  historyPast: [],
  historyFuture: [],
});

const pushOp = (state, op) => ({
  ...state,
  ops: [...state.ops, { at: new Date().toISOString(), ...op }],
});

// ✅ Normaliza doc al cargar desde backend/import
const normalizeDoc = (doc) => ({
  ...doc,
  layers: (doc?.layers || []).map((l) => ({
    ...l,
    name: l.name ?? l.id,
    visible: l.visible ?? true,
    locked: l.locked ?? false,
  })),
});

export function editorReducer(state, action) {
  switch (action.type) {
    case "SET_SELECTED":
      return { ...state, selected: action.selected };

    case "SET_ACTION":
      return { ...state, action: action.action };

    case "SET_DRAG_ID":
      return { ...state, dragId: action.dragId };

    /** Mover un grupo: actualiza x, y del grupo por dx/dy (ej. desde CanvasStage con Shift+mouse) */
    case "UPDATE_GROUP_POS": {
      const { groupId, dx, dy } = action;
      if (!groupId) return state;
      return {
        ...state,
        doc: {
          ...state.doc,
          groups: (state.doc.groups || []).map((g) =>
            g.id === groupId
              ? { ...g, x: (g.x || 0) + dx, y: (g.y || 0) + dy }
              : g
          ),
        },
      };
    }

    case "UPDATE_LAYER":
      return pushOp(
        {
          ...state,
          doc: {
            ...state.doc,
            layers: state.doc.layers.map((l) =>
              l.id === action.layerId ? { ...l, ...(action.patch || {}) } : l
            ),
          },
        },
        { type: "update-layer", layerId: action.layerId, patch: action.patch }
      );

    case "UPDATE_LAYER_PROPS":
      return pushOp(
        {
          ...state,
          doc: {
            ...state.doc,
            layers: state.doc.layers.map((l) =>
              l.id === action.layerId
                ? {
                    ...l,
                    props: { ...(l.props || {}), ...(action.propsPatch || {}) },
                  }
                : l
            ),
          },
        },
        {
          type: "update-layer-props",
          layerId: action.layerId,
          propsPatch: action.propsPatch,
        }
      );

    case "TOGGLE_VISIBLE": {
      const l = state.doc.layers.find((x) => x.id === action.layerId);
      if (!l) return state;
      return {
        ...state,
        doc: {
          ...state.doc,
          layers: state.doc.layers.map((x) =>
            x.id === action.layerId
              ? { ...x, visible: !(x.visible !== false) }
              : x
          ),
        },
      };
    }

    case "TOGGLE_LOCKED": {
      const l = state.doc.layers.find((x) => x.id === action.layerId);
      if (!l) return state;
      return {
        ...state,
        doc: {
          ...state.doc,
          layers: state.doc.layers.map((x) =>
            x.id === action.layerId ? { ...x, locked: !x.locked } : x
          ),
        },
      };
    }

    case "ADD_LAYER": {
      const { layerType } = action;
      const selected = state.selected;

      const selectedLayer =
        selected?.kind === "layer"
          ? state.doc.layers.find((l) => l.id === selected.id)
          : null;

      const selectedGroup =
        selected?.kind === "group"
          ? state.doc.groups.find((g) => g.id === selected.id)
          : null;

      const groupId =
        selectedGroup?.id || selectedLayer?.groupId || state.doc.groups?.[0]?.id;
      if (!groupId) return state;

      const used = new Set(state.doc.layers.map((l) => l.id));
      let layer = makeDefaultLayer({ type: layerType, groupId });
      layer.id = ensureUniqueId(layer.id, used);

      const maxZ = Math.max(...state.doc.layers.map((l) => l.zIndex || 0), 0);
      layer.zIndex = maxZ + 1;

      layer.x = Math.round(state.doc.canvas.width * 0.1);
      layer.y = Math.round(state.doc.canvas.height * 0.1);

      if (action.propsPatch && typeof action.propsPatch === "object") {
        layer.props = { ...(layer.props || {}), ...action.propsPatch };
      }
      if (action.layerPatch && typeof action.layerPatch === "object") {
        layer = { ...layer, ...action.layerPatch };
      }
      if (action.clearBind) {
        layer.bind = null;
      }
      if (action.layerName) {
        layer.name = action.layerName;
      }

      return pushOp(
        {
          ...state,
          doc: { ...state.doc, layers: [...state.doc.layers, layer] },
          selected: { kind: "layer", id: layer.id },
        },
        { type: "add-layer", layerType, groupId }
      );
    }

    case "ADD_BACKGROUND_LAYER": {
      const groupId = state.doc.groups?.[0]?.id;
      if (!groupId || !state.doc?.canvas) return state;

      const used = new Set(state.doc.layers.map((l) => l.id));
      let layer = makeDefaultLayer({ type: "shape", groupId });
      layer.id = ensureUniqueId("background", used);
      layer.name = "Fondo";
      layer.x = 0;
      layer.y = 0;
      layer.w = state.doc.canvas.width;
      layer.h = state.doc.canvas.height;
      layer.zIndex = 0;
      layer.props = { fill: "#FFFFFF", borderRadius: 0 };

      return pushOp(
        {
          ...state,
          doc: { ...state.doc, layers: [...state.doc.layers, layer] },
          selected: { kind: "layer", id: layer.id },
        },
        { type: "add-background-layer", groupId }
      );
    }

    case "DELETE_SELECTED_LAYER": {
      const selected = state.selected;
      if (!selected || selected.kind !== "layer") return state;
      const l = state.doc.layers.find((x) => x.id === selected.id);
      if (!l || l.locked) return state;

      return pushOp(
        {
          ...state,
          doc: {
            ...state.doc,
            layers: state.doc.layers.filter((x) => x.id !== selected.id),
          },
          selected: null,
        },
        { type: "delete-layer", layerId: selected.id }
      );
    }

    case "DUPLICATE_SELECTED_LAYER": {
      const selected = state.selected;
      if (!selected || selected.kind !== "layer") return state;
      const src = state.doc.layers.find((x) => x.id === selected.id);
      if (!src) return state;

      const used = new Set(state.doc.layers.map((l) => l.id));
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = ensureUniqueId(`${src.id}_copy`, used);
      copy.name = `${src.name || src.id} copy`;
      copy.x = src.x + 40;
      copy.y = src.y + 40;
      copy.zIndex = (src.zIndex || 0) + 1;
      copy.locked = false;
      copy.visible = true;

      return pushOp(
        {
          ...state,
          doc: { ...state.doc, layers: [...state.doc.layers, copy] },
          selected: { kind: "layer", id: copy.id },
        },
        { type: "duplicate-layer", layerId: src.id }
      );
    }

    case "REORDER_BY_DROP": {
      const { fromId, toId } = action;
      if (!fromId || !toId || fromId === toId) return state;

      const ordered = [...state.doc.layers].sort(
        (a, b) => (b.zIndex || 0) - (a.zIndex || 0)
      );
      const fromIdx = ordered.findIndex((x) => x.id === fromId);
      const toIdx = ordered.findIndex((x) => x.id === toId);
      if (fromIdx < 0 || toIdx < 0) return state;

      const item = ordered.splice(fromIdx, 1)[0];
      ordered.splice(toIdx, 0, item);

      const next = ordered
        .slice()
        .reverse()
        .map((l, i) => ({ ...l, zIndex: (i + 1) * 10 }));

      return pushOp(
        { ...state, doc: { ...state.doc, layers: next } },
        { type: "reorder-layers", fromId, toId }
      );
    }

    // ✅ Cargar/Setear documento (desde backend/import)
    case "LOAD_TEMPLATE": {
      const doc = normalizeDoc(action.doc);
      return {
        ...state,
        doc,
        selected: null,
        action: null,
        ops: [],
        dragId: null,
        historyPast: [],
        historyFuture: [],
      };
    }

    case "SET_DOC": {
      const doc = normalizeDoc(action.doc);
      return {
        ...state,
        doc,
        selected: null,
        action: null,
        ops: [],
        dragId: null,
        historyPast: [],
        historyFuture: [],
      };
    }

    case "_PUSH_HISTORY":
      return pushHistoryState(state, action.snapshot);

    case "UNDO":
      return applyUndo(state);

    case "REDO":
      return applyRedo(state);
    

    case "SET_DOC_DATA_PRODUCT": {
      return {
        ...state,
        doc: {
          ...state.doc,
          data: {
            ...(state.doc.data || {}),
            product: action.product || null,
          },
        },
      };
    }
    case "SET_DOC_META": {
      return {
        ...state,
        doc: {
          ...state.doc,
          meta: { ...(state.doc?.meta || {}), ...(action.patch || {}) },
        },
      };
    }

    case "SET_DOC_DATA_PATCH": {
      const prevDoc = state.doc || {};
      const prevData = prevDoc.data || {};
      const patch = action.patch || {};
    
      return {
        ...state,
        doc: {
          ...prevDoc,
          data: {
            ...prevData, // ✅ mantiene lo anterior
            ...patch,    // ✅ mete badge, displayName, imageUrl, etc.
          },
        },
      };
    }
    
    case "SET_DOC_DATA_CATALOG": {
      return {
        ...state,
        doc: {
          ...state.doc,
          data: {
            ...(state.doc.data || {}),
            catalog: action.catalog || null,
          },
        },
      };
    }

    case "DELETE_LAYER": {
      const layerId = action.layerId;
      const target = state.doc.layers.find((l) => l.id === layerId);
      if (!target || target.locked) return state;

      return pushOp(
        {
          ...state,
          doc: {
            ...state.doc,
            layers: state.doc.layers.filter((l) => l.id !== layerId),
          },
          selected:
            state.selected?.kind === "layer" && state.selected.id === layerId
              ? null
              : state.selected,
        },
        { type: "delete-layer", layerId }
      );
    }

    

    default:
      return state;
  }
}
