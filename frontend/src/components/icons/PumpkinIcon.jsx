/**
 * Calabaza Halloween (SVG de Descargas/calabaza-hallowen.svg, naranja).
 * Se carga como imagen para que MUI no pise los colores con currentColor.
 */
import { Box } from "@mui/material";

const SRC = `${import.meta.env.BASE_URL}brand/calabaza-halloween.svg`;

/**
 * @param {{
 *   sx?: object;
 *   fontSize?: number | string;
 *   titleAccess?: string;
 * }} props
 */
export default function PumpkinIcon({
  sx = {},
  titleAccess = "Calabaza Halloween",
  ...rest
}) {
  // No aceptar prop `fontSize` de MUI (rompe SvgIcon hermanos en BurstBubble).
  // El tamaño va solo por sx.width / sx.fontSize.
  const { fontSize: _omitFontSize, ...safeRest } = rest;
  const resolved = sx.fontSize ?? sx.width ?? 48;

  return (
    <Box
      component="img"
      src={SRC}
      alt={titleAccess}
      draggable={false}
      {...safeRest}
      sx={{
        display: "block",
        objectFit: "contain",
        userSelect: "none",
        pointerEvents: "none",
        flexShrink: 0,
        ...sx,
        width: resolved,
        height: resolved,
      }}
    />
  );
}
