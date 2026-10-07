import { useEffect, useCallback } from "react";
import { useEditor } from "./EditorProvider.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import { getSelectedLayerIds } from "./editorReducer.js";
import { useImageCropCtx } from "./useImageCrop.jsx";

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * Atajos del editor.
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
  const { toast } = useAuth();
  const {
    docSelection,
    copySelectionWithToast,
    cutSelectionWithToast,
    clearDocSelection,
    cancelSelection,
  } = useImageCropCtx();

  const duplicateLayer = useCallback(() => {
    dispatch({ type: "DUPLICATE_SELECTED_LAYER" });
  }, [dispatch]);

  const deleteSelected = useCallback(() => {
    if (state.selected?.kind !== "layer") return;
    deleteLayer(state.selected.id);
  }, [deleteLayer, state.selected]);

  const handleSave = useCallback(async () => {
    await toast({
      promise: saveTemplateDoc(),
      successMessage: "Plantilla guardada",
      errorMessage: "No se pudo guardar",
    });
  }, [saveTemplateDoc, toast]);

  const hasDocSel = Boolean(docSelection && docSelection.w >= 2 && docSelection.h >= 2);

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

      if (mod && !e.shiftKey && key === "j") {
        e.preventDefault();
        if (hasDocSel) {
          cutSelectionWithToast();
        } else if (state.selected?.kind === "layer") {
          duplicateLayer();
        }
        return;
      }

      if (mod && e.shiftKey && key === "j") {
        e.preventDefault();
        if (hasDocSel) copySelectionWithToast();
        return;
      }

      // Ctrl+G → carpeta con selección
      if (mod && !e.shiftKey && key === "g") {
        e.preventDefault();
        const ids = getSelectedLayerIds(state.selected);
        if (ids.length >= 1) {
          dispatch({ type: "GROUP_SELECTED_LAYERS" });
        }
        return;
      }

      // Ctrl+Shift+G → desagrupar
      if (mod && e.shiftKey && key === "g") {
        e.preventDefault();
        const ids = getSelectedLayerIds(state.selected);
        if (ids.length >= 1) {
          dispatch({ type: "UNGROUP_SELECTED_LAYERS" });
        }
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
        if (hasDocSel) {
          e.preventDefault();
          clearDocSelection();
          return;
        }
        cancelSelection?.();
        dispatch({ type: "SET_SELECTED", selected: null });
        setActiveTool("select");
        return;
      }

      if (mod) return;

      if (key === "v") {
        setActiveTool("select");
        return;
      }
      if (key === "m") {
        setActiveTool(e.shiftKey ? "select-ellipse" : "select-rect");
        return;
      }
      if (key === "g") {
        setActiveTool("eyedropper");
        return;
      }
      if (key === "k") {
        setActiveTool("paint-bucket");
        return;
      }
      if (key === "t") {
        setActiveTool("text");
        return;
      }
      if (key === "u") {
        setActiveTool("shape");
        return;
      }
      if (key === "s") {
        setActiveTool("svg");
        return;
      }
      if (key === "i") {
        setActiveTool("image");
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    canRedo,
    canUndo,
    cancelSelection,
    clearDocSelection,
    copySelectionWithToast,
    cutSelectionWithToast,
    deleteSelected,
    dispatch,
    duplicateLayer,
    handleSave,
    hasDocSel,
    redo,
    setActiveTool,
    state.selected,
    undo,
  ]);
}

export default useEditorShortcuts;
