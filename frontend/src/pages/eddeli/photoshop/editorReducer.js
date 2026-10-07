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
import {
  migrateLegacyFolderGroups,
  withFolderId,
  getLayerFolderId,
  ensureUniqueFolderName,
  ensureUniqueLayerName,
  isNameTakenByFolder,
  isNameTakenByLayer,
  makeFolderId,
  getFolderAncestorIds,
} from "./layerFolders.js";

export const initialState = (template) => ({
  doc: {
    ...template,
    layers: (template.layers || []).map((l) => ({
      ...l,
      name: l.name ?? l.id,
      visible: l.visible ?? true,
      locked: l.locked ?? false,
    })),
    folders: Array.isArray(template.folders)
      ? template.folders
      : Array.isArray(template.meta?.folders)
        ? template.meta.folders
        : [],
  },
  selected: null, // { kind:"layer"|"group", id, ids?: string[] }
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

/** IDs de capas en la selección actual (multi o single). */
export function getSelectedLayerIds(selected) {
  if (!selected || selected.kind !== "layer") return [];
  if (Array.isArray(selected.ids) && selected.ids.length) {
    return selected.ids.filter(Boolean);
  }
  return selected.id ? [selected.id] : [];
}

const selectSingleLayer = (layerId) =>
  layerId ? { kind: "layer", id: layerId, ids: [layerId] } : null;

// ✅ Normaliza doc al cargar desde backend/import
const normalizeDoc = (doc) => {
  const base = {
    ...doc,
    layers: (doc?.layers || []).map((l) => ({
      ...l,
      name: l.name ?? l.id,
      visible: l.visible ?? true,
      locked: l.locked ?? false,
    })),
    groups: Array.isArray(doc?.groups) ? doc.groups : [],
    folders: Array.isArray(doc?.folders)
      ? doc.folders
      : Array.isArray(doc?.meta?.folders)
        ? doc.meta.folders
        : [],
  };
  return migrateLegacyFolderGroups(base);
};

export function editorReducer(state, action) {
  switch (action.type) {
    case "SET_SELECTED": {
      const sel = action.selected;
      if (!sel) return { ...state, selected: null };
      if (sel.kind === "layer" && sel.id) {
        const ids =
          Array.isArray(sel.ids) && sel.ids.length
            ? [...new Set(sel.ids.filter(Boolean))]
            : [sel.id];
        const primary = ids.includes(sel.id) ? sel.id : ids[ids.length - 1];
        return {
          ...state,
          selected: { kind: "layer", id: primary, ids },
        };
      }
      return { ...state, selected: sel };
    }

    /** Ctrl/Cmd+clic: añade o quita una capa de la selección múltiple. */
    case "TOGGLE_LAYER_IN_SELECTION": {
      const layerId = action.layerId;
      if (!layerId) return state;
      const layer = state.doc.layers.find((l) => l.id === layerId);
      if (!layer || layer.locked) return state;

      const current = getSelectedLayerIds(state.selected);
      let nextIds;
      if (current.includes(layerId)) {
        nextIds = current.filter((id) => id !== layerId);
      } else {
        nextIds = [...current, layerId];
      }

      if (!nextIds.length) return { ...state, selected: null };
      return {
        ...state,
        selected: {
          kind: "layer",
          id: layerId,
          ids: nextIds,
        },
      };
    }

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

    case "UPDATE_LAYER": {
      let patch = { ...(action.patch || {}) };
      if (patch.name != null) {
        const desired = String(patch.name).trim();
        if (!desired) return state;
        if (
          isNameTakenByLayer(desired, state.doc.layers, action.layerId) ||
          isNameTakenByFolder(desired, state.doc.folders || [])
        ) {
          patch = {
            ...patch,
            name: ensureUniqueLayerName(
              desired,
              state.doc.layers,
              action.layerId
            ),
          };
        }
      }
      return pushOp(
        {
          ...state,
          doc: {
            ...state.doc,
            layers: state.doc.layers.map((l) =>
              l.id === action.layerId ? { ...l, ...patch } : l
            ),
          },
        },
        { type: "update-layer", layerId: action.layerId, patch }
      );
    }

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

    case "SET_LAYERS_VISIBLE": {
      const ids = new Set(
        (Array.isArray(action.layerIds) ? action.layerIds : []).filter(Boolean)
      );
      if (!ids.size) return state;
      const visible = action.visible !== false;
      return {
        ...state,
        doc: {
          ...state.doc,
          layers: state.doc.layers.map((x) =>
            ids.has(x.id) ? { ...x, visible } : x
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

      if (!action.layerPatch || typeof action.layerPatch !== "object") {
        if (layer.type === "image" || layer.type === "svg") {
          layer.w = state.doc.canvas.width;
          layer.h = state.doc.canvas.height;
          layer.x = 0;
          layer.y = 0;
        }
        if (layer.type === "shape") {
          const halfW = Math.max(240, Math.round(state.doc.canvas.width * 0.28));
          const halfH = Math.max(140, Math.round(state.doc.canvas.height * 0.18));
          layer.w = halfW;
          layer.h = halfH;
          layer.x = Math.round((state.doc.canvas.width - halfW) / 2);
          layer.y = Math.round((state.doc.canvas.height - halfH) / 2);
        }
      }

      if (action.propsPatch && typeof action.propsPatch === "object") {
        layer.props = { ...(layer.props || {}), ...action.propsPatch };
      }
      if (action.layerPatch && typeof action.layerPatch === "object") {
        layer = { ...layer, ...action.layerPatch };
      }
      if (action.clearBind) {
        layer.bind = null;
      }
      // Forzar carpeta explícita (null = panel principal / suelta)
      if (
        action.layerPatch &&
        Object.prototype.hasOwnProperty.call(action.layerPatch, "folderId")
      ) {
        const props = { ...(layer.props || {}) };
        if (action.layerPatch.folderId) props.folderId = action.layerPatch.folderId;
        else delete props.folderId;
        layer = { ...layer, folderId: action.layerPatch.folderId || null, props };
      }
      if (action.layerName) {
        layer.name = action.layerName;
      }

      // Colocar junto a una capa (arriba o abajo en el stack / panel)
      let nextLayers = state.doc.layers;
      const nearId = action.placeNearLayerId;
      const place = action.place === "below" ? "below" : "above";
      if (nearId) {
        const near = nextLayers.find((l) => l.id === nearId);
        if (near) {
          const srcZ = Number(near.zIndex) || 0;
          if (place === "above") {
            const insertZ = srcZ + 1;
            nextLayers = nextLayers.map((l) =>
              (Number(l.zIndex) || 0) >= insertZ
                ? { ...l, zIndex: (Number(l.zIndex) || 0) + 1 }
                : l
            );
            layer.zIndex = insertZ;
          } else {
            // abajo de la seleccionada: empuja la seleccionada y las de arriba
            nextLayers = nextLayers.map((l) =>
              (Number(l.zIndex) || 0) >= srcZ
                ? { ...l, zIndex: (Number(l.zIndex) || 0) + 1 }
                : l
            );
            layer.zIndex = srcZ;
          }
        }
      }

      return pushOp(
        {
          ...state,
          doc: { ...state.doc, layers: [...nextLayers, layer] },
          selected: selectSingleLayer(layer.id),
        },
        { type: "add-layer", layerType, groupId, placeNearLayerId: nearId, place }
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
          selected: selectSingleLayer(layer.id),
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
      copy.name = `${src.name || src.id} (copia)`;
      copy.x = src.x + 40;
      copy.y = src.y + 40;
      copy.zIndex = (src.zIndex || 0) + 1;
      copy.locked = false;
      copy.visible = true;

      return pushOp(
        {
          ...state,
          doc: { ...state.doc, layers: [...state.doc.layers, copy] },
          selected: selectSingleLayer(copy.id),
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

      const prevIds = getSelectedLayerIds(state.selected).filter(
        (id) => id !== layerId
      );

      return pushOp(
        {
          ...state,
          doc: {
            ...state.doc,
            layers: state.doc.layers.filter((l) => l.id !== layerId),
          },
          selected: prevIds.length
            ? {
                kind: "layer",
                id: prevIds[prevIds.length - 1],
                ids: prevIds,
              }
            : null,
        },
        { type: "delete-layer", layerId }
      );
    }

    /**
     * Ctrl+G: crea una carpeta UI (no toca groups espaciales del canvas)
     * y mete las capas seleccionadas. Si todas están en la misma carpeta,
     * la nueva queda como subcarpeta de esa.
     */
    case "GROUP_SELECTED_LAYERS": {
      const ids = getSelectedLayerIds(state.selected);
      if (ids.length < 1) return state;

      const layers = state.doc.layers || [];
      const folders = state.doc.folders || [];
      const selectedLayers = ids
        .map((id) => layers.find((l) => l.id === id))
        .filter((l) => l && !l.locked);
      if (!selectedLayers.length) return state;

      const parentCandidates = [
        ...new Set(selectedLayers.map((l) => getLayerFolderId(l))),
      ];
      const parentId =
        parentCandidates.length === 1 ? parentCandidates[0] : null;

      const usedIds = new Set(folders.map((f) => f.id));
      const folderId = makeFolderId(usedIds);
      const name = ensureUniqueFolderName(`Carpeta ${folders.length + 1}`, folders);
      const nextFolders = [
        ...folders,
        { id: folderId, name, parentId },
      ];

      const idSet = new Set(selectedLayers.map((l) => l.id));
      const nextLayers = layers.map((l) =>
        idSet.has(l.id) ? withFolderId(l, folderId) : l
      );

      return pushOp(
        {
          ...state,
          doc: {
            ...state.doc,
            folders: nextFolders,
            layers: nextLayers,
            meta: { ...(state.doc.meta || {}), folders: nextFolders },
          },
          selected: {
            kind: "layer",
            id: selectedLayers[selectedLayers.length - 1].id,
            ids: selectedLayers.map((l) => l.id),
          },
        },
        { type: "group-layers", folderId, layerIds: [...idSet] }
      );
    }

    /** Ctrl+Shift+G: saca capas de su carpeta (a raíz o al padre). */
    case "UNGROUP_SELECTED_LAYERS": {
      const ids = getSelectedLayerIds(state.selected);
      if (!ids.length) return state;

      const layers = state.doc.layers || [];
      const folders = state.doc.folders || [];
      const byId = new Map(folders.map((f) => [f.id, f]));
      const idSet = new Set(ids);

      const nextLayers = layers.map((l) => {
        if (!idSet.has(l.id) || l.locked) return l;
        const fid = getLayerFolderId(l);
        if (!fid) return l;
        const parent = byId.get(fid)?.parentId || null;
        return withFolderId(l, parent);
      });

      // Carpetas vacías sin subcarpetas → eliminar
      const usedFolderIds = new Set(
        nextLayers.map((l) => getLayerFolderId(l)).filter(Boolean)
      );
      const hasChildFolder = new Set(
        folders.filter((f) => f.parentId).map((f) => f.parentId)
      );
      let nextFolders = folders.filter(
        (f) => usedFolderIds.has(f.id) || hasChildFolder.has(f.id)
      );
      // segunda pasada: quitar vacías en cascada
      let changed = true;
      while (changed) {
        changed = false;
        const childOf = new Set(
          nextFolders.filter((f) => f.parentId).map((f) => f.parentId)
        );
        const used = new Set(
          nextLayers.map((l) => getLayerFolderId(l)).filter(Boolean)
        );
        const filtered = nextFolders.filter(
          (f) => used.has(f.id) || childOf.has(f.id)
        );
        if (filtered.length !== nextFolders.length) {
          nextFolders = filtered;
          changed = true;
        }
      }

      return pushOp(
        {
          ...state,
          doc: {
            ...state.doc,
            folders: nextFolders,
            layers: nextLayers,
            meta: { ...(state.doc.meta || {}), folders: nextFolders },
          },
        },
        { type: "ungroup-layers", layerIds: ids }
      );
    }

    case "RENAME_FOLDER": {
      const { folderId, name } = action;
      const display = String(name || "").trim();
      if (!folderId || !display) return state;
      const folders = state.doc.folders || [];
      if (!folders.some((f) => f.id === folderId)) return state;

      if (
        isNameTakenByFolder(display, folders, folderId) ||
        isNameTakenByLayer(display, state.doc.layers)
      ) {
        // auto-suffix instead of silently failing
      }
      const unique = ensureUniqueFolderName(display, folders, folderId);
      // also avoid colliding with layer names
      let finalName = unique;
      if (isNameTakenByLayer(finalName, state.doc.layers)) {
        finalName = ensureUniqueLayerName(finalName, state.doc.layers);
        // re-check folders
        finalName = ensureUniqueFolderName(finalName, folders, folderId);
      }

      const nextFolders = folders.map((f) =>
        f.id === folderId ? { ...f, name: finalName } : f
      );

      return pushOp(
        {
          ...state,
          doc: {
            ...state.doc,
            folders: nextFolders,
            meta: { ...(state.doc.meta || {}), folders: nextFolders },
          },
        },
        { type: "rename-folder", folderId, name: finalName }
      );
    }

    /** Abre/cierra carpeta en el panel (persistido en folders[].collapsed). */
    case "SET_FOLDER_COLLAPSED": {
      const { folderId } = action;
      if (!folderId) return state;
      const folders = state.doc.folders || [];
      if (!folders.some((f) => f.id === folderId)) return state;
      const nextCollapsed = !!action.collapsed;
      const nextFolders = folders.map((f) => {
        if (f.id !== folderId) return f;
        if (nextCollapsed) return { ...f, collapsed: true };
        const { collapsed: _omit, ...rest } = f;
        return rest;
      });
      return {
        ...state,
        doc: {
          ...state.doc,
          folders: nextFolders,
          meta: { ...(state.doc.meta || {}), folders: nextFolders },
        },
      };
    }

    /**
     * Mueve capas y/o carpetas a otra carpeta (o null = raíz).
     * action: { layerIds?, folderIds?, targetFolderId }
     */
    case "MOVE_TO_FOLDER": {
      const targetFolderId = action.targetFolderId ?? null;
      const layerIds = action.layerIds || [];
      const folderIds = action.folderIds || [];
      const folders = state.doc.folders || [];
      const layers = state.doc.layers || [];

      if (targetFolderId) {
        const exists = folders.some((f) => f.id === targetFolderId);
        if (!exists) return state;
      }

      const layerSet = new Set(layerIds);
      const nextLayers = layers.map((l) =>
        layerSet.has(l.id) && !l.locked
          ? withFolderId(l, targetFolderId)
          : l
      );

      let nextFolders = folders;
      if (folderIds.length) {
        const moveSet = new Set(folderIds);
        // no meter una carpeta dentro de sí misma o de un descendiente
        for (const fid of moveSet) {
          if (fid === targetFolderId) return state;
          if (
            targetFolderId &&
            getFolderAncestorIds(targetFolderId, folders).includes(fid)
          ) {
            return state;
          }
        }
        nextFolders = folders.map((f) =>
          moveSet.has(f.id) ? { ...f, parentId: targetFolderId } : f
        );
      }

      return pushOp(
        {
          ...state,
          doc: {
            ...state.doc,
            layers: nextLayers,
            folders: nextFolders,
            meta: { ...(state.doc.meta || {}), folders: nextFolders },
          },
        },
        {
          type: "move-to-folder",
          layerIds,
          folderIds,
          targetFolderId,
        }
      );
    }

    /**
     * Sustituye la capa destino con un SVG fusionado y elimina el resto.
     * action: { keepLayerId, removeLayerIds, src, name?, layerPatch? }
     */
    case "MERGE_SVG_LAYERS": {
      const { keepLayerId, removeLayerIds = [], src, name, layerPatch } = action;
      if (!keepLayerId || !src) return state;

      const removeSet = new Set(removeLayerIds.filter((id) => id !== keepLayerId));
      const layers = state.doc.layers || [];
      const keep = layers.find((l) => l.id === keepLayerId);
      if (!keep || keep.locked) return state;

      const mergeName = name
        ? ensureUniqueLayerName(
            name,
            layers.filter((l) => !removeSet.has(l.id)),
            keepLayerId
          )
        : keep.name;

      const geo =
        layerPatch && typeof layerPatch === "object"
          ? {
              ...(Number.isFinite(layerPatch.x) ? { x: layerPatch.x } : {}),
              ...(Number.isFinite(layerPatch.y) ? { y: layerPatch.y } : {}),
              ...(Number.isFinite(layerPatch.w) ? { w: layerPatch.w } : {}),
              ...(Number.isFinite(layerPatch.h) ? { h: layerPatch.h } : {}),
              ...(layerPatch.groupId ? { groupId: layerPatch.groupId } : {}),
            }
          : {};

      const nextLayers = layers
        .filter((l) => !removeSet.has(l.id))
        .map((l) => {
          if (l.id !== keepLayerId) return l;
          return {
            ...l,
            ...geo,
            type: "svg",
            name: mergeName,
            props: {
              ...(l.props || {}),
              src,
              // contain: el viewBox unido se mapea al marco unión sin deformar coords SVG
              fit: "contain",
              cropNorm: null,
              folderId: getLayerFolderId(l) || undefined,
            },
            folderId: getLayerFolderId(l),
          };
        });

      return pushOp(
        {
          ...state,
          doc: { ...state.doc, layers: nextLayers },
          selected: selectSingleLayer(keepLayerId),
        },
        {
          type: "merge-svg-layers",
          keepLayerId,
          removeLayerIds: [...removeSet],
          src,
        }
      );
    }

    case "DUPLICATE_FOLDER": {
      const { folderId } = action;
      if (!folderId) return state;

      const folders = Array.isArray(state.doc.folders) ? state.doc.folders : [];
      const layers = Array.isArray(state.doc.layers) ? state.doc.layers : [];
      const source = folders.find((f) => f.id === folderId);
      if (!source) return state;

      const subtreeIds = new Set();
      const visit = (id) => {
        const current = folders.find((f) => f.id === id);
        if (!current) return;
        subtreeIds.add(current.id);
        for (const child of folders.filter((f) => f.parentId === current.id)) {
          visit(child.id);
        }
      };
      visit(folderId);

      const idMap = new Map();
      const newFolders = [];
      const usedFolderIds = new Set(folders.map((f) => f.id));

      const cloneFolderTree = (originalFolderId) => {
        const originalFolder = folders.find((f) => f.id === originalFolderId);
        if (!originalFolder) return;

        const newFolderId = makeFolderId(usedFolderIds);
        usedFolderIds.add(newFolderId);
        const parentId = originalFolder.parentId && subtreeIds.has(originalFolder.parentId)
          ? idMap.get(originalFolder.parentId) || originalFolder.parentId
          : originalFolder.parentId || null;
        const baseName = `${String(originalFolder.name || "Carpeta").trim() || "Carpeta"} (copia)`;
        const uniqueName = ensureUniqueFolderName(baseName, [...folders, ...newFolders]);

        idMap.set(originalFolderId, newFolderId);
        newFolders.push({
          ...originalFolder,
          id: newFolderId,
          name: uniqueName,
          parentId,
          collapsed: originalFolder.collapsed ? true : undefined,
        });

        for (const child of folders.filter((f) => f.parentId === originalFolderId)) {
          cloneFolderTree(child.id);
        }
      };

      cloneFolderTree(folderId);

      const usedLayerIds = new Set(layers.map((l) => l.id));
      const copiedLayers = [];
      for (const layer of layers) {
        const layerFolderId = getLayerFolderId(layer);
        if (!layerFolderId || !subtreeIds.has(layerFolderId)) continue;

        const cloned = JSON.parse(JSON.stringify(layer));
        const nextId = ensureUniqueId(`${layer.id}_copy`, usedLayerIds);
        usedLayerIds.add(nextId);

        const nextFolderId = idMap.get(layerFolderId) || null;
        const copiedName = ensureUniqueLayerName(
          `${cloned.name || "Capa"} (copia)`,
          [...layers, ...copiedLayers]
        );

        const props = { ...(cloned.props || {}) };
        if (nextFolderId) props.folderId = nextFolderId;
        else delete props.folderId;

        copiedLayers.push({
          ...cloned,
          id: nextId,
          name: copiedName,
          folderId: nextFolderId,
          props,
          x: (Number(cloned.x) || 0) + 24,
          y: (Number(cloned.y) || 0) + 24,
          zIndex: (Number(cloned.zIndex) || 0) + 1,
          locked: false,
          visible: true,
        });
      }

      const nextFolders = [...folders, ...newFolders];
      const nextLayers = [...layers, ...copiedLayers];

      return pushOp(
        {
          ...state,
          doc: {
            ...state.doc,
            folders: nextFolders,
            layers: nextLayers,
            meta: { ...(state.doc.meta || {}), folders: nextFolders },
          },
        },
        { type: "duplicate-folder", folderId, clonedFolderId: idMap.get(folderId) }
      );
    }

    default:
      return state;
  }
}
