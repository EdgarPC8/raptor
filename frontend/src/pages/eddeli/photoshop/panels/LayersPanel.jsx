import React, { useMemo, useState } from "react";
import {
  Box,
  Stack,
  TextField,
  Tooltip,
  IconButton,
  Divider,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import ImageIcon from "@mui/icons-material/Image";
import ShapeLineIcon from "@mui/icons-material/ShapeLine";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";

import { useEditor } from "../EditorProvider";
import SimpleDialog from "../../../../components/Dialogs/SimpleDialog";
import { useEditorImageUpload } from "../useEditorImageUpload.jsx";
import { PE } from "../editorTheme";

function LayerThumb({ layer }) {
  const fill =
    layer.type === "shape"
      ? layer.props?.fill || "#888"
      : layer.type === "text"
      ? "#5a7a9a"
      : "#6a6a6a";
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        flexShrink: 0,
        borderRadius: 0.5,
        border: `1px solid ${PE.borderLight}`,
        background: fill,
        display: "grid",
        placeItems: "center",
        fontSize: 9,
        color: "#fff",
        fontWeight: 800,
        textTransform: "uppercase",
      }}
    >
      {layer.type === "text" ? "T" : layer.type === "image" ? "I" : "S"}
    </Box>
  );
}

export default function LayersPanel() {
  const { state, dispatch, deleteLayer, foregroundColor } = useEditor();
  const { uploading, openFilePicker, HiddenFileInput } = useEditorImageUpload();
  const { doc, selected, dragId } = state;

  const [layerToDelete, setLayerToDelete] = useState(null);

  const selectedLayer =
    selected?.kind === "layer"
      ? doc.layers.find((l) => l.id === selected.id)
      : null;

  const sortedLayers = useMemo(() => {
    return [...doc.layers].sort((a, b) => {
      const za = a.zIndex || 0;
      const zb = b.zIndex || 0;
      if (za !== zb) return zb - za;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [doc.layers]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <HiddenFileInput />
      {/* Acciones capa — estilo Photopea footer */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 0.25,
          pb: 0.75,
          borderBottom: `1px solid ${PE.border}`,
        }}
      >
        <Tooltip title="Añadir capa de texto">
          <IconButton
            size="small"
            onClick={() => dispatch({ type: "ADD_LAYER", layerType: "text" })}
            sx={{
              color: PE.text,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${PE.borderLight}`,
              borderRadius: 0.5,
              "&:hover": { background: "rgba(255,255,255,0.12)" },
            }}
          >
            <TextFieldsIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Subir imagen (PNG/JPG/SVG)">
          <IconButton
            size="small"
            disabled={uploading}
            onClick={() => openFilePicker("add")}
            sx={{
              color: PE.text,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${PE.borderLight}`,
              borderRadius: 0.5,
              "&:hover": { background: "rgba(255,255,255,0.12)" },
            }}
          >
            <ImageIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Añadir capa de forma">
          <IconButton
            size="small"
            onClick={() =>
              dispatch({
                type: "ADD_LAYER",
                layerType: "shape",
                propsPatch: { fill: foregroundColor },
              })
            }
            sx={{
              color: PE.text,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${PE.borderLight}`,
              borderRadius: 0.5,
              "&:hover": { background: "rgba(255,255,255,0.12)" },
            }}
          >
            <ShapeLineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor: PE.border, mb: 0.5 }} />

      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <Stack spacing={0.25}>
          {sortedLayers.length === 0 ? (
            <Box sx={{ p: 2, textAlign: "center", color: PE.textMuted, fontSize: 11 }}>
              Sin capas. Usa la barra izquierda o Capa → Nueva.
            </Box>
          ) : (
            sortedLayers.map((l) => (
              <Box
                key={l.id}
                draggable
                onDragStart={() => dispatch({ type: "SET_DRAG_ID", dragId: l.id })}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dispatch({ type: "REORDER_BY_DROP", fromId: dragId, toId: l.id })}
                onClick={() => dispatch({ type: "SET_SELECTED", selected: { kind: "layer", id: l.id } })}
                sx={{
                  px: 0.5,
                  py: 0.4,
                  borderRadius: 0.5,
                  background: selectedLayer?.id === l.id ? "rgba(74,158,255,0.2)" : "transparent",
                  border: selectedLayer?.id === l.id ? `1px solid ${PE.accent}` : "1px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  cursor: "pointer",
                  "&:hover": { background: "rgba(255,255,255,0.05)" },
                }}
              >
                <LayerThumb layer={l} />

                <Tooltip title={l.visible ? "Ocultar" : "Mostrar"}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: "TOGGLE_VISIBLE", layerId: l.id });
                    }}
                    sx={{ color: l.visible ? PE.text : PE.textMuted, p: 0.25 }}
                  >
                    {l.visible ? <VisibilityIcon sx={{ fontSize: 16 }} /> : <VisibilityOffIcon sx={{ fontSize: 16 }} />}
                  </IconButton>
                </Tooltip>

                <TextField
                  size="small"
                  value={l.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    dispatch({ type: "UPDATE_LAYER", layerId: l.id, patch: { name: e.target.value } })
                  }
                  variant="standard"
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    "& .MuiInputBase-root": { fontSize: 11, color: PE.text },
                    "& .MuiInput-underline:before": { borderColor: PE.borderLight },
                  }}
                />

                <Tooltip title={l.locked ? "Desbloquear" : "Bloquear"}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: "TOGGLE_LOCKED", layerId: l.id });
                    }}
                    sx={{ color: l.locked ? "#ffb74d" : PE.textMuted, p: 0.25 }}
                  >
                    {l.locked ? <LockIcon sx={{ fontSize: 16 }} /> : <LockOpenIcon sx={{ fontSize: 16 }} />}
                  </IconButton>
                </Tooltip>

                <Tooltip title="Eliminar">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLayerToDelete(l);
                    }}
                    sx={{ color: PE.danger, p: 0.25 }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            ))
          )}
        </Stack>
      </Box>

      {/* CONFIRMACIÓN */}
      <SimpleDialog
        open={!!layerToDelete}
        onClose={() => setLayerToDelete(null)}
        tittle="Eliminar capa"
        message={`¿Deseas eliminar la capa "${layerToDelete?.name}"? Esta acción no se puede deshacer.`}
        onClickAccept={() => {
          deleteLayer(layerToDelete.id);
          setLayerToDelete(null);
        }}
      />
    </Box>
  );
}
