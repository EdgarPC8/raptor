import React from "react";
import { Box, Typography } from "@mui/material";
import { useEditor } from "../EditorProvider";
import { SCALE } from "../editorActions";
import { useImageCropCtx } from "../useImageCrop.jsx";
import { getEditorCursor, isSelectionTool } from "../editorCursors.js";
import MarchingAntsBox from "./MarchingAntsBox.jsx";
import LayerRenderer from "./LayerRenderer";

export default function CanvasStage({ readOnly = false }) {
  const ctx = useEditor();
  const { state, dispatch, viewScale, activeTool, pickColorFromCanvas } = ctx;
  const { cropDraft, updateCropDraft, beginDocMarqueeFromEvent, startCrop, docSelection } =
    useImageCropCtx();
  const stageRef = ctx.stageRef;
  const scale = viewScale || SCALE;

  const doc = state?.doc;
  const docData = state?.doc?.data || {};

  const selectedBorder = "2px solid #00E5FF";
  const noop = () => {};

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

  const startMoveGroup = (groupId, e) => {
    if (!e.shiftKey) return; // mover grupo SOLO con SHIFT
    e.stopPropagation();
    dispatch({ type: "SET_SELECTED", selected: { kind: "group", id: groupId } });
    dispatch({
      type: "SET_ACTION",
      action: { type: "move-group", groupId, startX: e.clientX, startY: e.clientY },
    });
  };

  const startMoveLayer = (layerId, e) => {
    if (activeTool !== "move") return;
    e.stopPropagation();
    const layer = (doc.layers || []).find((l) => l.id === layerId);
    if (!layer || layer.locked) return;

    dispatch({ type: "SET_SELECTED", selected: { kind: "layer", id: layerId } });
    dispatch({
      type: "SET_ACTION",
      action: { type: "move-layer", layerId, startX: e.clientX, startY: e.clientY },
    });
  };

  const startResizeLayer = (layerId, handle, e) => {
    if (activeTool !== "move") return;
    e.stopPropagation();
    const layer = (doc.layers || []).find((l) => l.id === layerId);
    if (!layer || layer.locked) return;

    dispatch({ type: "SET_SELECTED", selected: { kind: "layer", id: layerId } });
    dispatch({
      type: "SET_ACTION",
      action: {
        type: "resize-layer",
        layerId,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startRect: { x: layer.x, y: layer.y, w: layer.w, h: layer.h },
        ratio: layer.w / layer.h || 1,
      },
    });
  };

  const stop = () => dispatch({ type: "SET_ACTION", action: null });

  const onSelectionPointerDown = (layer, e) => {
    if (activeTool === "crop") {
      e.stopPropagation();
      startCrop(layer.id, "crop");
    }
  };

  const onMove = (e) => {
    const a = state.action;
    if (!a) return;

    const dx = (e.clientX - a.startX) * scale;
    const dy = (e.clientY - a.startY) * scale;

    const clampMin = (v, min) => (v < min ? min : v);
    const layers = doc.layers || [];

    if (a.type === "move-group") {
      dispatch({ type: "UPDATE_GROUP_POS", groupId: a.groupId, dx, dy });
      dispatch({ type: "SET_ACTION", action: { ...a, startX: e.clientX, startY: e.clientY } });
      return;
    }

    if (a.type === "move-layer") {
      const cur = layers.find((l) => l.id === a.layerId);
      if (!cur) return;

      dispatch({
        type: "UPDATE_LAYER",
        layerId: a.layerId,
        patch: { x: Math.round((cur.x || 0) + dx), y: Math.round((cur.y || 0) + dy) },
      });

      dispatch({ type: "SET_ACTION", action: { ...a, startX: e.clientX, startY: e.clientY } });
      return;
    }

    if (a.type === "resize-layer") {
      const { x, y, w, h } = a.startRect;
      const handle = a.handle;
      const fromCenter = e.altKey;

      let nx = x, ny = y, nw = w, nh = h;
      const minSize = 20;

      if (handle.includes("e")) { nw = w + dx; if (fromCenter) { nw = w + dx * 2; nx = x - dx; } }
      if (handle.includes("w")) { nw = w - dx; nx = x + dx; if (fromCenter) { nw = w - dx * 2; nx = x + dx; } }
      if (handle.includes("s")) { nh = h + dy; if (fromCenter) { nh = h + dy * 2; ny = y - dy; } }
      if (handle.includes("n")) { nh = h - dy; ny = y + dy; if (fromCenter) { nh = h - dy * 2; ny = y + dy; } }

      nw = clampMin(nw, minSize);
      nh = clampMin(nh, minSize);

      const layer = layers.find((l) => l.id === a.layerId);
      const lockRatio = e.shiftKey && layer?.type === "image";

      if (lockRatio) {
        const ratio = a.ratio || 1;
        const affectsW = handle.includes("e") || handle.includes("w");
        const affectsH = handle.includes("n") || handle.includes("s");

        if (affectsW && !affectsH) nh = nw / ratio;
        else if (affectsH && !affectsW) nw = nh * ratio;
        else {
          if (Math.abs(dx) > Math.abs(dy)) nh = nw / ratio;
          else nw = nh * ratio;
        }

        if (handle.includes("w")) nx = x + (w - nw);
        if (handle.includes("n")) ny = y + (h - nh);
        if (fromCenter) { nx = x + (w - nw) / 2; ny = y + (h - nh) / 2; }
      }

      dispatch({
        type: "UPDATE_LAYER",
        layerId: a.layerId,
        patch: { x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) },
      });
    }
  };

  const onEyedropperClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const docX = (e.clientX - rect.left) * scale;
    const docY = (e.clientY - rect.top) * scale;
    pickColorFromCanvas(docX, docY);
  };

  const hasLayers = (doc.layers || []).length > 0;

  return (
    <Box
      ref={stageRef || undefined}
      onMouseMove={readOnly ? undefined : onMove}
      onMouseUp={readOnly ? undefined : stop}
      onMouseLeave={readOnly ? undefined : stop}
      onMouseDown={
        readOnly
          ? undefined
          : isSelectionTool(activeTool) || activeTool === "eyedropper"
            ? undefined
            : () => dispatch({ type: "SET_SELECTED", selected: null })
      }
      onMouseDownCapture={
        readOnly
          ? undefined
          : (e) => {
              if (activeTool === "eyedropper") {
                onEyedropperClick(e);
                return;
              }
              if (activeTool === "select-rect" || activeTool === "select-ellipse") {
                if (e.target !== e.currentTarget) return;
                beginDocMarqueeFromEvent(
                  e,
                  scale,
                  doc.canvas.width,
                  doc.canvas.height,
                  activeTool
                );
              }
            }
      }
      sx={{
        width: doc.canvas.width / scale,
        height: doc.canvas.height / scale,
        position: "relative",
        backgroundColor: "#ffffff",
        overflow: "hidden",
        cursor: isSelectionTool(activeTool) ? "crosshair" : getEditorCursor(activeTool),
        ...(readOnly ? { pointerEvents: "none", userSelect: "none" } : {}),
      }}
    >
      <LayerRenderer
        doc={doc}
        docData={docData}
        selected={readOnly ? null : state.selected}
        selectedBorder={selectedBorder}
        readOnly={readOnly}
        viewScale={scale}
        onLayerMouseDown={readOnly ? noop : startMoveLayer}
        onResizeStart={readOnly ? noop : startResizeLayer}
        onGroupMouseDown={readOnly ? noop : startMoveGroup}
        activeTool={activeTool}
        cropDraft={cropDraft}
        onCropChange={updateCropDraft}
        onSelectionPointerDown={onSelectionPointerDown}
      />

      {docSelection ? (
        <Box sx={{ position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none" }}>
          <MarchingAntsBox
            left={docSelection.x / scale}
            top={docSelection.y / scale}
            width={Math.max(docSelection.w / scale, 0)}
            height={Math.max(docSelection.h / scale, 0)}
            shape={docSelection.shape || "rect"}
          />
          <Typography
            sx={{
              position: "absolute",
              left: docSelection.x / scale,
              top: Math.max(0, docSelection.y / scale - 22),
              px: 0.75,
              py: 0.2,
              fontSize: 10,
              fontWeight: 600,
              color: "#fff",
              background: "rgba(0,0,0,0.75)",
              borderRadius: 0.5,
              whiteSpace: "nowrap",
            }}
          >
            {Math.round(docSelection.w)} × {Math.round(docSelection.h)} px
          </Typography>
        </Box>
      ) : null}

      {/* Mensaje cuando la plantilla está vacía */}
      {!hasLayers && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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
              Usa los botones en el panel "Capas" para añadir texto, imágenes o formas
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
