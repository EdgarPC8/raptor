/**
 * Editor de campaña compacto: pestañas (datos / playlist / música) + vista previa.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { APP_ROUTES } from "../../../config/appRoutes.js";
import {
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  Tooltip,
  IconButton,
} from "@mui/material";
import DevicesIcon from "@mui/icons-material/Devices";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { useAuth } from "../../../context/AuthContext.jsx";
import {
  createCampaign,
  getCampaignById,
  getPublicidadDevices,
  updateCampaign,
} from "../../../api/publicidadRequest.js";
import { CAMPAIGN_STATUS, CAMPAIGN_STATUS_LABELS, MUSIC_MODES } from "./constants.js";
import PlaylistBuilder from "./components/PlaylistBuilder.jsx";
import PlaybackPreview from "./components/PlaybackPreview.jsx";
import CampaignMusicPanel from "./components/CampaignMusicPanel.jsx";
import { PageSkeleton } from "../../../components/ContentSkeleton.jsx";

const emptyForm = {
  name: "",
  description: "",
  status: CAMPAIGN_STATUS.DRAFT,
  loop: true,
  playlist: [],
  musicMode: MUSIC_MODES.NONE,
  musicTracks: [],
};

const TAB_DATOS = 0;
const TAB_PLAYLIST = 1;
const TAB_MUSICA = 2;

export default function PublicidadCampaignEditorPage() {
  const { id } = useParams();
  const isNew = id === "nueva" || !id;
  const navigate = useNavigate();
  const { toast } = useAuth();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [assignedDevices, setAssignedDevices] = useState([]);
  const [tab, setTab] = useState(TAB_DATOS);

  const loadAssignedDevices = async (campaignId) => {
    if (!campaignId || campaignId === "nueva") {
      setAssignedDevices([]);
      return;
    }
    try {
      const res = await getPublicidadDevices();
      const list = Array.isArray(res.data) ? res.data : [];
      setAssignedDevices(list.filter((d) => String(d.campaignId) === String(campaignId)));
    } catch {
      setAssignedDevices([]);
    }
  };

  const applyCampaignToForm = (c) => {
    setForm({
      name: c.name || "",
      description: c.description || "",
      status: c.status || CAMPAIGN_STATUS.DRAFT,
      loop: c.loop !== false,
      playlist: c.playlist || [],
      musicMode: c.musicMode || MUSIC_MODES.NONE,
      musicTracks: c.musicTracks || [],
    });
    loadAssignedDevices(c.id);
  };

  useEffect(() => {
    if (isNew) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getCampaignById(id);
        const c = res.data || {};
        if (!alive) return;
        applyCampaignToForm(c);
      } catch {
        toast?.({ message: "Campaña no encontrada", variant: "error" });
        navigate(APP_ROUTES.advertising.campaigns, { replace: true });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // Solo recargar al cambiar de campaña. NO depender de toast/navigate:
    // si toast cambia de identidad (AuthContext), se pisaban los cambios locales.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  const patch = (fields) => setForm((f) => ({ ...f, ...fields }));

  const buildPayload = () => ({
    name: form.name.trim(),
    description: form.description.trim(),
    status: form.status,
    loop: form.loop,
    screenIds: [],
    playlist: Array.isArray(form.playlist) ? form.playlist : [],
    musicMode: form.musicMode,
    musicTracks: Array.isArray(form.musicTracks) ? form.musicTracks : [],
  });

  const campaignFromResponse = (res) => {
    const body = res?.data ?? res;
    if (!body || typeof body !== "object") return null;
    // Algunos wrappers anidan en .data / .campaign
    if (body.campaign && typeof body.campaign === "object") return body.campaign;
    if (body.id != null || Array.isArray(body.playlist)) return body;
    if (body.data && typeof body.data === "object") return body.data;
    return body;
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast?.({ message: "El nombre de la campaña es obligatorio", variant: "warning" });
      setTab(TAB_DATOS);
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isNew) {
        await toast({
          promise: createCampaign(payload),
          successMessage: "Campaña creada correctamente",
          errorMessage: "No se pudo crear la campaña",
          onSuccess: (res) => {
            const campaign = campaignFromResponse(res);
            const campaignId = campaign?.id;
            if (campaignId) navigate(`/publicidad/campanas/${campaignId}`, { replace: true });
          },
        });
      } else {
        await toast({
          promise: updateCampaign(id, payload),
          successMessage: "Campaña guardada correctamente",
          errorMessage: "No se pudo guardar la campaña",
          onSuccess: (res) => {
            const campaign = campaignFromResponse(res);
            if (campaign) applyCampaignToForm(campaign);
          },
        });
      }
    } catch {
      /* toast ya mostró el error */
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, py: 2, overflow: "auto" }}>
        <PageSkeleton />
      </Box>
    );
  }

  const playlistCount = form.playlist?.length || 0;
  const musicCount = form.musicTracks?.length || 0;

  return (
    <Box
      sx={{
        flex: 1,
        height: "100%",
        maxHeight: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        overflow: "hidden",
      }}
    >
      {/* Barra superior compacta */}
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{ flexShrink: 0, px: 0.25 }}
      >
        <Tooltip title="Volver">
          <IconButton size="small" onClick={() => navigate(APP_ROUTES.advertising.campaigns)}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="subtitle1" fontWeight={800} sx={{ flex: 1 }} noWrap>
          {isNew ? "Nueva campaña" : form.name || "Editar campaña"}
        </Typography>
        <Tooltip title="Reproductor">
          <span>
            <IconButton
              size="small"
              disabled={!playlistCount}
              onClick={() =>
                navigate(isNew ? APP_ROUTES.advertising.player : `${APP_ROUTES.advertising.player}/${id}`)
              }
            >
              <PlayCircleOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Button
          size="small"
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          Guardar
        </Button>
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr minmax(280px, 36%)" },
          gap: 1.5,
          overflow: "hidden",
        }}
      >
        {/* Columna izquierda: pestañas */}
        <Paper
          variant="outlined"
          sx={{
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{
              flexShrink: 0,
              minHeight: 40,
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTab-root": { minHeight: 40, py: 0.5, textTransform: "none", fontWeight: 700 },
            }}
          >
            <Tab
              icon={<InfoOutlinedIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Datos"
            />
            <Tab
              icon={<PlaylistPlayIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <span>Playlist</span>
                  <Chip size="small" label={playlistCount} sx={{ height: 20, "& .MuiChip-label": { px: 0.75 } }} />
                </Stack>
              }
            />
            <Tab
              icon={<MusicNoteIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <span>Música</span>
                  <Chip size="small" label={musicCount} sx={{ height: 20, "& .MuiChip-label": { px: 0.75 } }} />
                </Stack>
              }
            />
          </Tabs>

          <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 1.5 }}>
            {tab === TAB_DATOS && (
              <Stack spacing={1.5}>
                <TextField
                  label="Nombre"
                  required
                  fullWidth
                  size="small"
                  value={form.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
                <TextField
                  label="Descripción"
                  fullWidth
                  size="small"
                  multiline
                  minRows={1}
                  maxRows={2}
                  value={form.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
                <FormControl fullWidth size="small">
                  <InputLabel>Estado</InputLabel>
                  <Select
                    label="Estado"
                    value={form.status}
                    onChange={(e) => patch({ status: e.target.value })}
                  >
                    {Object.entries(CAMPAIGN_STATUS_LABELS).map(([k, label]) => (
                      <MenuItem key={k} value={k}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={form.loop}
                      onChange={(e) => patch({ loop: e.target.checked })}
                    />
                  }
                  label="Repetir playlist en bucle"
                />

                {!isNew ? (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                      <DevicesIcon fontSize="small" color="action" />
                      <Typography variant="subtitle2" fontWeight={700}>
                        Dispositivos TV
                      </Typography>
                    </Stack>
                    {assignedDevices.length ? (
                      <Stack direction="row" flexWrap="wrap" gap={0.75}>
                        {assignedDevices.map((d) => (
                          <Chip key={d.deviceId} size="small" label={d.deviceId} variant="outlined" />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Ninguno. Asigna en{" "}
                        <Button
                          size="small"
                          sx={{ p: 0, minWidth: 0, verticalAlign: "baseline", textTransform: "none" }}
                          onClick={() => navigate(APP_ROUTES.advertising.devices)}
                        >
                          Dispositivos TV
                        </Button>
                        .
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                      Pon la campaña en Activa para que las TV la reproduzcan.
                    </Typography>
                  </Box>
                ) : null}
              </Stack>
            )}

            {tab === TAB_PLAYLIST && (
              <PlaylistBuilder
                compact
                playlist={form.playlist}
                onChange={(playlist) => patch({ playlist })}
              />
            )}

            {tab === TAB_MUSICA && (
              <CampaignMusicPanel
                embedded
                musicMode={form.musicMode}
                musicTracks={form.musicTracks}
                onChange={(music) => patch(music)}
              />
            )}
          </Box>
        </Paper>

        {/* Columna derecha: preview */}
        <Box
          sx={{
            minHeight: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <PlaybackPreview
            playlist={form.playlist}
            loop={form.loop}
            musicMode={form.musicMode}
            musicTracks={form.musicTracks}
            title="Vista previa"
            compact
          />
        </Box>
      </Box>
    </Box>
  );
}
