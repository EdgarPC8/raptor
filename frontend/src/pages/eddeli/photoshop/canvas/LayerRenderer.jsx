import React from "react";
import { Box } from "@mui/material";
import { SCALE, isMediaLayerType } from "../editorActions";
import { resolveLayer } from "../bind/resolveTemplate";
import { editorImageUrl } from "../editorImageUpload.js";
import { hasCrop } from "../imageCrop.js";
import { getEditorCursor } from "../editorCursors.js";
import { getSelectedLayerIds } from "../editorReducer";
import TransformBox from "./TransformBox";

function CroppedImagePreview({ src, fit, cropNorm, borderRadius, isSvg }) {
  const url = editorImageUrl(src);

  if (!url) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          background: "rgba(0,0,0,0.06)",
          color: "#666",
          fontSize: 11,
          borderRadius,
        }}
      >
        {isSvg ? "SVG vacío" : "Sin imagen"}
      </div>
    );
  }

  if (!cropNorm || !hasCrop(cropNorm) || isSvg) {
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

  const iw = 100 / cropNorm.w;
  const ih = 100 / cropNorm.h;

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
          marginLeft: `${(-cropNorm.x / cropNorm.w) * 100}%`,
          marginTop: `${(-cropNorm.y / cropNorm.h) * 100}%`,
          display: "block",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function LayerContent({ layer, scale }) {
  if (isMediaLayerType(layer.type)) {
    const src = layer.props?.src || "";
    return (
      <CroppedImagePreview
        src={src}
        fit={layer.props?.fit || "contain"}
        cropNorm={layer.type === "svg" ? null : layer.props?.cropNorm}
        borderRadius={layer.props?.borderRadius || 0}
        isSvg={layer.type === "svg"}
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
  onLayerSelect,
  onPaintBucket,
  activeTool = "select",
}) {
  const scale = viewScale || SCALE;
  const groups = doc?.groups || [];
  const layers = doc?.layers || [];
  const selectedIdSet = new Set(getSelectedLayerIds(selected));
  const primaryId =
    selected?.kind === "layer" ? selected.id : null;

  return (
    <>
      {groups.map((group) => (
        <Box
          key={group.id}
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
              const layer = resolveLayer(doc, docData, rawLayer);
              const isSelected = !readOnly && selectedIdSet.has(layer.id);
              const isPrimary = isSelected && layer.id === primaryId;

              const layerCursor = readOnly
                ? "default"
                : layer.locked
                  ? "not-allowed"
                  : activeTool === "eyedropper"
                    ? getEditorCursor("eyedropper")
                    : activeTool === "paint-bucket"
                      ? getEditorCursor("paint-bucket")
                      : "pointer";

              return (
                <Box
                  key={layer.id}
                  onMouseDown={
                    readOnly
                      ? undefined
                      : (e) => {
                          if (activeTool === "eyedropper") return;
                          e.stopPropagation();
                          if (activeTool === "paint-bucket") {
                            onPaintBucket?.(layer.id);
                            return;
                          }
                          onLayerSelect?.(layer.id, e);
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
                    outline: isSelected ? selectedBorder : "none",
                    outlineOffset: 2,
                    opacity: layer.visible === false ? 0.4 : 1,
                  }}
                >
                  <LayerContent layer={layer} scale={scale} />

                  {isPrimary && !layer.locked && activeTool !== "paint-bucket" && (
                    <TransformBox layer={layer} viewScale={scale} />
                  )}
                </Box>
              );
            })}
        </Box>
      ))}
    </>
  );
}
