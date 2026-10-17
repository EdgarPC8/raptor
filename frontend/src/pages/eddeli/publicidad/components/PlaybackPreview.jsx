/**
 * Vista previa en miniatura de la reproducción de una campaña.
 */
import {
  Box,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
  Chip,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import ReplayIcon from "@mui/icons-material/Replay";
import { usePlaybackEngine } from "../hooks/usePlaybackEngine.js";
import SlideStage from "./SlideStage.jsx";
import SignagePreviewFrame from "./SignagePreviewFrame.jsx";
import CampaignMusicPlayer from "./CampaignMusicPlayer.jsx";
import { MUSIC_MODES } from "../constants.js";

export default function PlaybackPreview({
  playlist = [],
  loop = true,
  title = "Vista previa",
  musicMode = MUSIC_MODES.NONE,
  musicTracks = [],
  compact = false,
}) {
  const engine = usePlaybackEngine(playlist, { loop, autoPlay: playlist.length > 0 });
  const { current, leaving, index, total, playing, progress, toggle, next, prev, reset, notifyMediaEnded } =
    engine;

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: "hidden",
        flex: compact ? 1 : undefined,
        flexShrink: compact ? 1 : 0,
        minHeight: 0,
        height: compact ? "100%" : undefined,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          px: compact ? 1.25 : 2,
          py: compact ? 0.75 : 1.5,
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography fontWeight={700} variant={compact ? "subtitle2" : "body1"}>
            {title}
          </Typography>
          {total > 0 && (
            <Chip size="small" label={`${index + 1} / ${total}`} variant="outlined" />
          )}
        </Stack>
      </Box>

      <Box
        sx={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          ...(compact
            ? { bgcolor: "action.hover" }
            : { aspectRatio: "16 / 9" }),
        }}
      >
        <SignagePreviewFrame>
          <SlideStage
            current={current}
            leaving={leaving}
            playing={playing}
            onMediaEnded={notifyMediaEnded}
          />
          <CampaignMusicPlayer
            musicMode={musicMode}
            musicTracks={musicTracks}
            playing={playing}
          />
        </SignagePreviewFrame>
      </Box>

      <Box sx={{ px: compact ? 1.25 : 2, py: compact ? 1 : 1.5, flexShrink: 0 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ mb: compact ? 1 : 1.5, borderRadius: 1 }}
        />
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
          <Tooltip title="Reiniciar">
            <span>
              <IconButton size="small" onClick={reset} disabled={!total}>
                <ReplayIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Anterior">
            <span>
              <IconButton size="small" onClick={prev} disabled={!total}>
                <SkipPreviousIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={playing ? "Pausar" : "Reproducir"}>
            <span>
              <IconButton color="primary" onClick={toggle} disabled={!total}>
                {playing ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Siguiente">
            <span>
              <IconButton size="small" onClick={next} disabled={!total}>
                <SkipNextIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          textAlign="center"
          sx={{ mt: compact ? 0.5 : 1 }}
          noWrap
        >
          {current ? `${current.title} · ${current.durationSeconds}s` : "Añade piezas a la playlist"}
        </Typography>
      </Box>
    </Paper>
  );
}
