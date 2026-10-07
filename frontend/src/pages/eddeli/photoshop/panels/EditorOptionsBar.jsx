import React from "react";
import { Box, Typography, Chip, Stack, Button } from "@mui/material";
import { useEditor } from "../EditorProvider";
import { PE } from "../editorTheme";
import { isSelectionTool } from "../editorCursors.js";
import { useImageCropCtx } from "../useImageCrop.jsx";

export default function EditorOptionsBar() {
  const { state, activeTool, foregroundColor, backgroundColor, activeColorSlot } = useEditor();
  const {
    docSelection,
    cutSelectionWithToast,
    copySelectionWithToast,
    clearDocSelection,
    cropBusy,
  } = useImageCropCtx();
  const selected = state?.selected;
  const layer =
    selected?.kind === "layer"
      ? (state.doc?.layers || []).find((l) => l.id === selected.id)
      : null;

  const toolLabel = {
    select: "Seleccionar",
    move: "Seleccionar",
    text: "Texto",
    shape: "Forma",
    svg: "SVG",
    image: "Imagen",
    eyedropper: "Gotero — tomar color",
    "paint-bucket": "Bote de pintura — rellenar",
    "select-rect": "Selección rectangular",
    "select-ellipse": "Selección elíptica",
  }[activeTool] || "Herramienta";

  const activeSwatch = activeColorSlot === "background" ? backgroundColor : foregroundColor;
  const hasSel = docSelection && docSelection.w >= 2 && docSelection.h >= 2;
  const selecting = isSelectionTool(activeTool);
  const painting = activeTool === "paint-bucket";

  return (
    <Box
      sx={{
        height: PE.optionsH,
        display: "flex",
        alignItems: "center",
        px: 1.5,
        gap: 1,
        background: PE.bgPanelHeader,
        borderBottom: `1px solid ${PE.border}`,
        overflow: "hidden",
      }}
    >
      <Chip
        size="small"
        label={toolLabel}
        sx={{
          height: 22,
          fontSize: 11,
          background: "rgba(74,158,255,0.15)",
          color: PE.accent,
          border: `1px solid rgba(74,158,255,0.35)`,
        }}
      />

      {activeTool === "eyedropper" ? (
        <Typography sx={{ fontSize: 12, color: PE.textMuted }}>
          Clic en el canvas para tomar color · swatch activo:{" "}
          <Box
            component="span"
            sx={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: 0.5,
              bgcolor: activeSwatch,
              border: "1px solid rgba(255,255,255,0.4)",
              verticalAlign: "middle",
              mx: 0.5,
            }}
          />
        </Typography>
      ) : painting ? (
        <Typography sx={{ fontSize: 12, color: PE.textMuted }}>
          Clic en una capa forma o texto para rellenar · color:{" "}
          <Box
            component="span"
            sx={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: 0.5,
              bgcolor: foregroundColor,
              border: "1px solid rgba(255,255,255,0.4)",
              verticalAlign: "middle",
              mx: 0.5,
            }}
          />
          (elige el color en la barra izquierda)
        </Typography>
      ) : selecting ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 12, color: PE.textMuted, whiteSpace: "nowrap" }}>
            {hasSel
              ? layer
                ? `Capa “${layer.name}” · Ctrl+J corta lo del cuadro a una capa nueva`
                : "Selecciona una capa en el panel · luego Ctrl+J"
              : "1) Clic en una capa del panel  2) Arrastra el cuadro en el lienzo  3) Ctrl+J"}
          </Typography>
          {hasSel && (
            <>
              <Button
                size="small"
                disabled={cropBusy}
                onClick={cutSelectionWithToast}
                sx={{ color: PE.accent, textTransform: "none", fontSize: 11, minWidth: 0 }}
              >
                Cortar (Ctrl+J)
              </Button>
              <Button
                size="small"
                disabled={cropBusy}
                onClick={copySelectionWithToast}
                sx={{ color: PE.accent, textTransform: "none", fontSize: 11, minWidth: 0 }}
              >
                Copiar (Ctrl+Shift+J)
              </Button>
              <Button
                size="small"
                onClick={clearDocSelection}
                sx={{ color: PE.textMuted, textTransform: "none", fontSize: 11, minWidth: 0 }}
              >
                Limpiar
              </Button>
            </>
          )}
        </Stack>
      ) : (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, color: PE.textMuted, whiteSpace: "nowrap" }}>
            {layer
              ? `${layer.name || layer.id} · X/Y/W/H en el inspector (sin arrastrar)`
              : "Clic en una capa · M = selector para separar"}
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
