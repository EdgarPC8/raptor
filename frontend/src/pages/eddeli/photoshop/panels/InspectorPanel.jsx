import React, { useMemo } from "react";
import {
  Box,
  TextField,
  Stack,
  Button,
  Chip,
  Typography,
  MenuItem,
} from "@mui/material";
import { useEditor } from "../EditorProvider";
import {
  TEXT_BIND_PRESETS,
  IMAGE_BIND_PRESETS,
  getLayerBindMode,
} from "../templateSettings";
import { useEditorImageUpload } from "../useEditorImageUpload.jsx";
import { useImageCropCtx } from "../useImageCrop.jsx";
import { editorImageUrl } from "../editorImageUpload.js";
import LayerGeometryFields from "./LayerGeometryFields.jsx";

const FONT_OPTIONS = [
  { label: "Inter (Normal)", value: "Inter, system-ui, Arial" },
  { label: "Poppins", value: "Poppins, system-ui, Arial" },
  { label: "Montserrat", value: "Montserrat, system-ui, Arial" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Bebas Neue (Título)", value: "Bebas Neue, Impact, system-ui" },
  { label: "Anton (Título)", value: "Anton, Impact, system-ui" },
  { label: "Abril Fatface (Título)", value: "Abril Fatface, Georgia, serif" },
  { label: "Playfair Display (Título)", value: "Playfair Display, Georgia, serif" },
  { label: "Impact", value: "Impact, Haettenschweiler, Arial Narrow Bold, sans-serif" },
];

// ======================
// helpers para “Referencia”
// ======================
const getBindKey = (layer) => {
  if (!layer) return "";
  if (layer.type === "text") return layer.bind?.textFrom || "";
  if (layer.type === "image") return layer.bind?.srcFrom || "";
  return "";
};

// ✅ opcional: permitir que escribas "desc" y se guarde como "data.desc"
const normalizeKey = (k = "") => {
  const s = String(k || "").trim();
  if (!s) return "";

  // si ya viene con prefijos o con punto, lo respetamos
  if (
    s.startsWith("data.") ||
    s.startsWith("product.") ||
    s.startsWith("catalog.") ||
    s.startsWith("computed.")
  ) return s;

  if (s.includes(".")) return s;

  // 👇 si NO quieres normalizar, reemplaza esta línea por: return s;
  return `${s}`;
};

const patchBindKey = (layer, nextRaw) => {
  const next = normalizeKey(nextRaw);

  // si vacío: dejamos bind pero limpiamos la key
  if (!next) {
    if (layer.type === "text") return { bind: { ...(layer.bind || {}), textFrom: "" } };
    if (layer.type === "image") return { bind: { ...(layer.bind || {}), srcFrom: "" } };
    return {};
  }

  if (layer.type === "text") {
    return { bind: { ...(layer.bind || {}), textFrom: next } };
  }
  if (layer.type === "image") {
    return { bind: { ...(layer.bind || {}), srcFrom: next } };
  }
  return {};
};

export default function InspectorPanel({
  selectedLayer,
  layers,
  setLayerMeta,
  updateLayerProps,
  toggleVisible,
  toggleLocked,
}) {
  const { dispatch, state } = useEditor();
  const { uploading, openFilePicker, HiddenFileInput } = useEditorImageUpload();
  const { startCrop, splitWithToast, splitEtiquetaWithToast, applyEtiquetaLayoutWithToast, cropBusy } =
    useImageCropCtx();
  const layer = useMemo(() => {
    if (!selectedLayer) return null;
    return (layers || []).find((l) => l.id === selectedLayer) || null;
  }, [selectedLayer, layers]);

  if (!selectedLayer) {
    return (
      <Stack spacing={1.2}>
        <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
          Selecciona una capa para editar. Para el fondo usa una capa tipo imagen que ocupe todo el canvas.
        </Typography>
        <Button
          variant="outlined"
          size="small"
          disabled={cropBusy}
          onClick={applyEtiquetaLayoutWithToast}
          sx={{ alignSelf: "flex-start", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
        >
          Aplicar layout etiqueta EdDeli
        </Button>
      </Stack>
    );
  }

  if (!layer) {
    return (
      <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
        Capa no encontrada.
      </Typography>
    );
  }

  const isText = layer.type === "text";
  const p = layer.props || {};

  // ✅ Lee la “referencia” real desde bind.*
  const bindKeyValue = getBindKey(layer);
  const bindMode = getLayerBindMode(layer);
  const bindPresets = layer.type === "text" ? TEXT_BIND_PRESETS : layer.type === "image" ? IMAGE_BIND_PRESETS : [];

  const setBindKey = (value) => {
    const patch = patchBindKey(layer, value);
    dispatch({ type: "UPDATE_LAYER", layerId: layer.id, patch });
  };

  const setBindMode = (mode) => {
    if (mode === "fixed") {
      setBindKey("");
      return;
    }
    const preset = bindPresets[0];
    if (preset) setBindKey(preset.value);
  };

  const applyGoldTitle = () => {
    if (!isText) return;
    updateLayerProps(layer.id, {
      color: "#FFF6D1",
      stroke: "#D4AF37",
      strokeWidth: 6,
      shadowColor: "rgba(0,0,0,0.45)",
      shadowBlur: 18,
      shadowOffsetX: 0,
      shadowOffsetY: 6,
      fontWeight: 900,
      letterSpacing: 1.5,
    });
  };

  const applyNormalText = () => {
    if (!isText) return;
    updateLayerProps(layer.id, {
      color: "#FFFFFF",
      strokeWidth: 0,
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      letterSpacing: 0,
      lineHeight: 1.1,
      fontWeight: 700,
    });
  };

  return (
    <Stack spacing={1.2}>
      <HiddenFileInput />
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip size="small" label={layer.type} />
        <Button size="small" onClick={() => toggleVisible(layer.id)}>
          {layer.visible ? "👁 Visible" : "🙈 Oculta"}
        </Button>
        <Button size="small" onClick={() => toggleLocked(layer.id)}>
          {layer.locked ? "🔒 Bloqueada" : "🔓 Libre"}
        </Button>
      </Stack>

      {/* Nombre de capa */}
      <TextField
        size="small"
        label="Nombre"
        value={layer.name || layer.id}
        onChange={(e) => setLayerMeta(layer.id, { name: e.target.value })}
        fullWidth
      />

      <LayerGeometryFields
        layer={layer}
        canvas={state?.doc?.canvas}
        onPatch={(patch) =>
          dispatch({ type: "UPDATE_LAYER", layerId: layer.id, patch })
        }
      />

      {/* Contenido: fijo vs producto */}
      {layer.type !== "shape" && (
        <>
          <TextField
            select
            size="small"
            label="Origen del contenido"
            value={bindMode}
            onChange={(e) => setBindMode(e.target.value)}
            fullWidth
          >
            <MenuItem value="fixed">Texto / imagen fijo</MenuItem>
            <MenuItem value="product">Desde producto (bind)</MenuItem>
          </TextField>

          {bindMode === "product" && bindPresets.length > 0 && (
            <TextField
              select
              size="small"
              label="Campo del catálogo (preset)"
              value={bindPresets.some((p) => p.value === bindKeyValue) ? bindKeyValue : ""}
              onChange={(e) => setBindKey(e.target.value)}
              fullWidth
              displayEmpty
            >
              <MenuItem value="">
                <em>Personalizado (editar abajo)</em>
              </MenuItem>
              {bindPresets.map((preset) => (
                <MenuItem key={preset.value} value={preset.value}>
                  {preset.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        </>
      )}

      {/* Referencia REAL (bind.textFrom / bind.srcFrom) */}
      {bindMode === "product" && (
      <TextField
        size="small"
        label="Referencia (fieldKey)"
        value={bindKeyValue}
        onChange={(e) => setBindKey(e.target.value)}
        placeholder={
          layer.type === "text"
            ? "Ej: computed.priceText | product.name | desc"
            : layer.type === "image"
            ? "Ej: product.primaryImageUrl | imageUrl"
            : "—"
        }
        fullWidth
        disabled={layer.type === "shape"}
        helperText="Puedes escribir corto: desc -> data.desc (si quieres)."
      />
      )}

      {/* ======== PROPIEDADES POR TIPO ======== */}
      {isText && (
        <>
          <TextField
            size="small"
            label="Texto (default)"
            value={p.text || ""}
            onChange={(e) => updateLayerProps(layer.id, { text: e.target.value })}
            fullWidth
            multiline
            minRows={2}
          />

          <TextField
            select
            size="small"
            label="Fuente"
            value={p.fontFamily || "Inter, system-ui, Arial"}
            onChange={(e) => updateLayerProps(layer.id, { fontFamily: e.target.value })}
            fullWidth
          >
            {FONT_OPTIONS.map((f) => (
              <MenuItem key={f.value} value={f.value}>
                {f.label}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="Tamaño"
              type="number"
              value={Number(p.fontSize || 32)}
              onChange={(e) =>
                updateLayerProps(layer.id, { fontSize: Number(e.target.value || 0) })
              }
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Peso"
              type="number"
              value={Number(p.fontWeight || 700)}
              onChange={(e) =>
                updateLayerProps(layer.id, { fontWeight: Number(e.target.value || 0) })
              }
              sx={{ flex: 1 }}
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="Color"
              value={p.color || "#FFFFFF"}
              onChange={(e) => updateLayerProps(layer.id, { color: e.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Letter spacing (px)"
              type="number"
              value={Number(p.letterSpacing || 0)}
              onChange={(e) =>
                updateLayerProps(layer.id, { letterSpacing: Number(e.target.value || 0) })
              }
              sx={{ flex: 1 }}
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              select
              label="Alineación horizontal"
              value={p.align || "left"}
              onChange={(e) => updateLayerProps(layer.id, { align: e.target.value })}
              sx={{ flex: 1 }}
            >
              <MenuItem value="left">Izquierda</MenuItem>
              <MenuItem value="center">Centro</MenuItem>
              <MenuItem value="right">Derecha</MenuItem>
            </TextField>

            <TextField
              size="small"
              select
              label="Alineación vertical"
              value={p.verticalAlign || "top"}
              onChange={(e) => updateLayerProps(layer.id, { verticalAlign: e.target.value })}
              sx={{ flex: 1 }}
            >
              <MenuItem value="top">Arriba</MenuItem>
              <MenuItem value="center">Centro</MenuItem>
              <MenuItem value="bottom">Abajo</MenuItem>
            </TextField>
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="Line height"
              type="number"
              value={Number(p.lineHeight || 1.05)}
              onChange={(e) =>
                updateLayerProps(layer.id, { lineHeight: Number(e.target.value || 1) })
              }
              sx={{ flex: 1 }}
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={applyGoldTitle}>
              ✨ Título Dorado
            </Button>
            <Button variant="outlined" onClick={applyNormalText}>
              Normal
            </Button>
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="Stroke (color)"
              value={p.stroke || "#D4AF37"}
              onChange={(e) => updateLayerProps(layer.id, { stroke: e.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Stroke width"
              type="number"
              value={Number(p.strokeWidth || 0)}
              onChange={(e) =>
                updateLayerProps(layer.id, { strokeWidth: Number(e.target.value || 0) })
              }
              sx={{ flex: 1 }}
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="Shadow blur"
              type="number"
              value={Number(p.shadowBlur || 0)}
              onChange={(e) =>
                updateLayerProps(layer.id, { shadowBlur: Number(e.target.value || 0) })
              }
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Shadow Y"
              type="number"
              value={Number(p.shadowOffsetY || 0)}
              onChange={(e) =>
                updateLayerProps(layer.id, { shadowOffsetY: Number(e.target.value || 0) })
              }
              sx={{ flex: 1 }}
            />
          </Stack>

          <TextField
            size="small"
            label="Shadow color"
            value={p.shadowColor || "rgba(0,0,0,0.45)"}
            onChange={(e) => updateLayerProps(layer.id, { shadowColor: e.target.value })}
            fullWidth
          />
        </>
      )}

      {layer.type === "image" && (
        <>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              size="small"
              disabled={uploading}
              onClick={() => openFilePicker(bindMode === "product" ? "add" : "replace")}
            >
              {uploading ? "Subiendo…" : bindMode === "product" ? "Subir imagen fija" : "Cambiar imagen"}
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={uploading}
              onClick={() => openFilePicker("add")}
            >
              Nueva capa
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={!p.src || cropBusy}
              onClick={() => startCrop(layer.id)}
            >
              Recortar
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              size="small"
              disabled={!p.src || cropBusy}
              onClick={() => splitWithToast("horizontal")}
            >
              Dividir ↔
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={!p.src || cropBusy}
              onClick={() => splitWithToast("vertical")}
            >
              Dividir ↕
            </Button>
            <Button
              variant="contained"
              size="small"
              color="secondary"
              disabled={!p.src || cropBusy}
              onClick={splitEtiquetaWithToast}
            >
              Separar etiqueta EdDeli
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={cropBusy}
              onClick={applyEtiquetaLayoutWithToast}
            >
              Layout EdDeli
            </Button>
          </Stack>

          {!!p.src && (
            <Box
              component="img"
              src={editorImageUrl(p.src)}
              alt=""
              sx={{
                width: "100%",
                maxHeight: 120,
                objectFit: "contain",
                borderRadius: 1,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.2)",
              }}
            />
          )}

          <TextField
            size="small"
            label="Ruta imagen (servidor)"
            value={p.src || ""}
            onChange={(e) => updateLayerProps(layer.id, { src: e.target.value })}
            fullWidth
            helperText="PNG, JPG, SVG guardados en diseno-promocional/capas"
          />

          <TextField
            select
            size="small"
            label="Ajuste (fit)"
            value={p.fit || "contain"}
            onChange={(e) => updateLayerProps(layer.id, { fit: e.target.value })}
            fullWidth
          >
            <MenuItem value="contain">Contain (entera)</MenuItem>
            <MenuItem value="cover">Cover (recortar)</MenuItem>
            <MenuItem value="fill">Fill (estirar)</MenuItem>
          </TextField>
        </>
      )}

      {layer.type === "shape" && (
        <TextField
          size="small"
          label="Fill"
          value={layer.props?.fill || ""}
          onChange={(e) => updateLayerProps(layer.id, { fill: e.target.value })}
          fullWidth
        />
      )}

      <Box sx={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>
        Tip: la <b>Referencia</b> es opcional. Si la dejas vacía, esa capa no se llena con datos.
      </Box>
    </Stack>
  );
}
