import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  PHOTOPEA_ORIGIN,
  buildPhotopeaUrl,
  scriptNewDocument,
  scriptSavePsdToOE,
  scriptSavePngToOE,
  scriptSetSource,
  isPsdBuffer,
  isPngBuffer,
} from "./photopeaBridge.js";
import { fetchTemplatePsd, saveTemplatePsd } from "../../../../api/editorRequest.js";
import { PE } from "../editorTheme.js";

const BOOT_TIMEOUT_MS = 25000;

function isPhotopeaReadyMessage(data) {
  return data === "done" || data === '"done"';
}

/**
 * Editor Photopea embebido (Photoshop en el navegador).
 * Guarda/carga PSD en el backend por templateId.
 */
export default function PhotopeaEditor({
  templateId,
  templateName = "Plantilla",
  canvasWidth = 1920,
  canvasHeight = 1080,
  onSaved,
  onError,
}) {
  const iframeRef = useRef(null);
  const readyRef = useRef(false);
  const queueRef = useRef([]);
  const pendingOpRef = useRef(null);
  const loadedRef = useRef(false);
  const bootTimerRef = useRef(null);

  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState("");
  const [iframeKey, setIframeKey] = useState(0);
  const [status, setStatus] = useState("Iniciando Photopea…");
  const [saving, setSaving] = useState(false);

  const clearBootTimer = useCallback(() => {
    if (bootTimerRef.current) {
      clearTimeout(bootTimerRef.current);
      bootTimerRef.current = null;
    }
  }, []);

  const markReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    clearBootTimer();
    setBooting(false);
    setBootError("");
    flushQueueRef.current?.();
  }, [clearBootTimer]);

  const post = useCallback((msg) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    if (!readyRef.current) {
      queueRef.current.push(msg);
      return;
    }
    win.postMessage(msg, "*");
  }, []);

  const flushQueueRef = useRef(null);
  const flushQueue = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win || !readyRef.current) return;
    while (queueRef.current.length) {
      win.postMessage(queueRef.current.shift(), "*");
    }
  }, []);
  flushQueueRef.current = flushQueue;

  const loadDocument = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setStatus("Cargando documento…");

    try {
      const res = await fetchTemplatePsd(templateId);
      const buffer = res.data;
      if (buffer && isPsdBuffer(buffer)) {
        post(buffer);
        post(scriptSetSource(`template:${templateId}`));
        setStatus("Documento cargado");
        return;
      }
    } catch (err) {
      const code = err?.response?.status;
      if (code && code !== 404) {
        console.warn("fetchTemplatePsd:", err);
      }
    }

    post(scriptNewDocument(canvasWidth, canvasHeight, templateName));
    post(scriptSetSource(`template:${templateId}`));
    setStatus("Nuevo documento");
  }, [canvasWidth, canvasHeight, post, templateId, templateName]);

  const handleReady = useCallback(() => {
    markReady();
    loadDocument();
  }, [loadDocument, markReady]);

  const handlePsdBuffer = useCallback(
    async (buffer) => {
      setSaving(true);
      setStatus("Guardando PSD…");
      try {
        await saveTemplatePsd(templateId, buffer);
        setStatus("Guardado");
        onSaved?.();
      } catch (err) {
        console.error(err);
        setStatus("Error al guardar");
        onError?.(err);
      } finally {
        setSaving(false);
        pendingOpRef.current = null;
      }
    },
    [onError, onSaved, templateId]
  );

  const handlePngBuffer = useCallback(
    (buffer) => {
      const blob = new Blob([buffer], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${templateName || "diseno"}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("PNG exportado");
      pendingOpRef.current = null;
    },
    [templateName]
  );

  useEffect(() => {
    readyRef.current = false;
    loadedRef.current = false;
    queueRef.current = [];
    setBooting(true);
    setBootError("");
    setStatus("Iniciando Photopea…");

    clearBootTimer();
    bootTimerRef.current = setTimeout(() => {
      if (readyRef.current) return;
      setBootError(
        "Photopea no respondió. Comprueba tu conexión a internet y que photopea.com no esté bloqueado."
      );
      setBooting(false);
    }, BOOT_TIMEOUT_MS);

    return clearBootTimer;
  }, [templateId, iframeKey, clearBootTimer]);

  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin !== PHOTOPEA_ORIGIN) return;

      if (isPhotopeaReadyMessage(e.data)) {
        handleReady();
        return;
      }

      if (e.data instanceof ArrayBuffer) {
        if (pendingOpRef.current === "psd" && isPsdBuffer(e.data)) {
          handlePsdBuffer(e.data);
          return;
        }
        if (pendingOpRef.current === "png" && isPngBuffer(e.data)) {
          handlePngBuffer(e.data);
          return;
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handlePngBuffer, handlePsdBuffer, handleReady]);

  const savePsd = useCallback(() => {
    if (saving || !readyRef.current) return;
    pendingOpRef.current = "psd";
    post(scriptSavePsdToOE());
  }, [post, saving]);

  const exportPng = useCallback(() => {
    if (!readyRef.current) return;
    pendingOpRef.current = "png";
    post(scriptSavePngToOE());
  }, [post]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      savePsd();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [savePsd]);

  useEffect(() => {
    window.__photopeaEditor = { savePsd, exportPng, saving, ready: () => readyRef.current };
    return () => {
      delete window.__photopeaEditor;
    };
  }, [exportPng, savePsd, saving]);

  const iframeSrc = buildPhotopeaUrl({
    environment: { lang: "es", intro: true, vmode: 0 },
  });

  const retry = () => {
    readyRef.current = false;
    loadedRef.current = false;
    queueRef.current = [];
    setBootError("");
    setBooting(true);
    setStatus("Reiniciando Photopea…");
    setIframeKey((k) => k + 1);
  };

  return (
    <Box sx={{ position: "relative", flex: 1, minHeight: 0, width: "100%" }}>
      {(booting || saving) && !bootError && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            display: "grid",
            placeItems: "center",
            background: "rgba(0,0,0,0.45)",
            pointerEvents: saving ? "auto" : "none",
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress size={36} sx={{ color: PE.accent }} />
            <Typography sx={{ mt: 1, fontSize: 12, color: "#fff" }}>{status}</Typography>
          </Box>
        </Box>
      )}

      {bootError ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            display: "grid",
            placeItems: "center",
            background: PE.bgApp,
            p: 3,
          }}
        >
          <Stack spacing={2} alignItems="center" maxWidth={420}>
            <Typography sx={{ color: PE.danger, textAlign: "center", fontSize: 14 }}>
              {bootError}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={retry}
              >
                Reintentar
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<OpenInNewIcon />}
                href={PHOTOPEA_ORIGIN}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: PE.text, borderColor: PE.borderLight }}
              >
                Abrir Photopea
              </Button>
            </Stack>
          </Stack>
        </Box>
      ) : null}

      <Box
        component="iframe"
        key={iframeKey}
        ref={iframeRef}
        src={iframeSrc}
        title="Photopea"
        allow="clipboard-read; clipboard-write"
        onLoad={() => setStatus("Conectando con Photopea…")}
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: 0,
          display: "block",
          background: "#474747",
        }}
      />
    </Box>
  );
}
