/** Cursores personalizados por herramienta. */

const svgCursor = (body, hx = 4, hy = 4) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hx} ${hy}, auto`;
};

const ICONS = {
  select: `<path fill="#fff" stroke="#111" stroke-width="0.6" d="M4 4l6.5 17 2.5-7 7-2.5L4 4z"/>`,
  text: `<path fill="#fff" stroke="#111" stroke-width="0.4" d="M6 5h12v2.5H14v11.5h-4V7.5H6V5z"/>`,
  shape: `<rect x="5" y="7" width="14" height="10" rx="1.5" fill="#fff" stroke="#111" stroke-width="0.6"/>`,
  image: `<rect x="4" y="6" width="16" height="12" rx="1" fill="#fff" stroke="#111" stroke-width="0.6"/><circle cx="9" cy="11" r="2" fill="#4a9eff"/><path fill="#4a9eff" d="M6 16l4-4 3 3 2-2 3 3H6z"/>`,
  svg: `<path fill="#fff" stroke="#111" stroke-width="0.5" d="M6 6h12v12H6z"/><path fill="none" stroke="#4a9eff" stroke-width="1.5" d="M8 14l3-4 2 2 3-4"/>`,
  eyedropper: `<path fill="#fff" stroke="#111" stroke-width="0.5" d="M17 3a2.5 2.5 0 00-3.5 0l-9 9 3.5 3.5 9-9A2.5 2.5 0 0017 3z"/><path fill="#4a9eff" d="M5 19l2-2 3 3-2 2H5v-3z"/>`,
  "paint-bucket": `<path fill="#fff" stroke="#111" stroke-width="0.6" d="M8 10l6-6 4 4-6 6H8z"/><path fill="#4a9eff" stroke="#111" stroke-width="0.4" d="M8 14h6l2 3v2H6v-2l2-3z"/><circle cx="17" cy="7" r="1.6" fill="#ffb74d" stroke="#111" stroke-width="0.4"/>`,
  "select-rect": `<path fill="none" stroke="#111" stroke-width="3" stroke-linecap="square" d="M12 3v18M3 12h18"/><path fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="square" d="M12 3v18M3 12h18"/>`,
  "select-ellipse": `<path fill="none" stroke="#111" stroke-width="3" stroke-linecap="square" d="M12 3v18M3 12h18"/><path fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="square" d="M12 3v18M3 12h18"/>`,
};

const CURSORS = {
  select: "default",
  move: "default",
  text: svgCursor(ICONS.text, 12, 12),
  shape: svgCursor(ICONS.shape, 12, 12),
  image: svgCursor(ICONS.image, 12, 12),
  svg: svgCursor(ICONS.svg, 12, 12),
  eyedropper: svgCursor(ICONS.eyedropper, 4, 20),
  "paint-bucket": svgCursor(ICONS["paint-bucket"], 4, 20),
  "select-rect": svgCursor(ICONS["select-rect"], 12, 12),
  "select-ellipse": svgCursor(ICONS["select-ellipse"], 12, 12),
};

export const SELECTION_TOOL_IDS = ["select-rect", "select-ellipse"];

export const DEFAULT_SELECTION_TOOL = "select-rect";

export function isSelectionTool(toolId) {
  return SELECTION_TOOL_IDS.includes(toolId);
}

export function getEditorCursor(toolId, fallback = "default") {
  return CURSORS[toolId] || fallback;
}
