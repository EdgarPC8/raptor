/**
 * Editor de paleta de marca: preview, sugerencias, import/export, reset.
 */
import { useEffect, useMemo, useRef } from "react";
import {
  Box,
  Button,
  Grid,
  Stack,
  TextField,
  Typography,
  Tooltip,
  alpha,
} from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useThemeMode } from "../../theme/ThemeModeProvider.jsx";
import {
  DEFAULT_THEME_PALETTE,
  buildPaletteFromSeed,
  exportThemePalette,
  importThemePalette,
  normalizeThemePalette,
  suggestSeedColors,
} from "../../theme/themePalette.js";

const EDIT_FIELDS = [
  { key: "primary", label: "Primario" },
  { key: "secondary", label: "Secundario" },
  { key: "backgroundDefault", label: "Fondo" },
  { key: "backgroundPaper", label: "Superficie" },
  { key: "textPrimary", label: "Texto" },
];

function ModePreview({ title, colors }) {
  return (
    <Box
      sx={{
        borderRadius: 1.5,
        overflow: "hidden",
        border: 1,
        borderColor: "divider",
        minHeight: 88,
        background: `linear-gradient(145deg, ${colors.backgroundDefault}, ${alpha(
          colors.primary,
          0.18,
        )})`,
        p: 1.25,
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 800, color: colors.textPrimary, letterSpacing: 0.6 }}
      >
        {title}
      </Typography>
      <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
        <Box
          sx={{
            flex: 1,
            height: 28,
            borderRadius: 1,
            bgcolor: colors.primary,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Primary
        </Box>
        <Box
          sx={{
            flex: 1,
            height: 28,
            borderRadius: 1,
            bgcolor: colors.secondary,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Secondary
        </Box>
        <Box
          sx={{
            width: 40,
            height: 28,
            borderRadius: 1,
            bgcolor: colors.backgroundPaper,
            border: `1px solid ${alpha(colors.textPrimary, 0.2)}`,
          }}
        />
      </Stack>
    </Box>
  );
}

function ColorField({ label, value, onChange }) {
  const hexValue = String(value || "").startsWith("#")
    ? String(value).slice(0, 7)
    : "#1A7A9A";
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box
        component="input"
        type="color"
        value={hexValue}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        sx={{
          width: 36,
          height: 36,
          p: 0,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          bgcolor: "transparent",
          cursor: "pointer",
        }}
      />
      <TextField
        size="small"
        label={label}
        fullWidth
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </Stack>
  );
}

/**
 * @param {{
 *   value: object,
 *   onChange: (next: object) => void,
 * }} props
 */
export default function ThemePaletteEditor({ value, onChange }) {
  const fileRef = useRef(null);
  const { setPalettePreview, clearPalettePreview } = useThemeMode();
  const palette = useMemo(() => normalizeThemePalette(value), [value]);
  const suggestions = useMemo(
    () => suggestSeedColors(palette.light.primary),
    [palette.light.primary],
  );

  useEffect(() => {
    setPalettePreview(palette);
  }, [palette, setPalettePreview]);

  useEffect(() => {
    return () => clearPalettePreview();
  }, [clearPalettePreview]);

  const patchMode = (mode, key, color) => {
    onChange(
      normalizeThemePalette({
        ...palette,
        [mode]: {
          ...palette[mode],
          [key]: color,
        },
      }),
    );
  };

  const applySeed = (hex) => {
    onChange(buildPaletteFromSeed(hex, palette.name || "Personalizada"));
  };

  const onExport = () => {
    const payload = exportThemePalette(palette);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paleta-${String(palette.name || "raptor")
      .toLowerCase()
      .replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      onChange(importThemePalette(text));
    } catch (err) {
      window.alert(err?.message || "No se pudo importar la paleta.");
    }
  };

  return (
    <Box data-tour="config-theme-palette">
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ mb: 1.25 }}
      >
        <TextField
          size="small"
          label="Nombre de la paleta"
          value={palette.name || ""}
          onChange={(e) =>
            onChange(normalizeThemePalette({ ...palette, name: e.target.value }))
          }
          sx={{ maxWidth: { sm: 280 } }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={onExport}
          >
            Exportar
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileUploadOutlinedIcon />}
            onClick={() => fileRef.current?.click()}
          >
            Importar
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={<RestartAltIcon />}
            onClick={() => onChange(normalizeThemePalette(DEFAULT_THEME_PALETTE))}
          >
            Restablecer
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void onImportFile(e)}
          />
        </Stack>
      </Stack>

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
        Elegí un color semilla y generamos una paleta que combina (claro, oscuro y neón).
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        <ColorField
          label="Color semilla"
          value={palette.light.primary}
          onChange={(c) => {
            if (String(c).startsWith("#") && String(c).length >= 4) applySeed(c);
          }}
        />
        <Button
          size="small"
          variant="contained"
          startIcon={<AutoAwesomeIcon />}
          onClick={() => applySeed(palette.light.primary)}
          sx={{ textTransform: "none", alignSelf: "center" }}
        >
          Generar combinación
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.75 }}>
        {suggestions.map((s) => (
          <Tooltip key={`${s.label}-${s.hex}`} title={s.label}>
            <Box
              component="button"
              type="button"
              onClick={() => applySeed(s.hex)}
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: 2,
                borderColor: "background.paper",
                outline: (t) => `1px solid ${alpha(t.palette.text.primary, 0.25)}`,
                bgcolor: s.hex,
                cursor: "pointer",
                p: 0,
              }}
              aria-label={s.label}
            />
          </Tooltip>
        ))}
      </Stack>

      <Grid container spacing={1.25} sx={{ mb: 1.75 }}>
        <Grid item xs={12} sm={4}>
          <ModePreview title="CLARO" colors={palette.light} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <ModePreview title="OSCURO" colors={palette.dark} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <ModePreview title="NEÓN" colors={palette.neon} />
        </Grid>
      </Grid>

      {["light", "dark", "neon"].map((mode) => (
        <Box key={mode} sx={{ mb: 1.75 }}>
          <Typography
            variant="overline"
            sx={{ fontWeight: 800, letterSpacing: 1, color: "text.secondary" }}
          >
            {mode === "light" ? "Modo claro" : mode === "dark" ? "Modo oscuro" : "Modo neón"}
          </Typography>
          <Grid container spacing={1} sx={{ mt: 0.25 }}>
            {EDIT_FIELDS.map((f) => (
              <Grid item xs={12} sm={6} md={4} key={`${mode}-${f.key}`}>
                <ColorField
                  label={f.label}
                  value={palette[mode][f.key]}
                  onChange={(c) => patchMode(mode, f.key, c)}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}
