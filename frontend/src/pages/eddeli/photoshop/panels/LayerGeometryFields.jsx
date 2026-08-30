import React, { useMemo, useState } from "react";
import {
  Box,
  TextField,
  Stack,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { clampPx, pctToPx, pxToPct } from "../layerGeometry.js";

/**
 * Posición y tamaño de capa — px o % del canvas, con opción de vincular W/H.
 */
export default function LayerGeometryFields({ layer, canvas, onPatch }) {
  const [unit, setUnit] = useState("px");
  const [lockRatio, setLockRatio] = useState(true);

  const cw = canvas?.width || 1920;
  const ch = canvas?.height || 1080;
  const ratio = useMemo(() => {
    const w = layer?.w || 1;
    const h = layer?.h || 1;
    return w / Math.max(h, 1);
  }, [layer?.w, layer?.h]);

  if (!layer) return null;

  const x = layer.x || 0;
  const y = layer.y || 0;
  const w = layer.w || 0;
  const h = layer.h || 0;

  const applyRect = (patch) => {
    onPatch({
      x: patch.x ?? x,
      y: patch.y ?? y,
      w: Math.max(1, patch.w ?? w),
      h: Math.max(1, patch.h ?? h),
    });
  };

  const readValue = (pxVal, axisTotal) =>
    unit === "px" ? pxVal : pxToPct(pxVal, axisTotal);

  const writeValue = (field, raw, axisTotal) => {
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    const px = unit === "px" ? clampPx(n, 0, axisTotal) : clampPx(pctToPx(n, axisTotal), 0, axisTotal);

    if (field === "x") applyRect({ x: px });
    if (field === "y") applyRect({ y: px });
    if (field === "w") {
      const nw = Math.max(1, px);
      const nh = lockRatio ? Math.max(1, Math.round(nw / ratio)) : h;
      applyRect({ w: nw, h: nh });
    }
    if (field === "h") {
      const nh = Math.max(1, px);
      const nw = lockRatio ? Math.max(1, Math.round(nh * ratio)) : w;
      applyRect({ w: nw, h: nh });
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>
          Posición y tamaño
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={unit}
          onChange={(_, v) => v && setUnit(v)}
          sx={{ height: 24 }}
        >
          <ToggleButton value="px" sx={{ fontSize: 10, py: 0, px: 1 }}>
            px
          </ToggleButton>
          <ToggleButton value="pct" sx={{ fontSize: 10, py: 0, px: 1 }}>
            %
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        <TextField
          size="small"
          label="X"
          type="number"
          value={readValue(x, cw)}
          onChange={(e) => writeValue("x", e.target.value, cw)}
          sx={{ flex: 1 }}
          inputProps={{ step: unit === "px" ? 1 : 0.1 }}
        />
        <TextField
          size="small"
          label="Y"
          type="number"
          value={readValue(y, ch)}
          onChange={(e) => writeValue("y", e.target.value, ch)}
          sx={{ flex: 1 }}
          inputProps={{ step: unit === "px" ? 1 : 0.1 }}
        />
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          label="Ancho"
          type="number"
          value={readValue(w, cw)}
          onChange={(e) => writeValue("w", e.target.value, cw)}
          sx={{ flex: 1 }}
          inputProps={{ step: unit === "px" ? 1 : 0.1, min: 1 }}
        />
        <TextField
          size="small"
          label="Alto"
          type="number"
          value={readValue(h, ch)}
          onChange={(e) => writeValue("h", e.target.value, ch)}
          sx={{ flex: 1 }}
          inputProps={{ step: unit === "px" ? 1 : 0.1, min: 1 }}
        />
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.75 }}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={lockRatio}
              onChange={(e) => setLockRatio(e.target.checked)}
            />
          }
          label={
            <Stack direction="row" spacing={0.5} alignItems="center">
              {lockRatio ? <LinkIcon sx={{ fontSize: 14 }} /> : <LinkOffIcon sx={{ fontSize: 14 }} />}
              <Typography sx={{ fontSize: 11 }}>Vincular W/H</Typography>
            </Stack>
          }
          sx={{ m: 0 }}
        />
        <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>
          {w}×{h} px · {pxToPct(w, cw)}×{pxToPct(h, ch)}%
        </Typography>
      </Stack>
    </Box>
  );
}
