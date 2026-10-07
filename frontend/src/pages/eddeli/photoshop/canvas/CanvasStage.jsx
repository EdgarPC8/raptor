import React, { useRef } from "react";
import { Box, Typography } from "@mui/material";
import { useEditor } from "../EditorProvider";
import { SCALE } from "../editorActions";
import { getEditorCursor, isSelectionTool } from "../editorCursors.js";
import LayerRenderer from "./LayerRenderer";
import DocSelectionOverlay from "./DocSelectionOverlay";
import { useImageCropCtx } from "../useImageCrop.jsx";

/**
 * Escenario del documento.
 * - Clic: selecciona capa.
 * - M / elipse: dibuja área → Ctrl+J corta a nueva capa.
 * - Gotero: tomar color.
 * - Bote: rellenar capa forma/texto con el color frontal.
 */
export default function CanvasStage({ readOnly = false }) {
  const ctx = useEditor();
  const {
    state,
    dispatch,
    viewScale,
    activeTool,
    pickColorFromCanvas,
    applyColorToLayer,
    foregroundColor,
    autoSaveTemplateDoc,
  } = ctx;
  const { docSelection, beginDocMarqueeFromEvent } = useImageCropCtx();
  const localStageRef = useRef(null);
  const stageRef = ctx.stageRef || localStageRef;
  const scale = viewScale || SCALE;

  const doc = state?.doc;
  const docData = state?.doc?.data || {};
  const selectedBorder = "2px solid #00E5FF";
  const selecting = isSelectionTool(activeTool);
  const painting = activeTool === "paint-bucket";

  if (!doc?.canvas) {
    return (
      <Box
        sx={{
          width: 600,
          height: 340,
          border: "2px dashed rgba(255,255,255,0.25)",
          borderRadius: 2,
          display: "grid",
          placeItems: "center",
          color: "rgba(255,255,255,0.7)",
        }}
      >
        Cargando template...
      </Box>
    );
  }

  const cssW = doc.canvas.width / scale;
  const cssH = doc.canvas.height / scale;

  const selectLayer = (layerId, e) => {
    if (selecting || painting) return;
    const layer = (doc.layers || []).find((l) => l.id === layerId);
    if (!layer || layer.locked) return;
    if (e?.ctrlKey || e?.metaKey) {
      dispatch({ type: "TOGGLE_LAYER_IN_SELECTION", layerId });
      return;
    }
    dispatch({
      type: "SET_SELECTED",
      selected: { kind: "layer", id: layerId, ids: [layerId] },
    });
  };

  const onPaintBucketClick = (layerId) => {
    const layer = (doc.layers || []).find((l) => l.id === layerId);
    if (!layer || layer.locked) return;
    dispatch({
      type: "SET_SELECTED",
      selected: { kind: "layer", id: layerId, ids: [layerId] },
    });
    applyColorToLayer?.(layerId, foregroundColor);
    autoSaveTemplateDoc?.();
  };

  const onEyedropperClick = (e) => {
    e.stopPropagation();
    const el = stageRef.current || e.currentTarget;
    const rect = el.getBoundingClientRect();
    const docX = (e.clientX - rect.left) * scale;
    const docY = (e.clientY - rect.top) * scale;
    pickColorFromCanvas(docX, docY);
  };

  const startMarquee = (e) => {
    if (!selecting || readOnly) return;
    const stageEl = stageRef.current;
    if (!stageEl) return;
    beginDocMarqueeFromEvent(
      e,
      scale,
      doc.canvas.width,
      doc.canvas.height,
      activeTool,
      stageEl
    );
  };

  const hasLayers = (doc.layers || []).length > 0;
  const showSel =
    !readOnly && docSelection && (docSelection.w >= 1 || docSelection.h >= 1);

  return (
    <Box
      ref={(node) => {
        localStageRef.current = node;
        if (ctx.stageRef) ctx.stageRef.current = node;
      }}
      onMouseDown={
        readOnly
          ? undefined
          : (e) => {
              if (activeTool === "eyedropper") {
                onEyedropperClick(e);
                return;
              }
              if (painting) return;
              if (selecting) {
                startMarquee(e);
                return;
              }
              if (e.target === e.currentTarget) {
                dispatch({ type: "SET_SELECTED", selected: null });
              }
            }
      }
      sx={{
        width: cssW,
        height: cssH,
        position: "relative",
        backgroundColor: "#ffffff",
        overflow: "hidden",
        cursor: getEditorCursor(activeTool),
        userSelect: selecting ? "none" : undefined,
        touchAction: selecting ? "none" : undefined,
        ...(readOnly ? { pointerEvents: "none", userSelect: "none" } : {}),
      }}
    >
      <LayerRenderer
        doc={doc}
        docData={docData}
        selected={readOnly ? null : state.selected}
        selectedBorder={selectedBorder}
        readOnly={readOnly || selecting}
        viewScale={scale}
        onLayerSelect={readOnly || selecting || painting ? undefined : selectLayer}
        onPaintBucket={readOnly || !painting ? undefined : onPaintBucketClick}
        activeTool={activeTool}
      />

      {selecting && !readOnly && (
        <Box
          onMouseDown={startMarquee}
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 9000,
            cursor: getEditorCursor(activeTool),
          }}
        />
      )}

      {showSel && (
        <DocSelectionOverlay
          left={docSelection.x / scale}
          top={docSelection.y / scale}
          width={Math.max(docSelection.w / scale, 1)}
          height={Math.max(docSelection.h / scale, 1)}
          shape={docSelection.shape || "rect"}
          stageW={cssW}
          stageH={cssH}
        />
      )}

      {!hasLayers && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <Box
            sx={{
              textAlign: "center",
              p: 2,
              borderRadius: 2,
              background: "rgba(0,0,0,0.6)",
              border: "1px dashed rgba(255,255,255,0.3)",
            }}
          >
            <Typography sx={{ color: "#fff", fontWeight: 600, mb: 1 }}>
              Plantilla vacía
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
              Añade SVG o imagen · M para seleccionar un área · Ctrl+J cortar
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
