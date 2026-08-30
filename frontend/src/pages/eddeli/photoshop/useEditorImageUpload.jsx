import React, { useCallback, useRef, useState } from "react";
import { useEditor } from "./EditorProvider";
import { useAuth } from "../../../context/AuthContext";
import {
  EDITOR_IMAGE_ACCEPT,
  uploadEditorImageFile,
  loadImageDimensions,
  fitDimensions,
} from "./editorImageUpload.js";

/**
 * Sube PNG/JPG/SVG al backend, crea capa de imagen y persiste la ruta en BD (editor_layer_props.src).
 */
export function useEditorImageUpload() {
  const { state, dispatch, autoSaveTemplateDoc } = useEditor();
  const { toast } = useAuth();
  const fileRef = useRef(null);
  const modeRef = useRef("add");
  const [uploading, setUploading] = useState(false);

  const getCanvasLimits = useCallback(() => {
    const cw = state?.doc?.canvas?.width || 1920;
    const ch = state?.doc?.canvas?.height || 1080;
    return {
      maxW: Math.round(cw * 0.85),
      maxH: Math.round(ch * 0.85),
      cx: Math.round(cw * 0.075),
      cy: Math.round(ch * 0.075),
    };
  }, [state?.doc?.canvas]);

  const applyUploadedImage = useCallback(
    async (file, mode = "add") => {
      const relPath = await uploadEditorImageFile(file);
      const natural = await loadImageDimensions(relPath);
      const { maxW, maxH } = getCanvasLimits();
      const { width, height } = fitDimensions(natural.width, natural.height, maxW, maxH);
      const baseName = String(file.name || "imagen").replace(/\.[^.]+$/, "");

      if (mode === "replace") {
        const selected = state.selected;
        const layer =
          selected?.kind === "layer"
            ? state.doc.layers.find((l) => l.id === selected.id)
            : null;

        if (layer?.type === "image") {
          dispatch({
            type: "UPDATE_LAYER",
            layerId: layer.id,
            patch: {
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
          return { relPath, saved: saved.ok };
        }
      }

      dispatch({
        type: "ADD_LAYER",
        layerType: "image",
        propsPatch: { src: relPath, fit: "contain" },
        layerPatch: { w: width, h: height, name: baseName },
        clearBind: true,
      });

      const saved = await autoSaveTemplateDoc();
      return { relPath, saved: saved.ok };
    },
    [autoSaveTemplateDoc, dispatch, getCanvasLimits, state.doc.layers, state.selected]
  );

  const openFilePicker = useCallback((mode = "add") => {
    modeRef.current = mode;
    fileRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      try {
        setUploading(true);
        const res = await applyUploadedImage(file, modeRef.current);
        await toast({
          promise: Promise.resolve(res),
          successMessage: res?.saved
            ? "Imagen subida y guardada en la plantilla (BD)"
            : "Imagen subida al servidor — usa Archivo → Guardar para persistir la capa",
          errorMessage: "No se pudo subir la imagen",
        });
        if (res && !res.saved) {
          console.warn("[useEditorImageUpload] Sin templateId en BD; ruta solo en memoria:", res.relPath);
        }
      } catch (err) {
        console.error(err);
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
        accept={EDITOR_IMAGE_ACCEPT}
        hidden
        onChange={onFileChange}
      />
    ),
    [onFileChange]
  );

  return {
    uploading,
    openFilePicker,
    HiddenFileInput,
    applyUploadedImage,
  };
}
