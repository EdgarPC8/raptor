import React from "react";
import { Box, Tooltip, IconButton, Divider, CircularProgress } from "@mui/material";
import NearMeIcon from "@mui/icons-material/NearMe";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import ImageIcon from "@mui/icons-material/Image";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import CropDinIcon from "@mui/icons-material/CropDin";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import WallpaperIcon from "@mui/icons-material/Wallpaper";
import ColorizeIcon from "@mui/icons-material/Colorize";
import FormatColorFillIcon from "@mui/icons-material/FormatColorFill";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import PolylineIcon from "@mui/icons-material/Polyline";
import { useEditor } from "../EditorProvider";
import { PE } from "../editorTheme";
import { useEditorImageUpload } from "../useEditorImageUpload.jsx";
import { fetchMediaCatalog } from "../../../../api/publicidadRequest.js";
import ColorSwatches from "./ColorSwatches";
import ToolGroupButton from "./ToolGroupButton";

const SELECT_TOOLS = [
  {
    id: "select-rect",
    icon: CropDinIcon,
    label: "Selección rectangular — separar capas",
    shortcut: "M",
  },
  {
    id: "select-ellipse",
    icon: RadioButtonUncheckedIcon,
    label: "Selección elíptica — separar capas",
    shortcut: "Shift+M",
  },
];

const TOOLS = [
  { id: "text", icon: TextFieldsIcon, label: "Texto (T)" },
  { id: "shape", icon: CropSquareIcon, label: "Capa de color / fondo (U)" },
  { id: "svg", icon: PolylineIcon, label: "Subir SVG — vector (S)" },
  { id: "image", icon: ImageIcon, label: "Subir imagen PNG/JPG/WebP (I)" },
  { id: "gallery", icon: PhotoLibraryIcon, label: "Usar imagen del sistema" },
  { id: "paint-bucket", icon: FormatColorFillIcon, label: "Bote de pintura — rellenar capa (K)" },
  { id: "eyedropper", icon: ColorizeIcon, label: "Gotero — tomar color (G)" },
];

export default function LeftToolbar() {
  const {
    activeTool,
    setActiveTool,
    dispatch,
    addBackgroundLayer,
    foregroundColor,
    backgroundColor,
    activeColorSlot,
    setForegroundColor,
    setBackgroundColor,
    setActiveColorSlot,
    swapColors,
  } = useEditor();
  const { uploading, openFilePicker, HiddenFileInput } = useEditorImageUpload();

  const onToolClick = async (toolId) => {
    if (toolId === "eyedropper" || toolId === "paint-bucket") {
      setActiveTool(toolId);
      return;
    }

    setActiveTool(toolId);
    if (toolId === "text") dispatch({ type: "ADD_LAYER", layerType: "text" });
    if (toolId === "shape") {
      dispatch({
        type: "ADD_LAYER",
        layerType: "shape",
        propsPatch: { fill: foregroundColor },
        layerPatch: { w: 500, h: 180, name: "Capa de color" },
      });
    }
    if (toolId === "svg") openFilePicker("add-svg");
    if (toolId === "image") openFilePicker("add-raster");
    if (toolId === "gallery") {
      try {
        const data = await fetchMediaCatalog();
        const items = [...(data?.products || []), ...(data?.images || [])]
          .filter((item) => item?.previewUrl || item?.mediaPath)
          .slice(0, 40);
        const item = items[0];
        if (!item) return;
        const src = item.previewUrl || item.mediaPath || "";
        dispatch({
          type: "ADD_LAYER",
          layerType: "image",
          propsPatch: { src, fit: "contain" },
          layerPatch: { w: 500, h: 500, name: item.title || item.subtitle || "Imagen del sistema" },
          clearBind: true,
        });
      } catch (err) {
        console.error("No se pudo cargar imagen del sistema", err);
      }
    }
  };

  const btnSx = (active) => ({
    width: 36,
    height: 36,
    borderRadius: 0.5,
    color: active ? "#fff" : PE.textMuted,
    background: active ? PE.accent : "transparent",
    "&:hover": { background: active ? PE.accentHover : "rgba(255,255,255,0.08)" },
  });

  const selectToolActive =
    activeTool === "select-rect" || activeTool === "select-ellipse"
      ? activeTool
      : null;

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

      <Tooltip title="Seleccionar capa (V) — posición/tamaño en el inspector" placement="right">
        <IconButton size="small" onClick={() => setActiveTool("select")} sx={btnSx(activeTool === "select" || activeTool === "move")}>
          <NearMeIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <ToolGroupButton
        tools={SELECT_TOOLS}
        activeId={selectToolActive}
        onSelect={(id) => setActiveTool(id)}
      />

      {TOOLS.map(({ id, icon: Icon, label }) => (
        <Tooltip key={id} title={label} placement="right">
          <span>
            <IconButton
              size="small"
              disabled={uploading && (id === "image" || id === "svg")}
              onClick={() => onToolClick(id)}
              sx={btnSx(activeTool === id)}
            >
              {uploading && (id === "image" || id === "svg") ? (
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
