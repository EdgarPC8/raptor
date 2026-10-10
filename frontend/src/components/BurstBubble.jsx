/**
 * Bolita / icono de prueba: al hacer click se “rompe” en partículas hacia afuera.
 * Pensada para simular el futuro icono flotante del navbar.
 */
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box, Typography } from "@mui/material";
import { keyframes } from "@mui/system";

const BUBBLE_COLORS = [
  "#1A7A9A",
  "#14B8A6",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#22C55E",
  "#3B82F6",
];

const particleFly = keyframes`
  0% {
    transform: translate(0, 0) scale(1) rotate(0deg);
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--dx), var(--dy)) scale(0.85) rotate(var(--spin));
    opacity: 0;
  }
`;

/** Un pulso de vibración + brillo (se dispara a demanda, no en loop infinito). */
const idleWiggleShine = keyframes`
  0% {
    transform: translateX(0) rotate(0deg) scale(1);
    filter: brightness(1) drop-shadow(0 0 0 transparent);
  }
  20% {
    transform: translateX(-3px) rotate(-5deg) scale(1.02);
    filter: brightness(1.12) drop-shadow(0 0 4px rgba(249, 115, 22, 0.45));
  }
  40% {
    transform: translateX(4px) rotate(5deg) scale(1.04);
    filter: brightness(1.35) drop-shadow(0 0 10px rgba(249, 115, 22, 0.75));
  }
  60% {
    transform: translateX(-3px) rotate(-3deg) scale(1.02);
    filter: brightness(1.2) drop-shadow(0 0 6px rgba(249, 115, 22, 0.55));
  }
  80% {
    transform: translateX(2px) rotate(2deg) scale(1.01);
    filter: brightness(1.28) drop-shadow(0 0 8px rgba(255, 200, 80, 0.55));
  }
  100% {
    transform: translateX(0) rotate(0deg) scale(1);
    filter: brightness(1) drop-shadow(0 0 0 transparent);
  }
`;

const PULSE_ANIM_MS = 720;
const LIVELY_PULSES = 5;
const LIVELY_GAP_MS = 3_400;
const CALM_GAP_MIN_MS = 30_000;
const CALM_GAP_MAX_MS = 60_000;

function randomColor(seed) {
  return BUBBLE_COLORS[Math.abs(seed) % BUBBLE_COLORS.length];
}

/** Color fijo opcional (ej. naranja de la calabaza). */
function resolveColor(seed, fixedColor) {
  if (typeof fixedColor === "string" && fixedColor.trim()) return fixedColor.trim();
  return randomColor(seed);
}

function buildParticles(count, seed, bubbleSize = 56, color) {
  const list = [];
  const base = Math.max(56, bubbleSize * 1.35);
  const sparkColor = color || randomColor(seed);
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + (seed % 7) * 0.11;
    const dist = base + ((seed * (i + 3)) % Math.round(base * 0.9));
    const spin = ((seed + i * 17) % 2 === 0 ? 1 : -1) * (120 + ((seed + i) % 160));
    list.push({
      id: i,
      dx: `${Math.cos(angle) * dist}px`,
      dy: `${Math.sin(angle) * dist}px`,
      size: 7 + ((seed + i * 5) % 10),
      iconSize: 14 + ((seed + i * 3) % 12),
      color: sparkColor,
      delay: (i % 4) * 12,
      spin: `${spin}deg`,
    });
  }
  return list;
}

/**
 * @param {{
 *   size?: number;
 *   particleCount?: number;
 *   onBurst?: () => void;
 *   onReady?: () => void;
 *   label?: string;
 *   autoSeed?: number;
 *   icon?: import("react").ReactElement;
 *   variant?: "bubble" | "icon";
 *   resetLabel?: string;
 *   color?: string;
 *   bare?: boolean; // sin caja de fondo: solo el icono (default en variant icon)
 *   showReset?: boolean;
 *   autoRespawnMs?: number; // si > 0, reaparece sola tras reventar
 *   interactive?: boolean; // false = no click (ej. mientras rueda)
 * }} props
 */
