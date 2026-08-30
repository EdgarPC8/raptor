import React from "react";
import { Box, Typography, Chip, Stack, Button } from "@mui/material";
import { useEditor } from "../EditorProvider";
import { useImageCropCtx } from "../useImageCrop.jsx";
import { isSelectionTool } from "../editorCursors.js";
import { PE } from "../editorTheme";

export default function EditorOptionsBar() {
  const { state, activeTool, foregroundColor, backgroundColor, activeColorSlot } = useEditor();
  const {
    cropDraft,
    docSelection,
    cropBusy,
    applyCropWithToast,
    cancelCrop,
    splitWithToast,
    copySelectionWithToast,
    cutSelectionWithToast,
  } = useImageCropCtx();
  const selected = state?.selected;
  const layer =
    selected?.kind === "layer"
      ? (state.doc?.layers || []).find((l) => l.id === selected.id)
      : null;

  const toolLabel = {
    move: "Mover",
    "select-rect": "Selección rectangular",
    "select-ellipse": "Selección elíptica",
    "select-lasso": "Selección de lazo",
    "select-poly": "Lazo poligonal",
    "select-magnetic": "Lazo magnético",
    text: "Texto",
    shape: "Forma",
    image: "Imagen",
    crop: "Recortar capa",
    cut: "Cortar selección",
    eyedropper: "Gotero — tomar color",
  }[activeTool] || "Herramienta";

  const activeSwatch = activeColorSlot === "background" ? backgroundColor : foregroundColor;

  const hasActiveSelection =
    Boolean(cropDraft) ||
    (Boolean(docSelection && docSelection.w >= 2) && layer?.type === "image");

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

      {isSelectionTool(activeTool) && hasActiveSelection ? (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="contained"
            disabled={cropBusy}
            onClick={applyCropWithToast}
            sx={{ fontSize: 11, py: 0.25 }}
          >
            Aplicar recorte
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={cropBusy}
            onClick={copySelectionWithToast}
            sx={{ fontSize: 11, py: 0.25, color: PE.text, borderColor: PE.borderLight }}
          >
            Copiar capa (Ctrl+J)
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={cropBusy}
            onClick={cutSelectionWithToast}
            sx={{ fontSize: 11, py: 0.25, color: PE.text, borderColor: PE.borderLight }}
          >
            Cortar (Ctrl+Shift+J)
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={cropBusy}
            onClick={cancelCrop}
            sx={{ fontSize: 11, py: 0.25, color: PE.text, borderColor: PE.borderLight }}
          >
            Cancelar
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={cropBusy}
            onClick={() => splitWithToast("horizontal")}
            sx={{ fontSize: 11, py: 0.25, color: PE.text, borderColor: PE.borderLight }}
          >
            Dividir ↔
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={cropBusy}
            onClick={() => splitWithToast("vertical")}
            sx={{ fontSize: 11, py: 0.25, color: PE.text, borderColor: PE.borderLight }}
          >
            Dividir ↕
          </Button>
        </Stack>
      ) : activeTool === "eyedropper" ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 18,
              height: 18,
              borderRadius: 0.5,
              background: activeSwatch,
              border: "1px solid rgba(255,255,255,0.4)",
            }}
          />
          <Typography sx={{ fontSize: 11, color: PE.textMuted }}>
            Clic en el canvas para tomar color · {activeSwatch}
          </Typography>
        </Stack>
      ) : isSelectionTool(activeTool) && !hasActiveSelection ? (
        <Typography sx={{ fontSize: 11, color: PE.textMuted }}>
          {activeTool === "select-rect" || activeTool === "select-ellipse"
            ? "Selecciona capa de imagen · arrastra sobre ella o en el lienzo · Ctrl+J copiar selección"
            : activeTool === "crop"
              ? "Selecciona una capa de imagen y pulsa Recortar (C)"
              : "Selecciona una capa de imagen y arrastra la selección · M rect · L lazo · C recortar"}
        </Typography>
      ) : layer ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 11, color: PE.textMuted }}>Capa:</Typography>
          <Typography noWrap sx={{ fontSize: 11, color: PE.text, fontWeight: 600, maxWidth: 160 }}>
            {layer.name || layer.id}
          </Typography>
          <Chip size="small" label={layer.type} sx={{ height: 20, fontSize: 10 }} />
          <Typography sx={{ fontSize: 11, color: PE.textMuted }}>
            {Math.round(layer.x || 0)}, {Math.round(layer.y || 0)} · {Math.round(layer.w || 0)}×
            {Math.round(layer.h || 0)}
          </Typography>
          <Typography sx={{ fontSize: 10, color: PE.textMuted, ml: 1 }}>
            Ctrl+J duplicar · Ctrl+Z deshacer · Supr borrar
          </Typography>
        </Stack>
      ) : (
        <Typography sx={{ fontSize: 11, color: PE.textMuted }}>
          Shift+arrastrar grupo · Arrastra capas para mover · Usa handles para redimensionar
        </Typography>
      )}
    </Box>
  );
}
