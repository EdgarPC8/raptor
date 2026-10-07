/**
 * Icono «sistema actualizándose» (referencia: icono de actualizacion.gif).
 * Engranaje outline + </> teal; 4 flechas curvas con punta triangular, en órbita.
 */
import { Box, useTheme } from "@mui/material";

const CX = 100;
const CY = 100;
const VIEW = 200;

/** Engranaje outline (8 dientes). */
const GEAR_OUTER = 52;
const GEAR_ROOT = 42;
const GEAR_HOLE = 28;
const GEAR_TEETH = 8;
const GEAR_STROKE = 7;

/** Flechas orbitando. */
const ARROW_R = 78;
const ARROW_COUNT = 4;
const ARC_DEG = 52;
const GAP_DEG = 38; // 4 × (52 + 38) = 360
const SHAFT_W = 7;
const TIP_LEN = 16;
const TIP_HALF = 11;

function degToRad(d) {
  return (d * Math.PI) / 180;
}

/** θ=0 arriba; crece en sentido horario. */
function polar(thetaDeg, r = ARROW_R) {
  const a = degToRad(thetaDeg - 90);
  return {
    x: CX + r * Math.cos(a),
    y: CY + r * Math.sin(a),
  };
}

/** Tangente horaria unitaria en θ (avance del arco). */
function tangent(thetaDeg) {
  const a = degToRad(thetaDeg);
  return { x: Math.cos(a), y: Math.sin(a) };
}

/** Normal radial hacia afuera. */
function radial(thetaDeg) {
  const a = degToRad(thetaDeg - 90);
  return { x: Math.cos(a), y: Math.sin(a) };
}

/**
 * Flecha curva rellena: cuerpo en arco + punta triangular afilada.
 * Sin marker-end (falla con animateTransform / clipping).
 */
function curvedArrowPath(theta0, theta1) {
  const half = SHAFT_W / 2;
  const tip = polar(theta1);
  const t = tangent(theta1);
  const n = radial(theta1);

  const tipPoint = {
    x: tip.x + t.x * TIP_LEN,
    y: tip.y + t.y * TIP_LEN,
  };
  const tipL = {
    x: tip.x + n.x * TIP_HALF,
    y: tip.y + n.y * TIP_HALF,
  };
  const tipR = {
    x: tip.x - n.x * TIP_HALF,
    y: tip.y - n.y * TIP_HALF,
  };

  const startOut = polar(theta0, ARROW_R + half);
  const startIn = polar(theta0, ARROW_R - half);
  const endOut = polar(theta1, ARROW_R + half);
  const endIn = polar(theta1, ARROW_R - half);
  const rOut = ARROW_R + half;
  const rIn = ARROW_R - half;

  return [
    `M ${startOut.x.toFixed(2)} ${startOut.y.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 0 1 ${endOut.x.toFixed(2)} ${endOut.y.toFixed(2)}`,
    `L ${tipL.x.toFixed(2)} ${tipL.y.toFixed(2)}`,
    `L ${tipPoint.x.toFixed(2)} ${tipPoint.y.toFixed(2)}`,
    `L ${tipR.x.toFixed(2)} ${tipR.y.toFixed(2)}`,
    `L ${endIn.x.toFixed(2)} ${endIn.y.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 0 0 ${startIn.x.toFixed(2)} ${startIn.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function buildArrows() {
  const step = ARC_DEG + GAP_DEG;
  return Array.from({ length: ARROW_COUNT }, (_, i) => {
    const start = i * step + 8;
    return { key: i, d: curvedArrowPath(start, start + ARC_DEG) };
  });
}

/** Contorno de engranaje con dientes cuadrados redondeados (estilo GIF). */
function gearOutlinePath() {
  const teeth = GEAR_TEETH;
  const step = 360 / teeth;
  const toothSpan = step * 0.42;
  const parts = [];

  for (let i = 0; i < teeth; i++) {
    const mid = i * step;
    const a0 = mid - toothSpan / 2;
    const a1 = mid + toothSpan / 2;
    const valley0 = mid + toothSpan / 2;
    const valley1 = mid + step - toothSpan / 2;

    const p0 = polar(a0, GEAR_OUTER);
    const p1 = polar(a1, GEAR_OUTER);
    const p2 = polar(valley0, GEAR_ROOT);
    const p3 = polar(valley1, GEAR_ROOT);

    if (i === 0) {
      parts.push(`M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`);
    } else {
      parts.push(`L ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`);
    }
    parts.push(`L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`);
    parts.push(`L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`);
    parts.push(
      `A ${GEAR_ROOT} ${GEAR_ROOT} 0 0 1 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`
    );
  }
  parts.push("Z");
  return parts.join(" ");
}

const ARROWS = buildArrows();
const GEAR_D = gearOutlinePath();

export default function UpdatingSystemIcon({ size = 200, sx }) {
  const theme = useTheme();
  const gear = theme.palette.mode === "dark" ? "#f5f5f5" : "#111111";
  const teal = "#14b8a6";

  return (
    <Box
      aria-hidden
      sx={{
        width: { xs: size * 0.85, sm: size },
        height: { xs: size * 0.85, sm: size },
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
        ...sx,
      }}
    >
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        width="100%"
        height="100%"
        style={{ overflow: "visible" }}
      >
        {/* Engranaje outline (fijo) */}
        <path
          d={GEAR_D}
          fill="none"
          stroke={gear}
          strokeWidth={GEAR_STROKE}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={CX}
          cy={CY}
          r={GEAR_HOLE}
          fill="none"
          stroke={gear}
          strokeWidth={GEAR_STROKE}
        />

        {/* </> teal (fijo) */}
        <text
          x={CX}
          y={CY + 8}
          textAnchor="middle"
          fill={teal}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
          fontSize="28"
          fontWeight="800"
          letterSpacing="-0.06em"
        >
          {"</>"}
        </text>

        {/* Solo las flechas giran */}
        <g fill={teal}>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${CX} ${CY}`}
            to={`360 ${CX} ${CY}`}
            dur="2.4s"
            repeatCount="indefinite"
          />
          {ARROWS.map((a) => (
            <path key={a.key} d={a.d} />
          ))}
        </g>
      </svg>
    </Box>
  );
}
