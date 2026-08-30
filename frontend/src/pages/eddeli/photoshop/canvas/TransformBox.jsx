import React from "react";
import { Box, Typography } from "@mui/material";
import MarchingAntsBox from "./MarchingAntsBox.jsx";

const HANDLE_SIZE = 12;

const handleStyle = (cursor) => ({
  position: "absolute",
  width: HANDLE_SIZE,
  height: HANDLE_SIZE,
  borderRadius: 2,
  background: "#00E5FF",
  border: "1px solid rgba(0,0,0,0.4)",
  cursor,
  zIndex: 2,
});

const handles = [
  { key: "nw", cursor: "nwse-resize", left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
  { key: "n", cursor: "ns-resize", left: "50%", top: -HANDLE_SIZE / 2, transform: "translateX(-50%)" },
  { key: "ne", cursor: "nesw-resize", right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
  { key: "e", cursor: "ew-resize", right: -HANDLE_SIZE / 2, top: "50%", transform: "translateY(-50%)" },
  { key: "se", cursor: "nwse-resize", right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
  { key: "s", cursor: "ns-resize", left: "50%", bottom: -HANDLE_SIZE / 2, transform: "translateX(-50%)" },
  { key: "sw", cursor: "nesw-resize", left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
  { key: "w", cursor: "ew-resize", left: -HANDLE_SIZE / 2, top: "50%", transform: "translateY(-50%)" },
];

export default function TransformBox({ layer, viewScale = 1, onResizeStart }) {
  const w = Math.round(layer.w || 0);
  const h = Math.round(layer.h || 0);
  const displayW = w / viewScale;
  const displayH = h / viewScale;

  return (
    <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <MarchingAntsBox left={0} top={0} width={displayW} height={displayH} shape="rect" />

      <Typography
        sx={{
          position: "absolute",
          top: -22,
          left: 0,
          px: 0.75,
          py: 0.2,
          fontSize: 10,
          fontWeight: 600,
          color: "#fff",
          background: "rgba(0,0,0,0.75)",
          borderRadius: 0.5,
          whiteSpace: "nowrap",
          zIndex: 3,
        }}
      >
        {w} × {h} px
      </Typography>

      {handles.map((hnd) => (
        <Box
          key={hnd.key}
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(layer.id, hnd.key, e);
          }}
          sx={{
            ...handleStyle(hnd.cursor),
            pointerEvents: "auto",
            ...(hnd.left !== undefined ? { left: hnd.left } : {}),
            ...(hnd.right !== undefined ? { right: hnd.right } : {}),
            ...(hnd.top !== undefined ? { top: hnd.top } : {}),
            ...(hnd.bottom !== undefined ? { bottom: hnd.bottom } : {}),
            ...(hnd.transform ? { transform: hnd.transform } : {}),
          }}
        />
      ))}
    </Box>
  );
}
