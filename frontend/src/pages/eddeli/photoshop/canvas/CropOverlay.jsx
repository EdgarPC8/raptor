import React, { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { clampCropNorm, getImageDrawRect } from "../imageCrop";
import { editorImageUrl } from "../editorImageUpload.js";

const HANDLE = 10;

const handles = [
  { key: "nw", cursor: "nwse-resize", left: 0, top: 0 },
  { key: "n", cursor: "ns-resize", left: "50%", top: 0, transform: "translateX(-50%)" },
  { key: "ne", cursor: "nesw-resize", right: 0, top: 0 },
  { key: "e", cursor: "ew-resize", right: 0, top: "50%", transform: "translateY(-50%)" },
  { key: "se", cursor: "nwse-resize", right: 0, bottom: 0 },
  { key: "s", cursor: "ns-resize", left: "50%", bottom: 0, transform: "translateX(-50%)" },
  { key: "sw", cursor: "nesw-resize", left: 0, bottom: 0 },
  { key: "w", cursor: "ew-resize", left: 0, top: "50%", transform: "translateY(-50%)" },
];

export default function CropOverlay({
  layer,
  cropNorm,
  onChange,
  scale = 1,
  selectionShape = "rect",
  onMarqueePointerDown,
}) {
  const fit = layer.props?.fit || "contain";
  const src = layer.props?.src || "";
  const [natural, setNatural] = useState({ w: 1, h: 1 });
  const dragRef = useRef(null);

  useEffect(() => {
    if (!src) return;
    const url = editorImageUrl(src);
    const im = new Image();
    im.onload = () =>
      setNatural({ w: im.naturalWidth || 400, h: im.naturalHeight || 400 });
    im.onerror = () => setNatural({ w: 400, h: 400 });
    im.src = url;
  }, [src]);

  const boxW = layer.w || 1;
  const boxH = layer.h || 1;
  const draw = getImageDrawRect(natural.w, natural.h, boxW, boxH, fit);
  const cn = clampCropNorm(cropNorm);

  const stopDrag = () => {
    dragRef.current = null;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", stopDrag);
  };

  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;

    const dx = (e.clientX - d.startX) * scale;
    const dy = (e.clientY - d.startY) * scale;
    const minFrac = 0.02;

    let next = { ...d.startCrop };

    if (d.mode === "move") {
      next.x = d.startCrop.x + dx / draw.w;
      next.y = d.startCrop.y + dy / draw.h;
      next.x = Math.max(0, Math.min(1 - next.w, next.x));
      next.y = Math.max(0, Math.min(1 - next.h, next.y));
    } else {
      const handle = d.handle;
      if (handle.includes("e")) next.w = d.startCrop.w + dx / draw.w;
      if (handle.includes("w")) {
        next.w = d.startCrop.w - dx / draw.w;
        next.x = d.startCrop.x + dx / draw.w;
      }
      if (handle.includes("s")) next.h = d.startCrop.h + dy / draw.h;
      if (handle.includes("n")) {
        next.h = d.startCrop.h - dy / draw.h;
        next.y = d.startCrop.y + dy / draw.h;
      }

      if (next.w < minFrac) {
        if (handle.includes("w")) next.x = d.startCrop.x + d.startCrop.w - minFrac;
        next.w = minFrac;
      }
      if (next.h < minFrac) {
        if (handle.includes("n")) next.y = d.startCrop.y + d.startCrop.h - minFrac;
        next.h = minFrac;
      }
      next.x = Math.max(0, Math.min(1 - next.w, next.x));
      next.y = Math.max(0, Math.min(1 - next.h, next.y));
      next.w = Math.min(1 - next.x, next.w);
      next.h = Math.min(1 - next.y, next.h);
    }

    onChange(clampCropNorm(next));
  };

  const startDrag = (mode, handle, e) => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = {
      mode,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...cn },
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stopDrag);
  };

  useEffect(() => () => stopDrag(), []);

  const cropLeft = (draw.x + cn.x * draw.w) / scale;
  const cropTop = (draw.y + cn.y * draw.h) / scale;
  const cropW = (cn.w * draw.w) / scale;
  const cropH = (cn.h * draw.h) / scale;

  const shade = "rgba(0,0,0,0.55)";

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        pointerEvents: "auto",
        cursor: "crosshair",
      }}
    >
      {/* Área de imagen (contain/cover) */}
      <Box
        onMouseDown={(e) => {
          if (e.target !== e.currentTarget) return;
          e.stopPropagation();
          onMarqueePointerDown?.(e);
        }}
        sx={{
          position: "absolute",
          left: draw.x / scale,
          top: draw.y / scale,
          width: draw.w / scale,
          height: draw.h / scale,
          boxSizing: "border-box",
          cursor: "crosshair",
        }}
      >
        {/* Sombras fuera del recorte */}
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            height: `${cn.y * 100}%`,
            background: shade,
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            left: 0,
            bottom: 0,
            right: 0,
            height: `${(1 - cn.y - cn.h) * 100}%`,
            background: shade,
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: `${cn.y * 100}%`,
            width: `${cn.x * 100}%`,
            height: `${cn.h * 100}%`,
            background: shade,
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            right: 0,
            top: `${cn.y * 100}%`,
            width: `${(1 - cn.x - cn.w) * 100}%`,
            height: `${cn.h * 100}%`,
            background: shade,
            pointerEvents: "none",
          }}
        />

        {/* Marco de recorte */}
        <Box
          onMouseDown={(e) => startDrag("move", "", e)}
          sx={{
            position: "absolute",
            left: `${cn.x * 100}%`,
            top: `${cn.y * 100}%`,
            width: `${cn.w * 100}%`,
            height: `${cn.h * 100}%`,
            border: "2px solid #00E5FF",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
            cursor: "move",
            boxSizing: "border-box",
            borderRadius: selectionShape === "ellipse" ? "50%" : 0,
          }}
        >
          {/* Regla visual */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.25) 33.33%, transparent 33.33%, transparent 66.66%, rgba(255,255,255,0.25) 66.66%),
                linear-gradient(to bottom, rgba(255,255,255,0.25) 33.33%, transparent 33.33%, transparent 66.66%, rgba(255,255,255,0.25) 66.66%)
              `,
              pointerEvents: "none",
            }}
          />

          {handles.map((h) => (
            <Box
              key={h.key}
              onMouseDown={(e) => startDrag("resize", h.key, e)}
              sx={{
                position: "absolute",
                width: HANDLE,
                height: HANDLE,
                background: "#00E5FF",
                border: "1px solid rgba(0,0,0,0.5)",
                borderRadius: 0.5,
                cursor: h.cursor,
                ...(h.left !== undefined ? { left: h.left } : {}),
                ...(h.right !== undefined ? { right: h.right } : {}),
                ...(h.top !== undefined ? { top: h.top } : {}),
                ...(h.bottom !== undefined ? { bottom: h.bottom } : {}),
                ...(h.transform ? { transform: h.transform } : {}),
                ...(h.left === "50%" ? { marginLeft: -HANDLE / 2 } : {}),
                ...(h.top === "50%" ? { marginTop: -HANDLE / 2 } : {}),
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Info flotante */}
      <Box
        sx={{
          position: "absolute",
          left: cropLeft,
          top: Math.max(0, cropTop - 22),
          px: 0.75,
          py: 0.25,
          fontSize: 10,
          color: "#fff",
          background: "rgba(0,0,0,0.75)",
          borderRadius: 0.5,
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        {Math.round(cn.w * draw.w)}×{Math.round(cn.h * draw.h)} px
      </Box>
    </Box>
  );
}
