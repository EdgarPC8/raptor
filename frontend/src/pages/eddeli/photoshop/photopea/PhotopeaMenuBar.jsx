import React, { useState } from "react";
import { Box, Button, Typography, CircularProgress } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ImageIcon from "@mui/icons-material/Image";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { APP_ROUTES } from "../../../../config/appRoutes.js";
import { PE } from "../editorTheme.js";

const menuBtn = {
  px: 1.25,
  py: 0.5,
  fontSize: 12,
  color: PE.text,
  cursor: "pointer",
  userSelect: "none",
  "&:hover": { background: "rgba(255,255,255,0.08)" },
};

export default function PhotopeaMenuBar({ templateName, templateId }) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    const api = window.__photopeaEditor;
    if (!api || busy) return;
    setBusy(true);
    try {
      await fn(api);
    } finally {
      setTimeout(() => setBusy(false), 400);
    }
  };

  return (
    <Box
      sx={{
        height: PE.menuH,
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 0.5,
        background: PE.bgMenu,
        borderBottom: `1px solid ${PE.border}`,
        flexShrink: 0,
      }}
    >
      <Box onClick={() => nav(APP_ROUTES.promoDesign.templates)} sx={menuBtn}>
        <ArrowBackIcon sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }} />
        Plantillas
      </Box>

      <Typography
        noWrap
        sx={{
          fontSize: 11,
          color: PE.textMuted,
          px: 1,
          maxWidth: 220,
        }}
      >
        {templateName || `Plantilla #${templateId}`}
      </Typography>

      <Box sx={{ flex: 1 }} />

      <Button
        size="small"
        variant="contained"
        disabled={busy}
        startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}
        onClick={() => run((api) => api.savePsd())}
        sx={{ fontSize: 11, py: 0.25, minWidth: 100 }}
      >
        Guardar
      </Button>

      <Button
        size="small"
        variant="outlined"
        disabled={busy}
        startIcon={<ImageIcon sx={{ fontSize: 16 }} />}
        onClick={() => run((api) => api.exportPng())}
        sx={{ fontSize: 11, py: 0.25, color: PE.text, borderColor: PE.borderLight }}
      >
        PNG
      </Button>

      <Typography sx={{ fontSize: 10, color: PE.textMuted, px: 1 }}>Ctrl+S</Typography>
    </Box>
  );
}
