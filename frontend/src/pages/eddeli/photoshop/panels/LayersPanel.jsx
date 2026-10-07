import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Stack,
  TextField,
  Tooltip,
  IconButton,
  Divider,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import ImageIcon from "@mui/icons-material/Image";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import PolylineIcon from "@mui/icons-material/Polyline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import DriveFileMoveIcon from "@mui/icons-material/DriveFileMove";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import { useEditor } from "../EditorProvider";
import { getSelectedLayerIds } from "../editorReducer";
import SimpleDialog from "../../../../components/Dialogs/SimpleDialog";
import { useEditorImageUpload } from "../useEditorImageUpload.jsx";
import { PE } from "../editorTheme";
import {
  combineSvgLayersAtPositions,
  fetchSvgText,
} from "../mergeSvgLayers.js";
import { uploadEditorImageFile } from "../editorImageUpload.js";
import { useAuth } from "../../../../context/AuthContext";
import {
  buildFolderTree,
  getLayerFolderId,
} from "../layerFolders.js";
import { fetchMediaCatalog } from "../../../../api/publicidadRequest.js";

function layerFormatBadge(layer) {
  if (!layer) return "?";
  if (layer.type === "text") return "txt";
  if (layer.type === "shape") return "shp";
  if (layer.type === "svg") return "svg";
  if (layer.type === "image") {
    const src = String(layer.props?.src || "");
    const m = src.match(/\.([a-z0-9]+)(?:\?|#|$)/i);
    let ext = (m?.[1] || "png").toLowerCase();
    if (ext === "jpeg") ext = "jpg";
    if (ext === "svg+xml") ext = "svg";
    return ext.slice(0, 4);
  }
  return String(layer.type || "?").slice(0, 4);
}

function LayerThumb({ layer }) {
  const badge = layerFormatBadge(layer);
  const fill =
    layer.type === "shape"
      ? layer.props?.fill || "#888"
      : layer.type === "text"
      ? "#5a7a9a"
      : layer.type === "svg"
      ? "#2d8a5e"
      : badge === "jpg" || badge === "jpeg"
      ? "#8a6a3a"
      : badge === "webp"
      ? "#3a6a8a"
      : "#6a6a6a";
  return (
    <Box
      title={badge.toUpperCase()}
      sx={{
        width: 30,
        height: 22,
        flexShrink: 0,
        borderRadius: 0.5,
        border: `1px solid ${PE.borderLight}`,
        background: fill,
        display: "grid",
        placeItems: "center",
        fontSize: 8,
        color: "#fff",
        fontWeight: 800,
        textTransform: "lowercase",
        letterSpacing: 0.2,
      }}
    >
      {badge}
    </Box>
  );
}

function FolderThumb({ open = true }) {
  return (
    <Box
      title="Carpeta"
      sx={{
        width: 30,
        height: 22,
        flexShrink: 0,
        borderRadius: 0.5,
        border: `1px solid ${PE.borderLight}`,
        background: "#c48a2a",
        display: "grid",
        placeItems: "center",
        color: "#fff",
      }}
    >
      {open ? (
        <FolderOpenIcon sx={{ fontSize: 15 }} />
      ) : (
        <FolderIcon sx={{ fontSize: 15 }} />
      )}
    </Box>
  );
}

function InlineRename({
  value,
  onCommit,
  fontSize = 11,
  fontWeight = 400,
  autoEdit = false,
  onAutoEditHandled,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(value || "");
  }, [value, editing]);

  useEffect(() => {
    if (!autoEdit) return;
    setEditing(true);
    onAutoEditHandled?.();
  }, [autoEdit]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const next = String(draft || "").trim();
    setEditing(false);
    if (next && next !== value) onCommit?.(next);
    else setDraft(value || "");
  };

  if (editing) {
    return (
      <TextField
        inputRef={inputRef}
        size="small"
        value={draft}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setDraft(value || "");
            setEditing(false);
          }
        }}
        variant="standard"
        sx={{
          flex: 1,
          minWidth: 0,
          "& .MuiInputBase-root": { fontSize, fontWeight, color: PE.text },
          "& .MuiInput-underline:before": { borderColor: PE.borderLight },
        }}
      />
    );
  }

  return (
    <Typography
      component="span"
      title="Doble clic para renombrar"
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setEditing(true);
      }}
      sx={{
        flex: 1,
        minWidth: 0,
        fontSize,
        fontWeight,
        color: PE.text,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        userSelect: "none",
        cursor: "default",
      }}
    >
      {value || "Sin nombre"}
    </Typography>
  );
}

