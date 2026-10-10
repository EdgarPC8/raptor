/**
 * Martillo (martillo.svg) + yunque (yunque.svg), ambos volteados H.
 * Ajustá posición/rotación del martillo con el bloque de variables de abajo.
 */
import { useEffect, useMemo, useState } from "react";
import { Box, useTheme } from "@mui/material";
import yunqueUrl from "../assets/yunque.png?url";
import martilloUrl from "../assets/martillo.svg?url";

/** Duración del ciclo completo (martillo + chispas, mismo reloj). */
const DUR_MS = 1200;

/* ═══════════════════════════════════════════════════════════════════
 * MARTILLO — posición, rotación y CUADRO (tocá este bloque)
 * ───────────────────────────────────────────────────────────────────
 * El “cuadro” que corta el mazo es el viewBox del SVG:
 *   VIEW_MIN_X / VIEW_MIN_Y → esquina superior-izquierda del lienzo
 *                             (negativo = más aire arriba/izquierda)
 *   VIEW_W / VIEW_H         → ancho / alto del lienzo
 *   Si el mazo se corta al levantar → bajá VIEW_MIN_Y (más negativo)
 *   o subí VIEW_H / VIEW_W.
 *
 * El asset viene en diagonal y mirando a la derecha. Acá:
 *   1) se voltea H (scale -1)
 *   2) ART_STRAIGHTEN lo endereza para que la cara pegue plana
 *   3) la animación suma SWING_* alrededor del pivote (extremo del mango)
 *
 * Pivote del golpe (punto fijo = mano / extremo del mango):
 *   PIVOT_X / PIVOT_Y     → dónde ancla el mango en el canvas (px del viewBox)
 *
 * Colocación del PNG/SVG del martillo respecto al pivote:
 *   HAMMER_SIZE           → tamaño del dibujo del martillo
 *   IMAGE_X / IMAGE_Y     → desplazamiento del <image> tras el volteo
 *                           (negativo = mover hacia la cabeza / arriba)
 *   TIP_NX / TIP_NY       → extremo del mango en el viewBox 512 del SVG
 *                           (fracción 0–1); se usa para anclar el mango al pivote
 *
 * Rotación del arte (pose de impacto = “golpe recto”):
 *   ART_STRAIGHTEN        → giro fijo del dibujo (°) para que la cara quede
 *                           plana sobre el yunque cuando el swing está en 0°
 *                           (+ = horario, − = antihorario)
 *
 * Animación del golpe (se suma a ART_STRAIGHTEN):
 *   SWING_RAISED          → ángulo levantado (°)
 *   SWING_HIT             → ángulo al pegar (normalmente 0 = recto)
 *   SWING_BOUNCE          → rebote mínimo tras el choque (°)
 * ═══════════════════════════════════════════════════════════════════ */
/** Lienzo / cuadro visible (ampliá si se corta el mazo). */
const VIEW_MIN_X = -40;
const VIEW_MIN_Y = -60;
const VIEW_W = 360;
const VIEW_H = 300;

const PIVOT_X = 242;
const PIVOT_Y = 40;

const HAMMER_SIZE = 158;
const IMAGE_X = 0; // extra offset X del <image> (sumado al anclaje del mango)
const IMAGE_Y = 0; // extra offset Y del <image>

const TIP_NX = 48 / 512; // extremo mango en X del asset (viewBox 512)
const TIP_NY = 420 / 512; // extremo mango en Y del asset

const ART_STRAIGHTEN = -50; // enderezar dibujo diagonal → cara plana al pegar

const SWING_RAISED = 36; // levantado
const SWING_HIT = 0; // pegando recto
const SWING_BOUNCE = 4; // rebote

/**
 * Keyframes del swing (mismo reloj que las chispas).
 * El golpe es el keyframe con angle = SWING_HIT → t = SWING_HIT_AT.
 */
