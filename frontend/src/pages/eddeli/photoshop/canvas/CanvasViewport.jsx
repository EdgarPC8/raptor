import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import { useEditor } from "../EditorProvider";
import { PE, checkerboardBg } from "../editorTheme";
import { getEditorCursor } from "../editorCursors.js";
import CanvasStage from "./CanvasStage";

export default function CanvasViewport({ readOnly = false }) {
  const { state, viewScale, setViewScale, activeTool } = useEditor();
  const containerRef = useRef(null);
  const [userZoom, setUserZoom] = useState(1);

  const doc = state?.doc;
  const canvasW = doc?.canvas?.width || 0;
  const canvasH = doc?.canvas?.height || 0;
  const docName = doc?.meta?.name || "Documento";

  const computeFitScale = useCallback(() => {
    const el = containerRef.current;
    if (!el || !canvasW || !canvasH) return 3;
    const rect = el.getBoundingClientRect();
    const pad = 48;
    const tabH = 32;
    const maxW = Math.max(rect.width - pad, 120);
    const maxH = Math.max(rect.height - pad - tabH, 120);
    return Math.max(canvasW / maxW, canvasH / maxH);
  }, [canvasW, canvasH]);

  useEffect(() => {
    const fit = () => {
      const fitScale = computeFitScale();
      setViewScale(fitScale / userZoom);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [computeFitScale, setViewScale, userZoom, canvasW, canvasH]);

  const zoomIn = () => setUserZoom((z) => Math.min(z * 1.2, 4));
  const zoomOut = () => setUserZoom((z) => Math.max(z / 1.2, 0.25));
  const zoomFit = () => setUserZoom(1);

  const displayPct = Math.round(userZoom * 100);

  const displayW = canvasW ? canvasW / viewScale : 0;
  const displayH = canvasH ? canvasH / viewScale : 0;

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: PE.bgCanvas,
      }}
    >
      {/* Pestaña documento */}
      <Box
        sx={{
          height: 32,
          flexShrink: 0,
          display: "flex",
          alignItems: "flex-end",
          px: 1,
          background: PE.bgPanel,
          borderBottom: `1px solid ${PE.border}`,
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            background: PE.bgMenu,
            borderTop: `2px solid ${PE.accent}`,
            borderLeft: `1px solid ${PE.borderLight}`,
            borderRight: `1px solid ${PE.borderLight}`,
            borderRadius: "4px 4px 0 0",
            maxWidth: 220,
          }}
        >
          <Typography noWrap sx={{ fontSize: 11, color: PE.text, fontWeight: 600 }}>
            {docName}
          </Typography>
        </Box>
      </Box>

      {/* Área canvas con checkerboard */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          display: "grid",
          placeItems: "center",
          p: 2,
          cursor: readOnly ? "default" : getEditorCursor(activeTool),
          ...checkerboardBg,
        }}
      >
        {canvasW > 0 ? (
          <Box
            sx={{
              width: displayW,
              height: displayH,
              flexShrink: 0,
              boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
            }}
          >
            <CanvasStage readOnly={readOnly} />
          </Box>
        ) : (
          <Typography sx={{ color: PE.textMuted, fontSize: 13 }}>Sin documento</Typography>
        )}
      </Box>

      {/* Barra zoom */}
      <Box
        sx={{
          height: PE.statusH,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1,
          background: PE.bgPanel,
          borderTop: `1px solid ${PE.border}`,
        }}
      >
        <Typography sx={{ fontSize: 11, color: PE.textMuted }}>
          {canvasW} × {canvasH} px
        </Typography>
        <Stack direction="row" spacing={0.25} alignItems="center">
          <IconButton size="small" onClick={zoomOut} sx={{ color: PE.text, p: 0.5 }}>
            <ZoomOutIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Typography sx={{ fontSize: 11, color: PE.text, minWidth: 44, textAlign: "center" }}>
            {displayPct}%
          </Typography>
          <IconButton size="small" onClick={zoomIn} sx={{ color: PE.text, p: 0.5 }}>
            <ZoomInIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={zoomFit} title="Ajustar a pantalla" sx={{ color: PE.text, p: 0.5 }}>
            <FitScreenIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
}
