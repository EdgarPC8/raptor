import { nowId, ensureUniqueId } from "./editorActions.js";

export const getLayerFolderId = (layer) =>
  layer?.folderId ?? layer?.props?.folderId ?? null;

export function withFolderId(layer, folderId) {
  const next = folderId || null;
  const props = { ...(layer.props || {}) };
  if (next) props.folderId = next;
  else delete props.folderId;
  return { ...layer, folderId: next, props };
}

export function normalizeName(name) {
  return String(name || "").trim();
}

export function namesEqual(a, b) {
  return normalizeName(a).toLowerCase() === normalizeName(b).toLowerCase();
}

/** Nombre de capa único en todo el documento. */
export function ensureUniqueLayerName(desired, layers, exceptId = null) {
  const base = normalizeName(desired) || "Capa";
  const taken = new Set(
    (layers || [])
      .filter((l) => l.id !== exceptId)
      .map((l) => normalizeName(l.name).toLowerCase())
      .filter(Boolean)
  );
  if (!taken.has(base.toLowerCase())) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`.toLowerCase())) n += 1;
  return `${base} ${n}`;
}

/** Nombre de carpeta único (global). */
export function ensureUniqueFolderName(desired, folders, exceptId = null) {
  const base = normalizeName(desired) || "Carpeta";
  const taken = new Set(
    (folders || [])
      .filter((f) => f.id !== exceptId)
      .map((f) => normalizeName(f.name).toLowerCase())
      .filter(Boolean)
  );
  if (!taken.has(base.toLowerCase())) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`.toLowerCase())) n += 1;
  return `${base} ${n}`;
}

export function isNameTakenByLayer(name, layers, exceptId = null) {
  const n = normalizeName(name);
  if (!n) return false;
  return (layers || []).some(
    (l) => l.id !== exceptId && namesEqual(l.name, n)
  );
}

export function isNameTakenByFolder(name, folders, exceptId = null) {
  const n = normalizeName(name);
  if (!n) return false;
  return (folders || []).some(
    (f) => f.id !== exceptId && namesEqual(f.name, n)
  );
}

export function makeFolderId(used = new Set()) {
  return ensureUniqueId(`folder_${nowId()}`, used);
}

/** Reconstruye carpetas desde props.folderId si faltan en settings. */
export function recoverFoldersFromLayers(folders = [], layers = []) {
  const list = Array.isArray(folders) ? folders.map((f) => ({ ...f })) : [];
  const byId = new Map(list.map((f) => [f.id, f]));

  for (const layer of layers || []) {
    const fid = getLayerFolderId(layer);
    if (!fid || byId.has(fid)) continue;
    const pretty = String(fid)
      .replace(/^folder_/, "")
      .replace(/_/g, " ")
      .trim();
    const entry = {
      id: fid,
      name: pretty || fid,
      parentId: null,
    };
    list.push(entry);
    byId.set(fid, entry);
  }
  return list;
}

/**
 * Migra grupos espaciales que se usaron como carpetas (Grupo_N / no system a 0,0)
 * hacia doc.folders + layer.folderId, y deja las capas en el grupo espacial base.
 */
