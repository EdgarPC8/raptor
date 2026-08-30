import React from "react";
import { Box } from "@mui/material";

/**
 * Borde animado estilo Photopea (marching ants).
 * Coordenadas en píxeles CSS dentro del contenedor padre.
 */
export default function MarchingAntsBox({
  left = 0,
  top = 0,
  width = 0,
  height = 0,
  shape = "rect",
}) {
  if (width < 1 && height < 1) return null;

  const w = Math.max(width, 1);
  const h = Math.max(height, 1);
  const cx = left + w / 2;
  const cy = top + h / 2;
  const rx = w / 2;
  const ry = h / 2;

  const anim = "editorMarchDash 0.55s linear infinite";

  return (
    <Box
      component="svg"
      sx={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "visible",
        pointerEvents: "none",
        "@keyframes editorMarchDash": {
          to: { strokeDashoffset: -8 },
        },
      }}
    >
      {shape === "ellipse" ? (
        <>
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            stroke="#fff"
            strokeWidth={1}
            strokeDasharray="4 4"
            style={{ animation: anim }}
          />
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            stroke="#000"
            strokeWidth={1}
            strokeDasharray="4 4"
            strokeDashoffset={4}
            style={{ animation: anim, animationDirection: "reverse" }}
          />
        </>
      ) : (
        <>
          <rect
            x={left}
            y={top}
            width={w}
            height={h}
            fill="none"
            stroke="#fff"
            strokeWidth={1}
            strokeDasharray="4 4"
            style={{ animation: anim }}
          />
          <rect
            x={left}
            y={top}
            width={w}
            height={h}
            fill="none"
            stroke="#000"
            strokeWidth={1}
            strokeDasharray="4 4"
            strokeDashoffset={4}
            style={{ animation: anim, animationDirection: "reverse" }}
          />
        </>
      )}
    </Box>
  );
}
