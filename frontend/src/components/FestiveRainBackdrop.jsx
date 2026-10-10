/**
 * Lluvia decorativa de guaguas de pan + calabazas (Inicio / Login).
 */
import { Box, alpha, useTheme } from "@mui/material";
import { keyframes } from "@mui/system";
import PumpkinIcon from "./icons/PumpkinIcon.jsx";

const GUAGUA_SRCS = [1, 2, 3, 4].map(
  (n) => `${import.meta.env.BASE_URL}brand/guagua-pan-${n}.png`,
);
const GUAGUA_ACCENT = "#C47A3A";
const PUMPKIN_ORANGE = "#F97316";

const slowSpin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const rainFall = keyframes`
  0% {
    transform: translate3d(0, 0, 0) rotate(var(--rot-start));
    opacity: 0;
  }
  8% {
    opacity: var(--item-op);
  }
  88% {
    opacity: var(--item-op);
  }
  100% {
    transform: translate3d(var(--drift), 125vh, 0) rotate(var(--rot-end));
    opacity: 0;
  }
`;

function buildRainItems(count, seed = 0) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const n = i + seed;
    const isPumpkin = n % 3 === 0;
    const guaguaIdx = n % GUAGUA_SRCS.length;
    const rotStart = -55 + ((n * 37) % 110);
    const rotEnd = rotStart + (n % 2 === 0 ? 70 : -80) + ((n * 13) % 40);
    const left = 2 + ((n * 17 + (n % 5) * 9) % 92);
    const sizeXs = isPumpkin ? 34 + (n % 4) * 6 : 38 + (n % 5) * 8;
    const sizeMd = isPumpkin ? 48 + (n % 4) * 8 : 52 + (n % 5) * 12;
    const duration = 9 + (n % 7) * 1.4 + (n % 3) * 0.5;
    const delay = (n * 0.85) % 11;
    const drift = (n % 2 === 0 ? 1 : -1) * (18 + (n % 5) * 10);
    const opacity = 0.45 + (n % 5) * 0.08;
    items.push({
      id: n,
      kind: isPumpkin ? "pumpkin" : "guagua",
      src: isPumpkin ? null : GUAGUA_SRCS[guaguaIdx],
      left: `${left}%`,
      size: { xs: sizeXs, md: sizeMd },
      duration: `${duration.toFixed(1)}s`,
      delay: `${delay.toFixed(1)}s`,
      rotStart: `${rotStart}deg`,
      rotEnd: `${rotEnd}deg`,
      drift: `${drift}px`,
      opacity,
    });
  }
  return items;
}

const DEFAULT_ITEMS = buildRainItems(18, 0);
const LOGIN_ITEMS = buildRainItems(14, 7);

/**
 * @param {{
 *   showRings?: boolean;
 *   variant?: "home" | "login";
 *   opacityScale?: number;
 * }} props
 */
export default function FestiveRainBackdrop({
  showRings = true,
  variant = "home",
  opacityScale = 1,
}) {
  const theme = useTheme();
  const isNeon = theme.palette.customMode === "neon";
  const items = variant === "login" ? LOGIN_ITEMS : DEFAULT_ITEMS;

  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {showRings ? (
        <>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: { xs: 420, md: 640 },
              height: { xs: 420, md: 640 },
              ml: { xs: -210, md: -320 },
              mt: { xs: -210, md: -320 },
              borderRadius: "50%",
              border: `1px solid ${alpha(GUAGUA_ACCENT, 0.14)}`,
              animation: `${slowSpin} 48s linear infinite`,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: { xs: 300, md: 460 },
              height: { xs: 300, md: 460 },
              ml: { xs: -150, md: -230 },
              mt: { xs: -150, md: -230 },
              borderRadius: "50%",
              border: `1px dashed ${alpha(PUMPKIN_ORANGE, 0.18)}`,
              animation: `${slowSpin} 64s linear infinite reverse`,
            }}
          />
        </>
      ) : null}

      {items.map((item) => {
        const accent = item.kind === "pumpkin" ? PUMPKIN_ORANGE : GUAGUA_ACCENT;
        const op = Math.min(1, item.opacity * opacityScale);
        return (
          <Box
            key={`rain-${variant}-${item.id}`}
            sx={{
              position: "absolute",
              top: "-12%",
              left: item.left,
              width: item.size,
              height: item.size,
              "--rot-start": item.rotStart,
              "--rot-end": item.rotEnd,
              "--drift": item.drift,
              "--item-op": op,
              animation: `${rainFall} ${item.duration} linear infinite`,
              animationDelay: item.delay,
              willChange: "transform, opacity",
              filter: isNeon
                ? `drop-shadow(0 0 10px ${alpha(accent, 0.45)})`
                : `drop-shadow(0 6px 12px ${alpha("#000", 0.14)})`,
            }}
          >
            {item.kind === "pumpkin" ? (
              <PumpkinIcon
                titleAccess=""
                sx={{
                  width: "100%",
                  height: "100%",
                  fontSize: "100%",
                }}
              />
            ) : (
              <Box
                component="img"
                src={item.src}
                alt=""
                draggable={false}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                  userSelect: "none",
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
