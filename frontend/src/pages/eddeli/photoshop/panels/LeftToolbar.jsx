import React from "react";
import { Box, Tooltip, IconButton, Divider, CircularProgress } from "@mui/material";
import NearMeIcon from "@mui/icons-material/NearMe";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import ImageIcon from "@mui/icons-material/Image";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import WallpaperIcon from "@mui/icons-material/Wallpaper";
import CropIcon from "@mui/icons-material/Crop";
import ColorizeIcon from "@mui/icons-material/Colorize";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import CropFreeIcon from "@mui/icons-material/CropFree";
import PanoramaFishEyeIcon from "@mui/icons-material/PanoramaFishEye";
import GestureIcon from "@mui/icons-material/Gesture";
import PolylineIcon from "@mui/icons-material/Timeline";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { useEditor } from "../EditorProvider";
import { useImageCropCtx } from "../useImageCrop.jsx";
import { PE } from "../editorTheme";
import { useEditorImageUpload } from "../useEditorImageUpload.jsx";
import { isSelectionTool, SELECTION_TOOL_IDS } from "../editorCursors.js";
import ColorSwatches from "./ColorSwatches";
import ToolGroupButton from "./ToolGroupButton";

const SELECTION_TOOLS = [
  { id: "select-rect", icon: CropFreeIcon, label: "Selección rectangular", shortcut: "M" },
  { id: "select-ellipse", icon: PanoramaFishEyeIcon, label: "Selección elíptica", shortcut: "M" },
  { id: "select-lasso", icon: GestureIcon, label: "Selección de lazo", shortcut: "L" },
  { id: "select-poly", icon: PolylineIcon, label: "Selección de lazo poligonal", shortcut: "L" },
  { id: "select-magnetic", icon: AutoFixHighIcon, label: "Selección de lazo magnético", shortcut: "L" },
];

const OTHER_TOOLS = [
  { id: "text", icon: TextFieldsIcon, label: "Texto (T)" },
  { id: "shape", icon: CropSquareIcon, label: "Forma / Fondo (U)" },
  { id: "image", icon: ImageIcon, label: "Subir imagen PNG/JPG/SVG (I)" },
  { id: "crop", icon: CropIcon, label: "Recortar capa (C)" },
  { id: "cut", icon: ContentCutIcon, label: "Cortar selección (Ctrl+Shift+J)" },
  { id: "eyedropper", icon: ColorizeIcon, label: "Gotero — tomar color (G)" },
];

export default function LeftToolbar() {
  const {
    activeTool,
    setActiveTool,
    dispatch,
    addBackgroundLayer,
    state,
    foregroundColor,
    backgroundColor,
    activeColorSlot,
    setForegroundColor,
    setBackgroundColor,
    setActiveColorSlot,
    swapColors,
  } = useEditor();
  const { startCropSelected, cancelCrop, clearDocSelection, cancelSelection, cutSelectionWithToast, cropDraft, cropBusy } =
    useImageCropCtx();
  const { uploading, openFilePicker, HiddenFileInput } = useEditorImageUpload();

  const activeSelectionId = SELECTION_TOOL_IDS.includes(activeTool) ? activeTool : null;

  const activateSelectionTool = (toolId) => {
    cancelCrop();
    clearDocSelection();
    setActiveTool(toolId);
  };

  const onToolClick = (toolId) => {
    if (toolId === "cut") {
      if (cropDraft) {
        cutSelectionWithToast();
      } else {
        activateSelectionTool("select-rect");
      }
      return;
    }

    if (toolId === "crop") {
      cancelCrop();
      setActiveTool("crop");
      const selected = state.selected?.kind === "layer" ? state.selected.id : null;
      if (selected) startCropSelected("crop");
      return;
    }

    if (toolId === "eyedropper") {
      cancelCrop();
      setActiveTool("eyedropper");
      return;
    }

    if (isSelectionTool(toolId)) {
      activateSelectionTool(toolId);
      return;
    }

    cancelCrop();
    setActiveTool(toolId);
    if (toolId === "text") dispatch({ type: "ADD_LAYER", layerType: "text" });
    if (toolId === "shape") {
      dispatch({
        type: "ADD_LAYER",
        layerType: "shape",
        propsPatch: { fill: foregroundColor },
      });
    }
    if (toolId === "image") openFilePicker("add");
  };

  const btnSx = (active) => ({
    width: 36,
    height: 36,
    borderRadius: 0.5,
    color: active ? "#fff" : PE.textMuted,
    background: active ? PE.accent : "transparent",
    "&:hover": { background: active ? PE.accentHover : "rgba(255,255,255,0.08)" },
  });

  return (
    <Box
      sx={{
        width: PE.leftToolbarW,
        height: "100%",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 0.5,
        gap: 0.25,
        background: PE.bgToolbar,
        borderRight: `1px solid ${PE.border}`,
      }}
    >
      <HiddenFileInput />

      <Tooltip title="Mover (V)" placement="right">
        <IconButton
          size="small"
          onClick={() => {
            cancelSelection();
            setActiveTool("move");
          }}
          sx={btnSx(activeTool === "move")}
        >
          <NearMeIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <ToolGroupButton
        tools={SELECTION_TOOLS}
        activeId={activeSelectionId}
        onSelect={activateSelectionTool}
        disabled={cropBusy}
      />

      {OTHER_TOOLS.map(({ id, icon: Icon, label }) => (
        <Tooltip key={id} title={label} placement="right">
          <span>
            <IconButton
              size="small"
              disabled={(uploading && id === "image") || (cropBusy && id === "cut")}
              onClick={() => onToolClick(id)}
              sx={btnSx(activeTool === id)}
            >
              {uploading && id === "image" ? (
                <CircularProgress size={18} sx={{ color: "#fff" }} />
              ) : (
                <Icon sx={{ fontSize: 20 }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      ))}

      <Box sx={{ flex: 1 }} />

      <Divider flexItem sx={{ borderColor: PE.borderLight, mb: 0.5, width: "70%" }} />

      <Tooltip title="Colores — clic para elegir · aplica a capa forma/texto" placement="right">
        <Box sx={{ mb: 0.75 }}>
          <ColorSwatches
            foreground={foregroundColor}
            background={backgroundColor}
            activeSlot={activeColorSlot}
            onSlotChange={setActiveColorSlot}
            onForegroundChange={setForegroundColor}
            onBackgroundChange={setBackgroundColor}
            onSwap={swapColors}
          />
        </Box>
      </Tooltip>

      <Divider flexItem sx={{ borderColor: PE.borderLight, my: 0.5, width: "70%" }} />

      <Tooltip title="Fondo del documento (capa blanca)" placement="right">
        <IconButton size="small" onClick={addBackgroundLayer} sx={btnSx(false)}>
          <WallpaperIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
