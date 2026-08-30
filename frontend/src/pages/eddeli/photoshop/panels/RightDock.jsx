import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { useEditor } from "../EditorProvider";
import InspectorPanel from "./InspectorPanel";
import LayersPanel from "./LayersPanel";
import { PE } from "../editorTheme";

const TABS = [
  { id: "layers", label: "Capas" },
  { id: "properties", label: "Propiedades" },
];

export default function RightDock() {
  const [tab, setTab] = useState("layers");
  const { layers, selectedId, setLayerMeta, updateLayerProps, toggleVisible, toggleLocked } = useEditor();

  return (
    <Box
      sx={{
        width: PE.rightDockW,
        height: "100%",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: PE.bgPanel,
        borderLeft: `1px solid ${PE.border}`,
        minHeight: 0,
      }}
    >
      {/* Tabs */}
      <Box
        sx={{
          display: "flex",
          height: 28,
          flexShrink: 0,
          borderBottom: `1px solid ${PE.border}`,
          background: PE.bgPanelHeader,
        }}
      >
        {TABS.map((t) => (
          <Box
            key={t.id}
            onClick={() => setTab(t.id)}
            sx={{
              flex: 1,
              display: "grid",
              placeItems: "center",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              color: tab === t.id ? PE.text : PE.textMuted,
              background: tab === t.id ? PE.bgPanel : "transparent",
              borderBottom: tab === t.id ? `2px solid ${PE.accent}` : "2px solid transparent",
              userSelect: "none",
            }}
          >
            {t.label}
          </Box>
        ))}
      </Box>

      {/* Panel capas (arriba en Photopea) — aquí tab completo */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "layers" && (
          <Box sx={{ flex: 1, minHeight: 0, p: 0.75 }}>
            <LayersPanel />
          </Box>
        )}

        {tab === "properties" && (
          <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 1 }}>
            <Typography sx={{ fontSize: 11, color: PE.textMuted, mb: 1, fontWeight: 700 }}>
              Inspector
            </Typography>
            <InspectorPanel
              selectedLayer={selectedId}
              layers={layers}
              setLayerMeta={setLayerMeta}
              updateLayerProps={updateLayerProps}
              toggleVisible={toggleVisible}
              toggleLocked={toggleLocked}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
