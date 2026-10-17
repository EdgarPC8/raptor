/**
 * Selector de contenido del backend + subida de imágenes/videos + plantillas de diseño.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Box,
  Typography,
  CircularProgress,
  InputAdornment,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import UploadIcon from "@mui/icons-material/Upload";
import BakeryDiningIcon from "@mui/icons-material/BakeryDining";
import ImageIcon from "@mui/icons-material/Image";
import VideocamIcon from "@mui/icons-material/Videocam";
import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import {
  fetchMediaCatalog,
  fetchPromoTemplatesForCampaign,
  uploadPublicidadImage,
  uploadPublicidadVideo,
  publicidadImgFolder,
} from "../../../../api/publicidadRequest.js";
import { getMediaFolders } from "../../../../api/mediaRequest.js";
import { useAuth } from "../../../../context/AuthContext.jsx";
import { CONTENT_TYPES } from "../constants.js";
import { exportPromoTemplateAsPublicidadItem } from "../utils/exportPromoTemplateMedia.js";

const TAB_KEYS = ["products", "images", "videos", "templates"];

export default function ContentPickerDialog({ open, onClose, onSelect, existingIds = [] }) {
  const { toast } = useAuth();
  const fileRef = useRef(null);
  const videoFileRef = useRef(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [catalog, setCatalog] = useState({
    products: [],
    images: [],
    videos: [],
    templates: [],
  });
  const [q, setQ] = useState("");

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [media, templates] = await Promise.all([
        fetchMediaCatalog(),
        fetchPromoTemplatesForCampaign().catch(() => []),
      ]);
      setCatalog({
        products: media.products || [],
        images: media.images || [],
        videos: media.videos || [],
        templates: templates || [],
      });
    } catch {
      toast?.({ message: "No se pudo cargar el catálogo", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    loadCatalog();
  }, [open, loadCatalog]);

  const listKey = TAB_KEYS[tab];
  const items = catalog[listKey] || [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (it) =>
        String(it.title || "").toLowerCase().includes(term) ||
        String(it.subtitle || "").toLowerCase().includes(term),
    );
  }, [items, q]);

  const handlePick = async (item) => {
    const key = `${item.type}:${item.id}`;
    if (existingIds.includes(key)) return;

    if (item.type === CONTENT_TYPES.TEMPLATE) {
      setUploading(true);
      try {
        const exported = await toast({
          promise: exportPromoTemplateAsPublicidadItem(item.templateId || item.id),
          successMessage: "Plantilla lista para la campaña",
          errorMessage:
            "No se pudo generar la plantilla. Guarda productos en Vista con productos primero.",
        });
        const payload = exported?.data ?? exported;
        if (payload?.mediaPath) {
          onSelect?.(payload);
          onClose?.();
        }
      } finally {
        setUploading(false);
      }
      return;
    }

    onSelect?.(item);
    onClose?.();
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const result = await toast({
        promise: uploadPublicidadImage(file),
        successMessage: "Imagen subida correctamente",
        errorMessage: "Error al subir la imagen",
      });
      await loadCatalog();
      onSelect?.(result?.data ?? result);
      onClose?.();
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const result = await toast({
        promise: uploadPublicidadVideo(file),
        successMessage: "Video subido correctamente",
        errorMessage: "Error al subir el video",
      });
      await loadCatalog();
      onSelect?.(result?.data ?? result);
      onClose?.();
    } finally {
      setUploading(false);
    }
  };

  const iconFor = (type) => {
    if (type === CONTENT_TYPES.VIDEO) return <VideocamIcon />;
    if (type === CONTENT_TYPES.PRODUCT) return <BakeryDiningIcon />;
    if (type === CONTENT_TYPES.TEMPLATE) return <DashboardCustomizeIcon />;
    return <ImageIcon />;
  };

  const avatarFor = (item) => {
    if (item.previewUrl && item.type !== CONTENT_TYPES.VIDEO) {
      return (
        <Avatar variant="rounded" src={item.previewUrl} alt="" sx={{ width: 40, height: 40 }} />
      );
    }
    return (
      <Avatar variant="rounded" sx={{ bgcolor: "action.selected", width: 40, height: 40 }}>
        {iconFor(item.type)}
      </Avatar>
    );
  };

  const emptyHint =
    tab === 0
      ? "No hay productos activos con imagen. Añade primaryImageUrl en inventario."
      : tab === 3
        ? "No hay plantillas. Crea una en Diseño promocional → Plantillas y guarda productos en Vista."
        : "Sin resultados";

  return (
    <Dialog open={open} onClose={uploading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Seleccionar contenido</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Productos, imágenes, videos o plantillas de diseño (con productos guardados).
        </Typography>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2 }}
        >
          <Tab label={`Productos (${catalog.products.length})`} />
          <Tab label={`Imágenes (${catalog.images.length})`} />
          <Tab label={`Videos (${catalog.videos.length})`} />
          <Tab label={`Plantillas (${catalog.templates.length})`} />
        </Tabs>

        {tab === 1 && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              Subir imagen
            </Button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
              Se guarda en {publicidadImgFolder()}
            </Typography>
          </Stack>
        )}

        {tab === 2 && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
              disabled={uploading}
              onClick={() => videoFileRef.current?.click()}
            >
              Subir video
            </Button>
            <input
              ref={videoFileRef}
              type="file"
              accept="video/*,.mp4,.webm,.mov,.m4v"
              hidden
              onChange={handleVideoUpload}
            />
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
              MP4, WebM, MOV… → {getMediaFolders().VIDEO}
            </Typography>
          </Stack>
        )}

        {tab === 3 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Al elegir una plantilla se genera una imagen con los productos guardados en Vista con
            productos y se añade a la campaña.
          </Typography>
        )}

        <TextField
          fullWidth
          size="small"
          placeholder="Buscar..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {loading || uploading ? (
          <Box sx={{ py: 4, display: "grid", placeItems: "center", gap: 1 }}>
            <CircularProgress size={28} />
            {uploading && (
              <Typography variant="caption" color="text.secondary">
                Generando plantilla…
              </Typography>
            )}
          </Box>
        ) : (
          <List dense sx={{ maxHeight: 360, overflow: "auto" }}>
            {filtered.map((item) => {
              const key = `${item.type}:${item.id}`;
              const disabled = existingIds.includes(key);
              return (
                <ListItemButton key={key} onClick={() => handlePick(item)} disabled={disabled}>
                  <ListItemAvatar>{avatarFor(item)}</ListItemAvatar>
                  <ListItemText
                    primary={item.title}
                    secondary={
                      disabled
                        ? "Ya está en la playlist"
                        : [
                            item.subtitle,
                            item.price != null ? `$${Number(item.price).toFixed(2)}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                    }
                  />
                </ListItemButton>
              );
            })}
            {!filtered.length && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                {emptyHint}
              </Typography>
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={uploading}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
