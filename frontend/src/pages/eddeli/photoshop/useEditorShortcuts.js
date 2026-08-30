import { useEffect, useCallback } from "react";
import { useEditor } from "./EditorProvider.jsx";
import { useImageCropCtx } from "./useImageCrop.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import { isSelectionTool } from "./editorCursors.js";

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * Atajos estilo Photopea / Photoshop en el editor.
 */
export function useEditorShortcuts() {
  const {
    dispatch,
    setActiveTool,
    saveTemplateDoc,
    deleteLayer,
    undo,
    redo,
    canUndo,
    canRedo,
    state,
  } = useEditor();
  const {
    cropDraft,
    docSelection,
    cropBusy,
    cancelCrop,
    cancelSelection,
    clearDocSelection,
    copySelectionToLayer,
    cutSelectionToLayer,
    startCropSelected,
  } = useImageCropCtx();
  const { toast } = useAuth();

  const busy = cropBusy;

  const duplicateLayer = useCallback(() => {
    dispatch({ type: "DUPLICATE_SELECTED_LAYER" });
  }, [dispatch]);

  const deleteSelected = useCallback(() => {
    if (state.selected?.kind !== "layer") return;
    deleteLayer(state.selected.id);
  }, [deleteLayer, state.selected]);

  const handleCtrlJ = useCallback(async () => {
    if (busy) return;
    const ok = await copySelectionToLayer();
    if (ok) return;
    if (state.selected?.kind === "layer") duplicateLayer();
  }, [busy, copySelectionToLayer, duplicateLayer, state.selected]);

  const handleCtrlShiftJ = useCallback(async () => {
    if (busy) return;
    await cutSelectionToLayer();
  }, [busy, cutSelectionToLayer]);

  const handleSave = useCallback(async () => {
    await toast({
      promise: saveTemplateDoc(),
      successMessage: "Plantilla guardada",
      errorMessage: "No se pudo guardar",
    });
  }, [saveTemplateDoc, toast]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (isTypingTarget(document.activeElement)) return;

      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (mod && key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

      if (mod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }

      if (mod && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      if (mod && e.shiftKey && key === "j") {
        e.preventDefault();
        handleCtrlShiftJ();
        return;
      }

      if (mod && !e.shiftKey && key === "j") {
        e.preventDefault();
        handleCtrlJ();
        return;
      }

      if ((key === "delete" || key === "backspace") && !mod) {
        if (state.selected?.kind === "layer") {
          e.preventDefault();
          deleteSelected();
        }
        return;
      }

      if (key === "escape") {
        if (cropDraft || docSelection) {
          e.preventDefault();
          cancelSelection();
          return;
        }
        dispatch({ type: "SET_SELECTED", selected: null });
        return;
      }

      if (mod) return;

      if (key === "v") {
        cancelSelection();
        return;
      }
      if (key === "m") {
        cancelCrop();
        clearDocSelection();
        setActiveTool("select-rect");
        return;
      }
      if (key === "l") {
        cancelCrop();
        clearDocSelection();
        setActiveTool("select-lasso");
        return;
      }
      if (key === "c") {
        setActiveTool("crop");
        startCropSelected("crop");
        return;
      }
      if (key === "g") {
        cancelCrop();
        setActiveTool("eyedropper");
        return;
      }
      if (key === "t") {
        cancelCrop();
        setActiveTool("text");
        return;
      }
      if (key === "u") {
        cancelCrop();
        setActiveTool("shape");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    canRedo,
    canUndo,
    cancelSelection,
    cancelCrop,
    clearDocSelection,
    cropDraft,
    docSelection,
    deleteSelected,
    deleteLayer,
    dispatch,
    handleCtrlJ,
    handleCtrlShiftJ,
    handleSave,
    redo,
    setActiveTool,
    startCropSelected,
    state.selected,
    undo,
  ]);
}

export default useEditorShortcuts;