export default function BurstBubble({
  size = 56,
  particleCount = 18,
  onBurst,
  onReady,
  label = "Click",
  autoSeed,
  icon = null,
  variant = "bubble",
  resetLabel = "Otra bolita",
  color: colorProp,
  bare,
  showReset = true,
  autoRespawnMs = 0,
  interactive = true,
}) {
  const reactId = useId();
  const isIcon = variant === "icon" && isValidElement(icon);
  const isBare = bare ?? isIcon;
  const [seed, setSeed] = useState(() =>
    Number.isFinite(autoSeed) ? Math.floor(autoSeed) : Math.floor(Math.random() * 10_000),
  );
  const [phase, setPhase] = useState("idle"); // idle | bursting | gone
  const [pulseTick, setPulseTick] = useState(0);
  const pulseCountRef = useRef(0);
  const color = useMemo(() => resolveColor(seed, colorProp), [seed, colorProp]);
  const particles = useMemo(
    () => buildParticles(particleCount, seed, size, color),
    [particleCount, seed, size, color],
  );

  const reset = useCallback(() => {
    setSeed(Math.floor(Math.random() * 10_000));
    pulseCountRef.current = 0;
    setPulseTick(0);
    setPhase("idle");
    onReady?.();
  }, [onReady]);

  const handleClick = () => {
    if (!interactive || phase !== "idle") return;
    setPhase("bursting");
    onBurst?.();
    window.setTimeout(() => setPhase("gone"), 620);
  };

  useEffect(() => {
    if (phase !== "gone" || !(autoRespawnMs > 0)) return undefined;
    const t = window.setTimeout(() => reset(), autoRespawnMs);
    return () => window.clearTimeout(t);
  }, [phase, autoRespawnMs, reset]);

  // Primeras 5 veces: titila seguido; luego cada 30s–60s al azar.
  useEffect(() => {
    if (phase !== "idle" || !interactive) return undefined;
    let cancelled = false;
    let waitTimer;
    let clearTimer;

    const queuePulse = (delayMs) => {
      waitTimer = window.setTimeout(() => {
        if (cancelled) return;
        setPulseTick((n) => n + 1);
        pulseCountRef.current += 1;
        clearTimer = window.setTimeout(() => {
          if (cancelled) return;
          const nextDelay =
            pulseCountRef.current < LIVELY_PULSES
              ? LIVELY_GAP_MS
              : CALM_GAP_MIN_MS +
                Math.random() * (CALM_GAP_MAX_MS - CALM_GAP_MIN_MS);
          queuePulse(nextDelay);
        }, PULSE_ANIM_MS);
      }, delayMs);
    };

    queuePulse(700);
    return () => {
      cancelled = true;
      window.clearTimeout(waitTimer);
      window.clearTimeout(clearTimer);
    };
  }, [phase, seed, interactive]);

  const stagePad = Math.round(size * 2.4);

  return (
    <Box
      sx={{
        position: "relative",
        width: size + stagePad,
        height: size + stagePad,
        display: "grid",
        placeItems: "center",
        userSelect: "none",
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      {phase === "idle" ? (
        <Box
          component="button"
          type="button"
          aria-label="Hacer click para reventar"
          onClick={handleClick}
          sx={{
            width: size,
            height: size,
            border: 0,
            borderRadius: isBare ? 0 : isIcon ? 2 : "50%",
            cursor: interactive ? "pointer" : "default",
            pointerEvents: interactive ? "auto" : "none",
            p: 0,
            position: "relative",
            zIndex: 2,
            display: "grid",
            placeItems: "center",
            color: isIcon ? color : "#fff",
            background: isBare
              ? "transparent"
              : isIcon
                ? "#111827"
                : `radial-gradient(circle at 32% 28%, #fff 0%, ${color} 42%, ${color}dd 100%)`,
            boxShadow: isBare
              ? "none"
              : isIcon
                ? "0 8px 20px rgba(0,0,0,0.35)"
                : `0 8px 22px ${color}66, inset 0 -6px 14px rgba(0,0,0,0.18)`,
            transition: "transform 0.15s ease",
            "&:hover": { transform: "scale(1.06)" },
            "&:hover .burst-idle-motion": {
              animationPlayState: "paused",
            },
            "&:focus-visible": {
              outline: `2px solid ${color}`,
              outlineOffset: 3,
            },
          }}
        >
          <Box
            className="burst-idle-motion"
            key={`pulse-${pulseTick}`}
            sx={{
              display: "grid",
              placeItems: "center",
              width: "100%",
              height: "100%",
              animation:
                pulseTick > 0
                  ? `${idleWiggleShine} ${PULSE_ANIM_MS}ms ease-in-out`
                  : "none",
              willChange: "transform, filter",
            }}
          >
            {isIcon ? (
              cloneElement(icon, {
                // No pasar `fontSize` numérico: SvgIcon de MUI solo acepta
                // 'inherit' | 'small' | 'medium' | 'large' (si no → pantalla blanca).
                sx: {
                  fontSize: Math.round(isBare ? size : size * 0.72),
                  width: Math.round(isBare ? size : size * 0.72),
                  height: Math.round(isBare ? size : size * 0.72),
                  ...(icon.props?.sx || {}),
                },
              })
            ) : (
              <Typography
                component="span"
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  fontSize: Math.max(10, size * 0.22),
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.92)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                  pointerEvents: "none",
                }}
              >
                {label}
              </Typography>
            )}
          </Box>
        </Box>
      ) : null}

      {phase === "bursting" || phase === "gone" ? (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            zIndex: 3,
            overflow: "visible",
          }}
        >
          {particles.map((p) => (
            <Box
              key={`${reactId}-p-${p.id}`}
              sx={{
                position: "absolute",
                width: isIcon ? p.iconSize : p.size,
                height: isIcon ? p.iconSize : p.size,
                borderRadius: isIcon ? 0 : "50%",
                bgcolor: isIcon ? "transparent" : p.color,
                color: p.color,
                display: "grid",
                placeItems: "center",
                boxShadow: isIcon ? "none" : `0 0 8px ${p.color}aa`,
                "--dx": p.dx,
                "--dy": p.dy,
                "--spin": p.spin,
                animation: `${particleFly} 0.58s cubic-bezier(0.12, 0.7, 0.2, 1) forwards`,
                animationDelay: `${p.delay}ms`,
              }}
            >
              {isIcon
                ? cloneElement(icon, {
                    sx: {
                      fontSize: p.iconSize,
                      width: p.iconSize,
                      height: p.iconSize,
                    },
                  })
                : null}
            </Box>
          ))}
        </Box>
      ) : null}

      {phase === "gone" && showReset && !(autoRespawnMs > 0) ? (
        <Box
          component="button"
          type="button"
          onClick={reset}
          sx={{
            position: "absolute",
            zIndex: 4,
            border: 0,
            borderRadius: 999,
            px: 1.5,
            py: 0.5,
            cursor: "pointer",
            pointerEvents: "auto",
            fontSize: 12,
            fontWeight: 700,
            color: "primary.contrastText",
            bgcolor: "primary.main",
            boxShadow: 1,
            "&:hover": { filter: "brightness(1.05)" },
          }}
        >
          {resetLabel}
        </Box>
      ) : null}
    </Box>
  );
}