export function migrateLegacyFolderGroups(doc) {
  if (!doc || typeof doc !== "object") return doc;
  const groups = Array.isArray(doc.groups) ? [...doc.groups] : [];
  const layers = Array.isArray(doc.layers) ? [...doc.layers] : [];
  let folders = Array.isArray(doc.folders)
    ? doc.folders.map((f) => ({ ...f }))
    : Array.isArray(doc.meta?.folders)
      ? doc.meta.folders.map((f) => ({ ...f }))
      : [];

  const isSystemGroup = (id) =>
    !id || id === "group_main" || String(id).startsWith("group_");

  const base =
    groups.find((g) => g.id === "group_main") ||
    groups.find((g) => String(g.id).startsWith("group_")) ||
    groups[0] ||
    null;

  const legacy = groups.filter((g) => {
    if (!g?.id || isSystemGroup(g.id)) return false;
    return (g.x || 0) === 0 && (g.y || 0) === 0;
  });

  if (legacy.length && base) {
    const usedFolderIds = new Set(folders.map((f) => f.id));
    for (const g of legacy) {
      let folderId = `folder_${g.id}`;
      if (usedFolderIds.has(folderId)) folderId = makeFolderId(usedFolderIds);
      usedFolderIds.add(folderId);
      if (!folders.some((f) => f.id === folderId)) {
        folders.push({
          id: folderId,
          name: g.name || String(g.id).replace(/_/g, " "),
          parentId: null,
        });
      }
      for (let i = 0; i < layers.length; i += 1) {
        if (layers[i].groupId === g.id) {
          layers[i] = withFolderId(
            { ...layers[i], groupId: base.id },
            folderId
          );
        }
      }
    }
  }

  // Normalizar folderId desde props
  for (let i = 0; i < layers.length; i += 1) {
    const fid = getLayerFolderId(layers[i]);
    layers[i] = withFolderId(layers[i], fid);
  }

  // Si hay folderId en capas pero falta la carpeta en la lista (settings no parseado), recuperarla
  folders = recoverFoldersFromLayers(folders, layers);

  // Quitar carpetas huérfanas / parent inválido
  const folderIds = new Set(folders.map((f) => f.id));
  folders = folders.map((f) => ({
    id: f.id,
    name: f.name || f.id,
    parentId:
      f.parentId && folderIds.has(f.parentId) && f.parentId !== f.id
        ? f.parentId
        : null,
    ...(f.collapsed ? { collapsed: true } : {}),
  }));

  // Capas con folderId inexistente → sueltas
  for (let i = 0; i < layers.length; i += 1) {
    const fid = getLayerFolderId(layers[i]);
    if (fid && !folderIds.has(fid)) {
      layers[i] = withFolderId(layers[i], null);
    }
  }

  const nextGroups = legacy.length
    ? groups.filter((g) => !legacy.some((x) => x.id === g.id))
    : groups;

  return {
    ...doc,
    groups: nextGroups.length ? nextGroups : groups,
    layers,
    folders,
    meta: {
      ...(doc.meta || {}),
      folders,
    },
  };
}

/** Árbol de carpetas + capas sueltas / anidadas. */
export function buildFolderTree(folders = [], layers = []) {
  const byParent = new Map(); // parentId|null -> folder[]
  for (const f of folders) {
    const p = f.parentId || null;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p).push(f);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  const layersByFolder = new Map();
  const rootLayers = [];
  for (const l of layers) {
    const fid = getLayerFolderId(l);
    if (!fid) rootLayers.push(l);
    else {
      if (!layersByFolder.has(fid)) layersByFolder.set(fid, []);
      layersByFolder.get(fid).push(l);
    }
  }

  const sortLayers = (arr) =>
    [...arr].sort((a, b) => {
      const za = a.zIndex || 0;
      const zb = b.zIndex || 0;
      if (za !== zb) return zb - za;
      return String(a.id).localeCompare(String(b.id));
    });

  const walk = (parentId) => {
    const kids = byParent.get(parentId) || [];
    return kids.map((folder) => ({
      folder,
      layers: sortLayers(layersByFolder.get(folder.id) || []),
      children: walk(folder.id),
    }));
  };

  return {
    rootLayers: sortLayers(rootLayers),
    roots: walk(null),
  };
}

/** Ancestros de una carpeta (para evitar ciclos al anidar). */
export function getFolderAncestorIds(folderId, folders) {
  const byId = new Map((folders || []).map((f) => [f.id, f]));
  const out = [];
  let cur = byId.get(folderId);
  const guard = new Set();
  while (cur) {
    if (guard.has(cur.id)) break;
    guard.add(cur.id);
    out.push(cur.id);
    cur = cur.parentId ? byId.get(cur.parentId) : null;
  }
  return out;
}
