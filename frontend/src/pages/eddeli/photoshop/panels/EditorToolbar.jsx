/**
 * EditorToolbar.jsx — barra del editor Photoshop (guardar, exportar).
 */
import React, { useRef, useState } from "react";
import {
  Box,
  Tooltip,
  IconButton,
  Divider,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import UploadIcon from "@mui/icons-material/Upload";
import ImageIcon from "@mui/icons-material/Image";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useEditor } from "../EditorProvider";
import { useAuth } from "../../../../context/AuthContext";

export default function EditorToolbar({ exportOnly = false }) {
  const {
    exportAsImage,
    copyTemplate,
    copyOps,
    downloadTemplateJson,
    importTemplateJson,
    saveTemplateDoc,
    stageRef,
  } = useEditor();

  const { toast } = useAuth();
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const onSave = async () => {
    setSaving(true);
    await toast({
      promise: saveTemplateDoc(),
      successMessage: "✅ Plantilla guardada en la base de datos",
      errorMessage: "❌ No se pudo guardar la plantilla",
    });
    setSaving(false);
  };

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      await toast({
        promise: importTemplateJson(text),
        successMessage: "✅ Plantilla importada correctamente",
        errorMessage: "❌ No se pudo importar el JSON.",
      });
    } catch (err) {
      console.error(err);
      toast({ info: { description: "❌ No se pudo importar el JSON." } });
    }
  };

  const exportPdfFromCanvas = async () => {
    try {
      const canvas = stageRef?.current;
      if (!canvas?.toDataURL) {
        toast({ info: { description: "No se encontró el canvas para PDF." } });
        return;
      }
      const { jsPDF } = await import("jspdf");
      const dataUrl = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`diseno_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      toast({ info: { description: "❌ No se pudo exportar PDF." } });
    }
  };

  if (exportOnly) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 1,
          py: 0.75,
          background: "rgba(0,0,0,0.4)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Tooltip title="Exportar PNG">
          <IconButton size="small" onClick={() => exportAsImage("png")} sx={{ color: "#fff" }}>
            <ImageIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Exportar JPG">
          <IconButton size="small" onClick={() => exportAsImage("jpg")} sx={{ color: "#fff" }}>
            <ImageIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Exportar PDF">
          <IconButton size="small" onClick={exportPdfFromCanvas} sx={{ color: "#fff" }}>
            <PictureAsPdfIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.75,
        background: "rgba(0,0,0,0.4)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Tooltip title="Guardar plantilla">
        <span>
          <IconButton size="small" onClick={onSave} disabled={saving} sx={{ color: "#fff" }}>
            <SaveIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.1)", mx: 0.5 }} />

      <Tooltip title="Exportar PNG">
        <IconButton size="small" onClick={() => exportAsImage("png")} sx={{ color: "#fff" }}>
          <ImageIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Exportar JPG">
        <IconButton size="small" onClick={() => exportAsImage("jpg")} sx={{ color: "#fff" }}>
          <ImageIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.1)", mx: 0.5 }} />

      <Tooltip title="Descargar JSON">
        <IconButton size="small" onClick={downloadTemplateJson} sx={{ color: "#fff" }}>
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Importar JSON">
        <span>
          <IconButton size="small" onClick={onPickFile} sx={{ color: "#fff" }}>
            <UploadIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={onFileChange} />

      <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.1)", mx: 0.5 }} />

      <Tooltip title="Copiar template JSON">
        <IconButton size="small" onClick={copyTemplate} sx={{ color: "rgba(255,255,255,0.7)" }}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Copiar ops">
        <IconButton size="small" onClick={copyOps} sx={{ color: "rgba(255,255,255,0.7)" }}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
