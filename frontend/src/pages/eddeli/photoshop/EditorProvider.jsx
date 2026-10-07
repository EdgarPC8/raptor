/**
 * EditorProvider.jsx
 *
 * Contexto global del editor de plantillas:
 * - Estado: doc (canvas, groups, layers, data), selected, action.
 * - Carga/guardado: loadTemplateById, loadDefaultFromBackend, saveTemplateDoc, importTemplateJson.
 * - Export: exportAsImage (PNG/JPG), downloadTemplateJson, copyTemplate.
 * - Capas: setLayerMeta, updateLayerProps, toggleVisible, toggleLocked, deleteLayer.
 * Usar useEditor() dentro de <EditorProvider> para acceder a todo esto.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  makeSnapshot,
  shouldRecordHistory,
} from "./editorHistory.js";
import { editorReducer, initialState, getSelectedLayerIds } from "./editorReducer";
import { resolveTemplate, resolveLayer } from "./bind/resolveTemplate";
import { toRelativeImagePath } from "./editorActions";
import { drawImageWithCrop } from "./imageCrop.js";
import {
  DEFAULT_FOREGROUND,
  DEFAULT_BACKGROUND,
  normalizeColor,
  getLayerColor,
  canLayerTakeColor,
  layerColorPropPatch,
} from "./editorColors.js";
import { sampleColorAtDocPoint, renderDocToCanvas } from "./docCanvasRender.js";
import {
  normalizeTemplateSettings,
  settingsFromRow,
  templateRequiresProduct,
  settingsToMeta,
  getCanvasSizeByFormat,
  parseSettingsJson,
} from "./templateSettings";

// ✅ Fallback local template
import { template as LOCAL_TEMPLATE } from "./template";

// ✅ Backend requests
import {
  importEditorTemplate,
  getEditorTemplateById,
  getEditorDefaultTemplate,
  updateEditorTemplateDoc,
  getEditorTemplateResolved

} from "../../../api/editorRequest";

const Ctx = createContext(null);

// ✅ FALLBACK fuerte
const BASE_TEMPLATE = LOCAL_TEMPLATE || {
  canvas: { width: 1920, height: 1080 },
  groups: [{ id: "group_main", x: 0, y: 0 }],
  layers: [],
  data: {},
  meta: { name: "BASE_TEMPLATE" },
};

const downloadDataUrl = (dataUrl, filename) => {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const copyToClipboard = async (txt) => {
  try {
    await navigator.clipboard.writeText(txt);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });

const roundRectPath = (ctx, x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
};

const drawImageFit = (ctx, im, x, y, w, h, fit = "cover", radius = 0) => {
  if (radius > 0) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, radius);
    ctx.clip();
  }

  const iw = im.width;
  const ih = im.height;

  if (fit === "fill") {
    ctx.drawImage(im, x, y, w, h);
  } else {
    const scale =
      fit === "contain" ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
    const sw = iw * scale;
    const sh = ih * scale;
    const dx = x + (w - sw) / 2;
    const dy = y + (h - sh) / 2;
    ctx.drawImage(im, dx, dy, sw, sh);
  }

  if (radius > 0) ctx.restore();
};

// ✅ Normaliza doc y preserva metas internas si vienen
const normalizeDoc = (doc) => {
  if (!doc || typeof doc !== "object") return { ...BASE_TEMPLATE, id: null };

  const { backgroundSrc: _drop, ...docRest } = doc;
  const folders = Array.isArray(doc.folders)
    ? doc.folders
    : Array.isArray(doc.meta?.folders)
      ? doc.meta.folders
      : [];

  return {
    id: doc.id ?? null,
    canvas: doc.canvas || { width: 1920, height: 1080 },
    groups: Array.isArray(doc.groups) ? doc.groups : [],
    layers: Array.isArray(doc.layers) ? doc.layers : [],
    folders,
    data: doc.data || {},
    meta: { ...(doc.meta || { name: doc.name || "Template" }), folders },
    ...docRest,
    folders,
  };
};

// ✅ soporta row DB o doc ya resuelto
const mapDbTemplateToDoc = (row) => {
  if (row?.canvas?.width && Array.isArray(row?.layers)) {
  return normalizeDoc({
      ...row,
      id:
        row?.id ??
        row?.templateId ??
        row?.template?.id ??
        row?.resolved?.templateId ??
        null,
      folders:
        row.folders ||
        row.meta?.folders ||
        parseSettingsJson(row.settingsJson).folders ||
        [],
    });
  }

  const groups = Array.isArray(row?.groups)
    ? row.groups.map((g) => ({
        id: g.key || g.id,
        name: g.name || undefined,
        x: g.x || 0,
        y: g.y || 0,
        locked: !!g.locked,
        visible: g.visible !== false,
      }))
    : [];

  const layers = Array.isArray(row?.layers)
    ? row.layers.map((l) => ({
        id: l.key || l.id,
        groupId: l.group?.key || l.groupId || null,
        type: l.type,
        x: l.x || 0,
        y: l.y || 0,
        w: l.w || 100,
        h: l.h || 100,
        zIndex: l.zIndex || 1,
        name: l.name || l.key || l.id,
        visible: l.visible !== false,
        locked: !!l.locked,
        props: l.props && !Array.isArray(l.props) ? l.props : {},
        bind: l.bind || undefined,
        folderId:
          l.folderId ||
          (l.props && !Array.isArray(l.props) ? l.props.folderId : null) ||
          null,
      }))
    : [];

  // Leer canvas desde diferentes posibles ubicaciones
  const canvasWidth = row?.canvasWidth ?? row?.canvas?.width ?? row?.resolved?.canvas?.width ?? null;
  const canvasHeight = row?.canvasHeight ?? row?.canvas?.height ?? row?.resolved?.canvas?.height ?? null;
  
  // Si no hay canvas válido, usar defaults según formato o 16:9
  let canvas = { width: 1920, height: 1080 };
  if (canvasWidth && canvasHeight && canvasWidth > 0 && canvasHeight > 0) {
    canvas = { width: canvasWidth, height: canvasHeight };
  } else if (row?.format) {
    canvas = getCanvasSizeByFormat(String(row.format));
  }

  const settingsObj = parseSettingsJson(row?.settingsJson || row?.meta || {});

  return normalizeDoc({
    id: row?.id ?? null,
    canvas,
    groups,
    layers,
    folders:
      row?.folders ||
      row?.meta?.folders ||
      settingsObj.folders ||
      [],
    meta: {
      name: row?.name || "Template",
      ...normalizeTemplateSettings(settingsObj, {
        layers,
        backgroundSrc: row?.backgroundSrc,
      }),
    },
    app: row?.app ?? null,
    format: row?.format ?? null,
    isDefault: row?.isDefault ?? false,
    isActive: row?.isActive ?? true,
    backgroundSrc: row?.backgroundSrc ?? null,
  });
};



export function EditorProvider({ children, designId = null, autoload = true }) {
  const [state, dispatchBase] = useReducer(
    editorReducer,
    BASE_TEMPLATE,
    (tpl) => initialState(normalizeDoc(tpl))
  );

  /** Estado sincronizado en cada dispatch para poder guardar en BD justo después. */
  const stateRef = useRef(state);
  stateRef.current = state;

  const dispatch = useCallback((action) => {
    const prev = stateRef.current;

    if (shouldRecordHistory(action, prev)) {
      const snapshot = makeSnapshot(prev);
      const afterHistory = editorReducer(prev, { type: "_PUSH_HISTORY", snapshot });
      stateRef.current = afterHistory;
      dispatchBase({ type: "_PUSH_HISTORY", snapshot });
    }

    stateRef.current = editorReducer(stateRef.current, action);
    dispatchBase(action);
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, [dispatch]);

  const redo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, [dispatch]);

  const canUndo = (state.historyPast || []).length > 0;
  const canRedo = (state.historyFuture || []).length > 0;

  const didLoadRef = useRef(false);
  /** Ref al contenedor del canvas (para zoom, scroll o mediciones si se necesitan después) */
  const stageRef = useRef(null);
  /** Escala lógica → pantalla (píxeles doc / píxeles CSS). Ajustada por CanvasViewport. */
  const [viewScale, setViewScale] = useState(3);
  const [activeTool, setActiveTool] = useState("select");
  const [foregroundColor, setForegroundColorState] = useState(DEFAULT_FOREGROUND);
  const [backgroundColor, setBackgroundColorState] = useState(DEFAULT_BACKGROUND);
  const [activeColorSlot, setActiveColorSlot] = useState("foreground");

  const layers = state.doc?.layers || [];
  const groups = state.doc?.groups || [];
  const selectedId = state.selected?.kind === "layer" ? state.selected.id : null;
  const selectedIds = useMemo(
    () => getSelectedLayerIds(state.selected),
    [state.selected]
  );

  const applyColorToLayer = useCallback(
    (layerId, color) => {
      const layer = (state.doc?.layers || []).find((l) => l.id === layerId);
      if (!canLayerTakeColor(layer)) return;
      const patch = layerColorPropPatch(layer.type, normalizeColor(color));
      if (patch) {
        dispatch({ type: "UPDATE_LAYER_PROPS", layerId, propsPatch: patch });
      }
    },
    [state.doc?.layers]
  );

  const setForegroundColor = useCallback(
    (color, applyToSelection = true) => {
      const normalized = normalizeColor(color);
      setForegroundColorState(normalized);
      if (applyToSelection && selectedId) applyColorToLayer(selectedId, normalized);
    },
    [applyColorToLayer, selectedId]
  );

  const setBackgroundColor = useCallback(
    (color, applyToSelection = true) => {
      const normalized = normalizeColor(color);
      setBackgroundColorState(normalized);
      if (applyToSelection && selectedId && activeColorSlot === "background") {
        applyColorToLayer(selectedId, normalized);
      }
    },
    [activeColorSlot, applyColorToLayer, selectedId]
  );

  const pickColor = useCallback(
    (color, { applyToSelection = true, slot = activeColorSlot } = {}) => {
      const normalized = normalizeColor(color);
      if (slot === "background") {
        setBackgroundColorState(normalized);
      } else {
        setForegroundColorState(normalized);
      }
      if (applyToSelection && selectedId) applyColorToLayer(selectedId, normalized);
    },
    [activeColorSlot, applyColorToLayer, selectedId]
  );

  const swapColors = useCallback(() => {
    const fg = foregroundColor;
    const bg = backgroundColor;
    setForegroundColorState(bg);
    setBackgroundColorState(fg);
  }, [foregroundColor, backgroundColor]);

  const pickColorFromCanvas = useCallback(
    async (docX, docY) => {
      const doc = state.doc;
      if (!doc?.canvas) return;
      try {
        const color = await sampleColorAtDocPoint(doc, doc.data || {}, docX, docY);
        pickColor(color, { slot: activeColorSlot });
        setActiveTool("move");
      } catch (err) {
        console.warn("pickColorFromCanvas failed", err);
      }
    },
    [activeColorSlot, pickColor, state.doc]
  );

  // Sincronizar swatch con capa seleccionada
  useEffect(() => {
    if (!selectedId) return;
    const layer = layers.find((l) => l.id === selectedId);
    const c = getLayerColor(layer);
    if (c) setForegroundColorState(normalizeColor(c));
  }, [selectedId, layers]);

  const setLayerMeta = (id, patch) =>
    dispatch({ type: "UPDATE_LAYER", layerId: id, patch });

  const updateLayerProps = (id, propsPatch) =>
    dispatch({ type: "UPDATE_LAYER_PROPS", layerId: id, propsPatch });

  const toggleVisible = (id) => dispatch({ type: "TOGGLE_VISIBLE", layerId: id });
  const toggleLocked = (id) => dispatch({ type: "TOGGLE_LOCKED", layerId: id });



  const setDoc = (doc, source = "local") => {
    dispatch({
      type: "SET_DOC",
      doc: { ...normalizeDoc(doc), __metaSource: source },
    });
  };

  const getTemplateId = () => {
    const doc = stateRef.current?.doc || state.doc || {};
    const a = doc.__metaTemplateId;
    if (a != null && a !== "") return Number(a);
    const b = doc.id;
    if (b != null && b !== "") return Number(b);
    return null;
  };

  /** Doc listo para guardar o exportar: sin backgroundSrc, sin __meta*, imágenes con ruta relativa. */
  const getDocForExport = () => {
    const doc = stateRef.current?.doc || state.doc || {};
    const { __metaSource, __metaTemplateId, backgroundSrc, ...docClean } = doc;
    Object.keys(docClean).forEach((k) => {
      if (k.startsWith("__meta")) delete docClean[k];
    });
    docClean.layers = (doc.layers || []).map((layer) => {
      const out = {
        ...layer,
        props: { ...(layer.props || {}) },
        bind: layer.bind ? { ...layer.bind } : undefined,
      };
      const fid = layer.folderId ?? layer.props?.folderId ?? null;
      if (fid) out.props.folderId = fid;
      else delete out.props.folderId;
      if (layer.type === "image" || layer.type === "svg") {
        if (out.props.src != null) out.props.src = toRelativeImagePath(out.props.src);
        if (out.bind) {
          if (out.bind.fallbackSrc != null)
            out.bind.fallbackSrc = toRelativeImagePath(out.bind.fallbackSrc);
          if (out.bind.srcPrefix != null && out.bind.srcPrefix !== "")
            out.bind.srcPrefix = "";
        }
      }
      return out;
    });
    docClean.meta = {
      ...(doc.meta || {}),
      ...settingsToMeta({
        ...(doc.meta || {}),
        folders: doc.folders || doc.meta?.folders,
      }),
      folders: doc.folders || doc.meta?.folders || [],
    };
    docClean.folders = doc.folders || doc.meta?.folders || [];
    return docClean;
  };

  const saveTemplateDoc = async () => {
    const templateId = getTemplateId();
    if (!templateId) {
      console.error("[saveTemplateDoc] state.doc:", stateRef.current?.doc);
      throw new Error("No hay templateId para guardar.");
    }
    await updateEditorTemplateDoc(templateId, getDocForExport());
    return templateId;
  };

  /** Guarda en BD tras cambios (subida imagen, recorte, etc.). No lanza si falta templateId. */
  const autoSaveTemplateDoc = useCallback(async () => {
    const templateId = getTemplateId();
    if (!templateId) {
      return { ok: false, reason: "no_template_id" };
    }
    try {
      await updateEditorTemplateDoc(templateId, getDocForExport());
      return { ok: true, templateId };
    } catch (err) {
      console.error("[autoSaveTemplateDoc]", err);
      return { ok: false, reason: "api_error", error: err };
    }
  }, []);
  const deleteLayer = async (layerId) => {
    const doc = stateRef.current?.doc || state.doc;
    const layer = (doc?.layers || []).find((l) => l.id === layerId);
    if (!layer || layer.locked) return;

    dispatch({ type: "DELETE_LAYER", layerId });

    const templateId = getTemplateId();
    if (!templateId) return;

    try {
      await autoSaveTemplateDoc();
    } catch (err) {
      console.error("Error guardando tras eliminar capa:", err);
    }
  };
  

  const loadTemplateById = async (id) => {
    if (!id) {
      throw new Error("No se proporcionó ID de plantilla");
    }
  
    const res = await getEditorTemplateResolved(id);
    const row = res?.data ?? res;
  
    if (!row || (!row.canvasWidth && !row.canvas?.width && !row.resolved?.canvas?.width)) {
      throw new Error(`Plantilla #${id} no encontrada o sin datos de canvas`);
    }
  
    // 🔑 CLAVE: usar resolved si existe
    const rawDoc = row?.resolved ?? row;
  
    // normalizar
    const doc = mapDbTemplateToDoc(rawDoc);
    const templateInfo = row?.template || {};
    const settings = settingsFromRow({
      ...templateInfo,
      resolved: rawDoc,
      layers: doc.layers,
      backgroundSrc: doc.backgroundSrc,
      meta: doc.meta,
    });

    doc.meta = {
      ...(doc.meta || {}),
      name: templateInfo.name || doc.meta?.name || "Template",
      ...settings,
    };
  
    if (!doc.canvas?.width || !doc.canvas?.height) {
      throw new Error(`Plantilla #${id} tiene canvas inválido`);
    }
  
    const templateId = Number(row?.templateId ?? row?.id ?? doc?.id ?? id);

    // Guardar rutas relativas en estado; resolveLayer/resolveTemplate resuelven al pintar/exportar.
    setDoc(
      {
        ...doc,
        meta: doc.meta,
        id: templateId,
        __metaTemplateId: templateId,
      },
      "backend(loadById)"
    );

    return { ...doc, meta: doc.meta };
  };
  

  const loadDefaultFromBackend = async () => {
    const res = await getEditorDefaultTemplate();
    const row = res?.data ?? res;

    const rawDoc = row?.resolved ?? row;
    const doc = mapDbTemplateToDoc(rawDoc);
    const templateInfo = row?.template || {};
    const settings = settingsFromRow({
      ...templateInfo,
      resolved: rawDoc,
      layers: doc.layers,
      backgroundSrc: doc.backgroundSrc,
      meta: doc.meta,
    });

    const templateId = Number(row?.templateId ?? row?.template?.id ?? doc?.id ?? null);

    const fixed = {
      ...doc,
      id: doc.id ?? templateId ?? null,
      __metaTemplateId: templateId ?? doc.id ?? null,
      meta: {
        ...(doc.meta || {}),
        name: templateInfo.name || doc.meta?.name || "Template",
        ...settings,
      },
    };

    setDoc(fixed, "backend(default)");
    return fixed;
  };

  useEffect(() => {
    if (!autoload) return;
    if (didLoadRef.current) return;
    didLoadRef.current = true;

    const run = async () => {
      try {
        if (designId) {
          await loadTemplateById(designId);
        } else {
          try {
            await loadDefaultFromBackend();
          } catch (e) {
            console.warn("[EditorProvider] default backend no disponible → LOCAL_TEMPLATE", e);
            setDoc({ ...BASE_TEMPLATE, __metaTemplateId: null }, "local(template.js)");
          }
        }
      } catch (err) {
        console.error("[EditorProvider] autoload FAIL → fallback local", err);
        setDoc({ ...BASE_TEMPLATE, __metaTemplateId: null }, "local(template.js)");
      }
    };

    run();
  }, [autoload, designId]);

  const resetToLocalTemplate = () => {
    setDoc({ ...BASE_TEMPLATE, __metaTemplateId: null }, "local(template.js)");
  };

  const copyTemplate = async () => {
    const txt = `export const template = ${JSON.stringify(getDocForExport(), null, 2)};\n`;
    await copyToClipboard(txt);
  };

  const copyOps = async () => {
    const txt = `const ops = ${JSON.stringify(state.ops || [], null, 2)};\n`;
    await copyToClipboard(txt);
  };

  const downloadTemplateJson = () => {
    const json = JSON.stringify(getDocForExport(), null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `template_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importTemplateJson = async (textOrObj, extra = {}) => {
    const parsed = typeof textOrObj === "string" ? JSON.parse(textOrObj) : textOrObj;

    let createdId = null;
    try {
      const res = await importEditorTemplate(parsed, {
        name: parsed?.meta?.name || extra?.name || "Template importado",
        ...extra,
      });
      const data = res?.data ?? res;
      createdId = data?.id || data?.templateId || null;
    } catch (err) {
      console.warn("Backend import failed, se cargará local:", err);
    }

    if (createdId) {
      try {
        const full = await getEditorTemplateById(createdId);
        const row = full?.data ?? full;
        const doc = mapDbTemplateToDoc(row);

        setDoc({ ...doc, __metaTemplateId: Number(createdId) }, "backend(import)");
        return { id: createdId, doc };
      } catch (err) {
        console.warn("No se pudo traer template por id, usando parsed:", err);
      }
    }

    setDoc({ ...normalizeDoc(parsed), __metaTemplateId: null }, "local(import)");
    return { id: createdId, doc: normalizeDoc(parsed) };
  };

  // ✅ EXPORT: PNG/JPG vía render unificado (incluye SVG)
  const exportAsImage = async (type = "png") => {
    const data = state.doc;
    if (!data?.canvas) return;

    try {
      const mime = type === "jpg" ? "image/jpeg" : "image/png";
      const ext = type === "jpg" ? "jpg" : "png";
      const { dataUrl } = await renderDocToCanvas(data, data.data || {}, {
        background: "#ffffff",
        mime,
        quality: type === "jpg" ? 0.92 : 1,
      });
      downloadDataUrl(dataUrl, `banner_${Date.now()}.${ext}`);
    } catch (err) {
      console.error("exportAsImage failed", err);
    }
  };

  /** Exporta PDF con jsPDF (página del tamaño del lienzo + imagen del diseño). */
  const exportAsPdf = async () => {
    const data = state.doc;
    if (!data?.canvas) return;

    try {
      const { jsPDF } = await import("jspdf");
      const { dataUrl, width: W, height: H } = await renderDocToCanvas(
        data,
        data.data || {},
        { background: "#ffffff", mime: "image/png" }
      );
      const landscape = W >= H;
      const pdf = new jsPDF({
        orientation: landscape ? "landscape" : "portrait",
        unit: "px",
        format: [W, H],
        hotfixes: ["px_scaling"],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, W, H);
      pdf.save(`diseno_${Date.now()}.pdf`);
    } catch (err) {
      console.error("exportAsPdf failed", err);
      throw err;
    }
  };

  const updateTemplateMeta = (patch) => {
    dispatch({ type: "SET_DOC_META", patch: settingsToMeta(patch) });
  };

  const addBackgroundLayer = useCallback(() => {
    dispatch({ type: "ADD_BACKGROUND_LAYER" });
  }, []);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      stageRef,
      viewScale,
      setViewScale,
      activeTool,
      setActiveTool,
      addBackgroundLayer,

      foregroundColor,
      backgroundColor,
      activeColorSlot,
      setForegroundColor,
      setBackgroundColor,
      setActiveColorSlot,
      swapColors,
      pickColor,
      pickColorFromCanvas,
      applyColorToLayer,

      layers,
      groups,
      selectedId,
      selectedIds,

      setLayerMeta,
      updateLayerProps,
      toggleVisible,
      toggleLocked,
      deleteLayer,

      undo,
      redo,
      canUndo,
      canRedo,

      exportAsImage,
      copyTemplate,
      copyOps,

      downloadTemplateJson,
      importTemplateJson,

      loadTemplateById,
      loadDefaultFromBackend,
      resetToLocalTemplate,
      setDoc,

      saveTemplateDoc,
      autoSaveTemplateDoc,
      getTemplateId,
      updateTemplateMeta,
      templateSettings: settingsFromRow(state.doc || {}),
      requiresProduct: templateRequiresProduct(state.doc || {}),
    }),
    [state, layers, groups, selectedId, selectedIds, viewScale, activeTool, addBackgroundLayer, foregroundColor, backgroundColor, activeColorSlot, setForegroundColor, setBackgroundColor, pickColor, pickColorFromCanvas, applyColorToLayer, swapColors, autoSaveTemplateDoc, undo, redo, canUndo, canRedo]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEditor() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEditor debe usarse dentro de EditorProvider");
  return ctx;
}