export default function LayersPanel() {
  const {
    state,
    dispatch,
    deleteLayer,
    foregroundColor,
    selectedIds,
    autoSaveTemplateDoc,
  } = useEditor();
  const { toast } = useAuth();
  const { uploading, openFilePicker, HiddenFileInput } = useEditorImageUpload();
  const { doc, dragId } = state;

  const [layerToDelete, setLayerToDelete] = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [merging, setMerging] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState(null);
  const [renameLayerId, setRenameLayerId] = useState(null);
  const [systemImageDialogOpen, setSystemImageDialogOpen] = useState(false);
  const [systemImages, setSystemImages] = useState([]);
  const [loadingSystemImages, setLoadingSystemImages] = useState(false);
  /** Ancla para selección por rango (Shift+clic), como en explorador de archivos. */
  const selectionAnchorRef = useRef(null);

  const selectedSet = useMemo(
    () => new Set(selectedIds?.length ? selectedIds : getSelectedLayerIds(state.selected)),
    [selectedIds, state.selected]
  );

  const folders = doc.folders || [];
  const tree = useMemo(
    () => buildFolderTree(folders, doc.layers || []),
    [folders, doc.layers]
  );

  /** Orden visual del panel (arriba → abajo), para Shift+clic. */
  const layerOrderIds = useMemo(() => {
    const ids = [];
    const walk = (node) => {
      for (const l of node.layers || []) ids.push(l.id);
      for (const c of node.children || []) walk(c);
    };
    for (const n of tree.roots || []) walk(n);
    for (const l of tree.rootLayers || []) ids.push(l.id);
    return ids;
  }, [tree]);

  const selectLayer = (layerId, e) => {
    // Clic en el panel de capas siempre selecciona la capa (aunque la herramienta sea M)
    e?.stopPropagation?.();

    if (e?.shiftKey) {
      const order = layerOrderIds;
      const anchor =
        selectionAnchorRef.current ||
        getSelectedLayerIds(state.selected)[0] ||
        layerId;
      const a = order.indexOf(anchor);
      const b = order.indexOf(layerId);
      if (a >= 0 && b >= 0) {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const ids = order.slice(lo, hi + 1);
        dispatch({
          type: "SET_SELECTED",
          selected: { kind: "layer", id: layerId, ids },
        });
        return;
      }
    }

    if (e?.ctrlKey || e?.metaKey) {
      selectionAnchorRef.current = layerId;
      dispatch({ type: "TOGGLE_LAYER_IN_SELECTION", layerId });
      return;
    }

    selectionAnchorRef.current = layerId;
    dispatch({
      type: "SET_SELECTED",
      selected: { kind: "layer", id: layerId, ids: [layerId] },
    });
  };

  const selectFolderContents = (node, e) => {
    const collect = (n) => {
      const ids = n.layers.filter((l) => !l.locked).map((l) => l.id);
      for (const c of n.children || []) ids.push(...collect(c));
      return ids;
    };
    const ids = collect(node);
    if (!ids.length) return;
    if (e?.ctrlKey || e?.metaKey) {
      const current = getSelectedLayerIds(state.selected);
      const merged = [...new Set([...current, ...ids])];
      dispatch({
        type: "SET_SELECTED",
        selected: { kind: "layer", id: ids[0], ids: merged },
      });
      return;
    }
    dispatch({
      type: "SET_SELECTED",
      selected: { kind: "layer", id: ids[0], ids },
    });
  };

  const openLayerContextMenu = (e, layer) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedSet.has(layer.id)) {
      dispatch({
        type: "SET_SELECTED",
        selected: { kind: "layer", id: layer.id, ids: [layer.id] },
      });
    }
    setCtxMenu({
      mouseX: e.clientX,
      mouseY: e.clientY,
      layerId: layer.id,
      folderId: null,
    });
  };

  const openFolderContextMenu = (e, folderId, node) => {
    e.preventDefault();
    e.stopPropagation();
    selectFolderContents(node, e);
    setCtxMenu({
      mouseX: e.clientX,
      mouseY: e.clientY,
      layerId: null,
      folderId,
    });
  };

  const closeCtxMenu = () => setCtxMenu(null);

  const selectedSvgLayers = useMemo(() => {
    const ids = getSelectedLayerIds(state.selected);
    return ids
      .map((id) => (doc.layers || []).find((l) => l.id === id))
      .filter((l) => l && l.type === "svg" && !l.locked && l.props?.src);
  }, [state.selected, doc.layers]);

  const canMergeSvg = selectedSvgLayers.length >= 2;

  const selectedLayerIds = getSelectedLayerIds(state.selected);
  const canMoveOut = selectedLayerIds.some((id) => {
    const l = (doc.layers || []).find((x) => x.id === id);
    return l && getLayerFolderId(l);
  });

  const mergeSelectedSvgs = useCallback(async () => {
    closeCtxMenu();
    if (selectedSvgLayers.length < 2) return;
    setMerging(true);
    try {
      const ordered = [...selectedSvgLayers].sort(
        (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
      );
      const texts = await Promise.all(
        ordered.map((l) => fetchSvgText(l.props.src))
      );
      const { svg: combined, layerPatch } = combineSvgLayersAtPositions(
        ordered,
        texts,
        state.doc?.groups || []
      );
      const baseName =
        ordered.map((l) => l.name).filter(Boolean).slice(0, 2).join("+") ||
        "fusion";
      const safeName = String(baseName)
        .replace(/[^\w\-]+/g, "_")
        .slice(0, 40);
      const file = new File([combined], `${safeName || "fusion"}.svg`, {
        type: "image/svg+xml",
      });
      const relPath = await uploadEditorImageFile(file);
      const keep = ordered[ordered.length - 1];
      const removeIds = ordered.filter((l) => l.id !== keep.id).map((l) => l.id);
      const mergeName =
        ordered.length <= 3
          ? ordered.map((l) => l.name).join(" + ")
          : `${ordered[0].name} +${ordered.length - 1}`;

      dispatch({
        type: "MERGE_SVG_LAYERS",
        keepLayerId: keep.id,
        removeLayerIds: removeIds,
        src: relPath,
        name: mergeName.slice(0, 140),
        layerPatch: layerPatch
          ? {
              x: layerPatch.x,
              y: layerPatch.y,
              w: layerPatch.w,
              h: layerPatch.h,
              ...(layerPatch.groupId ? { groupId: layerPatch.groupId } : {}),
            }
          : undefined,
      });
      await autoSaveTemplateDoc?.();
      toast?.({
        message: `SVG fusionados (${ordered.length} → 1)`,
        variant: "success",
      });
    } catch (err) {
      console.error(err);
      toast?.({
        message: err?.message || "No se pudo fusionar los SVG",
        variant: "error",
      });
    } finally {
      setMerging(false);
    }
  }, [selectedSvgLayers, dispatch, autoSaveTemplateDoc, toast, state.doc?.groups]);

  const moveSelectedToRoot = () => {
    closeCtxMenu();
    const ids = getSelectedLayerIds(state.selected);
    if (!ids.length) return;
    dispatch({
      type: "MOVE_TO_FOLDER",
      layerIds: ids,
      targetFolderId: null,
    });
  };

  const moveFolderToRoot = (folderId) => {
    closeCtxMenu();
    if (!folderId) return;
    dispatch({
      type: "MOVE_TO_FOLDER",
      folderIds: [folderId],
      targetFolderId: null,
    });
  };

  const groupSelected = () => {
    closeCtxMenu();
    dispatch({ type: "GROUP_SELECTED_LAYERS" });
  };

  const duplicateSelectedLayer = () => {
    closeCtxMenu();
    const ids = getSelectedLayerIds(state.selected);
    if (!ids.length) return;
    const current = (doc.layers || []).find((l) => l.id === ids[0]);
    if (!current) return;
    dispatch({ type: "DUPLICATE_SELECTED_LAYER" });
  };

  const renderLayerRow = (l, indent = 0) => {
    const isSelected = selectedSet.has(l.id);
    return (
      <Box
        key={l.id}
        draggable
        onDragStart={() => dispatch({ type: "SET_DRAG_ID", dragId: l.id })}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() =>
          dispatch({ type: "REORDER_BY_DROP", fromId: dragId, toId: l.id })
        }
        onClick={(e) => selectLayer(l.id, e)}
        onContextMenu={(e) => openLayerContextMenu(e, l)}
        sx={{
          pl: 0.5 + indent * 1.25,
          pr: 0.5,
          py: 0.4,
          borderRadius: 0.5,
          background: isSelected ? "rgba(74,158,255,0.2)" : "transparent",
          border: isSelected ? `1px solid ${PE.accent}` : "1px solid transparent",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          cursor: "pointer",
          "&:hover": {
            background: isSelected
              ? "rgba(74,158,255,0.25)"
              : "rgba(255,255,255,0.05)",
          },
        }}
      >
        <LayerThumb layer={l} />
        <Tooltip title={l.visible ? "Ocultar" : "Mostrar"}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "TOGGLE_VISIBLE", layerId: l.id });
            }}
            sx={{ color: l.visible ? PE.text : PE.textMuted, p: 0.25 }}
          >
            {l.visible ? (
              <VisibilityIcon sx={{ fontSize: 16 }} />
            ) : (
              <VisibilityOffIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Tooltip>
        <InlineRename
          value={l.name}
          autoEdit={renameLayerId === l.id}
          onAutoEditHandled={() => setRenameLayerId(null)}
          onCommit={(name) =>
            dispatch({ type: "UPDATE_LAYER", layerId: l.id, patch: { name } })
          }
        />
        <Tooltip title={l.locked ? "Desbloquear" : "Bloquear"}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "TOGGLE_LOCKED", layerId: l.id });
            }}
            sx={{ color: l.locked ? "#ffb74d" : PE.textMuted, p: 0.25 }}
          >
            {l.locked ? (
              <LockIcon sx={{ fontSize: 16 }} />
            ) : (
              <LockOpenIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title="Eliminar">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setLayerToDelete(l);
            }}
            sx={{ color: PE.danger, p: 0.25 }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  const renderFolderNode = (node, indent = 0) => {
    const { folder, layers: layersIn, children } = node;
    const key = folder.id;
    const isCollapsed = !!folder.collapsed;
    const allIds = [];
    const collectIds = (n) => {
      for (const l of n.layers) allIds.push(l.id);
      for (const c of n.children || []) collectIds(c);
    };
    collectIds(node);
    const allSelected =
      allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
    const layerById = new Map((doc.layers || []).map((l) => [l.id, l]));
    const folderVisible =
      allIds.length > 0 &&
      allIds.every((id) => layerById.get(id)?.visible !== false);

    return (
      <Box key={key}>
        <Box
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            dispatch({ type: "SET_DRAG_ID", dragId: `folder:${folder.id}` });
          }}
          onClick={(e) => {
            if (e.target.closest("[data-folder-toggle]")) return;
            if (e.target.closest("[data-folder-visibility]")) return;
            if (e.target.closest("input")) return;
            selectFolderContents(node, e);
          }}
          onContextMenu={(e) => openFolderContextMenu(e, folder.id, node)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!dragId) return;
            if (String(dragId).startsWith("folder:")) {
              const fid = String(dragId).slice(7);
              if (fid && fid !== folder.id) {
                dispatch({
                  type: "MOVE_TO_FOLDER",
                  folderIds: [fid],
                  targetFolderId: folder.id,
                });
              }
            } else {
              dispatch({
                type: "MOVE_TO_FOLDER",
                layerIds: [dragId],
                targetFolderId: folder.id,
              });
            }
            dispatch({ type: "SET_DRAG_ID", dragId: null });
          }}
          sx={{
            pl: 0.5 + indent * 1.25,
            pr: 0.5,
            py: 0.35,
            borderRadius: 0.5,
            display: "flex",
            alignItems: "center",
            gap: 0.25,
            cursor: "pointer",
            background: allSelected
              ? "rgba(74,158,255,0.12)"
              : "rgba(255,255,255,0.03)",
            border: allSelected
              ? `1px solid ${PE.accent}`
              : `1px solid transparent`,
            "&:hover": { background: "rgba(255,255,255,0.06)" },
          }}
        >
          <IconButton
            data-folder-toggle
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({
                type: "SET_FOLDER_COLLAPSED",
                folderId: folder.id,
                collapsed: !isCollapsed,
              });
              autoSaveTemplateDoc?.();
            }}
            sx={{ color: PE.textMuted, p: 0.15 }}
          >
            {isCollapsed ? (
              <ChevronRightIcon sx={{ fontSize: 16 }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
          <FolderThumb open={!isCollapsed} />
          <Tooltip title={folderVisible ? "Ocultar carpeta" : "Mostrar carpeta"}>
            <span>
              <IconButton
                data-folder-visibility
                size="small"
                disabled={!allIds.length}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!allIds.length) return;
                  dispatch({
                    type: "SET_LAYERS_VISIBLE",
                    layerIds: allIds,
                    visible: !folderVisible,
                  });
                }}
                sx={{
                  color: folderVisible ? PE.text : PE.textMuted,
                  p: 0.25,
                }}
              >
                {folderVisible ? (
                  <VisibilityIcon sx={{ fontSize: 16 }} />
                ) : (
                  <VisibilityOffIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
          <InlineRename
            value={folder.name}
            fontWeight={700}
            autoEdit={renameFolderId === folder.id}
            onAutoEditHandled={() => setRenameFolderId(null)}
            onCommit={(name) =>
              dispatch({ type: "RENAME_FOLDER", folderId: folder.id, name })
            }
          />
          <Typography sx={{ fontSize: 10, color: PE.textMuted }}>
            {layersIn.length +
              (children || []).reduce(
                (acc, c) => acc + c.layers.length,
                0
              )}
          </Typography>
        </Box>
        {!isCollapsed && (
          <>
            {(children || []).map((c) => renderFolderNode(c, indent + 1))}
            {layersIn.map((l) => renderLayerRow(l, indent + 1))}
          </>
        )}
      </Box>
    );
  };

  const hasAnything =
    tree.rootLayers.length > 0 || tree.roots.length > 0;

  const loadSystemImages = useCallback(async () => {
    try {
      setLoadingSystemImages(true);
      const data = await fetchMediaCatalog();
      const images = [...(data?.products || []), ...(data?.images || [])]
        .filter((item) => item?.previewUrl || item?.mediaPath)
        .slice(0, 80);
      setSystemImages(images);
    } catch (err) {
      console.error("fetchMediaCatalog error:", err);
      setSystemImages([]);
    } finally {
      setLoadingSystemImages(false);
    }
  }, []);

  const pickSystemImage = useCallback(
    (item) => {
      const src = item?.previewUrl || item?.mediaPath || "";
      if (!src) return;

      dispatch({
        type: "ADD_LAYER",
        layerType: "image",
        propsPatch: { src, fit: "contain" },
        layerPatch: {
          w: 500,
          h: 500,
          name: item?.title || item?.subtitle || "Imagen del sistema",
        },
        clearBind: true,
      });
      setSystemImageDialogOpen(false);
    },
    [dispatch]
  );

  const closeSystemImageDialog = () => setSystemImageDialogOpen(false);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <HiddenFileInput />
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 0.25,
          pb: 0.75,
          borderBottom: `1px solid ${PE.border}`,
        }}
      >
        <Tooltip title="Añadir capa de texto">
          <IconButton
            size="small"
            onClick={() => dispatch({ type: "ADD_LAYER", layerType: "text" })}
            sx={{
              color: PE.text,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${PE.borderLight}`,
              borderRadius: 0.5,
              "&:hover": { background: "rgba(255,255,255,0.12)" },
            }}
          >
            <TextFieldsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Subir SVG (vector)">
          <IconButton
            size="small"
            disabled={uploading}
            onClick={() => openFilePicker("add-svg")}
            sx={{
              color: PE.text,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${PE.borderLight}`,
              borderRadius: 0.5,
              "&:hover": { background: "rgba(255,255,255,0.12)" },
            }}
          >
            <PolylineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Subir imagen (PNG/JPG/WebP)">
          <IconButton
            size="small"
            disabled={uploading}
            onClick={() => openFilePicker("add-raster")}
            sx={{
              color: PE.text,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${PE.borderLight}`,
              borderRadius: 0.5,
              "&:hover": { background: "rgba(255,255,255,0.12)" },
            }}
          >
            <ImageIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Usar imagen del sistema">
          <IconButton
            size="small"
            onClick={async () => {
              setSystemImageDialogOpen(true);
              await loadSystemImages();
            }}
            sx={{
              color: PE.text,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${PE.borderLight}`,
              borderRadius: 0.5,
              "&:hover": { background: "rgba(255,255,255,0.12)" },
            }}
          >
            <PhotoLibraryIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Añadir capa de color / fondo">
          <IconButton
            size="small"
            onClick={() =>
              dispatch({
                type: "ADD_LAYER",
                layerType: "shape",
                propsPatch: { fill: foregroundColor },
                layerPatch: { w: 500, h: 180, name: "Capa de color" },
              })
            }
            sx={{
              color: PE.text,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${PE.borderLight}`,
              borderRadius: 0.5,
              "&:hover": { background: "rgba(255,255,255,0.12)" },
            }}
          >
            <CropSquareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor: PE.border, mb: 0.5 }} />

      <Typography sx={{ px: 1, pb: 0.5, fontSize: 10, color: PE.textMuted }}>
        Capas sueltas · clic + Shift rango · Ctrl clic sueltas · Ctrl+G carpeta
      </Typography>

      <Box
        sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative" }}
        onMouseDown={(e) => e.stopPropagation()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          // soltar en zona raíz = sacar de carpeta
          e.preventDefault();
          if (!dragId) return;
          if (String(dragId).startsWith("folder:")) {
            dispatch({
              type: "MOVE_TO_FOLDER",
              folderIds: [String(dragId).slice(7)],
              targetFolderId: null,
            });
          } else {
            dispatch({
              type: "MOVE_TO_FOLDER",
              layerIds: [dragId],
              targetFolderId: null,
            });
          }
          dispatch({ type: "SET_DRAG_ID", dragId: null });
        }}
      >
        {merging && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              display: "grid",
              placeItems: "center",
              background: "rgba(0,0,0,0.35)",
            }}
          >
            <CircularProgress size={28} />
          </Box>
        )}
        <Stack spacing={0.25} data-root-drop>
          {!hasAnything ? (
            <Box sx={{ p: 2, textAlign: "center", color: PE.textMuted, fontSize: 11 }}>
              Sin capas. Usa la barra izquierda o Capa → Nueva.
            </Box>
          ) : (
            <>
              {tree.roots.map((n) => renderFolderNode(n, 0))}
              {tree.rootLayers.map((l) => renderLayerRow(l, 0))}
            </>
          )}
        </Stack>
      </Box>

      <Menu
        open={Boolean(ctxMenu)}
        onClose={closeCtxMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          ctxMenu ? { top: ctxMenu.mouseY, left: ctxMenu.mouseX } : undefined
        }
        slotProps={{
          paper: {
            sx: {
              background: PE.bgPanel,
              color: PE.text,
              border: `1px solid ${PE.border}`,
              minWidth: 220,
            },
          },
        }}
      >
        <MenuItem
          disabled={selectedLayerIds.length < 1}
          onClick={groupSelected}
        >
          <ListItemIcon sx={{ color: PE.text }}>
            <CreateNewFolderIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Agrupar en carpeta (Ctrl+G)" />
        </MenuItem>
        <MenuItem disabled={!canMoveOut} onClick={moveSelectedToRoot}>
          <ListItemIcon sx={{ color: PE.text }}>
            <DriveFileMoveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Sacar de la carpeta" />
        </MenuItem>
        {ctxMenu?.folderId && (
          <MenuItem onClick={() => moveFolderToRoot(ctxMenu.folderId)}>
            <ListItemIcon sx={{ color: PE.text }}>
              <DriveFileMoveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Sacar carpeta afuera" />
          </MenuItem>
        )}
        <MenuItem disabled={!canMergeSvg || merging} onClick={mergeSelectedSvgs}>
          <ListItemIcon sx={{ color: PE.text }}>
            {merging ? (
              <CircularProgress size={16} />
            ) : (
              <MergeTypeIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText
            primary={
              canMergeSvg
                ? `Fusionar SVG (${selectedSvgLayers.length})`
                : "Fusionar SVG (elige 2+)"
            }
          />
        </MenuItem>
        {ctxMenu?.layerId && (
          <MenuItem
            onClick={() => {
              setRenameLayerId(ctxMenu.layerId);
              closeCtxMenu();
            }}
          >
            <ListItemIcon sx={{ color: PE.text }}>
              <DriveFileRenameOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Renombrar capa" />
          </MenuItem>
        )}
        {ctxMenu?.folderId && (
          <MenuItem
            onClick={() => {
              dispatch({ type: "DUPLICATE_FOLDER", folderId: ctxMenu.folderId });
              closeCtxMenu();
            }}
          >
            <ListItemIcon sx={{ color: PE.text }}>
              <ContentCopyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Duplicar carpeta con contenido" />
          </MenuItem>
        )}
        {ctxMenu?.folderId && (
          <MenuItem
            onClick={() => {
              setRenameFolderId(ctxMenu.folderId);
              closeCtxMenu();
            }}
          >
            <ListItemIcon sx={{ color: PE.text }}>
              <DriveFileRenameOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Renombrar carpeta" />
          </MenuItem>
        )}
        {ctxMenu?.layerId && (
          <MenuItem
            onClick={() => {
              const layer = (doc.layers || []).find(
                (l) => l.id === ctxMenu.layerId
              );
              closeCtxMenu();
              if (layer) setLayerToDelete(layer);
            }}
          >
            <ListItemIcon sx={{ color: PE.danger }}>
              <DeleteOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Eliminar capa" />
          </MenuItem>
        )}
        <MenuItem
          onClick={duplicateSelectedLayer}
        >
          <ListItemIcon sx={{ color: PE.text }}>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Duplicar capa" />
        </MenuItem>
      </Menu>

      <SimpleDialog
        open={!!layerToDelete}
        onClose={() => setLayerToDelete(null)}
        tittle="Eliminar capa"
        message={`¿Deseas eliminar la capa "${layerToDelete?.name}"? Esta acción no se puede deshacer.`}
        onClickAccept={() => {
          deleteLayer(layerToDelete.id);
          setLayerToDelete(null);
        }}
      />

      <Dialog
        open={systemImageDialogOpen}
        onClose={() => setSystemImageDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Imágenes del sistema</DialogTitle>
        <DialogContent dividers>
          {loadingSystemImages ? (
            <Box sx={{ py: 4, display: "grid", placeItems: "center" }}>
              <CircularProgress size={26} />
            </Box>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 1.25 }}>
              {systemImages.length === 0 ? (
                <Typography sx={{ color: PE.textMuted, fontSize: 12 }}>
                  No hay imágenes disponibles en el sistema.
                </Typography>
              ) : (
                systemImages.map((item) => (
                  <Box
                    key={`${item?.type || "img"}-${item?.id || item?.mediaPath || item?.previewUrl}`}
                    onClick={() => pickSystemImage(item)}
                    sx={{
                      cursor: "pointer",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 1,
                      p: 0.75,
                      background: "rgba(255,255,255,0.02)",
                      "&:hover": { background: "rgba(255,255,255,0.08)" },
                    }}
                  >
                    <Avatar
                      variant="rounded"
                      src={item?.previewUrl || item?.mediaPath || ""}
                      alt={item?.title || "imagen"}
                      sx={{ width: "100%", height: 90, mb: 0.75, borderRadius: 1 }}
                    />
                    <Typography sx={{ fontSize: 11, color: PE.text, lineHeight: 1.2, textAlign: "center" }}>
                      {item?.title || item?.subtitle || "Imagen"}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSystemImageDialogOpen(false)} sx={{ color: PE.text }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
