import React from "react";
import { Box } from "@mui/material";
import { SCALE } from "../editorActions";
import { resolveLayer } from "../bind/resolveTemplate";
import { editorImageUrl } from "../editorImageUpload.js";
import { hasCrop } from "../imageCrop.js";
import { getEditorCursor, isSelectionTool } from "../editorCursors.js";
import { useImageCropCtx } from "../useImageCrop.jsx";
import TransformBox from "./TransformBox";
import CropOverlay from "./CropOverlay";

function CroppedImagePreview({ src, fit, cropNorm, borderRadius }) {
  const url = editorImageUrl(src);
  const cn = cropNorm;

  if (!cn || !hasCrop(cn)) {
    return (
      <img
        src={url}
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: fit || "contain",
          borderRadius,
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    );
  }

  const iw = 100 / cn.w;
  const ih = 100 / cn.h;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        borderRadius,
      }}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        style={{
          width: `${iw}%`,
          height: `${ih}%`,
          maxWidth: "none",
          marginLeft: `${(-cn.x / cn.w) * 100}%`,
          marginTop: `${(-cn.y / cn.h) * 100}%`,
          display: "block",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function LayerContent({ layer, scale, previewCropNorm }) {
  if (layer.type === "image") {
    const src = layer.props?.src || "";
    const cropNorm = previewCropNorm || layer.props?.cropNorm;
    return (
      <CroppedImagePreview
        src={src}
        fit={layer.props?.fit || "contain"}
        cropNorm={cropNorm}
        borderRadius={layer.props?.borderRadius || 0}
      />
    );
  }

  if (layer.type === "shape") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: layer.props?.fill,
          borderRadius: layer.props?.borderRadius || 0,
          pointerEvents: "none",
        }}
      />
    );
  }

  if (layer.type === "text") {


    const align = layer.props?.align || "left";
    const verticalAlign = layer.props?.verticalAlign || "top";
    const wrap = layer.props?.wrap !== false;
    const clampLines = Number(layer.props?.maxLines || 0);
    
    const lineHeight = Number(layer.props?.lineHeight || 1.1);

    // Mapeo de alineación vertical a alignItems
    const alignItemsMap = {
      top: "flex-start",
      center: "center",
      bottom: "flex-end",
    };

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          color: layer.props?.color || "#fff",
          fontFamily: layer.props?.fontFamily || "Inter, system-ui, Arial",
          fontSize: (layer.props?.fontSize || 32) / scale,
          fontWeight: layer.props?.fontWeight || 700,
          letterSpacing: `${Number(layer.props?.letterSpacing || 0) / scale}px`,
          lineHeight,

          WebkitTextStroke:
            Number(layer.props?.strokeWidth || 0) > 0 && layer.props?.stroke
              ? `${Number(layer.props?.strokeWidth || 0) / scale}px ${layer.props?.stroke}`
              : "0px transparent",

          textShadow:
            Number(layer.props?.shadowBlur || 0) > 0
              ? `${Number(layer.props?.shadowOffsetX || 0) / scale}px ${
                  Number(layer.props?.shadowOffsetY || 0) / scale
                }px ${Number(layer.props?.shadowBlur || 0) / scale}px ${
                  layer.props?.shadowColor || "transparent"
                }`
              : "none",

          display: "flex",
          alignItems: alignItemsMap[verticalAlign] || "flex-start",
          justifyContent:
            align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
          textAlign: align,

          whiteSpace: wrap ? "pre-wrap" : "nowrap",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          overflow: "hidden",

          ...(clampLines > 0
            ? { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: clampLines }
            : {}),

          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {layer.props?.text}
      </div>
    );
  }

  return null;
}

export default function LayerRenderer({
  doc,
  docData,
  selected,
  selectedBorder,
  readOnly = false,
  viewScale,
  onLayerMouseDown,
  onResizeStart,
  onGroupMouseDown,
  activeTool = "move",
  cropDraft = null,
  onCropChange,
  onSelectionPointerDown,
}) {
  const scale = viewScale || SCALE;
  const { beginMarqueeFromEvent } = useImageCropCtx();
  const groups = doc?.groups || [];
  const layers = doc?.layers || [];

  return (
    <>
      {groups.map((group) => (
        <Box
          key={group.id}
          onMouseDown={readOnly ? undefined : (e) => onGroupMouseDown(group.id, e)}
          sx={{
            position: "absolute",
            left: (group.x || 0) / scale,
            top: (group.y || 0) / scale,
          }}
        >
          {layers
            .filter((l) => l.groupId === group.id && l.visible !== false)
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
            .map((rawLayer) => {
              // ✅ AQUÍ: resolver con doc + docData
              const layer = resolveLayer(doc, docData, rawLayer);

              const isSelected = !readOnly && selected?.kind === "layer" && selected.id === layer.id;
              const isCropTarget =
                !readOnly &&
                isSelectionTool(activeTool) &&
                cropDraft?.layerId === layer.id &&
                layer.type === "image";
              const previewCropNorm =
                isCropTarget ? cropDraft.cropNorm : layer.props?.cropNorm;

              const layerCursor = readOnly
                ? "default"
                : isSelectionTool(activeTool) && layer.type === "image"
                  ? "crosshair"
                  : isCropTarget
                    ? "crosshair"
                    : layer.locked
                      ? "not-allowed"
                      : activeTool === "move"
                        ? "grab"
                        : getEditorCursor(activeTool);

              return (
                <Box
                  key={layer.id}
                  onMouseDown={
                    readOnly
                      ? undefined
                      : (e) => {
                          if (
                            (activeTool === "select-rect" || activeTool === "select-ellipse") &&
                            layer.type === "image" &&
                            !layer.locked
                          ) {
                            e.stopPropagation();
                            beginMarqueeFromEvent(layer, activeTool, e, scale);
                            return;
                          }
                          if (activeTool === "crop" && layer.type === "image" && !layer.locked) {
                            onSelectionPointerDown?.(layer, e);
                            return;
                          }
                          if (!isCropTarget) onLayerMouseDown(layer.id, e);
                        }
                  }
                  sx={{
                    position: "absolute",
                    left: (layer.x || 0) / scale,
                    top: (layer.y || 0) / scale,
                    width: (layer.w || 0) / scale,
                    height: (layer.h || 0) / scale,
                    zIndex: layer.zIndex,
                    cursor: layerCursor,
                    outline:
                      isSelected && !isCropTarget && activeTool !== "move"
                        ? selectedBorder
                        : "none",
                    outlineOffset: 2,
                    opacity: layer.visible === false ? 0.4 : 1,
                  }}
                >
                  <LayerContent
                    layer={layer}
                    scale={scale}
                    previewCropNorm={previewCropNorm}
                  />

                  {isCropTarget && (
                    <CropOverlay
                      layer={layer}
                      cropNorm={cropDraft.cropNorm}
                      onChange={onCropChange}
                      scale={scale}
                      selectionShape={cropDraft.selectionShape || "rect"}
                      onMarqueePointerDown={(e) => onSelectionPointerDown?.(layer, e)}
                    />
                  )}

                  {isSelected && !layer.locked && !isCropTarget && activeTool === "move" && (
                    <TransformBox
                      layer={layer}
                      viewScale={scale}
                      onResizeStart={onResizeStart}
                    />
                  )}
                </Box>
              );
            })}
        </Box>
      ))}
    </>
  );
}
