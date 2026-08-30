import React, { useRef, useState } from "react";
import { Box, Menu, MenuItem, Typography, Divider } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useEditor } from "../EditorProvider";
import { useAuth } from "../../../../context/AuthContext";
import { APP_ROUTES } from "../../../../config/appRoutes.js";
import { PE } from "../editorTheme";
import { useEditorImageUpload } from "../useEditorImageUpload.jsx";
import { useImageCropCtx } from "../useImageCrop.jsx";

const menuBtn = {
  px: 1.25,
  py: 0.5,
  fontSize: 12,
  color: PE.text,
  cursor: "pointer",
  userSelect: "none",
  "&:hover": { background: "rgba(255,255,255,0.08)" },
};

export default function EditorMenuBar() {
  const nav = useNavigate();
  const { id } = useParams();
  const { toast } = useAuth();
  const {
    dispatch,
    addBackgroundLayer,
    saveTemplateDoc,
    exportAsImage,
    downloadTemplateJson,
    importTemplateJson,
    undo,
    redo,
    canUndo,
    canRedo,
    state,
    foregroundColor,
  } = useEditor();
  const { openFilePicker, HiddenFileInput } = useEditorImageUpload();
  const { startCrop } = useImageCropCtx();

  const fileRef = useRef(null);
  const [fileAnchor, setFileAnchor] = useState(null);
  const [editAnchor, setEditAnchor] = useState(null);
  const [layerAnchor, setLayerAnchor] = useState(null);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    await toast({
      promise: saveTemplateDoc(),
      successMessage: "Plantilla guardada",
      errorMessage: "No se pudo guardar",
    });
    setSaving(false);
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      await toast({
        promise: importTemplateJson(text),
        successMessage: "JSON importado",
        errorMessage: "Error al importar",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const docName = state?.doc?.meta?.name || `Plantilla #${id || "?"}`;

  return (
    <Box
      sx={{
        height: PE.menuH,
        display: "flex",
        alignItems: "center",
        background: PE.bgMenu,
        borderBottom: `1px solid ${PE.border}`,
        px: 0.5,
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          color: PE.textMuted,
          px: 1,
          maxWidth: 180,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {docName}
      </Typography>

      <Box onClick={(e) => setFileAnchor(e.currentTarget)} sx={menuBtn}>
        Archivo
      </Box>
      <Box onClick={(e) => setEditAnchor(e.currentTarget)} sx={menuBtn}>
        Editar
      </Box>
      <Box onClick={(e) => setLayerAnchor(e.currentTarget)} sx={menuBtn}>
        Capa
      </Box>
      <Box onClick={() => nav(APP_ROUTES.promoDesign.templates)} sx={menuBtn}>
        Plantillas
      </Box>

      <Menu anchorEl={fileAnchor} open={Boolean(fileAnchor)} onClose={() => setFileAnchor(null)}>
        <MenuItem disabled={saving} onClick={() => { setFileAnchor(null); onSave(); }}>
          Guardar
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setFileAnchor(null); exportAsImage("png"); }}>Exportar PNG</MenuItem>
        <MenuItem onClick={() => { setFileAnchor(null); exportAsImage("jpg"); }}>Exportar JPG</MenuItem>
        <Divider />
        <MenuItem onClick={() => { setFileAnchor(null); downloadTemplateJson(); }}>Descargar JSON</MenuItem>
        <MenuItem onClick={() => { setFileAnchor(null); fileRef.current?.click(); }}>Importar JSON</MenuItem>
      </Menu>

      <Menu anchorEl={editAnchor} open={Boolean(editAnchor)} onClose={() => setEditAnchor(null)}>
        <MenuItem
          disabled={!canUndo}
          onClick={() => {
            setEditAnchor(null);
            undo();
          }}
        >
          Deshacer (Ctrl+Z)
        </MenuItem>
        <MenuItem
          disabled={!canRedo}
          onClick={() => {
            setEditAnchor(null);
            redo();
          }}
        >
          Rehacer (Ctrl+Shift+Z)
        </MenuItem>
      </Menu>

      <Menu anchorEl={layerAnchor} open={Boolean(layerAnchor)} onClose={() => setLayerAnchor(null)}>
        <MenuItem onClick={() => { setLayerAnchor(null); openFilePicker("add"); }}>
          Subir imagen (PNG/JPG/SVG)…
        </MenuItem>
        <MenuItem
          onClick={() => {
            setLayerAnchor(null);
            const sel = state.selected?.kind === "layer" ? state.selected.id : null;
            if (sel) startCrop(sel);
          }}
        >
          Recortar capa imagen…
        </MenuItem>
        <MenuItem onClick={() => { setLayerAnchor(null); dispatch({ type: "ADD_LAYER", layerType: "text" }); }}>
          Nueva capa de texto
        </MenuItem>
        <MenuItem onClick={() => { setLayerAnchor(null); dispatch({ type: "ADD_LAYER", layerType: "image" }); }}>
          Capa imagen vacía (placeholder)
        </MenuItem>
        <MenuItem
          onClick={() => {
            setLayerAnchor(null);
            dispatch({
              type: "ADD_LAYER",
              layerType: "shape",
              propsPatch: { fill: foregroundColor },
            });
          }}
        >
          Nueva forma
        </MenuItem>
        <MenuItem onClick={() => { setLayerAnchor(null); addBackgroundLayer(); }}>
          Fondo del documento (A4)
        </MenuItem>
      </Menu>

      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
      <HiddenFileInput />
    </Box>
  );
}
