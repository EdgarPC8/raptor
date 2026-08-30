import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useEditor } from "./EditorProvider";
import { useAuth } from "../../../context/AuthContext";
import {
  FULL_CROP,
  clampCropNorm,
  cropNormFromPoints,
  docRectFromPoints,
  docRectIntersectLayer,
  cropNormToDocRect,
  bakeLayerRegionFromDocSel,
  bakeLayerWithDocSelHole,
  hasCrop,
  pointerClientToCropNorm,
  pointerEventToCropNorm,
  bakeCropFromSrc,
  bakeImageWithHole,
  cropSelectionToLayerRect,
  splitCropHorizontal,
  splitCropVertical,
} from "./imageCrop.js";
import {
  uploadEditorImageFile,
  loadImageDimensions,
} from "./editorImageUpload.js";
import { ensureUniqueId } from "./editorActions.js";
import {
  ETIQUETA_CROP,
  getEtiquetaLayerLayout,
  ETIQUETA_LAYER_ALIASES,
} from "./etiquetaLayout.js";

function blobToFile(blob, name = "recorte.png") {
  const type = blob.type || "image/png";
  const ext = type.includes("jpeg") ? ".jpg" : ".png";
  const base = String(name).replace(/\.[^.]+$/, "") || "recorte";
  return new File([blob], `${base}${ext}`, { type });
}

