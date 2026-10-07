import React from "react";
import { Box } from "@mui/material";
import MarchingAntsBox from "./MarchingAntsBox";

/**
 * Overlay de selección en el lienzo (cuadro / círculo).
 * Coordenadas en píxeles CSS del stage.
 */
export default function DocSelectionOverlay({
  left = 0,
  top = 0,
  width = 0,
  height = 0,
  shape = "rect",
  stageW = 0,
  stageH = 0,
}) {
  if (width < 1 && height < 1) return null;

  const w = Math.max(width, 1);
  const h = Math.max(height, 1);
  const isEllipse = shape === "ellipse";

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      {/* Oscurece fuera de la selección */}
      <Box
        component="svg"
        width={stageW || "100%"}
        height={stageH || "100%"}
        sx={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        <defs>
          <mask id="doc-sel-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {isEllipse ? (
              <ellipse
                cx={left + w / 2}
                cy={top + h / 2}
                rx={w / 2}
                ry={h / 2}
                fill="black"
              />
            ) : (
              <rect x={left} y={top} width={w} height={h} fill="black" />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.35)"
          mask="url(#doc-sel-mask)"
        />
        {isEllipse ? (
          <ellipse
            cx={left + w / 2}
            cy={top + h / 2}
            rx={w / 2}
            ry={h / 2}
            fill="rgba(74,158,255,0.18)"
            stroke="#4a9eff"
            strokeWidth={2}
          />
        ) : (
          <rect
            x={left}
            y={top}
            width={w}
            height={h}
            fill="rgba(74,158,255,0.18)"
            stroke="#4a9eff"
            strokeWidth={2}
          />
        )}
      </Box>

      <MarchingAntsBox
        left={left}
        top={top}
        width={w}
        height={h}
        shape={shape}
      />
    </Box>
  );
}
