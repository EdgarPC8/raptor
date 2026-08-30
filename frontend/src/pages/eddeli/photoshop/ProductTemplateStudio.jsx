/**
 * Vista con productos: elige plantilla y producto, previsualiza y exporta.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { APP_ROUTES } from "../../../config/appRoutes.js";

import { EditorProvider, useEditor } from "./EditorProvider";
import CanvasViewport from "./canvas/CanvasViewport";
import EditorToolbar from "./panels/EditorToolbar";
import ProductSelector from "./panels/ProductSelector";
import { getEditorTemplates } from "../../../api/editorRequest";
import { settingsFromRow, TEMPLATE_KIND_LABELS } from "./templateSettings";

export default function ProductTemplateStudio() {
  return (
    <EditorProvider autoload={false}>
      <StudioLayout />
    </EditorProvider>
  );
}

function StudioLayout() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { loadTemplateById, requiresProduct, state } = useEditor();

  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [loadError, setLoadError] = useState("");

  const queryTemplateId = searchParams.get("templateId") || "";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingList(true);
        const res = await getEditorTemplates({ isActive: true, limit: 200 });
        const rows = Array.isArray(res?.data?.rows) ? res.data.rows : Array.isArray(res?.data) ? res.data : [];
        if (!alive) return;
        setTemplates(rows);

        const fromQuery =
          queryTemplateId && rows.some((t) => String(t.id) === String(queryTemplateId))
            ? String(queryTemplateId)
            : "";
        const defaultTpl = rows.find((t) => t.isDefault) || rows[0];
        const initialId = fromQuery || (defaultTpl?.id ? String(defaultTpl.id) : "");
        if (initialId) setTemplateId(initialId);
      } catch (e) {
        console.error(e);
        if (alive) setTemplates([]);
      } finally {
        if (alive) setLoadingList(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      queryTemplateId &&
      queryTemplateId !== templateId &&
      templates.some((t) => String(t.id) === queryTemplateId)
    ) {
      setTemplateId(String(queryTemplateId));
    }
  }, [queryTemplateId, templates, templateId]);

  const handleTemplateChange = (nextId) => {
    setTemplateId(String(nextId));
    setSearchParams(nextId ? { templateId: String(nextId) } : {}, { replace: true });
  };

  useEffect(() => {
    if (!templateId) return;
    let alive = true;
    (async () => {
      try {
        setLoadingTemplate(true);
        setLoadError("");
        await loadTemplateById(templateId);
      } catch (e) {
        console.error(e);
        if (alive) setLoadError(`No se pudo cargar la plantilla #${templateId}.`);
      } finally {
        if (alive) setLoadingTemplate(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => String(t.id) === String(templateId)) || null,
    [templates, templateId]
  );

  const showProductSelector = requiresProduct;
  const gridColumns = showProductSelector ? "280px 1fr" : "1fr";

  return (
    <Box
      sx={{
        height: "100vh",
        display: "grid",
        gridTemplateRows: "auto auto 1fr",
        gridTemplateColumns: gridColumns,
        overflow: "hidden",
        minHeight: 0,
        background: "#0b0f14",
      }}
    >
      <Box sx={{ gridColumn: "1 / -1", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <EditorToolbar exportOnly />
      </Box>

      <Box
        sx={{
          gridColumn: "1 / -1",
          px: 2,
          py: 1,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
          <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: 14, minWidth: 160 }}>
            Vista con productos
          </Typography>

          {loadingList ? (
            <CircularProgress size={18} sx={{ color: "#fff" }} />
          ) : (
            <FormControl size="small" sx={{ minWidth: 280, flex: 1 }}>
              <InputLabel id="studio-template-select">Plantilla</InputLabel>
              <Select
                labelId="studio-template-select"
                label="Plantilla"
                value={templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                disabled={!templates.length}
              >
                {templates.map((t) => {
                  const settings = settingsFromRow(t);
                  return (
                    <MenuItem key={t.id} value={String(t.id)}>
                      {t.name || `Plantilla #${t.id}`}
                      {t.isDefault ? " ★ default" : ""}
                      {settings.templateKind
                        ? ` · ${TEMPLATE_KIND_LABELS[settings.templateKind] || settings.templateKind}`
                        : ""}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )}

          <Button size="small" variant="outlined" onClick={() => nav(APP_ROUTES.promoDesign.templates)}>
            Plantillas
          </Button>
        </Stack>
      </Box>

      {showProductSelector && <ProductSelector autoSelectFirst={true} />}

      <Box
        sx={{
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
          gridColumn: showProductSelector ? undefined : "1 / -1",
        }}
      >
        <Box sx={{ height: "100%", p: 2, minHeight: 0, overflow: "hidden", position: "relative" }}>
          {(loadingTemplate || loadingList) && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                zIndex: 5,
                background: "rgba(11,15,20,0.55)",
              }}
            >
              <CircularProgress size={28} sx={{ color: "#fff" }} />
            </Box>
          )}

          {loadError ? (
            <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
              <Typography sx={{ color: "#ffb4b4" }}>{loadError}</Typography>
            </Box>
          ) : templates.length === 0 ? (
            <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
              <Button variant="contained" onClick={() => nav(APP_ROUTES.promoDesign.templates)}>
                Ir a Plantillas
              </Button>
            </Box>
          ) : (
            <CanvasViewport readOnly />
          )}

          {state?.doc?.meta?.name && !loadError && templates.length > 0 && (
            <Box sx={{ position: "absolute", top: 12, left: 12, zIndex: 4 }}>
              <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
                {state.doc.meta.name}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