export function useImageCrop() {
  const { state, dispatch, setActiveTool, autoSaveTemplateDoc } = useEditor();
  const { toast } = useAuth();
  const [cropDraft, setCropDraft] = useState(null);
  const [docSelection, setDocSelection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [marqueeActive, setMarqueeActive] = useState(false);
  const [docMarqueeActive, setDocMarqueeActive] = useState(false);
  const marqueeRef = useRef(null);
  const docMarqueeRef = useRef(null);

  const layers = state?.doc?.layers || [];

  const selectionShapeFor = (toolId) =>
    toolId === "select-ellipse" || toolId === "crop" ? "ellipse" : "rect";

  const endMarquee = useCallback(() => {
    marqueeRef.current = null;
    setMarqueeActive(false);
  }, []);

  const endDocMarquee = useCallback(() => {
    docMarqueeRef.current = null;
    setDocMarqueeActive(false);
  }, []);

  const clearDocSelection = useCallback(() => {
    setDocSelection(null);
    endDocMarquee();
  }, [endDocMarquee]);

  const cancelSelection = useCallback(() => {
    setCropDraft(null);
    setDocSelection(null);
    endMarquee();
    endDocMarquee();
    setActiveTool("move");
  }, [endDocMarquee, endMarquee, setActiveTool]);

  const beginDocMarqueeFromEvent = useCallback(
    (e, scale, canvasW, canvasH, toolId) => {
      if (toolId !== "select-rect" && toolId !== "select-ellipse") return false;

      e.preventDefault();
      e.stopPropagation();

      setCropDraft(null);
      const rect = e.currentTarget.getBoundingClientRect();
      const ax = (e.clientX - rect.left) * scale;
      const ay = (e.clientY - rect.top) * scale;
      const shape = selectionShapeFor(toolId);

      setDocSelection({ x: ax, y: ay, w: 0, h: 0, shape });

      docMarqueeRef.current = {
        anchor: { x: ax, y: ay },
        stageEl: e.currentTarget,
        scale,
        canvasW,
        canvasH,
        toolId,
      };
      setDocMarqueeActive(true);
      return true;
    },
    [],
  );

  useEffect(() => {
    if (!docMarqueeActive) return undefined;

    const onMove = (ev) => {
      const m = docMarqueeRef.current;
      if (!m?.stageEl) return;
      const rect = m.stageEl.getBoundingClientRect();
      const cx = (ev.clientX - rect.left) * m.scale;
      const cy = (ev.clientY - rect.top) * m.scale;
      const box = docRectFromPoints(m.anchor, { x: cx, y: cy }, m.canvasW, m.canvasH);
      setDocSelection({
        ...box,
        shape: selectionShapeFor(m.toolId),
      });
    };

    const onUp = () => {
      setDocSelection((sel) => {
        if (!sel || sel.w < 2 || sel.h < 2) return null;
        return sel;
      });
      endDocMarquee();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [docMarqueeActive, endDocMarquee]);

  const beginMarqueeFromEvent = useCallback(
    (layer, toolId, e, scale) => {
      if (!layer || layer.type !== "image" || layer.locked || !layer.props?.src) return false;
      if (toolId !== "select-rect" && toolId !== "select-ellipse") return false;

      e.preventDefault();
      e.stopPropagation();

      const fit = layer.props?.fit || "contain";
      const anchor = pointerEventToCropNorm(e, layer, scale, null, fit);
      const shape = selectionShapeFor(toolId);

      setCropDraft({
        layerId: layer.id,
        cropNorm: clampCropNorm({ x: anchor.x, y: anchor.y, w: 0.02, h: 0.02 }),
        selectionShape: shape,
      });
      setActiveTool(toolId);
      dispatch({ type: "SET_SELECTED", selected: { kind: "layer", id: layer.id } });

      marqueeRef.current = {
        layerId: layer.id,
        anchor,
        layerEl: e.currentTarget,
        layer,
        scale,
        fit,
        toolId,
      };
      setMarqueeActive(true);
      return true;
    },
    [dispatch, setActiveTool]
  );

  useEffect(() => {
    if (!marqueeActive) return undefined;

    const onMove = (ev) => {
      const m = marqueeRef.current;
      if (!m?.layerEl) return;
      const rect = m.layerEl.getBoundingClientRect();
      const point = pointerClientToCropNorm(
        ev.clientX,
        ev.clientY,
        rect,
        m.layer,
        m.scale,
        null,
        m.fit
      );
      const cropNorm = cropNormFromPoints(m.anchor, point);
      setCropDraft((d) =>
        d && d.layerId === m.layerId
          ? { ...d, cropNorm, selectionShape: selectionShapeFor(m.toolId) }
          : d
      );
    };

    const onUp = () => {
      const m = marqueeRef.current;
      endMarquee();
      if (m?.layerId && m?.layer) {
        setCropDraft((d) => {
          if (!d || d.layerId !== m.layerId) return d;
          loadImageDimensions(m.layer.props?.src).then((natural) => {
            const group = (state.doc?.groups || []).find((g) => g.id === m.layer.groupId);
            const docRect = cropNormToDocRect(
              d.cropNorm,
              m.layer,
              group,
              natural.width,
              natural.height,
              m.layer.props?.fit || "contain"
            );
            setDocSelection({
              ...docRect,
              shape: d.selectionShape || selectionShapeFor(m.toolId),
            });
          });
          return d;
        });
      }
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [marqueeActive, endMarquee, state.doc?.groups]);

  const startCrop = useCallback(
    (layerId, toolId = "select-rect") => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer || layer.type !== "image" || !layer.props?.src) return false;
      if (layer.locked) return false;

      setDocSelection(null);
      endDocMarquee();

      const existing = layer.props?.cropNorm;
      setCropDraft({
        layerId,
        cropNorm: clampCropNorm(existing && hasCrop(existing) ? existing : FULL_CROP),
        selectionShape: toolId === "select-ellipse" ? "ellipse" : "rect",
      });
      setActiveTool(toolId);
      dispatch({ type: "SET_SELECTED", selected: { kind: "layer", id: layerId } });
      return true;
    },
    [dispatch, endDocMarquee, layers, setActiveTool]
  );

  const startCropSelected = useCallback(
    (toolId = "select-rect") => {
      const id = state.selected?.kind === "layer" ? state.selected.id : null;
      if (!id) return false;
      return startCrop(id, toolId);
    },
    [startCrop, state.selected]
  );

  const cancelCrop = useCallback(() => {
    setCropDraft(null);
  }, []);

  const updateCropDraft = useCallback((cropNorm) => {
    setCropDraft((d) => (d ? { ...d, cropNorm: clampCropNorm(cropNorm) } : d));
  }, []);

  const applyCrop = useCallback(async () => {
    if (!cropDraft) return;
    const layer = layers.find((l) => l.id === cropDraft.layerId);
    if (!layer?.props?.src) return;

    const cn = clampCropNorm(cropDraft.cropNorm);
    if (!hasCrop(cn)) {
      cancelCrop();
      return;
    }

    setBusy(true);
    try {
      const blob = await bakeCropFromSrc(layer.props.src, cn);
      const file = blobToFile(blob, layer.name || "recorte");
      const relPath = await uploadEditorImageFile(file);
      const natural = await loadImageDimensions(relPath);
      const aspect = natural.width / Math.max(natural.height, 1);
      const newW = layer.w || natural.width;
      const newH = Math.max(40, Math.round(newW / aspect));

      dispatch({
        type: "UPDATE_LAYER",
        layerId: layer.id,
        patch: { w: newW, h: newH, bind: null },
      });
      dispatch({
        type: "UPDATE_LAYER_PROPS",
        layerId: layer.id,
        propsPatch: { src: relPath, fit: "contain", cropNorm: null },
      });

      setCropDraft(null);
      setActiveTool("move");
      await autoSaveTemplateDoc();
    } finally {
      setBusy(false);
    }
  }, [cancelCrop, cropDraft, dispatch, layers, setActiveTool, autoSaveTemplateDoc]);

  const applyCropWithToast = useCallback(async () => {
    await toast({
      promise: applyCrop(),
      successMessage: "Recorte aplicado y guardado en el servidor",
      errorMessage: "No se pudo aplicar el recorte",
    });
  }, [applyCrop, toast]);

  /**
   * Contexto estilo Photoshop: selección en coords de documento + capa activa.
   * Si hay cropDraft en capa, lo convierte a docSelection.
   */
  const resolveLayerViaCopyContext = useCallback(async () => {
    const selectedId =
      state.selected?.kind === "layer"
        ? state.selected.id
        : cropDraft?.layerId;
    if (!selectedId) return null;

    const layer = layers.find((l) => l.id === selectedId);
    if (!layer || layer.type !== "image" || !layer.props?.src || layer.locked) return null;

    const group = (state.doc?.groups || []).find((g) => g.id === layer.groupId);

    let docSel = docSelection;
    if ((!docSel || docSel.w < 2 || docSel.h < 2) && cropDraft?.layerId === layer.id) {
      const natural = await loadImageDimensions(layer.props.src);
      docSel = {
        ...cropNormToDocRect(
          cropDraft.cropNorm,
          layer,
          group,
          natural.width,
          natural.height,
          layer.props?.fit || "contain"
        ),
        shape: cropDraft.selectionShape || "rect",
      };
    }

    if (!docSel || docSel.w < 2 || docSel.h < 2) return null;
    if (!docRectIntersectLayer(docSel, layer, group)) return null;

    return { layer, group, docSel };
  }, [cropDraft, docSelection, layers, state.doc?.groups, state.selected]);

  const copySelectionToLayer = useCallback(async () => {
    const ctx = await resolveLayerViaCopyContext();
    if (!ctx) return false;

    const { layer, group, docSel } = ctx;
    const gx = group?.x || 0;
    const gy = group?.y || 0;

    setBusy(true);
    try {
      const blob = await bakeLayerRegionFromDocSel(layer, group, docSel);
      if (!blob) return false;

      const relPath = await uploadEditorImageFile(blobToFile(blob, `${layer.name || "sel"}_copy`));
      const maxZ = Math.max(...layers.map((l) => l.zIndex || 0), 0);

      dispatch({
        type: "ADD_LAYER",
        layerType: "image",
        propsPatch: { src: relPath, fit: "fill", cropNorm: null },
        layerPatch: {
          name: `${layer.name || "Imagen"} (selección)`,
          groupId: layer.groupId,
          x: Math.round(docSel.x - gx),
          y: Math.round(docSel.y - gy),
          w: Math.round(docSel.w),
          h: Math.round(docSel.h),
          zIndex: maxZ + 1,
        },
        clearBind: true,
      });
      await autoSaveTemplateDoc();
      return true;
    } finally {
      setBusy(false);
    }
  }, [dispatch, layers, autoSaveTemplateDoc, resolveLayerViaCopyContext]);

  const cutSelectionToLayer = useCallback(async () => {
    const ctx = await resolveLayerViaCopyContext();
    if (!ctx) return false;

    const { layer, group, docSel } = ctx;
    const gx = group?.x || 0;
    const gy = group?.y || 0;

    setBusy(true);
    try {
      const [selBlob, remainBlob] = await Promise.all([
        bakeLayerRegionFromDocSel(layer, group, docSel),
        bakeLayerWithDocSelHole(layer, group, docSel),
      ]);
      if (!selBlob || !remainBlob) return false;

      const selPath = await uploadEditorImageFile(blobToFile(selBlob, `${layer.name || "sel"}_cut`));
      const remainPath = await uploadEditorImageFile(
        blobToFile(remainBlob, `${layer.name || "img"}_rest`)
      );
      const maxZ = Math.max(...layers.map((l) => l.zIndex || 0), 0);

      dispatch({
        type: "UPDATE_LAYER_PROPS",
        layerId: layer.id,
        propsPatch: { src: remainPath, fit: "fill", cropNorm: null },
      });
      dispatch({ type: "UPDATE_LAYER", layerId: layer.id, patch: { bind: null } });

      dispatch({
        type: "ADD_LAYER",
        layerType: "image",
        propsPatch: { src: selPath, fit: "fill", cropNorm: null },
        layerPatch: {
          name: `${layer.name || "Imagen"} (corte)`,
          groupId: layer.groupId,
          x: Math.round(docSel.x - gx),
          y: Math.round(docSel.y - gy),
          w: Math.round(docSel.w),
          h: Math.round(docSel.h),
          zIndex: maxZ + 1,
        },
        clearBind: true,
      });

      setCropDraft(null);
      setDocSelection(null);
      setActiveTool("move");
      await autoSaveTemplateDoc();
      return true;
    } finally {
      setBusy(false);
    }
  }, [dispatch, layers, setActiveTool, autoSaveTemplateDoc, resolveLayerViaCopyContext]);

  const copySelectionWithToast = useCallback(async () => {
    await toast({
      promise: (async () => {
        const ok = await copySelectionToLayer();
        if (!ok) throw new Error("Sin selección");
      })(),
      successMessage: "Selección copiada a nueva capa (Ctrl+J)",
      errorMessage: "Selecciona una capa de imagen y marca un área (M o arrastra sobre la capa)",
    });
  }, [copySelectionToLayer, toast]);

  const cutSelectionWithToast = useCallback(async () => {
    await toast({
      promise: (async () => {
        const ok = await cutSelectionToLayer();
        if (!ok) throw new Error("Sin selección");
      })(),
      successMessage: "Selección cortada a nueva capa (Ctrl+Shift+J)",
      errorMessage: "Selecciona una capa de imagen y marca un área (M o arrastra sobre la capa)",
    });
  }, [cutSelectionToLayer, toast]);

  const splitLayer = useCallback(
    async (direction = "horizontal") => {
      const selectedId = state.selected?.kind === "layer" ? state.selected.id : cropDraft?.layerId;
      const layer = layers.find((l) => l.id === selectedId);
      if (!layer || layer.type !== "image" || !layer.props?.src || layer.locked) return;

      const baseCrop = cropDraft?.layerId === layer.id
        ? cropDraft.cropNorm
        : layer.props?.cropNorm && hasCrop(layer.props.cropNorm)
          ? layer.props.cropNorm
          : FULL_CROP;

      const parts =
        direction === "vertical"
          ? splitCropVertical(baseCrop)
          : splitCropHorizontal(baseCrop);

      setBusy(true);
      try {
        const src = layer.props.src;
        const blobs = await Promise.all(parts.map((p) => bakeCropFromSrc(src, p)));
        const paths = await Promise.all(
          blobs.map((blob, i) =>
            uploadEditorImageFile(blobToFile(blob, `${layer.name || "parte"}_${i + 1}`))
          )
        );

        if (direction === "horizontal") {
          const halfW = Math.round((layer.w || 200) / 2);
          dispatch({
            type: "UPDATE_LAYER",
            layerId: layer.id,
            patch: { w: halfW, x: layer.x, bind: null },
          });
          dispatch({
            type: "UPDATE_LAYER_PROPS",
            layerId: layer.id,
            propsPatch: { src: paths[0], fit: "contain", cropNorm: null },
          });

          const used = new Set(layers.map((l) => l.id));
          const newId = ensureUniqueId(`${layer.id}_R`, used);
          const maxZ = Math.max(...layers.map((l) => l.zIndex || 0), 0);

          dispatch({
            type: "ADD_LAYER",
            layerType: "image",
            propsPatch: { src: paths[1], fit: "contain" },
            layerPatch: {
              id: newId,
              name: `${layer.name || "Imagen"} (der)`,
              groupId: layer.groupId,
              x: (layer.x || 0) + halfW,
              y: layer.y || 0,
              w: halfW,
              h: layer.h,
              zIndex: maxZ + 1,
            },
            clearBind: true,
          });
        } else {
          const halfH = Math.round((layer.h || 200) / 2);
          dispatch({
            type: "UPDATE_LAYER",
            layerId: layer.id,
            patch: { h: halfH, bind: null },
          });
          dispatch({
            type: "UPDATE_LAYER_PROPS",
            layerId: layer.id,
            propsPatch: { src: paths[0], fit: "contain", cropNorm: null },
          });

          const used = new Set(layers.map((l) => l.id));
          const newId = ensureUniqueId(`${layer.id}_B`, used);
          const maxZ = Math.max(...layers.map((l) => l.zIndex || 0), 0);

          dispatch({
            type: "ADD_LAYER",
            layerType: "image",
            propsPatch: { src: paths[1], fit: "contain" },
            layerPatch: {
              id: newId,
              name: `${layer.name || "Imagen"} (abajo)`,
              groupId: layer.groupId,
              x: layer.x || 0,
              y: (layer.y || 0) + halfH,
              w: layer.w,
              h: halfH,
              zIndex: maxZ + 1,
            },
            clearBind: true,
          });
        }

        setCropDraft(null);
        setActiveTool("move");
        await autoSaveTemplateDoc();
      } finally {
        setBusy(false);
      }
    },
    [cropDraft, dispatch, layers, setActiveTool, state.selected, autoSaveTemplateDoc]
  );

  /** Separa imagen compuesta EdDeli: logo arriba, nombre (texto), teléfono/redes abajo. */
  const splitEtiquetaZones = useCallback(async () => {
    const selectedId = state.selected?.kind === "layer" ? state.selected.id : cropDraft?.layerId;
    const layer = layers.find((l) => l.id === selectedId);
    if (!layer || layer.type !== "image" || !layer.props?.src || layer.locked) return false;

    const cw = state.doc?.canvas?.width || 496;
    const ch = state.doc?.canvas?.height || 701;
    const layout = getEtiquetaLayerLayout(cw, ch);
    const groupId = layer.groupId;
    const group = (state.doc?.groups || []).find((g) => g.id === groupId);

    setBusy(true);
    try {
      const [logoBlob, footerBlob] = await Promise.all([
        bakeCropFromSrc(layer.props.src, ETIQUETA_CROP.logo),
        bakeCropFromSrc(layer.props.src, ETIQUETA_CROP.footer),
      ]);
      const [logoPath, footerPath] = await Promise.all([
        uploadEditorImageFile(blobToFile(logoBlob, "logo_eddeli")),
        uploadEditorImageFile(blobToFile(footerBlob, "footer_contact")),
      ]);

      const findLayer = (keys) =>
        layers.find((l) => keys.some((k) => l.id === k || l.name?.toLowerCase().includes(k)));

      const logoTarget = findLayer(ETIQUETA_LAYER_ALIASES.logo);
      const footerTarget = findLayer(ETIQUETA_LAYER_ALIASES.footer);
      const nameTarget = findLayer(ETIQUETA_LAYER_ALIASES.name);

      if (logoTarget && logoTarget.id !== layer.id && logoTarget.type === "image") {
        dispatch({
          type: "UPDATE_LAYER",
          layerId: logoTarget.id,
          patch: { ...layout.logo_brand, name: "Logo EdDeli", bind: null },
        });
        dispatch({
          type: "UPDATE_LAYER_PROPS",
          layerId: logoTarget.id,
          propsPatch: { src: logoPath, fit: "contain", cropNorm: null },
        });
        dispatch({ type: "DELETE_LAYER", layerId: layer.id });
      } else {
        if (logoTarget?.type === "shape" && logoTarget.id !== layer.id) {
          dispatch({ type: "UPDATE_LAYER", layerId: logoTarget.id, patch: { visible: false } });
        }
        dispatch({
          type: "UPDATE_LAYER",
          layerId: layer.id,
          patch: { ...layout.logo_brand, name: "Logo EdDeli", bind: null },
        });
        dispatch({
          type: "UPDATE_LAYER_PROPS",
          layerId: layer.id,
          propsPatch: { src: logoPath, fit: "contain", cropNorm: null },
        });
      }

      const used = new Set(layers.map((l) => l.id));
      const baseZ = Math.max(...layers.map((l) => l.zIndex || 0), 20);

      if (footerTarget?.type === "image") {
        dispatch({
          type: "UPDATE_LAYER",
          layerId: footerTarget.id,
          patch: { ...layout.footer_contact, name: "Teléfono y redes", visible: true, bind: null },
        });
        dispatch({
          type: "UPDATE_LAYER_PROPS",
          layerId: footerTarget.id,
          propsPatch: { src: footerPath, fit: "contain", cropNorm: null },
        });
      } else {
        if (footerTarget?.type === "shape") {
          dispatch({
            type: "UPDATE_LAYER",
            layerId: footerTarget.id,
            patch: { visible: false },
          });
        }
        const footerId = ensureUniqueId("footer_contact", used);
        dispatch({
          type: "ADD_LAYER",
          layerType: "image",
          propsPatch: { src: footerPath, fit: "contain" },
          layerPatch: {
            id: footerId,
            name: "Teléfono y redes",
            groupId,
            ...layout.footer_contact,
            zIndex: baseZ + 2,
          },
          clearBind: true,
        });
      }

      const nameProps = {
        text: "0",
        fontSize: 26,
        fontWeight: 900,
        align: "center",
        verticalAlign: "center",
        color: "#4A301D",
        fontFamily: "Montserrat, Inter, system-ui, Arial",
      };

      if (nameTarget) {
        dispatch({
          type: "UPDATE_LAYER",
          layerId: nameTarget.id,
          patch: {
            ...layout.product_name,
            name: "ID producto",
            visible: true,
            bind: { textFrom: "product.id" },
          },
        });
        dispatch({
          type: "UPDATE_LAYER_PROPS",
          layerId: nameTarget.id,
          propsPatch: nameProps,
        });
      } else {
        const nombreId = ensureUniqueId("product_name", used);
        dispatch({
          type: "ADD_LAYER",
          layerType: "text",
          propsPatch: nameProps,
          layerPatch: {
            id: nombreId,
            name: "ID producto",
            groupId,
            ...layout.product_name,
            zIndex: baseZ + 1,
            bind: { textFrom: "product.id" },
          },
        });
      }

      // Líneas separadoras doradas (si existen en plantilla)
      ["sep_line_l", "sep_line_r"].forEach((id) => {
        const sep = layers.find((l) => l.id === id);
        if (sep && layout[id]) {
          dispatch({ type: "UPDATE_LAYER", layerId: id, patch: { ...layout[id], visible: true } });
        }
      });

      // Ocultar zonas guía antiguas (azul/naranja)
      layers
        .filter((l) => /zona|guía|guide|barcode/i.test(l.name || "") && l.type === "shape")
        .forEach((l) => dispatch({ type: "UPDATE_LAYER", layerId: l.id, patch: { visible: false } }));

      setCropDraft(null);
      setDocSelection(null);
      setActiveTool("move");
      await autoSaveTemplateDoc();
      return true;
    } finally {
      setBusy(false);
    }
  }, [autoSaveTemplateDoc, cropDraft, dispatch, layers, setActiveTool, state.doc?.canvas, state.doc?.groups, state.selected]);

  const splitEtiquetaWithToast = useCallback(async () => {
    await toast({
      promise: (async () => {
        const ok = await splitEtiquetaZones();
        if (!ok) throw new Error("Selecciona una capa de imagen");
      })(),
      successMessage: "Etiqueta separada: logo arriba, nombre centro, teléfono/redes abajo",
      errorMessage: "No se pudo separar la imagen",
    });
  }, [splitEtiquetaZones, toast]);

  /** Reacomoda capas existentes al layout EdDeli sin recortar imágenes. */
  const applyEtiquetaUnitariaLayout = useCallback(async () => {
    const cw = state.doc?.canvas?.width || 496;
    const ch = state.doc?.canvas?.height || 701;
    const layout = getEtiquetaLayerLayout(cw, ch);

    setBusy(true);
    try {
      const bg = layers.find((l) => l.id === "label_bg");
      if (bg) {
        dispatch({
          type: "UPDATE_LAYER_PROPS",
          layerId: bg.id,
          propsPatch: { fill: "#FFF9EE" },
        });
      }

      Object.entries(layout).forEach(([id, rect]) => {
        const layer = layers.find((l) => l.id === id);
        if (layer) {
          dispatch({ type: "UPDATE_LAYER", layerId: id, patch: rect });
        }
      });

      const productImg = layers.find((l) => l.id === "product_image");
      if (productImg) {
        dispatch({
          type: "UPDATE_LAYER",
          layerId: productImg.id,
          patch: { ...layout.product_image, visible: true },
        });
      }

      await autoSaveTemplateDoc();
      return true;
    } finally {
      setBusy(false);
    }
  }, [autoSaveTemplateDoc, dispatch, layers, state.doc?.canvas]);

  const applyEtiquetaLayoutWithToast = useCallback(async () => {
    await toast({
      promise: (async () => {
        const ok = await applyEtiquetaUnitariaLayout();
        if (!ok) throw new Error("No se pudo aplicar layout");
      })(),
      successMessage: "Layout etiqueta EdDeli aplicado",
      errorMessage: "No se pudo aplicar el layout",
    });
  }, [applyEtiquetaUnitariaLayout, toast]);

  const splitWithToast = useCallback(
    async (direction) => {
      await toast({
        promise: splitLayer(direction),
        successMessage:
          direction === "vertical"
            ? "Imagen dividida arriba / abajo"
            : "Imagen dividida izquierda / derecha",
        errorMessage: "No se pudo dividir la imagen",
      });
    },
    [splitLayer, toast]
  );

  const previewCropNorm = (layerId) => {
    if (cropDraft?.layerId === layerId) return cropDraft.cropNorm;
    const layer = layers.find((l) => l.id === layerId);
    return layer?.props?.cropNorm;
  };

  return {
    cropDraft,
    docSelection,
    cropBusy: busy,
    marqueeActive,
    docMarqueeActive,
    startCrop,
    startCropSelected,
    beginMarqueeFromEvent,
    beginDocMarqueeFromEvent,
    endMarquee,
    clearDocSelection,
    cancelSelection,
    cancelCrop,
    updateCropDraft,
    applyCrop,
    applyCropWithToast,
    copySelectionToLayer,
    cutSelectionToLayer,
    copySelectionWithToast,
    cutSelectionWithToast,
    splitLayer,
    splitWithToast,
    splitEtiquetaZones,
    splitEtiquetaWithToast,
    applyEtiquetaUnitariaLayout,
    applyEtiquetaLayoutWithToast,
    previewCropNorm,
    isCropActive: Boolean(cropDraft),
  };
}

const ImageCropCtx = createContext(null);

export function ImageCropProvider({ children }) {
  const value = useImageCrop();
  return <ImageCropCtx.Provider value={value}>{children}</ImageCropCtx.Provider>;
}

export function useImageCropCtx() {
  const ctx = useContext(ImageCropCtx);
  if (!ctx) {
    return {
      cropDraft: null,
      docSelection: null,
      cropBusy: false,
      startCrop: () => false,
      startCropSelected: () => false,
      beginMarqueeFromEvent: () => false,
      beginDocMarqueeFromEvent: () => false,
      endMarquee: () => {},
      clearDocSelection: () => {},
      cancelSelection: () => {},
      cancelCrop: () => {},
      updateCropDraft: () => {},
      applyCrop: async () => {},
      applyCropWithToast: async () => {},
      copySelectionToLayer: async () => false,
      cutSelectionToLayer: async () => false,
      copySelectionWithToast: async () => {},
      cutSelectionWithToast: async () => {},
      splitLayer: async () => {},
      splitWithToast: async () => {},
      splitEtiquetaZones: async () => false,
      splitEtiquetaWithToast: async () => {},
      applyEtiquetaUnitariaLayout: async () => false,
      applyEtiquetaLayoutWithToast: async () => {},
      previewCropNorm: () => null,
      isCropActive: false,
    };
  }
  return ctx;
}
