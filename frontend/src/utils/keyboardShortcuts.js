/**
 * Atajos de teclado configurables (catálogo + matching de eventos).
 */

export const KEYBOARD_SHORTCUT_CATALOG = [
  {
    id: "caja.checkout",
    module: "caja",
    moduleLabel: "Caja",
    label: "Realizar venta",
    description: "Cobra la venta actual.",
    defaultKeys: "Ctrl+Enter",
  },
  {
    id: "caja.clearCart",
    module: "caja",
    moduleLabel: "Caja",
    label: "Vaciar carrito",
    description: "Quita todas las líneas del listado.",
    defaultKeys: "Ctrl+Backspace",
  },
  {
    id: "caja.focusProduct",
    module: "caja",
    moduleLabel: "Caja",
    label: "Foco en buscar producto",
    description: "Cursor en el buscador de productos.",
    defaultKeys: "F2",
  },
  {
    id: "caja.quickAccess",
    module: "caja",
    moduleLabel: "Caja",
    label: "Accesos rápidos",
    description: "Abre el panel de productos rápidos.",
    defaultKeys: "F3",
  },
  {
    id: "caja.focusCustomer",
    module: "caja",
    moduleLabel: "Caja",
    label: "Foco en cliente",
    description: "Cursor en el selector de cliente.",
    defaultKeys: "F4",
  },
  {
    id: "caja.receivedEqualsTotal",
    module: "caja",
    moduleLabel: "Caja",
    label: "Efectivo recibido = total",
    description: "Completa el monto recibido con el total.",
    defaultKeys: "F5",
  },
  {
    id: "caja.printLast",
    module: "caja",
    moduleLabel: "Caja",
    label: "Imprimir último comprobante",
    description: "Imprime la última venta cobrada.",
    defaultKeys: "Ctrl+P",
  },
  {
    id: "caja.newSale",
    module: "caja",
    moduleLabel: "Caja",
    label: "Nueva venta",
    description: "Limpia el carrito para otra venta.",
    defaultKeys: "Ctrl+N",
  },
  {
    id: "caja.removeLastLine",
    module: "caja",
    moduleLabel: "Caja",
    label: "Quitar última línea",
    description: "Elimina el último producto del carrito.",
    defaultKeys: "Ctrl+Shift+Backspace",
  },
];

const CATALOG_IDS = new Set(KEYBOARD_SHORTCUT_CATALOG.map((c) => c.id));

const MOD_ALIASES = {
  control: "ctrl",
  ctrl: "ctrl",
  cmd: "meta",
  command: "meta",
  meta: "meta",
  alt: "alt",
  option: "alt",
  shift: "shift",
};

const KEY_ALIASES = {
  esc: "Escape",
  escape: "Escape",
  enter: "Enter",
  return: "Enter",
  space: " ",
  " ": " ",
  backspace: "Backspace",
  delete: "Delete",
  del: "Delete",
  tab: "Tab",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
};

function defaultMap() {
  const out = {};
  for (const cmd of KEYBOARD_SHORTCUT_CATALOG) {
    out[cmd.id] = { keys: cmd.defaultKeys, enabled: true };
  }
  return out;
}

function parseStored(raw) {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function normalizeKeyboardShortcuts(raw) {
  const stored = parseStored(raw);
  const out = defaultMap();
  for (const [id, value] of Object.entries(stored)) {
    if (!CATALOG_IDS.has(id)) continue;
    const keys = String(value?.keys ?? value?.combo ?? "").trim();
    out[id] = {
      keys: keys || out[id].keys,
      enabled: value?.enabled !== false,
    };
  }
  return out;
}

export function getShortcutBinding(map, commandId) {
  const cfg = normalizeKeyboardShortcuts(map)[commandId];
  if (!cfg?.enabled) return null;
  const keys = String(cfg.keys || "").trim();
  return keys || null;
}

export function parseCombo(comboStr) {
  const raw = String(comboStr || "").trim();
  if (!raw) return null;
  const parts = raw.split("+").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const modifiers = { ctrl: false, alt: false, shift: false, meta: false };
  let key = "";
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (MOD_ALIASES[lower]) {
      modifiers[MOD_ALIASES[lower]] = true;
      continue;
    }
    key = normalizeKeyName(part);
  }
  if (!key) return null;
  return { modifiers, key, raw };
}

function normalizeKeyName(key) {
  const k = String(key || "").trim();
  if (!k) return "";
  if (/^f\d{1,2}$/i.test(k)) return k.toUpperCase();
  const alias = KEY_ALIASES[k.toLowerCase()];
  if (alias) return alias;
  if (k.length === 1) return k.toUpperCase();
  if (k === " ") return " ";
  return k;
}

export function normalizeEventKey(event) {
  const key = event?.key;
  if (!key) return "";
  if (key === " ") return " ";
  if (/^f\d{1,2}$/i.test(key)) return key.toUpperCase();
  if (key.length === 1) return key.toUpperCase();
  return key;
}

export function eventToComboString(event) {
  const parts = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.metaKey) parts.push("Meta");
  const key = normalizeEventKey(event);
  if (!key || key === "Control" || key === "Alt" || key === "Shift" || key === "Meta") {
    return parts.join("+");
  }
  parts.push(key === " " ? "Space" : key);
  return parts.join("+");
}

export function eventMatchesCombo(event, comboStr) {
  const parsed = parseCombo(comboStr);
  if (!parsed) return false;
  const { modifiers, key } = parsed;
  if (Boolean(event.ctrlKey) !== modifiers.ctrl) return false;
  if (Boolean(event.altKey) !== modifiers.alt) return false;
  if (Boolean(event.shiftKey) !== modifiers.shift) return false;
  if (Boolean(event.metaKey) !== modifiers.meta) return false;
  return normalizeEventKey(event) === key;
}

export function shouldIgnoreShortcutTarget(event, comboStr) {
  const el = event.target;
  const tag = el?.tagName?.toLowerCase();
  const isField =
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el?.isContentEditable;
  if (!isField) return false;
  const parsed = parseCombo(comboStr);
  if (!parsed) return true;
  const { modifiers } = parsed;
  return !modifiers.ctrl && !modifiers.alt && !modifiers.meta;
}

export function findMatchingCommand(map, event, commandIds) {
  const normalized = normalizeKeyboardShortcuts(map);
  for (const id of commandIds) {
    const binding = normalized[id];
    if (!binding?.enabled) continue;
    const keys = String(binding.keys || "").trim();
    if (!keys) continue;
    if (shouldIgnoreShortcutTarget(event, keys)) continue;
    if (eventMatchesCombo(event, keys)) return id;
  }
  return null;
}

export function catalogByModule() {
  const groups = new Map();
  for (const cmd of KEYBOARD_SHORTCUT_CATALOG) {
    const list = groups.get(cmd.module) || [];
    list.push(cmd);
    groups.set(cmd.module, list);
  }
  return groups;
}

export function detectShortcutConflicts(map) {
  const normalized = normalizeKeyboardShortcuts(map);
  const byKeys = new Map();
  for (const [id, cfg] of Object.entries(normalized)) {
    if (!cfg.enabled) continue;
    const keys = String(cfg.keys || "").trim().toLowerCase();
    if (!keys) continue;
    const list = byKeys.get(keys) || [];
    list.push(id);
    byKeys.set(keys, list);
  }
  const conflicts = [];
  for (const [keys, ids] of byKeys.entries()) {
    if (ids.length > 1) conflicts.push({ keys, ids });
  }
  return conflicts;
}
