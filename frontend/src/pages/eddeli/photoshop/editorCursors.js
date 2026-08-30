/** Cursores personalizados por herramienta (estilo Photopea). */

const svgCursor = (body, hx = 4, hy = 4) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hx} ${hy}, auto`;
};

const ICONS = {
  move: `<path fill="#fff" stroke="#111" stroke-width="0.6" d="M4 4l6.5 17 2.5-7 7-2.5L4 4z"/>`,
  selectRect: `<rect x="5" y="5" width="14" height="14" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 2"/><rect x="5" y="5" width="14" height="14" fill="none" stroke="#111" stroke-width="0.5" stroke-dasharray="3 2"/>`,
  selectEllipse: `<ellipse cx="12" cy="12" rx="7" ry="7" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 2"/><ellipse cx="12" cy="12" rx="7" ry="7" fill="none" stroke="#111" stroke-width="0.5" stroke-dasharray="3 2"/>`,
  selectLasso: `<path fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 2" d="M6 8c2-3 6-3 8 0 2 2 2 6-1 8-2 2-5 2-7 0"/><path fill="none" stroke="#111" stroke-width="0.5" d="M6 8c2-3 6-3 8 0 2 2 2 6-1 8-2 2-5 2-7 0"/>`,
  crop: `<path fill="#fff" stroke="#111" stroke-width="0.5" d="M7 3h2v4h4V5h2v6h-2v-2H9v4H7V3zm10 18h-2v-4h-4v2H9v-6h2v2h4V9h2v12z"/>`,
  text: `<path fill="#fff" stroke="#111" stroke-width="0.4" d="M6 5h12v2.5H14v11.5h-4V7.5H6V5z"/>`,
  shape: `<rect x="5" y="7" width="14" height="10" rx="1.5" fill="#fff" stroke="#111" stroke-width="0.6"/>`,
  image: `<rect x="4" y="6" width="16" height="12" rx="1" fill="#fff" stroke="#111" stroke-width="0.6"/><circle cx="9" cy="11" r="2" fill="#4a9eff"/><path fill="#4a9eff" d="M6 16l4-4 3 3 2-2 3 3H6z"/>`,
  eyedropper: `<path fill="#fff" stroke="#111" stroke-width="0.5" d="M17 3a2.5 2.5 0 00-3.5 0l-9 9 3.5 3.5 9-9A2.5 2.5 0 0017 3z"/><path fill="#4a9eff" d="M5 19l2-2 3 3-2 2H5v-3z"/>`,
  cut: `<path fill="#fff" stroke="#111" stroke-width="0.5" d="M8.5 8a2.5 2.5 0 110-5 2.5 2.5 0 010 5zm0 13a2.5 2.5 0 110-5 2.5 2.5 0 010 5zM18 6L6 18M6 6l12 12" stroke="#fff" stroke-width="1.5"/>`,
  default: `<circle cx="12" cy="12" r="2" fill="#fff" stroke="#111" stroke-width="0.5"/>`,
};

const CURSORS = {
  move: svgCursor(ICONS.move, 4, 4),
  "select-rect": "crosshair",
  "select-ellipse": "crosshair",
  "select-lasso": svgCursor(ICONS.selectLasso, 8, 8),
  "select-poly": svgCursor(ICONS.selectLasso, 8, 8),
  "select-magnetic": svgCursor(ICONS.selectLasso, 8, 8),
  crop: svgCursor(ICONS.crop, 6, 6),
  text: svgCursor(ICONS.text, 12, 12),
  shape: svgCursor(ICONS.shape, 12, 12),
  image: svgCursor(ICONS.image, 12, 12),
  eyedropper: svgCursor(ICONS.eyedropper, 4, 20),
  cut: svgCursor(ICONS.cut, 12, 12),
};

export const SELECTION_TOOL_IDS = [
  "select-rect",
  "select-ellipse",
  "select-lasso",
  "select-poly",
  "select-magnetic",
];

export const DEFAULT_SELECTION_TOOL = "select-rect";

export function isSelectionTool(toolId) {
  return toolId === "crop" || SELECTION_TOOL_IDS.includes(toolId);
}

export function getEditorCursor(toolId, fallback = "default") {
  return CURSORS[toolId] || fallback;
}
