/**
 * Diseño Promocional — listado y gestión de plantillas del editor.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import BrushIcon from "@mui/icons-material/Brush";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { useNavigate } from "react-router-dom";
import { APP_ROUTES } from "../../../config/appRoutes.js";

import {
  getEditorTemplates,
  importEditorTemplate,
  updateEditorTemplate,
  deleteEditorTemplate,
  getEditorTemplateResolved,
} from "../../../api/editorRequest";

import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import TemplateSettingsFields from "./panels/TemplateSettingsFields";
import {
  DEFAULT_TEMPLATE_SETTINGS,
  settingsFromRow,
  TEMPLATE_KIND_LABELS,
  TEMPLATE_FORMATS,
  CUSTOM_FORMAT_KEY,
  DEFAULT_CUSTOM_CANVAS,
  getCanvasSizeByFormat,
  resolveCanvasSize,
  getFormatLabel,
  isCustomFormat,
} from "./templateSettings";

export default function EditorTemplatesView({
  editorBasePath = APP_ROUTES.promoDesign.editor,
  defaultApp = "App",
  defaultFormat = "16:9",
} = {}) {
  const nav = useNavigate();
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  // dialogs
  const [openImportDlg, setOpenImportDlg] = useState(false);
  const [openEditDlg, setOpenEditDlg] = useState(false);
  const [openDeleteDlg, setOpenDeleteDlg] = useState(false);
  const [openCreateDlg, setOpenCreateDlg] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [exportingId, setExportingId] = useState(null);
  const [creating, setCreating] = useState(false);

  const iconBtnSx = {
    color: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 1.5,
    "&:hover": {
      background: "rgba(255,255,255,0.08)",
      borderColor: "rgba(255,255,255,0.35)",
    },
    "&.Mui-disabled": { color: "rgba(255,255,255,0.3)" },
  };

  /** Doc listo para exportar/importar JSON (incluye slots/carpetas). */
  const buildExportableDoc = (resolved, tplRow = {}) => {
    const folders =
      resolved?.folders ||
      resolved?.meta?.folders ||
      settingsFromRow(tplRow).folders ||
      [];
    const layers = (resolved?.layers || []).map((l) => {
      const slot =
        l?.props?.productSlot != null
          ? Number(l.props.productSlot)
          : l?.bind?.productSlot != null
            ? Number(l.bind.productSlot)
            : null;
      const bind = l.bind
        ? {
            ...l.bind,
            ...(Number.isFinite(slot) ? { productSlot: slot } : {}),
          }
        : Number.isFinite(slot)
          ? { productSlot: slot }
          : null;
      return {
        ...l,
        folderId: l.folderId ?? l.props?.folderId ?? null,
        bind,
      };
    });

    return {
      canvas: resolved?.canvas || {
        width: tplRow.canvasWidth || 1920,
        height: tplRow.canvasHeight || 1080,
      },
      name: tplRow.name || resolved?.meta?.name || "Plantilla",
      app: tplRow.app || null,
      format: tplRow.format || null,
      meta: {
        name: tplRow.name || resolved?.meta?.name || "Plantilla",
        ...(resolved?.meta || {}),
        folders,
        templateKind:
          resolved?.meta?.templateKind || settingsFromRow(tplRow).templateKind,
        requiresProduct:
          resolved?.meta?.requiresProduct ??
          settingsFromRow(tplRow).requiresProduct,
        backgroundMode:
          resolved?.meta?.backgroundMode ||
          settingsFromRow(tplRow).backgroundMode,
      },
      folders,
      groups: resolved?.groups || [],
      layers,
      data: {},
    };
  };

  // form import
  const [importForm, setImportForm] = useState({
    name: "",
    app: defaultApp || "",
    format: defaultFormat || "",
    isDefault: false,
    isActive: true,
    templateJsonText: "",
    ...DEFAULT_TEMPLATE_SETTINGS,
  });

  // form edit
  const [editForm, setEditForm] = useState({
    id: null,
    name: "",
    app: "",
    format: "",
    isDefault: false,
    isActive: true,
    ...DEFAULT_TEMPLATE_SETTINGS,
  });

  // delete
  const [deleteTarget, setDeleteTarget] = useState(null);

  // create form
  const [createForm, setCreateForm] = useState({
    name: "",
    app: defaultApp || "",
    format: defaultFormat || "16:9",
    isDefault: false,
    isActive: true,
    templateKind: "manual",
    requiresProduct: false,
    backgroundMode: "none",
    customWidth: DEFAULT_CUSTOM_CANVAS.width,
    customHeight: DEFAULT_CUSTOM_CANVAS.height,
  });

  const openEditor = (id) => {
    if (!id) return;
    nav(`${editorBasePath}/${id}`);
  };

  const openStudio = (id) => {
    if (!id) return;
    nav(`${APP_ROUTES.promoDesign.preview}?templateId=${id}`);
  };

  const parseTemplatesResponse = (res) => {
    const arr = Array.isArray(res?.data?.rows)
      ? res.data.rows
      : Array.isArray(res?.data)
      ? res.data
      : [];
    return arr;
  };

  const fetchList = async (query = q) => {
    try {
      setLoading(true);
      setErr("");

      const res = await getEditorTemplates({
        q: query || undefined,
        limit: 200,
      });

      setRows(parseTemplatesResponse(res));
    } catch (e) {
      console.error(e);
      setRows([]);
      setErr("No se pudo cargar la lista de plantillas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = String(q || "").toLowerCase().trim();
    if (!s) return rows;

    return rows.filter((t) => {
      const name = String(t?.name || t?.title || t?.meta?.name || "").toLowerCase();
      const id = String(t?.id || "").toLowerCase();
      const app = String(t?.app || "").toLowerCase();
      const format = String(t?.format || "").toLowerCase();
      return (
        name.includes(s) ||
        id.includes(s) ||
        app.includes(s) ||
        format.includes(s)
      );
    });
  }, [rows, q]);

  const openDefault = async () => {
    try {
      const r1 = await getEditorTemplates({
        app: importForm.app || defaultApp || undefined,
        format: importForm.format || defaultFormat || undefined,
        isDefault: true,
        limit: 1,
      });
      const a1 = parseTemplatesResponse(r1);
      if (a1?.[0]?.id) return openStudio(a1[0].id);

      if (rows?.[0]?.id) return openStudio(rows[0].id);

      const r2 = await getEditorTemplates({ limit: 1 });
      const a2 = parseTemplatesResponse(r2);
      if (a2?.[0]?.id) return openStudio(a2[0].id);

      alert("No hay plantillas guardadas todavía.");
    } catch (e) {
      console.error(e);
      alert("No se pudo abrir la plantilla por defecto.");
    }
  };

  // =========================
  // IMPORT JSON
  // =========================
  const onPickFile = () => fileRef.current?.click();

  const tryExtractName = (jsonText) => {
    try {
      const obj = JSON.parse(jsonText);
      return obj?.name || obj?.meta?.name || "";
    } catch {
      return "";
    }
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      let fromMeta = {};
      try {
        const obj = JSON.parse(text);
        fromMeta = {
          name: obj?.name || obj?.meta?.name || "",
          app: obj?.app || "",
          format: obj?.format || "",
          templateKind: obj?.meta?.templateKind,
          requiresProduct: obj?.meta?.requiresProduct,
          backgroundMode: obj?.meta?.backgroundMode,
        };
      } catch {
        fromMeta = { name: tryExtractName(text) || "" };
      }
      setImportForm((p) => ({
        ...p,
        templateJsonText: text,
        name: fromMeta.name || p.name || "",
        app: fromMeta.app || p.app || defaultApp || "",
        format: fromMeta.format || p.format || defaultFormat || "",
        ...(fromMeta.templateKind ? { templateKind: fromMeta.templateKind } : {}),
        ...(typeof fromMeta.requiresProduct === "boolean"
          ? { requiresProduct: fromMeta.requiresProduct }
          : {}),
        ...(fromMeta.backgroundMode
          ? { backgroundMode: fromMeta.backgroundMode }
          : {}),
      }));
      setOpenImportDlg(true);
    } catch (error) {
      console.error(error);
      alert("No se pudo leer el archivo JSON.");
    }
  };

  const handleCreate = async () => {
    // parse JSON
    let parsed = null;
    try {
      parsed =
        typeof importForm.templateJsonText === "string"
          ? JSON.parse(importForm.templateJsonText)
          : importForm.templateJsonText;
    } catch {
      alert("El JSON no es válido.");
      return;
    }

    try {
      setSaving(true);

      const extra = {
        name:
          importForm.name ||
          parsed?.name ||
          parsed?.meta?.name ||
          "Template importado",
        app: importForm.app || parsed?.app || defaultApp || null,
        format: importForm.format || parsed?.format || defaultFormat || null,
        isDefault: !!importForm.isDefault,
        isActive: importForm.isActive !== false,
        templateKind: importForm.templateKind,
        requiresProduct: importForm.requiresProduct,
        backgroundMode: importForm.backgroundMode,
      };

      const res = await importEditorTemplate(parsed, extra);

      const createdId =
        res?.data?.id ||
        res?.data?.templateId ||
        res?.data?.template?.id ||
        null;

      setOpenImportDlg(false);
      setImportForm((p) => ({ ...p, templateJsonText: "" }));

      await fetchList(q);

      if (createdId) openEditor(createdId);
      else alert("Importado, pero el backend no devolvió el ID.");
    } catch (e) {
      console.error(e);
      alert("No se pudo importar el template.");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // DEFAULT
  // =========================
  const handleSetDefault = async (tpl) => {
    try {
      await updateEditorTemplate(tpl.id, { isDefault: true });
      await fetchList(q);
    } catch (e) {
      console.error(e);
      alert("No se pudo marcar como default.");
    }
  };

  // =========================
  // EDIT
  // =========================
  const openEdit = (tpl) => {
    if (!tpl?.id) return;
    const settings = settingsFromRow(tpl);
    setEditForm({
      id: tpl.id,
      name: tpl?.name || "",
      app: tpl?.app || defaultApp || "",
      format: tpl?.format || defaultFormat || "",
      isDefault: !!tpl?.isDefault,
      isActive: tpl?.isActive !== false,
      customWidth: tpl?.canvasWidth || DEFAULT_CUSTOM_CANVAS.width,
      customHeight: tpl?.canvasHeight || DEFAULT_CUSTOM_CANVAS.height,
      ...settings,
    });
    setOpenEditDlg(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm?.id) return;

    try {
      setSaving(true);

      // manda solo lo editable
      const payload = {
        name: editForm.name,
        app: editForm.app || null,
        format: editForm.format || null,
        isDefault: !!editForm.isDefault,
        isActive: editForm.isActive !== false,
        templateKind: editForm.templateKind,
        requiresProduct: editForm.requiresProduct,
        backgroundMode: editForm.backgroundMode,
      };

      if (isCustomFormat(editForm.format)) {
        payload.canvasWidth = Number(editForm.customWidth) || DEFAULT_CUSTOM_CANVAS.width;
        payload.canvasHeight = Number(editForm.customHeight) || DEFAULT_CUSTOM_CANVAS.height;
      }

      await updateEditorTemplate(editForm.id, payload);

      setOpenEditDlg(false);
      await fetchList(q);
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar cambios.");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // EXPORT / DUPLICATE (JSON completo)
  // =========================
  const fetchResolvedDoc = async (tpl) => {
    const res = await getEditorTemplateResolved(tpl.id);
    const resolved = res?.data?.resolved || res?.data?.doc || null;
    if (!resolved) throw new Error("Sin documento resuelto");
    return buildExportableDoc(resolved, tpl);
  };

  const handleExportJson = async (tpl) => {
    if (!tpl?.id) return;
    try {
      setExportingId(tpl.id);
      const doc = await fetchResolvedDoc(tpl);
      const safeName = String(doc.name || `plantilla_${tpl.id}`)
        .replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]+/gi, "")
        .trim()
        .replace(/\s+/g, "_")
        .slice(0, 80);
      const blob = new Blob([JSON.stringify(doc, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName || `plantilla_${tpl.id}`}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(`No se pudo exportar el JSON: ${e?.message || e}`);
    } finally {
      setExportingId(null);
    }
  };

  const handleDuplicate = async (tpl) => {
    if (!tpl?.id) return;

    try {
      setDuplicating(true);

      const templateData = await fetchResolvedDoc(tpl);
      const originalName =
        tpl?.name || tpl?.title || tpl?.meta?.name || `Template #${tpl.id}`;
      const newName = `${originalName} - Copia`;

      const settings = settingsFromRow(tpl);
      const extra = {
        name: newName,
        app: tpl?.app || defaultApp || null,
        format: tpl?.format || defaultFormat || null,
        isDefault: false,
        isActive: tpl?.isActive !== false,
        templateKind: settings.templateKind,
        requiresProduct: settings.requiresProduct,
        backgroundMode: settings.backgroundMode,
      };

      const importRes = await importEditorTemplate(templateData, extra);

      const createdId =
        importRes?.data?.id ||
        importRes?.data?.templateId ||
        importRes?.data?.template?.id ||
        null;

      await fetchList(q);

      if (createdId) {
        alert(`✅ Plantilla duplicada: "${newName}"`);
      } else {
        alert("⚠️ Duplicada, pero el backend no devolvió el ID.");
      }
    } catch (e) {
      console.error(e);
      alert(`❌ No se pudo duplicar la plantilla: ${e?.message || e}`);
    } finally {
      setDuplicating(false);
    }
  };

  // =========================
  // CREATE EMPTY TEMPLATE
  // =========================
  const createEmptyTemplate = (format, custom = {}) => {
    const canvas = resolveCanvasSize(format, custom);
    return {
      canvas,
      groups: [{ id: "group_main", x: 0, y: 0, visible: true, locked: false }],
      layers: [
        {
          id: "background",
          name: "Fondo",
          groupId: "group_main",
          type: "shape",
          x: 0,
          y: 0,
          w: canvas.width,
          h: canvas.height,
          zIndex: 0,
          props: { fill: "#FFFFFF", borderRadius: 0 },
          bind: null,
          visible: true,
          locked: false,
        },
      ],
      data: {},
      meta: { name: "Nueva plantilla", ...DEFAULT_TEMPLATE_SETTINGS },
    };
  };

  const handleCreateNew = async () => {
    if (!createForm.name?.trim()) {
      alert("Por favor ingresa un nombre para la plantilla.");
      return;
    }

    if (isCustomFormat(createForm.format)) {
      const w = Number(createForm.customWidth);
      const h = Number(createForm.customHeight);
      if (!Number.isFinite(w) || w < 50 || !Number.isFinite(h) || h < 50) {
        alert("Formato personalizado: ancho y alto deben ser números ≥ 50 px.");
        return;
      }
    }

    try {
      setCreating(true);

      const emptyTemplate = createEmptyTemplate(createForm.format, {
        width: createForm.customWidth,
        height: createForm.customHeight,
      });
      const extra = {
        name: createForm.name.trim(),
        app: createForm.app || defaultApp || null,
        format: createForm.format || null,
        isDefault: !!createForm.isDefault,
        isActive: createForm.isActive !== false,
        templateKind: createForm.templateKind,
        requiresProduct: createForm.requiresProduct,
        backgroundMode: createForm.backgroundMode,
      };

      if (isCustomFormat(createForm.format)) {
        extra.canvasWidth = Number(createForm.customWidth);
        extra.canvasHeight = Number(createForm.customHeight);
      }

      const res = await importEditorTemplate(emptyTemplate, extra);

      const createdId =
        res?.data?.id ||
        res?.data?.templateId ||
        res?.data?.template?.id ||
        null;

      setOpenCreateDlg(false);
      setCreateForm({
        name: "",
        app: defaultApp || "",
        format: defaultFormat || "16:9",
        isDefault: false,
        isActive: true,
        templateKind: "manual",
        requiresProduct: false,
        backgroundMode: "none",
        customWidth: DEFAULT_CUSTOM_CANVAS.width,
        customHeight: DEFAULT_CUSTOM_CANVAS.height,
      });

      await fetchList(q);

      if (createdId) {
        openEditor(createdId);
      } else {
        alert("⚠️ Creada, pero el backend no devolvió el ID.");
      }
    } catch (e) {
      console.error(e);
      alert(`❌ No se pudo crear la plantilla: ${e?.message || e}`);
    } finally {
      setCreating(false);
    }
  };

  // =========================
  // DELETE
  // =========================
  const openDelete = (tpl) => {
    setDeleteTarget(tpl || null);
    setOpenDeleteDlg(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      setDeleting(true);
      await deleteEditorTemplate(deleteTarget.id);
      setOpenDeleteDlg(false);
      setDeleteTarget(null);
      await fetchList(q);
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar la plantilla.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        p: 2,
        background: "#0b0f14",
      }}
    >
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Box>
          <Typography sx={{ fontWeight: 900, color: "#fff" }}>
            Diseño Promocional — Plantillas
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
            Crea, importa/exporta JSON y gestiona plantillas. Diseñar = editor; Vista = productos y exportar imagen.
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent="flex-end" alignItems="center">
          <Tooltip title="Recargar lista">
            <span>
              <IconButton size="small" onClick={() => fetchList(q)} disabled={loading} sx={iconBtnSx}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Crear plantilla">
            <span>
              <IconButton
                size="small"
                onClick={() => setOpenCreateDlg(true)}
                disabled={loading}
                sx={{
                  ...iconBtnSx,
                  color: "#0b0f14",
                  background: "#4fc3f7",
                  borderColor: "#4fc3f7",
                  "&:hover": { background: "#81d4fa", borderColor: "#81d4fa" },
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Importar JSON">
            <span>
              <IconButton size="small" onClick={onPickFile} disabled={loading} sx={iconBtnSx}>
                <FileUploadIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Abrir plantilla default en vista">
            <span>
              <IconButton size="small" onClick={openDefault} disabled={loading} sx={iconBtnSx}>
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={onFileChange}
          />
        </Stack>
      </Stack>

      <Box sx={{ height: 12 }} />

      {/* filtros */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          size="small"
          label="Buscar (nombre, id, app, format)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          fullWidth
          InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
          sx={{
            "& .MuiInputBase-root": { color: "#fff" },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.18)" },
          }}
        />

        <TextField
          size="small"
          label="app (para abrir default)"
          value={importForm.app}
          onChange={(e) => setImportForm((p) => ({ ...p, app: e.target.value }))}
          sx={{
            minWidth: 180,
            "& .MuiInputBase-root": { color: "#fff" },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.18)" },
          }}
        />

        <TextField
          size="small"
          label="format (para abrir default)"
          value={importForm.format}
          onChange={(e) => setImportForm((p) => ({ ...p, format: e.target.value }))}
          sx={{
            minWidth: 180,
            "& .MuiInputBase-root": { color: "#fff" },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.18)" },
          }}
        />
      </Stack>

      <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.08)" }} />

      {/* LISTA */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "#fff" }}>
            <CircularProgress size={18} />
            <Typography sx={{ color: "#fff", opacity: 0.8 }}>Cargando...</Typography>
          </Stack>
        ) : err ? (
          <Typography sx={{ color: "#ffb4b4" }}>{err}</Typography>
        ) : filtered.length === 0 ? (
          <Typography sx={{ color: "rgba(255,255,255,0.75)" }}>
            No hay plantillas.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {filtered.map((t) => {
              const name = t?.name || t?.title || t?.meta?.name || `Template #${t?.id}`;
              const isDefault = !!t?.isDefault;
              const isActive = t?.isActive !== false;
              const updated = t?.updatedAt || t?.updated_at || "";
              const app = t?.app || "";
              const format = t?.format || "";
              const kind = settingsFromRow(t).templateKind;

              return (
                <Box
                  key={t.id}
                  sx={{
                    p: 1.2,
                    borderRadius: 2,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                        <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>
                          {name}
                        </Typography>

                        {isDefault && <Chip size="small" label="DEFAULT" />}
                        {!isActive && <Chip size="small" label="INACTIVO" />}

                        <Chip size="small" label={`id: ${t.id}`} />
                        {!!app && <Chip size="small" label={`app: ${app}`} />}
                        {!!format && (
                          <Chip size="small" label={getFormatLabel(format, t)} />
                        )}
                        {!!kind && (
                          <Chip
                            size="small"
                            label={TEMPLATE_KIND_LABELS[kind] || kind}
                            sx={{ borderColor: "rgba(0,229,255,0.25)" }}
                            variant="outlined"
                          />
                        )}
                      </Stack>

                      {!!updated && (
                        <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
                          updatedAt: {String(updated)}
                        </Typography>
                      )}
                    </Box>

                    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                      <Tooltip title={isDefault ? "Es la plantilla default" : "Hacer default"}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => !isDefault && handleSetDefault(t)}
                            disabled={isDefault}
                            sx={{
                              ...iconBtnSx,
                              color: isDefault ? "#ffd54f" : iconBtnSx.color,
                              borderColor: isDefault
                                ? "rgba(255,213,79,0.45)"
                                : "rgba(255,255,255,0.18)",
                            }}
                          >
                            {isDefault ? (
                              <StarIcon fontSize="small" />
                            ) : (
                              <StarBorderIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Exportar JSON">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleExportJson(t)}
                            disabled={exportingId === t.id}
                            sx={iconBtnSx}
                          >
                            {exportingId === t.id ? (
                              <CircularProgress size={16} sx={{ color: "#fff" }} />
                            ) : (
                              <FileDownloadIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Duplicar">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleDuplicate(t)}
                            disabled={duplicating}
                            sx={{
                              ...iconBtnSx,
                              color: "#00E5FF",
                              borderColor: "rgba(0, 229, 255, 0.35)",
                            }}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Editar datos">
                        <IconButton size="small" onClick={() => openEdit(t)} sx={iconBtnSx}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Diseñar">
                        <IconButton size="small" onClick={() => openEditor(t.id)} sx={iconBtnSx}>
                          <BrushIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Usar en vista">
                        <IconButton
                          size="small"
                          onClick={() => openStudio(t.id)}
                          sx={{
                            ...iconBtnSx,
                            color: "#0b0f14",
                            background: "#81c784",
                            borderColor: "#81c784",
                            "&:hover": { background: "#a5d6a7", borderColor: "#a5d6a7" },
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          onClick={() => openDelete(t)}
                          sx={{
                            ...iconBtnSx,
                            color: "#ef9a9a",
                            borderColor: "rgba(239,154,154,0.4)",
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* =========================
          DIALOG: IMPORT JSON
         ========================= */}
      <SimpleDialog
        open={openImportDlg}
        title="Importar plantilla (JSON)"
        handleClose={() => !saving && setOpenImportDlg(false)}
      >
        <Box sx={{ p: 1 }}>
          <Stack spacing={1.5}>
            <TextField
              label="Nombre"
              value={importForm.name}
              onChange={(e) => setImportForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              size="small"
            />

            <TextField
              label="App"
              value={importForm.app}
              onChange={(e) => setImportForm((p) => ({ ...p, app: e.target.value }))}
              fullWidth
              size="small"
              placeholder="App / proyecto / …"
            />

            <TextField
              label="Formato"
              value={importForm.format}
              onChange={(e) => setImportForm((p) => ({ ...p, format: e.target.value }))}
              fullWidth
              size="small"
              placeholder="16:9 / 1:1 / 9:16 / A4 / ..."
            />

            <TextField
              select
              label="¿Marcar como default?"
              value={importForm.isDefault ? "yes" : "no"}
              onChange={(e) => setImportForm((p) => ({ ...p, isDefault: e.target.value === "yes" }))}
              fullWidth
              size="small"
            >
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="yes">Sí</MenuItem>
            </TextField>

            <TextField
              select
              label="Activo"
              value={importForm.isActive ? "yes" : "no"}
              onChange={(e) => setImportForm((p) => ({ ...p, isActive: e.target.value === "yes" }))}
              fullWidth
              size="small"
            >
              <MenuItem value="yes">Sí</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>

            <TemplateSettingsFields
              value={importForm}
              onChange={(settings) => setImportForm((p) => ({ ...p, ...settings }))}
              disabled={saving}
            />

            <TextField
              label="JSON (solo lectura)"
              value={importForm.templateJsonText ? "✔ JSON cargado" : ""}
              fullWidth
              size="small"
              disabled
            />

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => setOpenImportDlg(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="contained" onClick={handleCreate} disabled={saving || !importForm.templateJsonText}>
                {saving ? "Importando..." : "Importar"}
              </Button>
            </Stack>

            <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
              Si marcas como <b>default</b>, el backend debe dejar solo una plantilla default por <b>app + format</b>.
            </Typography>
          </Stack>
        </Box>
      </SimpleDialog>

      {/* =========================
          DIALOG: CREATE NEW TEMPLATE
         ========================= */}
      <SimpleDialog
        open={openCreateDlg}
        title="Crear nueva plantilla"
        handleClose={() => !creating && setOpenCreateDlg(false)}
      >
        <Box sx={{ p: 1 }}>
          <Stack spacing={1.5}>
            <TextField
              label="Nombre"
              value={createForm.name}
              onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              size="small"
              placeholder="Ej: Banner Principal 16:9"
              required
            />

            <TextField
              label="App"
              value={createForm.app}
              onChange={(e) => setCreateForm((p) => ({ ...p, app: e.target.value }))}
              fullWidth
              size="small"
              placeholder="App / proyecto / …"
            />

            <TextField
              select
              label="Formato"
              value={createForm.format}
              onChange={(e) => setCreateForm((p) => ({ ...p, format: e.target.value }))}
              fullWidth
              size="small"
            >
              {Object.entries(TEMPLATE_FORMATS).map(([key, { label }]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </TextField>

            {isCustomFormat(createForm.format) && (
              <Stack direction="row" spacing={1}>
                <TextField
                  label="Ancho (px)"
                  type="number"
                  value={createForm.customWidth}
                  onChange={(e) => setCreateForm((p) => ({ ...p, customWidth: e.target.value }))}
                  fullWidth
                  size="small"
                  inputProps={{ min: 50, step: 1 }}
                />
                <TextField
                  label="Alto (px)"
                  type="number"
                  value={createForm.customHeight}
                  onChange={(e) => setCreateForm((p) => ({ ...p, customHeight: e.target.value }))}
                  fullWidth
                  size="small"
                  inputProps={{ min: 50, step: 1 }}
                />
              </Stack>
            )}

            <TextField
              select
              label="¿Marcar como default?"
              value={createForm.isDefault ? "yes" : "no"}
              onChange={(e) => setCreateForm((p) => ({ ...p, isDefault: e.target.value === "yes" }))}
              fullWidth
              size="small"
            >
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="yes">Sí</MenuItem>
            </TextField>

            <TextField
              select
              label="Activo"
              value={createForm.isActive ? "yes" : "no"}
              onChange={(e) => setCreateForm((p) => ({ ...p, isActive: e.target.value === "yes" }))}
              fullWidth
              size="small"
            >
              <MenuItem value="yes">Sí</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>

            <TemplateSettingsFields
              value={createForm}
              onChange={(settings) => setCreateForm((p) => ({ ...p, ...settings }))}
              disabled={creating}
            />

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => setOpenCreateDlg(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button variant="contained" onClick={handleCreateNew} disabled={creating || !createForm.name?.trim()}>
                {creating ? "Creando..." : "Crear"}
              </Button>
            </Stack>

            <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
              {isCustomFormat(createForm.format)
                ? "Define ancho y alto en píxeles (porte de la etiqueta). Luego añade capas en el editor."
                : "Se creará una plantilla vacía con el formato seleccionado. Podrás añadir capas después en el editor."}
            </Typography>
          </Stack>
        </Box>
      </SimpleDialog>

      {/* =========================
          DIALOG: EDIT
         ========================= */}
      <SimpleDialog
        open={openEditDlg}
        title={`Editar plantilla${editForm?.id ? ` #${editForm.id}` : ""}`}
        handleClose={() => !saving && setOpenEditDlg(false)}
      >
        <Box sx={{ p: 1 }}>
          <Stack spacing={1.5}>
            <TextField
              label="Nombre"
              value={editForm.name}
              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              size="small"
            />

            <TextField
              label="App"
              value={editForm.app}
              onChange={(e) => setEditForm((p) => ({ ...p, app: e.target.value }))}
              fullWidth
              size="small"
            />

            <TextField
              select
              label="Formato"
              value={editForm.format}
              onChange={(e) => setEditForm((p) => ({ ...p, format: e.target.value }))}
              fullWidth
              size="small"
            >
              {Object.entries(TEMPLATE_FORMATS).map(([key, { label }]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </TextField>

            {isCustomFormat(editForm.format) && (
              <Stack direction="row" spacing={1}>
                <TextField
                  label="Ancho (px)"
                  type="number"
                  value={editForm.customWidth}
                  onChange={(e) => setEditForm((p) => ({ ...p, customWidth: e.target.value }))}
                  fullWidth
                  size="small"
                  inputProps={{ min: 50, step: 1 }}
                />
                <TextField
                  label="Alto (px)"
                  type="number"
                  value={editForm.customHeight}
                  onChange={(e) => setEditForm((p) => ({ ...p, customHeight: e.target.value }))}
                  fullWidth
                  size="small"
                  inputProps={{ min: 50, step: 1 }}
                />
              </Stack>
            )}

            <TextField
              select
              label="¿Default?"
              value={editForm.isDefault ? "yes" : "no"}
              onChange={(e) => setEditForm((p) => ({ ...p, isDefault: e.target.value === "yes" }))}
              fullWidth
              size="small"
            >
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="yes">Sí</MenuItem>
            </TextField>

            <TextField
              select
              label="Activo"
              value={editForm.isActive ? "yes" : "no"}
              onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.value === "yes" }))}
              fullWidth
              size="small"
            >
              <MenuItem value="yes">Sí</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>

            <TemplateSettingsFields
              value={editForm}
              onChange={(settings) => setEditForm((p) => ({ ...p, ...settings }))}
              disabled={saving}
            />

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => setOpenEditDlg(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="contained" onClick={handleSaveEdit} disabled={saving || !editForm.id}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </Stack>

            <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
              Si marcas como <b>default</b>, el backend debería desmarcar los demás (por app+format).
            </Typography>
          </Stack>
        </Box>
      </SimpleDialog>

      {/* =========================
          DIALOG: DELETE CONFIRM
         ========================= */}
      <SimpleDialog
        open={openDeleteDlg}
        title="Eliminar plantilla"
        handleClose={() => !deleting && setOpenDeleteDlg(false)}
      >
        <Box sx={{ p: 1 }}>
          <Typography sx={{ color: "#fff", mb: 1 }}>
            ¿Seguro que deseas eliminar esta plantilla?
          </Typography>

          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)",
              mb: 2,
            }}
          >
            <Typography sx={{ color: "#fff", fontWeight: 900 }}>
              {deleteTarget?.name || `Template #${deleteTarget?.id || ""}`}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
              id: {deleteTarget?.id} {deleteTarget?.isDefault ? "— (DEFAULT)" : ""}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="outlined" onClick={() => setOpenDeleteDlg(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={deleting || !deleteTarget?.id}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </Stack>

          <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 12, mt: 1 }}>
            Esto eliminará la plantilla (y sus grupos/capas/props si tienes CASCADE).
          </Typography>
        </Box>
      </SimpleDialog>
    </Box>
  );
}
