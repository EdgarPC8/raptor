/**
 * Editor de diseño promocional — layout estilo Photopea (capas + canvas).
 * Rutas: /diseno-promocional/editor/:id
 */
import React from "react";
import { Box, Typography, Stack, Button } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { APP_ROUTES } from "../../../config/appRoutes.js";
import { EditorProvider } from "./EditorProvider.jsx";
import { ImageCropProvider } from "./useImageCrop.jsx";
import { useEditorShortcuts } from "./useEditorShortcuts.js";
import EditorMenuBar from "./panels/EditorMenuBar.jsx";
import EditorOptionsBar from "./panels/EditorOptionsBar.jsx";
import LeftToolbar from "./panels/LeftToolbar.jsx";
import RightDock from "./panels/RightDock.jsx";
import CanvasViewport from "./canvas/CanvasViewport.jsx";
import { PE } from "./editorTheme.js";

function EditorShell() {
  useEditorShortcuts();

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: PE.bgApp,
      }}
    >
      <EditorMenuBar />
      <EditorOptionsBar />

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        <LeftToolbar />
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <CanvasViewport />
        </Box>
        <RightDock />
      </Box>
    </Box>
  );
}

export default function EditorPage() {
  const { id } = useParams();
  const nav = useNavigate();

  if (!id) {
    return (
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          placeItems: "center",
          background: PE.bgApp,
          p: 3,
        }}
      >
        <Stack spacing={2} alignItems="center" maxWidth={480}>
          <Typography sx={{ color: PE.text, fontWeight: 900, fontSize: 16, textAlign: "center" }}>
            Editor de diseño
          </Typography>
          <Typography sx={{ color: PE.textMuted, textAlign: "center", fontSize: 14 }}>
            Abre una plantilla desde <strong>Plantillas</strong> → <strong>Diseñar</strong>.
          </Typography>
          <Button variant="contained" onClick={() => nav(APP_ROUTES.promoDesign.templates)}>
            Ir a Plantillas
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <EditorProvider key={id} designId={id} autoload>
        <ImageCropProvider>
          <EditorShell />
        </ImageCropProvider>
      </EditorProvider>
    </Box>
  );
}