const SWING_KEYS = [
  { t: 0, angle: SWING_RAISED },
  { t: 0.12, angle: SWING_RAISED },
  { t: 0.42, angle: SWING_HIT }, // ← impacto
  { t: 0.5, angle: SWING_BOUNCE },
  { t: 1, angle: SWING_RAISED },
];
const SWING_HIT_AT = SWING_KEYS.find((k) => k.angle === SWING_HIT)?.t ?? 0.42;

/* ── Yunque (posición del asset; también volteado H) ── */
const ANVIL_X = 12;
const ANVIL_Y = 78;
const ANVIL_W = 210;
const ANVIL_H = 129;

/* ── Chispas burst (mitad superior) — algoritmo matemático ──
 *   HIT_X / HIT_Y       → centro del choque
 *   SPARK_HIT_AT        → = SWING_HIT_AT (calculado; no hace falta tocarlo)
 *   SPARK_FLIGHT        → fracción del ciclo que duran las chispas
 *   SPARK_COUNT         → rayos en el semicírculo de arriba
 *   SPARK_GAP           → radio inicial (hueco central)
 *   SPARK_OUT           → distancia extra que brincan hacia afuera
 *   SPARK_LEN           → largo de cada pastilla
 *   SPARK_STROKE        → grosor
 *
 * Trayectoria: r(u)=GAP+OUT·easeOut(u); pos=HIT+(cosθ,sinθ)·r; op=(1−u)^1.2
 */
const HIT_X = 125;
const HIT_Y = 106;

/** Sincronizado al keyframe de impacto del martillo (mismo reloj JS). */
const SPARK_HIT_AT = SWING_HIT_AT;
const SPARK_FLIGHT = 0.28;
const SPARK_COUNT = 9;
const SPARK_GAP = 8;
const SPARK_OUT = 46;
const SPARK_LEN = 18;
const SPARK_STROKE = 5.5;

/** θ_i = −π … 0  (izquierda → arriba → derecha). */
function topHalfAngles(count) {
  if (count <= 1) return [-Math.PI / 2];
  return Array.from(
    { length: count },
    (_, i) => -Math.PI + (Math.PI * i) / (count - 1),
  );
}

/** ease-out cúbico: sale fuerte y frena. */
function easeOutCubic(u) {
  const t = Math.min(1, Math.max(0, u));
  return 1 - (1 - t) ** 3;
}

/** ease-in cúbico: arranca lento y termina rápido (bajada del martillo). */
function easeInCubic(u) {
  const t = Math.min(1, Math.max(0, u));
  return t ** 3;
}

/** Ángulo del martillo en cycle ∈ [0,1) según SWING_KEYS. */
function swingAngleAt(cycle) {
  const c = ((cycle % 1) + 1) % 1;
  const keys = SWING_KEYS;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (c < a.t || c > b.t) continue;
    if (c === a.t) return a.angle;
    const span = b.t - a.t;
    const local = span <= 0 ? 1 : (c - a.t) / span;
    // Tramo hacia el golpe: ease-in (llega justo en SWING_HIT_AT)
    // Tramo de subida: ease-out (sale suave del yunque)
    const goingDown = b.angle < a.angle;
    const e = goingDown ? easeInCubic(local) : easeOutCubic(local);
    return a.angle + (b.angle - a.angle) * e;
  }
  return keys[keys.length - 1].angle;
}

/**
 * Estado de todas las chispas en un instante del ciclo (cycle ∈ [0,1)).
 * Devuelve [] fuera de la ventana de vuelo.
 */
function computeSparks(cycle, angles) {
  const u = (cycle - SPARK_HIT_AT) / SPARK_FLIGHT;
  if (u < 0 || u > 1) return [];

  const e = easeOutCubic(u);
  const r = SPARK_GAP + SPARK_OUT * e;
  const len = SPARK_LEN * (1 - 0.28 * e);
  const opacity = Math.max(0, (1 - u) ** 1.2);

  return angles.map((theta, i) => {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const x1 = HIT_X + c * r;
    const y1 = HIT_Y + s * r;
    const x2 = HIT_X + c * (r + len);
    const y2 = HIT_Y + s * (r + len);
    const cx = HIT_X + c * (r + len * 0.55);
    const cy = HIT_Y + s * (r + len * 0.55);
    return { i, x1, y1, x2, y2, cx, cy, opacity, stroke: SPARK_STROKE * (1 - 0.35 * e) };
  });
}

