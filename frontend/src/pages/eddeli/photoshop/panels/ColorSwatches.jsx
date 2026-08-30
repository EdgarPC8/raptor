import React, { useState } from "react";
import { Box, Popover, TextField, Typography, IconButton, Stack } from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { PE } from "../editorTheme";
import { colorToPickerValue, normalizeColor } from "../editorColors.js";

function Swatch({ color, active, onClick, size = 22, sx = {} }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        width: size,
        height: size,
        borderRadius: 0.5,
        background: color,
        border: active ? `2px solid ${PE.accent}` : "2px solid #fff",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.6)",
        cursor: "pointer",
        ...sx,
      }}
    />
  );
}

export default function ColorSwatches({
  foreground,
  background,
  activeSlot,
  onSlotChange,
  onForegroundChange,
  onBackgroundChange,
  onSwap,
}) {
  const [anchor, setAnchor] = useState(null);
  const [editingSlot, setEditingSlot] = useState("foreground");

  const openPicker = (slot, e) => {
    onSlotChange(slot);
    setEditingSlot(slot);
    setAnchor(e.currentTarget);
  };

  const closePicker = () => setAnchor(null);

  const currentColor = editingSlot === "foreground" ? foreground : background;
  const setCurrentColor = editingSlot === "foreground" ? onForegroundChange : onBackgroundChange;

  const onPickerChange = (e) => {
    setCurrentColor(normalizeColor(e.target.value));
  };

  const onHexBlur = (e) => {
    setCurrentColor(normalizeColor(e.target.value));
  };

  return (
    <>
      <Box sx={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
        <Swatch
          color={background}
          active={activeSlot === "background"}
          onClick={(e) => openPicker("background", e)}
          size={20}
          sx={{ position: "absolute", right: 2, bottom: 2, zIndex: 1 }}
        />
        <Swatch
          color={foreground}
          active={activeSlot === "foreground"}
          onClick={(e) => openPicker("foreground", e)}
          size={20}
          sx={{ position: "absolute", left: 2, top: 2, zIndex: 2 }}
        />
        <IconButton
          size="small"
          onClick={onSwap}
          title="Intercambiar colores"
          sx={{
            position: "absolute",
            right: -2,
            top: -2,
            width: 16,
            height: 16,
            p: 0,
            color: PE.textMuted,
            background: PE.bgToolbar,
            border: `1px solid ${PE.borderLight}`,
            "&:hover": { color: PE.text, background: PE.bgPanel },
          }}
        >
          <SwapHorizIcon sx={{ fontSize: 12, transform: "rotate(90deg)" }} />
        </IconButton>
      </Box>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={closePicker}
        anchorOrigin={{ vertical: "center", horizontal: "right" }}
        transformOrigin={{ vertical: "center", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              p: 1.5,
              background: PE.bgPanel,
              border: `1px solid ${PE.borderLight}`,
              minWidth: 200,
            },
          },
        }}
      >
        <Typography sx={{ fontSize: 11, color: PE.textMuted, mb: 1, fontWeight: 700 }}>
          {editingSlot === "foreground" ? "Color de primer plano" : "Color de fondo"}
        </Typography>
        <Stack spacing={1}>
          <Box
            component="input"
            type="color"
            value={colorToPickerValue(currentColor)}
            onChange={onPickerChange}
            sx={{
              width: "100%",
              height: 36,
              border: `1px solid ${PE.borderLight}`,
              borderRadius: 1,
              cursor: "pointer",
              background: "transparent",
              p: 0,
            }}
          />
          <TextField
            size="small"
            label="Hex / rgba"
            defaultValue={currentColor}
            key={`${editingSlot}-${currentColor}`}
            onBlur={onHexBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") onHexBlur(e);
            }}
            fullWidth
            sx={{
              "& .MuiInputBase-input": { fontSize: 12, color: PE.text },
              "& .MuiInputLabel-root": { fontSize: 12, color: PE.textMuted },
            }}
          />
          <Typography sx={{ fontSize: 10, color: PE.textMuted }}>
            Se aplica a la capa forma/texto seleccionada
          </Typography>
        </Stack>
      </Popover>
    </>
  );
}
