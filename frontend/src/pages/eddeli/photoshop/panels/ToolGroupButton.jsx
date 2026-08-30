import React, { useState } from "react";
import { Box, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from "@mui/material";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import { PE } from "../editorTheme";

/**
 * Botón de herramienta con submenú lateral (estilo Photopea).
 */
export default function ToolGroupButton({
  tools,
  activeId,
  onSelect,
  disabled = false,
}) {
  const [anchor, setAnchor] = useState(null);
  const open = Boolean(anchor);

  const current = (activeId && tools.find((t) => t.id === activeId)) || tools[0];
  const isGroupActive = Boolean(activeId && tools.some((t) => t.id === activeId));

  const btnSx = (active) => ({
    width: 36,
    height: 36,
    borderRadius: 0.5,
    color: active ? "#fff" : PE.textMuted,
    background: active ? PE.accent : "transparent",
    "&:hover": { background: active ? PE.accentHover : "rgba(255,255,255,0.08)" },
  });

  const handleMainClick = () => {
    onSelect(current.id);
  };

  const handleOpenMenu = (e) => {
    e.stopPropagation();
    setAnchor(e.currentTarget);
  };

  return (
    <>
      <Tooltip title={current.label} placement="right">
        <Box
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <IconButton
            size="small"
            disabled={disabled}
            onClick={handleMainClick}
            sx={{
              ...btnSx(isGroupActive),
              pr: 0.25,
            }}
          >
            <current.icon sx={{ fontSize: 20 }} />
          </IconButton>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={handleOpenMenu}
            sx={{
              position: "absolute",
              right: -2,
              bottom: -2,
              width: 14,
              height: 14,
              p: 0,
              color: PE.textMuted,
              "&:hover": { color: PE.text, background: "transparent" },
            }}
          >
            <ArrowRightIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              ml: 0.5,
              background: PE.bgMenu,
              border: `1px solid ${PE.borderLight}`,
              minWidth: 220,
            },
          },
        }}
      >
        {tools.map(({ id, icon: Icon, label, shortcut }) => (
          <MenuItem
            key={id}
            selected={activeId === id}
            onClick={() => {
              setAnchor(null);
              onSelect(id);
            }}
            sx={{
              py: 0.75,
              fontSize: 12,
              color: PE.text,
              "&.Mui-selected": { background: "rgba(74,158,255,0.2)" },
              "&:hover": { background: "rgba(255,255,255,0.08)" },
            }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: PE.textMuted }}>
              <Icon sx={{ fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText
              primary={label}
              primaryTypographyProps={{ fontSize: 12 }}
            />
            {shortcut ? (
              <Box component="span" sx={{ fontSize: 10, color: PE.textMuted, ml: 1 }}>
                {shortcut}
              </Box>
            ) : null}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
