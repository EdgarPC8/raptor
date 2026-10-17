/**
 * Reproductor kiosco TV por dispositivo.
 *
 * Offline queda FIJO encima mientras EdDeli precarga.
 * El contenido se monta debajo; al 100% solo se desvanece el offline (una transición).
 * Sin remounts ni barra que aparece/desaparece.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Box } from "@mui/material";
import { getDevicePlayback } from "../../../api/publicidadRequest.js";
import { usePlaybackEngine } from "./hooks/usePlaybackEngine.js";
import {
  applyPlaybackCommand,
  usePublicidadPlaybackSync,
} from "./hooks/usePublicidadPlaybackSync.js";
import SlideStage from "./components/SlideStage.jsx";
import SignageOfflineScreen from "./components/SignageOfflineScreen.jsx";
import CampaignMusicPlayer from "./components/CampaignMusicPlayer.jsx";
import { preloadPlaylistMedia } from "./utils/preloadPlaylistMedia.js";

export default function PublicidadTvDevicePlayerPage() {
  const { deviceId: rawDeviceId } = useParams();
  const deviceId = String(rawDeviceId || "").trim().toLowerCase();

  const [campaign, setCampaign] = useState(null);
  /** Contenido precargado y listo debajo del offline */
  const [stageReady, setStageReady] = useState(false);
  /** Offline ya se desvaneció: solo se ve la campaña */
  const [coverGone, setCoverGone] = useState(false);
  const [coverOpaque, setCoverOpaque] = useState(true);
  const [transitionProgress, setTransitionProgress] = useState(null);
  const [transitionLabel, setTransitionLabel] = useState("Cargando contenido…");

  const campaignRef = useRef(null);
  const bootDoneRef = useRef(false);
  const loadingRef = useRef(false);
  campaignRef.current = campaign;

  const notifyNative = useCallback((payload) => {
    try {
      window.ReactNativeWebView?.postMessage?.(JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, []);

  const setProgress = useCallback(
    (progress, label) => {
      setTransitionProgress(progress);
      if (label) setTransitionLabel(label);
      notifyNative({
        type: "tv-load-progress",
        progress,
        label: label || transitionLabel,
      });
    },
    [notifyNative, transitionLabel],
  );

  const finishToContent = useCallback(() => {
    setStageReady(true);
    setProgress(1, "Listo");
    notifyNative({ type: "tv-load-progress", progress: 1, label: "Listo" });
    // Esperar un frame con contenido debajo, luego desvanecer offline
    requestAnimationFrame(() => {
      setTimeout(() => {
        setCoverOpaque(false);
        notifyNative({ type: "tv-content-ready" });
        setTimeout(() => {
          setCoverGone(true);
          setTransitionProgress(null);
        }, 520);
      }, 120);
    });
  }, [notifyNative, setProgress]);

  const bootLoad = useCallback(async () => {
    if (!deviceId || loadingRef.current || bootDoneRef.current) return;
    loadingRef.current = true;
    setCoverGone(false);
    setCoverOpaque(true);
    setStageReady(false);
    setProgress(0.06, "Conectando con la campaña…");

    try {
      const res = await getDevicePlayback(deviceId);
      const data = res.data;
      const playlist = Array.isArray(data?.playlist) ? data.playlist : [];
      setCampaign(data);
      setProgress(0.14, "Campaña encontrada…");

      if (playlist.length > 0) {
        await preloadPlaylistMedia(playlist, {
          maxImages: 6,
          onProgress: (ratio) => {
            setProgress(
              0.14 + ratio * 0.86,
              ratio < 1 ? "Cargando lo que se va a mostrar…" : "Listo",
            );
          },
        });
      } else {
        setProgress(1, "Listo");
      }

      bootDoneRef.current = true;
      finishToContent();
    } catch {
      bootDoneRef.current = false;
      setCampaign(null);
      setStageReady(false);
      setCoverGone(false);
      setCoverOpaque(true);
      setTransitionProgress(null);
      notifyNative({ type: "tv-offline" });
    } finally {
      loadingRef.current = false;
    }
  }, [deviceId, finishToContent, notifyNative, setProgress]);

  useEffect(() => {
    bootDoneRef.current = false;
    void bootLoad();
  }, [deviceId]); // solo al cambiar dispositivo

  const softRefresh = useCallback(async () => {
    if (!deviceId || loadingRef.current || !bootDoneRef.current) return;
    try {
      const res = await getDevicePlayback(deviceId);
      setCampaign(res.data);
    } catch {
      /* mantener lo que ya se ve */
    }
  }, [deviceId]);

  const playlist =
    stageReady && Array.isArray(campaign?.playlist) ? campaign.playlist : [];
  const loop = campaign?.loop !== false;
  const engine = usePlaybackEngine(playlist, {
    loop,
    autoPlay: stageReady && !coverOpaque && playlist.length > 0,
  });
  const { current, leaving, playing, notifyMediaEnded } = engine;
  const engineRef = useRef(engine);
  engineRef.current = engine;

  const handlePlaylistSocket = useCallback(
    (payload) => {
      if (!bootDoneRef.current) return;
      if (!payload?.playlist || !Array.isArray(payload.playlist)) {
        void softRefresh();
        return;
      }
      setCampaign({
        deviceId: payload.deviceId || deviceId,
        campaignId: payload.campaignId || payload.id,
        name: payload.name,
        loop: payload.loop !== false,
        musicMode: payload.musicMode || "none",
        musicTracks: payload.musicTracks || [],
        playlist: payload.playlist,
        source: payload.source || "socket",
      });
    },
    [deviceId, softRefresh],
  );

  const { socketConnected } = usePublicidadPlaybackSync({
    deviceId,
    enabled: Boolean(deviceId),
    onPoll: softRefresh,
    onPlaylist: handlePlaylistSocket,
    onDeviceUpdated: softRefresh,
    onPlaybackCommand: (command) => {
      if (command?.action === "reload") {
        // Reload suave: no volver a montar offline si ya estamos en campaña
        if (bootDoneRef.current) {
          void softRefresh();
          return true;
        }
        return false;
      }
      return applyPlaybackCommand(command, engineRef.current);
    },
  });

  const showCover = !coverGone;

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        bgcolor: "#E4002B",
        position: "fixed",
        inset: 0,
        m: 0,
        p: 0,
      }}
    >
      {/* Contenido debajo (ya precargado); no se ve hasta que baja el cover */}
      {stageReady && playlist.length > 0 ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: coverOpaque ? 0 : 1,
            transition: "opacity 0.45s ease",
            zIndex: 1,
          }}
        >
          <SlideStage
            current={current}
            leaving={leaving}
            playing={playing}
            onMediaEnded={notifyMediaEnded}
          />
          <CampaignMusicPlayer
            musicMode={campaign?.musicMode}
            musicTracks={campaign?.musicTracks}
            playing={playing}
          />
        </Box>
      ) : null}

      {/* Offline fijo encima hasta terminar la carga */}
      {showCover ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            opacity: coverOpaque ? 1 : 0,
            transition: "opacity 0.5s ease",
            pointerEvents: coverOpaque ? "auto" : "none",
          }}
        >
          <SignageOfflineScreen
            skipIntro
            transitionProgress={transitionProgress}
            transitionLabel={transitionLabel}
          />
        </Box>
      ) : null}

      {import.meta.env.DEV ? (
        <Box
          sx={{
            position: "fixed",
            bottom: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: socketConnected ? "#4caf50" : "#f44336",
            opacity: 0.35,
            zIndex: 9999,
          }}
        />
      ) : null}
    </Box>
  );
}
