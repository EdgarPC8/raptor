/** Colores y medidas estilo Photopea */
export const PE = {
  bgApp: "#2b2b2b",
  bgMenu: "#474747",
  bgPanel: "#323232",
  bgPanelHeader: "#3a3a3a",
  bgCanvas: "#535353",
  bgToolbar: "#474747",
  border: "#1a1a1a",
  borderLight: "#555555",
  text: "#e8e8e8",
  textMuted: "#aaaaaa",
  accent: "#4a9eff",
  accentHover: "#6eb0ff",
  danger: "#e05555",
  leftToolbarW: 52,
  rightDockW: 280,
  menuH: 28,
  optionsH: 36,
  statusH: 26,
};

export const checkerboardBg = {
  backgroundColor: PE.bgCanvas,
  backgroundImage: `
    linear-gradient(45deg, #4a4a4a 25%, transparent 25%),
    linear-gradient(-45deg, #4a4a4a 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #4a4a4a 75%),
    linear-gradient(-45deg, transparent 75%, #4a4a4a 75%)
  `,
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
};
