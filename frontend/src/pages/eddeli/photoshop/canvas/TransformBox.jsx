import React from "react";
import { Box, Typography } from "@mui/material";
import MarchingAntsBox from "./MarchingAntsBox.jsx";

/**
 * Marco de selección visual (sin handles de resize).
 * Posición/tamaño se editan solo con inputs en el inspector.
 */
export default function TransformBox({ layer, viewScale = 1 }) {
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
        {w} × {h} px · editar en inspector
      </Typography>
    </Box>
  );
}
