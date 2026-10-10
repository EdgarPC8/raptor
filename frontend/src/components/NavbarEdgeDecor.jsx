/**
 * Calabaza en el filo del AppBar (cualquier rol con sesión).
 * - Aparece rodando desde un lateral (izq/der) hasta su lugar.
 * - Se queda hasta que le den click.
 * - Tras click: cooldown máximo 5 minutos, luego reaparece.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, useTheme } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { keyframes } from "@mui/system";
import BurstBubble from "./BurstBubble.jsx";
import PumpkinIcon from "./icons/PumpkinIcon.jsx";

const STORAGE_KEY = "raptor_navbar_pumpkin_v3";

/** Evento para forzar aparición desde Pruebas (u otras pantallas de lab). */
export const PUMPKIN_FORCE_SHOW_EVENT = "raptor:navbar-pumpkin-force-show";

/** Limpia cooldown y pide al navbar que muestre la calabaza ya. */
export function forceShowNavbarPumpkin() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...prev, lastClickAt: 0 }),
    );
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(PUMPKIN_FORCE_SHOW_EVENT));
}

/** Tras click: máximo 5 minutos. */
const CLICK_COOLDOWN_MS = 5 * 60_000;
/** Primera aparición al cargar. */
const FIRST_SPAWN_MIN_MS = 4_000;
const FIRST_SPAWN_MAX_MS = 10_000;
/** Duración de la llegada rodando (lenta a propósito). */
const ROLL_IN_MS = 4_800;

const rollInFromLeft = keyframes`
  0% {
    transform: translate(calc(-50% - 110vw), 52%) rotate(-900deg) scale(0.82);
    filter: brightness(1.55) drop-shadow(0 0 14px rgba(249, 115, 22, 0.95));
    opacity: 0.7;
  }
  55% {
    filter: brightness(1.4) drop-shadow(0 0 12px rgba(255, 200, 80, 0.85));
    opacity: 1;
  }
  100% {
    transform: translate(-50%, 52%) rotate(0deg) scale(1);
    filter: brightness(1) drop-shadow(0 0 0 transparent);
    opacity: 1;
  }
`;

const rollInFromRight = keyframes`
  0% {
    transform: translate(calc(-50% + 110vw), 52%) rotate(900deg) scale(0.82);
    filter: brightness(1.55) drop-shadow(0 0 14px rgba(249, 115, 22, 0.95));
    opacity: 0.7;
  }
  55% {
    filter: brightness(1.4) drop-shadow(0 0 12px rgba(255, 200, 80, 0.85));
    opacity: 1;
  }
  100% {
    transform: translate(-50%, 52%) rotate(0deg) scale(1);
    filter: brightness(1) drop-shadow(0 0 0 transparent);
    opacity: 1;
  }
`;

function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lastClickAt: 0 };
    const parsed = JSON.parse(raw);
    return { lastClickAt: Number(parsed?.lastClickAt) || 0 };
  } catch {
    return { lastClickAt: 0 };
  }
}

function writeState(patch) {
  try {
    const prev = readState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...patch }));
  } catch {
    /* ignore */
  }
}

function randomEdgeLeft() {
  return `${randBetween(14, 82).toFixed(1)}%`;
}

function randomEnterSide() {
  return Math.random() < 0.5 ? "left" : "right";
}

function msUntilClickCooldownEnds() {
  const { lastClickAt } = readState();
  if (!lastClickAt) return 0;
  const remain = CLICK_COOLDOWN_MS - (Date.now() - lastClickAt);
  return remain > 0 ? remain : 0;
}

export default function NavbarEdgeDecor() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const size = isXs ? 26 : 30;

  const [visible, setVisible] = useState(false);
  const [settled, setSettled] = useState(false);
  const [left, setLeft] = useState(() => randomEdgeLeft());
  const [enterSide, setEnterSide] = useState(() => randomEnterSide());
  const [spawnKey, setSpawnKey] = useState(0);

  const spawnTimerRef = useRef(null);
  const settleTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const clearTimers = useCallback(() => {
    if (spawnTimerRef.current) {
      window.clearTimeout(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const showPumpkin = useCallback((opts = {}) => {
    if (!mountedRef.current) return;
    if (!opts.force && msUntilClickCooldownEnds() > 0) return;

    setLeft(randomEdgeLeft());
    setEnterSide(randomEnterSide());
    setSettled(false);
    setSpawnKey((k) => k + 1);
    setVisible(true);

    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      setSettled(true);
    }, ROLL_IN_MS);
  }, []);

  const scheduleNext = useCallback(
    (delayMs) => {
      clearTimers();
      const cooldown = msUntilClickCooldownEnds();
      const wait = Math.max(delayMs, cooldown);
      spawnTimerRef.current = window.setTimeout(() => {
        showPumpkin();
      }, wait);
    },
    [clearTimers, showPumpkin],
  );

  useEffect(() => {
    mountedRef.current = true;
    const cooldown = msUntilClickCooldownEnds();
    if (cooldown > 0) {
      scheduleNext(cooldown);
    } else {
      scheduleNext(randBetween(FIRST_SPAWN_MIN_MS, FIRST_SPAWN_MAX_MS));
    }
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [scheduleNext, clearTimers]);

  useEffect(() => {
    const onForce = () => {
      writeState({ lastClickAt: 0 });
      clearTimers();
      showPumpkin({ force: true });
    };
    window.addEventListener(PUMPKIN_FORCE_SHOW_EVENT, onForce);
    return () => window.removeEventListener(PUMPKIN_FORCE_SHOW_EVENT, onForce);
  }, [clearTimers, showPumpkin]);

  const handleBurst = useCallback(() => {
    writeState({ lastClickAt: Date.now() });
    clearTimers();
    window.setTimeout(() => {
      if (!mountedRef.current) return;
      setVisible(false);
      setSettled(false);
      scheduleNext(CLICK_COOLDOWN_MS);
    }, 700);
  }, [clearTimers, scheduleNext]);

  if (!visible) return null;

  return (
    <Box
      key={spawnKey}
      sx={{
        position: "absolute",
        left,
        bottom: 0,
        transform: "translate(-50%, 52%)",
        zIndex: (t) => t.zIndex.appBar + 2,
        lineHeight: 0,
        pointerEvents: settled ? "auto" : "none",
        animation: `${enterSide === "left" ? rollInFromLeft : rollInFromRight} ${ROLL_IN_MS}ms cubic-bezier(0.33, 0.08, 0.25, 1) forwards`,
        willChange: "transform, filter, opacity",
      }}
    >
      <BurstBubble
        key={spawnKey}
        variant="icon"
        color="#F97316"
        icon={<PumpkinIcon />}
        size={size}
        particleCount={10}
        showReset={false}
        autoRespawnMs={0}
        interactive={settled}
        onBurst={handleBurst}
      />
    </Box>
  );
}