/** Un solo reloj para martillo + chispas. */
function useAnimCycle(durationMs) {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now) => {
      setCycle(((now - t0) % durationMs) / durationMs);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs]);
  return cycle;
}

export default function MaintenanceHammerAnvilIcon({ size = 240, sx }) {
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";

  const tipX = TIP_NX * HAMMER_SIZE;
  const tipY = TIP_NY * HAMMER_SIZE;
  const imgX = -tipX + IMAGE_X;
  const imgY = -tipY + IMAGE_Y;

  const sparkColor = dark ? "#fbbf24" : "#f97316";
  const sparkHot = dark ? "#fef3c7" : "#fdba74";

  const angles = useMemo(() => topHalfAngles(SPARK_COUNT), []);
  const cycle = useAnimCycle(DUR_MS);
  const hammerAngle = swingAngleAt(cycle);
  const sparks = useMemo(() => computeSparks(cycle, angles), [cycle, angles]);

  return (
    <Box
      aria-hidden
      sx={{
        width: { xs: size * 0.92, sm: size },
        height: {
          xs: size * 0.92 * (VIEW_H / VIEW_W),
          sm: size * (VIEW_H / VIEW_W),
        },
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
        ...sx,
      }}
    >
      <svg
        viewBox={`${VIEW_MIN_X} ${VIEW_MIN_Y} ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height="100%"
        style={{ overflow: "visible", display: "block" }}
      >
        <ellipse
          cx="118"
          cy="198"
          rx="72"
          ry="7"
          fill="#000"
          opacity={dark ? 0.35 : 0.18}
        />

        {/* Yunque volteado horizontalmente */}
        <g
          transform={`translate(${ANVIL_X + ANVIL_W / 2} ${ANVIL_Y + ANVIL_H / 2}) scale(-1 1) translate(${-(ANVIL_W / 2)} ${-(ANVIL_H / 2)})`}
        >
          <image
            href={yunqueUrl}
            x={0}
            y={0}
            width={ANVIL_W}
            height={ANVIL_H}
            preserveAspectRatio="xMidYMid meet"
          />
        </g>

        {/*
          Mismo reloj JS que las chispas → golpe en SWING_HIT_AT (= SPARK_HIT_AT).
          translate(pivote) → swingAngle → ART_STRAIGHTEN → volteo H → image
        */}
        <g transform={`translate(${PIVOT_X} ${PIVOT_Y})`}>
          <g transform={`rotate(${hammerAngle})`}>
            <g transform={`rotate(${ART_STRAIGHTEN})`}>
              <g transform="scale(-1 1)">
                <image
                  href={martilloUrl}
                  x={imgX}
                  y={imgY}
                  width={HAMMER_SIZE}
                  height={HAMMER_SIZE}
                  preserveAspectRatio="xMidYMid meet"
                  style={{
                    filter: dark
                      ? "invert(1) brightness(0.92)"
                      : "none",
                  }}
                />
              </g>
            </g>
          </g>
        </g>

        {/*
          Chispas: r(u)=GAP+OUT·easeOut(u), pos = HIT + (cosθ,sinθ)·r
          Solo mitad superior; se desvanecen con (1−u)^1.2
        */}
        <g strokeLinecap="round" fill="none">
          {sparks.map((p) => (
            <g key={p.i} opacity={p.opacity}>
              <line
                x1={p.x1}
                y1={p.y1}
                x2={p.x2}
                y2={p.y2}
                stroke={sparkColor}
                strokeWidth={p.stroke}
              />
              <circle cx={p.cx} cy={p.cy} r={p.stroke * 0.35} fill={sparkHot} />
            </g>
          ))}
        </g>
      </svg>
    </Box>
  );
}
