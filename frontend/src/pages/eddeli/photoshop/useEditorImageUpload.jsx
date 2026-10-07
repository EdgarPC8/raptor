import React, { useCallback, useRef, useState } from "react";
import { useEditor } from "./EditorProvider";
import { useAuth } from "../../../context/AuthContext";
import {
  EDITOR_IMAGE_ACCEPT,
  EDITOR_SVG_ACCEPT,
  EDITOR_RASTER_ACCEPT,
  uploadEditorImageFile,
  loadImageDimensions,
  fitDimensions,
} from "./editorImageUpload.js";
import { isSvgFile } from "./editorActions.js";

/**
 * Sube SVG (preferido) o raster al backend y crea la capa correspondiente.
 */
export function useEditorImageUpload() {
  const { state, dispatch, autoSaveTemplateDoc } = useEditor();
  const { toast } = useAuth();
  const fileRef = useRef(null);
  const modeRef = useRef("add");
  const [uploading, setUploading] = useState(false);
  const [accept, setAccept] = useState(EDITOR_IMAGE_ACCEPT);

  const getCanvasLimits = useCallback(() => {
    const cw = state?.doc?.canvas?.width || 1920;
    const ch = state?.doc?.canvas?.height || 1080;
    return {
      maxW: Math.round(cw * 0.85),
      maxH: Math.round(ch * 0.85),
    };
  }, [state?.doc?.canvas]);

  const applyUploadedImage = useCallback(
    async (file, mode = "add") => {
      const wantSvg =
        mode === "add-svg" || (mode !== "add-raster" && isSvgFile(file));
      if (mode === "add-svg" && !isSvgFile(file)) {
        throw new Error("Seleccioná un archivo SVG (.svg).");
      }
      if (mode === "add-raster" && isSvgFile(file)) {
        throw new Error("Para SVG usá el botón SVG. Acá solo PNG/JPG/WebP/GIF.");
      }

      const relPath = await uploadEditorImageFile(file);
      const natural = await loadImageDimensions(relPath);
      const { maxW, maxH } = getCanvasLimits();
      const { width, height } = fitDimensions(natural.width, natural.height, maxW, maxH);
      const baseName = String(file.name || (wantSvg ? "svg" : "imagen")).replace(/\.[^.]+$/, "");
      const layerType = wantSvg ? "svg" : "image";

      if (mode === "replace") {
        const selected = state.selected;
        const layer =
          selected?.kind === "layer"
            ? state.doc.layers.find((l) => l.id === selected.id)
            : null;

        if (layer && (layer.type === "image" || layer.type === "svg")) {
          dispatch({
            type: "UPDATE_LAYER",
            layerId: layer.id,
            patch: {
              type: layerType,
              bind: null,
              name: layer.name?.includes("producto") ? layer.name : baseName,
              w: width,
              h: height,
            },
          });
          dispatch({
            type: "UPDATE_LAYER_PROPS",
            layerId: layer.id,
            propsPatch: { src: relPath, fit: "contain" },
          });
          const saved = await autoSaveTemplateDoc();
          return { relPath, saved: saved.ok, layerType };
        }
      }

      dispatch({
        type: "ADD_LAYER",
        layerType,
        propsPatch: { src: relPath, fit: "contain" },
        layerPatch: { w: width, h: height, name: baseName },
        clearBind: true,
      });

      const saved = await autoSaveTemplateDoc();
      return { relPath, saved: saved.ok, layerType };
    },
    [autoSaveTemplateDoc, dispatch, getCanvasLimits, state.doc.layers, state.selected]
  );

  const openFilePicker = useCallback((mode = "add") => {
    modeRef.current = mode;
    if (mode === "add-svg") setAccept(EDITOR_SVG_ACCEPT);
    else if (mode === "add-raster") setAccept(EDITOR_RASTER_ACCEPT);
    else setAccept(EDITOR_IMAGE_ACCEPT);
    // defer click so accept attribute updates
    window.setTimeout(() => fileRef.current?.click(), 0);
  }, []);

  const onFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      try {
        setUploading(true);
        const res = await applyUploadedImage(file, modeRef.current);
        const kind = res?.layerType === "svg" ? "SVG" : "Imagen";
        await toast({
          promise: Promise.resolve(res),
          successMessage: res?.saved
            ? `${kind} subido y guardado en la plantilla (BD)`
            : `${kind} subido — usá Archivo → Guardar para persistir`,
          errorMessage: `No se pudo subir el ${kind.toLowerCase()}`,
        });
      } catch (err) {
        console.error(err);
        await toast({
          promise: Promise.reject(err),
          errorMessage: err?.message || "No se pudo subir el archivo",
        });
      } finally {
        setUploading(false);
      }
    },
    [applyUploadedImage, toast]
  );

  const HiddenFileInput = useCallback(
    () => (
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        hidden
        onChange={onFileChange}
      />
    ),
    [accept, onFileChange]
  );

  return {
    uploading,
    openFilePicker,
    HiddenFileInput,
    applyUploadedImage,
  };
}
